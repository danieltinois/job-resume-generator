package io.github.danieltinois.resumetailor.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Single-use tokens for email links and refresh. The raw token only ever
 * exists in the email or cookie; the table holds its SHA-256.
 */
@Repository
public class TokenStore {

    public record StoredToken(UUID userId, UUID family, Instant usedAt, Instant expiresAt) {
    }

    private static final SecureRandom RANDOM = new SecureRandom();

    private final JdbcClient jdbc;

    public TokenStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Stores a new token and returns its raw value. */
    public String issue(UUID userId, TokenType type, Duration ttl, UUID family) {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        jdbc.sql("INSERT INTO auth_tokens (token_hash, user_id, type, family, expires_at) VALUES (?, ?, ?, ?, ?)")
                .params(hash(raw), userId, type.name(), family, Timestamp.from(Instant.now().plus(ttl)))
                .update();
        return raw;
    }

    /** Marks the token used and returns it, only if it was unused and unexpired. Atomic. */
    public Optional<StoredToken> consume(String raw, TokenType type) {
        return jdbc.sql("""
                UPDATE auth_tokens SET used_at = now()
                WHERE token_hash = ? AND type = ? AND used_at IS NULL AND expires_at > now()
                RETURNING user_id, family, used_at, expires_at
                """)
                .params(hash(raw), type.name())
                .query(TokenStore::map)
                .optional();
    }

    static String hash(String raw) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    static StoredToken map(ResultSet rs, int row) throws SQLException {
        Timestamp usedAt = rs.getTimestamp("used_at");
        return new StoredToken(rs.getObject("user_id", UUID.class), rs.getObject("family", UUID.class),
                usedAt == null ? null : usedAt.toInstant(), rs.getTimestamp("expires_at").toInstant());
    }
}
