package io.github.danieltinois.resumetailor.resume;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param binary        the typst executable, a name on PATH or a path
 * @param timeout       how long one render may take before it is killed
 * @param maxConcurrent renders allowed at once; 0 means one per CPU
 */
@ConfigurationProperties("resume.typst")
public record TypstProperties(String binary, Duration timeout, int maxConcurrent) {
}
