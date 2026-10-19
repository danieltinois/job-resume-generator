package io.github.danieltinois.resumetailor.resume;

import java.util.List;
import java.util.regex.Pattern;

import io.github.danieltinois.resumetailor.common.Language;

/** Formats {@code YYYY-MM} date ranges for the page: "Jan 2025 – Present", "jan 2025 – Atual". */
public final class Periods {

    private static final List<String> MONTHS_EN = List.of(
            "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec");
    private static final List<String> MONTHS_PT = List.of(
            "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez");
    private static final Pattern MONTH = Pattern.compile("\\d{4}-\\d{2}");

    private Periods() {
    }

    /**
     * A missing end date means "until now". A missing start date shows only
     * the end (a graduation date); no dates at all yield an empty string.
     */
    public static String format(String start, String end, Language language) {
        if (isBlank(start)) {
            return isBlank(end) ? "" : label(end, language);
        }
        return label(start, language) + " – " + label(end, language);
    }

    private static String label(String value, Language language) {
        if (isBlank(value)) {
            return language == Language.PT ? "Atual" : "Present";
        }
        if (MONTH.matcher(value).matches()) {
            List<String> months = language == Language.PT ? MONTHS_PT : MONTHS_EN;
            return months.get(Integer.parseInt(value.substring(5)) - 1) + " " + value.substring(0, 4);
        }
        return value;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
