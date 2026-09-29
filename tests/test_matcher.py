"""Lexical matching: normalization, variants, scoring, missing skills."""

from resume_tailor.matcher import Match, appears_in, normalize, rank, variants
from resume_tailor.models import Profile

PROFILE = Profile.model_validate(
    {
        "personal": {"name": "Alex", "title": "Backend"},
        "skills": ["Python", "PostgreSQL", "REST API", "AWS"],
        "experiences": [
            {
                "company": "A",
                "role": "R",
                "start_date": "2023-01",
                "achievements": [
                    {"id": "hit-two", "text": "t", "skills": ["PostgreSQL", "AWS"]},
                    {"id": "hit-one", "text": "t", "skills": ["Python"]},
                    {"id": "miss", "text": "t", "skills": ["Rust"]},
                ],
            }
        ],
    }
)

JOB = "We need Python, PostgreSQL and AWS. Docker is a plus."


def test_normalize_lowercases_and_strips_punctuation():
    assert normalize("Python, REST APIs!") == "python rest apis"


def test_variants_cover_plural_in_both_directions():
    assert variants("REST APIs") == {"rest apis", "rest api"}
    assert variants("REST API") == {"rest api", "rest apis"}
    assert variants("Kafka") == {"kafka", "kafkas"}


def test_appears_in_respects_word_boundaries():
    text = normalize("We run pythonic services")
    assert not appears_in("Python", text)
    assert appears_in("Python", normalize("strong Python team"))


def test_appears_in_handles_punctuation_tokens():
    assert appears_in("C++", normalize("we write C++ daily"))
    assert appears_in("CI/CD", normalize("CI/CD pipelines"))


def test_rank_scores_number_of_matched_skills():
    match = rank(PROFILE, JOB)
    assert match.scores == {"hit-two": 2, "hit-one": 1, "miss": 0}


def test_rank_matches_profile_skills_plural_agnostically():
    """Profile says 'REST API', the job says 'REST APIs'."""
    match = rank(PROFILE, "Looking for REST APIs and Python.")
    assert match.matched_skills == ["Python", "REST API"]


def test_rank_reports_job_tech_absent_from_profile():
    match = rank(PROFILE, JOB)
    assert "Docker" in match.missing_skills  # in the job, not in the profile
    assert "Python" not in match.missing_skills  # claimed by the profile


def test_match_has_and_matched_helpers():
    match = Match(text=normalize(JOB))
    assert match.has("AWS")
    assert match.matched(["Rust", "AWS"]) == ["AWS"]
