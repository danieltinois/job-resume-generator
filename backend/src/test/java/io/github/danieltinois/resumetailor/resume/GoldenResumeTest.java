package io.github.danieltinois.resumetailor.resume;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.time.Duration;

import org.junit.jupiter.api.Test;

import io.github.danieltinois.resumetailor.Fixtures;
import io.github.danieltinois.resumetailor.common.Language;
import io.github.danieltinois.resumetailor.job.JobParser;
import io.github.danieltinois.resumetailor.job.JobText;
import io.github.danieltinois.resumetailor.matching.InMemoryTechTermCatalog;
import io.github.danieltinois.resumetailor.matching.LexicalMatchingStrategy;
import io.github.danieltinois.resumetailor.matching.MatchResult;
import io.github.danieltinois.resumetailor.profile.Profile;

/** The whole engine, end to end, on the fictional example profile and job. */
class GoldenResumeTest {

    @Test
    void examplesRenderTailoredResume() throws IOException {
        Profile profile = Fixtures.exampleProfile();
        JobText job = new JobParser().parse(Fixtures.text("job-example.md"));
        MatchResult match = new LexicalMatchingStrategy(InMemoryTechTermCatalog.defaults()).analyze(profile, job);
        Selection selection = new SelectionSuggester().suggest(profile, match);
        AssembledResume resume = new ResumeAssembler().assemble(profile, selection, job.language());
        byte[] pdf = new TypstRenderer(new TypstProperties("typst", Duration.ofSeconds(30), 0))
                .render(resume.document());

        assertThat(job.language()).isEqualTo(Language.EN);
        assertThat(match.matchedSkills()).contains("Python", "PostgreSQL", "REST API", "Kafka", "AWS", "Docker");
        assertThat(match.missingSkills()).contains("CI/CD").doesNotContain("Docker");
        assertThat(resume.warnings()).isEmpty();

        String text = TypstRendererTest.text(pdf).replaceAll("\\s+", " ");
        assertThat(text.indexOf("Example Payments")).isNotNegative()
                .isLessThan(text.indexOf("Fictional Data Co"));
        assertThat(text).contains("4M events per day", "EXPERIENCE");
    }
}
