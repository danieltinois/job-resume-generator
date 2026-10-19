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

    private static final List<String> REQUIRED_HEADINGS = List.of(
            "requisitos", "requirements", "must have", "o que buscamos", "o que esperamos", "qualifications",
            "required", "what we are looking for", "what you bring");

    private static final List<String> OTHER_HEADINGS = List.of(
            "diferenciais", "nice to have", "desejavel", "bonus", "responsabilidades", "responsibilities", "about",
            "sobre", "beneficios", "benefits");

    private static final Pattern MARKDOWN_TITLE = Pattern.compile("^\\s*#\\s+(.+)$");
    private static final Pattern COMPANY = Pattern.compile("^\\s*(?:company|empresa)\\s*:\\s*(.+)$",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern HEADING_DECORATION = Pattern.compile("^[\\s#*\\-]+");
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

    /** The weight a heading line opens, or null when the line is not a heading. */
    private static Integer headingWeight(String line) {
        String candidate = TextNormalizer.normalize(HEADING_DECORATION.matcher(line).replaceFirst(""));
        if (startsWithAny(candidate, REQUIRED_HEADINGS)) {
            return REQUIRED_WEIGHT;
        }
        if (startsWithAny(candidate, OTHER_HEADINGS)) {
            return DEFAULT_WEIGHT;
        }
        return null;
    }

    private static boolean startsWithAny(String text, List<String> headings) {
        for (String heading : headings) {
            if (text.startsWith(heading)
                    && (text.length() == heading.length() || !Character.isLetterOrDigit(text.charAt(heading.length())))) {
                return true;
            }
        }
        return false;
    }
}
