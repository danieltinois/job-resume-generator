package io.github.danieltinois.resumetailor.profile;

import java.util.List;

import io.github.danieltinois.resumetailor.common.LocalizedText;

public record Project(String id, String name, LocalizedText description, List<String> skills, String url) {

    public Project {
        skills = skills == null ? List.of() : List.copyOf(skills);
    }
}
