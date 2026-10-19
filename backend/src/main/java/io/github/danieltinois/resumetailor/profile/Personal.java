package io.github.danieltinois.resumetailor.profile;

import io.github.danieltinois.resumetailor.common.LocalizedText;

public record Personal(String name, LocalizedText title, String location, String email, String phone,
        String linkedin, String github) {
}
