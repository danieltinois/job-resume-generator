package io.github.danieltinois.resumetailor.auth;

import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Maps a Google identity to an account, linking or creating it. */
@Service
public class GoogleAccountLinker {

    private final UserRepository users;

    public GoogleAccountLinker(UserRepository users) {
        this.users = users;
    }

    /**
     * A known Google id signs in directly. Otherwise the email must be
     * verified by Google: only then may it join an existing account with the
     * same email, or create a new one. An unverified email could belong to
     * anyone, so it never takes over an account.
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
        users.linkGoogle(user.id(), sub);
        users.markVerified(user.id());
        return users.findById(user.id()).orElseThrow();
    }
}
