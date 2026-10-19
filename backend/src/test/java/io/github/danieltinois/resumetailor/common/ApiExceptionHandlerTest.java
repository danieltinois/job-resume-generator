package io.github.danieltinois.resumetailor.common;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import io.github.danieltinois.resumetailor.IntegrationTest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

@Import(ApiExceptionHandlerTest.Endpoints.class)
class ApiExceptionHandlerTest extends IntegrationTest {

    record Body(@NotBlank String name) {
    }

    @TestConfiguration
    @RestController
    static class Endpoints {

        @PostMapping("/api/test/echo")
        Body echo(@Valid @RequestBody Body body) {
            return body;
        }

        @GetMapping("/api/test/boom")
        Body boom() {
            throw new IllegalStateException("secret internal detail");
        }

        @GetMapping("/api/test/missing")
        Body missing() {
            throw new NotFoundException();
        }
    }

    @Test
    void malformedJsonIs400() throws Exception {
        mvc.perform(post("/api/test/echo").with(jwt()).contentType(MediaType.APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }

    @Test
    void invalidBodyIs422WithPaths() throws Exception {
        mvc.perform(post("/api/test/echo").with(jwt()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\"}"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.errors[0].path").value("name"));
    }

    @Test
    void unexpectedErrorIsGeneric500() throws Exception {
        mvc.perform(get("/api/test/boom").with(jwt()))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.detail").value("Unexpected error"));
    }

    @Test
    void notFoundIs404() throws Exception {
        mvc.perform(get("/api/test/missing").with(jwt()))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }
}
