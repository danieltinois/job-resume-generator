package io.github.danieltinois.resumetailor.resume;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import io.github.danieltinois.resumetailor.common.Language;
import io.github.danieltinois.resumetailor.common.LocalizedText;
import io.github.danieltinois.resumetailor.profile.Achievement;
import io.github.danieltinois.resumetailor.profile.Education;
import io.github.danieltinois.resumetailor.profile.Experience;
import io.github.danieltinois.resumetailor.profile.LanguageSkill;
import io.github.danieltinois.resumetailor.profile.Profile;
import io.github.danieltinois.resumetailor.profile.Project;
import io.github.danieltinois.resumetailor.profile.SkillCategory;

/**
 * Builds the resume from a profile and a selection. It only SELECTS and
 * ORDERS: every string in the document is copied verbatim from the profile,
 * looked up by id. A selection that refers to anything else is rejected.
 */
@Component
public class ResumeAssembler {

    public AssembledResume assemble(Profile profile, Selection selection, Language language) {
        return new Run(profile, language).build(selection);
    }

    private static final class Run {

        private final Profile profile;
        private final Language language;
        private final List<String> warnings = new ArrayList<>();

        Run(Profile profile, Language language) {
            this.profile = profile;
            this.language = language;
        }

        AssembledResume build(Selection selection) {
            rejectDuplicates(selection.experienceOrder());
            selection.achievements().values().forEach(Run::rejectDuplicates);
            rejectDuplicates(selection.projects());
            selection.skillOrder().values().forEach(Run::rejectDuplicates);
            var personal = profile.personal();
            ResumeDocument document = new ResumeDocument(
                    language.name().toLowerCase(),
                    new ResumeDocument.Personal(personal.name(), text("personal.title", personal.title()),
                            personal.location(), personal.email(), personal.phone(), personal.linkedin(),
                            personal.github()),
                    text("summary", profile.summary()),
                    categories(selection),
                    experiences(selection),
                    projects(selection),
                    education(),
                    languages());
            return new AssembledResume(document, warnings);
        }

        private List<ResumeDocument.Category> categories(Selection selection) {
            Map<String, SkillCategory> byId = index(profile.skillCategories(), SkillCategory::id);
            selection.skillOrder().keySet().stream()
                    .filter(id -> !byId.containsKey(id))
                    .findFirst()
                    .ifPresent(id -> {
                        throw new UnknownSelectionIdException(id, "which is not a skill category of the profile");
                    });

            List<ResumeDocument.Category> categories = new ArrayList<>();
            for (int i = 0; i < profile.skillCategories().size(); i++) {
                SkillCategory category = profile.skillCategories().get(i);
                List<String> skills = selection.skillOrder().getOrDefault(category.id(), category.skills());
                for (String skill : skills) {
                    if (!category.skills().contains(skill)) {
                        throw new UnknownSelectionIdException(skill, "which is not a skill of " + category.id());
                    }
                }
                if (!skills.isEmpty()) {
                    categories.add(new ResumeDocument.Category(
                            text("skillCategories[" + i + "].name", category.name()), skills));
                }
            }
            return categories;
        }

        private List<ResumeDocument.ExperienceEntry> experiences(Selection selection) {
            for (String id : selection.achievements().keySet()) {
                if (!selection.experienceOrder().contains(id)) {
                    throw new UnknownSelectionIdException(id, "which is not in the experience order");
                }
            }
            List<ResumeDocument.ExperienceEntry> entries = new ArrayList<>();
            for (String experienceId : selection.experienceOrder()) {
                int index = indexOf(profile.experiences(), Experience::id, experienceId);
                if (index < 0) {
                    throw new UnknownSelectionIdException(experienceId, "which is not an experience of the profile");
                }
                Experience experience = profile.experiences().get(index);
                String path = "experiences[" + index + "]";

                List<ResumeDocument.AchievementEntry> achievements = new ArrayList<>();
                for (String achievementId : selection.achievements().getOrDefault(experienceId, List.of())) {
                    int position = indexOf(experience.achievements(), Achievement::id, achievementId);
                    if (position < 0) {
                        throw new UnknownSelectionIdException(achievementId,
                                "which is not an achievement of " + experienceId);
                    }
                    Achievement achievement = experience.achievements().get(position);
                    achievements.add(new ResumeDocument.AchievementEntry(achievement.id(),
                            text(path + ".achievements[" + position + "].text", achievement.text())));
                }
                entries.add(new ResumeDocument.ExperienceEntry(experience.company(),
                        text(path + ".role", experience.role()),
                        Periods.format(experience.startDate(), experience.endDate(), language), achievements));
            }
            return entries;
        }

        private List<ResumeDocument.ProjectEntry> projects(Selection selection) {
            List<ResumeDocument.ProjectEntry> entries = new ArrayList<>();
            for (String projectId : selection.projects()) {
                int index = indexOf(profile.projects(), Project::id, projectId);
                if (index < 0) {
                    throw new UnknownSelectionIdException(projectId, "which is not a project of the profile");
                }
                Project project = profile.projects().get(index);
                entries.add(new ResumeDocument.ProjectEntry(project.name(),
                        text("projects[" + index + "].description", project.description()), project.skills(),
                        project.url()));
            }
            return entries;
        }

        private List<ResumeDocument.EducationEntry> education() {
            List<ResumeDocument.EducationEntry> entries = new ArrayList<>();
            for (int i = 0; i < profile.education().size(); i++) {
                Education education = profile.education().get(i);
                entries.add(new ResumeDocument.EducationEntry(education.institution(),
                        text("education[" + i + "].degree", education.degree()),
                        Periods.format(education.startDate(), education.endDate(), language)));
            }
            return entries;
        }

        private List<ResumeDocument.LanguageEntry> languages() {
            List<ResumeDocument.LanguageEntry> entries = new ArrayList<>();
            for (int i = 0; i < profile.languages().size(); i++) {
                LanguageSkill skill = profile.languages().get(i);
                entries.add(new ResumeDocument.LanguageEntry(text("languages[" + i + "].name", skill.name()),
                        text("languages[" + i + "].level", skill.level())));
            }
            return entries;
        }

        /** The text in the requested language, recording a warning when it fell back to Portuguese. */
        private String text(String path, LocalizedText text) {
            if (text == null) {
                return null;
            }
            if (text.missing(language) && text.pt() != null && !text.pt().isBlank()) {
                warnings.add(path + ": no EN text, PT used");
            }
            return text.in(language);
        }

        /** The same item twice would print twice: a selection lists each id at most once. */
        private static void rejectDuplicates(List<String> ids) {
            java.util.Set<String> seen = new java.util.HashSet<>();
            for (String id : ids) {
                if (!seen.add(id)) {
                    throw new UnknownSelectionIdException(id, "which is listed more than once");
                }
            }
        }

        private static <T> Map<String, T> index(List<T> items, Function<T, String> id) {
            return items.stream().collect(Collectors.toMap(id, Function.identity()));
        }

        private static <T> int indexOf(List<T> items, Function<T, String> id, String wanted) {
            for (int i = 0; i < items.size(); i++) {
                if (id.apply(items.get(i)).equals(wanted)) {
                    return i;
                }
            }
            return -1;
        }
    }
}
