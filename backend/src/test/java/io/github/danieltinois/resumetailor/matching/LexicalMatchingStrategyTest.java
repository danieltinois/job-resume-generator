package io.github.danieltinois.resumetailor.matching;

import static io.github.danieltinois.resumetailor.TestProfiles.achievement;
import static io.github.danieltinois.resumetailor.TestProfiles.category;
import static io.github.danieltinois.resumetailor.TestProfiles.experience;
import static io.github.danieltinois.resumetailor.TestProfiles.profile;
import static io.github.danieltinois.resumetailor.TestProfiles.project;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import io.github.danieltinois.resumetailor.job.JobParser;
import io.github.danieltinois.resumetailor.profile.Profile;

class LexicalMatchingStrategyTest {

    private static final Profile PROFILE = profile(
            List.of(category("cat_00000001", "Skills", "Python", "PostgreSQL", "REST API", "AWS")),
            List.of(experience("exp_00000001", "A", "2023-01", null,
                    achievement("hit-two", "t", "PostgreSQL", "AWS"),
                    achievement("hit-one", "t", "Python"),
                    achievement("miss", "t", "Rust"))),
            List.of());

    private static final String JOB = "We need Python, PostgreSQL and AWS. Docker is a plus.";

    private final LexicalMatchingStrategy strategy = new LexicalMatchingStrategy(InMemoryTechTermCatalog.defaults());
    private final JobParser parser = new JobParser();

    private MatchResult analyze(Profile profile, String job) {
        return strategy.analyze(profile, parser.parse(job));
    }

    @Test
    void scoresSumOfMatchedSkillWeights() {
        assertThat(analyze(PROFILE, JOB).scores())
                .containsExactly(java.util.Map.entry("hit-two", 2), java.util.Map.entry("hit-one", 1),
                        java.util.Map.entry("miss", 0));
    }

    @Test
    void matchesProfileSkillsPluralAgnostically() {
        assertThat(analyze(PROFILE, "Looking for REST APIs and Python.").matchedSkills())
                .containsExactly("Python", "REST API");
    }

    @Test
    void reportsJobTechAbsentFromProfile() {
        MatchResult result = analyze(PROFILE, JOB);

        assertThat(result.missingSkills()).contains("Docker").doesNotContain("Python");
    }

    @Test
    void aliasInJobMatchesCanonicalSkill() {
        MatchResult result = analyze(PROFILE, "Experience with Postgres.");

        assertThat(result.matchedSkills()).containsExactly("PostgreSQL");
        assertThat(result.missingSkills()).doesNotContain("PostgreSQL");
    }

    @Test
    void aliasInProfileMatchesCanonicalInJob() {
        Profile profile = profile(List.of(category("cat_00000001", "Infra", "k8s")), List.of(), List.of());

        MatchResult result = analyze(profile, "We run Kubernetes.");

        assertThat(result.matchedSkills()).containsExactly("k8s");
        assertThat(result.missingSkills()).doesNotContain("Kubernetes");
    }

    @Test
    void requirementSkillsWeighDouble() {
        MatchResult result = analyze(PROFILE, "Requisitos: Python\nDiferenciais: AWS");

        assertThat(result.scores()).containsEntry("hit-two", 1).containsEntry("hit-one", 2);
        assertThat(result.skillWeights()).containsEntry("Python", 2).containsEntry("AWS", 1);
    }

    @Test
    void portugueseJobWithAccentsMatches() {
        Profile profile = profile(List.of(category("cat_00000001", "Práticas", "Integração Contínua")), List.of(),
                List.of());

        assertThat(analyze(profile, "Experiencia com integracao continua").matchedSkills())
                .containsExactly("Integração Contínua");
    }

    @Test
    void categoriesFeedMatchedSkills() {
        Profile profile = profile(List.of(category("cat_00000001", "Web", "Python", "Rust")), List.of(), List.of());

        assertThat(analyze(profile, "Backend role with Python and AWS.").matchedSkills()).containsExactly("Python");
    }

    @Test
    void projectSkillsOutsideCategoriesAreWeighed() {
        Profile profile = profile(List.of(), List.of(), List.of(project("prj_00000001", "Tool", "Typst")));

        MatchResult result = analyze(profile, "Typst experience");

        assertThat(result.matches("Typst")).isTrue();
        assertThat(result.matchedSkills()).isEmpty();
    }
}
