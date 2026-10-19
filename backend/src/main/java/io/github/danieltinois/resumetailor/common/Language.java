package io.github.danieltinois.resumetailor.common;

import java.util.Locale;

import com.fasterxml.jackson.annotation.JsonCreator;

/** Languages a resume can be generated in. */
public enum Language {
    PT,
    EN;

    /** Accepts "pt", "PT", " en " and so on, from JSON bodies and query parameters alike. */
    @JsonCreator
    public static Language of(String value) {
        return valueOf(value.strip().toUpperCase(Locale.ROOT));
    }
}
