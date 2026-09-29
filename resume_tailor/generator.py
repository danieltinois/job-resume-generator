"""Turn `Profile` + `Match` into the data the Typst template renders.

V1 only SELECTS and ORDERS. It never rewrites a fact: every string that reaches
`resume.json` is copied verbatim from profile.yaml. Rewriting is the future AI
pass, and it must still be constrained to the same profile facts.
"""

import re

from .matcher import Match
from .models import Profile

MONTHS = ("Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")


def format_period(start: str | None, end: str | None) -> str:
    """2025-01 / null -> "Jan 2025 - Present"."""

    def label(value: str | None) -> str:
        if not value:
            return "Present"
        if re.fullmatch(r"\d{4}-\d{2}", value):
            year, month = value.split("-")
            return f"{MONTHS[int(month) - 1]} {year}"
        return value

    return f"{label(start)} - {label(end)}"


def _select_experiences(profile: Profile, match: Match) -> list[dict]:
    """Keep relevant achievements; order companies and bullets by relevance.

    If nothing matched at all, keep everything: a tailored resume that drops
    every achievement is worse than an untargeted one.
    """
    any_match = any(score > 0 for score in match.scores.values())

    entries = []
    for experience in profile.experiences:
        picked = [
            (achievement, match.scores.get(achievement.id, 0))
            for achievement in experience.achievements
        ]
        if any_match:
            picked = [item for item in picked if item[1] > 0]
        if not picked:
            continue
        picked.sort(key=lambda item: item[1], reverse=True)  # stable: profile order breaks ties
        entries.append((picked[0][1], experience, picked))

    entries.sort(key=lambda entry: entry[0], reverse=True)
    return [
        {
            "company": experience.company,
            "role": experience.role,
            "period": format_period(experience.start_date, experience.end_date),
            "achievements": [{"id": a.id, "text": a.text} for a, _ in picked],
        }
        for _, experience, picked in entries
    ]


def _select_projects(profile: Profile, match: Match) -> list[dict]:
    relevant = [p for p in profile.projects if any(match.has(skill) for skill in p.skills)]
    if not relevant:
        relevant = profile.projects
    return [
        {
            "name": p.name,
            "description": p.description,
            "skills": p.skills,
            "url": p.url,
        }
        for p in relevant
    ]


def _ordered(match: Match, skills: list[str]) -> list[str]:
    """Job-relevant skills first, rest in profile order."""
    return [s for s in skills if match.has(s)] + [s for s in skills if not match.has(s)]


def build(profile: Profile, match: Match) -> dict:
    """The whole resume.json. Only the keys the template actually renders."""
    personal = profile.personal
    categorized = bool(profile.skill_categories)
    return {
        "personal": {
            "name": personal.name,
            "title": personal.title,
            "location": personal.location,
            "email": personal.email,
            "phone": personal.phone,
            "linkedin": personal.linkedin,
            "github": personal.github,
        },
        "summary": profile.summary,
        # the flat list is only rendered when there are no categories
        "skills": [] if categorized else _ordered(match, profile.flat_skills),
        "skill_categories": [
            {"name": c.name, "skills": _ordered(match, c.skills)}
            for c in profile.skill_categories
        ],
        "experience": _select_experiences(profile, match),
        "projects": _select_projects(profile, match),
        "education": [
            {
                "institution": e.institution,
                "degree": e.degree,
                "period": format_period(e.start_date, e.end_date),
            }
            for e in profile.education
        ],
        "languages": [
            {"name": l.name, "level": l.level} for l in profile.languages
        ],
    }
