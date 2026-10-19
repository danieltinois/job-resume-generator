package io.github.danieltinois.resumetailor.job;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import io.github.danieltinois.resumetailor.common.Language;

/** Jobs are always read and written through their owner's id. */
@Repository
public class JobRepository {

    private static final String COLUMNS = "id, title, company, language, description, created_at";

    private final JdbcClient jdbc;

    public JobRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public StoredJob create(UUID userId, JobText parsed, String description) {
        return jdbc.sql("INSERT INTO jobs (user_id, title, company, language, description) VALUES (?, ?, ?, ?, ?) "
                        + "RETURNING " + COLUMNS)
                .params(userId, parsed.title(), parsed.company(), parsed.language().name(), description)
                .query(JobRepository::map)
                .single();
    }

    public List<StoredJob> list(UUID userId) {
        return jdbc.sql("SELECT " + COLUMNS + " FROM jobs WHERE user_id = ? ORDER BY created_at DESC")
                .param(userId)
                .query(JobRepository::map)
                .list();
    }

    public Optional<StoredJob> find(UUID userId, UUID jobId) {
        return jdbc.sql("SELECT " + COLUMNS + " FROM jobs WHERE user_id = ? AND id = ?")
                .params(userId, jobId)
                .query(JobRepository::map)
                .optional();
    }

    /** Deletes the job and, by cascade, its resumes. False when the user has no such job. */
    public boolean delete(UUID userId, UUID jobId) {
        return jdbc.sql("DELETE FROM jobs WHERE user_id = ? AND id = ?").params(userId, jobId).update() > 0;
    }

    private static StoredJob map(ResultSet rs, int row) throws SQLException {
        return new StoredJob(rs.getObject("id", UUID.class), rs.getString("title"), rs.getString("company"),
                Language.valueOf(rs.getString("language")), rs.getString("description"),
                rs.getTimestamp("created_at").toInstant());
    }
}
