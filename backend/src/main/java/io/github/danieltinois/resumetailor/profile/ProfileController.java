package io.github.danieltinois.resumetailor.profile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import io.github.danieltinois.resumetailor.auth.User;
import io.github.danieltinois.resumetailor.common.CurrentUser;
import io.github.danieltinois.resumetailor.common.Language;
import io.github.danieltinois.resumetailor.common.LocalizedText;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    /** A legacy profile.yaml is a few KB; also enforced by spring.servlet.multipart. */
    static final long MAX_IMPORT_BYTES = 256 * 1024;

    public record SaveRequest(@NotNull @PositiveOrZero Integer version, @NotNull Profile data) {
    }

    public record Saved(int version) {
    }

    private final ProfileRepository profiles;
    private final ProfileValidator validator;
    private final LegacyProfileConverter converter;
    private final CurrentUser currentUser;

    public ProfileController(ProfileRepository profiles, ProfileValidator validator, LegacyProfileConverter converter,
            CurrentUser currentUser) {
        this.profiles = profiles;
        this.validator = validator;
        this.converter = converter;
        this.currentUser = currentUser;
    }

    @GetMapping
    public StoredProfile get(Authentication authentication) {
        User user = currentUser.require(authentication);
        return profiles.find(user.id()).orElseGet(() -> new StoredProfile(0, skeleton(user)));
    }

    @PutMapping
    public Saved save(@Valid @RequestBody SaveRequest request, Authentication authentication) {
        UUID userId = currentUser.require(authentication).id();
        List<ProfileViolation> violations = validator.validate(request.data());
        if (!violations.isEmpty()) {
            throw new ProfileValidationException(violations);
        }
        return new Saved(profiles.save(userId, request.version(), request.data()));
    }

    /** Converts a legacy profile.yaml for the user to review; nothing is saved. */
    @PostMapping("/import")
    public Profile importLegacy(@RequestPart("file") MultipartFile file, @RequestParam Language language,
            Authentication authentication) throws IOException {
        currentUser.require(authentication);
        if (file.getSize() > MAX_IMPORT_BYTES) {
            throw new ResponseStatusException(HttpStatus.CONTENT_TOO_LARGE, "The file is larger than 256 KB");
        }
        return converter.convert(new String(file.getBytes(), StandardCharsets.UTF_8), language);
    }

    @GetMapping("/export")
    public ResponseEntity<Profile> export(Authentication authentication) {
        StoredProfile profile = get(authentication);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"profile.json\"")
                .body(profile.data());
    }

    /** What a new user starts editing: their name and email, everything else empty. */
    private static Profile skeleton(User user) {
        return new Profile(new Personal(user.name(), new LocalizedText("", null), "", user.email(), "", "", ""),
                null, null, null, null, null, null);
    }
}
