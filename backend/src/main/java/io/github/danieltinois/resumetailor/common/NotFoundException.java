package io.github.danieltinois.resumetailor.common;

/** The resource does not exist or belongs to another user; both answer 404. */
public class NotFoundException extends RuntimeException {

    public NotFoundException() {
        super("Not found");
    }
}
