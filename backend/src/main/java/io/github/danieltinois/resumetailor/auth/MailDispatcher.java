package io.github.danieltinois.resumetailor.auth;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Sends account emails after the request's transaction commits, on another
 * thread. The response then takes the same time and has the same status
 * whether or not an email went out, so it cannot reveal which addresses
 * have accounts, and a failing SMTP server cannot fail the request.
 */
@Component
public class MailDispatcher implements AutoCloseable {

    private static final Logger LOG = LoggerFactory.getLogger(MailDispatcher.class);

    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    public void send(Runnable mail) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    submit(mail);
                }
            });
        } else {
            submit(mail);
        }
    }

    private void submit(Runnable mail) {
        executor.execute(() -> {
            try {
                mail.run();
            } catch (RuntimeException e) {
                // The exception message may contain the recipient's address: log its type only.
                LOG.warn("Account email could not be sent ({})", e.getClass().getName());
            }
        });
    }

    @Override
    public void close() {
        executor.close();
    }
}
