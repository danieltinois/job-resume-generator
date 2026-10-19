package io.github.danieltinois.resumetailor.profile;

/** A validation error, located by a path such as {@code experiences[0].achievements[2].text.pt}. */
public record ProfileViolation(String path, String message) {
}
