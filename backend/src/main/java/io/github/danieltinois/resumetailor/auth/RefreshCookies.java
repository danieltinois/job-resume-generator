package io.github.danieltinois.resumetailor.auth;

import java.time.Duration;

import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/** The refresh token cookie: invisible to JavaScript, sent only to the auth endpoints. */
@Component
public class RefreshCookies {

    public static final String NAME = "refresh_token";
    static final Duration TTL = Duration.ofDays(30);

    private final boolean secure;

    public RefreshCookies(AuthProperties properties) {
        this.secure = properties.cookieSecure();
    }

    public ResponseCookie issue(String raw) {
        return build(raw, TTL);
    }

    public ResponseCookie clear() {
        return build("", Duration.ZERO);
    }

    private ResponseCookie build(String value, Duration maxAge) {
        return ResponseCookie.from(NAME, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Strict")
                .path("/api/auth")
                .maxAge(maxAge)
                .build();
    }
}
