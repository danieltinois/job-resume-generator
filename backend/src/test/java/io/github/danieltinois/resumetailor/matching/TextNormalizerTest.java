package io.github.danieltinois.resumetailor.matching;

import static io.github.danieltinois.resumetailor.matching.TextNormalizer.appearsIn;
import static io.github.danieltinois.resumetailor.matching.TextNormalizer.normalize;
import static io.github.danieltinois.resumetailor.matching.TextNormalizer.variants;
import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class TextNormalizerTest {

    @Test
    void normalizeLowercasesAndStripsPunctuation() {
        assertThat(normalize("Python, REST APIs!")).isEqualTo("python rest apis");
    }

    @Test
    void normalizeStripsAccents() {
        assertThat(normalize("Automação e Integração")).isEqualTo("automacao e integracao");
    }

    @Test
    void normalizeHandlesCrLf() {
        assertThat(normalize("Java\r\nKafka")).isEqualTo("java kafka");
    }

    @Test
    void variantsCoverPluralInBothDirections() {
        assertThat(variants("REST APIs")).containsExactlyInAnyOrder("rest apis", "rest api");
        assertThat(variants("REST API")).containsExactlyInAnyOrder("rest api", "rest apis");
        assertThat(variants("Kafka")).containsExactlyInAnyOrder("kafka", "kafkas");
        assertThat(variants("C#")).containsExactly("c#");
    }

    @Test
    void appearsInRespectsWordBoundaries() {
        assertThat(appearsIn("Python", normalize("We run pythonic services"))).isFalse();
        assertThat(appearsIn("Python", normalize("strong Python team"))).isTrue();
    }

    @Test
    void appearsInHandlesPunctuationTokens() {
        assertThat(appearsIn("C++", normalize("we write C++ daily"))).isTrue();
        assertThat(appearsIn("CI/CD", normalize("CI/CD pipelines"))).isTrue();
        assertThat(appearsIn("Node.js", normalize("Node.js services"))).isTrue();
        assertThat(appearsIn("Java", normalize("JavaScript only"))).isFalse();
    }

    @Test
    void appearsInIgnoresAccentsOnBothSides() {
        assertThat(appearsIn("Automação", normalize("automacao de testes"))).isTrue();
        assertThat(appearsIn("Automacao", normalize("Automação de testes"))).isTrue();
    }
}
