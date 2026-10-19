package io.github.danieltinois.resumetailor;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import io.github.danieltinois.resumetailor.auth.AccountMailer;

/**
 * Captures account emails instead of sending them. Emails go out after the
 * request on another thread, so the accessors wait for them.
 */
public class RecordingMailer implements AccountMailer {

    public record Sent(String kind, String email, String link) {

        /** The token query parameter of the link. */
        public String token() {
            return link.substring(link.indexOf("token=") + "token=".length());
        }
    }

    private static final Duration WAIT = Duration.ofSeconds(5);

    public final List<Sent> sent = new CopyOnWriteArrayList<>();

    /** When true, sending throws, like an unreachable SMTP server. */
    public volatile boolean failing;

    @Override
    public void sendVerification(String email, String link) {
        record(new Sent("verification", email, link));
    }

    @Override
    public void sendPasswordReset(String email, String link) {
        record(new Sent("reset", email, link));
    }

    private void record(Sent mail) {
        if (failing) {
            throw new IllegalStateException("SMTP unavailable for " + mail.email());
        }
        sent.add(mail);
    }

    /** The latest email, waiting for at least one to arrive. */
    public Sent last() {
        awaitCount(1);
        return sent.getLast();
    }

    /** Waits until at least {@code count} emails were sent. */
    public void awaitCount(int count) {
        long deadline = System.nanoTime() + WAIT.toNanos();
        while (sent.size() < count && System.nanoTime() < deadline) {
            try {
                Thread.sleep(10);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }
        assertThat(sent).as("emails sent").hasSizeGreaterThanOrEqualTo(count);
    }

    /** Asserts exactly {@code count} emails after giving pending ones time to arrive. */
    public void assertSentExactly(int count) throws InterruptedException {
        Thread.sleep(300);
        assertThat(sent).hasSize(count);
    }

    public void reset() {
        sent.clear();
        failing = false;
    }

    @TestConfiguration
    public static class Config {

        @Bean
        @Primary
        RecordingMailer recordingMailer() {
            return new RecordingMailer();
        }
    }
}
