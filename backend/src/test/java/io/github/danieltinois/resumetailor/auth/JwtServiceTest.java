package io.github.danieltinois.resumetailor.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.JwtException;

class JwtServiceTest {

    private static final AuthProperties PROPERTIES =
            new AuthProperties("test-secret-that-is-at-least-32-bytes-long", "http://app.test", false, null);

    @Test
    void issuedTokenDecodesToUser() {
        JwtService jwt = new JwtService(PROPERTIES, Clock.systemUTC());
        UUID user = UUID.randomUUID();

        assertThat(jwt.decoder().decode(jwt.issue(user)).getSubject()).isEqualTo(user.toString());
    }

    @Test
    void expiredTokenIsRejected() {
        Clock past = Clock.fixed(Instant.now().minus(Duration.ofMinutes(16)), ZoneOffset.UTC);
        String token = new JwtService(PROPERTIES, past).issue(UUID.randomUUID());

        assertThatThrownBy(() -> new JwtService(PROPERTIES, Clock.systemUTC()).decoder().decode(token))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void tokenSignedWithAnotherSecretIsRejected() {
        AuthProperties other = new AuthProperties("another-secret-that-is-also-32-bytes-long", "", false, null);
        String token = new JwtService(other, Clock.systemUTC()).issue(UUID.randomUUID());

        assertThatThrownBy(() -> new JwtService(PROPERTIES, Clock.systemUTC()).decoder().decode(token))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void shortSecretFailsStartup() {
        assertThatThrownBy(() -> new AuthProperties("too-short", "", false, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET");
    }
}
