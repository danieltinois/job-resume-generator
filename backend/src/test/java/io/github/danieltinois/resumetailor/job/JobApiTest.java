package io.github.danieltinois.resumetailor.job;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import io.github.danieltinois.resumetailor.Fixtures;
import io.github.danieltinois.resumetailor.IntegrationTest;

class JobApiTest extends IntegrationTest {

    private String alex;

    @BeforeEach
    void signIn() {
        alex = signedIn("alex@example.com");
    }

    static ResultActions createJob(org.springframework.test.web.servlet.MockMvc mvc, String auth, String text)
            throws Exception {
        return mvc.perform(post("/api/jobs").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
                .content(Fixtures.JSON.writeValueAsString(Map.of("description", text))));
    }

    static String idOf(ResultActions created) throws Exception {
        return Fixtures.JSON.readTree(created.andReturn().getResponse().getContentAsString()).get("id").asString();
    }

    @Test
    void createParsesTitleCompanyAndLanguage() throws Exception {
        createJob(mvc, alex, Fixtures.text("job-example.md"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.title").value("Backend Engineer"))
                .andExpect(jsonPath("$.company").value("Example"))
                .andExpect(jsonPath("$.language").value("EN"))
                .andExpect(jsonPath("$.createdAt").isNotEmpty());
    }

    @Test
    void emptyOrHugeDescriptionIs422() throws Exception {
        createJob(mvc, alex, "   ").andExpect(status().isUnprocessableContent());
        createJob(mvc, alex, "x".repeat(50_001)).andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.errors[0].path").value("description"));
    }

    @Test
    void listIsNewestFirstWithoutDescription() throws Exception {
        createJob(mvc, alex, "# First\nJava");
        createJob(mvc, alex, "# Second\nKafka");

        mvc.perform(get("/api/jobs").header("Authorization", alex))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].title").value("Second"))
                .andExpect(jsonPath("$[1].title").value("First"))
                .andExpect(jsonPath("$[0].description").doesNotExist());
    }

    @Test
    void getReturnsFullJob() throws Exception {
        String id = idOf(createJob(mvc, alex, "# Dev\nJava and Kafka"));

        mvc.perform(get("/api/jobs/" + id).header("Authorization", alex))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").value("# Dev\nJava and Kafka"));
    }

    @Test
    void deleteCascadesToResumes() throws Exception {
        String id = idOf(createJob(mvc, alex, "# Dev\nJava"));
        UUID userId = jdbc.sql("SELECT user_id FROM jobs").query(UUID.class).single();
        jdbc.sql("INSERT INTO resumes (user_id, job_id, language, selection, snapshot) "
                + "VALUES (?, ?::uuid, 'PT', '{}', '{}')").params(userId, id).update();

        mvc.perform(delete("/api/jobs/" + id).header("Authorization", alex)).andExpect(status().isNoContent());

        assertThat(jdbc.sql("SELECT count(*) FROM resumes").query(Long.class).single()).isZero();
        mvc.perform(get("/api/jobs/" + id).header("Authorization", alex)).andExpect(status().isNotFound());
    }

    @Test
    void otherUsersJobIs404() throws Exception {
        String id = idOf(createJob(mvc, alex, "# Dev\nJava"));
        String bia = signedIn("bia@example.com");

        mvc.perform(get("/api/jobs/" + id).header("Authorization", bia)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/jobs/" + id).header("Authorization", bia)).andExpect(status().isNotFound());
        mvc.perform(get("/api/jobs").header("Authorization", bia)).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/jobs/" + id).header("Authorization", alex)).andExpect(status().isOk());
    }

    @Test
    void malformedIdIs400() throws Exception {
        mvc.perform(get("/api/jobs/not-a-uuid").header("Authorization", alex)).andExpect(status().isBadRequest());
    }
}
