# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-19

The command line tool becomes a web application: a Spring Boot API and an
Angular UI, run together with Docker Compose.

### Added

- **Accounts:**
  - Registration with email verification.
  - Password sign-in and password reset.
  - Optional Google sign-in, with safe account linking.
  - Short-lived access tokens kept in memory, and rotating refresh tokens in an `HttpOnly` cookie.
  - Rate limits on sign-in and on account emails.
- **Profile editor:**
  - Bilingual (PT-BR and EN) fields, with a count of missing English per section.
  - Drag-and-drop with move up/down buttons.
  - Autosave with conflict handling across tabs.
  - Pending edits are saved before leaving the page.
  - Import of the former CLI's `profile.yaml` and JSON export.
- **Jobs:** paste a job description, in Portuguese or English, to get the matched and missing skills and a suggested selection of experiences, achievements, projects and skill order.
- **Resume review:**
  - Adjust the selection with a live PDF preview.
  - Switch the resume language.
  - Save the resume and download it again later from the dashboard.
- **PDFs:** rendered with Typst 0.15 from a bundled template and fonts. Text is copied from the profile by stable ids and never generated.
- **API:** documented with OpenAPI 3.1 and Swagger UI. `docs/api/openapi.json` is the committed contract the frontend types are generated from.
- **Interface:** in Portuguese and English, switchable at runtime.
- **Delivery:**
  - Container images for the backend and the frontend.
  - nginx serves the app and proxies the API on one origin, with security headers and a Content-Security-Policy.
  - `docker compose up --build` runs the whole product with PostgreSQL and Mailpit.
- **Checks:** CI runs backend tests (Testcontainers), frontend lint, tests and build, a full-stack smoke test, Playwright end-to-end tests and repository guardrails.

### Removed

- **Breaking:** the Python command line tool (`resume_tailor/`), its tests and its copy of the template. Existing `profile.yaml` files can be imported from the profile screen.

[1.0.0]: https://github.com/danieltinois/job-resume-generator/releases/tag/v1.0.0
