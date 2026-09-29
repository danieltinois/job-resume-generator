"""Profile loading and validation. A bad profile must fail loudly."""

import pytest
import yaml
from pydantic import ValidationError

from resume_tailor.models import Profile
from resume_tailor.profile import EXAMPLE_PATH, load_profile

MINIMAL = {
    "personal": {"name": "Alex", "title": "Backend Engineer"},
    "skills": ["Python"],
    "experiences": [
        {
            "company": "Example",
            "role": "Engineer",
            "start_date": "2023-01",
            "end_date": None,
            "achievements": [
                {"id": "a1", "text": "Did a thing.", "skills": ["Python"]},
                {"id": "a2", "text": "Did another thing.", "skills": ["AWS"]},
            ],
        }
    ],
}


def write(tmp_path, data):
    path = tmp_path / "profile.yaml"
    path.write_text(yaml.safe_dump(data), encoding="utf-8")
    return path


def test_loads_minimal_profile(tmp_path):
    profile = load_profile(write(tmp_path, MINIMAL))
    assert profile.personal.name == "Alex"
    assert profile.experiences[0].end_date is None
    assert profile.projects == []  # optional sections default to empty


def test_shipped_example_profile_is_valid():
    """profile.example.yaml must always work, including on a fresh clone where
    the untracked profile.yaml does not exist."""
    profile = load_profile(EXAMPLE_PATH)
    assert profile.personal.name == "Alex Fictitious"
    assert profile.experiences
    assert profile.skill_categories


def test_missing_profile_points_at_the_example(tmp_path):
    with pytest.raises(SystemExit) as error:
        load_profile(tmp_path / "nope.yaml")
    assert "profile.example.yaml" in str(error.value)


def test_duplicate_achievement_id_is_rejected(tmp_path):
    """Ids anchor future AI output, so duplicates are a hard error."""
    data = {**MINIMAL, "experiences": [MINIMAL["experiences"][0],
                                      {**MINIMAL["experiences"][0], "company": "Other"}]}
    with pytest.raises(ValidationError, match="duplicate achievement id"):
        Profile.model_validate(data)


def test_missing_personal_name_is_rejected():
    with pytest.raises(ValidationError):
        Profile.model_validate({"personal": {"title": "Engineer"}})


def test_claimed_skills_includes_every_source():
    profile = Profile.model_validate(
        {
            **MINIMAL,
            "projects": [{"name": "P", "description": "D", "skills": ["Typst"]}],
        }
    )
    assert profile.claimed_skills == {"Python", "AWS", "Typst"}
