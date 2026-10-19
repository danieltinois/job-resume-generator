package io.github.danieltinois.resumetailor.auth;

import java.time.Duration;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Password accounts: registration, email verification and login. */
@Service
public class AuthService {

    static final Duration VERIFICATION_TTL = Duration.ofHours(24);

    /** Tokens issued by a successful sign-in. */
    public record Session(String accessToken, String refreshToken) {
    }

    private final UserRepository users;
    private final TokenStore tokens;
    private final PasswordEncoder passwords;
    private final AccountMailer mailer;
    private final JwtService jwt;
    private final LoginRateLimiter rateLimiter;
    private final AuthProperties properties;
    private final String dummyHash;

    public AuthService(UserRepository users, TokenStore tokens, PasswordEncoder passwords, AccountMailer mailer,
            JwtService jwt, LoginRateLimiter rateLimiter, AuthProperties properties) {
        this.users = users;
        this.tokens = tokens;
        this.passwords = passwords;
        this.mailer = mailer;
        this.jwt = jwt;
        this.rateLimiter = rateLimiter;
        this.properties = properties;
        this.dummyHash = passwords.encode("timing-equalizer");
    }

    @Transactional
    public void register(String email, String password, String name) {
        if (users.findByEmail(email).isPresent()) {
            throw new AuthException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
        User user = users.create(email, passwords.encode(password), name.strip(), false);
        sendVerification(user);
    }

    @Transactional
    public void verifyEmail(String token) {
        TokenStore.StoredToken stored = tokens.consume(token, TokenType.VERIFY_EMAIL)
                .orElseThrow(AuthException::invalidLink);
        users.markVerified(stored.userId());
    }

    /** Always succeeds silently, so it cannot be used to find out which emails have accounts. */
    @Transactional
    public void resendVerification(String email) {
        users.findByEmail(email).filter(user -> !user.emailVerified()).ifPresent(this::sendVerification);
    }

    public Session login(String email, String password, String ip) {
        if (!rateLimiter.tryAcquire(ip, email)) {
            throw new AuthException(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts, try again in a minute");
        }
        User user = users.findByEmail(email).orElse(null);
        String hash = user == null || user.passwordHash() == null ? dummyHash : user.passwordHash();
        // Always run BCrypt, so an unknown email takes as long as a wrong password.
        boolean matches = passwords.matches(password, hash);
        if (user == null || user.passwordHash() == null || !matches) {
            throw AuthException.invalidCredentials();
        }
        if (!user.emailVerified()) {
            throw new AuthException(HttpStatus.FORBIDDEN, "Email not verified");
        }
        return startSession(user.id());
    }

    /** A new access token and the first refresh token of a new family. */
    public Session startSession(UUID userId) {
        String refresh = tokens.issue(userId, TokenType.REFRESH, RefreshCookies.TTL, UUID.randomUUID());
        return new Session(jwt.issue(userId), refresh);
    }

    private void sendVerification(User user) {
        String token = tokens.issue(user.id(), TokenType.VERIFY_EMAIL, VERIFICATION_TTL, null);
        mailer.sendVerification(user.email(), properties.baseUrl() + "/verify-email?token=" + token);
    }
}
