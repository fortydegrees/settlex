# Recovery, postgame and replay foundations implementation plan

> **For agentic workers:** Follow the plan checklist. Use superpowers:executing-plans for inline execution. Preserve project verification and approval gates.

**Goal:** Apply the approved complete-role foundation contract to recovery and finished-match UI without changing game or replay behavior.

**Architecture:** Preserve existing components, handlers, chart calculations, native range semantics and Vaul drawer ownership. Shared controls/material recipes and canonical tokens replace local appearance fragments. Use the existing isolated Clarity worktree.

**Tech Stack:** React/Next, Tailwind, existing shared controls, Recharts, Vaul and Storybook.

## Global constraints

- No gameplay HUD, board coordinates, approved homepage buttons, wordmark, state machine, auth, lifecycle or spoiler-gating changes.
- Do not add dependencies, commit, push, merge or deploy.
- Preserve player-colour identity, range thumb size 17px, plot insets 30px/8px, replay dock safe-area offsets and 640px drawer breakpoint.
- Existing callbacks, pending guards, confetti ownership and custom celebration display face stay unchanged.
- Keep the counted policy ledger shrink-only; no new exemptions.
- Presentation/manual verification; run existing behavior tests, do not add source-grep tests.

## Task 1: Recovery surfaces

**Files:** IdlePromptModal.js, StatusBanner.js, lobby/[matchID]/InterruptedDuelRecovery.js, g/[matchID]/UnavailableMatchPage.jsx and components/RecoverySurfaces.stories.jsx.
**Interfaces:** Preserve route Link semantics, recovery callbacks, countdown and submitting flags. MatchAlertDialog/ResignConfirmDialog already inherit shared primitives and need checks, not rewrites.

- [x] Verify isolation and passing 2645-occurrence baseline; inspect production owners and current stories.
- [x] Capture phone interrupted-error and unavailable-page baselines.
- [x] Replace fragmented prose with complete roles: `text-2xl font-semibold` → `type-title`, explanatory copy → `type-body-small`, metadata → `type-caption`; replace spacing with ui tokens. Replace the bespoke unavailable-page Link material with the existing primary-button recipe, keeping href="/".
- [x] Add idle pending/error and long match-ID stories; verify callback mocks, pending guards, wrapping and navigation target without submitting real match actions.

## Task 2: Postgame

**Files:** components/GameOverModal.js, PostgameOverlay.js, GameOverOverlay.js; app/ui/theme.cjs and app/globals.css for semantic winner/graphic/backdrop recipes.
**Interfaces:** Keep all action handlers, score/identity mappings, alert checkbox state and confetti useEffect unchanged.

- [x] Capture dense-result and long-name summary at phone width.
- [x] Use complete title/body/label/action roles and shared Button for result actions. Preserve DisplayText celebration. Centralize winner surface and emoji graphic styling; keep board-colour swatches separate from UI ink.
- [x] Review dense, winner/loser, empty scores, replay-loading/error and action-pending stories on desktop/phone. Check all bottom actions remain reachable.

## Task 3: Replay presentation

**Files:** replays/components/ReplayPanel.jsx, ReplayStepControls.jsx, ReplayScoreChart.jsx, ReplayStatusPage.jsx and relevant stories; app/ui/theme.cjs, globals.css, tailwind.config.js.
**Interfaces:** No changes to replayPanelLayout.js, timeline/seek functions, spoiler filtering, range handlers, Vaul options or pointer handling.

- [x] Capture desktop expanded chart and phone drawer.
- [x] Replace fragmented typography with roles and raw spacing with tokens; remove Select/Button consumer font overrides. Reuse existing segmented-control visual recipe while retaining perspective button semantics. Centralize range/graph materials without moving or changing their geometry.
- [x] Stress 1440×900, 375×667, 390×844 and 430×932; check drawer, chart expansion, perspective select/segments, start/end disabled controls, keyboard seeking and reduced effects.

Relevant phone states: replay board/player perspective remains read-only; closed dock opens drawer; open drawer dismisses/restores focus; previous disabled at start and next disabled at end; results and loading/pending gates stay unchanged. Non-replay pre/post-roll, forced discard, robber/build placement and hold controls are outside this presentation diff and must not be edited.

## Closeout

- [x] Prune only resolved ledger fingerprints/counts. Run policy tests/check, focused game-over/display-model/interrupted-duel/replay tests, full lint and diff check.
- [x] Review against pre-turn source snapshots to confirm only presentation and Storybook fixtures changed; preserve earlier dirty work.
- [x] Update DESIGN_SYSTEM, UI_CATALOG, CLARITY_UI_REVIEW, PROGRESS and NOTES with actual coverage/remaining debt.
- [x] Close QA tab; reset viewport/media overrides; preserve original reference, homepage and library tabs.
