# Profile and homepage metadata foundations implementation plan

> **For agentic workers:** Follow the plan checklist. Use superpowers:executing-plans for inline execution. Preserve project verification and approval gates.

**Goal:** Migrate the remaining public-profile and homepage metadata/navigation presentation to the approved Clarity foundations.

**Architecture:** Retain production owners, hrefs, callback wiring and data formatters. Use complete typography roles and token spacing; keep artwork, player identity and the approved mode-button geometry/material intact.

**Tech Stack:** React/Next, Tailwind, shared UI recipes and Storybook.

## Global constraints

- Existing isolated worktree: `codex/clarity-ui-redesign`; preserve earlier dirty work.
- No board/HUD, auth, profile lookup, release data, wordmark, mode-button material or lifecycle changes.
- No dependencies, commit, push, merge or deploy. No source-grep tests for styling.
- Shrink-only policy ledger, no new exemptions. Keep avatar colour as data.

## Task 1: Public profile

**Files:** `app/u/[username]/PublicProfileView.js`, its stories; `app/ui/theme.cjs` and `app/globals.css` for the profile-avatar graphic recipe.
**Interfaces:** Preserve `PublicProfileView({ profile })`, stat data, date formatter and encoded `/g/` replay anchors.

- [x] Verify the existing worktree and passing 2,283-occurrence baseline; inspect production owners and stories.
- [x] Capture LongUsername at 1440×900 and 390×844.
- [x] Replace `text-3xl font-bold` with `type-page`, username with `type-title`, match names with `type-action-small`, descriptions with `type-body-small`, and every raw spacing class with its `*-ui-*` equivalent. Keep stat-card label alignment and the 64px avatar; use a central 32px glyph recipe, not a prose-font override.
- [x] Add a long-history-label stress story. Check empty/populated/long states at desktop and 375/390px phone widths, replay anchor focus/href, wrapping and scroll reachability.

## Task 2: Homepage metadata and navigation

**Files:** `app/catana/home/HomeTitleChrome.js`, `SystemTopChrome.js`, `HomeTitleChrome.stories.jsx`; `app/globals.css` for existing metadata-dot appearance.
**Interfaces:** Preserve release disclosure state, 3-highlight cap, navigation URLs, account callbacks, mode actions and wordmark layout.

- [x] Capture desktop release disclosure and phone idle chrome; record approved dock computed dimensions/colours/type before editing.
- [x] Use `type-caption` for descriptor/status, existing MetaDisclosure-owned trigger type, `type-section` release heading and `type-body-small` highlights; migrate navigation to `type-label`, semantic ink and small focus corners. Centralize existing beta/positive dot treatments. Tokenize surrounding spacing without changing mode-button internals or obsolete exported action-style metadata.
- [x] Add long release-copy story using mocked release data, not a production release edit. Check desktop open/close/Escape/focus, 1024px edge, phone hidden metadata, navigation/account controls and unchanged three/four-mode idle/pending buttons.

## Closeout

- [x] Prune only resolved ledger entries; run `pnpm test:ui-policy`, existing release-info tests, `pnpm lint` and `git diff --check`.
- [x] Review the scoped diff against pre-turn snapshots; update DESIGN_SYSTEM, UI_CATALOG, CLARITY_UI_REVIEW, PROGRESS and NOTES with actual coverage and remaining boundaries.
- [x] Close the task-created QA tab and reset viewport/media overrides. Preserve original reference, homepage and Storybook tabs.
