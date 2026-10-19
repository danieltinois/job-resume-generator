package io.github.danieltinois.resumetailor.profile;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

import io.github.danieltinois.resumetailor.common.LocalizedText;

/**
 * Checks a profile before it is stored. Fails loudly: a broken profile is not
 * something to generate a resume from.
 */
@Component
public class ProfileValidator {

    private static final Pattern MONTH = Pattern.compile("\\d{4}-(0[1-9]|1[0-2])");

    public List<ProfileViolation> validate(Profile profile) {
        Walk walk = new Walk();

        if (profile.personal() == null) {
            walk.fail("personal", "is required");
        } else {
            walk.required("personal.name", profile.personal().name());
            walk.localized("personal.title", profile.personal().title(), true);
        }
        walk.localized("summary", profile.summary(), false);

        for (int i = 0; i < profile.skillCategories().size(); i++) {
            SkillCategory category = profile.skillCategories().get(i);
            String path = "skillCategories[" + i + "]";
            if (walk.isNull(path, category)) {
                continue;
            }
            walk.id(path, category.id());
            walk.localized(path + ".name", category.name(), true);
            walk.skills(path + ".skills", category.skills());
        }

        for (int i = 0; i < profile.experiences().size(); i++) {
            Experience experience = profile.experiences().get(i);
            String path = "experiences[" + i + "]";
            if (walk.isNull(path, experience)) {
                continue;
            }
            walk.id(path, experience.id());
            walk.required(path + ".company", experience.company());
            walk.localized(path + ".role", experience.role(), true);
            walk.month(path + ".startDate", experience.startDate(), true);
            walk.month(path + ".endDate", experience.endDate(), false);
            for (int j = 0; j < experience.achievements().size(); j++) {
                Achievement achievement = experience.achievements().get(j);
                String achievementPath = path + ".achievements[" + j + "]";
                if (walk.isNull(achievementPath, achievement)) {
                    continue;
                }
                walk.id(achievementPath, achievement.id());
                walk.localized(achievementPath + ".text", achievement.text(), true);
                walk.skills(achievementPath + ".skills", achievement.skills());
            }
        }

        for (int i = 0; i < profile.projects().size(); i++) {
            Project project = profile.projects().get(i);
            String path = "projects[" + i + "]";
            if (walk.isNull(path, project)) {
                continue;
            }
            walk.id(path, project.id());
            walk.required(path + ".name", project.name());
            walk.localized(path + ".description", project.description(), true);
            walk.skills(path + ".skills", project.skills());
        }

        for (int i = 0; i < profile.education().size(); i++) {
            Education education = profile.education().get(i);
            String path = "education[" + i + "]";
            if (walk.isNull(path, education)) {
                continue;
            }
            walk.id(path, education.id());
            walk.required(path + ".institution", education.institution());
            walk.localized(path + ".degree", education.degree(), true);
            walk.month(path + ".startDate", education.startDate(), false);
            walk.month(path + ".endDate", education.endDate(), false);
        }

        for (int i = 0; i < profile.languages().size(); i++) {
            LanguageSkill language = profile.languages().get(i);
            if (walk.isNull("languages[" + i + "]", language)) {
                continue;
            }
            walk.localized("languages[" + i + "].name", language.name(), true);
            walk.localized("languages[" + i + "].level", language.level(), false);
        }

        return walk.violations;
    }

    private static final class Walk {

        private final List<ProfileViolation> violations = new ArrayList<>();
        private final Set<String> ids = new HashSet<>();

        void fail(String path, String message) {
            violations.add(new ProfileViolation(path, message));
        }

        boolean isNull(String path, Object item) {
            if (item == null) {
                fail(path, "must not be null");
            }
            return item == null;
        }

        void skills(String path, List<String> skills) {
            for (int i = 0; i < skills.size(); i++) {
                if (skills.get(i) == null || skills.get(i).isBlank()) {
                    fail(path + "[" + i + "]", "must not be empty");
                }
            }
        }

        void required(String path, String value) {
            if (value == null || value.isBlank()) {
                fail(path, "is required");
            }
        }

        /** Ids are unique across the whole profile, so a selection can never point at two items. */
        void id(String itemPath, String id) {
            String path = itemPath + ".id";
            if (id == null || id.isBlank()) {
                fail(path, "is required");
            } else if (!ids.add(id)) {
                fail(path, "duplicate id " + id);
            }
        }

        void localized(String path, LocalizedText text, boolean required) {
            if (text == null) {
                if (required) {
                    fail(path + ".pt", "is required");
                }
                return;
            }
            boolean empty = text.pt() == null || text.pt().isBlank();
            boolean hasEnglish = text.en() != null && !text.en().isBlank();
            if (empty && (required || hasEnglish)) {
                fail(path + ".pt", "is required");
            }
        }

        void month(String path, String value, boolean required) {
            if (value == null || value.isBlank()) {
                if (required) {
                    fail(path, "is required");
                }
            } else if (!MONTH.matcher(value).matches()) {
                fail(path, "must be YYYY-MM");
            }
        }
    }
}
