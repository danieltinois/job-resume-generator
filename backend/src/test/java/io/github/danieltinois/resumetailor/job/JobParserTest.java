package io.github.danieltinois.resumetailor.job;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;

import org.junit.jupiter.api.Test;

import io.github.danieltinois.resumetailor.Fixtures;

class JobParserTest {

    private static final String SECTIONED = """
            # Desenvolvedor Backend
            Empresa: Acme

            Venha trabalhar conosco.

            ## Requisitos
            - Java
            - Kafka

            ## Diferenciais
            - Docker
            """;

    private final JobParser parser = new JobParser();

    @Test
    void splitsRequirementsAndNiceToHave() {
        JobText job = parser.parse(SECTIONED);

        assertThat(job.weightOf(Set.of("java"))).isEqualTo(2);
        assertThat(job.weightOf(Set.of("docker"))).isEqualTo(1);
        assertThat(job.weightOf(Set.of("rust"))).isZero();
    }

    @Test
    void noHeadingsMeansOneWeightOneSection() {
        JobText job = parser.parse("Java and Kafka");

        assertThat(job.sections()).singleElement().extracting(JobSection::weight).isEqualTo(1);
        assertThat(job.weightOf(Set.of("kafka"))).isEqualTo(1);
    }

    @Test
    void crLfLineEndingsStillSplit() {
        JobText job = parser.parse(SECTIONED.replace("\n", "\r\n"));

        assertThat(job.weightOf(Set.of("java"))).isEqualTo(2);
        assertThat(job.weightOf(Set.of("docker"))).isEqualTo(1);
    }

    @Test
    void inlineHeadingCarriesWeight() {
        JobText job = parser.parse("Requirements: Java, Kafka\nNice to have: Docker");

        assertThat(job.weightOf(Set.of("java"))).isEqualTo(2);
        assertThat(job.weightOf(Set.of("kafka"))).isEqualTo(2);
        assertThat(job.weightOf(Set.of("docker"))).isEqualTo(1);
    }

    @Test
    void skillInBothSectionsTakesHighestWeight() {
        JobText job = parser.parse("Nice to have: Java\nRequirements: Java");

        assertThat(job.weightOf(Set.of("java"))).isEqualTo(2);
    }

    @Test
    void wordThatOnlyStartsLikeAHeadingIsNotOne() {
        JobText job = parser.parse("Requisitos: Java\nAboutness is not a heading: Docker");

        assertThat(job.weightOf(Set.of("docker"))).isEqualTo(2);
    }

    @Test
    void extractsTitleAndCompany() {
        JobText job = parser.parse(Fixtures.text("job-example.md"));

        assertThat(job.title()).isEqualTo("Backend Engineer");
        assertThat(job.company()).isEqualTo("Example");
    }

    @Test
    void companyLineInPortuguese() {
        assertThat(parser.parse(SECTIONED).company()).isEqualTo("Acme");
    }

    @Test
    void titleFallsBackToFirstLine() {
        JobText job = parser.parse("\n\n  Senior Java Developer  \nWe need Java.");

        assertThat(job.title()).isEqualTo("Senior Java Developer");
        assertThat(job.company()).isNull();
    }
}
