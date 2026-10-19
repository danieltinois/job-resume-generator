package io.github.danieltinois.resumetailor.job;

/** A part of a job description and how much a skill found in it counts. */
public record JobSection(int weight, String normalizedText) {
}
