package io.github.danieltinois.resumetailor.common;

/**
 * Free text written by the user in Portuguese and, optionally, English.
 * Portuguese is required; English falls back to it.
 */
public record LocalizedText(String pt, String en) {

    public String in(Language language) {
        return language == Language.PT || missing(language) ? pt : en;
    }

    /** True when the requested language has no text of its own. */
    public boolean missing(Language language) {
        return language == Language.EN && (en == null || en.isBlank());
    }
}
