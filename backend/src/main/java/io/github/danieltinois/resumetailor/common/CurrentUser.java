package io.github.danieltinois.resumetailor.common;

import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import io.github.danieltinois.resumetailor.auth.User;
import io.github.danieltinois.resumetailor.auth.UserRepository;

/** Resolves the authenticated user from the access token's subject. */
@Component
public class CurrentUser {

    private final UserRepository users;

    public CurrentUser(UserRepository users) {
        this.users = users;
    }

    public static UUID id(Authentication authentication) {
        try {
            return UUID.fromString(authentication.getName());
        } catch (IllegalArgumentException e) {
            throw new UnauthenticatedException("Invalid token subject");
        }
    }

    /** The user behind the token; a token outliving its account is treated as no token. */
    public User require(Authentication authentication) {
        return users.findById(id(authentication))
                .orElseThrow(() -> new UnauthenticatedException("Account no longer exists"));
    }
}
