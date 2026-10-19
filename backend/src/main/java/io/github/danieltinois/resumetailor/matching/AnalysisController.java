package io.github.danieltinois.resumetailor.matching;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.github.danieltinois.resumetailor.auth.User;
import io.github.danieltinois.resumetailor.common.CurrentUser;
import io.github.danieltinois.resumetailor.common.Language;
import io.github.danieltinois.resumetailor.common.NotFoundException;
import io.github.danieltinois.resumetailor.job.JobParser;
import io.github.danieltinois.resumetailor.job.JobRepository;
import io.github.danieltinois.resumetailor.job.JobText;
import io.github.danieltinois.resumetailor.job.StoredJob;
import io.github.danieltinois.resumetailor.profile.Profile;
import io.github.danieltinois.resumetailor.profile.ProfileRepository;
import io.github.danieltinois.resumetailor.profile.StoredProfile;
import io.github.danieltinois.resumetailor.resume.ResumeAssembler;
import io.github.danieltinois.resumetailor.resume.Selection;
import io.github.danieltinois.resumetailor.resume.SelectionSuggester;

/** How the user's profile matches one job, and the selection the review screen starts from. */
@RestController
public class AnalysisController {

    public record Analysis(Language language, List<String> matchedSkills, List<String> missingSkills,
            Map<String, Integer> scores, Selection suggestion, List<String> warnings) {
    }

    private final JobRepository jobs;
    private final ProfileRepository profiles;
    private final JobParser parser;
    private final MatchingStrategy matching;
    private final SelectionSuggester suggester;
    private final ResumeAssembler assembler;
    private final CurrentUser currentUser;

    public AnalysisController(JobRepository jobs, ProfileRepository profiles, JobParser parser,
            MatchingStrategy matching, SelectionSuggester suggester, ResumeAssembler assembler,
            CurrentUser currentUser) {
        this.jobs = jobs;
        this.profiles = profiles;
        this.parser = parser;
        this.matching = matching;
        this.suggester = suggester;
        this.assembler = assembler;
        this.currentUser = currentUser;
    }

    /** @param lang the resume language; defaults to the language detected in the job */
    @GetMapping("/api/jobs/{id}/analysis")
    public Analysis analyze(@PathVariable UUID id, @RequestParam(required = false) Language lang,
            Authentication authentication) {
        User user = currentUser.require(authentication);
        StoredJob job = jobs.find(user.id(), id).orElseThrow(NotFoundException::new);
        Profile profile = profiles.find(user.id()).map(StoredProfile::data)
                .orElseGet(() -> new Profile(null, null, null, null, null, null, null));
        Language language = lang == null ? job.language() : lang;

        JobText text = parser.parse(job.description());
        MatchResult match = matching.analyze(profile, text);
        Selection suggestion = suggester.suggest(profile, match);
        List<String> warnings = profile.personal() == null
                ? List.of()
                : assembler.assemble(profile, suggestion, language).warnings();
        return new Analysis(language, match.matchedSkills(), match.missingSkills(), match.scores(), suggestion,
                warnings);
    }
}
