package io.github.danieltinois.resumetailor.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.ResultActions;

import io.github.danieltinois.resumetailor.IntegrationTest;
import jakarta.servlet.http.Cookie;

class PasswordResetTest extends IntegrationTest {

    @Autowired
    UserRepository users;

    @Autowired
    PasswordEncoder passwords;

    private final String email = UUID.randomUUID() + "@example.com";

    private ResultActions forgot(String address) throws Exception {
        return mvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\"}".formatted(address)));
    }

    private ResultActions reset(String token, String password) throws Exception {
        return mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"%s\",\"password\":\"%s\"}".formatted(token, password)));
    }

    private ResultActions login(String password) throws Exception {
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, password)));
    }

    @Test
    void forgotPasswordNeverRevealsAccounts() throws Exception {
        forgot("nobody@example.com").andExpect(status().isNoContent());

        assertThat(mailer.sent).isEmpty();
    }

    @Test
    void forgotPasswordSendsResetLink() throws Exception {
        users.create(email, passwords.encode("old-password"), "Alex", true);

        forgot(email.toUpperCase()).andExpect(status().isNoContent());

        assertThat(mailer.last().kind()).isEqualTo("reset");
        assertThat(mailer.last().link()).startsWith("http://app.test/reset-password?token=");
    }

    @Test
    void resetChangesPasswordAndLogsOutEverywhere() throws Exception {
        users.create(email, passwords.encode("old-password"), "Alex", true);
        String oldSession = login("old-password").andReturn().getResponse().getCookie(RefreshCookies.NAME).getValue();
        forgot(email);

        reset(mailer.last().token(), "new-password").andExpect(status().isNoContent());

        mvc.perform(post("/api/auth/refresh").cookie(new Cookie(RefreshCookies.NAME, oldSession)))
                .andExpect(status().isUnauthorized());
        login("old-password").andExpect(status().isUnauthorized());
        login("new-password").andExpect(status().isOk());
    }

    @Test
    void resetLinkIsSingleUse() throws Exception {
        users.create(email, passwords.encode("old-password"), "Alex", true);
        forgot(email);
        String token = mailer.last().token();
        reset(token, "new-password");

        reset(token, "another-password").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Invalid or expired link"));
    }

    @Test
    void resetLinkExpiresAfterOneHour() throws Exception {
        users.create(email, passwords.encode("old-password"), "Alex", true);
        forgot(email);
        jdbc.sql("UPDATE auth_tokens SET expires_at = now() - interval '1 minute'").update();

        reset(mailer.last().token(), "new-password").andExpect(status().isBadRequest());
    }

    @Test
    void resetTokenLivesOneHour() throws Exception {
        users.create(email, passwords.encode("old-password"), "Alex", true);
        forgot(email);

        Double minutes = jdbc.sql("SELECT extract(epoch FROM expires_at - created_at) / 60 FROM auth_tokens "
                + "WHERE type = 'RESET_PASSWORD'").query(Double.class).single();

        assertThat(minutes).isBetween(59.0, 61.0);
    }

    @Test
    void googleOnlyAccountCanAddPassword() throws Exception {
        users.create(email, null, "Alex", true);
        forgot(email);

        reset(mailer.last().token(), "new-password").andExpect(status().isNoContent());

        login("new-password").andExpect(status().isOk());
    }

    @Test
    void resetVerifiesTheEmail() throws Exception {
        users.create(email, passwords.encode("old-password"), "Alex", false);
        forgot(email);

        reset(mailer.last().token(), "new-password");

        login("new-password").andExpect(status().isOk());
    }

    @Test
    void weakNewPasswordIs422() throws Exception {
        reset("whatever", "short").andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.errors[0].path").value("password"));
    }
}
