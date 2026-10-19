package io.github.danieltinois.resumetailor.profile;

/** The profile changed since the client loaded it, e.g. in another tab. */
public class VersionConflictException extends RuntimeException {

    public VersionConflictException() {
        super("The profile was changed elsewhere. Reload it before saving.");
    }
}
