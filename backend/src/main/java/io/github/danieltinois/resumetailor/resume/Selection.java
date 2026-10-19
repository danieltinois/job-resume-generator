package io.github.danieltinois.resumetailor.resume;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * What goes into one resume, and in which order, expressed only as profile ids
 * (and skill names). Suggested by the matcher, then adjusted by the user.
 *
 * @param experienceOrder experience ids, top to bottom
 * @param achievements    experience id to its achievement ids, top to bottom
 * @param projects        project ids, top to bottom
 * @param skillOrder      skill category id to its skills, in display order
 */
public record Selection(List<String> experienceOrder, Map<String, List<String>> achievements, List<String> projects,
        Map<String, List<String>> skillOrder) {

    public Selection {
        experienceOrder = List.copyOf(experienceOrder);
        achievements = copy(achievements);
        projects = List.copyOf(projects);
        skillOrder = copy(skillOrder);
    }

    private static Map<String, List<String>> copy(Map<String, List<String>> map) {
        Map<String, List<String>> copy = new LinkedHashMap<>();
        map.forEach((key, values) -> copy.put(key, List.copyOf(values)));
        return Collections.unmodifiableMap(copy);
    }
}
