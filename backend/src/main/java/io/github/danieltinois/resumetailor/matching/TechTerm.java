package io.github.danieltinois.resumetailor.matching;

import java.util.List;

/** A technology under its canonical name, with the other names job descriptions use for it. */
public record TechTerm(String canonical, List<String> aliases) {

    public TechTerm {
        aliases = aliases == null ? List.of() : List.copyOf(aliases);
    }
}
