package io.github.danieltinois.resumetailor.matching;

import io.github.danieltinois.resumetailor.job.JobText;
import io.github.danieltinois.resumetailor.profile.Profile;

/**
 * How a profile is scored against a job. The only seam the rest of the app
 * depends on: an AI-backed matcher would be another implementation.
 *
 * <p>Any implementation may rank and select, but never invent a skill, an
 * achievement or an id that the profile does not contain.
 */
public interface MatchingStrategy {

    MatchResult analyze(Profile profile, JobText job);
}
