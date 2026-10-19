package io.github.danieltinois.resumetailor.job;

import org.springframework.test.web.servlet.MockMvc;

/** Creates jobs through the API for tests in other packages. */
public final class JobApiTestSupport {

    private JobApiTestSupport() {
    }

    /** Returns the new job's id. */
    public static String create(MockMvc mvc, String auth, String description) throws Exception {
        return JobApiTest.idOf(JobApiTest.createJob(mvc, auth, description));
    }
}
