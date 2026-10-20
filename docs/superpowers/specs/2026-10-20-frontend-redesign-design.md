# Frontend redesign: a modern SaaS look — design

**Status:** approved in conversation, awaiting written-spec review
**Date:** 2026-10-20
**Mockup:** the "Resume Tailor redesign" canvas (dashboard and review in light and dark, sign-in)

## 1. Goal

The Angular app still looks like the stock Angular Material theme: default azure palette, Roboto, a plain top
toolbar, cards and forms with no identity of their own. The owner wants it to look modern, in the style of SaaS
tools such as Linear, Vercel and Notion.

Decisions taken with the owner:

| Topic | Decision |
|---|---|
| Direction | Clean SaaS look: neutral greys, one accent, Inter, generous whitespace, thin borders instead of shadows, side navigation |
| Scope | Skin, layout and UX extras (empty states, skeletons, visible shortcuts, job search) |
| Dark mode | Follows the system, with a light / dark / system switch remembered per browser |
| Accent | Emerald |
| Approach | Keep Angular Material and restyle it through its tokens (not Tailwind, not a hybrid) |

Success means: every screen matches the approved mockup's language in both themes, nothing the app does today
changes behaviour, every text meets WCAG AA contrast in both themes, and the existing unit and e2e tests still
cover the same behaviour.

## 2. Out of scope

- Any backend or API change.
- A command palette (⌘K), animations beyond short transitions, illustrations from an external library.
- New features beyond the UX extras listed in §7 and §8. The job search filters the list already loaded.

## 3. Visual language

### Colour tokens

Our own CSS custom properties are the source of truth. Each is defined once with `light-dark()`, so switching
`color-scheme` on `<html>` switches the whole app.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--app-bg` | `#fafafa` | `#09090b` | Page background |
| `--app-surface` | `#ffffff` | `#18181b` | Cards, panels, sidebar, dialogs |
| `--app-subtle` | `#f4f4f5` | `#232327` | Hover, sub-rows, segmented controls, the preview backdrop |
| `--app-border` | `#e4e4e7` | `#2e2e33` | Every 1 px border and divider |
| `--app-border-strong` | `#a1a1aa` | `#52525b` | Input borders, dashed "missing skill" chips |
| `--app-text` | `#18181b` | `#fafafa` | Body text |
| `--app-muted` | `#71717a` | `#a1a1aa` | Secondary text |
| `--app-accent` | `#047857` | `#34d399` | Primary buttons, links, focus ring, active nav |
| `--app-on-accent` | `#ffffff` | `#022c22` | Text on the accent |
| `--app-accent-soft` | `#ecfdf5` | `#0b2a20` | Active nav item, matched-skill chips |
| `--app-on-accent-soft` | `#065f46` | `#6ee7b7` | Text on the soft accent |
| `--app-warn-soft` / `--app-on-warn-soft` | `#fffbeb` / `#92400e` | `#2a1f05` / `#fcd34d` | Notes such as "missing English" |
| `--app-danger` | `#b91c1c` | `#f87171` | Errors, destructive actions |

Every text/background pair above is at least 4.5:1. `#71717a` on `#fafafa` is the tightest, at about 4.6:1.

### Typography, shape, motion

- **Type:** Inter 400/500/600 from Google Fonts. It replaces Roboto in `index.html`; the build inlines the font
  CSS, and the CSP already allows Google Fonts.
  - Base 14 px / 1.5.
  - Page titles 24 px/600 at -0.02em; section titles 13–15 px/600.
  - `font-variant-numeric: tabular-nums` on dates, counts and scores.
- **Shape:**
  - Radius 8 px on buttons and inputs; 12 px on cards, panels, menus and dialogs; 999 px on chips, pills and avatars.
  - Borders, not shadows. Shadows only on overlays (menus, dialogs) and on the resume "sheet".
- **Density and focus:**
  - Controls are 40 px high (icon buttons at least 36 px with a 40 px hit area).
  - The focus ring is a 2 px accent outline with a 2 px offset on every interactive element.
- **Motion:** 150 ms ease on colour, background and opacity. Disabled when `prefers-reduced-motion: reduce`.
- **Icons:** Material Symbols Outlined (already loaded) at weight 300, size 18–20 px. Never icon-only without an
  `aria-label`.

## 4. Theming architecture

- **`styles/_tokens.scss`** declares the tokens of §3 on `:root`, plus `color-scheme: light dark` as the default.
- **`styles/_material.scss`:**
  - Calls `mat.theme()` with palettes generated from the emerald and zinc hues by
    `ng generate @angular/material:theme-color`. The generated file is committed and never edited by hand.
  - Uses `mat.theme-overrides()` to point Material's system variables (surface, surface containers,
    outline, outline-variant, primary, on-primary, error, typography) at our tokens, so Material
    components and our own markup can never drift apart.
  - Component overrides make Material look like the mockup:
    - outlined form fields, set globally with `MAT_FORM_FIELD_DEFAULT_OPTIONS`, with dynamic subscript sizing;
    - flat buttons;
    - outlined cards;
    - chips in the soft accent;
    - a muted ripple;
    - menus and dialogs with a 12 px radius and the overlay shadow.
- **`Theme` service** (`core/theme/theme.ts`):
  - Holds a `mode` signal: `'light' | 'dark' | 'system'`.
  - Persists it in `localStorage` under `ui-theme`, inside try/catch, the same way as `ui-lang`.
  - An effect sets `document.documentElement.style.colorScheme` to `light`, `dark` or `light dark`.
- **First load:**
  - With the default `system`, the CSS alone picks the theme, so nothing flashes.
  - A browser whose stored choice differs from the system may show the system theme for a moment before Angular
    boots. Removing that would need an inline script, which the CSP forbids on purpose, so the flash is accepted.
- **`<meta name="theme-color">`** follows the background in both themes.

## 5. Layouts and navigation

Routes gain two layout components; every page keeps its path, guards and lazy loading.

```text
''  AuthLayout   → login, register, verify-email, forgot-password, reset-password, auth/callback
''  AppShell     → '' (dashboard), jobs/new, jobs/:id/review, profile     [authGuard on the parent and its children]
'**' → ''
```

`AppShell` replaces today's toolbar.

- **≥ 1024 px:** a 240 px sidebar on `--app-surface` with a right border. It holds:
  - the brand mark and name;
  - a primary "+ New job" button;
  - navigation: Jobs and Profile, each with an icon; the active item takes the soft accent;
  - a user button at the bottom: initials avatar, name, email.
- **768–1023 px:** the sidebar collapses to a 64 px icon rail, with tooltips on each item.
- **< 768 px:** a top bar with a menu button opens the navigation as an overlay. `mat-sidenav` in `over` mode
  provides the focus trap and Esc.
- **The user button opens a menu** with:
  - Theme (Light / Dark / System, as a radio group);
  - Language (Português / English);
  - Keyboard shortcuts;
  - Sign out.

  Theme, language and sign-out leave the toolbar for this menu.
- **Content area:** a page header (title, optional subtitle, actions on the right) and a max width of 1040 px.
  The review screen uses the full width.
- **`AuthLayout`:** a split screen.
  - Left: a dark brand panel (`#09090b` with a faint emerald dot grid), the product's one-line promise and three
    short points. It reads the same in both themes.
  - Right: the form, at most 360 px wide, with language and theme switches in the top-right corner.
  - Below 768 px only the form shows, with the brand mark above it.

## 6. Screens

- **Dashboard:**
  - **Header:** "My jobs" with a count line (jobs, resumes), a search field (focus with `/`) and the "+ New job"
    button.
  - **Empty-profile banner:** a soft-accent card with "Fill in profile", shown while the profile is empty.
  - **Job list:** one bordered block of rows, each showing:
    - the title and an EN/PT pill;
    - company · date;
    - a resume-count pill;
    - "Review" and a `⋯` menu with "Delete".
  - **Resumes:** compact sub-rows under their job (language, date, "Download PDF", delete).
  - **Search:** filters by title and company, ignoring case and accents. "No jobs match" has its own empty state.
- **New job:** a two-column layout.
  - The description field in a card, with the character counter and a `⌘/Ctrl+Enter` hint.
  - A short "what happens next" card beside it, which stacks below on narrow screens.
- **Review:**
  - **Sticky header:** back link, title and company, the PT/EN segmented control, save status, "Save resume".
  - **Left pane** (about 460 px, scrolls on its own):
    - a skills card: matched skills as soft-accent chips with a check, missing skills as dashed neutral chips;
    - the warnings note;
    - experience cards with a checkbox per bullet, a relevance bar (score out of 5) with the number for screen
      readers, and up/down buttons shown on hover and focus but always reachable by keyboard;
    - projects;
    - the skill order.
  - **Right pane:** the preview on `--app-subtle` inside a white "sheet" frame. A skeleton shows while it renders;
    after saving, a success note with "Download PDF".
  - **Narrow screens:** below 1024 px the panes stack, preview second.
- **Profile:**
  - A page header with a status pill (Saved ✓, Saving…, Unsaved changes, error states) and an actions menu
    (Import profile.yaml, Export JSON).
  - The section navigation on the left, sticky from 1024 px up, with the amber missing-English count and a red
    dot for invalid sections.
  - Each section in its own card, and the PT/EN editing switch sticky at the top of the form.
- **Dialogs** (import, conflict, delete, leave with unsaved changes, shortcuts) share one look: 12 px radius, a
  title, body text, and actions on the right with the primary action last.

## 7. Shared UI pieces

All are standalone, `OnPush` components or directives under `app/ui/`. Each has one job and is usable without
knowing its internals.

| Piece | Purpose | Interface |
|---|---|---|
| `PageHeader` | Title, subtitle and actions slot | inputs `title`, `subtitle`; content projection for actions |
| `EmptyState` | Illustration, title, text and an optional action | inputs `kind` (`jobs` \| `profile` \| `search` \| `error`), `title`, `text`; projected action |
| `Skeleton` | Shimmering placeholder blocks; static under reduced motion | inputs `lines`, `height`, `shape` (`text` \| `block` \| `circle`); `aria-hidden`, with the page keeping its `role="status"` text |
| `ConfirmDialog` | Replaces `window.confirm` | `confirm(options): Promise<boolean>` service; `destructive` styles the confirm button in danger |
| `Kbd` | Renders a key hint (`⌘S` or `Ctrl+S` by platform) | input `keys` |
| `StatusPill` | Small coloured pill for statuses and counts | inputs `tone` (`neutral` \| `accent` \| `warn` \| `danger`) |
| `ShortcutsDialog` | Lists the shortcuts of §8 | opened by `?` and from the user menu |

The illustrations are small inline SVGs, drawn in the token colours. They have no scripts or external assets, so
the CSP needs no change.

## 8. Keyboard shortcuts

A `Shortcuts` service listens on `document` once.

- **Registering:** components register a shortcut for as long as they live: `register({ key, ctrlOrMeta?,
  handler })`, cleaned up through `DestroyRef`.
- **While typing:** plain-key shortcuts are ignored while focus is in an input, textarea, select or
  contenteditable element. Ctrl/⌘ combinations still work.

| Keys | Where | Action |
|---|---|---|
| `/` | Dashboard | Focus the search field |
| `N` | Signed-in pages | Go to New job |
| `⌘/Ctrl+S` | Profile | Save now (exists today; moves onto the service) |
| `⌘/Ctrl+Enter` | New job | Analyze job |
| `?` | Anywhere | Open the shortcuts dialog |

Shortcuts are shown where they apply: the `/` hint inside the search field, `⌘S` next to the profile status, and
`⌘Enter` under the job description.

## 9. Text and i18n

New UI strings go into both `pt.ts` and `en.ts`; the typed dictionaries make a missing key a build error. They
cover:

- the user menu and theme names;
- the shortcuts dialog and its key names;
- empty states, the search field and "no matches";
- the confirm-dialog buttons and the "what happens next" card;
- the sign-in brand panel's promise and points.

Existing keys keep their meaning.

## 10. Accessibility

- Contrast as in §3 in both themes; the accent is never the only signal (matched chips also carry a check icon;
  invalid sections also say so in text).
- Every control keeps a visible label and a visible focus ring; move up/down stays available wherever drag and drop
  is.
- The navigation is a `<nav>` with `aria-current="page"`; the rail's icon links carry `aria-label`s.
- Skeletons are `aria-hidden`; the page announces loading with the existing `role="status"` text, kept visually
  hidden.
- Reduced motion turns off the shimmer and transitions.

## 11. Testing

- **Unit tests (Vitest), new:**
  - `Theme`: default `system`; stores the choice; applies `color-scheme`; survives a throwing `localStorage`.
  - `Shortcuts`: fires; ignores plain keys while typing; Ctrl/⌘ combos still fire; unregisters on destroy.
  - `ConfirmDialog`: resolves true or false.
  - Dashboard search: matches case- and accent-insensitively; shows "no matches".
  - `AppShell`: the navigation marks the current page; the user menu switches theme and language and signs out.
  - `EmptyState` and `Skeleton` render and hide from assistive technology as specified.
- **Unit tests, changed:** specs that relied on today's markup (toolbar, `window.confirm` spies, badge selectors)
  move to the new structure and keep asserting the same behaviour.
- **e2e (Playwright):**
  - The main flow keeps its steps. "Sign out" is reached through the user menu.
  - A new test runs `@axe-core/playwright` on the sign-in page, the dashboard, the profile and the review screen,
    in light and dark. It fails on any serious or critical violation, which includes contrast.
  - The existing CSP-violation check stays on, so new fonts or assets cannot slip past the policy.
- **Visual check:** before the PR, screenshots of each screen in both themes at 1280 px and 390 px, attached to the
  PR for the owner. No pixel-snapshot tests, which are brittle across font rendering.

## 12. Delivery and risks

- **Branch:** `feature/frontend-redesign` from `develop`, with one PR.
- **Commits** follow the order of the implementation plan:
  1. tokens and Material theme;
  2. `Theme` service;
  3. shared UI pieces;
  4. shell and auth layout;
  5. one commit per screen;
  6. shortcuts;
  7. e2e and axe.
- **Risk: Material token names change between versions.** All overrides live in `_material.scss`, and the axe and
  e2e runs catch regressions.
- **Risk: the sidebar shell restructures routes.** Paths, guards and the unsaved-changes guard stay as they are,
  and the existing route and e2e tests cover them.
- **Risk: a large diff.** Behaviour does not change, and each screen lands in its own commit with its tests.
