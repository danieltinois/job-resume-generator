package io.github.danieltinois.resumetailor.auth;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;

/** At most 5 login attempts per minute for one IP and email. In memory: one backend instance. */
@Component
public class LoginRateLimiter {

    private static final int ATTEMPTS = 5;

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public boolean tryAcquire(String ip, String email) {
        return buckets.computeIfAbsent(ip + "|" + UserRepository.normalizeEmail(email), key -> Bucket.builder()
                        .addLimit(Bandwidth.builder().capacity(ATTEMPTS).refillGreedy(ATTEMPTS, Duration.ofMinutes(1))
                                .build())
                        .build())
                .tryConsume(1);
    }
}
