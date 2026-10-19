package io.github.danieltinois.resumetailor.matching;

import java.util.Arrays;
import java.util.List;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** The {@code tech_terms} table, read once at startup: the terms only change with a migration. */
@Component
public class JdbcTechTermCatalog implements TechTermCatalog {

    private final List<TechTerm> terms;

    public JdbcTechTermCatalog(JdbcClient jdbc) {
        this.terms = jdbc.sql("SELECT canonical, aliases FROM tech_terms ORDER BY id")
                .query((rs, row) -> new TechTerm(rs.getString("canonical"),
                        Arrays.asList((String[]) rs.getArray("aliases").getArray())))
                .list();
    }

    @Override
    public List<TechTerm> all() {
        return terms;
    }
}
