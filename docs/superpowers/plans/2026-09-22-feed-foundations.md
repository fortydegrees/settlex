# Shared feed foundations implementation plan

> **For agentic workers:** Follow the plan checklist. Use superpowers:executing-plans for inline execution. Preserve project review gates.

**Goal:** Bring shared Chat/Log prose, spacing and materials into the Clarity contract without changing gameplay or feed behavior.

**Architecture:** Existing FeedPanel, ChatPanel, GameLogPanel and FeedTokenRow remain the production owners. Complete typography roles and token spacing replace consumer fragments; the existing global recipe owner supplies feed header/footer/composer/selection materials. Desktop rail and mobile drawer layout/wiring are not redesigned.

**Tech Stack:** React, Tailwind, Storybook 8, existing Vitest and UI-policy checker.

## Constraints

- Work only in the existing `codex/clarity-ui-redesign` worktree; preserve previous dirty work.
- No changes to board, action dock, turn controls, privacy, log formatting, send/seek/autoscroll semantics, mobile drawer or desktop rail geometry.
- Keep tile/dice/card miniature artwork and player colours as explicit exceptions; do not manufacture generic prose roles for graphic details.
- No dependencies, source-grep tests, commits or deployment.

## Task 1: Migrate the shared feed internals

Files: `app/catana/components/{FeedPanel,ChatPanel,GameLogPanel,FeedTokenRow}.js`, `app/globals.css`.
Interfaces: existing props and callbacks remain identical. Material-only recipes use the existing `settlex-ui-*` namespace.
Verification: presentation baseline and existing behavioral suites, not new class assertions.

- [x] Inspect owners, notes and catalogue; confirm policy baseline 2,181/68 and 51 feed/format/scroll tests passing.
- [x] Capture expanded desktop sandbox baseline at 1440×900 and phone feed at 390×844.
- [x] Replace transcript fragments with `type-body-small`, names with `type-action-small`, server prose with `text-ink-secondary`, shared spacing with `*-ui-*`.
- [x] Reuse `settlex-ui-hud` on standalone feed frames; standardize shared header/footer/input recipes. Keep the compact composer dimensions and native disabled/read-only behavior.
- [x] Keep interactive log rows' callbacks/keyboard semantics; standardize selection material and focus recipe.

## Task 2: Production-faithful feed stories and verification

Create `app/catana/components/GameFeeds.stories.jsx`; use the real panels with fixture-only callbacks and real formatLogEntry inputs. Add LiveChat, EmptyChat, ReadOnlyChat, LongTranscript, LogEntries and SelectableReplayLog.

- [x] Verify local send clears composer and appends message; read-only input disabled; long messages wrap; Enter/Space on log rows updates selected key.
- [x] Compare desktop sandbox expanded/minimized and phone drawer Log/Chat at 375/390/430 widths. Observe board and turn controls unchanged; do not treat local fixtures as live server verification.
- [x] Sample normal/reduced motion and reduced transparency. No horizontal overflow or clipped focus indicator.
- [x] Run the six existing feed suites, `pnpm test:ui-policy`, `pnpm lint`, and `git diff --check`.
- [x] Remove only resolved entries from `scripts/design-system/legacy-styles.json`; confirm no growth or new exceptions.
- [x] Read-only review of this batch; address actionable findings.
- [x] Update DESIGN_SYSTEM, UI_CATALOG, CLARITY_UI_REVIEW, PROGRESS and NOTES with measured scope and limitations. Close the test tab and reset viewport/media overrides; leave the existing library/home previews available.

## Mobile state boundary

Feed contents are shared between turn states, and this pass does not alter mobile composition. Verify open/closed drawer plus writable/read-only composer. Pre-roll, post-roll, waiting, placement, robber/discard and game-over state ownership remain in GameScreen/cockpit; any additional scenario checks are recorded explicitly rather than claiming full gameplay coverage.
