package io.github.danieltinois.resumetailor.profile;

import io.github.danieltinois.resumetailor.common.LocalizedText;

/** A spoken language and the user's level in it, e.g. English / Professional. */
public record LanguageSkill(LocalizedText name, LocalizedText level) {
}
