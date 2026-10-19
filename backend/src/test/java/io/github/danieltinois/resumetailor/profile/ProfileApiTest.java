package io.github.danieltinois.resumetailor.profile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.ResultActions;

import io.github.danieltinois.resumetailor.Fixtures;
import io.github.danieltinois.resumetailor.IntegrationTest;
import tools.jackson.databind.JsonNode;

class ProfileApiTest extends IntegrationTest {

    private String alex;

    @BeforeEach
    void signIn() {
        alex = signedIn("alex@example.com");
    }

    private ResultActions save(String auth, int version, String profileJson) throws Exception {
        return mvc.perform(put("/api/profile").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":%d,\"data\":%s}".formatted(version, profileJson)));
    }

    private JsonNode load(String auth) throws Exception {
        String body = mvc.perform(get("/api/profile").header("Authorization", auth)).andReturn().getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        return Fixtures.JSON.readTree(body);
    }

    private static String example() {
        return Fixtures.text("profile-example.json");
    }

    @Test
    void unauthenticatedIs401() throws Exception {
        mvc.perform(get("/api/profile")).andExpect(status().isUnauthorized());
    }

    @Test
    void newUserGetsEmptySkeleton() throws Exception {
        mvc.perform(get("/api/profile").header("Authorization", alex))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(0))
                .andExpect(jsonPath("$.data.personal.name").value("Alex Fictitious"))
                .andExpect(jsonPath("$.data.personal.email").value("alex@example.com"))
                .andExpect(jsonPath("$.data.experiences").isEmpty());
    }

    @Test
    void saveThenLoadRoundTrips() throws Exception {
        save(alex, 0, example()).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));

        JsonNode loaded = load(alex);

        assertThat(loaded.get("version").asInt()).isEqualTo(1);
        assertThat(Fixtures.JSON.treeToValue(loaded.get("data"), Profile.class)).isEqualTo(Fixtures.exampleProfile());
    }

    @Test
    void staleVersionIs409() throws Exception {
        save(alex, 0, example());
        Profile first = Fixtures.exampleProfile();
        String firstJson = Fixtures.JSON.writeValueAsString(first);
        String secondJson = firstJson.replace("Alex Fictitious", "Second Tab");

        save(alex, 1, firstJson).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(2));
        save(alex, 1, secondJson).andExpect(status().isConflict());

        assertThat(load(alex).at("/data/personal/name").asString()).isEqualTo("Alex Fictitious");
    }

    @Test
    void firstSaveRacingAnotherFirstSaveIs409() throws Exception {
        save(alex, 0, example()).andExpect(status().isOk());

        save(alex, 0, example()).andExpect(status().isConflict());
    }

    @Test
    void invalidProfileIs422WithPaths() throws Exception {
        String duplicated = example().replace("\"ach_0000000b\"", "\"ach_0000000a\"");

        save(alex, 0, duplicated).andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.errors[0].path").value("experiences[0].achievements[1].id"));
        assertThat(load(alex).get("version").asInt()).isZero();
    }

    @Test
    void importConvertsLegacyYaml() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "profile.yaml", "application/yaml",
                Fixtures.text("legacy-profile.yaml").getBytes(StandardCharsets.UTF_8));

        mvc.perform(multipart("/api/profile/import").file(file).param("language", "en").header("Authorization", alex))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.experiences.length()").value(2))
                .andExpect(jsonPath("$.experiences[0].achievements[0].text.en").value(containsString("Kafka")));
        assertThat(load(alex).get("version").asInt()).isZero();
    }

    @Test
    void importRejectsInvalidYaml() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "profile.yaml", "application/yaml",
                "a: [b".getBytes(StandardCharsets.UTF_8));

        mvc.perform(multipart("/api/profile/import").file(file).param("language", "pt").header("Authorization", alex))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.detail").value(containsString("Invalid YAML")));
    }

    @Test
    void importRejectsHugeFile() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "profile.yaml", "application/yaml",
                new byte[300 * 1024]);

        mvc.perform(multipart("/api/profile/import").file(file).param("language", "pt").header("Authorization", alex))
                .andExpect(status().isPayloadTooLarge());
    }

    @Test
    void exportIsDownloadable() throws Exception {
        save(alex, 0, example());

        mvc.perform(get("/api/profile/export").header("Authorization", alex))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"profile.json\""))
                .andExpect(jsonPath("$.personal.name").value("Alex Fictitious"));
    }

    @Test
    void profilesAreIsolatedPerUser() throws Exception {
        save(alex, 0, example());
        String bia = signedIn("bia@example.com");

        assertThat(load(bia).get("version").asInt()).isZero();
        assertThat(load(bia).at("/data/experiences").isEmpty()).isTrue();
    }
}
