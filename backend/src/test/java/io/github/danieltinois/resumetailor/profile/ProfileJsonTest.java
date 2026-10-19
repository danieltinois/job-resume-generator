package io.github.danieltinois.resumetailor.profile;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import io.github.danieltinois.resumetailor.Fixtures;

class ProfileJsonTest {

    @Test
    void roundTrip() {
        Profile profile = Fixtures.exampleProfile();

        Profile again = Fixtures.JSON.readValue(Fixtures.JSON.writeValueAsString(profile), Profile.class);

        assertThat(again).isEqualTo(profile);
    }

    @Test
    void missingListsBecomeEmpty() {
        Profile profile = Fixtures.JSON.readValue(
                "{\"personal\":{\"name\":\"A\",\"title\":{\"pt\":\"B\"}}}", Profile.class);

        assertThat(profile.experiences()).isEmpty();
        assertThat(profile.skillCategories()).isEmpty();
        assertThat(profile.projects()).isEmpty();
        assertThat(profile.education()).isEmpty();
        assertThat(profile.languages()).isEmpty();
    }

    @Test
    void idsHavePrefixAndEightHexChars() {
        String first = Ids.next("ach");

        assertThat(first).matches("ach_[0-9a-f]{8}");
        assertThat(Ids.next("ach")).isNotEqualTo(first);
    }
}
