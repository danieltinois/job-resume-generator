package io.github.danieltinois.resumetailor.profile;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import io.github.danieltinois.resumetailor.common.LocalizedText;

/**
 * Everything the user has done, in both languages. The single source of truth:
 * a generated resume only ever copies content from here, by id.
 */
public record Profile(Personal personal, LocalizedText summary, List<SkillCategory> skillCategories,
        List<Experience> experiences, List<Project> projects, List<Education> education,
        List<LanguageSkill> languages) {

    public Profile {
        skillCategories = Lists.copy(skillCategories);
        experiences = Lists.copy(experiences);
        projects = Lists.copy(projects);
        education = Lists.copy(education);
        languages = Lists.copy(languages);
    }

    /** Every categorized skill in profile order, without duplicates. */
    public List<String> allSkills() {
        Set<String> skills = new LinkedHashSet<>();
        skillCategories.forEach(category -> skills.addAll(category.skills()));
        return List.copyOf(skills);
    }

    /** Every technology the profile claims anywhere: categories, achievements and projects. */
    public Set<String> claimedSkills() {
        Set<String> skills = new LinkedHashSet<>(allSkills());
        experiences.forEach(experience -> experience.achievements().forEach(a -> skills.addAll(a.skills())));
        projects.forEach(project -> skills.addAll(project.skills()));
        return skills;
    }
}
