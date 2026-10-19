package io.github.danieltinois.resumetailor.profile;

import java.util.List;

public class ProfileValidationException extends RuntimeException {

    private final List<ProfileViolation> violations;

    public ProfileValidationException(List<ProfileViolation> violations) {
        super("Invalid profile");
        this.violations = List.copyOf(violations);
    }

    public List<ProfileViolation> violations() {
        return violations;
    }
}
