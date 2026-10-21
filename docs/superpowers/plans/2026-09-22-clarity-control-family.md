# Clarity Control Family Implementation Plan

> **For agentic workers:** Follow the plan checklist. Use superpowers:executing-plans for inline execution. Preserve project approval gates.

**Goal:** Integrate the approved 2a button material and role-based corner hierarchy into shared controls and the account-entry surface, with a production-component Storybook comparison.

**Architecture:** Existing shared CSS variants own face, ink, rim, base and shadow colours. Homepage mode buttons consume those variables but retain their approved dimensions, layout, icon tiles, markers and depth. The existing Button gains a semantic utility variant for floating header pills; account-entry uses shared controls, not a local material copy.

**Tech Stack:** Existing React, Next, CSS, Base UI and Storybook. No dependencies.

## Global Constraints

- Work only in the existing `codex/clarity-ui-redesign` worktree; preserve accumulated edits.
- Corners: 8px small tiles, 14px controls/fields, 22px panels, full rounding for utility controls and the auth selector. No size-derived corner scale.
- Freeze the approved three play buttons, including white Online text and softened marker, amber Bot palette, and Friend geometry.
- Preserve authentication handlers, provider availability, guest continuation, validation, pending/disabled states and focus/dismissal behavior.
- Center the account-entry heading, simplify its introductory copy, retain left-aligned form labels/values. No gameplay, auth protocol, or live submission changes.
- Presentation-only work uses browser/Storybook verification, not source-grep tests. Existing behavioral tests remain applicable.
- No push, merge, deployment or broad test suite. Leave changes available for local review.

## Task 1 — Shared material and shape roles

Files: `app/globals.css`, `app/ui/Button.js`, `app/catana/home/HomeModeButton.module.css`, `app/catana/home/SystemAccountMenu.js`.

- [x] Record the real homepage's rendered mode-button styles before editing.
- [x] Move the primary/accent/secondary palette definitions to shared CSS variables. The base button consumes background/ink/rim/base, with compact shadows. For example `background: var(--settlex-ui-button-face)`; mode buttons use the same values with their existing stronger shadow.
- [x] Add `utility: "settlex-ui-button-secondary settlex-ui-button-utility"` to Button variants; retain the legacy pill alias by resolving it to utility. Utility sets `border-radius: var(--settlex-ui-radius-pill)` and optical rim/shadow rather than a hard base.
- [x] Use Button utility for signed-out header entry, and its shared classes for the existing account popover trigger. Do not alter handlers.
- [x] Compare all mode-button computed colours, type, geometry and shadows against baseline.

## Task 2 — Account entry and executable catalogue

Files: `app/catana/lobby/AccountEntryModal.js`, `AccountEntryModal.module.css`, `AccountEntryModal.stories.jsx`, `app/catana/home/HomeTitleChrome.js`, `app/ui/Button.stories.jsx`, `Foundations.stories.jsx`, `app/catana/dev/ui/UiShowcaseClient.js`.

- [x] Remove the local primary-material override from username submission. Retain wrapping styling only.
- [x] Set auth-first heading to `Sign in`, omit redundant explanatory paragraph; shorten save-profile explanation to `Keep your username and progress across devices.` Center title/description locally; keep fields left aligned. Auth selector uses pill tokens. Preserve all available actions and conditions.
- [x] Reuse the already exported HomeGameModeDock in the real-component ButtonFamily story; no additional export or cloned homepage markup. Show actual header entry, standard form actions, mode buttons and a modal-launch example. Record role labels in the foundations story and utility example in the dev UI showcase.
- [x] Add email-only story matching the actual local provider configuration; retain provider, pending, validation, save-profile and create-account stories.

## Task 3 — Verify and document

- [x] Inspect ButtonFamily and real homepage/modal at desktop and short 375x667; account entry also at 390x844. Confirm header pill, 14px form controls, 22px modal, 8px icon tiles and unchanged play dock.
- [x] In mocked stories verify create-account toggle, missing credentials, provider pending/error, email pending and disabled feedback; check keyboard focus and Escape on real modal without submitting auth. Fixed the story's initial-focus typing race, not production auth logic.
- [x] Check reduced motion/transparency through browser emulation and inspect a representative shared-button consumer beyond account entry (friend invite and long-name account menu).
- [x] Run targeted ESLint for changed JS/JSX, `pnpm exec vitest run app/catana/__tests__/SystemAccountMenu.test.js --reporter=dot`, and `git diff --check`. Record exact outcomes, no unrun claims.
- [x] Update UI catalogue, NOTES and PROGRESS with shared ownership, new stories, verification limits and remaining white-on-lime contrast limitation.
- [x] Review focused diff, close temporary test tabs and reset emulation; retain homepage/reference and one deliberate Storybook review tab. No commit required for this local visual trial.
