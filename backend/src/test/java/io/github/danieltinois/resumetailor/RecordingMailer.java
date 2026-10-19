package io.github.danieltinois.resumetailor;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import io.github.danieltinois.resumetailor.auth.AccountMailer;

/** Captures account emails instead of sending them. */
public class RecordingMailer implements AccountMailer {

    public record Sent(String kind, String email, String link) {

        /** The token query parameter of the link. */
        public String token() {
            return link.substring(link.indexOf("token=") + "token=".length());
        }
    }

    public final List<Sent> sent = new CopyOnWriteArrayList<>();

    @Override
    public void sendVerification(String email, String link) {
        sent.add(new Sent("verification", email, link));
    }

    @Override
    public void sendPasswordReset(String email, String link) {
        sent.add(new Sent("reset", email, link));
    }

    public Sent last() {
        return sent.getLast();
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
