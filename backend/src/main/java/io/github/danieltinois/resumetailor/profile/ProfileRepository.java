package io.github.danieltinois.resumetailor.profile;

import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import tools.jackson.databind.json.JsonMapper;

/** One JSONB document per user, read and written whole. */
@Repository
public class ProfileRepository {

    private final JdbcClient jdbc;
    private final JsonMapper json;

    public ProfileRepository(JdbcClient jdbc, JsonMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    public Optional<StoredProfile> find(UUID userId) {
        return jdbc.sql("SELECT version, data::text AS data FROM profiles WHERE user_id = ?")
                .param(userId)
                .query((rs, row) -> new StoredProfile(rs.getInt("version"),
                        json.readValue(rs.getString("data"), Profile.class)))
                .optional();
    }

    /**
     * Saves only if the stored version is still {@code expectedVersion}
     * (0 = no profile yet) and returns the new version. Otherwise someone
     * saved in between, and nothing is written.
     */
    public int save(UUID userId, int expectedVersion, Profile data) {
        String document = json.writeValueAsString(data);
        int written = expectedVersion == 0
                ? jdbc.sql("INSERT INTO profiles (user_id, data, version) VALUES (?, ?::jsonb, 1) "
                        + "ON CONFLICT (user_id) DO NOTHING")
                        .params(userId, document).update()
                : jdbc.sql("UPDATE profiles SET data = ?::jsonb, version = version + 1, updated_at = now() "
                        + "WHERE user_id = ? AND version = ?")
                        .params(document, userId, expectedVersion).update();
        if (written == 0) {
            throw new VersionConflictException();
        }
        return expectedVersion + 1;
    }
}
