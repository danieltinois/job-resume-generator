package io.github.danieltinois.resumetailor.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;

import io.github.danieltinois.resumetailor.IntegrationTest;

class GoogleAccountLinkerTest extends IntegrationTest {

    @Autowired
    GoogleAccountLinker linker;

    @Autowired
    UserRepository users;

    @Test
    void knownSubSignsIn() {
        User first = linker.link("google-123", "alex@example.com", true, "Alex");

        User again = linker.link("google-123", "changed@example.com", true, "Alex");

        assertThat(again.id()).isEqualTo(first.id());
    }

    @Test
    void verifiedEmailLinksExistingAccount() {
        User existing = users.create("alex@example.com", "bcrypt-hash", "Alex", false);

        User linked = linker.link("google-123", "Alex@Example.com", true, "Alex G");

        assertThat(linked.id()).isEqualTo(existing.id());
        assertThat(linked.googleSub()).isEqualTo("google-123");
        assertThat(linked.passwordHash()).isEqualTo("bcrypt-hash");
        assertThat(linked.emailVerified()).isTrue();
    }

    @Test
    void newGoogleUserIsCreatedVerified() {
        User created = linker.link("google-123", "new@example.com", true, "New Person");

        assertThat(created.email()).isEqualTo("new@example.com");
        assertThat(created.name()).isEqualTo("New Person");
        assertThat(created.emailVerified()).isTrue();
        assertThat(created.passwordHash()).isNull();
    }

    @Test
    void unverifiedGoogleEmailDoesNotTakeOverAccount() {
        User existing = users.create("alex@example.com", "bcrypt-hash", "Alex", true);

        assertThatThrownBy(() -> linker.link("google-evil", "alex@example.com", false, "Mallory"))
                .isInstanceOf(OAuth2AuthenticationException.class);

        assertThat(users.findById(existing.id()).orElseThrow().googleSub()).isNull();
        assertThat(users.findByGoogleSub("google-evil")).isEmpty();
    }
}
