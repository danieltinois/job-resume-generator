# resume-tailor

One `profile.yaml`, one job description, one tailored PDF.

```
profile.yaml + job.md -> python -> resume.json -> typst -> resume.pdf
```

## Requirements

- Python 3.11+
- [Typst](https://typst.app) on `PATH` (`scoop install typst` / `brew install typst` / `winget install Typst.Typst`)

## Install

```bash
pip install -e ".[dev]"
```

## Use

```bash
python -m resume_tailor.cli analyze  jobs/example.md   # see the ranking, writes nothing
python -m resume_tailor.cli generate jobs/example.md   # -> output/example/resume.pdf
```

`generate` writes `output/<job-file-name>/resume.json` (exactly what the template
renders) and `resume.pdf` next to it.

## Flow

| File | Role |
|---|---|
| `profile/profile.yaml` | Your career. The only source of truth. |
| `jobs/*.md` | A job description. Plain Markdown. |
| `resume_tailor/models.py` | Pydantic schema; rejects duplicate achievement ids. |
| `resume_tailor/profile.py` | Load + validate the profile. |
| `resume_tailor/job.py` | Load the job description. |
| `resume_tailor/matcher.py` | Lexical matching. **The seam where AI plugs in.** |
| `resume_tailor/generator.py` | Select + order -> `resume.json`. Never rewrites. |
| `resume_tailor/cli.py` | `analyze` / `generate`, and the Typst call. |
| `templates/resume.typ` | A4, one column, ATS-friendly. Receives the JSON. |

## Rules for editing `profile.yaml`

- Every achievement **must** have a unique `id`. A future AI pass uses those ids
  to stay anchored to real facts.
- Dates are `YYYY-MM`. An empty `end_date` prints as `Present`.
- V1 never rewrites your text. It selects and orders only.
- Skills go in `skill_categories`, not in the flat `skills` list, if you want
  them grouped on the page. The flat `skills` list is only rendered when there
  are no categories.

```yaml
skill_categories:
  - name: Languages
    skills: [TypeScript, Python]
  - name: Cloud & Infrastructure
    skills: [AWS, Docker]
```

## The template

`templates/resume.typ` is the only presentation code. Two Typst behaviours to
know before editing it, both of which have already bitten this file:

- **Never use `luma(0.4)` with a bare number.** In Typst 0.15 it evaluates to
  white, which renders an entire resume invisible on a white page. The template
  uses explicit hex colors only.
- **Never put spacing at the top of a block.** `v(weak: true)`, `block(above:)`
  and a leading `v()` inside a function body are all dropped or collapsed.
  Spacing that must survive goes in `pad(top:, bottom:)` inside the block.

Also: do not add letter tracking to section headings. Wide tracking makes text
extractors insert phantom spaces, so `LANGUAGES` extracts as `L ANGUAGES` and
ATS section detection breaks.

## Adding AI later

`matcher.rank()` returns a `Match`. Everything downstream — `generator.build()`,
the Typst template, the CLI — only ever consumes that object. To add AI, write a
new `rank()` that reads the job semantically and returns the same `Match`
(possibly with AI-rewritten bullets in the selected achievements). Nothing else
in the codebase needs to change.

The AI may select, order and rewrite. It may **never** invent a company, role,
technology, metric or achievement id that is not in `profile.yaml`.

## Tests

```bash
pytest
```
