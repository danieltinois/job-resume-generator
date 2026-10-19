package io.github.danieltinois.resumetailor.resume;

import static io.github.danieltinois.resumetailor.TestProfiles.achievement;
import static io.github.danieltinois.resumetailor.TestProfiles.category;
import static io.github.danieltinois.resumetailor.TestProfiles.experience;
import static io.github.danieltinois.resumetailor.TestProfiles.profile;
import static io.github.danieltinois.resumetailor.TestProfiles.project;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import io.github.danieltinois.resumetailor.job.JobParser;
import io.github.danieltinois.resumetailor.matching.InMemoryTechTermCatalog;
import io.github.danieltinois.resumetailor.matching.LexicalMatchingStrategy;
import io.github.danieltinois.resumetailor.profile.Experience;
import io.github.danieltinois.resumetailor.profile.Profile;

class SelectionSuggesterTest {

    private static final Experience LOW = experience("exp_10000000", "Low", "2020-01", "2021-01",
            achievement("low-1", "Rust only", "Rust"));
    private static final Experience HIGH = experience("exp_20000000", "High", "2023-01", null,
            achievement("h-a", "One python thing", "Python"),
            achievement("h-b", "Aws and python", "Python", "AWS"));

    private static final Profile PROFILE = profile(
            List.of(category("cat_00000001", "Skills", "Python", "AWS", "Rust")),
            List.of(LOW, HIGH),
            List.of(project("prj_keep0000", "Keep", "Python"), project("prj_drop0000", "Drop", "Rust")));

    private static final String JOB = "Backend role with Python and AWS.";

    private final LexicalMatchingStrategy strategy = new LexicalMatchingStrategy(InMemoryTechTermCatalog.defaults());
    private final SelectionSuggester suggester = new SelectionSuggester();

    private Selection suggest(Profile profile, String job) {
        return suggester.suggest(profile, strategy.analyze(profile, new JobParser().parse(job)));
    }

    @Test
    void dropsUnmatchedAchievements() {
        Selection selection = suggest(PROFILE, JOB);

        assertThat(selection.achievements()).containsOnlyKeys("exp_20000000");
        assertThat(selection.achievements().get("exp_20000000")).containsExactly("h-b", "h-a");
    }

    @Test
    void ordersAchievementsByScoreDesc() {
        assertThat(suggest(PROFILE, JOB).achievements().get("exp_20000000")).containsExactly("h-b", "h-a");
    }

    @Test
    void droppedExperienceDisappearsEntirely() {
        assertThat(suggest(PROFILE, JOB).experienceOrder()).containsExactly("exp_20000000");
    }

    @Test
    void ordersExperiencesReverseChronologically() {
        Selection selection = suggest(PROFILE, "Python and AWS and Rust everywhere");

        assertThat(selection.experienceOrder()).containsExactly("exp_20000000", "exp_10000000");
    }

    @Test
    void endedExperiencesOrderedByEndDateDesc() {
        Profile profile = profile(List.of(), List.of(
                experience("exp_older000", "Older", "2019-01", "2020-01", achievement("a", "t", "Java")),
                experience("exp_longer00", "Longer", "2018-01", "2022-01", achievement("b", "t", "Java"))),
                List.of());

        assertThat(suggest(profile, "Java").experienceOrder()).containsExactly("exp_longer00", "exp_older000");
    }

    @Test
    void sameEndDateOrderedByStartDateDesc() {
        Profile profile = profile(List.of(), List.of(
                experience("exp_early000", "Early", "2018-01", null, achievement("a", "t", "Java")),
                experience("exp_late0000", "Late", "2021-01", null, achievement("b", "t", "Java"))),
                List.of());

        assertThat(suggest(profile, "Java").experienceOrder()).containsExactly("exp_late0000", "exp_early000");
    }

    @Test
    void fallsBackToFullProfileWhenNothingMatches() {
        Selection selection = suggest(PROFILE, "We need Elixir and Haskell.");

        assertThat(selection.experienceOrder()).containsExactly("exp_20000000", "exp_10000000");
        assertThat(selection.achievements().get("exp_20000000")).containsExactly("h-a", "h-b");
        assertThat(selection.achievements().get("exp_10000000")).containsExactly("low-1");
    }

    @Test
    void matchedSkillsComeFirstPerCategory() {
        assertThat(suggest(PROFILE, JOB).skillOrder().get("cat_00000001")).containsExactly("Python", "AWS", "Rust");

        Profile categorized = profile(List.of(
                category("cat_data0000", "Data", "PostgreSQL", "Redis"),
                category("cat_web00000", "Web", "Rust", "Python")), List.of(), List.of());
        Selection selection = suggest(categorized, JOB);

        assertThat(selection.skillOrder().get("cat_data0000")).containsExactly("PostgreSQL", "Redis");
        assertThat(selection.skillOrder().get("cat_web00000")).containsExactly("Python", "Rust");
    }

    @Test
    void projectsFilteredByRelevance() {
        assertThat(suggest(PROFILE, JOB).projects()).containsExactly("prj_keep0000");
        assertThat(suggest(PROFILE, "We need Elixir.").projects()).containsExactly("prj_keep0000", "prj_drop0000");
    }
}
