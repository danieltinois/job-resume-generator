package io.github.danieltinois.resumetailor.common;

/** A valid token whose user no longer exists, or a failed sign-in. Answers 401. */
public class UnauthenticatedException extends RuntimeException {

    public UnauthenticatedException(String message) {
        super(message);
    }
}
