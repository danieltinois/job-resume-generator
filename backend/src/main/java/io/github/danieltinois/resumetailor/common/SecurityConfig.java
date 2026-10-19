package io.github.danieltinois.resumetailor.common;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;

import io.github.danieltinois.resumetailor.auth.JwtService;
import tools.jackson.databind.json.JsonMapper;

/**
 * Stateless API security: a bearer access token on every request except the
 * sign-in endpoints. CSRF protection is off because no endpoint relies on an
 * ambient credential except the refresh cookie, which is SameSite=Strict.
 */
@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain api(HttpSecurity http, AuthenticationEntryPoint problemEntryPoint) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/auth/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/providers").permitAll()
                        .requestMatchers("/oauth2/**", "/login/oauth2/**", "/error").permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(server -> server
                        .jwt(Customizer.withDefaults())
                        .authenticationEntryPoint(problemEntryPoint))
                .exceptionHandling(errors -> errors.authenticationEntryPoint(problemEntryPoint));
        return http.build();
    }

    @Bean
    JwtDecoder jwtDecoder(JwtService jwtService) {
        return jwtService.decoder();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationEntryPoint problemEntryPoint(JsonMapper json) {
        return (request, response, exception) -> {
            ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED,
                    "Authentication required");
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
            json.writeValue(response.getOutputStream(), problem);
        };
    }
}
