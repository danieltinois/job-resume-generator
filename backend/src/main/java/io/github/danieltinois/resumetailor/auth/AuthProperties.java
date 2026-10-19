package io.github.danieltinois.resumetailor.auth;

import java.nio.charset.StandardCharsets;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param jwtSecret    HMAC key for access tokens, at least 32 bytes ({@code JWT_SECRET})
 * @param baseUrl      public URL of the frontend, used in email links and redirects
 * @param cookieSecure whether the refresh cookie is marked Secure; false only for local HTTP
 * @param mailFrom     sender address of account emails
 */
@ConfigurationProperties("app")
public record AuthProperties(String jwtSecret, String baseUrl, boolean cookieSecure, String mailFrom) {

    private static final int MIN_SECRET_BYTES = 32;

    public AuthProperties {
        if (jwtSecret == null || jwtSecret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
            throw new IllegalStateException("JWT_SECRET must be set to at least " + MIN_SECRET_BYTES + " bytes");
        }
    }
}
