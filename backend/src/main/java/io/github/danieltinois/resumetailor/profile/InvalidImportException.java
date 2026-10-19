package io.github.danieltinois.resumetailor.profile;

/** An imported legacy profile could not be read. Its message is safe to show the user. */
public class InvalidImportException extends IllegalArgumentException {

    public InvalidImportException(String message, Throwable cause) {
        super(message, cause);
    }

    public InvalidImportException(String message) {
        super(message);
    }
}
