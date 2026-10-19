package io.github.danieltinois.resumetailor.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.TestPropertySource;
import org.springframework.web.util.UriComponentsBuilder;

import io.github.danieltinois.resumetailor.IntegrationTest;

class ProvidersControllerTest {

    @Nested
    class WithoutCredentials extends IntegrationTest {

        @Test
        void googleDisabled() throws Exception {
            mvc.perform(get("/api/auth/providers"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.google").value(false));
        }

        @Test
        void googleAuthorizationEndpointIsAbsent() throws Exception {
            mvc.perform(get("/oauth2/authorization/google")).andExpect(status().is4xxClientError());
        }
    }

    @Nested
    @TestPropertySource(properties = { "app.google.client-id=test-client", "app.google.client-secret=test-secret" })
    class WithCredentials extends IntegrationTest {

        @Test
        void googleEnabled() throws Exception {
            mvc.perform(get("/api/auth/providers")).andExpect(jsonPath("$.google").value(true));
        }

        @Test
        void authorizationRedirectsToGoogle() throws Exception {
            mvc.perform(get("/oauth2/authorization/google"))
                    .andExpect(status().is3xxRedirection())
                    .andExpect(header().string("Location", startsWith("https://accounts.google.com/")));
        }

        @Test
        void googleReturnsToThePublicUrlWhateverHostTheProxySends() throws Exception {
            String location = mvc.perform(get("/oauth2/authorization/google").header("Host", "backend:8080"))
                    .andReturn().getResponse().getHeader("Location");

            String redirectUri = UriComponentsBuilder.fromUriString(location).build().getQueryParams()
                    .getFirst("redirect_uri");
            assertThat(URLDecoder.decode(redirectUri, StandardCharsets.UTF_8))
                    .isEqualTo("http://app.test/login/oauth2/code/google");
        }
    }
}
