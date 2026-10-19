package io.github.danieltinois.resumetailor.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import io.github.danieltinois.resumetailor.IntegrationTest;

class MeControllerTest extends IntegrationTest {

    @Autowired
    UserRepository users;

    @Autowired
    JwtService jwt;

    @Test
    void meWithoutTokenIs401ProblemDetail() throws Exception {
        mvc.perform(get("/api/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void meReturnsCurrentUser() throws Exception {
        User user = users.create("alex@example.com", "hash", "Alex", true);

        mvc.perform(get("/api/me").header("Authorization", "Bearer " + jwt.issue(user.id())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(user.id().toString()))
                .andExpect(jsonPath("$.email").value("alex@example.com"))
                .andExpect(jsonPath("$.name").value("Alex"))
                .andExpect(jsonPath("$.emailVerified").value(true))
                .andExpect(jsonPath("$.hasPassword").value(true))
                .andExpect(jsonPath("$.hasGoogle").value(false));
    }

    @Test
    void tokenForDeletedUserIs401() throws Exception {
        User user = users.create("gone@example.com", null, "Gone", true);
        String token = jwt.issue(user.id());
        jdbc.sql("DELETE FROM users").update();

        mvc.perform(get("/api/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void garbageTokenIs401() throws Exception {
        mvc.perform(get("/api/me").header("Authorization", "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized());
    }
}
