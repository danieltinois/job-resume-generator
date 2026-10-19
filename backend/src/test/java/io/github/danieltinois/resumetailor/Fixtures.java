package io.github.danieltinois.resumetailor;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;

import io.github.danieltinois.resumetailor.profile.Profile;
import tools.jackson.databind.json.JsonMapper;

/** Test fixtures from src/test/resources/fixtures. All data is fictional. */
public final class Fixtures {

    public static final JsonMapper JSON = JsonMapper.builder().build();

    private Fixtures() {
    }

    public static String text(String name) {
        try (InputStream in = Fixtures.class.getResourceAsStream("/fixtures/" + name)) {
            if (in == null) {
                throw new IllegalArgumentException("missing fixture " + name);
            }
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public static Profile exampleProfile() {
        return JSON.readValue(text("profile-example.json"), Profile.class);
    }
}
