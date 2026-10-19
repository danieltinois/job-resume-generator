package io.github.danieltinois.resumetailor.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Google OAuth client credentials ({@code GOOGLE_CLIENT_ID}, {@code GOOGLE_CLIENT_SECRET}); blank disables Google. */
@ConfigurationProperties("app.google")
public record GoogleProperties(String clientId, String clientSecret) {
}
