package io.github.danieltinois.resumetailor.matching;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Component;

import io.github.danieltinois.resumetailor.job.JobText;
import io.github.danieltinois.resumetailor.profile.Achievement;
import io.github.danieltinois.resumetailor.profile.Experience;
import io.github.danieltinois.resumetailor.profile.Profile;

/**
 * Deterministic keyword matching: no AI, no embeddings. A skill counts with
 * the weight of the job section it appears in, under any of its names.
 */
@Component
public class LexicalMatchingStrategy implements MatchingStrategy {

    private final TechTermCatalog catalog;

    public LexicalMatchingStrategy(TechTermCatalog catalog) {
        this.catalog = catalog;
    }

    @Override
    public MatchResult analyze(Profile profile, JobText job) {
        Map<String, Integer> skillWeights = new LinkedHashMap<>();
        for (String skill : profile.claimedSkills()) {
            int weight = job.weightOf(forms(skill));
            if (weight > 0) {
                skillWeights.put(skill, weight);
            }
        }

        List<String> matched = profile.allSkills().stream().filter(skillWeights::containsKey).toList();

        Map<String, Integer> scores = new LinkedHashMap<>();
        for (Experience experience : profile.experiences()) {
            for (Achievement achievement : experience.achievements()) {
                scores.put(achievement.id(),
                        achievement.skills().stream().mapToInt(skill -> skillWeights.getOrDefault(skill, 0)).sum());
            }
        }

        return new MatchResult(matched, missing(profile, job), scores, skillWeights);
    }

    /** Known technologies the job asks for that the profile never claims, under any name. */
    private List<String> missing(Profile profile, JobText job) {
        Set<String> claimed = new HashSet<>();
        profile.claimedSkills().forEach(skill -> claimed.add(catalog.canonicalOf(skill)));
        List<String> missing = new ArrayList<>();
        for (TechTerm term : catalog.all()) {
            if (!claimed.contains(term.canonical()) && job.weightOf(forms(term.canonical())) > 0) {
                missing.add(term.canonical());
            }
        }
        return missing;
    }

    private Set<String> forms(String skill) {
        Set<String> forms = new LinkedHashSet<>();
        catalog.formsOf(skill).forEach(form -> forms.addAll(TextNormalizer.variants(form)));
        return forms;
    }
}
