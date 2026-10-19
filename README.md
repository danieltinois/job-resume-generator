# resume-tailor

One profile, many job descriptions, one tailored PDF resume for each.

You fill in your career once, in Portuguese and English. For every job you
paste, the app finds the skills the job asks for, suggests which experiences
and achievements to show and in which order, and renders an A4, ATS-friendly
PDF with [Typst](https://typst.app). You adjust the selection with a live
preview and save the resume. The text always comes from your profile: the app
selects and orders, it never writes facts for you.

```
profile (PT + EN) + job description -> matching -> selection -> Typst -> resume.pdf
```

## Run it

Requirements: Docker with Compose.

```bash
cp .env.example .env          # then set JWT_SECRET to a long random string
docker compose up --build
```

| What | URL |
|---|---|
| The app | http://localhost:4200 |
| Emails sent by the app (Mailpit) | http://localhost:8025 |
| API docs (Swagger UI) | http://localhost:4200/swagger-ui.html |

Create an account, open the confirmation link from Mailpit, sign in and fill in
your profile (or import a `profile.yaml`, below). Then add a job under
**New job** and review the suggested resume.

nginx serves the app and proxies the API, so the browser sees a single origin.
The backend is not published on the host.

## Your data

- The profile is stored per user in PostgreSQL. Every free-text field has a
  Portuguese and an English version; Portuguese is required and English falls
  back to it, with a warning on the review screen.
- Experiences, achievements and projects get a stable id when they are
  created. Editing their text never changes the id, so saved resumes keep
  pointing at the same facts.
- **Import:** the profile screen imports a `profile.yaml` in the format of the
  former command line tool (see `profile/profile.example.yaml`, fictional). You
  choose whether its text is Portuguese or English. **Export JSON** downloads
  the whole profile.
- Real profiles and generated resumes never belong in git:
  `profile/profile.yaml` and `output/` are ignored.

## Development without Docker for the apps

Requirements: Java 21, Node 22.23.3 (`.nvmrc`), Docker for PostgreSQL and
Mailpit, and Typst 0.15.0 on `PATH`.

```bash
docker compose up -d postgres mailpit
cp .env.example .env                          # then edit JWT_SECRET
set -a && . ./.env && set +a
(cd backend && ./mvnw spring-boot:run)        # API on http://localhost:8080
(cd frontend && npm ci && npm start)          # app on http://localhost:4200
```

`npm start` proxies `/api`, the OAuth2 paths and the API docs to the backend on
port 8080, like nginx does in Compose.

### API types

The frontend's API types are generated from `docs/api/openapi.json`, which a
backend test keeps in sync with the code. After an API change:

```bash
cd backend && ./mvnw test -Dtest=OpenApiSnapshotTest -DupdateSnapshot=true
cd ../frontend && npm run api:types
```

## Tests

| Area | Command |
|---|---|
| Backend | `cd backend && ./mvnw verify` (Docker running: integration tests use Testcontainers) |
| Frontend | `cd frontend && npm run lint && npm test -- --watch=false && npm run build` |
| Full stack | `scripts/smoke.sh` (builds, starts, checks and stops Compose) |
| End to end | `cd frontend && npx playwright install chromium && npm run e2e` (with `docker compose up` running) |

The end-to-end test registers an account, confirms it through Mailpit, imports
`profile/profile.example.yaml`, analyzes `jobs/example.md`, saves the resume
and downloads the PDF.

## Sign in with Google (optional)

Without Google credentials the app offers email and password only.

1. In the Google Cloud console, create an OAuth client of type *Web
   application*.
2. Add the authorized redirect URI `http://localhost:4200/login/oauth2/code/google`
   (use your public URL in production).
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env` and restart.

## Production notes

- Serve the app over HTTPS and set `COOKIE_SECURE=true` (the refresh token
  cookie is `Secure` only then).
- Set `APP_BASE_URL` to the public URL: it goes into the email links.
- Set `API_DOCS_ENABLED=false` to turn off Swagger UI and `/v3/api-docs`.
- Use a real SMTP server (`SMTP_*`, `MAIL_FROM`) instead of Mailpit.
- The bundled nginx expects to be the edge: it passes the connection's address
  as the client address. Behind another load balancer, configure nginx's
  `real_ip` module for it, or the login rate limit counts the balancer.

## The template

`backend/src/main/resources/typst/resume.typ`, with its fonts next to it, is the
only presentation code. Two Typst behaviours to know before editing it, both of
which have already broken it once:

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

Matching goes through the `MatchingStrategy` interface in the backend's
`matching` package. An AI matcher is a new implementation that reads the job
and returns the same result; nothing downstream changes. It may select, order
and, in a future pass, reword. It may **never** invent a company, role,
technology, metric or achievement: the resume assembler only copies text from
the profile by id and rejects unknown ids.

## Contributing

Read `AGENTS.md` first: git flow, Conventional Commits and the guardrail hooks
(`git config core.hooksPath .githooks`).
