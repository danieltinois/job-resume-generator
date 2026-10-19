package io.github.danieltinois.resumetailor.matching;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** A fixed catalog. Plan 2 replaces it with the {@code tech_terms} table, seeded from {@link #defaults()}. */
public final class InMemoryTechTermCatalog implements TechTermCatalog {

    private static final List<String> CANONICALS = List.of(
            "Python", "JavaScript", "TypeScript", "Java", "Kotlin", "Swift", "Rust",
            "Ruby", "PHP", "C#", "C++", "SQL", "PostgreSQL", "MySQL", "MariaDB",
            "MongoDB", "Redis", "SQLite", "Elasticsearch", "DynamoDB",
            "Docker", "Kubernetes", "Terraform", "Ansible", "AWS", "GCP", "Azure",
            "REST API", "GraphQL", "gRPC", "Kafka", "RabbitMQ", "Celery", "OAuth",
            "Django", "Flask", "FastAPI", "Spring", "Node.js", "React", "Vue",
            "Angular", "Linux", "Git", "CI/CD", "pytest", "Pydantic", "NumPy",
            "Pandas", "Machine Learning", "Data Engineering", "Microservices");

    private static final Map<String, List<String>> ALIASES = Map.ofEntries(
            Map.entry("PostgreSQL", List.of("postgres", "psql")),
            Map.entry("Kubernetes", List.of("k8s")),
            Map.entry("JavaScript", List.of("js")),
            Map.entry("TypeScript", List.of("ts")),
            Map.entry("Node.js", List.of("nodejs", "node")),
            Map.entry("REST API", List.of("restful", "api rest", "apis rest")),
            Map.entry("CI/CD", List.of("ci cd", "continuous integration")),
            Map.entry("Machine Learning", List.of("ml", "aprendizado de maquina")),
            Map.entry("Microservices", List.of("microsservicos", "microservicos")),
            Map.entry("GCP", List.of("google cloud")),
            Map.entry("AWS", List.of("amazon web services")));

    private final List<TechTerm> terms;

    public InMemoryTechTermCatalog(List<TechTerm> terms) {
        this.terms = List.copyOf(terms);
    }

    public static InMemoryTechTermCatalog defaults() {
        List<TechTerm> terms = new ArrayList<>();
        for (String canonical : CANONICALS) {
            terms.add(new TechTerm(canonical, ALIASES.getOrDefault(canonical, List.of())));
        }
        return new InMemoryTechTermCatalog(terms);
    }

    @Override
    public List<TechTerm> all() {
        return terms;
    }
}
