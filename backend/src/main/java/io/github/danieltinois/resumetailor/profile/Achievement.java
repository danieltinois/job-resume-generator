package io.github.danieltinois.resumetailor.profile;

import java.util.List;

import io.github.danieltinois.resumetailor.common.LocalizedText;

/** One resume bullet. Its id is the anchor every generated resume refers to. */
public record Achievement(String id, LocalizedText text, List<String> skills) {

    public Achievement {
        skills = skills == null ? List.of() : List.copyOf(skills);
    }
}
