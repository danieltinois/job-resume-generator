package io.github.danieltinois.resumetailor.matching;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class MatchingConfiguration {

    /** The built-in catalog, until the tech_terms table takes over. */
    @Bean
    TechTermCatalog techTermCatalog() {
        return InMemoryTechTermCatalog.defaults();
    }
}
