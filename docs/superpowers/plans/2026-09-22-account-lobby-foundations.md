# Account and lobby foundations implementation plan

> **For agentic workers:** Follow the plan checklist. Use superpowers:executing-plans for inline execution. Preserve project verification and approval gates.

**Goal:** Migrate the remaining account/identity and normal lobby surfaces to the approved Clarity foundations without changing lifecycle behavior.

**Architecture:** Retain production components and callbacks. Replace local type fragments with complete roles, literal spacing with UI tokens, and palette/corners with semantic recipes. Keep the existing isolated Clarity worktree and its prior dirty work.

**Tech Stack:** React/Next, Tailwind, existing Base UI controls, Storybook, existing source-policy checker.

## Global constraints

- No game HUD, board geometry, approved homepage mode-button, wordmark, auth or matchmaking state-machine changes.
- No new dependencies, commits, push, merge or deployment in this pass.
- Use existing UI roles and shared controls. Emoji graphics keep their own centrally owned size recipes, not prose typography overrides.
- Keep ledger shrink-only; do not exempt the migrated files or add new debt.
- Inspect long names, pending/error states and phone layout with real production-component stories; no live account creation or matchmaking requests.

## Task 1: Account identity and menu

**Files:** `app/catana/home/SystemAccountMenu.js`, `app/catana/lobby/IdentityModal.js`, `app/catana/matchAlerts/MatchAlertControl.js`, `app/ui/theme.cjs`, `app/globals.css`, related identity/menu stories.

**Interfaces:** Existing component props, callbacks and focus/dismissal behavior unchanged. Existing avatar preview recipe is reused; central compact avatar/emoji glyph recipes own graphic sizes.

**Verification shape:** Presentation/manual plus existing Storybook interaction checks.

- [x] Inspect existing production code, catalog, policy baseline and identity/menu screenshots.
- [x] Replace prose roles (`text-sm font-medium` → `type-label`, `text-sm font-semibold` → `type-action-small`), spacing (`gap-4` → `gap-ui-4`), tones (`text-slate-600` → `text-ink-secondary`) and corners (`rounded-full` → `rounded-pill`).
- [x] Remove consumer font overrides from shared field/button elements. Use a nested emoji graphic span for emoji-grid options; leave emoji state/animation timings unchanged.
- [x] Add a maximum-length identity story and check name input, emoji selection, colour selection, empty-name disabled state, menu pending/error/install-required states and Escape focus restoration. Desktop and phone compositions reviewed; individual sampled interactions/states are recorded in `CLARITY_UI_REVIEW.md`, not an exhaustive state-by-viewport matrix.

## Task 2: Matchmaking, invites and waiting room

**Files:** `app/catana/home/SearchingModal.js`, `app/catana/lobby/[matchID]/PendingFriendChallengeScreen.js`, `app/catana/lobby/[matchID]/OpenMatchRoom.js`, their stories, `app/ui/theme.cjs`, `tailwind.config.js`, `app/globals.css`.

**Interfaces:** No changes to search phases, rescue thresholds, timers, clipboard handler, submit/cancel callbacks, seat selection or loading gates. A complete `type-code-caption` role preserves server-address monospace styling.

**Verification shape:** Presentation/manual; existing mocked interaction assertions.

- [x] Capture search-error/phone invite/desktop long-room baselines.
- [x] Apply `type-title` to surface titles, `type-body-small` to explanations, `type-caption` to metadata and shared form roles to labels. Use tokenized spacing and semantic tones; remove local button type overrides.
- [x] Preserve decorative invite geometry using central decorative material tokens and role-based corners; do not let decoration dictate action geometry.
- [x] Add long-name invite coverage and verify inviter copy, invitee input/join, expired/error/pending states, room seat selection/join and disabled/loading states. These actions use Storybook mocks only.

## Closeout

- [x] Prune only resolved ledger counts and run `pnpm ui:check`, `pnpm test:ui-policy`, targeted existing model tests, `pnpm lint`, and `git diff --check`.
- [x] Review diffs to confirm lifecycle callbacks and game files were not altered in this slice. Check normal/reduced motion and transparency on representative phone states.
- [x] Update `DESIGN_SYSTEM.md`, `UI_CATALOG.md`, `CLARITY_UI_REVIEW.md`, `PROGRESS.md` and `NOTES.md` with actual scope and evidence.
- [x] Close the task QA tab, reset viewport/media overrides and retain original homepage/reference/library previews.

**Outcome:** Six production consumers migrated; 210 ledger occurrences removed
(2,645 remaining across 77 files). All 65 targeted tests and full Next lint passed.
No live auth/matchmaking or production validation, and no deployment. See the
review document for exact visual samples and remaining limitations.
