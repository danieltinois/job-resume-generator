package io.github.danieltinois.resumetailor;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.postgresql.PostgreSQLContainer;

import io.github.danieltinois.resumetailor.auth.JwtService;
import io.github.danieltinois.resumetailor.auth.UserRepository;

/**
 * Base for tests that need the database and the HTTP layer. One PostgreSQL
 * container serves the whole run; user data is wiped before each test.
 */
@SpringBootTest(properties = {
        "app.jwt-secret=test-secret-that-is-at-least-32-bytes-long",
        "app.cookie-secure=false",
        "app.base-url=http://app.test" })
@AutoConfigureMockMvc
@Import(RecordingMailer.Config.class)
public abstract class IntegrationTest {

    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    static {
        POSTGRES.start();
    }

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected JdbcClient jdbc;

    @Autowired
    protected RecordingMailer mailer;

    @Autowired
    private UserRepository users;

    @Autowired
    private JwtService jwt;

    /** Creates a verified account and returns an {@code Authorization} header value for it. */
    protected String signedIn(String email) {
        return "Bearer " + jwt.issue(users.create(email, null, "Alex Fictitious", true).id());
    }

    @BeforeEach
    void wipeUserData() {
        jdbc.sql("TRUNCATE users CASCADE").update();
        mailer.reset();
    }
}
