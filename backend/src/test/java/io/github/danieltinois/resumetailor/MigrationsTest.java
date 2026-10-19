package io.github.danieltinois.resumetailor;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class MigrationsTest extends IntegrationTest {

    @Test
    void allTablesExist() {
        var tables = jdbc.sql("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
                .query(String.class)
                .list();

        assertThat(tables).contains("users", "auth_tokens", "profiles", "jobs", "resumes", "tech_terms");
    }
}
