package io.github.danieltinois.resumetailor.matching;

import java.text.Normalizer;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Text normalization shared by the job and the profile, so both sides are
 * compared in the same form. Ported from the Python matcher, plus accent
 * folding for Portuguese job descriptions.
 */
public final class TextNormalizer {

    private static final Pattern COMBINING_MARKS = Pattern.compile("\\p{M}+");

    /** Keeps {@code + # . /} so "c++", "c#", "node.js" and "ci/cd" survive. */
    private static final Pattern SEPARATORS = Pattern.compile("[^a-z0-9+#./]+");

    /** Every analysis tests skills × sections; terms repeat, so their patterns are cached (bounded LRU). */
    private static final int MAX_CACHED_PATTERNS = 10_000;
    private static final Map<String, Pattern> PATTERNS = Collections.synchronizedMap(
            new LinkedHashMap<>(256, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, Pattern> eldest) {
                    return size() > MAX_CACHED_PATTERNS;
                }
            });

    private TextNormalizer() {
    }

    /** Folds accents, lowercases, turns punctuation into spaces and collapses whitespace. */
    public static String normalize(String text) {
        String folded = COMBINING_MARKS.matcher(Normalizer.normalize(text, Normalizer.Form.NFD)).replaceAll("");
        return SEPARATORS.matcher(folded.toLowerCase(Locale.ROOT)).replaceAll(" ").strip();
    }

    /**
     * Forms a skill may take inside a job description. Plural agreement goes
     * both ways, because either side may hold the plural: "REST API" in the
     * profile against "REST APIs" in the job, and vice versa.
     */
    public static Set<String> variants(String skill) {
        String base = normalize(skill);
        Set<String> forms = new LinkedHashSet<>();
        if (base.isEmpty()) {
            return forms;
        }
        forms.add(base);
        int split = base.lastIndexOf(' ') + 1;
        String last = base.substring(split);
        if (last.length() >= 3 && last.chars().allMatch(Character::isLetter)) {
            String toggled = last.endsWith("s") ? last.substring(0, last.length() - 1) : last + "s";
            forms.add(base.substring(0, split) + toggled);
        }
        return forms;
    }

    /**
     * Whole-term containment. {@code \b} does not work after "c++" or "c#",
     * so the boundaries are explicit lookarounds.
     */
    public static boolean containsTerm(String normalizedText, String normalizedTerm) {
        return pattern(normalizedTerm).matcher(normalizedText).find();
    }

    static Pattern pattern(String normalizedTerm) {
        return PATTERNS.computeIfAbsent(normalizedTerm,
                term -> Pattern.compile("(?<![a-z0-9])" + Pattern.quote(term) + "(?![a-z0-9])"));
    }

    /** Is {@code skill} present, in any of its forms, in the already-normalized text? */
    public static boolean appearsIn(String skill, String normalizedText) {
        return variants(skill).stream().anyMatch(form -> containsTerm(normalizedText, form));
    }
}
