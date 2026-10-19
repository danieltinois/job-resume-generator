package io.github.danieltinois.resumetailor.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.ResultActions;

import io.github.danieltinois.resumetailor.IntegrationTest;
import jakarta.servlet.http.Cookie;

class RefreshTest extends IntegrationTest {

    @Autowired
    UserRepository users;

    @Autowired
    PasswordEncoder passwords;

    private String loginCookie;

    /** Unique per test: the login rate limit is per IP and email and outlives a single test. */
    private String email;

    @BeforeEach
    void login() throws Exception {
        email = java.util.UUID.randomUUID() + "@example.com";
        users.create(email, passwords.encode("correct-horse"), "Alex", true);
        loginCookie = cookieOf(signIn());
    }

    private ResultActions signIn() throws Exception {
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"correct-horse\"}".formatted(email)));
    }

    private ResultActions refresh(String cookie) throws Exception {
        var request = post("/api/auth/refresh");
        if (cookie != null) {
            request.cookie(new Cookie(RefreshCookies.NAME, cookie));
        }
        return mvc.perform(request);
    }

    private static String cookieOf(ResultActions actions) {
        return actions.andReturn().getResponse().getCookie(RefreshCookies.NAME).getValue();
    }

    @Test
    void refreshRotatesToken() throws Exception {
        ResultActions first = refresh(loginCookie).andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty());
        String rotated = cookieOf(first);

        assertThat(rotated).isNotBlank().isNotEqualTo(loginCookie);
        refresh(rotated).andExpect(status().isOk());
    }

    /** Makes every used token look used a minute ago: past the concurrency grace, so reuse is a replay. */
    private void ageUsedTokens() {
        jdbc.sql("UPDATE auth_tokens SET used_at = now() - interval '1 minute' WHERE used_at IS NOT NULL").update();
    }

    @Test
    void concurrentRefreshKeepsTheSession() throws Exception {
        // Two tabs refresh with the same cookie at once: the loser must not sign the user out.
        String rotated = cookieOf(refresh(loginCookie));

        refresh(loginCookie).andExpect(status().isUnauthorized())
                .andExpect(header().doesNotExist("Set-Cookie"))
                .andExpect(jsonPath("$.type").value(AuthController.CONCURRENT_REFRESH_TYPE));
        refresh(rotated).andExpect(status().isOk());
    }

    @Test
    void replayedTokenRevokesFamily() throws Exception {
        String rotated = cookieOf(refresh(loginCookie));
        ageUsedTokens();

        refresh(loginCookie).andExpect(status().isUnauthorized())
                .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")))
                .andExpect(jsonPath("$.type").doesNotExist());
        refresh(rotated).andExpect(status().isUnauthorized());
    }

    @Test
    void otherSessionsSurviveAReplay() throws Exception {
        String otherDevice = cookieOf(signIn());
        refresh(loginCookie);
        ageUsedTokens();
        refresh(loginCookie);

        refresh(otherDevice).andExpect(status().isOk());
    }

    @Test
    void expiredRefreshIs401() throws Exception {
        jdbc.sql("UPDATE auth_tokens SET expires_at = now() - interval '1 minute'").update();

        refresh(loginCookie).andExpect(status().isUnauthorized());
    }

    @Test
    void missingOrUnknownCookieIs401() throws Exception {
        refresh(null).andExpect(status().isUnauthorized());
        refresh("made-up").andExpect(status().isUnauthorized());
    }

    @Test
    void logoutRevokesAndClearsCookie() throws Exception {
        mvc.perform(post("/api/auth/logout").cookie(new Cookie(RefreshCookies.NAME, loginCookie)))
                .andExpect(status().isNoContent())
                .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")));

        refresh(loginCookie).andExpect(status().isUnauthorized());
    }

    @Test
    void logoutWithoutCookieStillSucceeds() throws Exception {
        mvc.perform(post("/api/auth/logout")).andExpect(status().isNoContent());
    }
}
