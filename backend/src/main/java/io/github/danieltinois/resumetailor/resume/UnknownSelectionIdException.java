package io.github.danieltinois.resumetailor.resume;

/** A selection refers to something the profile does not contain. Never silently skipped. */
public class UnknownSelectionIdException extends RuntimeException {

    private final String id;

    public UnknownSelectionIdException(String id, String detail) {
        super("Selection refers to " + id + ", " + detail);
        this.id = id;
    }

    public String id() {
        return id;
    }
}
