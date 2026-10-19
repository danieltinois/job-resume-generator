package io.github.danieltinois.resumetailor.profile;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import io.github.danieltinois.resumetailor.Fixtures;
import io.github.danieltinois.resumetailor.common.LocalizedText;

class ProfileValidatorTest {

    private final ProfileValidator validator = new ProfileValidator();

    private static Profile withExperiences(Experience... experiences) {
        return new Profile(new Personal("Alex", new LocalizedText("Dev", null), "", "", "", "", ""),
                null, List.of(), List.of(experiences), List.of(), List.of(), List.of());
    }

    private static Experience experience(String id, String start, Achievement... achievements) {
        return new Experience(id, "Acme", new LocalizedText("Dev", null), start, null, List.of(achievements));
    }

    private static Achievement achievement(String id, String pt) {
        return new Achievement(id, new LocalizedText(pt, null), List.of());
    }

    @Test
    void exampleFixtureIsValid() {
        assertThat(validator.validate(Fixtures.exampleProfile())).isEmpty();
    }

    @Test
    void minimalProfileIsValid() {
        assertThat(validator.validate(withExperiences())).isEmpty();
    }

    @Test
    void duplicateAchievementIdIsRejected() {
        Profile profile = withExperiences(
                experience("exp_00000001", "2020-01", achievement("ach_aaaaaaaa", "a")),
                experience("exp_00000002", "2021-01", achievement("ach_aaaaaaaa", "b")));

        assertThat(validator.validate(profile)).singleElement().satisfies(violation -> {
            assertThat(violation.path()).isEqualTo("experiences[1].achievements[0].id");
            assertThat(violation.message()).contains("duplicate");
        });
    }

    @Test
    void missingPersonalNameIsRejected() {
        Profile profile = new Profile(new Personal(" ", new LocalizedText("Dev", null), "", "", "", "", ""),
                null, null, null, null, null, null);

        assertThat(validator.validate(profile)).extracting(ProfileViolation::path).containsExactly("personal.name");
    }

    @Test
    void missingPtOnLocalizedFieldIsRejected() {
        Profile profile = withExperiences(experience("exp_00000001", "2020-01",
                new Achievement("ach_00000001", new LocalizedText("", "x"), List.of())));

        assertThat(validator.validate(profile)).extracting(ProfileViolation::path)
                .containsExactly("experiences[0].achievements[0].text.pt");
    }

    @Test
    void badDateIsRejected() {
        assertThat(validator.validate(withExperiences(experience("exp_00000001", "2023/01"))))
                .extracting(ProfileViolation::path).containsExactly("experiences[0].startDate");
        assertThat(validator.validate(withExperiences(experience("exp_00000001", "2023-13"))))
                .extracting(ProfileViolation::path).containsExactly("experiences[0].startDate");
        assertThat(validator.validate(withExperiences(experience("exp_00000001", "2023-02")))).isEmpty();
    }

    @Test
    void claimedSkillsIncludesEverySource() {
        Profile profile = Fixtures.exampleProfile();

        assertThat(profile.claimedSkills()).contains("Bash", "Git", "Typst", "PyYAML");
    }

    @Test
    void allSkillsDeduplicatesAcrossCategories() {
        Profile profile = new Profile(new Personal("A", new LocalizedText("B", null), "", "", "", "", ""), null,
                List.of(new SkillCategory("cat_00000001", new LocalizedText("X", null), List.of("Java", "SQL")),
                        new SkillCategory("cat_00000002", new LocalizedText("Y", null), List.of("SQL", "AWS"))),
                null, null, null, null);

        assertThat(profile.allSkills()).containsExactly("Java", "SQL", "AWS");
    }
}
