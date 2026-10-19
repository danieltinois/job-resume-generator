package io.github.danieltinois.resumetailor;

import java.util.List;

import io.github.danieltinois.resumetailor.common.LocalizedText;
import io.github.danieltinois.resumetailor.profile.Achievement;
import io.github.danieltinois.resumetailor.profile.Experience;
import io.github.danieltinois.resumetailor.profile.Personal;
import io.github.danieltinois.resumetailor.profile.Profile;
import io.github.danieltinois.resumetailor.profile.Project;
import io.github.danieltinois.resumetailor.profile.SkillCategory;

/** Small builders for profiles in tests. Texts are Portuguese only unless a test sets English. */
public final class TestProfiles {

    private TestProfiles() {
    }

    public static Profile profile(List<SkillCategory> categories, List<Experience> experiences,
            List<Project> projects) {
        return new Profile(new Personal("Alex", pt("Backend"), "", "a@example.com", "", "", ""), pt("Summary text."),
                categories, experiences, projects, List.of(), List.of());
    }

    public static SkillCategory category(String id, String name, String... skills) {
        return new SkillCategory(id, pt(name), List.of(skills));
    }

    public static Experience experience(String id, String company, String start, String end,
            Achievement... achievements) {
        return new Experience(id, company, pt("Engineer"), start, end, List.of(achievements));
    }

    public static Achievement achievement(String id, String text, String... skills) {
        return new Achievement(id, pt(text), List.of(skills));
    }

    public static Project project(String id, String name, String... skills) {
        return new Project(id, name, pt("d"), List.of(skills), null);
    }

    public static LocalizedText pt(String text) {
        return new LocalizedText(text, null);
    }
}
