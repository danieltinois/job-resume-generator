"""Deterministic keyword matching between the profile and a job description.

This module is the whole matching engine of V1: lexical, no AI, no embeddings.
Its output (`Match`) is the only contract the rest of the app depends on.

Future AI extension
-------------------
Replace the body of `rank()` with an AI-backed implementation that returns the
same `Match` (semantic skills, relevance scores, maybe rewritten bullets). The
CLI, `generator` and the Typst template do not change, because they only ever
consume `Match`.

Hard rules for that future implementation: it may reorder, select and rewrite,
but it may never invent a company, a role, a technology, a metric or an
achievement id that is not present in profile.yaml.
"""

import re
from dataclasses import dataclass, field

from .models import Profile

# Vocabulary used ONLY to flag job requirements the profile does not claim.
# ponytail: fixed list, so it will miss uncommon tools. Extend it when it does,
# or let the AI pass replace it entirely.
KNOWN_TECH = (
    "Python", "JavaScript", "TypeScript", "Java", "Kotlin", "Swift", "Rust",
    "Ruby", "PHP", "C#", "C++", "SQL", "PostgreSQL", "MySQL", "MariaDB",
    "MongoDB", "Redis", "SQLite", "Elasticsearch", "DynamoDB",
    "Docker", "Kubernetes", "Terraform", "Ansible", "AWS", "GCP", "Azure",
    "REST API", "GraphQL", "gRPC", "Kafka", "RabbitMQ", "Celery", "OAuth",
    "Django", "Flask", "FastAPI", "Spring", "Node.js", "React", "Vue",
    "Angular", "Linux", "Git", "CI/CD", "pytest", "Pydantic", "NumPy",
    "Pandas", "Machine Learning", "Data Engineering", "Microservices",
)


def normalize(text: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace.

    Keeps `+`, `#` and `.` so "c++", "c#" and "node.js" survive normalization.
    """
    return " ".join(re.sub(r"[^a-z0-9+#.]+", " ", text.lower()).split())


def variants(skill: str) -> set[str]:
    """Forms a skill may take inside a job description.

    Plural agreement goes both ways, because either side may hold the plural:
    "REST API" (profile) vs "REST APIs" (job) and vice versa.
    """
    base = normalize(skill)
    words = base.split()
    forms = {base}
    if words and len(words[-1]) >= 3 and words[-1].isalpha():
        head, last = words[:-1], words[-1]
        forms.add(" ".join(head + [last[:-1] if last.endswith("s") else last + "s"]))
    return {form for form in forms if form}


def _contains(haystack: str, needle: str) -> bool:
    """Word-boundary containment that tolerates tokens ending in punctuation.

    `\b` does not work after "c++" or "c#", so use explicit lookarounds.
    """
    return re.search(rf"(?<!\w){re.escape(needle)}(?!\w)", haystack) is not None


def appears_in(skill: str, text: str) -> bool:
    """Is `skill` present in the already-normalized `text`?"""
    return any(_contains(text, form) for form in variants(skill))


_KNOWN_TECH_NORMALIZED = [(normalize(term), term) for term in KNOWN_TECH]


@dataclass
class Match:
    """Everything the rest of the app needs to know about one job."""

    text: str  # normalized job description
    matched_skills: list[str] = field(default_factory=list)  # profile skills found in the job
    missing_skills: list[str] = field(default_factory=list)  # job tech not claimed by the profile
    scores: dict[str, int] = field(default_factory=dict)  # achievement id -> matched skill count

    def has(self, skill: str) -> bool:
        return appears_in(skill, self.text)

    def matched(self, skills: list[str]) -> list[str]:
        return [skill for skill in skills if self.has(skill)]


def rank(profile: Profile, job_text: str) -> Match:
    """Score every achievement of the profile against the job description.

    Score = number of the achievement's skills that appear in the job. Ties keep
    the original profile order (Python's sort is stable).
    """
    text = normalize(job_text)
    match = Match(text=text, matched_skills=match_skills(profile.flat_skills, text))

    claimed = {normalize(skill) for skill in profile.claimed_skills}
    match.missing_skills = [
        display
        for normalized, display in _KNOWN_TECH_NORMALIZED
        if normalized not in claimed and appears_in(normalized, text)
    ]

    for experience in profile.experiences:
        for achievement in experience.achievements:
            match.scores[achievement.id] = sum(
                1 for skill in achievement.skills if appears_in(skill, text)
            )
    return match


def match_skills(skills: list[str], text: str) -> list[str]:
    return [skill for skill in skills if appears_in(skill, text)]
