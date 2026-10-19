package io.github.danieltinois.resumetailor.profile;

import java.util.List;

import io.github.danieltinois.resumetailor.common.LocalizedText;

public record SkillCategory(String id, LocalizedText name, List<String> skills) {

    public SkillCategory {
        skills = Lists.copy(skills);
    }
}
