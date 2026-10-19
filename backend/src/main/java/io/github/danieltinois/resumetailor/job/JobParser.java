package io.github.danieltinois.resumetailor.job;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

import io.github.danieltinois.resumetailor.matching.TextNormalizer;

/**
 * Splits a pasted job description into weighted sections and pulls out its
 * title and company. Deliberately simple: the whole text still reaches the
 * matcher, headings only decide how much each part counts.
 */
@Component
public class JobParser {

    static final int REQUIRED_WEIGHT = 2;
    static final int DEFAULT_WEIGHT = 1;

    /** Checked first, so "Requisitos desejáveis" and "Preferred Qualifications" weigh 1. */
    private static final List<String> NICE_TO_HAVE = List.of(
            "desejavel", "desejaveis", "diferencial", "diferenciais", "nice to have", "bonus", "preferred",
            "preferencial");

    private static final List<String> REQUIRED = List.of(
            "requisitos", "requisito", "requirements", "requirement", "must have", "o que buscamos",
            "o que esperamos", "qualifications", "required", "obrigatorio", "obrigatorios",
            "what we are looking for", "what you bring");

    private static final List<String> OTHER = List.of(
            "responsabilidades", "responsibilities", "atividades", "about", "sobre", "beneficios", "benefits");

    /** A list item is content, never a heading, whatever word it starts with. */
    private static final Pattern LIST_ITEM = Pattern.compile("^([-*\u2022+]|\\d+[.)])\\s.*");
    private static final Pattern DECORATION = Pattern.compile("^[#*\\s]+|\\*+$");
    private static final int MAX_LABEL_WORDS = 6;
    private static final int MAX_BARE_HEADING_WORDS = 4;

    private static final Pattern MARKDOWN_TITLE = Pattern.compile("^\\s*#\\s+(.+)$");
    private static final Pattern COMPANY = Pattern.compile("^\\s*(?:company|empresa)\\s*:\\s*(.+)$",
            Pattern.CASE_INSENSITIVE);
    private static final int MAX_TITLE = 120;

    public JobText parse(String rawText) {
        String[] lines = rawText.split("\\R");
        String markdownTitle = null;
        String firstLine = null;
        String company = null;
        List<JobSection> sections = new ArrayList<>();
        int weight = DEFAULT_WEIGHT;
        StringBuilder current = new StringBuilder();

        for (String line : lines) {
            Matcher title = MARKDOWN_TITLE.matcher(line);
            if (markdownTitle == null && title.matches()) {
                markdownTitle = title.group(1).strip();
            }
            if (firstLine == null && !line.isBlank()) {
                firstLine = line.strip();
            }
            Matcher companyLine = COMPANY.matcher(line);
            if (company == null && companyLine.matches()) {
                company = companyLine.group(1).strip();
            }

            Integer headingWeight = headingWeight(line);
            if (headingWeight != null) {
                addSection(sections, weight, current);
                weight = headingWeight;
                current = new StringBuilder();
            }
            current.append(line).append('\n');
        }
        addSection(sections, weight, current);

        String chosenTitle = markdownTitle != null ? markdownTitle : firstLine;
        if (chosenTitle != null && chosenTitle.length() > MAX_TITLE) {
            chosenTitle = chosenTitle.substring(0, MAX_TITLE);
        }
        return new JobText(chosenTitle, company, LanguageDetector.detect(rawText), sections);
    }

    private static void addSection(List<JobSection> sections, int weight, StringBuilder text) {
        String normalized = TextNormalizer.normalize(text.toString());
        if (!normalized.isEmpty() || sections.isEmpty()) {
            sections.add(new JobSection(weight, normalized));
        }
    }

    /**
     * The weight a heading line opens, or null when the line is not a heading.
     * A heading is a Markdown heading, a short label ending in ":" (possibly
     * followed by content, as in "Requirements: Java"), or a short line that
     * is not a sentence. Its words decide the weight.
     */
    private static Integer headingWeight(String line) {
        String trimmed = line.strip();
        boolean markdown = trimmed.startsWith("#");
        if (trimmed.isEmpty() || (!markdown && LIST_ITEM.matcher(trimmed).matches())) {
            return null;
        }
        int colon = trimmed.indexOf(':');
        String label = TextNormalizer.normalize(
                DECORATION.matcher(colon >= 0 ? trimmed.substring(0, colon) : trimmed).replaceAll(""));
        int words = label.isEmpty() ? 0 : label.split(" ").length;
        boolean shaped = markdown || colon >= 0
                ? words <= MAX_LABEL_WORDS
                : words <= MAX_BARE_HEADING_WORDS && !trimmed.endsWith(".");
        if (!shaped) {
            return null;
        }
        if (mentions(label, NICE_TO_HAVE)) {
            return DEFAULT_WEIGHT;
        }
        if (mentions(label, REQUIRED)) {
            return REQUIRED_WEIGHT;
        }
        return mentions(label, OTHER) ? DEFAULT_WEIGHT : null;
    }

    private static boolean mentions(String label, List<String> words) {
        return words.stream().anyMatch(word -> TextNormalizer.containsTerm(label, word));
    }
}
