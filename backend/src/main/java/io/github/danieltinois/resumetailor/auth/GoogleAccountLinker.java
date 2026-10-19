package io.github.danieltinois.resumetailor.auth;

import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Maps a Google identity to an account, linking or creating it. */
@Service
public class GoogleAccountLinker {

    private final UserRepository users;
    private final TokenStore tokens;

    public GoogleAccountLinker(UserRepository users, TokenStore tokens) {
        this.users = users;
        this.tokens = tokens;
    }

    /**
     * A known Google id signs in directly. Otherwise the email must be
     * verified by Google: only then may it join an existing account with the
     * same email, or create a new one. An unverified email could belong to
     * anyone, so it never takes over an account.
     *
     * <p>The reverse matters too: a password account whose email was never
     * verified may have been registered by someone else ahead of the real
     * owner (pre-hijacking). When Google proves ownership, that password and
     * every pending token of the account are discarded.
     */
    @Transactional
    public User link(String sub, String email, boolean emailVerified, String name) {
        var known = users.findByGoogleSub(sub);
        if (known.isPresent()) {
            return known.get();
        }
        if (!emailVerified || email == null || email.isBlank()) {
            throw new OAuth2AuthenticationException(new OAuth2Error("unverified_email",
                    "Google did not confirm this email address", null));
        }
        User user = users.findByEmail(email)
                .orElseGet(() -> users.create(email, null, name == null || name.isBlank() ? email : name, true));
        if (!user.emailVerified()) {
            users.setPassword(user.id(), null);
            for (TokenType type : TokenType.values()) {
                tokens.revokeAll(user.id(), type);
            }
        }
        users.linkGoogle(user.id(), sub);
        users.markVerified(user.id());
        return users.findById(user.id()).orElseThrow();
    }
}
