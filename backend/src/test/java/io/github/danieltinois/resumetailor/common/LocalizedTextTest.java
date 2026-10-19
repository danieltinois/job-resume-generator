package io.github.danieltinois.resumetailor.common;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class LocalizedTextTest {

    @Test
    void englishFallsBackToPortugueseWhenMissing() {
        assertThat(new LocalizedText("Olá", null).in(Language.EN)).isEqualTo("Olá");
        assertThat(new LocalizedText("Olá", "  ").in(Language.EN)).isEqualTo("Olá");
        assertThat(new LocalizedText("Olá", "Hello").in(Language.EN)).isEqualTo("Hello");
        assertThat(new LocalizedText("Olá", "Hello").in(Language.PT)).isEqualTo("Olá");
    }

    @Test
    void missingReportsOnlyAnAbsentTranslation() {
        assertThat(new LocalizedText("Olá", null).missing(Language.EN)).isTrue();
        assertThat(new LocalizedText("Olá", " ").missing(Language.EN)).isTrue();
        assertThat(new LocalizedText("Olá", "Hello").missing(Language.EN)).isFalse();
        assertThat(new LocalizedText("Olá", null).missing(Language.PT)).isFalse();
    }
}
