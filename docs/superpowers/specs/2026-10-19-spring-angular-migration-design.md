# Spring Boot + Angular migration — design

- **Status:** awaiting owner review
- **Date:** 2026-10-19
- **Branch:** `feature/spring-angular-migration`

## 1. Goal

Turn the `resume-tailor` Python CLI into a multi-user web application:

- a **Spring Boot 4.1** backend (3.x left open-source support in June 2026) that owns profiles, jobs, matching and PDF rendering;
- an **Angular** frontend built for filling in a long, nested profile quickly;
- **bilingual resumes** (PT-BR and EN), because the owner applies to both
  Brazilian and international jobs.

Success means a user can sign up, enter (or import) their profile once in both
languages, paste a job description, review and adjust the suggested selection
with a live PDF preview, and download an ATS-friendly resume in the job's
language, in a couple of minutes.

### Decisions taken with the owner

| Topic | Decision |
|---|---|
| Audience | Multi-user, each user with their own profile and history. |
| AI | **Not in V1.** Matching stays deterministic and lexical, improved. The architecture keeps a seam for AI later. |
| Translation | Bilingual profile fields written by the user. No machine translation in V1. |
| Generation flow | Paste job → review match → adjust manually → live preview → save/download. |
| Login | Email + password **and** Google sign-in. |
| Database | PostgreSQL, profile stored as one JSONB document per user. |
| PDF | Keep Typst, invoked by the backend. |
| Experience order | Reverse chronological by default (changed from relevance order). |
| Python CLI | Removed from the tree once the web app reaches parity; stays in git history. |

### Out of scope for V1 (phase 2 candidates)

AI rewriting of bullets, "suggest translation" button (DeepL or LLM), several
profiles per user, cover letters, production deployment and hosting.

## 2. Architecture

```
Browser (Angular SPA)
   │  JSON over HTTPS, JWT in Authorization header, refresh token in HttpOnly cookie
   ▼
Spring Boot API ──► PostgreSQL (users, tokens, profiles JSONB, jobs, resumes, tech_terms)
   │
   ├─► SMTP (Mailpit in development)
   ├─► Google OAuth2
   └─► typst CLI (bundled in the backend image) ─► PDF bytes
```

```
job-resume-generator/
├── backend/                     Spring Boot 4.1 · Java 21 · Maven wrapper
│   └── src/main/java/io/github/danieltinois/resumetailor/
│       ├── auth/        registration, login, JWT, refresh, Google OAuth2, email
│       ├── profile/     Profile record, validation, YAML import, JSONB repository
│       ├── job/         jobs, language/title/company detection
│       ├── matching/    MatchingStrategy, LexicalMatchingStrategy, tech_terms
│       ├── resume/      ResumeAssembler, TypstRenderer, history
│       └── common/      ProblemDetail errors, security config, shared types
│   └── src/main/resources/
│       ├── db/migration/   Flyway: schema + tech_terms seed
│       └── typst/          resume.typ + bundled fonts
├── frontend/                    Angular · Angular Material
│   └── src/app/  auth/ · dashboard/ · profile-editor/ · job-review/ · core/
├── docker-compose.yml           postgres · mailpit · backend · frontend (nginx)
├── .env.example
└── README.md                    rewritten for the new stack
```

The code is organized by feature, not by layer: each package can be read and
tested on its own.

## 3. Data model

### 3.1 Relational tables

| Table | Main columns | Purpose |
|---|---|---|
| `users` | `id` UUID, `email` unique, `password_hash` nullable, `google_sub` unique nullable, `name`, `email_verified`, `created_at` | An account may have a password, Google, or both. |
| `auth_tokens` | `token_hash`, `user_id`, `type` (`VERIFY_EMAIL`, `RESET_PASSWORD`, `REFRESH`), `expires_at`, `used_at` | Email verification, password reset and refresh-token rotation. Only hashes are stored. |
| `profiles` | `user_id` PK/FK, `data` JSONB, `version` int, `updated_at` | The whole profile, one per user. `version` gives optimistic locking. |
| `jobs` | `id`, `user_id`, `title`, `company`, `description`, `language` (`PT`/`EN`), `created_at` | Pasted job descriptions, kept for reuse. |
| `resumes` | `id`, `user_id`, `job_id`, `language`, `selection` JSONB, `snapshot` JSONB, `created_at` | A generated resume: the review decision plus the frozen document that was rendered. |
| `tech_terms` | `id`, `canonical`, `aliases` text[] | Replaces the hard-coded `KNOWN_TECH` and provides synonyms. Global, seeded by Flyway. |

PDFs are **not stored**. They are rendered on demand from `resumes.snapshot`,
which guarantees an old resume renders identically even after the profile has
been edited.

### 3.2 Profile document (JSONB)

Same shape as today's `profile.yaml`, with two changes: bilingual free text and
system-generated ids.

```json
{
  "personal": {
    "name": "Alex Fictitious",
    "title": { "pt": "Engenheiro Backend", "en": "Backend Engineer" },
    "location": "Lisbon, Portugal",
    "email": "alex@example.com", "phone": "", "linkedin": "", "github": ""
  },
  "summary": { "pt": "...", "en": "..." },
  "skillCategories": [
    { "id": "cat_4e7d", "name": { "pt": "Linguagens", "en": "Languages" }, "skills": ["Java", "SQL"] }
  ],
  "experiences": [{
    "id": "exp_7f3a",
    "company": "Example Payments",
    "role": { "pt": "...", "en": "..." },
    "startDate": "2023-02",
    "endDate": null,
    "achievements": [
      { "id": "ach_91c2", "text": { "pt": "...", "en": "..." }, "skills": ["Kafka", "AWS"] }
    ]
  }],
  "projects": [
    { "id": "prj_2b10", "name": "...", "description": { "pt": "...", "en": "..." }, "skills": [], "url": null }
  ],
  "education": [
    { "id": "edu_5d01", "institution": "...", "degree": { "pt": "...", "en": "..." }, "startDate": "2015-09", "endDate": "2019-07" }
  ],
  "languages": [
    { "name": { "pt": "Inglês", "en": "English" }, "level": { "pt": "Profissional", "en": "Professional" } }
  ]
}
```

Rules:

- **Localized text** (`{pt, en}`): every free-text field. `pt` is required,
  `en` is optional. Company names, institution names, skills, dates and URLs are
  single-valued.
- **Ids** (`exp_`, `ach_`, `prj_`, `edu_`, `cat_` + random suffix) are generated when an
  item is created and never change when its text is edited.
- The flat `skills` list of the Python schema is dropped: skills always live in
  `skillCategories` (a profile may have a single category).
- The backend maps the document to a Java `Profile` record and validates it with
  Bean Validation: required fields, `YYYY-MM` dates, globally unique ids within
  each kind, `pt` present on every localized field.

## 4. Authentication

- **Access token**: JWT, 15 minutes, kept in memory by the SPA and sent as
  `Authorization: Bearer`.
- **Refresh token**: opaque random value in an `HttpOnly; Secure;
  SameSite=Strict` cookie, 30 days, **rotated** on every use (old one marked
  used; reuse of a used token revokes the whole family for that user).
- **Passwords**: BCrypt. Login is rate-limited per IP + email (Bucket4j, in
  memory, 5 attempts/minute).
- **Email verification** is required before the first password login. Password
  reset uses a one-time token valid for 1 hour. Mail goes through Spring Mail
  (SMTP); in development, Mailpit captures it.
- **Google** via Spring OAuth2 Client, handled by the backend:
  1. `google_sub` already known → sign in;
  2. Google email (verified) matches an existing account → link `google_sub`;
  3. otherwise → create an account, already verified.
  After success the backend sets the refresh cookie and redirects to the SPA,
  which calls `/api/auth/refresh` to obtain an access token.
- Without Google credentials configured, the Google button is hidden and
  password login keeps working.

## 5. REST API (`/api`)

| Group | Endpoint | Behaviour |
|---|---|---|
| Auth | `POST /auth/register` | Create account, send verification email. |
| | `POST /auth/verify-email` | Consume verification token. |
| | `POST /auth/login` | Access token in body, refresh cookie set. |
| | `POST /auth/refresh` | Rotate refresh token, return new access token. |
| | `POST /auth/logout` | Revoke refresh token, clear cookie. |
| | `POST /auth/forgot-password`, `POST /auth/reset-password` | Reset flow. `forgot-password` always returns 204 (no account enumeration). |
| | `GET /oauth2/authorization/google` | Start Google sign-in. |
| | `GET /me` | Current user. |
| Profile | `GET /profile` | `{ version, data }`; an empty skeleton for a new user. |
| | `PUT /profile` | Replace the whole profile. **409** on stale `version`; **422** with errors keyed by path (`experiences[0].achievements[2].text.pt`). |
| | `POST /profile/import` | Upload a legacy `profile.yaml`; free text goes to the language chosen in the request; ids are regenerated; returns the converted profile for the user to review and save. |
| | `GET /profile/export` | Download the profile as JSON. |
| Jobs | `POST /jobs` | Store pasted text; detect language, title (first heading or first line) and company (`Company:`/`Empresa:` line). |
| | `GET /jobs`, `GET /jobs/{id}`, `DELETE /jobs/{id}` | History. Deleting a job deletes its resumes. |
| | `GET /jobs/{id}/analysis?lang=pt\|en` | Run matching; returns matched skills, missing skills, scores and the suggested `selection`. Stateless. |
| Resumes | `POST /resumes/preview` | `{ jobId, language, selection }` → `application/pdf`, nothing stored. |
| | `POST /resumes` | Same body; assembles and stores the snapshot. |
| | `GET /resumes`, `GET /resumes/{id}/pdf`, `DELETE /resumes/{id}` | History and download. |

Conventions:

- Errors are RFC 7807 `ProblemDetail`.
- Every query is scoped to the authenticated user; another user's id returns
  **404**.
- `selection` = `{ experienceOrder: [expId], achievements: { expId: [achId] },
  projects: [prjId], skillOrder: { catId: [skill] } }`. The backend
  builds the resume **only by copying profile content referenced by these
  ids**.

## 6. Frontend

### 6.1 Routes

| Route | Screen |
|---|---|
| `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password` | Auth, with "Sign in with Google". |
| `/` | Dashboard: jobs with their generated resumes; "New job". |
| `/profile` | Profile editor. |
| `/jobs/new` | Paste a job description. |
| `/jobs/:id/review` | Review + live PDF preview. |

UI strings are available in PT-BR and EN (Angular i18n), defaulting to the
browser language.

### 6.2 Profile editor (optimized for fast entry)

- Side menu of sections (Personal, Summary, Skills, Experience, Projects,
  Education, Languages) with status badges ("3 missing EN", validation errors).
- **Autosave**: `PUT /profile` 1.5 s after the last change, status shown as
  "Saving…/Saved"; `Ctrl+S` saves immediately. A 409 shows a dialog offering
  to reload the server version.
- **Global PT | EN switch**: in EN mode each field shows the PT text below it,
  greyed, as a translation reference.
- Achievements: `Enter` at the end of a bullet adds the next one; drag to
  reorder (CDK Drag & Drop); skills as chips with autocomplete from the user's
  skills and `tech_terms`.
- Experiences collapse to "Company · Role · period"; only the expanded one
  renders its full form.
- 422 errors are mapped onto the exact form control.

### 6.3 Job review (split screen)

- **Left**: detected language with a PT/EN toggle; matched skills (green) and
  job skills missing from the profile (grey); experiences with achievement
  checkboxes, score badges and drag to reorder, pre-filled with the suggestion;
  project checkboxes; skill order; warnings such as "2 achievements have no EN
  text, PT used"; "Restore suggestion".
- **Right**: PDF preview in an `<iframe>`, re-rendered 500 ms after each change.
  Requests go through `switchMap`, so a newer change cancels the pending one.
- **Bottom**: "Save resume", then download.

### 6.4 Technical choices

Current Angular, standalone components, signals, `ChangeDetectionStrategy.OnPush`,
lazy-loaded routes, typed Reactive Forms with nested `FormArray`s, Angular
Material. An HTTP interceptor adds the access token and, on a 401, calls
`/auth/refresh` once and retries. Desktop-first; on mobile the review screen
stacks instead of splitting.

## 7. Matching

Contract: `MatchingStrategy.analyze(Profile, Job, Language) → MatchResult`.
V1 ships `LexicalMatchingStrategy`; an AI matcher would be another
implementation, without touching controllers, UI or template.

**Kept from `matcher.py`:** normalization that keeps `+ # .`, plural variants
in both directions, word-boundary matching that tolerates `c++`/`c#`, scoring
from the skills tagged on each achievement.

**Improved:**

1. **Accents stripped** during normalization (`automação` = `automacao`).
2. **Aliases** from `tech_terms`: each profile skill resolves to its canonical
   term and the job is searched for every alias. Skills not in the table match
   by their own name.
3. **Section weights**: the job text is split at heading-like lines.
   Requirement sections ("Requisitos", "Requirements", "Must have",
   "O que buscamos", "Qualifications", ...) weigh **2**; everything else,
   including "Diferenciais", "Nice to have", "Desejável", "Bonus", weighs **1**.
   A skill takes the highest weight among the sections it appears in. An
   achievement's score is the sum of its matched skills' weights.
4. **Missing skills** = `tech_terms` found in the job that the profile does not
   claim anywhere (categories, achievements, projects).

**Suggested selection:**

- Achievements with score > 0, ordered by score; ties keep profile order. If
  nothing matched at all, every achievement is kept.
- An experience with no selected achievement is dropped (unless nothing
  matched).
- **Experiences in reverse chronological order** (most recent first). This
  intentionally replaces the Python behaviour of ordering by best score; the
  corresponding test is rewritten, not ported.
- Projects with at least one matched skill; all projects if none match.
- Matched skills first within each category, the rest in profile order.

**Language detection:** count frequent PT stopwords (`de`, `com`, `para`,
`você`, `experiência`, ...) against EN ones (`the`, `with`, `and`, `you`,
`experience`, ...); ties default to PT. The user can override it in the review
screen.

## 8. Resume assembly and PDF

1. **`ResumeAssembler`** turns `(Profile, selection, language)` into a
   `ResumeDocument` record, the equivalent of today's `resume.json`. It copies
   text verbatim by id; an unknown id is a 422. A missing `en` text falls back
   to `pt` and adds a warning to the response.
2. **`TypstRenderer`** writes the document to a per-request temp directory,
   runs `typst compile --input resume=...`, reads the PDF and deletes the
   directory.
   - A semaphore caps concurrent renders (default: number of CPUs).
   - 10 s timeout; failures log stderr and return a 500 `ProblemDetail`.
   - The Typst version is pinned in the backend Dockerfile. Fonts are bundled
     (an open, Calibri-metric-compatible family such as Carlito), so output is
     identical on every machine.
3. **Template**: today's `resume.typ` keeps its layout and documented
   constraints, and gains a PT/EN label dictionary (section headings,
   "Presente/Present", month names) selected by a `lang` field in the document.

## 9. Errors and edge cases

| Situation | Behaviour |
|---|---|
| Two tabs save the profile | Second `PUT` gets 409; UI offers to reload. |
| Profile incomplete (no experiences) | Analysis still runs; review screen shows an empty state with a link to the editor. |
| Job matches nothing | Full profile suggested, banner explains it. |
| EN requested, EN text missing | PT used, warning listed per item. |
| Selection references a deleted achievement | 422 on preview/save; UI offers "Restore suggestion". |
| Typst missing, fails or times out | 500 `ProblemDetail`, stderr in logs, generic message in UI. |
| Email already registered | Register returns 409 for password sign-up; Google sign-in links instead. |
| Expired/used verification or reset token | 400 with a clear message and a "resend" action. |

## 10. Testing

- **Backend unit** (JUnit 5, AssertJ):
  - the 26 Python tests are ported one by one, except the experience-ordering
    test, which is rewritten for reverse chronological order;
  - new tests: accents, aliases, section weights, language detection, title
    and company extraction, EN→PT fallback, unknown-id rejection, profile
    validation, YAML import.
- **Backend integration**: Testcontainers PostgreSQL (JSONB round trip,
  optimistic locking, cross-user isolation); MockMvc auth flows including
  refresh rotation and reuse detection; one real Typst render whose text is
  checked with PDFBox.
- **Frontend**: unit tests for services, the interceptor and the profile form
  mapping; one Playwright end-to-end test of register → verify via Mailpit →
  fill profile → paste job → review → download PDF.
- **CI** (GitHub Actions): backend `./mvnw verify`, frontend lint + test +
  build, alongside the existing guardrails workflow.

## 11. Local development

- `docker compose up`: app on `localhost:4200` (nginx serves Angular and proxies
  `/api` to Spring), Mailpit UI on `localhost:8025`, PostgreSQL on `5432`.
- Day-to-day: Postgres and Mailpit from compose, `./mvnw spring-boot:run` and
  `ng serve` with a proxy config.
- Configuration through environment variables documented in `.env.example`:
  `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SMTP_HOST`,
  `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `MAIL_FROM`, `APP_BASE_URL`,
  database URL and credentials.
