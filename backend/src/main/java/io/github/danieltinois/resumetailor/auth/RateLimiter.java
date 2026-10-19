package io.github.danieltinois.resumetailor.auth;

import java.time.Duration;

import org.springframework.stereotype.Component;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;

/**
 * Per IP and email attempt limits for the sign-in endpoints. In memory (one
 * backend instance), and bounded: idle keys expire and the number of tracked
 * keys is capped, so random emails cannot exhaust memory.
 */
@Component
public class RateLimiter {

    /** A named allowance of {@code attempts} per {@code period}. */
    public record Limit(String scope, int attempts, Duration period) {
    }

    public static final Limit LOGIN = new Limit("login", 5, Duration.ofMinutes(1));

    /** Emails sent on request (reset, verification): enough for a typo, too few to flood an inbox. */
    public static final Limit ACCOUNT_MAIL = new Limit("mail", 3, Duration.ofMinutes(10));

    private static final long DEFAULT_MAX_KEYS = 100_000;

    /** Longer than every limit's period, so an idle bucket is only dropped once it would be full again. */
    private static final Duration IDLE_EXPIRY = Duration.ofMinutes(15);

    private final Cache<String, Bucket> buckets;

    public RateLimiter() {
        this(DEFAULT_MAX_KEYS);
    }

    RateLimiter(long maxKeys) {
        this.buckets = Caffeine.newBuilder()
                .maximumSize(maxKeys)
                .expireAfterAccess(IDLE_EXPIRY)
                .executor(Runnable::run)
                .build();
    }

    public boolean tryAcquire(Limit limit, String ip, String email) {
        String key = limit.scope() + "|" + ip + "|" + UserRepository.normalizeEmail(email);
        return buckets.get(key, ignored -> Bucket.builder()
                        .addLimit(Bandwidth.builder()
                                .capacity(limit.attempts())
                                .refillGreedy(limit.attempts(), limit.period())
                                .build())
                        .build())
                .tryConsume(1);
    }

    long trackedKeys() {
        buckets.cleanUp();
        return buckets.estimatedSize();
    }
}
