"""Load a job description (plain Markdown). No parsing cleverness on purpose:
the whole text goes to the matcher, the H1 and the `Company:` line are only
there to title the report and the output folder."""

import re
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Job:
    slug: str  # file stem, used as the output folder name
    name: str  # H1 title
    company: str | None
    text: str  # full description, used for matching


def load_job(path: Path) -> Job:
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        raise SystemExit(f"Job description not found: {path}")

    title = re.search(r"^#\s+(.+)$", text, re.MULTILINE)
    company = re.search(r"^Company:\s*(.+)$", text, re.MULTILINE | re.IGNORECASE)
    return Job(
        slug=path.stem,
        name=title.group(1).strip() if title else path.stem,
        company=company.group(1).strip() if company else None,
        text=text,
    )
