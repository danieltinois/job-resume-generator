package io.github.danieltinois.resumetailor.matching;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

import io.github.danieltinois.resumetailor.IntegrationTest;

class TechTermApiTest extends IntegrationTest {

    @Test
    void listsTheCatalog() throws Exception {
        mvc.perform(get("/api/tech-terms").header("Authorization", signedIn("alex@example.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(52))
                .andExpect(jsonPath("$[?(@.canonical == 'PostgreSQL')].aliases[0]").value("postgres"));
    }

    @Test
    void requiresSignIn() throws Exception {
        mvc.perform(get("/api/tech-terms")).andExpect(status().isUnauthorized());
    }
}
