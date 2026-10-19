# Backend Core Implementation Plan (Plan 1 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the resume engine (profile model, matching, selection, assembly, Typst PDF) from Python to a Spring Boot module, with the spec's improvements, reaching parity with the CLI as a tested Java library.

**Architecture:** A Maven module in `backend/` with plain Java domain code (records + small services) and no HTTP or database yet. `MatchingStrategy` produces a `MatchResult` with a suggested `Selection`; `ResumeAssembler` copies profile text by id into a `ResumeDocument`; `TypstRenderer` turns that into PDF bytes. Plans 2 and 3 put the API, persistence, auth and Angular UI on top without changing these contracts.

**Tech Stack:** Java 21, Spring Boot 4.1.1 (Jackson 3, `tools.jackson.*`), Maven wrapper, JUnit 5, AssertJ, Apache PDFBox 3.0.8 (tests), Typst 0.15.0 CLI, Carlito font (OFL).

**Spec:** `docs/superpowers/specs/2026-10-19-spring-angular-migration-design.md`

## Roadmap

| Plan | Scope | Ends with |
|---|---|---|
| **1 (this)** | Maven module, profile model + validation, YAML import conversion, normalization, tech terms, job parsing, lexical matching, suggestion, assembler, Typst renderer + bilingual template | `./mvnw verify` green; example profile + example job render a correct PDF in a test |
| 2 | PostgreSQL + Flyway (incl. `tech_terms` seed), users, email/password + Google auth, JWT + refresh rotation, mail, REST API from spec §5, ProblemDetail errors, Testcontainers | Full API usable with curl; integration tests green in CI |
| 3 | Angular app (auth, dashboard, profile editor, job review + preview), nginx, `docker-compose.yml`, `.env.example`, Playwright E2E, README rewrite, removal of `resume_tailor/`, `tests/`, `pyproject.toml`, `templates/` | `docker compose up` gives the working product |

Plans 2 and 3 are written after this one is merged, against the code as it then stands.

## Global Constraints

- Base package `io.github.danieltinois.resumetailor`; packages by feature: `profile`, `job`, `matching`, `resume`, `common`.
- Java 21, Spring Boot **4.1.1**. The spec says "Spring Boot 3": 3.x left open-source support in June 2026, so the current line is used; the spec is updated in Task 1.
- Typst **0.15.0**, pinned. Fonts bundled, never system fonts.
- Domain types are records; services use constructor injection; no field injection.
- Free text is `LocalizedText(pt, en)`; `pt` required, `en` optional; fallback to `pt` produces a warning, never an error.
- Ids: prefixes `exp_`, `ach_`, `prj_`, `edu_`, `cat_` + 8 lowercase hex chars; generated once, never derived from text.
- The assembler copies text verbatim by id; an unknown id throws `UnknownSelectionIdException`.
- Matching weights: requirement sections **2**, every other section **1**.
- Experiences: reverse chronological by default (`endDate` null = most recent, then `startDate` desc).
- Everything in the repository in English; commits as the owner, Conventional Commits, no attribution (see `AGENTS.md`).
- Python code stays untouched in this plan (removed in Plan 3).

## Review Focus

1. **Job text with Windows line endings or no headings at all** → sections still split (`\r\n` handled) and the whole text counts as one weight-1 section.
2. **A heading that is also a skill-bearing line** (`Requirements: Java, Kafka`) → the line counts as the start of the requirements section *and* its skills get weight 2.
3. **Profile with EN missing everywhere and `language=EN`** → PDF still renders, every fallback listed in `warnings`, no exception.
4. **Strings that are special in Typst** (`#`, `$`, `@`, `<`, `*`, `_` in bullets or URLs) → appear literally in the PDF, because data goes through JSON `--input`, never generated source.
5. **Concurrent renders beyond the semaphore limit** → callers wait, then succeed; temp directories are always deleted, including after a timeout.

Each of these has a test in the owning task (marked *Review Focus*).

---

### Task 1: Maven module skeleton and backend CI

**Files:**
- Create: `backend/pom.xml`, `backend/mvnw`, `backend/mvnw.cmd`, `backend/.mvn/wrapper/maven-wrapper.properties`
- Create: `backend/src/main/java/io/github/danieltinois/resumetailor/ResumeTailorApplication.java`
- Create: `backend/src/main/resources/application.yml`
- Create: `backend/src/test/java/io/github/danieltinois/resumetailor/ApplicationContextTest.java`
- Create: `.github/workflows/backend.yml`
- Modify: `.gitignore` (add `backend/target/`)
- Modify: `docs/superpowers/specs/2026-10-19-spring-angular-migration-design.md` (Spring Boot 3 → 4.1), `AGENTS.md` §6 (same)

**Interfaces:**
- Produces: Maven module with dependencies `spring-boot-starter`, `spring-boot-starter-validation`, `spring-boot-starter-json`, `org.yaml:snakeyaml`; test: `spring-boot-starter-test`, `org.apache.pdfbox:pdfbox:3.0.8`.

- [ ] **Step 1:** Generate the wrapper with `mvn -N wrapper:wrapper -Dmaven=3.9.11` inside `backend/`; write `pom.xml` with parent `spring-boot-starter-parent:4.1.1`, `java.version` 21, the dependencies above.
- [ ] **Step 2:** Write `ApplicationContextTest` (`@SpringBootTest`, `contextLoads()` with no body) and the `@SpringBootApplication` class.
- [ ] **Step 3:** Run `cd backend && ./mvnw -q verify`. Expected: `BUILD SUCCESS`, 1 test.
- [ ] **Step 4:** Write `.github/workflows/backend.yml`: on push and pull_request touching `backend/**` or the workflow; `actions/setup-java@v4` (temurin 21, cache maven); install Typst 0.15.0 by downloading `typst-x86_64-unknown-linux-musl.tar.xz` from the `v0.15.0` GitHub release into `$HOME/.local/bin` and adding it to `PATH`; run `./mvnw -B verify` in `backend/`.
- [ ] **Step 5:** Update spec and `AGENTS.md` to "Spring Boot 4.1".
- [ ] **Step 6:** Commit: `build(backend): add Spring Boot module skeleton and CI`.

---

### Task 2: Profile model, ids and validation

**Files:**
- Create in `backend/src/main/java/io/github/danieltinois/resumetailor/`:
  - `common/LocalizedText.java`
  - `common/Language.java`
  - `profile/Profile.java` (with nested records or sibling files: `Personal`, `SkillCategory`, `Experience`, `Achievement`, `Project`, `Education`, `LanguageSkill`)
  - `profile/Ids.java`
  - `profile/ProfileValidator.java`
  - `profile/ProfileViolation.java`
- Create: `backend/src/test/resources/fixtures/profile-example.json` (the fictional `profile/profile.example.yaml`, converted by hand: PT and EN texts, ids `exp_…`, `ach_…` etc.)
- Test: `backend/src/test/java/.../profile/ProfileValidatorTest.java`, `.../profile/ProfileJsonTest.java`, `.../common/LocalizedTextTest.java`

**Interfaces:**
- Produces:
  - `enum Language { PT, EN }`
  - `record LocalizedText(String pt, String en)` with `String in(Language lang)` (EN falls back to PT when `en` is null/blank) and `boolean missing(Language lang)`.
  - `record Profile(Personal personal, LocalizedText summary, List<SkillCategory> skillCategories, List<Experience> experiences, List<Project> projects, List<Education> education, List<LanguageSkill> languages)` with `List<String> allSkills()` (category order, deduplicated) and `Set<String> claimedSkills()` (categories + achievements + projects).
  - `record Personal(String name, LocalizedText title, String location, String email, String phone, String linkedin, String github)`
  - `record SkillCategory(String id, LocalizedText name, List<String> skills)`
  - `record Experience(String id, String company, LocalizedText role, String startDate, String endDate, List<Achievement> achievements)`
  - `record Achievement(String id, LocalizedText text, List<String> skills)`
  - `record Project(String id, String name, LocalizedText description, List<String> skills, String url)`
  - `record Education(String id, String institution, LocalizedText degree, String startDate, String endDate)`
  - `record LanguageSkill(LocalizedText name, LocalizedText level)`
  - `Ids.next(String prefix) → String` (`prefix + "_" + 8 hex chars` from `SecureRandom`)
  - `record ProfileViolation(String path, String message)`; `ProfileValidator.validate(Profile) → List<ProfileViolation>` (empty = valid). Paths use the spec's form `experiences[0].achievements[2].text.pt`.
  - Null lists deserialize as empty lists (compact constructors).

- [ ] **Step 1: Write failing tests** (ported from `tests/test_profile.py` + new):
  - `exampleFixtureIsValid`: loads `profile-example.json` with the Spring `JsonMapper`, `validate` returns empty.
  - `minimalProfileIsValid`: only `personal.name` and `personal.title.pt`.
  - `duplicateAchievementIdIsRejected`: two `ach_aaaaaaaa` → violation at `experiences[1].achievements[0].id`, message contains `duplicate`.
  - `missingPersonalNameIsRejected` → path `personal.name`.
  - `missingPtOnLocalizedFieldIsRejected`: achievement text `{pt: "", en: "x"}` → path `experiences[0].achievements[0].text.pt`.
  - `badDateIsRejected`: `startDate "2023/01"` → path `experiences[0].startDate`; `"2023-13"` also rejected; `"2023-02"` accepted; `endDate null` accepted.
  - `claimedSkillsIncludesEverySource`: categories + achievements + projects.
  - `allSkillsDeduplicatesAcrossCategories`.
  - `LocalizedTextTest`: `in(EN)` falls back to `pt` when `en` null or blank; `missing(EN)` true in those cases; `missing(PT)` false.
  - `ProfileJsonTest.roundTrip`: deserialize fixture, serialize, deserialize → equal records.
  - `idsHavePrefixAndEightHexChars`: `Ids.next("ach")` matches `ach_[0-9a-f]{8}`, two calls differ.
- [ ] **Step 2:** Run `./mvnw -q test -Dtest='Profile*Test,LocalizedTextTest'`. Expected: compilation failure.
- [ ] **Step 3:** Implement the records, `Ids`, `ProfileValidator` (walks the tree by hand; uniqueness checked per kind across the whole profile; dates must match `\d{4}-(0[1-9]|1[0-2])`).
- [ ] **Step 4:** Run the same command. Expected: all pass.
- [ ] **Step 5:** Commit: `feat(profile): add bilingual profile model with validation`.

---

### Task 3: Legacy `profile.yaml` conversion

**Files:**
- Create: `backend/src/main/java/.../profile/LegacyProfileConverter.java`
- Test: `backend/src/test/java/.../profile/LegacyProfileConverterTest.java`, fixture `backend/src/test/resources/fixtures/legacy-profile.yaml` (copy of `profile/profile.example.yaml`)

**Interfaces:**
- Consumes: Task 2 records, `Ids`.
- Produces: `LegacyProfileConverter.convert(String yaml, Language textLanguage) → Profile`. Throws `IllegalArgumentException` with a readable message on invalid YAML. Plan 2's `POST /profile/import` calls it.

- [ ] **Step 1: Write failing tests:**
  - `convertsExampleIntoValidProfile`: result passes `ProfileValidator`; 2 experiences, 6 achievements, 5 categories.
  - `freeTextGoesToChosenLanguage`: with `EN`, achievement `text.en` equals the YAML text and `text.pt` equals it too (PT is required, so the same text fills both, and the UI flags it for translation). With `PT`, `text.pt` is the YAML text and `en` is null.
  - `legacyIdsAreReplacedByGeneratedIds`: every achievement id matches `ach_[0-9a-f]{8}`.
  - `flatSkillsBecomeOneCategory`: YAML with only `skills: [Python, SQL]` → one category named `{pt: "Habilidades", en: "Skills"}` with those skills.
  - `invalidYamlFails`: `"a: [b"` → `IllegalArgumentException`.
- [ ] **Step 2:** Run `./mvnw -q test -Dtest=LegacyProfileConverterTest`. Expected: FAIL.
- [ ] **Step 3:** Implement with SnakeYAML `SafeConstructor` into `Map`s, then build records; snake_case keys (`start_date`, `skill_categories`).
- [ ] **Step 4:** Run again. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(profile): convert legacy profile.yaml into the bilingual model`.

---

### Task 4: Text normalization and skill forms

**Files:**
- Create: `backend/src/main/java/.../matching/TextNormalizer.java`
- Test: `backend/src/test/java/.../matching/TextNormalizerTest.java`

**Interfaces:**
- Produces (static methods):
  - `String normalize(String text)`: strip accents (NFD + remove combining marks), lowercase (`Locale.ROOT`), replace every run of chars outside `[a-z0-9+#./]` with a space, collapse spaces, trim. (`/` is kept so `CI/CD` survives; Python matched it because `/` became a space on both sides — keeping it is equivalent and simpler to reason about.)
  - `Set<String> variants(String skill)`: Python `variants()` rule: the last word, if alphabetic and length ≥ 3, gets its plural toggled (`s` removed if present, else added).
  - `boolean containsTerm(String normalizedText, String normalizedTerm)`: regex `(?<![a-z0-9])` + quoted term + `(?![a-z0-9])`.
  - `boolean appearsIn(String skill, String normalizedText)`: any variant contained.

- [ ] **Step 1: Write failing tests** (ported from `test_matcher.py` + new):
  - `normalizeLowercasesAndStripsPunctuation`: `"Python, REST APIs!"` → `"python rest apis"`.
  - `normalizeStripsAccents`: `"Automação e Integração"` → `"automacao e integracao"`.
  - `normalizeHandlesCrLf`: `"Java\r\nKafka"` → `"java kafka"`.
  - `variantsCoverPluralInBothDirections`: `"REST APIs"` → `{"rest apis","rest api"}`; `"REST API"` → `{"rest api","rest apis"}`; `"Kafka"` → `{"kafka","kafkas"}`; `"C#"` → `{"c#"}`.
  - `appearsInRespectsWordBoundaries`: `Python` not in `"we run pythonic services"`, in `"strong python team"`.
  - `appearsInHandlesPunctuationTokens`: `C++` in `"we write c++ daily"`; `CI/CD` in `"ci/cd pipelines"`; `Node.js` in `"node.js services"`; `Java` not in `"javascript"`.
  - `appearsInIgnoresAccentsOnBothSides`: skill `"Automação"` in normalized `"automacao de testes"`.
- [ ] **Step 2:** Run `./mvnw -q test -Dtest=TextNormalizerTest`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run again. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(matching): port text normalization with accent folding`.

---

### Task 5: Tech term catalog

**Files:**
- Create: `backend/src/main/java/.../matching/TechTerm.java`, `.../matching/TechTermCatalog.java`, `.../matching/InMemoryTechTermCatalog.java`
- Test: `backend/src/test/java/.../matching/InMemoryTechTermCatalogTest.java`

**Interfaces:**
- Produces:
  - `record TechTerm(String canonical, List<String> aliases)`
  - `interface TechTermCatalog { List<TechTerm> all(); }` with default method `Set<String> formsOf(String skill)`: if `skill` (normalized) equals a term's canonical or any alias, return canonical + all aliases (normalized); else `{normalize(skill)}`. Also default `String canonicalOf(String skill)` (canonical or the skill itself).
  - `InMemoryTechTermCatalog(List<TechTerm>)`. Plan 2 adds the JDBC implementation; tests and the Task 10 golden test use this one.
  - `InMemoryTechTermCatalog.defaults()`: the Python `KNOWN_TECH` list as canonicals, plus these aliases: PostgreSQL `postgres, psql`; Kubernetes `k8s`; JavaScript `js`; TypeScript `ts`; Node.js `nodejs, node`; REST API `restful, api rest, apis rest`; CI/CD `ci cd, continuous integration`; Machine Learning `ml, aprendizado de maquina`; Microservices `microsservicos, microservicos`; GCP `google cloud`; AWS `amazon web services`. Plan 2 copies this list into the Flyway seed.

- [ ] **Step 1: Write failing tests:**
  - `aliasResolvesToAllForms`: `formsOf("Postgres")` contains `postgresql`, `postgres`, `psql`.
  - `canonicalResolvesToAllForms`: `formsOf("PostgreSQL")` same set.
  - `unknownSkillIsItsOwnForm`: `formsOf("Typst")` = `{"typst"}`.
  - `canonicalOfAlias`: `canonicalOf("k8s")` = `"Kubernetes"`.
  - `defaultsContainEveryLegacyKnownTech`: all 52 Python `KNOWN_TECH` names present as canonicals.
- [ ] **Step 2:** Run `./mvnw -q test -Dtest=InMemoryTechTermCatalogTest`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run again. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(matching): add tech term catalog with aliases`.

---

### Task 6: Job parsing — sections, weights, language, title, company

**Files:**
- Create: `backend/src/main/java/.../job/JobText.java`, `.../job/JobSection.java`, `.../job/JobParser.java`, `.../job/LanguageDetector.java`
- Test: `backend/src/test/java/.../job/JobParserTest.java`, `.../job/LanguageDetectorTest.java`

**Interfaces:**
- Produces:
  - `record JobSection(int weight, String normalizedText)`
  - `record JobText(String title, String company, Language language, List<JobSection> sections)` with `int weightOf(Set<String> forms)`: the highest weight among sections containing any form (via `TextNormalizer.containsTerm`), 0 if none.
  - `JobParser.parse(String rawText) → JobText`.
  - `LanguageDetector.detect(String rawText) → Language`.
- Rules:
  - A **heading line** is a line that, trimmed and with leading `#`, `*`, `-` and trailing `:` removed, *starts with* one of the known headings (case/accent-insensitive). Requirement headings (weight 2): `requisitos`, `requirements`, `must have`, `o que buscamos`, `o que esperamos`, `qualifications`, `required`, `what we are looking for`, `what you bring`. Other known headings (weight 1): `diferenciais`, `nice to have`, `desejavel`, `bonus`, `responsabilidades`, `responsibilities`, `about`, `sobre`, `beneficios`, `benefits`. Text before the first heading is weight 1. The heading line itself belongs to the section it opens.
  - Title: first Markdown `#` heading, else first non-empty line, truncated to 120 chars. Company: line matching `^(company|empresa)\s*:\s*(.+)$` (case-insensitive), else null.
  - Language: count whole-word occurrences in normalized text of PT stopwords `de, da, do, com, para, que, voce, experiencia, conhecimento, vaga, sera, nos, e` vs EN `the, with, and, you, experience, knowledge, we, our, will, of, to, is`; PT wins ties.

- [ ] **Step 1: Write failing tests:**
  - `splitsRequirementsAndNiceToHave`: text with `## Requisitos` (Java, Kafka) and `## Diferenciais` (Docker) → `weightOf({"java"})` 2, `weightOf({"docker"})` 1, `weightOf({"rust"})` 0.
  - `noHeadingsMeansOneWeightOneSection` (*Review Focus 1*): `"Java and Kafka"` → one section, weight 1.
  - `crLfLineEndingsStillSplit` (*Review Focus 1*): same as the first test with `\r\n`.
  - `inlineHeadingCarriesWeight` (*Review Focus 2*): `"Requirements: Java, Kafka\nNice to have: Docker"` → java 2, docker 1.
  - `skillInBothSectionsTakesHighestWeight`: Java in requirements and in nice-to-have → 2.
  - `extractsTitleAndCompany`: `jobs/example.md` content → title `Backend Engineer`, company `Example`.
  - `companyLineInPortuguese`: `"Empresa: Acme"` → `Acme`.
  - `titleFallsBackToFirstLine`.
  - `LanguageDetectorTest`: PT paragraph → PT; `jobs/example.md` → EN; empty string → PT.
- [ ] **Step 2:** Run `./mvnw -q test -Dtest='JobParserTest,LanguageDetectorTest'`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run again. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(job): parse job sections, weights, language, title and company`.

---

### Task 7: Lexical matching strategy

**Files:**
- Create: `backend/src/main/java/.../matching/MatchingStrategy.java`, `.../matching/MatchResult.java`, `.../matching/LexicalMatchingStrategy.java`
- Test: `backend/src/test/java/.../matching/LexicalMatchingStrategyTest.java`

**Interfaces:**
- Consumes: `Profile` (Task 2), `TextNormalizer` (Task 4), `TechTermCatalog` (Task 5), `JobText` (Task 6).
- Produces:
  - `interface MatchingStrategy { MatchResult analyze(Profile profile, JobText job); }`
  - `record MatchResult(List<String> matchedSkills, List<String> missingSkills, Map<String, Integer> scores, Map<String, Integer> skillWeights)`; `scores` is keyed by achievement id, insertion-ordered (`LinkedHashMap`) in profile order; `skillWeights` keyed by profile skill (matched only). Method `boolean matches(String skill)` = `skillWeights.containsKey(skill)`.
  - `LexicalMatchingStrategy(TechTermCatalog catalog)` — a Spring `@Component`.
- Rules: skill weight = `job.weightOf(forms)` where forms = every variant of every `catalog.formsOf(skill)`; `matchedSkills` = `profile.allSkills()` with weight > 0, profile order; achievement score = sum of its skills' weights; `missingSkills` = catalog canonicals whose forms appear in the job and whose canonical is not the `canonicalOf` of any claimed skill, in catalog order.

- [ ] **Step 1: Write failing tests** (ported from `test_matcher.py`, fixture profile with achievements `hit-two` [PostgreSQL, AWS], `hit-one` [Python], `miss` [Rust]; job `"We need Python, PostgreSQL and AWS. Docker is a plus."`, no headings so all weights are 1):
  - `scoresSumOfMatchedSkillWeights`: `{hit-two=2, hit-one=1, miss=0}`.
  - `matchesProfileSkillsPluralAgnostically`: job `"Looking for REST APIs and Python."`, profile skills `[Python, PostgreSQL, REST API, AWS]` → matched `[Python, REST API]`.
  - `reportsJobTechAbsentFromProfile`: `Docker` in missing, `Python` not.
  - `aliasInJobMatchesCanonicalSkill`: profile `PostgreSQL`, job `"experience with Postgres"` → matched, and `PostgreSQL` not in missing.
  - `aliasInProfileMatchesCanonicalInJob`: profile `k8s`, job `Kubernetes` → matched; `Kubernetes` not missing.
  - `requirementSkillsWeighDouble`: job with `Requisitos: Python` and `Diferenciais: AWS` → `hit-two` (PostgreSQL absent, AWS 1) = 1, `hit-one` = 2.
  - `portugueseJobWithAccentsMatches`: skill `Integração Contínua` matches job `"integracao continua"`.
  - `categoriesFeedMatchedSkills` (port of `test_categories_still_feed_the_analyze_report`).
- [ ] **Step 2:** Run `./mvnw -q test -Dtest=LexicalMatchingStrategyTest`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run again. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(matching): add weighted lexical matching strategy`.

---

### Task 8: Selection and suggestion

**Files:**
- Create: `backend/src/main/java/.../resume/Selection.java`, `.../resume/SelectionSuggester.java`
- Test: `backend/src/test/java/.../resume/SelectionSuggesterTest.java`

**Interfaces:**
- Consumes: `Profile`, `MatchResult`.
- Produces:
  - `record Selection(List<String> experienceOrder, Map<String, List<String>> achievements, List<String> projects, Map<String, List<String>> skillOrder)` — the spec's `selection` JSON (`skillOrder` keyed by category id).
  - `SelectionSuggester.suggest(Profile, MatchResult) → Selection`, a `@Component`.
- Rules (spec §7): if any score > 0, keep achievements with score > 0, sorted by score desc (stable); else keep all in profile order. Drop experiences with nothing kept. Experiences sorted reverse-chronologically: `endDate == null` first, then by `endDate` desc, then `startDate` desc, ties keep profile order. Projects with any matched skill (via `MatchResult.matches`, after `canonicalOf`), else all. Per category: matched skills first, then the rest, both in profile order.

- [ ] **Step 1: Write failing tests** (ported from `test_generator.py`, its `PROFILE`: experience `Low` 2020-01..2021-01 [`low-1`: Rust], `High` 2023-01..null [`h-a`: Python, `h-b`: Python+AWS]; projects `Keep` [Python], `Drop` [Rust]; category `Skills` [Python, AWS, Rust]; job `"Backend role with Python and AWS."`):
  - `dropsUnmatchedAchievements`: kept ids `[h-b, h-a]`.
  - `ordersAchievementsByScoreDesc`: `High` → `[h-b, h-a]`.
  - `droppedExperienceDisappearsEntirely`: `experienceOrder == [High.id]`.
  - `ordersExperiencesReverseChronologically` (replaces `test_orders_experiences_by_best_achievement_score`): job `"Python and AWS and Rust everywhere"`; swap profile order so `Low` comes first → `experienceOrder == [High.id, Low.id]`.
  - `endedExperiencesOrderedByEndDateDesc`: two ended experiences 2019..2020 and 2018..2022 → the 2022 one first.
  - `fallsBackToFullProfileWhenNothingMatches`: job `"We need Elixir and Haskell."` → achievements `low-1`, `h-a`, `h-b` all kept, each in profile order within its experience.
  - `matchedSkillsComeFirstPerCategory`: `[Python, AWS, Rust]`; and with categories `Data [PostgreSQL, Redis]`, `Web [Python, Rust]` → `Data` unchanged, `Web` `[Python, Rust]`.
  - `projectsFilteredByRelevance`: `[Keep.id]`; with no matching project → all.
- [ ] **Step 2:** Run `./mvnw -q test -Dtest=SelectionSuggesterTest`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run again. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(resume): suggest a selection with chronological experiences`.

---

### Task 9: Resume assembler

**Files:**
- Create: `backend/src/main/java/.../resume/ResumeDocument.java`, `.../resume/ResumeAssembler.java`, `.../resume/Periods.java`, `.../resume/UnknownSelectionIdException.java`, `.../resume/AssembledResume.java`
- Test: `backend/src/test/java/.../resume/ResumeAssemblerTest.java`, `.../resume/PeriodsTest.java`

**Interfaces:**
- Consumes: `Profile`, `Selection`, `Language`.
- Produces:
  - `record ResumeDocument(String lang, Personal personal, String summary, List<Category> skillCategories, List<ExperienceEntry> experience, List<ProjectEntry> projects, List<EducationEntry> education, List<LanguageEntry> languages)` with nested records holding **plain strings** (already localized): `Personal(name, title, location, email, phone, linkedin, github)`, `Category(name, List<String> skills)`, `ExperienceEntry(company, role, period, List<AchievementEntry> achievements)`, `AchievementEntry(id, text)`, `ProjectEntry(name, description, List<String> skills, String url)`, `EducationEntry(institution, degree, period)`, `LanguageEntry(name, level)`. Annotated `@JsonNaming(SnakeCaseStrategy)` so the template keeps reading `skill_categories`. `lang` is `"pt"` or `"en"`.
  - `record AssembledResume(ResumeDocument document, List<String> warnings)`
  - `ResumeAssembler.assemble(Profile, Selection, Language) → AssembledResume` (`@Component`). Throws `UnknownSelectionIdException(String id)` for any id in the selection that the profile lacks, or an achievement id listed under the wrong experience.
  - `Periods.format(String start, String end, Language lang) → String`.
- Warning format: `"<path>: no EN text, PT used"`, e.g. `"experiences[0].achievements[1].text: no EN text, PT used"`; one per field actually used in the document.
- Month labels PT: `jan fev mar abr mai jun jul ago set out nov dez`, "Atual"; EN: `Jan … Dec`, "Present". Separator ` – ` (en dash).

- [ ] **Step 1: Write failing tests:**
  - `PeriodsTest` (port of `test_format_period`, EN): `("2025-01", null)` → `"Jan 2025 – Present"`; `("2020-03","2022-11")` → `"Mar 2020 – Nov 2022"`; `("2020", null)` → `"2020 – Present"`; PT: `("2025-01", null)` → `"jan 2025 – Atual"`.
  - `keepsAchievementTextVerbatim` (port): texts by id equal profile text exactly.
  - `followsSelectionOrder`: selection order of experiences, achievements, projects and skills is preserved exactly.
  - `unknownAchievementIdIsRejected`: `ach_deadbeef` → `UnknownSelectionIdException` with that id.
  - `achievementUnderWrongExperienceIsRejected`.
  - `englishFallsBackToPortugueseWithWarnings` (*Review Focus 3*): profile with no EN anywhere, `EN` → no exception, every text is the PT text, `warnings` non-empty and contains `summary: no EN text, PT used`.
  - `documentHasOnlyTemplateKeys` (port of `test_build_contains_only_template_keys`): serialized JSON top-level keys = `{lang, personal, summary, skill_categories, experience, projects, education, languages}`.
- [ ] **Step 2:** Run `./mvnw -q test -Dtest='ResumeAssemblerTest,PeriodsTest'`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run again. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(resume): assemble localized resume documents from a selection`.

---

### Task 10: Typst renderer, bilingual template and golden test

**Files:**
- Create: `backend/src/main/resources/typst/resume.typ` (moved copy of `templates/resume.typ`, changes below), `backend/src/main/resources/typst/fonts/Carlito-{Regular,Bold,Italic,BoldItalic}.ttf` + `OFL.txt`
- Create: `backend/src/main/java/.../resume/TypstRenderer.java`, `.../resume/RenderException.java`, `.../resume/TypstProperties.java`
- Modify: `backend/src/main/resources/application.yml` (`resume.typst.binary: typst`, `resume.typst.timeout: 10s`, `resume.typst.max-concurrent: 0` meaning number of CPUs)
- Test: `backend/src/test/java/.../resume/TypstRendererTest.java`, `.../resume/GoldenResumeTest.java`, fixture `backend/src/test/resources/fixtures/job-example.md` (copy of `jobs/example.md`)

**Interfaces:**
- Consumes: `ResumeDocument` (Task 9) and everything above for the golden test.
- Produces: `TypstRenderer.render(ResumeDocument) → byte[]` (`@Component`), throws `RenderException` (message includes Typst stderr) on non-zero exit, missing binary or timeout. `@ConfigurationProperties("resume.typst") record TypstProperties(String binary, Duration timeout, int maxConcurrent)`.

Template changes (keep everything else, including the comments on `luma()` and block spacing):
- `#let labels = (pt: (summary: "Resumo", experience: "Experiência", skills: "Competências", projects: "Projetos", education: "Formação", languages: "Idiomas"), en: (summary: "Summary", experience: "Experience", skills: "Skills", projects: "Projects", education: "Education", languages: "Languages"))` and `#let l = labels.at(data.lang)`; every `section("…")` uses `l.<key>`.
- `#set text(lang: data.lang, font: ("Carlito",))`.
- Remove the flat `data.skills` branch: render `skill_categories` only.

Renderer behaviour: on startup copy `typst/` from the classpath to a temp directory (template + fonts); per render create a temp dir, write `resume.json`, run `[binary, "compile", "--root", <dir>, "--font-path", <fonts>, "--ignore-system-fonts", "--input", "resume=resume.json", <template>, "out.pdf"]` with the render dir as working directory (copy the template into it so `--root` covers both), read `out.pdf`, delete the dir in `finally`. A `Semaphore` caps concurrency; the process is killed on timeout.

- [ ] **Step 1:** Download Carlito from Google Fonts (`https://github.com/google/fonts/tree/main/ofl/carlito`, via the `raw.githubusercontent.com` URLs) with its `OFL.txt`.
- [ ] **Step 2: Write failing tests:**
  - `rendersPdfWithSelectableText`: minimal `ResumeDocument` (EN) → bytes start with `%PDF`; PDFBox `PDFTextStripper` text contains the name, `EXPERIENCE` and an achievement text.
  - `rendersPortugueseLabels`: `lang = "pt"` → text contains `EXPERIÊNCIA` and `Atual` from the period.
  - `typstSpecialCharactersAreLiteral` (*Review Focus 4*): an achievement text `"Cut #costs by 30% with $vars, @refs, <tags>, *stars* and _under_"` appears verbatim in the extracted text.
  - `failsWithStderrWhenBinaryMissing`: properties with `binary = "typst-does-not-exist"` → `RenderException`.
  - `timesOutAndCleansUp`: properties with `binary` pointing to a test script `src/test/resources/slow-typst.sh` (`sleep 5`) and `timeout = 200ms` → `RenderException` within 2 s; no `resume-render-*` dir left in `java.io.tmpdir`.
  - `concurrentRendersBeyondLimitAllSucceed` (*Review Focus 5*): `maxConcurrent = 2`, 6 parallel renders via an `ExecutorService` → all six return PDFs; no `resume-render-*` dir left.
  - `GoldenResumeTest.examplesRenderTailoredResume`: fixture profile + `job-example.md` → `JobParser` → `LexicalMatchingStrategy(InMemoryTechTermCatalog.defaults())` → `SelectionSuggester` → `ResumeAssembler(EN)` → `TypstRenderer`. Asserts: job language `EN`; `matchedSkills` contains `Python, PostgreSQL, REST API, Kafka, AWS, Docker`; `missingSkills` contains `CI/CD` (in the job, not claimed by the profile) and not `Docker`; PDF text contains `Example Payments` before `Fictional Data Co` (chronological), contains `4M events per day`, and contains `EXPERIENCE`.
- [ ] **Step 3:** Run `./mvnw -q test -Dtest='TypstRendererTest,GoldenResumeTest'`. Expected: FAIL.
- [ ] **Step 4:** Implement renderer and template changes. Locally Typst comes from the 0.15.0 release binary on `PATH`; if it cannot be installed in the environment, report which tests could not run (AGENTS.md §7) — CI installs it.
- [ ] **Step 5:** Run `./mvnw -q verify`. Expected: `BUILD SUCCESS`, every test of Tasks 1–10 passing.
- [ ] **Step 6:** Commit: `feat(resume): render resumes with Typst and a bilingual template`.

---

## Finishing

- [ ] Push `feature/spring-angular-migration`, confirm `backend` and `guardrails` workflows are green, then ask the owner whether to open the PR to `develop`.
