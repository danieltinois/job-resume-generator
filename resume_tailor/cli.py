"""CLI: `analyze` shows the ranking, `generate` writes resume.json + resume.pdf."""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

from .generator import build
from .job import Job, load_job
from .matcher import Match, rank
from .models import Profile
from .profile import ROOT, load_profile

TEMPLATE = ROOT / "templates" / "resume.typ"
OUTPUT_DIR = ROOT / "output"
TOP_N = 10


def print_report(job: Job, match: Match) -> None:
    top = [(a, s) for a, s in sorted(match.scores.items(), key=lambda i: i[1], reverse=True) if s > 0]
    top = top[:TOP_N]

    print(f"Job: {job.name}" + (f" @ {job.company}" if job.company else ""))
    print(f"\nMatched skills ({len(match.matched_skills)}):")
    for skill in match.matched_skills or ["(none)"]:
        print(f"  - {skill}")

    print(f"\nMentioned in job, not in your profile ({len(match.missing_skills)}):")
    for skill in match.missing_skills or ["(none)"]:
        print(f"  - {skill}")

    print("\nTop achievements:")
    for position, (achievement_id, score) in enumerate(top, start=1):
        print(f"  {position}. {achievement_id} (score: {score})")
    if not top:
        print("  (none - the resume will fall back to the full profile)")


def render_pdf(data_path: Path, pdf_path: Path) -> None:
    """Compile the template. Typst reads the JSON through --input; no Typst code
    is generated from Python strings."""
    # Typst resolves --input paths against the template's folder and rejects
    # backslashes, so run from templates/ with relative POSIX paths.
    def relative(path: Path) -> str:
        return Path(os.path.relpath(path, TEMPLATE.parent)).as_posix()

    command = [
        "typst", "compile",
        "--root", "..",  # project root, so the sandbox allows output/<job>/
        f"--input=resume={relative(data_path)}",
        TEMPLATE.name,
        relative(pdf_path),
    ]
    try:
        process = subprocess.run(command, cwd=TEMPLATE.parent, capture_output=True, text=True)
    except FileNotFoundError:
        raise SystemExit(
            "Typst not found on PATH. Install it from https://typst.app "
            "(e.g. `scoop install typst`) and try again."
        )
    if process.returncode != 0:
        raise SystemExit(f"typst failed:\n{process.stderr.strip()}")


def generate(profile: Profile, job: Job, match: Match) -> Path:
    print("Analyzing job...")
    print(f"Matched {len(match.matched_skills)} skills.")
    resume = build(profile, match)
    print(f"Selected {sum(len(e['achievements']) for e in resume['experience'])} achievements.\n")

    out_dir = OUTPUT_DIR / job.slug
    out_dir.mkdir(parents=True, exist_ok=True)
    data_path = out_dir / "resume.json"
    data_path.write_text(
        json.dumps(resume, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    pdf_path = out_dir / "resume.pdf"
    render_pdf(data_path, pdf_path)
    return pdf_path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="resume-tailor", description="Tailored resumes from a single profile."
    )
    subcommands = parser.add_subparsers(dest="command", required=True)
    for name, help_text in (
        ("analyze", "show how the profile matches a job"),
        ("generate", "write resume.json and resume.pdf"),
    ):
        subcommand = subcommands.add_parser(name, help=help_text)
        subcommand.add_argument("job", type=Path, help="path to the job .md file")

    args = parser.parse_args(argv)
    profile = load_profile()
    job = load_job(args.job)
    match = rank(profile, job.text)

    if args.command == "analyze":
        print_report(job, match)
        return 0

    pdf = generate(profile, job, match)
    print("Generated:")
    print(pdf.relative_to(ROOT))
    return 0


if __name__ == "__main__":
    sys.exit(main())
