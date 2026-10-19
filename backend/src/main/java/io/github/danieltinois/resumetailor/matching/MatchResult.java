package io.github.danieltinois.resumetailor.matching;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * How one profile relates to one job.
 *
 * @param matchedSkills categorized profile skills found in the job, in profile order
 * @param missingSkills known technologies the job mentions and the profile never claims
 * @param scores        achievement id to score (sum of its matched skills' weights), in profile order
 * @param skillWeights  every claimed skill found in the job, with the weight it counts for
 */
public record MatchResult(List<String> matchedSkills, List<String> missingSkills, Map<String, Integer> scores,
        Map<String, Integer> skillWeights) {

    public MatchResult {
        matchedSkills = List.copyOf(matchedSkills);
        missingSkills = List.copyOf(missingSkills);
        scores = Collections.unmodifiableMap(new LinkedHashMap<>(scores));
        skillWeights = Collections.unmodifiableMap(new LinkedHashMap<>(skillWeights));
    }

    public boolean matches(String skill) {
        return skillWeights.containsKey(skill);
    }
}
