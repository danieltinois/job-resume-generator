package io.github.danieltinois.resumetailor.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Password accounts: registration, email verification and login. */
@Service
public class AuthService {

    static final Duration VERIFICATION_TTL = Duration.ofHours(24);
    static final Duration RESET_TTL = Duration.ofHours(1);

    /**
     * A refresh token reused this soon after its rotation is a race between
     * tabs sharing one cookie, not a theft: the other request already set the
     * new cookie, so this one fails quietly instead of revoking the family.
     */
    static final Duration CONCURRENT_REFRESH_GRACE = Duration.ofSeconds(10);

    /** Tokens issued by a successful sign-in. */
    public record Session(String accessToken, String refreshToken) {
    }

    private final UserRepository users;
    private final TokenStore tokens;
    private final PasswordEncoder passwords;
    private final AccountMailer mailer;
    private final MailDispatcher mail;
    private final JwtService jwt;
    private final RateLimiter rateLimiter;
    private final AuthProperties properties;
    private final String dummyHash;

    public AuthService(UserRepository users, TokenStore tokens, PasswordEncoder passwords, AccountMailer mailer,
            MailDispatcher mail, JwtService jwt, RateLimiter rateLimiter, AuthProperties properties) {
        this.users = users;
        this.tokens = tokens;
        this.passwords = passwords;
        this.mailer = mailer;
        this.mail = mail;
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

    /**
     * Always succeeds silently, so it cannot be used to find out which emails
     * have accounts. Over the limit, nothing is sent and nothing is said.
     */
    @Transactional
    public void resendVerification(String email, String ip) {
        if (!rateLimiter.tryAcquire(RateLimiter.ACCOUNT_MAIL, ip, email)) {
            return;
        }
        users.findByEmail(email).filter(user -> !user.emailVerified()).ifPresent(this::sendVerification);
    }

    /**
     * Sends a reset link when the account exists, including Google-only
     * accounts, which use it to add a password. Silent either way.
     */
    @Transactional
    public void forgotPassword(String email, String ip) {
        if (!rateLimiter.tryAcquire(RateLimiter.ACCOUNT_MAIL, ip, email)) {
            return;
        }
        users.findByEmail(email).ifPresent(user -> {
            String token = tokens.issue(user.id(), TokenType.RESET_PASSWORD, RESET_TTL, null);
            String link = properties.baseUrl() + "/reset-password?token=" + token;
            mail.send(() -> mailer.sendPasswordReset(user.email(), link));
        });
    }

    /**
     * Sets the new password and signs the user out everywhere. Opening the
     * link proves the user owns the email, so it also counts as verification.
     */
    @Transactional
    public void resetPassword(String token, String password) {
        TokenStore.StoredToken stored = tokens.consume(token, TokenType.RESET_PASSWORD)
                .orElseThrow(AuthException::invalidLink);
        users.setPassword(stored.userId(), passwords.encode(password));
        users.markVerified(stored.userId());
        tokens.revokeAll(stored.userId(), TokenType.REFRESH);
        tokens.revokeAll(stored.userId(), TokenType.RESET_PASSWORD);
    }

    public Session login(String email, String password, String ip) {
        if (!rateLimiter.tryAcquire(RateLimiter.LOGIN, ip, email)) {
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

    /**
     * Exchanges a refresh token for a new access token and the next refresh
     * token of the same family. A token that was already used means it was
     * stolen or replayed: the whole family is revoked, so whoever holds the
     * newer token is signed out too.
     */
    @Transactional(noRollbackFor = AuthException.class)
    public Session refresh(String raw) {
        if (raw == null || raw.isBlank()) {
            throw sessionExpired();
        }
        TokenStore.StoredToken stored = tokens.find(raw, TokenType.REFRESH).orElseThrow(AuthService::sessionExpired);
        if (stored.usedAt() != null) {
            if (usedJustNow(stored)) {
                throw concurrentRefresh();
            }
            tokens.revokeFamily(stored.family());
            throw sessionExpired();
        }
        if (tokens.consume(raw, TokenType.REFRESH).isEmpty()) {
            // Expired, or consumed by a concurrent request between find and consume.
            boolean raced = tokens.find(raw, TokenType.REFRESH).filter(AuthService::usedJustNow).isPresent();
            throw raced ? concurrentRefresh() : sessionExpired();
        }
        String next = tokens.issue(stored.userId(), TokenType.REFRESH, RefreshCookies.TTL, stored.family());
        return new Session(jwt.issue(stored.userId()), next);
    }

    @Transactional
    public void logout(String raw) {
        if (raw != null && !raw.isBlank()) {
            tokens.find(raw, TokenType.REFRESH).ifPresent(stored -> tokens.revokeFamily(stored.family()));
        }
    }

    private static boolean usedJustNow(TokenStore.StoredToken token) {
        return token.usedAt() != null && token.usedAt().isAfter(Instant.now().minus(CONCURRENT_REFRESH_GRACE));
    }

    private static AuthException concurrentRefresh() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "Session refreshed by another tab, retry", true);
    }

    private static AuthException sessionExpired() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "Session expired, sign in again");
    }

    /** A new access token and the first refresh token of a new family. */
    public Session startSession(UUID userId) {
        String refresh = tokens.issue(userId, TokenType.REFRESH, RefreshCookies.TTL, UUID.randomUUID());
        return new Session(jwt.issue(userId), refresh);
    }

    private void sendVerification(User user) {
        String token = tokens.issue(user.id(), TokenType.VERIFY_EMAIL, VERIFICATION_TTL, null);
        String link = properties.baseUrl() + "/verify-email?token=" + token;
        mail.send(() -> mailer.sendVerification(user.email(), link));
    }
}
