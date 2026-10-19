package io.github.danieltinois.resumetailor.resume;

import java.util.List;

/**
 * @param warnings fields that had no text in the requested language and fell
 *                 back to Portuguese, shown to the user before saving
 */
public record AssembledResume(ResumeDocument document, List<String> warnings) {

    public AssembledResume {
        warnings = List.copyOf(warnings);
    }
}
