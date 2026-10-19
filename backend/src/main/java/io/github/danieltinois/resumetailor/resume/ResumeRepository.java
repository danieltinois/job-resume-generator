package io.github.danieltinois.resumetailor.resume;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import io.github.danieltinois.resumetailor.common.Language;
import tools.jackson.databind.json.JsonMapper;

/** Saved resumes: the selection and the frozen document, always scoped to their owner. */
@Repository
public class ResumeRepository {

    public record Summary(UUID id, UUID jobId, Language language, Instant createdAt) {
    }

    public record Saved(Summary summary, ResumeDocument snapshot) {
    }

    private final JdbcClient jdbc;
    private final JsonMapper json;

    public ResumeRepository(JdbcClient jdbc, JsonMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    public UUID create(UUID userId, UUID jobId, Language language, Selection selection, ResumeDocument snapshot) {
        return jdbc.sql("INSERT INTO resumes (user_id, job_id, language, selection, snapshot) "
                        + "VALUES (?, ?, ?, ?::jsonb, ?::jsonb) RETURNING id")
                .params(userId, jobId, language.name(), json.writeValueAsString(selection),
                        json.writeValueAsString(snapshot))
                .query(UUID.class)
                .single();
    }

    /** Newest first; all of the user's resumes, or only those of one job. */
    public List<Summary> list(UUID userId, UUID jobId) {
        return jdbc.sql("SELECT id, job_id, language, created_at FROM resumes "
                        + "WHERE user_id = ? AND (?::uuid IS NULL OR job_id = ?::uuid) ORDER BY created_at DESC")
                .params(userId, jobId, jobId)
                .query(ResumeRepository::summary)
                .list();
    }

    public Optional<Saved> find(UUID userId, UUID id) {
        return jdbc.sql("SELECT id, job_id, language, created_at, snapshot::text AS snapshot FROM resumes "
                        + "WHERE user_id = ? AND id = ?")
                .params(userId, id)
                .query((rs, row) -> new Saved(summary(rs, row),
                        json.readValue(rs.getString("snapshot"), ResumeDocument.class)))
                .optional();
    }

    public boolean delete(UUID userId, UUID id) {
        return jdbc.sql("DELETE FROM resumes WHERE user_id = ? AND id = ?").params(userId, id).update() > 0;
    }

    private static Summary summary(ResultSet rs, int row) throws SQLException {
        return new Summary(rs.getObject("id", UUID.class), rs.getObject("job_id", UUID.class),
                Language.valueOf(rs.getString("language")), rs.getTimestamp("created_at").toInstant());
    }
}
