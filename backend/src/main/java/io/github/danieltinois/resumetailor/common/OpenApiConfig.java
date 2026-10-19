package io.github.danieltinois.resumetailor.common;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.ArraySchema;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.IntegerSchema;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;

/**
 * OpenAPI description served at /v3/api-docs and in Swagger UI. Operations
 * outside /api/auth need the bearer access token, which Swagger UI's
 * Authorize button sends once pasted from /api/auth/login.
 */
@Configuration
public class OpenApiConfig {

    static final String BEARER = "bearerAuth";
    private static final String PROBLEM = "Problem";

    @Bean
    OpenAPI openApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Resume Tailor API")
                        .version("v1")
                        .description("Bilingual profiles, job matching and tailored PDF resumes. Sign in with "
                                + "POST /api/auth/login and use the returned accessToken with Authorize."))
                .components(new Components()
                        .addSecuritySchemes(BEARER, new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }

    /** Marks protected operations and documents the RFC 7807 error body every operation can return. */
    @Bean
    OpenApiCustomizer securityAndErrors() {
        return api -> {
            api.getComponents().getSchemas().values().forEach(OpenApiConfig::allowNulls);
            // Registered here, after springdoc has collected the schemas of the scanned types.
            api.getComponents().addSchemas(PROBLEM, problemSchema());
            api.getPaths().forEach((path, item) -> item.readOperations().forEach(operation -> {
                if (!path.startsWith("/api/auth/")) {
                    operation.setSecurity(List.of(new SecurityRequirement().addList(BEARER)));
                }
                operation.getResponses().addApiResponse("default", new ApiResponse()
                        .description("Error, as an RFC 7807 problem")
                        .content(new Content().addMediaType("application/problem+json",
                                new MediaType().schema(new Schema<>().$ref("#/components/schemas/" + PROBLEM)))));
            }));
        };
    }

    /**
     * Record components without a primitive type can be null on the wire (an
     * unset English text, an open end date, an absent summary) and Jackson
     * writes them as null. Lists are always present and primitives never null.
     * Declaring this keeps the generated frontend types honest.
     */
    @SuppressWarnings({ "rawtypes", "unchecked" })
    private static void allowNulls(Schema<?> schema) {
        if (schema.getProperties() == null) {
            return;
        }
        Map<String, Schema> nullable = new LinkedHashMap<>();
        schema.getProperties().forEach((name, property) -> {
            if (property.get$ref() != null) {
                Schema nullType = new Schema();
                nullType.addType("null");
                Schema refOrNull = new Schema();
                refOrNull.setAnyOf(List.<Schema>of(new Schema().$ref(property.get$ref()), nullType));
                nullable.put(name, refOrNull);
            } else if (property.getTypes() != null && property.getTypes().contains("string")) {
                property.addType("null");
            }
        });
        schema.getProperties().putAll(nullable);
    }

    private static Schema<?> problemSchema() {
        Schema<?> pathError = new ObjectSchema()
                .addProperty("path", new StringSchema().example("experiences[0].achievements[2].text.pt"))
                .addProperty("message", new StringSchema());
        return new ObjectSchema()
                .addProperty("type", new StringSchema()
                        .description("Problem type URI; absent means about:blank. "
                                + "urn:resume-tailor:problem:concurrent-refresh: retry the refresh"))
                .addProperty("status", new IntegerSchema().example(422))
                .addProperty("title", new StringSchema())
                .addProperty("detail", new StringSchema())
                .addProperty("instance", new StringSchema())
                .addProperty("errors", new ArraySchema().items(pathError)
                        .description("Validation errors, present on 422"));
    }
}
