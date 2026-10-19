package io.github.danieltinois.resumetailor.resume;

import java.util.List;

import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

/**
 * Exactly what the Typst template renders, already in one language. Every
 * string here was copied from the profile. Serialized in snake_case, which is
 * the template's contract.
 */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ResumeDocument(String lang, Personal personal, String summary, List<Category> skillCategories,
        List<ExperienceEntry> experience, List<ProjectEntry> projects, List<EducationEntry> education,
        List<LanguageEntry> languages) {

    public record Personal(String name, String title, String location, String email, String phone,
            String linkedin, String github) {
    }

    public record Category(String name, List<String> skills) {
    }

    public record ExperienceEntry(String company, String role, String period, List<AchievementEntry> achievements) {
    }

    public record AchievementEntry(String id, String text) {
    }

    public record ProjectEntry(String name, String description, List<String> skills, String url) {
    }

    public record EducationEntry(String institution, String degree, String period) {
    }

    public record LanguageEntry(String name, String level) {
    }
}
