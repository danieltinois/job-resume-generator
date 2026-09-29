"""Schema of profile/profile.yaml — the single source of truth about the career.

Every achievement carries a stable `id`. That id is the anchor that a future AI
pass must reuse: generated content may only reference achievements that exist
here.
"""

from pydantic import BaseModel, Field, model_validator


class Achievement(BaseModel):
    id: str
    text: str
    skills: list[str] = Field(default_factory=list)


class Experience(BaseModel):
    company: str
    role: str
    start_date: str
    end_date: str | None = None
    achievements: list[Achievement] = Field(default_factory=list)


class Project(BaseModel):
    name: str
    description: str
    skills: list[str] = Field(default_factory=list)
    url: str | None = None


class Education(BaseModel):
    institution: str
    degree: str
    start_date: str | None = None
    end_date: str | None = None


class Language(BaseModel):
    name: str
    level: str | None = None


class SkillCategory(BaseModel):
    name: str
    skills: list[str] = Field(default_factory=list)


class Personal(BaseModel):
    name: str
    title: str
    location: str = ""
    email: str = ""
    phone: str = ""
    linkedin: str = ""
    github: str = ""


class Profile(BaseModel):
    personal: Personal
    summary: str = ""
    skills: list[str] = Field(default_factory=list)
    skill_categories: list[SkillCategory] = Field(default_factory=list)
    experiences: list[Experience] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    education: list[Education] = Field(default_factory=list)
    languages: list[Language] = Field(default_factory=list)

    @model_validator(mode="after")
    def _achievement_ids_are_globally_unique(self) -> "Profile":
        seen: set[str] = set()
        for experience in self.experiences:
            for achievement in experience.achievements:
                if achievement.id in seen:
                    raise ValueError(f"duplicate achievement id: {achievement.id!r}")
                seen.add(achievement.id)
        return self

    @property
    def flat_skills(self) -> list[str]:
        """Every skill in profile order, whether declared flat or in a category.

        Matching and the `analyze` report read this, so a profile that only uses
        `skill_categories` still reports matched skills.
        """
        ordered = list(self.skills)
        for category in self.skill_categories:
            ordered += [skill for skill in category.skills if skill not in ordered]
        return ordered

    @property
    def claimed_skills(self) -> set[str]:
        """Every technology the profile claims anywhere."""
        names = set(self.flat_skills)
        for experience in self.experiences:
            for achievement in experience.achievements:
                names |= set(achievement.skills)
        for project in self.projects:
            names |= set(project.skills)
        return names
