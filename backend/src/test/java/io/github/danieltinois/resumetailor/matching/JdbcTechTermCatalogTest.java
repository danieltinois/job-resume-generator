package io.github.danieltinois.resumetailor.matching;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import io.github.danieltinois.resumetailor.IntegrationTest;

class JdbcTechTermCatalogTest extends IntegrationTest {

    @Autowired
    TechTermCatalog catalog;

    @Test
    void matchesBuiltInDefaults() {
        assertThat(catalog.all()).isEqualTo(InMemoryTechTermCatalog.defaults().all());
    }

    @Test
    void isTheApplicationCatalog() {
        assertThat(catalog).isInstanceOf(JdbcTechTermCatalog.class);
        assertThat(catalog.formsOf("k8s")).contains("kubernetes");
    }
}
