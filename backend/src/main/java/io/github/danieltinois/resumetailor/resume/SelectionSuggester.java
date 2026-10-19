package io.github.danieltinois.resumetailor.resume;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import io.github.danieltinois.resumetailor.matching.MatchResult;
import io.github.danieltinois.resumetailor.profile.Achievement;
import io.github.danieltinois.resumetailor.profile.Experience;
import io.github.danieltinois.resumetailor.profile.Profile;
import io.github.danieltinois.resumetailor.profile.Project;
import io.github.danieltinois.resumetailor.profile.SkillCategory;

/** Turns a match into the selection the review screen starts from. */
@Component
public class SelectionSuggester {

    /** Current jobs first, then by end date, then by start date, most recent first. */
    private static final Comparator<Experience> MOST_RECENT_FIRST = Comparator
            .comparing((Experience e) -> e.endDate() == null ? "9999-99" : e.endDate())
            .thenComparing(e -> e.startDate() == null ? "" : e.startDate())
            .reversed();

    public Selection suggest(Profile profile, MatchResult match) {
        // A tailored resume that drops every achievement is worse than an untargeted one.
        boolean anyMatch = match.scores().values().stream().anyMatch(score -> score > 0);

        Map<String, List<String>> achievements = new LinkedHashMap<>();
        List<Experience> kept = new ArrayList<>();
        for (Experience experience : profile.experiences()) {
            List<String> ids = experience.achievements().stream()
                    .filter(a -> !anyMatch || score(match, a) > 0)
                    .sorted(Comparator.comparingInt((Achievement a) -> score(match, a)).reversed())
                    .map(Achievement::id)
                    .toList();
            if (!ids.isEmpty()) {
                achievements.put(experience.id(), ids);
                kept.add(experience);
            }
        }
        List<String> experienceOrder = kept.stream().sorted(MOST_RECENT_FIRST).map(Experience::id).toList();

        List<Project> relevant = profile.projects().stream()
                .filter(project -> project.skills().stream().anyMatch(match::matches))
                .toList();
        List<String> projects = (relevant.isEmpty() ? profile.projects() : relevant).stream()
                .map(Project::id)
                .toList();

        Map<String, List<String>> skillOrder = new LinkedHashMap<>();
        for (SkillCategory category : profile.skillCategories()) {
            List<String> ordered = new ArrayList<>(category.skills().stream().filter(match::matches).toList());
            category.skills().stream().filter(skill -> !match.matches(skill)).forEach(ordered::add);
            skillOrder.put(category.id(), ordered);
        }

        return new Selection(experienceOrder, achievements, projects, skillOrder);
    }

    private static int score(MatchResult match, Achievement achievement) {
        return match.scores().getOrDefault(achievement.id(), 0);
    }
}
