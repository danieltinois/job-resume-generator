package io.github.danieltinois.resumetailor.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Behind nginx every request comes from the proxy's address. The login rate
 * limit must use the client address the proxy forwards, and only when the
 * request really comes from a trusted proxy. Runs on a real Tomcat, which
 * applies X-Forwarded-For (MockMvc does not).
 */
class ForwardedHeadersTest {

    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    static {
        POSTGRES.start();
    }

    abstract static class RealServer {

        @LocalServerPort
        int port;

        private final HttpClient http = HttpClient.newHttpClient();

        int login(String email, String forwardedFor) throws Exception {
            HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/auth/login"))
                    .header("Content-Type", "application/json")
                    .header("X-Forwarded-For", forwardedFor)
                    .POST(HttpRequest.BodyPublishers.ofString(
                            "{\"email\":\"" + email + "\",\"password\":\"wrong-password\"}"))
                    .build();
            return http.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
        }
    }

    @Nested
    @SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
            "app.jwt-secret=test-secret-that-is-at-least-32-bytes-long" })
    class FromTrustedProxy extends RealServer {

        @Test
        void eachForwardedClientHasItsOwnLimit() throws Exception {
            String email = UUID.randomUUID() + "@example.com";
            for (int i = 0; i < 5; i++) {
                assertThat(login(email, "203.0.113.7")).isEqualTo(401);
            }

            assertThat(login(email, "203.0.113.7")).isEqualTo(429);
            assertThat(login(email, "203.0.113.8")).isEqualTo(401);
        }
    }

    @Nested
    @SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
            "app.jwt-secret=test-secret-that-is-at-least-32-bytes-long",
            "server.tomcat.remoteip.internal-proxies=10\\.99\\.99\\.99" })
    class FromUntrustedAddress extends RealServer {

        @Test
        void forwardedHeaderIsIgnored() throws Exception {
            String email = UUID.randomUUID() + "@example.com";
            for (int i = 0; i < 5; i++) {
                login(email, "203.0.113." + i);
            }

            // Spoofed addresses do not buy extra attempts: all count against the real one.
            assertThat(login(email, "203.0.113.99")).isEqualTo(429);
        }
    }
}
