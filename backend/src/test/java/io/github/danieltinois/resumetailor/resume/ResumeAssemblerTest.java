package io.github.danieltinois.resumetailor.resume;

import static io.github.danieltinois.resumetailor.TestProfiles.achievement;
import static io.github.danieltinois.resumetailor.TestProfiles.category;
import static io.github.danieltinois.resumetailor.TestProfiles.experience;
import static io.github.danieltinois.resumetailor.TestProfiles.profile;
import static io.github.danieltinois.resumetailor.TestProfiles.project;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import io.github.danieltinois.resumetailor.Fixtures;
import io.github.danieltinois.resumetailor.common.Language;
import io.github.danieltinois.resumetailor.profile.Profile;
import tools.jackson.databind.JsonNode;

class ResumeAssemblerTest {

    private static final Profile PROFILE = profile(
            List.of(category("cat_00000001", "Skills", "Python", "AWS", "Rust")),
            List.of(
                    experience("exp_10000000", "Low", "2020-01", "2021-01", achievement("low-1", "Rust only", "Rust")),
                    experience("exp_20000000", "High", "2023-01", null,
                            achievement("h-a", "One python thing", "Python"),
                            achievement("h-b", "Aws and python", "Python", "AWS"))),
            List.of(project("prj_keep0000", "Keep", "Python"), project("prj_drop0000", "Drop", "Rust")));

    private static final Selection SELECTION = new Selection(
            List.of("exp_20000000", "exp_10000000"),
            Map.of("exp_20000000", List.of("h-b", "h-a"), "exp_10000000", List.of("low-1")),
            List.of("prj_drop0000", "prj_keep0000"),
            Map.of("cat_00000001", List.of("Rust", "Python", "AWS")));

    private final ResumeAssembler assembler = new ResumeAssembler();

    @Test
    void keepsAchievementTextVerbatim() {
        ResumeDocument document = assembler.assemble(PROFILE, SELECTION, Language.PT).document();

        assertThat(document.experience())
                .flatExtracting(ResumeDocument.ExperienceEntry::achievements)
                .extracting(ResumeDocument.AchievementEntry::id, ResumeDocument.AchievementEntry::text)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("h-b", "Aws and python"),
                        org.assertj.core.groups.Tuple.tuple("h-a", "One python thing"),
                        org.assertj.core.groups.Tuple.tuple("low-1", "Rust only"));
    }

    @Test
    void followsSelectionOrder() {
        ResumeDocument document = assembler.assemble(PROFILE, SELECTION, Language.PT).document();

        assertThat(document.experience()).extracting(ResumeDocument.ExperienceEntry::company)
                .containsExactly("High", "Low");
        assertThat(document.projects()).extracting(ResumeDocument.ProjectEntry::name).containsExactly("Drop", "Keep");
        assertThat(document.skillCategories()).singleElement()
                .satisfies(c -> assertThat(c.skills()).containsExactly("Rust", "Python", "AWS"));
        assertThat(document.experience().get(0).period()).isEqualTo("jan 2023 – Atual");
    }

    @Test
    void unknownAchievementIdIsRejected() {
        Selection selection = new Selection(List.of("exp_20000000"),
                Map.of("exp_20000000", List.of("ach_deadbeef")), List.of(), Map.of());

        assertThatThrownBy(() -> assembler.assemble(PROFILE, selection, Language.PT))
                .isInstanceOf(UnknownSelectionIdException.class)
                .hasMessageContaining("ach_deadbeef");
    }

    @Test
    void achievementUnderWrongExperienceIsRejected() {
        Selection selection = new Selection(List.of("exp_10000000"),
                Map.of("exp_10000000", List.of("h-a")), List.of(), Map.of());

        assertThatThrownBy(() -> assembler.assemble(PROFILE, selection, Language.PT))
                .isInstanceOf(UnknownSelectionIdException.class)
                .hasMessageContaining("h-a");
    }

    @Test
    void unknownExperienceProjectOrCategoryIsRejected() {
        assertThatThrownBy(() -> assembler.assemble(PROFILE,
                new Selection(List.of("exp_nope0000"), Map.of(), List.of(), Map.of()), Language.PT))
                .isInstanceOf(UnknownSelectionIdException.class);
        assertThatThrownBy(() -> assembler.assemble(PROFILE,
                new Selection(List.of(), Map.of(), List.of("prj_nope0000"), Map.of()), Language.PT))
                .isInstanceOf(UnknownSelectionIdException.class);
        assertThatThrownBy(() -> assembler.assemble(PROFILE,
                new Selection(List.of(), Map.of(), List.of(), Map.of("cat_nope0000", List.of())), Language.PT))
                .isInstanceOf(UnknownSelectionIdException.class);
    }

    @Test
    void skillNotInItsCategoryIsRejected() {
        Selection selection = new Selection(List.of(), Map.of(), List.of(),
                Map.of("cat_00000001", List.of("Python", "Haskell")));

        assertThatThrownBy(() -> assembler.assemble(PROFILE, selection, Language.PT))
                .isInstanceOf(UnknownSelectionIdException.class)
                .hasMessageContaining("Haskell");
    }

    @Test
    void englishFallsBackToPortugueseWithWarnings() {
        AssembledResume resume = assembler.assemble(PROFILE, SELECTION, Language.EN);

        assertThat(resume.document().summary()).isEqualTo("Summary text.");
        assertThat(resume.document().experience().get(0).achievements().get(0).text()).isEqualTo("Aws and python");
        assertThat(resume.document().experience().get(0).period()).isEqualTo("Jan 2023 – Present");
        assertThat(resume.warnings())
                .contains("summary: no EN text, PT used")
                .contains("experiences[1].achievements[1].text: no EN text, PT used");
    }

    @Test
    void unselectedItemsProduceNoWarnings() {
        Selection onlyHigh = new Selection(List.of("exp_20000000"), Map.of("exp_20000000", List.of("h-a")),
                List.of(), Map.of());

        List<String> warnings = assembler.assemble(PROFILE, onlyHigh, Language.EN).warnings();

        assertThat(warnings).noneMatch(w -> w.startsWith("experiences[0]") || w.startsWith("projects"))
                .doesNotContain("experiences[1].achievements[1].text: no EN text, PT used");
    }

    @Test
    void englishTextIsUsedWhenPresent() {
        AssembledResume resume = assembler.assemble(Fixtures.exampleProfile(),
                new Selection(List.of("exp_0000000a"), Map.of("exp_0000000a", List.of("ach_0000000a")), List.of(),
                        Map.of()),
                Language.EN);

        assertThat(resume.document().experience().get(0).role()).isEqualTo("Senior Backend Engineer");
        assertThat(resume.document().personal().title()).isEqualTo("Backend Engineer");
        assertThat(resume.warnings()).isEmpty();
    }

    @Test
    void documentHasOnlyTemplateKeys() {
        ResumeDocument document = assembler.assemble(PROFILE, SELECTION, Language.EN).document();

        JsonNode json = Fixtures.JSON.valueToTree(document);

        assertThat(json.propertyNames()).containsExactlyInAnyOrder(
                "lang", "personal", "summary", "skill_categories", "experience", "projects", "education",
                "languages");
        assertThat(json.get("lang").asString()).isEqualTo("en");
    }
}
