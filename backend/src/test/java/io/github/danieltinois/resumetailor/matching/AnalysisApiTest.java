package io.github.danieltinois.resumetailor.matching;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import io.github.danieltinois.resumetailor.Fixtures;
import io.github.danieltinois.resumetailor.IntegrationTest;
import io.github.danieltinois.resumetailor.job.JobApiTestSupport;

class AnalysisApiTest extends IntegrationTest {

    private String alex;
    private String jobId;

    @BeforeEach
    void setUp() throws Exception {
        alex = signedIn("alex@example.com");
        jobId = JobApiTestSupport.create(mvc, alex, Fixtures.text("job-example.md"));
    }

    private void saveProfile(String json) throws Exception {
        mvc.perform(put("/api/profile").header("Authorization", alex).contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":0,\"data\":" + json + "}")).andExpect(status().isOk());
    }

    @Test
    void analysisSuggestsSelection() throws Exception {
        saveProfile(Fixtures.text("profile-example.json"));

        mvc.perform(get("/api/jobs/" + jobId + "/analysis").header("Authorization", alex))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.language").value("EN"))
                .andExpect(jsonPath("$.matchedSkills", hasItem("Kafka")))
                .andExpect(jsonPath("$.missingSkills", hasItem("CI/CD")))
                .andExpect(jsonPath("$.scores.ach_0000000a").isNumber())
                .andExpect(jsonPath("$.suggestion.experienceOrder[0]").value("exp_0000000a"))
                .andExpect(jsonPath("$.warnings").isEmpty());
    }

    @Test
    void langOverridesJobLanguage() throws Exception {
        saveProfile(Fixtures.text("profile-example.json"));

        mvc.perform(get("/api/jobs/" + jobId + "/analysis?lang=pt").header("Authorization", alex))
                .andExpect(jsonPath("$.language").value("PT"));
    }

    @Test
    void missingEnglishProducesWarnings() throws Exception {
        saveProfile(Fixtures.text("profile-example.json")
                .replace("\"en\": \"Rebuilt the payment webhook pipeline", "\"xx\": \"Rebuilt the payment webhook pipeline"));

        mvc.perform(get("/api/jobs/" + jobId + "/analysis?lang=en").header("Authorization", alex))
                .andExpect(jsonPath("$.warnings", hasItem("experiences[0].achievements[0].text: no EN text, PT used")));
    }

    @Test
    void userWithoutProfileGetsEmptySuggestion() throws Exception {
        mvc.perform(get("/api/jobs/" + jobId + "/analysis").header("Authorization", alex))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.suggestion.experienceOrder").isEmpty())
                .andExpect(jsonPath("$.matchedSkills").isEmpty());
    }

    @Test
    void otherUsersJobAnalysisIs404() throws Exception {
        String bia = signedIn("bia@example.com");

        mvc.perform(get("/api/jobs/" + jobId + "/analysis").header("Authorization", bia))
                .andExpect(status().isNotFound());
    }
}
