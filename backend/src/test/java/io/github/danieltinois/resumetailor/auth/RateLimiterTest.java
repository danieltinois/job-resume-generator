package io.github.danieltinois.resumetailor.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;

import org.junit.jupiter.api.Test;

class RateLimiterTest {

    @Test
    void allowsTheConfiguredAttemptsPerKey() {
        RateLimiter limiter = new RateLimiter(1_000);
        RateLimiter.Limit limit = new RateLimiter.Limit("login", 3, Duration.ofMinutes(1));

        assertThat(limiter.tryAcquire(limit, "1.2.3.4", "a@example.com")).isTrue();
        assertThat(limiter.tryAcquire(limit, "1.2.3.4", "a@example.com")).isTrue();
        assertThat(limiter.tryAcquire(limit, "1.2.3.4", "A@example.com ")).isTrue();
        assertThat(limiter.tryAcquire(limit, "1.2.3.4", "a@example.com")).isFalse();
        assertThat(limiter.tryAcquire(limit, "1.2.3.4", "b@example.com")).isTrue();
    }

    @Test
    void scopesAreIndependent() {
        RateLimiter limiter = new RateLimiter(1_000);
        RateLimiter.Limit login = new RateLimiter.Limit("login", 1, Duration.ofMinutes(1));
        RateLimiter.Limit mail = new RateLimiter.Limit("mail", 1, Duration.ofMinutes(1));

        assertThat(limiter.tryAcquire(login, "ip", "a@example.com")).isTrue();
        assertThat(limiter.tryAcquire(mail, "ip", "a@example.com")).isTrue();
    }

    @Test
    void trackedKeysAreBounded() {
        RateLimiter limiter = new RateLimiter(100);
        RateLimiter.Limit limit = new RateLimiter.Limit("login", 5, Duration.ofMinutes(1));

        for (int i = 0; i < 5_000; i++) {
            limiter.tryAcquire(limit, "ip", "user" + i + "@example.com");
        }

        assertThat(limiter.trackedKeys()).isLessThanOrEqualTo(100);
    }
}
