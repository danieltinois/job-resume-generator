package io.github.danieltinois.resumetailor.profile;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Component;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.SafeConstructor;
import org.yaml.snakeyaml.error.YAMLException;

import io.github.danieltinois.resumetailor.common.Language;
import io.github.danieltinois.resumetailor.common.LocalizedText;

/**
 * Converts the profile.yaml of the Python CLI into the bilingual model, so
 * existing users keep their data. Legacy ids are replaced: they were typed by
 * hand and are not guaranteed to follow the generated format.
 */
@Component
public class LegacyProfileConverter {

    private static final LocalizedText DEFAULT_CATEGORY = new LocalizedText("Habilidades", "Skills");

    /**
     * @param textLanguage the language the YAML text is written in. Portuguese
     *                     is required by the model, so English text fills both.
     */
    public Profile convert(String yaml, Language textLanguage) {
        Object root;
        try {
            root = new Yaml(new SafeConstructor(new LoaderOptions())).load(yaml);
        } catch (YAMLException e) {
            throw new InvalidImportException("Invalid YAML: " + e.getMessage(), e);
        }
        if (!(root instanceof Map<?, ?> map)) {
            throw new InvalidImportException("Invalid profile: the YAML root must be a mapping");
        }
        return new Reader(textLanguage).profile(map);
    }

    private record Reader(Language language) {

        Profile profile(Map<?, ?> root) {
            Map<?, ?> personal = map(root.get("personal"));
            return new Profile(
                    new Personal(string(personal.get("name")), text(personal.get("title")),
                            string(personal.get("location")), string(personal.get("email")),
                            string(personal.get("phone")), string(personal.get("linkedin")),
                            string(personal.get("github"))),
                    text(root.get("summary")),
                    categories(root),
                    list(root.get("experiences")).stream().map(this::experience).toList(),
                    list(root.get("projects")).stream().map(this::project).toList(),
                    list(root.get("education")).stream().map(this::education).toList(),
                    list(root.get("languages")).stream().map(this::language).toList());
        }

        /** Keeps every legacy skill: flat skills not already categorized get a category of their own. */
        private List<SkillCategory> categories(Map<?, ?> root) {
            List<SkillCategory> categories = new ArrayList<>();
            Set<String> categorized = new LinkedHashSet<>();
            for (Object item : list(root.get("skill_categories"))) {
                Map<?, ?> category = map(item);
                List<String> skills = strings(category.get("skills"));
                categorized.addAll(skills);
                categories.add(new SkillCategory(Ids.next("cat"), text(category.get("name")), skills));
            }
            List<String> leftovers = strings(root.get("skills")).stream()
                    .filter(skill -> !categorized.contains(skill))
                    .toList();
            if (!leftovers.isEmpty()) {
                categories.add(new SkillCategory(Ids.next("cat"), DEFAULT_CATEGORY, leftovers));
            }
            return categories;
        }

        private Experience experience(Object item) {
            Map<?, ?> experience = map(item);
            List<Achievement> achievements = list(experience.get("achievements")).stream()
                    .map(this::map)
                    .map(a -> new Achievement(Ids.next("ach"), text(a.get("text")), strings(a.get("skills"))))
                    .toList();
            return new Experience(Ids.next("exp"), string(experience.get("company")), text(experience.get("role")),
                    string(experience.get("start_date")), string(experience.get("end_date")), achievements);
        }

        private Project project(Object item) {
            Map<?, ?> project = map(item);
            return new Project(Ids.next("prj"), string(project.get("name")), text(project.get("description")),
                    strings(project.get("skills")), string(project.get("url")));
        }

        private Education education(Object item) {
            Map<?, ?> education = map(item);
            return new Education(Ids.next("edu"), string(education.get("institution")),
                    text(education.get("degree")), string(education.get("start_date")),
                    string(education.get("end_date")));
        }

        private LanguageSkill language(Object item) {
            Map<?, ?> language = map(item);
            return new LanguageSkill(text(language.get("name")), text(language.get("level")));
        }

        private LocalizedText text(Object value) {
            String text = string(value);
            if (text == null) {
                return null;
            }
            return language == Language.EN ? new LocalizedText(text, text) : new LocalizedText(text, null);
        }

        private Map<?, ?> map(Object value) {
            if (value == null) {
                return Map.of();
            }
            if (value instanceof Map<?, ?> map) {
                return map;
            }
            throw new InvalidImportException("Invalid profile: expected a mapping, got " + value);
        }

        private static List<?> list(Object value) {
            if (value == null) {
                return List.of();
            }
            if (value instanceof List<?> list) {
                return list;
            }
            throw new InvalidImportException("Invalid profile: expected a list, got " + value);
        }

        private static List<String> strings(Object value) {
            return list(value).stream().map(Reader::string).toList();
        }

        private static String string(Object value) {
            return value == null ? null : value.toString().strip();
        }
    }
}
