# Backend API Implementation Plan (Plan 2 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put persistence, authentication and the REST API from the spec on top of the Plan 1 engine, so the whole product works over HTTP for many users.

**Architecture:** PostgreSQL through Spring `JdbcClient` (profile, selection and snapshot as JSONB text), Flyway migrations, stateless Spring Security with HS256 JWT access tokens and rotated opaque refresh tokens in an HttpOnly cookie, Google sign-in through Spring OAuth2 Client, RFC 7807 errors. Feature packages from Plan 1 gain a repository and a controller each; `auth` is new.

**Tech Stack:** Spring Boot 4.1.1 starters (`webmvc`, `jdbc`, `flyway`, `security`, `security-oauth2-resource-server`, `security-oauth2-client`, `mail`, `validation`), `org.flywaydb:flyway-database-postgresql`, `org.postgresql:postgresql`, `com.bucket4j:bucket4j_jdk17-core:8.21.0`; tests: `spring-boot-starter-webmvc-test`, `spring-boot-testcontainers`, `org.testcontainers:testcontainers-postgresql` (2.x), image `postgres:17-alpine`.

**Spec:** `docs/superpowers/specs/2026-10-19-spring-angular-migration-design.md` (§3 data model, §4 auth, §5 API, §9 errors). Plan 1: `docs/superpowers/plans/2026-10-19-backend-core.md`.

## Global Constraints

- Everything from Plan 1's Global Constraints still holds.
- Persistence uses `JdbcClient`, not JPA. **Deviation from the brainstorm** ("JPA"): the spec stores the core data as JSONB documents, and Plan 1 already maps them with Jackson; JPA would add entity mapping and a second JSON mapper for no gain.
- Flyway migrations live in `backend/src/main/resources/db/migration`, `V<n>__<name>.sql`; never edit one after it is merged into `develop`.
- Every query on user data takes the authenticated `userId`; another user's id returns **404**.
- Emails are stored and compared lowercased and trimmed.
- Access token: JWT HS256, 15 minutes, subject = user id, secret from `JWT_SECRET` (at least 32 bytes; startup fails otherwise).
- Refresh token: 32 random bytes, base64url; only its SHA-256 hex is stored; cookie `refresh_token`, `HttpOnly; SameSite=Strict; Path=/api/auth; Max-Age=2592000`, `Secure` unless `app.cookie-secure=false` (dev only).
- Verification token valid 24 h; reset token valid 1 h; both single-use and stored hashed.
- Passwords: BCrypt, 8 to 128 characters.
- Login rate limit: 5 attempts per minute per `ip + email`, then 429.
- Errors: `ProblemDetail`; validation errors carry `errors: [{path, message}]`; 500s carry a generic message only.
- Never log profile contents, job text, emails, tokens or passwords (AGENTS.md §8).

## Review Focus

1. **The same email with different case or spaces** (`Alex@Example.com ` vs `alex@example.com`) → one account: registration returns 409, login works with either form.
2. **A refresh token replayed after rotation** → the replay gets 401 and the whole token family is revoked, so the legitimate holder's newer token also stops working.
3. **Two tabs saving the profile with the same version** → the first wins, the second gets 409 and nothing is lost silently.
4. **Another user's job, resume or analysis id** → 404 with no data, on every endpoint that takes an id.
5. **Login probing**: unknown email, wrong password and Google-only account (no password) all return the same 401 message; "email not verified" (403) appears only after a correct password.

Each has a test in its owning task (marked *Review Focus*).

---

### Task 1: Persistence foundation and tech terms from the database

**Files:**
- Modify: `backend/pom.xml` (dependencies above)
- Create: `docker-compose.yml` (services `postgres` = `postgres:17-alpine` with db/user/password `resume`, port 5432, named volume; `mailpit` = `axllent/mailpit`, ports 1025 and 8025)
- Modify: `backend/src/main/resources/application.yml` (datasource from `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` with local defaults matching compose)
- Create: `backend/src/main/resources/db/migration/V1__schema.sql`, `V2__tech_terms_seed.sql`
- Create: `backend/src/main/java/.../matching/JdbcTechTermCatalog.java`
- Delete: `backend/src/main/java/.../matching/MatchingConfiguration.java`
- Create: `backend/src/test/java/.../IntegrationTest.java` (abstract base: `@SpringBootTest`, `@AutoConfigureMockMvc`, a static `PostgreSQLContainer` with `@ServiceConnection`, `JWT_SECRET` test value, `app.cookie-secure=false`; truncates user tables before each test)
- Test: `backend/src/test/java/.../matching/JdbcTechTermCatalogTest.java`, `.../MigrationsTest.java`

**Interfaces:**
- Produces:
  - Schema (V1), all ids `uuid` with `gen_random_uuid()` defaults, timestamps `timestamptz default now()`:
    - `users(id, email text unique not null, password_hash text, google_sub text unique, name text not null, email_verified boolean not null default false, created_at)`
    - `auth_tokens(token_hash text primary key, user_id uuid not null references users on delete cascade, type text not null check (type in ('VERIFY_EMAIL','RESET_PASSWORD','REFRESH')), family uuid, expires_at timestamptz not null, used_at timestamptz, created_at)`
    - `profiles(user_id uuid primary key references users on delete cascade, data jsonb not null, version int not null, updated_at)`
    - `jobs(id, user_id uuid not null references users on delete cascade, title text, company text, description text not null, language text not null, created_at)` + index on `(user_id, created_at desc)`
    - `resumes(id, user_id uuid not null references users on delete cascade, job_id uuid not null references jobs on delete cascade, language text not null, selection jsonb not null, snapshot jsonb not null, created_at)` + index on `(user_id, job_id)`
    - `tech_terms(id serial primary key, canonical text unique not null, aliases text[] not null default '{}')`
  - V2 inserts exactly the 52 canonicals and the aliases of `InMemoryTechTermCatalog.defaults()`.
  - `JdbcTechTermCatalog(JdbcClient)`: a `@Component` implementing `TechTermCatalog`, loads all rows once at construction, ordered by `id`.

- [ ] **Step 1:** Add dependencies; write `docker-compose.yml`, `application.yml` datasource, the `IntegrationTest` base.
- [ ] **Step 2: Write failing tests:**
  - `MigrationsTest.allTablesExist`: `information_schema.tables` contains the six tables.
  - `JdbcTechTermCatalogTest.matchesBuiltInDefaults`: `catalog.all()` equals `InMemoryTechTermCatalog.defaults().all()` (same order, same aliases).
  - `JdbcTechTermCatalogTest.isTheApplicationCatalog`: the `TechTermCatalog` bean is a `JdbcTechTermCatalog` and `formsOf("k8s")` contains `kubernetes`.
- [ ] **Step 3:** Run `cd backend && ./mvnw -q test -Dtest='MigrationsTest,JdbcTechTermCatalogTest'`. Expected: FAIL.
- [ ] **Step 4:** Write V1, V2, `JdbcTechTermCatalog`; delete `MatchingConfiguration`.
- [ ] **Step 5:** Run again, then `./mvnw -q verify`. Expected: PASS, whole suite green (Docker must be running).
- [ ] **Step 6:** Commit: `feat(backend): add PostgreSQL schema and database-backed tech terms`.

---

### Task 2: Users, JWT and the security skeleton

**Files:**
- Create in `backend/src/main/java/.../`:
  - `auth/User.java`, `auth/UserRepository.java`, `auth/JwtService.java`, `auth/AuthProperties.java`, `auth/MeController.java`
  - `common/SecurityConfig.java`, `common/ApiExceptionHandler.java`, `common/NotFoundException.java`, `common/CurrentUser.java`
- Modify: `application.yml` (`app.jwt-secret: ${JWT_SECRET:}`, `app.base-url: ${APP_BASE_URL:http://localhost:4200}`, `app.cookie-secure: ${COOKIE_SECURE:true}`)
- Test: `backend/src/test/java/.../auth/JwtServiceTest.java`, `.../auth/MeControllerTest.java`, `.../common/ApiExceptionHandlerTest.java`

**Interfaces:**
- Produces:
  - `record User(UUID id, String email, String passwordHash, String googleSub, String name, boolean emailVerified)`
  - `UserRepository`: `Optional<User> findByEmail(String email)` (normalizes), `Optional<User> findById(UUID)`, `Optional<User> findByGoogleSub(String)`, `User create(String email, String passwordHash, String name, boolean verified)`, `void markVerified(UUID)`, `void setPassword(UUID, String hash)`, `void linkGoogle(UUID, String sub)`; `static String normalizeEmail(String)`.
  - `@ConfigurationProperties("app") record AuthProperties(String jwtSecret, String baseUrl, boolean cookieSecure)`; startup fails with a clear message when `jwtSecret` is shorter than 32 bytes.
  - `JwtService`: `String issue(UUID userId)` (15 min, HS256 via `NimbusJwtEncoder`), and a `JwtDecoder` bean used by the resource server.
  - `CurrentUser.id(Authentication) → UUID` (from the JWT subject).
  - `SecurityConfig`: stateless, CSRF off for `/api/**`, public: `POST /api/auth/**` and `GET /api/auth/providers`, `/oauth2/**`, `/login/oauth2/**`; everything else under `/api` authenticated; 401 as `ProblemDetail`.
  - `GET /api/me` → `{id, email, name, emailVerified, hasPassword, hasGoogle}`.
  - `ApiExceptionHandler` (`@RestControllerAdvice`): `NotFoundException` → 404; `HttpMessageNotReadableException` → 400; `MethodArgumentNotValidException` → 422 with `errors`; any other exception → 500 with detail "Unexpected error" (logged with stack trace).

- [ ] **Step 1: Write failing tests:**
  - `JwtServiceTest.issuedTokenDecodesToUser`; `expiredTokenIsRejected` (issue with a clock 16 minutes in the past); `shortSecretFailsStartup` (`AuthProperties` with a 10-byte secret → `IllegalStateException`).
  - `MeControllerTest` (extends `IntegrationTest`): `meWithoutTokenIs401ProblemDetail` (content type `application/problem+json`); `meReturnsCurrentUser`; `tokenForDeletedUserIs401`.
  - `ApiExceptionHandlerTest.malformedJsonIs400` (PUT `/api/profile` with `{` once Task 7 exists — until then a test-only controller registered in the test's `@TestConfiguration`).
- [ ] **Step 2:** Run `./mvnw -q test -Dtest='JwtServiceTest,MeControllerTest,ApiExceptionHandlerTest'`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run again. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(auth): add users, JWT access tokens and the security skeleton`.

---

### Task 3: Registration, email verification and login

**Files:**
- Create: `auth/AuthController.java`, `auth/AuthService.java`, `auth/TokenStore.java`, `auth/AccountMailer.java`, `auth/SmtpAccountMailer.java`, `auth/LoginRateLimiter.java`, `auth/RefreshCookies.java`
- Modify: `application.yml` (`spring.mail.*` from `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, defaults `localhost:1025`; `app.mail-from: ${MAIL_FROM:no-reply@localhost}`)
- Test: `auth/RegistrationTest.java`, `auth/LoginTest.java`, test helper `auth/RecordingMailer.java` (`@TestConfiguration` primary `AccountMailer` that stores sent links)

**Interfaces:**
- Produces:
  - `TokenStore`: `String issue(UUID userId, TokenType type, Duration ttl, UUID family)` → raw token (stores the hash); `Optional<StoredToken> consume(String raw, TokenType type)` (marks used, returns the row only if unused and unexpired); `enum TokenType { VERIFY_EMAIL, RESET_PASSWORD, REFRESH }`; `record StoredToken(UUID userId, UUID family, Instant usedAt, Instant expiresAt)`. Task 4 adds family operations.
  - `AccountMailer`: `void sendVerification(String email, String link)`, `void sendPasswordReset(String email, String link)`. Links: `{baseUrl}/verify-email?token=…`, `{baseUrl}/reset-password?token=…`. Plain-text bodies in PT and EN in the same email.
  - `RefreshCookies`: `ResponseCookie issue(String raw)`, `ResponseCookie clear()` — values from the Global Constraints.
  - Endpoints:
    - `POST /api/auth/register {email, password, name}` → 201, sends verification; 409 if the email exists; 422 on invalid fields.
    - `POST /api/auth/verify-email {token}` → 204; 400 `"Invalid or expired link"` otherwise.
    - `POST /api/auth/resend-verification {email}` → always 204 (no enumeration).
    - `POST /api/auth/login {email, password}` → 200 `{accessToken}` + refresh cookie; 401 `"Invalid email or password"`; 403 `"Email not verified"` only after a correct password; 429 when rate-limited.

- [ ] **Step 1: Write failing tests:**
  - `RegistrationTest`: `registerSendsVerificationLink`; `verifyLinkMarksEmailVerified`; `verifyLinkIsSingleUse` (second use → 400); `expiredVerificationLinkIsRejected` (row's `expires_at` set to the past); `duplicateEmailIsCaseAndSpaceInsensitive` (*Review Focus 1*: `Alex@Example.com ` after `alex@example.com` → 409); `weakPasswordIs422` (7 chars, path `password`); `resendVerificationNeverRevealsAccounts` (unknown email → 204, no mail).
  - `LoginTest`: `loginReturnsAccessTokenAndRefreshCookie` (cookie flags `HttpOnly`, `SameSite=Strict`, `Path=/api/auth`); `loginWorksWithDifferentEmailCase` (*Review Focus 1*); `failuresLookIdentical` (*Review Focus 5*: unknown email, wrong password, Google-only user → same 401 body); `unverifiedOnlyRevealedAfterCorrectPassword` (*Review Focus 5*: wrong password on unverified → 401, right password → 403); `sixthAttemptInAMinuteIs429`.
- [ ] **Step 2:** Run `./mvnw -q test -Dtest='RegistrationTest,LoginTest'`. Expected: FAIL.
- [ ] **Step 3:** Implement (Bucket4j `Bucket` per key in a `ConcurrentHashMap`, 5 tokens refilled greedily per minute; client IP from `request.getRemoteAddr()`).
- [ ] **Step 4:** Run again. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(auth): add registration, email verification and password login`.

---

### Task 4: Refresh rotation, reuse detection and logout

**Files:**
- Modify: `auth/TokenStore.java`, `auth/AuthController.java`, `auth/AuthService.java`
- Test: `auth/RefreshTest.java`

**Interfaces:**
- Consumes: Task 3 `TokenStore`, `RefreshCookies`.
- Produces:
  - `TokenStore`: `void revokeFamily(UUID family)` (sets `used_at` on every unused token of the family), `Optional<StoredToken> find(String raw, TokenType type)` (no side effects).
  - Login starts a new family; each refresh issues the next token in the same family.
  - `POST /api/auth/refresh` (cookie) → 200 `{accessToken}` + new cookie; 401 + cleared cookie when missing, unknown, expired or reused. **Reuse** (token found with `used_at` set) → `revokeFamily`.
  - `POST /api/auth/logout` → 204 + cleared cookie; revokes the family of the presented token if any.

- [ ] **Step 1: Write failing tests:** `refreshRotatesToken` (new cookie differs, old one now rejected); `replayedTokenRevokesFamily` (*Review Focus 2*: refresh with A → B; refresh with A again → 401; refresh with B → 401); `expiredRefreshIs401`; `missingCookieIs401`; `logoutRevokesAndClearsCookie` (refresh after logout → 401; `Max-Age=0`).
- [ ] **Step 2:** Run `./mvnw -q test -Dtest=RefreshTest`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run again. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(auth): rotate refresh tokens and revoke a family on reuse`.

---

### Task 5: Password reset

**Files:**
- Modify: `auth/AuthController.java`, `auth/AuthService.java`
- Test: `auth/PasswordResetTest.java`

**Interfaces:**
- Produces:
  - `POST /api/auth/forgot-password {email}` → always 204; sends a reset link only when the account exists (Google-only accounts included, so they can add a password).
  - `POST /api/auth/reset-password {token, password}` → 204; sets the password, marks the email verified, revokes every refresh token of the user; 400 `"Invalid or expired link"`; 422 on a weak password.

- [ ] **Step 1: Write failing tests:** `forgotPasswordNeverRevealsAccounts`; `resetChangesPasswordAndLogsOutEverywhere` (old refresh cookie → 401 afterwards; login with the new password works); `resetLinkIsSingleUse`; `resetLinkExpiresAfterOneHour`; `googleOnlyAccountCanAddPassword`.
- [ ] **Step 2:** Run `./mvnw -q test -Dtest=PasswordResetTest`. Expected: FAIL.
- [ ] **Step 3:** Implement (add `TokenStore.revokeAll(UUID userId, TokenType type)`).
- [ ] **Step 4:** Run again. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(auth): add password reset`.

---

### Task 6: Google sign-in

**Files:**
- Create: `auth/GoogleAccountLinker.java`, `auth/GoogleLoginSuccessHandler.java`, `auth/ProvidersController.java`
- Modify: `common/SecurityConfig.java` (enable `oauth2Login` only when a `ClientRegistrationRepository` bean exists), `application.yml` (`spring.security.oauth2.client.registration.google.client-id/secret` from `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, scopes `openid,email,profile`, only active when the id is set — via a profile-less `@ConditionalOnProperty` on the registration config)
- Test: `auth/GoogleAccountLinkerTest.java`, `auth/GoogleLoginSuccessHandlerTest.java`, `auth/ProvidersControllerTest.java`

**Interfaces:**
- Produces:
  - `GoogleAccountLinker.link(String sub, String email, boolean emailVerified, String name) → User`: known `sub` → that user; else verified email matching an account → `linkGoogle` and mark verified; else create a verified account without password. An unverified Google email never links to an existing account (creates nothing; throws `OAuth2AuthenticationException`).
  - `GoogleLoginSuccessHandler`: on success, links, starts a refresh family, sets the cookie, redirects to `{baseUrl}/auth/callback`.
  - `GET /api/auth/providers` → `{google: boolean}`.

- [ ] **Step 1: Write failing tests:**
  - `GoogleAccountLinkerTest`: `knownSubSignsIn`; `verifiedEmailLinksExistingAccount` (a **verified** password account keeps its password, gains `google_sub`); `unverifiedPasswordAccountLosesItsPasswordWhenGoogleClaimsTheEmail` (pre-hijacking: the password and all pending tokens of an unverified account are discarded — added after the final review); `newGoogleUserIsCreatedVerified`; `unverifiedGoogleEmailDoesNotTakeOverAccount`.
  - `GoogleLoginSuccessHandlerTest`: invoke the handler with an `OAuth2AuthenticationToken` built from an `OidcUser` → 302 to `{baseUrl}/auth/callback`, refresh cookie set, and that cookie works on `/api/auth/refresh`.
  - `ProvidersControllerTest`: `googleDisabledWithoutCredentials` → `{google: false}`; with properties set in a nested `@SpringBootTest(properties=…)` → `{google: true}`.
- [ ] **Step 2:** Run `./mvnw -q test -Dtest='Google*Test,ProvidersControllerTest'`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run again. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(auth): add Google sign-in with account linking`.

---

### Task 7: Profile API

**Files:**
- Create: `profile/ProfileRepository.java`, `profile/ProfileController.java`, `profile/ProfileValidationException.java`, `profile/VersionConflictException.java`
- Modify: `common/ApiExceptionHandler.java` (422 with `errors` for `ProfileValidationException`; 409 for `VersionConflictException`)
- Test: `profile/ProfileApiTest.java`

**Interfaces:**
- Consumes: `Profile`, `ProfileValidator`, `LegacyProfileConverter` (Plan 1).
- Produces:
  - `record StoredProfile(int version, Profile data)`.
  - `ProfileRepository`: `Optional<StoredProfile> find(UUID userId)`; `int save(UUID userId, int expectedVersion, Profile data)` → new version; throws `VersionConflictException` when the stored version differs (insert when `expectedVersion == 0` and no row; `UPDATE … WHERE version = ?` otherwise).
  - `GET /api/profile` → `{version, data}`; a new user gets `{version: 0, data: <empty skeleton with personal.name = user name>}`.
  - `PUT /api/profile {version, data}` → 200 `{version}`; 409 on conflict; 422 with `errors` from `ProfileValidator`.
  - `POST /api/profile/import` multipart `file` (≤ 256 KB) + `language=pt|en` → 200 converted profile (not saved); 422 on invalid YAML with its message.
  - `GET /api/profile/export` → JSON body, `Content-Disposition: attachment; filename="profile.json"`.

- [ ] **Step 1: Write failing tests:** `newUserGetsEmptySkeleton`; `saveThenLoadRoundTrips` (fixture `profile-example.json`); `staleVersionIs409` (*Review Focus 3*: two PUTs with version 1 → second 409, stored data is the first's); `invalidProfileIs422WithPaths` (duplicate achievement id → `errors[0].path`); `importConvertsLegacyYaml` (fixture `legacy-profile.yaml`, `language=en`); `importRejectsInvalidYaml`; `exportIsDownloadable`; `profilesAreIsolatedPerUser`.
- [ ] **Step 2:** Run `./mvnw -q test -Dtest=ProfileApiTest`. Expected: FAIL.
- [ ] **Step 3:** Implement (JSON via the application `JsonMapper`; `?::jsonb` casts).
- [ ] **Step 4:** Run again. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(profile): add profile API with optimistic locking and YAML import`.

---

### Task 8: Jobs API and analysis

**Files:**
- Create: `job/JobRepository.java`, `job/JobController.java`, `job/StoredJob.java`, `matching/AnalysisController.java`
- Test: `job/JobApiTest.java`, `matching/AnalysisApiTest.java`

**Interfaces:**
- Consumes: `JobParser`, `MatchingStrategy`, `SelectionSuggester`, `ResumeAssembler` (warnings only), `ProfileRepository`.
- Produces:
  - `record StoredJob(UUID id, String title, String company, Language language, String description, Instant createdAt)`.
  - `POST /api/jobs {description}` (1 to 50 000 chars, else 422) → 201 `StoredJob` with parsed title/company/language.
  - `GET /api/jobs` → list without `description`, newest first; `GET /api/jobs/{id}` → full; `DELETE /api/jobs/{id}` → 204 (cascades to resumes).
  - `GET /api/jobs/{id}/analysis?lang=pt|en` (default: the job's language) → `{language, matchedSkills, missingSkills, scores, suggestion: Selection, warnings}`; `warnings` from assembling the suggestion; a user without a profile gets an empty suggestion.

- [ ] **Step 1: Write failing tests:**
  - `JobApiTest`: `createParsesTitleCompanyAndLanguage` (fixture `job-example.md`); `emptyOrHugeDescriptionIs422`; `listIsNewestFirstWithoutDescription`; `deleteCascadesToResumes`; `otherUsersJobIs404` (*Review Focus 4*: GET, DELETE).
  - `AnalysisApiTest`: `analysisSuggestsSelection` (example profile + example job → `matchedSkills` contains `Kafka`, suggestion experience order starts with `exp_0000000a`); `langOverridesJobLanguage` (`lang=pt` → `language: "PT"`); `missingEnglishProducesWarnings`; `otherUsersJobAnalysisIs404` (*Review Focus 4*).
- [ ] **Step 2:** Run `./mvnw -q test -Dtest='JobApiTest,AnalysisApiTest'`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run again. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(job): add jobs API and match analysis`.

---

### Task 9: Resumes API

**Files:**
- Create: `resume/ResumeRepository.java`, `resume/ResumeController.java`, `resume/ResumeRequest.java`
- Modify: `common/ApiExceptionHandler.java` (`UnknownSelectionIdException` → 422 with `errors: [{path: "selection", message}]`; `RenderException` → 500 generic)
- Test: `resume/ResumeApiTest.java`

**Interfaces:**
- Produces:
  - `record ResumeRequest(UUID jobId, Language language, Selection selection)` (all required → 422).
  - `POST /api/resumes/preview` → `application/pdf`, nothing stored.
  - `POST /api/resumes` → 201 `{id, warnings}`; stores selection and the `ResumeDocument` snapshot.
  - `GET /api/resumes?jobId=` → `[{id, jobId, language, createdAt}]` newest first; `GET /api/resumes/{id}/pdf` → renders the **snapshot** (`Content-Disposition: attachment; filename="resume-<lang>.pdf"`); `DELETE /api/resumes/{id}` → 204.

- [ ] **Step 1: Write failing tests:** `previewReturnsPdf`; `previewWithUnknownIdIs422`; `saveFreezesSnapshot` (save, then change the achievement text in the profile, then `GET …/pdf` still contains the old text); `listFiltersByJob`; `otherUsersResumeIs404` (*Review Focus 4*: `GET …/pdf`, `DELETE`, and `POST /preview` with another user's `jobId`); `renderFailureIsGeneric500` (renderer bean with a missing binary via `@TestPropertySource(properties = "resume.typst.binary=typst-missing")` → 500, body has no path or stderr).
- [ ] **Step 2:** Run `./mvnw -q test -Dtest=ResumeApiTest`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run again. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(resume): add resume preview, save, history and download API`.

---

### Task 10: Plan 1 follow-ups made reachable by the API

Selections and profiles now arrive from clients, so the minors deferred in Plan 1 become reachable.

**Files:**
- Modify: `resume/ResumeAssembler.java`, `resume/Periods.java`, `resume/TypstRenderer.java`, `matching/TextNormalizer.java`, `profile/ProfileValidator.java`
- Test: existing test classes of those files

**Interfaces:** no signature changes.

- [ ] **Step 1: Write failing tests:**
  - `ResumeAssemblerTest.duplicateIdsAreRejected`: `experienceOrder [a, a]`, duplicate achievement id, duplicate project id, duplicate skill → `UnknownSelectionIdException` naming the duplicate.
  - `PeriodsTest.invalidMonthIsShownAsWritten`: `"2023-13"` → `"2023-13 – Present"`, no exception.
  - `ProfileApiTest.nullListElementIs422` (`"skills": ["Java", null]` → 422 with path `skillCategories[0].skills[1]`), implemented by making the compact constructors keep nulls out via the validator rather than `List.copyOf` NPEs (records use `Collections.unmodifiableList(new ArrayList<>(…))`, validator reports null elements).
  - `TextNormalizerTest.containsTermReusesCompiledPatterns`: calling `containsTerm` twice with the same term returns the same cached `Pattern` instance (package-private `pattern(String)` accessor).
- [ ] **Step 2:** Run the four test classes. Expected: FAIL.
- [ ] **Step 3:** Implement; `TypstRenderer` also waits up to 5 s for a killed process before deleting its directory on interrupt.
- [ ] **Step 4:** Run `./mvnw -q verify`. Expected: whole suite PASS.
- [ ] **Step 5:** Commit: `fix(backend): close Plan 1 gaps that client input can now reach`.

---

### Task 11: Configuration docs and local run

**Files:**
- Create: `.env.example` (every variable from the spec §11 plus `COOKIE_SECURE`, `DATABASE_*`; fake values only)
- Modify: `README.md` (new "Backend (in progress)" section: `docker compose up -d postgres mailpit`, `cd backend && JWT_SECRET=… COOKIE_SECURE=false ./mvnw spring-boot:run`, Mailpit at `localhost:8025`; the Python CLI section stays until Plan 3)
- Modify: `.github/workflows/backend.yml` (nothing to add if Testcontainers runs on `ubuntu-latest`; verify in CI)

- [ ] **Step 1:** Write the files.
- [ ] **Step 2:** Smoke test: start compose + backend; `curl` register → read the link in Mailpit's API (`GET localhost:8025/api/v1/messages`) → verify → login → `GET /api/me` → 200. Record the commands and outputs in the PR description.
- [ ] **Step 3:** Commit: `docs: document backend configuration and local run`.

## Finishing

- [ ] Push `feature/backend-api`, confirm `backend` and `guardrails` are green, then ask the owner whether to open the PR to `develop`.
