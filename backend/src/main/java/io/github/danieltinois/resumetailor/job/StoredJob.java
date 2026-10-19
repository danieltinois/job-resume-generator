package io.github.danieltinois.resumetailor.job;

import java.time.Instant;
import java.util.UUID;

import io.github.danieltinois.resumetailor.common.Language;
import io.swagger.v3.oas.annotations.media.Schema;

/** A pasted job description and what was parsed from it. */
public record StoredJob(UUID id, String title, String company, Language language, String description,
        Instant createdAt) {

    /** The job without its description, for lists. */
    @Schema(name = "JobSummary")
    public record Summary(UUID id, String title, String company, Language language, Instant createdAt) {
    }

    public Summary summary() {
        return new Summary(id, title, company, language, createdAt);
    }
}
