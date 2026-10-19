package io.github.danieltinois.resumetailor.auth;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record RegisterRequest(@NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 8, max = 128) String password, @NotBlank @Size(max = 100) String name) {

        /** Pasted addresses often carry spaces; they must not fail validation. */
        public RegisterRequest {
            email = UserRepository.normalizeEmail(email);
        }
    }

    public record LoginRequest(@NotBlank String email, @NotBlank String password) {
    }

    public record TokenRequest(@NotBlank String token) {
    }

    public record EmailRequest(@NotBlank String email) {
    }

    public record AccessToken(String accessToken) {
    }

    private final AuthService auth;
    private final RefreshCookies cookies;

    public AuthController(AuthService auth, RefreshCookies cookies) {
        this.auth = auth;
        this.cookies = cookies;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public void register(@Valid @RequestBody RegisterRequest request) {
        auth.register(request.email(), request.password(), request.name());
    }

    @PostMapping("/verify-email")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void verifyEmail(@Valid @RequestBody TokenRequest request) {
        auth.verifyEmail(request.token());
    }

    @PostMapping("/resend-verification")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resendVerification(@Valid @RequestBody EmailRequest request) {
        auth.resendVerification(request.email());
    }

    @PostMapping("/login")
    public ResponseEntity<AccessToken> login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        return withSession(auth.login(request.email(), request.password(), http.getRemoteAddr()));
    }

    ResponseEntity<AccessToken> withSession(AuthService.Session session) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookies.issue(session.refreshToken()).toString())
                .body(new AccessToken(session.accessToken()));
    }
}
