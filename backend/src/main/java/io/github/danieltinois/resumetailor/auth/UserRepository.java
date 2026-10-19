package io.github.danieltinois.resumetailor.auth;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {

    private static final String COLUMNS = "id, email, password_hash, google_sub, name, email_verified";

    private final JdbcClient jdbc;

    public UserRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Emails are compared trimmed and lowercased, so one person never gets two accounts. */
    public static String normalizeEmail(String email) {
        return email == null ? null : email.strip().toLowerCase(Locale.ROOT);
    }

    public Optional<User> findByEmail(String email) {
        return jdbc.sql("SELECT " + COLUMNS + " FROM users WHERE email = ?")
                .param(normalizeEmail(email))
                .query(UserRepository::map)
                .optional();
    }

    public Optional<User> findById(UUID id) {
        return jdbc.sql("SELECT " + COLUMNS + " FROM users WHERE id = ?").param(id).query(UserRepository::map)
                .optional();
    }

    public Optional<User> findByGoogleSub(String sub) {
        return jdbc.sql("SELECT " + COLUMNS + " FROM users WHERE google_sub = ?").param(sub)
                .query(UserRepository::map).optional();
    }

    public User create(String email, String passwordHash, String name, boolean verified) {
        return jdbc.sql("INSERT INTO users (email, password_hash, name, email_verified) VALUES (?, ?, ?, ?) "
                        + "RETURNING " + COLUMNS)
                .params(normalizeEmail(email), passwordHash, name, verified)
                .query(UserRepository::map)
                .single();
    }

    public void markVerified(UUID id) {
        jdbc.sql("UPDATE users SET email_verified = true WHERE id = ?").param(id).update();
    }

    public void setPassword(UUID id, String passwordHash) {
        jdbc.sql("UPDATE users SET password_hash = ? WHERE id = ?").params(passwordHash, id).update();
    }

    public void linkGoogle(UUID id, String sub) {
        jdbc.sql("UPDATE users SET google_sub = ? WHERE id = ?").params(sub, id).update();
    }

    private static User map(ResultSet rs, int row) throws SQLException {
        return new User(rs.getObject("id", UUID.class), rs.getString("email"), rs.getString("password_hash"),
                rs.getString("google_sub"), rs.getString("name"), rs.getBoolean("email_verified"));
    }
}
