package io.github.danieltinois.resumetailor.auth;

import org.springframework.http.HttpStatus;

/** A sign-in flow failure with the status and message the client may see. */
public class AuthException extends RuntimeException {

    private final HttpStatus status;
    private final boolean keepsRefreshCookie;

    public AuthException(HttpStatus status, String message) {
        this(status, message, false);
    }

    AuthException(HttpStatus status, String message, boolean keepsRefreshCookie) {
        super(message);
        this.status = status;
        this.keepsRefreshCookie = keepsRefreshCookie;
    }

    public HttpStatus status() {
        return status;
    }

    /** True when the browser's refresh cookie is still good and must not be cleared. */
    public boolean keepsRefreshCookie() {
        return keepsRefreshCookie;
    }

    static AuthException invalidCredentials() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
    }

    static AuthException invalidLink() {
        return new AuthException(HttpStatus.BAD_REQUEST, "Invalid or expired link");
    }
}
