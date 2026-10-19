package io.github.danieltinois.resumetailor.profile;

import io.github.danieltinois.resumetailor.common.LocalizedText;

public record Education(String id, String institution, LocalizedText degree, String startDate, String endDate) {
}
