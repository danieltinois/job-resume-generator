package io.github.danieltinois.resumetailor.resume;

/** Typst could not produce a PDF: missing binary, a compile error or a timeout. */
public class RenderException extends RuntimeException {

    public RenderException(String message) {
        super(message);
    }

    public RenderException(String message, Throwable cause) {
        super(message, cause);
    }
}
