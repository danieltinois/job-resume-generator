package io.github.danieltinois.resumetailor.auth;

import java.io.IOException;

import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

/**
 * After Google sign-in: link the account, start a session the same way a
 * password login does (refresh cookie), and send the browser back to the SPA,
 * which then calls /api/auth/refresh for its access token.
 */
@Component
public class GoogleLoginSuccessHandler implements AuthenticationSuccessHandler {

    private final GoogleAccountLinker linker;
    private final AuthService auth;
    private final RefreshCookies cookies;
    private final AuthProperties properties;

    public GoogleLoginSuccessHandler(GoogleAccountLinker linker, AuthService auth, RefreshCookies cookies,
            AuthProperties properties) {
        this.linker = linker;
        this.auth = auth;
        this.cookies = cookies;
        this.properties = properties;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException {
        OAuth2User google = (OAuth2User) authentication.getPrincipal();
        User user = linker.link(google.getAttribute("sub"), google.getAttribute("email"),
                Boolean.TRUE.equals(google.getAttribute("email_verified")), google.getAttribute("name"));
        AuthService.Session session = auth.startSession(user.id());

        // The HTTP session only carried the OAuth2 state; the API itself is stateless.
        HttpSession httpSession = request.getSession(false);
        if (httpSession != null) {
            httpSession.invalidate();
        }
        response.addHeader(HttpHeaders.SET_COOKIE, cookies.issue(session.refreshToken()).toString());
        response.sendRedirect(properties.baseUrl() + "/auth/callback");
    }
}
