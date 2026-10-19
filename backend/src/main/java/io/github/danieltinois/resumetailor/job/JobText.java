package io.github.danieltinois.resumetailor.job;

import java.util.List;
import java.util.Set;

import io.github.danieltinois.resumetailor.common.Language;
import io.github.danieltinois.resumetailor.matching.TextNormalizer;

/** A parsed job description: what the matcher reads. */
public record JobText(String title, String company, Language language, List<JobSection> sections) {

    public JobText {
        sections = List.copyOf(sections);
    }

    /**
     * The highest weight among the sections that mention any of the
     * normalized {@code forms}, or 0 when none does.
     */
    public int weightOf(Set<String> forms) {
        int weight = 0;
        for (JobSection section : sections) {
            if (section.weight() > weight
                    && forms.stream().anyMatch(form -> TextNormalizer.containsTerm(section.normalizedText(), form))) {
                weight = section.weight();
            }
        }
        return weight;
    }
}
