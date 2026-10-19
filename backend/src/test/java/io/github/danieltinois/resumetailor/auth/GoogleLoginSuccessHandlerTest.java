package io.github.danieltinois.resumetailor.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;

import io.github.danieltinois.resumetailor.IntegrationTest;
import jakarta.servlet.http.Cookie;

class GoogleLoginSuccessHandlerTest extends IntegrationTest {

    @Autowired
    GoogleLoginSuccessHandler handler;

    static OAuth2AuthenticationToken googleLogin(String sub, String email, boolean verified) {
        OidcIdToken idToken = new OidcIdToken("id-token", Instant.now(), Instant.now().plusSeconds(60),
                Map.of("sub", sub, "email", email, "email_verified", verified, "name", "Alex"));
        DefaultOidcUser user = new DefaultOidcUser(List.of(new SimpleGrantedAuthority("OIDC_USER")), idToken);
        return new OAuth2AuthenticationToken(user, user.getAuthorities(), "google");
    }

    @Test
    void successRedirectsToCallbackWithWorkingRefreshCookie() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationSuccess(new MockHttpServletRequest(), response,
                googleLogin("google-123", "alex@example.com", true));

        assertThat(response.getRedirectedUrl()).isEqualTo("http://app.test/auth/callback");
        String cookie = response.getHeader("Set-Cookie");
        assertThat(cookie).contains("refresh_token=", "HttpOnly", "SameSite=Strict");
        String value = cookie.substring("refresh_token=".length(), cookie.indexOf(';'));
        mvc.perform(post("/api/auth/refresh").cookie(new Cookie(RefreshCookies.NAME, value)))
                .andExpect(status().isOk());
    }
}
