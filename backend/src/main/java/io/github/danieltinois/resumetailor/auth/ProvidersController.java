package io.github.danieltinois.resumetailor.auth;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/** Which sign-in methods the login screen should offer. */
@Tag(name = "Auth")
@RestController
public class ProvidersController {

    public record Providers(boolean google) {
    }

    private final boolean google;

    public ProvidersController(ObjectProvider<ClientRegistrationRepository> registrations) {
        this.google = registrations.getIfAvailable() != null;
    }

    @Operation(summary = "Sign-in methods the login screen should offer")
    @GetMapping("/api/auth/providers")
    public Providers providers() {
        return new Providers(google);
    }
}
