package io.github.danieltinois.resumetailor.auth;

import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import io.github.danieltinois.resumetailor.common.CurrentUser;

@RestController
public class MeController {

    public record Me(UUID id, String email, String name, boolean emailVerified, boolean hasPassword,
            boolean hasGoogle) {
    }

    private final CurrentUser currentUser;

    public MeController(CurrentUser currentUser) {
        this.currentUser = currentUser;
    }

    @GetMapping("/api/me")
    public Me me(Authentication authentication) {
        User user = currentUser.require(authentication);
        return new Me(user.id(), user.email(), user.name(), user.emailVerified(), user.passwordHash() != null,
                user.googleSub() != null);
    }
}
