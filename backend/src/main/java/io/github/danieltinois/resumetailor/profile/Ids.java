package io.github.danieltinois.resumetailor.profile;

import java.security.SecureRandom;
import java.util.HexFormat;

/** Generates the stable ids of profile items: {@code <prefix>_<8 hex chars>}. */
public final class Ids {

    private static final SecureRandom RANDOM = new SecureRandom();

    private Ids() {
    }

    public static String next(String prefix) {
        byte[] bytes = new byte[4];
        RANDOM.nextBytes(bytes);
        return prefix + "_" + HexFormat.of().formatHex(bytes);
    }
}
