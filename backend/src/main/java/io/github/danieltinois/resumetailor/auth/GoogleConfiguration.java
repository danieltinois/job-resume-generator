package io.github.danieltinois.resumetailor.auth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.util.StringUtils;

/**
 * Registers Google only when credentials are configured, so a deployment
 * without them still starts and simply offers password sign-in. Google
 * returns to the public URL (app.base-url), not to whatever host and port
 * the request reached the backend through: behind a proxy those differ, and
 * Google rejects a redirect URI that is not exactly the registered one.
 */
@Configuration
@Conditional(GoogleConfiguration.Configured.class)
public class GoogleConfiguration {

    @Bean
    ClientRegistrationRepository clientRegistrationRepository(GoogleProperties google, AuthProperties auth) {
        return new InMemoryClientRegistrationRepository(CommonOAuth2Provider.GOOGLE.getBuilder("google")
                .clientId(google.clientId())
                .clientSecret(google.clientSecret())
                .redirectUri(auth.baseUrl() + "/login/oauth2/code/{registrationId}")
                .build());
    }

    static class Configured implements Condition {

        @Override
        public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
            return StringUtils.hasText(context.getEnvironment().getProperty("app.google.client-id"));
        }
    }
}
