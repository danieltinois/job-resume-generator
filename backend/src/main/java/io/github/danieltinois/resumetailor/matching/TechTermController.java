package io.github.danieltinois.resumetailor.matching;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Profile")
@RestController
public class TechTermController {

    private final TechTermCatalog catalog;

    public TechTermController(TechTermCatalog catalog) {
        this.catalog = catalog;
    }

    /** Feeds the skill autocomplete, so users pick the names the matcher knows. */
    @Operation(summary = "Known technologies and their aliases, for skill autocomplete")
    @GetMapping("/api/tech-terms")
    public List<TechTerm> list() {
        return catalog.all();
    }
}
