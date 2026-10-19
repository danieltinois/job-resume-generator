package io.github.danieltinois.resumetailor.auth;

import org.springframework.http.HttpStatus;

/** A sign-in flow failure with the status and message the client may see. */
public class AuthException extends RuntimeException {

    private final HttpStatus status;

    public AuthException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus status() {
        return status;
    }

    static AuthException invalidCredentials() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
    }

    static AuthException invalidLink() {
        return new AuthException(HttpStatus.BAD_REQUEST, "Invalid or expired link");
    }
}
