package io.github.danieltinois.resumetailor.auth;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.ResultActions;

import io.github.danieltinois.resumetailor.IntegrationTest;

class LoginTest extends IntegrationTest {

    @Autowired
    UserRepository users;

    @Autowired
    PasswordEncoder passwords;

    private ResultActions login(String email, String password) throws Exception {
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, password)));
    }

    private void account(String email, boolean verified) {
        users.create(email, passwords.encode("correct-horse"), "Alex", verified);
    }

    @Test
    void loginReturnsAccessTokenAndRefreshCookie() throws Exception {
        account("alex@example.com", true);

        login("alex@example.com", "correct-horse")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(header().string("Set-Cookie", containsString("refresh_token=")))
                .andExpect(header().string("Set-Cookie", containsString("HttpOnly")))
                .andExpect(header().string("Set-Cookie", containsString("SameSite=Strict")))
                .andExpect(header().string("Set-Cookie", containsString("Path=/api/auth")))
                .andExpect(header().string("Set-Cookie", containsString("Max-Age=2592000")))
                .andExpect(header().string("Set-Cookie", not(containsString("Secure"))));
    }

    @Test
    void accessTokenFromLoginWorks() throws Exception {
        account("alex@example.com", true);
        String body = login("alex@example.com", "correct-horse").andReturn().getResponse().getContentAsString();
        String token = body.replaceAll(".*\"accessToken\":\"([^\"]+)\".*", "$1");

        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void loginWorksWithDifferentEmailCase() throws Exception {
        account("alex@example.com", true);

        login(" ALEX@Example.com", "correct-horse").andExpect(status().isOk());
    }

    @Test
    void failuresLookIdentical() throws Exception {
        account("alex@example.com", true);
        users.create("google@example.com", null, "Google Only", true);
        String expected = "{\"detail\":\"Invalid email or password\",\"status\":401}";

        login("nobody@example.com", "correct-horse").andExpect(status().isUnauthorized())
                .andExpect(content().json(expected));
        login("alex@example.com", "wrong-password").andExpect(status().isUnauthorized())
                .andExpect(content().json(expected));
        login("google@example.com", "correct-horse").andExpect(status().isUnauthorized())
                .andExpect(content().json(expected));
    }

    @Test
    void hugeEmailIs422() throws Exception {
        login("a".repeat(5_000) + "@example.com", "correct-horse").andExpect(status().isUnprocessableContent());
    }

    @Test
    void overlongPasswordIsAPlainFailure() throws Exception {
        account("long@example.com", true);

        login("long@example.com", "é".repeat(60)).andExpect(status().isUnauthorized());
    }

    @Test
    void unverifiedOnlyRevealedAfterCorrectPassword() throws Exception {
        account("new@example.com", false);

        login("new@example.com", "wrong-password").andExpect(status().isUnauthorized());
        login("new@example.com", "correct-horse").andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("Email not verified"));
    }

    @Test
    void sixthAttemptInAMinuteIs429() throws Exception {
        account("limited@example.com", true);
        for (int i = 0; i < 5; i++) {
            login("limited@example.com", "wrong-password").andExpect(status().isUnauthorized());
        }

        login("limited@example.com", "correct-horse").andExpect(status().isTooManyRequests());
    }
}
