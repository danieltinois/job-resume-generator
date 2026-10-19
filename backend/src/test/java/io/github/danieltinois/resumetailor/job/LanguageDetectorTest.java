package io.github.danieltinois.resumetailor.job;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import io.github.danieltinois.resumetailor.Fixtures;
import io.github.danieltinois.resumetailor.common.Language;

class LanguageDetectorTest {

    @Test
    void portugueseDescription() {
        assertThat(LanguageDetector.detect(
                "Buscamos uma pessoa com experiência em Java para atuar no time de pagamentos."))
                .isEqualTo(Language.PT);
    }

    @Test
    void englishDescription() {
        assertThat(LanguageDetector.detect(Fixtures.text("job-example.md"))).isEqualTo(Language.EN);
    }

    @Test
    void emptyTextDefaultsToPortuguese() {
        assertThat(LanguageDetector.detect("")).isEqualTo(Language.PT);
    }
}
