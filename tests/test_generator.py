"""Selection: which achievements survive, in which order."""

import pytest

from resume_tailor.generator import build, format_period
from resume_tailor.matcher import rank
from resume_tailor.models import Profile

PROFILE = Profile.model_validate(
    {
        "personal": {"name": "Alex", "title": "Backend", "email": "a@example.com"},
        "summary": "Summary text.",
        "skills": ["Python", "AWS", "Rust"],
        "experiences": [
            {
                "company": "Low",
                "role": "R",
                "start_date": "2020-01",
                "end_date": "2021-01",
                "achievements": [{"id": "low-1", "text": "Rust only", "skills": ["Rust"]}],
            },
            {
                "company": "High",
                "role": "R",
                "start_date": "2023-01",
                "end_date": None,
                "achievements": [
                    {"id": "h-a", "text": "One python thing", "skills": ["Python"]},
                    {"id": "h-b", "text": "Aws and python", "skills": ["Python", "AWS"]},
                ],
            },
        ],
        "projects": [
            {"name": "Keep", "description": "d", "skills": ["Python"]},
            {"name": "Drop", "description": "d", "skills": ["Rust"]},
        ],
        "education": [{"institution": "U", "degree": "BSc"}],
        "languages": [{"name": "Portuguese", "level": "Native"}],
    }
)

RESUME_JOB = "Backend role with Python and AWS."


def test_drops_unmatched_achievements():
    resume = build(PROFILE, rank(PROFILE, RESUME_JOB))
    assert [a["id"] for e in resume["experience"] for a in e["achievements"]] == ["h-b", "h-a"]


def test_keeps_achievement_text_verbatim():
    """V1 selects, it never rewrites. This is the anti-hallucination guard."""
    resume = build(PROFILE, rank(PROFILE, RESUME_JOB))
    texts = {a["id"]: a["text"] for e in resume["experience"] for a in e["achievements"]}
    assert texts == {"h-b": "Aws and python", "h-a": "One python thing"}


def test_orders_experiences_by_best_achievement_score():
    resume = build(PROFILE, rank(PROFILE, "Python and AWS and Rust everywhere"))
    assert [e["company"] for e in resume["experience"]] == ["High", "Low"]


def test_orders_achievements_by_score_desc():
    resume = build(PROFILE, rank(PROFILE, RESUME_JOB))
    assert [a["id"] for a in resume["experience"][0]["achievements"]] == ["h-b", "h-a"]


def test_falls_back_to_full_profile_when_nothing_matches():
    """An empty resume is worse than an untargeted one."""
    resume = build(PROFILE, rank(PROFILE, "We need Elixir and Haskell."))
    assert [a["id"] for e in resume["experience"] for a in e["achievements"]] == [
        "low-1", "h-a", "h-b",
    ]


def test_dropped_experience_disappears_entirely():
    resume = build(PROFILE, rank(PROFILE, RESUME_JOB))
    assert [e["company"] for e in resume["experience"]] == ["High"]


def test_matched_skills_come_first():
    resume = build(PROFILE, rank(PROFILE, RESUME_JOB))
    assert resume["skills"] == ["Python", "AWS", "Rust"]


def test_projects_filtered_by_relevance():
    resume = build(PROFILE, rank(PROFILE, RESUME_JOB))
    assert [p["name"] for p in resume["projects"]] == ["Keep"]


@pytest.mark.parametrize(
    "start,end,expected",
    [
        ("2025-01", None, "Jan 2025 - Present"),
        ("2020-03", "2022-11", "Mar 2020 - Nov 2022"),
        ("2020", None, "2020 - Present"),
    ],
)
def test_format_period(start, end, expected):
    assert format_period(start, end) == expected


def test_build_contains_only_template_keys():
    resume = build(PROFILE, rank(PROFILE, RESUME_JOB))
    assert set(resume) == {
        "personal", "summary", "skills", "skill_categories",
        "experience", "projects", "education", "languages",
    }


def test_skill_categories_are_rendered_not_the_flat_list():
    profile = Profile.model_validate(
        {
            **PROFILE.model_dump(),
            "skills": [],
            "skill_categories": [
                {"name": "Data", "skills": ["PostgreSQL", "Redis"]},
                {"name": "Web", "skills": ["Python", "Rust"]},
            ],
        }
    )
    resume = build(profile, rank(profile, RESUME_JOB))
    assert resume["skills"] == []  # categories replace the flat list
    # matched skills float to the front of their own category, order kept
    assert resume["skill_categories"] == [
        {"name": "Data", "skills": ["PostgreSQL", "Redis"]},
        {"name": "Web", "skills": ["Python", "Rust"]},
    ]


def test_categories_still_feed_the_analyze_report():
    """A profile that only uses categories must still report matched skills."""
    profile = Profile.model_validate(
        {**PROFILE.model_dump(), "skills": [],
         "skill_categories": [{"name": "Web", "skills": ["Python", "Rust"]}]}
    )
    assert rank(profile, RESUME_JOB).matched_skills == ["Python"]
