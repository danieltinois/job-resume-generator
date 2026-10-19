package io.github.danieltinois.resumetailor.auth;

/** Sends account emails. Links already carry their single-use token. */
public interface AccountMailer {

    void sendVerification(String email, String link);

    void sendPasswordReset(String email, String link);
}
