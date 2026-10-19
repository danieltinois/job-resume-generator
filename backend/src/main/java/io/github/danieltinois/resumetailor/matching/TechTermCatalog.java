package io.github.danieltinois.resumetailor.matching;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/** The known technologies: used for synonyms and to flag job requirements the profile lacks. */
public interface TechTermCatalog {

    List<TechTerm> all();

    /**
     * Every normalized name of the term {@code skill} belongs to, or just the
     * normalized skill when the catalog does not know it.
     */
    default Set<String> formsOf(String skill) {
        TechTerm term = find(skill);
        Set<String> forms = new LinkedHashSet<>();
        if (term == null) {
            forms.add(TextNormalizer.normalize(skill));
        } else {
            forms.add(TextNormalizer.normalize(term.canonical()));
            term.aliases().forEach(alias -> forms.add(TextNormalizer.normalize(alias)));
        }
        return forms;
    }

    /** The canonical name of {@code skill}, or {@code skill} itself when unknown. */
    default String canonicalOf(String skill) {
        TechTerm term = find(skill);
        return term == null ? skill : term.canonical();
    }

    private TechTerm find(String skill) {
        String normalized = TextNormalizer.normalize(skill);
        for (TechTerm term : all()) {
            if (TextNormalizer.normalize(term.canonical()).equals(normalized)
                    || term.aliases().stream().map(TextNormalizer::normalize).anyMatch(normalized::equals)) {
                return term;
            }
        }
        return null;
    }
}
