package io.github.danieltinois.resumetailor.auth;

import java.util.UUID;

/** An account. {@code passwordHash} is null for Google-only accounts, {@code googleSub} for password-only ones. */
public record User(UUID id, String email, String passwordHash, String googleSub, String name, boolean emailVerified) {
}
