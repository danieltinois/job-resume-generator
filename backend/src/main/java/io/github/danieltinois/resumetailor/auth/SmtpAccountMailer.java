package io.github.danieltinois.resumetailor.auth;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/** Plain-text account emails in Portuguese and English, over SMTP (Mailpit in development). */
@Component
public class SmtpAccountMailer implements AccountMailer {

    private final JavaMailSender sender;
    private final AuthProperties properties;

    public SmtpAccountMailer(JavaMailSender sender, AuthProperties properties) {
        this.sender = sender;
        this.properties = properties;
    }

    @Override
    public void sendVerification(String email, String link) {
        send(email, "Confirme seu e-mail / Confirm your email", """
                Confirme seu e-mail para entrar no Resume Tailor (o link vale por 24 horas):
                %s

                Confirm your email to sign in to Resume Tailor (the link is valid for 24 hours):
                %s
                """.formatted(link, link));
    }

    @Override
    public void sendPasswordReset(String email, String link) {
        send(email, "Redefinir senha / Reset your password", """
                Para criar uma nova senha, abra o link abaixo (vale por 1 hora). Se não foi você, ignore este e-mail.
                %s

                To choose a new password, open the link below (valid for 1 hour). If it was not you, ignore this email.
                %s
                """.formatted(link, link));
    }

    private void send(String to, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(properties.mailFrom());
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        sender.send(message);
    }
}
