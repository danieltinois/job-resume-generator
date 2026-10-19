package io.github.danieltinois.resumetailor.resume;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import io.github.danieltinois.resumetailor.Fixtures;
import io.github.danieltinois.resumetailor.IntegrationTest;
import io.github.danieltinois.resumetailor.job.JobApiTestSupport;
import tools.jackson.databind.JsonNode;

class ResumeApiTest {

    /** A signed-in user with the example profile, the example job and its suggested selection. */
    abstract static class WithExampleData extends IntegrationTest {

        String alex;
        String jobId;
        JsonNode suggestion;

        @BeforeEach
        void setUp() throws Exception {
            alex = signedIn("alex@example.com");
            saveProfile(0, Fixtures.text("profile-example.json"));
            jobId = JobApiTestSupport.create(mvc, alex, Fixtures.text("job-example.md"));
            suggestion = suggestion(jobId);
        }

        void saveProfile(int version, String json) throws Exception {
            mvc.perform(put("/api/profile").header("Authorization", alex).contentType(MediaType.APPLICATION_JSON)
                    .content("{\"version\":" + version + ",\"data\":" + json + "}")).andExpect(status().isOk());
        }

        JsonNode suggestion(String job) throws Exception {
            String body = mvc.perform(get("/api/jobs/" + job + "/analysis").header("Authorization", alex))
                    .andReturn().getResponse().getContentAsString();
            return Fixtures.JSON.readTree(body).get("suggestion");
        }

        static String request(String jobId, String language, Object selection) {
            return Fixtures.JSON.writeValueAsString(Map.of("jobId", jobId, "language", language,
                    "selection", selection));
        }

        ResultActions preview(MockMvc mvc, String auth, String body) throws Exception {
            return mvc.perform(post("/api/resumes/preview").header("Authorization", auth)
                    .contentType(MediaType.APPLICATION_JSON).content(body));
        }

        ResultActions save(String auth, String body) throws Exception {
            return mvc.perform(post("/api/resumes").header("Authorization", auth)
                    .contentType(MediaType.APPLICATION_JSON).content(body));
        }

        String savedId(String job) throws Exception {
            String body = save(alex, request(job, "EN", suggestion(job))).andReturn().getResponse()
                    .getContentAsString();
            return Fixtures.JSON.readTree(body).get("id").asString();
        }
    }

    @Nested
    class Endpoints extends WithExampleData {

        @Test
        void previewReturnsPdf() throws Exception {
            byte[] pdf = preview(mvc, alex, request(jobId, "EN", suggestion))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                    .andReturn().getResponse().getContentAsByteArray();

            assertThat(TypstRendererTest.text(pdf)).contains("Example Payments");
            assertThat(jdbc.sql("SELECT count(*) FROM resumes").query(Long.class).single()).isZero();
        }

        @Test
        void languageIsCaseInsensitive() throws Exception {
            preview(mvc, alex, request(jobId, "pt", suggestion)).andExpect(status().isOk());
        }

        @Test
        void previewWithUnknownIdIs422() throws Exception {
            Map<String, Object> selection = Map.of("experienceOrder", java.util.List.of("exp_nope0000"),
                    "achievements", Map.of(), "projects", java.util.List.of(), "skillOrder", Map.of());

            preview(mvc, alex, request(jobId, "EN", selection))
                    .andExpect(status().isUnprocessableContent())
                    .andExpect(jsonPath("$.errors[0].path").value("selection"));
        }

        @Test
        void missingFieldsAre422() throws Exception {
            preview(mvc, alex, "{\"jobId\":\"" + jobId + "\"}").andExpect(status().isUnprocessableContent());
        }

        @Test
        void saveReturnsIdAndWarnings() throws Exception {
            save(alex, request(jobId, "EN", suggestion))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").isNotEmpty())
                    .andExpect(jsonPath("$.warnings").isArray());
        }

        @Test
        void saveFreezesSnapshot() throws Exception {
            String id = savedId(jobId);
            saveProfile(1, Fixtures.text("profile-example.json").replace("4M events per day", "9M events per day"));

            byte[] pdf = mvc.perform(get("/api/resumes/" + id + "/pdf").header("Authorization", alex))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Disposition", "attachment; filename=\"resume-en.pdf\""))
                    .andReturn().getResponse().getContentAsByteArray();

            assertThat(TypstRendererTest.text(pdf).replaceAll("\\s+", " "))
                    .contains("4M events per day").doesNotContain("9M events");
        }

        @Test
        void listFiltersByJob() throws Exception {
            String otherJob = JobApiTestSupport.create(mvc, alex, "# Data Engineer\nPython and Kafka");
            savedId(jobId);
            savedId(otherJob);

            mvc.perform(get("/api/resumes").header("Authorization", alex))
                    .andExpect(jsonPath("$.length()").value(2));
            mvc.perform(get("/api/resumes?jobId=" + jobId).header("Authorization", alex))
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].jobId").value(jobId))
                    .andExpect(jsonPath("$[0].language").value("EN"));
        }

        @Test
        void deleteRemovesResume() throws Exception {
            String id = savedId(jobId);

            mvc.perform(delete("/api/resumes/" + id).header("Authorization", alex)).andExpect(status().isNoContent());

            mvc.perform(get("/api/resumes/" + id + "/pdf").header("Authorization", alex))
                    .andExpect(status().isNotFound());
        }

        @Test
        void otherUsersResumeIs404() throws Exception {
            String id = savedId(jobId);
            String bia = signedIn("bia@example.com");

            mvc.perform(get("/api/resumes/" + id + "/pdf").header("Authorization", bia))
                    .andExpect(status().isNotFound());
            mvc.perform(delete("/api/resumes/" + id).header("Authorization", bia)).andExpect(status().isNotFound());
            mvc.perform(get("/api/resumes").header("Authorization", bia)).andExpect(jsonPath("$.length()").value(0));
            preview(mvc, bia, request(jobId, "EN", suggestion)).andExpect(status().isNotFound());
            save(bia, request(jobId, "EN", suggestion)).andExpect(status().isNotFound());
        }

        @Test
        void userWithoutProfileGets422() throws Exception {
            String bia = signedIn("bia@example.com");
            String biasJob = JobApiTestSupport.create(mvc, bia, "# Dev\nJava");

            preview(mvc, bia, request(biasJob, "EN", suggestion)).andExpect(status().isUnprocessableContent());
        }
    }

    @Nested
    @TestPropertySource(properties = "resume.typst.binary=typst-missing")
    class RenderFailure extends WithExampleData {

        @Test
        void renderFailureIsGeneric500() throws Exception {
            preview(mvc, alex, request(jobId, "EN", suggestion))
                    .andExpect(status().isInternalServerError())
                    .andExpect(jsonPath("$.detail").value("Unexpected error"));
        }
    }
}
