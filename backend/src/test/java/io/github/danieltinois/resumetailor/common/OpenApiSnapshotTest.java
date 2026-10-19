package io.github.danieltinois.resumetailor.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

import org.junit.jupiter.api.Test;

import io.github.danieltinois.resumetailor.IntegrationTest;
import tools.jackson.databind.SerializationFeature;
import tools.jackson.databind.json.JsonMapper;

/**
 * The OpenAPI spec is committed at docs/api/openapi.json and the frontend
 * generates its API types from it. This test fails when the API changed and
 * the snapshot was not regenerated, so both sides cannot drift apart.
 */
class OpenApiSnapshotTest extends IntegrationTest {

    static final Path SNAPSHOT = Path.of("..", "docs", "api", "openapi.json");

    private static final JsonMapper PRETTY = JsonMapper.builder().enable(SerializationFeature.INDENT_OUTPUT).build();

    @Test
    void committedSpecIsCurrent() throws Exception {
        String live = canonical(mvc.perform(get("/v3/api-docs")).andReturn().getResponse()
                .getContentAsString(StandardCharsets.UTF_8));

        if (Boolean.getBoolean("updateSnapshot")) {
            Files.createDirectories(SNAPSHOT.getParent());
            Files.writeString(SNAPSHOT, live);
        }

        assertThat(Files.exists(SNAPSHOT))
                .as("docs/api/openapi.json is missing: run ./mvnw test -Dtest=OpenApiSnapshotTest -DupdateSnapshot=true")
                .isTrue();
        assertThat(Files.readString(SNAPSHOT))
                .as("docs/api/openapi.json is stale: run ./mvnw test -Dtest=OpenApiSnapshotTest -DupdateSnapshot=true")
                .isEqualTo(live);
    }

    /** Sorted keys and no server URL, so the file only changes when the API does. */
    private static String canonical(String json) {
        @SuppressWarnings("unchecked")
        Map<String, Object> spec = PRETTY.readValue(json, Map.class);
        spec.remove("servers");
        return PRETTY.writeValueAsString(sorted(spec)) + "\n";
    }

    private static Object sorted(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> result = new TreeMap<>();
            map.forEach((key, item) -> result.put(String.valueOf(key), sorted(item)));
            return result;
        }
        if (value instanceof List<?> list) {
            return list.stream().map(OpenApiSnapshotTest::sorted).toList();
        }
        return value;
    }
}
