package io.github.danieltinois.resumetailor.profile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

import io.github.danieltinois.resumetailor.Fixtures;
import io.github.danieltinois.resumetailor.common.Language;
import io.github.danieltinois.resumetailor.common.LocalizedText;

class LegacyProfileConverterTest {

    private static final String WEBHOOKS = "Rebuilt the payment webhook pipeline on Kafka, processing 4M events per"
            + " day with idempotent consumers and full replay.";

    private final LegacyProfileConverter converter = new LegacyProfileConverter();

    @Test
    void convertsExampleIntoValidProfile() {
        Profile profile = converter.convert(Fixtures.text("legacy-profile.yaml"), Language.EN);

        assertThat(new ProfileValidator().validate(profile)).isEmpty();
        assertThat(profile.experiences()).hasSize(2);
        assertThat(profile.experiences().stream().mapToInt(e -> e.achievements().size()).sum()).isEqualTo(6);
        assertThat(profile.skillCategories()).hasSize(5);
        assertThat(profile.experiences().get(0).startDate()).isEqualTo("2023-02");
        assertThat(profile.experiences().get(0).endDate()).isNull();
    }

    @Test
    void freeTextGoesToChosenLanguage() {
        Achievement english = converter.convert(Fixtures.text("legacy-profile.yaml"), Language.EN)
                .experiences().get(0).achievements().get(0);
        Achievement portuguese = converter.convert(Fixtures.text("legacy-profile.yaml"), Language.PT)
                .experiences().get(0).achievements().get(0);

        assertThat(english.text()).isEqualTo(new LocalizedText(WEBHOOKS, WEBHOOKS));
        assertThat(portuguese.text()).isEqualTo(new LocalizedText(WEBHOOKS, null));
    }

    @Test
    void legacyIdsAreReplacedByGeneratedIds() {
        Profile profile = converter.convert(Fixtures.text("legacy-profile.yaml"), Language.EN);

        assertThat(profile.experiences()).allSatisfy(experience -> {
            assertThat(experience.id()).matches("exp_[0-9a-f]{8}");
            assertThat(experience.achievements()).allSatisfy(a -> assertThat(a.id()).matches("ach_[0-9a-f]{8}"));
        });
        assertThat(profile.skillCategories()).allSatisfy(c -> assertThat(c.id()).matches("cat_[0-9a-f]{8}"));
        assertThat(profile.projects()).allSatisfy(p -> assertThat(p.id()).matches("prj_[0-9a-f]{8}"));
        assertThat(profile.education()).allSatisfy(e -> assertThat(e.id()).matches("edu_[0-9a-f]{8}"));
    }

    @Test
    void flatSkillsBecomeOneCategory() {
        Profile profile = converter.convert("""
                personal: {name: A, title: B}
                skills: [Python, SQL]
                """, Language.PT);

        assertThat(profile.skillCategories()).singleElement().satisfies(category -> {
            assertThat(category.name()).isEqualTo(new LocalizedText("Habilidades", "Skills"));
            assertThat(category.skills()).containsExactly("Python", "SQL");
        });
    }

    @Test
    void flatSkillsMissingFromCategoriesAreKept() {
        Profile profile = converter.convert("""
                personal: {name: A, title: B}
                skills: [Python, Rust]
                skill_categories:
                  - name: Languages
                    skills: [Python]
                """, Language.EN);

        assertThat(profile.allSkills()).containsExactly("Python", "Rust");
    }

    @Test
    void invalidYamlFails() {
        assertThatThrownBy(() -> converter.convert("a: [b", Language.PT))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> converter.convert("- just a list", Language.PT))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
