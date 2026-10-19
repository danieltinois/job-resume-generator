package io.github.danieltinois.resumetailor.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.TestPropertySource;

import io.github.danieltinois.resumetailor.Fixtures;
import io.github.danieltinois.resumetailor.IntegrationTest;
import tools.jackson.databind.JsonNode;

class OpenApiDocsTest {

    @Nested
    class Enabled extends IntegrationTest {

        private JsonNode spec() throws Exception {
            String body = mvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            return Fixtures.JSON.readTree(body);
        }

        @Test
        void specListsEveryApiPath() throws Exception {
            List<String> paths = new ArrayList<>(spec().get("paths").propertyNames());

            assertThat(paths).contains(
                    "/api/auth/register", "/api/auth/login", "/api/auth/refresh", "/api/auth/logout",
                    "/api/auth/verify-email", "/api/auth/resend-verification", "/api/auth/forgot-password",
                    "/api/auth/reset-password", "/api/auth/providers", "/api/me",
                    "/api/profile", "/api/profile/import", "/api/profile/export",
                    "/api/jobs", "/api/jobs/{id}", "/api/jobs/{id}/analysis",
                    "/api/resumes", "/api/resumes/preview", "/api/resumes/{id}/pdf", "/api/resumes/{id}");
        }

        @Test
        void specDeclaresBearerAuth() throws Exception {
            JsonNode scheme = spec().at("/components/securitySchemes/bearerAuth");

            assertThat(scheme.get("type").asString()).isEqualTo("http");
            assertThat(scheme.get("scheme").asString()).isEqualTo("bearer");
            assertThat(scheme.get("bearerFormat").asString()).isEqualTo("JWT");
        }

        @Test
        void protectedOperationsRequireBearerAndPublicOnesDoNot() throws Exception {
            JsonNode spec = spec();

            assertThat(spec.at("/paths/~1api~1me/get/security/0/bearerAuth").isArray()).isTrue();
            assertThat(spec.at("/paths/~1api~1auth~1login/post/security").isMissingNode()
                    || spec.at("/paths/~1api~1auth~1login/post/security").isEmpty()).isTrue();
        }

        @Test
        void operationsAreGroupedByTag() throws Exception {
            JsonNode spec = spec();

            assertThat(spec.at("/paths/~1api~1profile/get/tags/0").asString()).isEqualTo("Profile");
            assertThat(spec.at("/paths/~1api~1jobs/post/tags/0").asString()).isEqualTo("Jobs");
            assertThat(spec.at("/paths/~1api~1resumes~1preview/post/tags/0").asString()).isEqualTo("Resumes");
            assertThat(spec.at("/paths/~1api~1auth~1login/post/tags/0").asString()).isEqualTo("Auth");
        }

        @Test
        void problemSchemaReferencedByErrorsIsDefined() throws Exception {
            JsonNode spec = spec();

            assertThat(spec.at("/paths/~1api~1jobs/get/responses/default/content/application~1problem+json/schema/$ref")
                    .asString()).isEqualTo("#/components/schemas/Problem");
            assertThat(spec.at("/components/schemas/Problem/properties/errors").isMissingNode()).isFalse();
        }

        @Test
        void jobAndResumeSummariesAreDistinctSchemas() throws Exception {
            JsonNode spec = spec();
            String jobs = spec.at("/paths/~1api~1jobs/get/responses/200/content/*~1*/schema/items/$ref").asString();
            String resumes = spec.at("/paths/~1api~1resumes/get/responses/200/content/*~1*/schema/items/$ref")
                    .asString();

            assertThat(jobs).isEqualTo("#/components/schemas/JobSummary");
            assertThat(resumes).isEqualTo("#/components/schemas/ResumeSummary");
            assertThat(spec.at("/components/schemas/JobSummary/properties/title").isMissingNode()).isFalse();
            assertThat(spec.at("/components/schemas/ResumeSummary/properties/jobId").isMissingNode()).isFalse();
        }

        @Test
        void swaggerUiIsServedWithoutAuthentication() throws Exception {
            mvc.perform(get("/swagger-ui/index.html")).andExpect(status().isOk());
            mvc.perform(get("/swagger-ui.html")).andExpect(status().is3xxRedirection());
        }
    }

    @Nested
    @TestPropertySource(properties = "app.api-docs-enabled=false")
    class Disabled extends IntegrationTest {

        @Test
        void docsAreGone() throws Exception {
            mvc.perform(get("/v3/api-docs")).andExpect(status().is4xxClientError());
            mvc.perform(get("/swagger-ui/index.html")).andExpect(status().is4xxClientError());
        }
    }
}
