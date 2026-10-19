package io.github.danieltinois.resumetailor.profile;

import java.util.List;

import io.github.danieltinois.resumetailor.common.LocalizedText;

/** A job. Dates are {@code YYYY-MM}; a null end date means the job is current. */
public record Experience(String id, String company, LocalizedText role, String startDate, String endDate,
        List<Achievement> achievements) {

    public Experience {
        achievements = Lists.copy(achievements);
    }
}
