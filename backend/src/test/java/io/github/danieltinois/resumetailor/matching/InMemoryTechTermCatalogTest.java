package io.github.danieltinois.resumetailor.matching;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class InMemoryTechTermCatalogTest {

    /** KNOWN_TECH of the Python matcher, which the catalog replaces. */
    private static final String[] LEGACY_KNOWN_TECH = {
            "Python", "JavaScript", "TypeScript", "Java", "Kotlin", "Swift", "Rust",
            "Ruby", "PHP", "C#", "C++", "SQL", "PostgreSQL", "MySQL", "MariaDB",
            "MongoDB", "Redis", "SQLite", "Elasticsearch", "DynamoDB",
            "Docker", "Kubernetes", "Terraform", "Ansible", "AWS", "GCP", "Azure",
            "REST API", "GraphQL", "gRPC", "Kafka", "RabbitMQ", "Celery", "OAuth",
            "Django", "Flask", "FastAPI", "Spring", "Node.js", "React", "Vue",
            "Angular", "Linux", "Git", "CI/CD", "pytest", "Pydantic", "NumPy",
            "Pandas", "Machine Learning", "Data Engineering", "Microservices",
    };

    private final TechTermCatalog catalog = InMemoryTechTermCatalog.defaults();

    @Test
    void aliasResolvesToAllForms() {
        assertThat(catalog.formsOf("Postgres")).contains("postgresql", "postgres", "psql");
    }

    @Test
    void canonicalResolvesToAllForms() {
        assertThat(catalog.formsOf("PostgreSQL")).isEqualTo(catalog.formsOf("Postgres"));
    }

    @Test
    void unknownSkillIsItsOwnForm() {
        assertThat(catalog.formsOf("Typst")).containsExactly("typst");
    }

    @Test
    void canonicalOfAlias() {
        assertThat(catalog.canonicalOf("k8s")).isEqualTo("Kubernetes");
        assertThat(catalog.canonicalOf("Typst")).isEqualTo("Typst");
    }

    @Test
    void defaultsContainEveryLegacyKnownTech() {
        assertThat(catalog.all()).extracting(TechTerm::canonical).contains(LEGACY_KNOWN_TECH);
        assertThat(LEGACY_KNOWN_TECH).hasSize(52);
    }
}
