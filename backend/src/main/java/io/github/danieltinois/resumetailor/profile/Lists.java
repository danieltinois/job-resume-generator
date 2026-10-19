package io.github.danieltinois.resumetailor.profile;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Immutable copies that keep null elements: profile JSON comes from clients,
 * and a null inside a list must reach {@link ProfileValidator} as a
 * path-keyed error instead of failing deserialization.
 */
final class Lists {

    private Lists() {
    }

    static <T> List<T> copy(List<T> list) {
        return list == null ? List.of() : Collections.unmodifiableList(new ArrayList<>(list));
    }
}
