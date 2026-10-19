package io.github.danieltinois.resumetailor.profile;

/** A saved profile and the version a client must send back to overwrite it. */
public record StoredProfile(int version, Profile data) {
}
