package io.github.danieltinois.resumetailor.auth;

import java.net.URI;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import io.github.danieltinois.resumetailor.common.MaxBytes;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Tag(name = "Auth", description = "Sign-up, sign-in, sessions and password reset")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    /**
     * Problem type of a refresh that lost a race with another tab: the cookie
     * it sent was just rotated, so the client should retry with the new one.
     */
    public static final String CONCURRENT_REFRESH_TYPE = "urn:resume-tailor:problem:concurrent-refresh";


    /** BCrypt's input limit. */
    static final int PASSWORD_MAX_BYTES = 72;

    public record RegisterRequest(@NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 8) @MaxBytes(PASSWORD_MAX_BYTES) String password,
            @NotBlank @Size(max = 100) String name) {

        /** Pasted addresses often carry spaces; they must not fail validation. */
        public RegisterRequest {
            email = UserRepository.normalizeEmail(email);
        }
    }

    public record LoginRequest(@NotBlank @Size(max = 254) String email, @NotBlank String password) {
    }

    public record TokenRequest(@NotBlank String token) {
    }

    public record EmailRequest(@NotBlank @Size(max = 254) String email) {
    }

    public record ResetRequest(@NotBlank String token,
            @NotBlank @Size(min = 8) @MaxBytes(PASSWORD_MAX_BYTES) String password) {
    }

    public record AccessToken(String accessToken) {
    }

    private final AuthService auth;
    private final RefreshCookies cookies;

    public AuthController(AuthService auth, RefreshCookies cookies) {
        this.auth = auth;
        this.cookies = cookies;
    }

    @Operation(summary = "Create a password account and email a verification link")
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public void register(@Valid @RequestBody RegisterRequest request) {
        auth.register(request.email(), request.password(), request.name());
    }

    @Operation(summary = "Confirm an email address with the link token")
    @PostMapping("/verify-email")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void verifyEmail(@Valid @RequestBody TokenRequest request) {
        auth.verifyEmail(request.token());
    }

    @Operation(summary = "Email a new verification link (always 204)")
    @PostMapping("/resend-verification")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resendVerification(@Valid @RequestBody EmailRequest request, HttpServletRequest http) {
        auth.resendVerification(request.email(), http.getRemoteAddr());
    }

    @Operation(summary = "Email a password reset link (always 204)")
    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void forgotPassword(@Valid @RequestBody EmailRequest request, HttpServletRequest http) {
        auth.forgotPassword(request.email(), http.getRemoteAddr());
    }

    @Operation(summary = "Set a new password with the link token; signs out everywhere")
    @PostMapping("/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@Valid @RequestBody ResetRequest request) {
        auth.resetPassword(request.token(), request.password());
    }

    @Operation(summary = "Sign in: returns an access token and sets the refresh cookie")
    @PostMapping("/login")
    public ResponseEntity<AccessToken> login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        return withSession(auth.login(request.email(), request.password(), http.getRemoteAddr()));
    }

    @Operation(summary = "Exchange the refresh cookie for a new access token")
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@CookieValue(name = RefreshCookies.NAME, required = false) String token) {
        try {
            return withSession(auth.refresh(token));
        } catch (AuthException e) {
            // A dead refresh cookie is cleared, so the browser stops sending it. After a race between
            // tabs it is left alone: the winning request has just set its replacement.
            var response = ResponseEntity.status(e.status());
            ProblemDetail problem = ProblemDetail.forStatusAndDetail(e.status(), e.getMessage());
            if (e.keepsRefreshCookie()) {
                problem.setType(URI.create(CONCURRENT_REFRESH_TYPE));
            } else {
                response.header(HttpHeaders.SET_COOKIE, cookies.clear().toString());
            }
            return response.body(problem);
        }
    }

    @Operation(summary = "End the session and clear the refresh cookie")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@CookieValue(name = RefreshCookies.NAME, required = false) String token) {
        auth.logout(token);
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookies.clear().toString()).build();
    }

    ResponseEntity<AccessToken> withSession(AuthService.Session session) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookies.issue(session.refreshToken()).toString())
                .body(new AccessToken(session.accessToken()));
    }
}
