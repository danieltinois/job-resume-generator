package io.github.danieltinois.resumetailor.job;

import java.util.Set;

import io.github.danieltinois.resumetailor.common.Language;
import io.github.danieltinois.resumetailor.matching.TextNormalizer;

/** Guesses the language of a job description by counting common words. Ties go to Portuguese. */
public final class LanguageDetector {

    private static final Set<String> PORTUGUESE = Set.of(
            "de", "da", "do", "com", "para", "que", "voce", "experiencia", "conhecimento", "vaga", "sera", "nos",
            "e");

    private static final Set<String> ENGLISH = Set.of(
            "the", "with", "and", "you", "experience", "knowledge", "we", "our", "will", "of", "to", "is");

    private LanguageDetector() {
    }

    public static Language detect(String text) {
        int portuguese = 0;
        int english = 0;
        for (String word : TextNormalizer.normalize(text).split(" ")) {
            if (PORTUGUESE.contains(word)) {
                portuguese++;
            } else if (ENGLISH.contains(word)) {
                english++;
            }
        }
        return english > portuguese ? Language.EN : Language.PT;
    }
}
