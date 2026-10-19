package io.github.danieltinois.resumetailor.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import io.github.danieltinois.resumetailor.IntegrationTest;

class RegistrationTest extends IntegrationTest {

    @Autowired
    UserRepository users;

    private ResultActions register(String email, String password) throws Exception {
        return mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"%s\",\"name\":\"Alex\"}".formatted(email, password)));
    }

    private ResultActions verify(String token) throws Exception {
        return mvc.perform(post("/api/auth/verify-email").contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"%s\"}".formatted(token)));
    }

    @Test
    void registerSendsVerificationLink() throws Exception {
        register("alex@example.com", "correct-horse").andExpect(status().isCreated());

        assertThat(mailer.last().kind()).isEqualTo("verification");
        assertThat(mailer.last().email()).isEqualTo("alex@example.com");
        assertThat(mailer.last().link()).startsWith("http://app.test/verify-email?token=");
        assertThat(users.findByEmail("alex@example.com")).get()
                .satisfies(user -> assertThat(user.emailVerified()).isFalse());
    }

    @Test
    void verifyLinkMarksEmailVerified() throws Exception {
        register("alex@example.com", "correct-horse");

        verify(mailer.last().token()).andExpect(status().isNoContent());

        assertThat(users.findByEmail("alex@example.com").orElseThrow().emailVerified()).isTrue();
    }

    @Test
    void verifyLinkIsSingleUse() throws Exception {
        register("alex@example.com", "correct-horse");
        String token = mailer.last().token();
        verify(token);

        verify(token).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Invalid or expired link"));
    }

    @Test
    void expiredVerificationLinkIsRejected() throws Exception {
        register("alex@example.com", "correct-horse");
        jdbc.sql("UPDATE auth_tokens SET expires_at = now() - interval '1 minute'").update();

        verify(mailer.last().token()).andExpect(status().isBadRequest());
    }

    @Test
    void duplicateEmailIsCaseAndSpaceInsensitive() throws Exception {
        register("alex@example.com", "correct-horse").andExpect(status().isCreated());

        register("  Alex@Example.com ", "correct-horse").andExpect(status().isConflict());
    }

    @Test
    void weakPasswordIs422() throws Exception {
        register("alex@example.com", "1234567").andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.errors[0].path").value("password"));
    }

    @Test
    void passwordOverBcryptLimitIs422() throws Exception {
        register("alex@example.com", "a".repeat(73)).andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.errors[0].path").value("password"));
        // 40 accented characters are 80 UTF-8 bytes, although only 40 characters.
        register("alex@example.com", "é".repeat(40)).andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.errors[0].path").value("password"));
        register("alex@example.com", "a".repeat(72)).andExpect(status().isCreated());
    }

    @Test
    void invalidEmailIs422() throws Exception {
        register("not-an-email", "correct-horse").andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.errors[0].path").value("email"));
    }

    @Test
    void resendVerificationNeverRevealsAccounts() throws Exception {
        mvc.perform(post("/api/auth/resend-verification").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"nobody@example.com\"}"))
                .andExpect(status().isNoContent());

        assertThat(mailer.sent).isEmpty();
    }

    @Test
    void resendVerificationSendsANewLink() throws Exception {
        register("alex@example.com", "correct-horse");

        mvc.perform(post("/api/auth/resend-verification").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ALEX@example.com\"}"))
                .andExpect(status().isNoContent());

        assertThat(mailer.sent).hasSize(2);
        verify(mailer.last().token()).andExpect(status().isNoContent());
    }
}
