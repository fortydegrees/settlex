# PROGRESS

## Status (2026-01-08)
- Phase 0: added AI harness files (`AGENTS.md`, `game-core/AGENTS.md`, `docs/agent/*`).
- Phase 1: created pnpm workspace + `game-core` scaffold, added Vitest config, and moved core types/spec/board generation into `game-core`.
- Fixed Next import/export issue for `@settlex/game-core`, removed duplicate `PlayerColor` export, and updated board generation RNG to use boardgame.io `random.Number()`; `/catana` now renders.
- Added deterministic RNG helper and board-generation invariant tests in `game-core`.
- Added core topology/state scaffolding and buildability rule tests (setup + normal placement).
- Migrated placement moves to core `GameState`.
- Updated `Board.js` to render settlements/roads/actions from core state via render maps (no `G.nodes`/`G.edges`).
- Added trading rules to `game-core` (maritime + player trades), including port eligibility and trade-rate enforcement.
- Added victory/awards helpers in `game-core` (Longest Road, Largest Army, VP calculation) with tests and recompute hooks.
- Added ruleset specs/factory and minimal validation enforced in `createEmptyState`.
- Added a board preset resolver (`standard-random`) and switched UI setup to use random board generation with a stored `boardPresetId`.
- Migrated UI to read from `G.core` (player views, roads/settlements, build actions) and routed moves through core rules for a minimal playable loop.

## Next
- Expand `game-core` tests beyond buildability (robber, resource distribution, longest road).
- Clean up legacy duplicates in `app/catana/game`, `spec/`, `strategy/`, `utils/`.
- Address React list key warnings in `app/catana/Board.js`.
- Add discard/robber-steal UI to avoid stalling when 7s require discards.

## Notes
- Keep Next as the UI shell; multiplayer runs in the separate boardgame.io server.

## Status (2026-01-09)
- Added `applyEndTurn` core logic in `game-core/src/rules/turnFlow.ts` with coverage for turn resets and guardrails.
- Wired `endTurn` move in `app/catana/Moves.js` to `applyEndTurn` and synced boardgame.io turn order.
- Added app-level Vitest config (`vitest.config.ts`) and tests for end-turn wiring plus robber flow stage transitions.
- Updated `rollDice` to send 7s to `moveRobber` stage; `moveRobber` now advances the core turn phase back to post-roll.

## Status (2026-01-12)
- Polished the dev-card UI container to match the bottom bar (sizing, spacing, and grouping order), with a pop-in animation and smooth width changes as cards are added.
- Tweaked dev-card spacing/alignment and anchored the dice/end-turn controls to the bottom-right.
- Adjusted right-side padding for the dice/end-turn stack and added VP card stacking with count badges.
- Added a future-notes doc for dev-card box UX experiments and open questions.
- Smoothed action-dock enable transitions by keeping DockCard animated state consistent on enable/disable.
- Enabled dev-card play UI: clickable playable cards with active/disabled styling and stage gating.
- Reused the trade/discard modal for Year of Plenty and Monopoly selection flows with confirm/cancel wiring.
- Added future testing notes for dev-card play UI coverage in `docs/future_plans/dev-card-play-tests.md`.
- Added a design doc for cancelling normal build actions via outside clicks.
- Added resource-bar click shortcut to open maritime trade with a preselected give resource when tradable.
- Added a UI helper + test to compute per-resource maritime trade eligibility for quick-open.
- Fixed quick-trade modal open handler scope and gated resource cursor to tradable resources only.
- Added a design doc for core-owned game-end handling (immediate win on active player threshold in normal phase).
- Added core game-over state and win checks; main phase now ends when `G.core.gameOver` is set.
- Implemented outside-click cancellation for normal build actions with action-circle hit testing and UI wiring/tests.

## Status (2026-01-13)
- Added a shared `CardStack` helper/component with tests and reused it in the dev-card display.
- Extracted `PlayerAvatarStats` with a VP display helper and preserved local hand counts.
- Added `OpponentPlayerBox` with resource/dev card-back stacks and hooked it up in `GameScreen`.
- Logged design + plan docs for the opponent player box UI.
- Added a max-width cap for card stacks (default 90px) so piles tighten spacing as counts grow.
- Updated opponent stacks to render all card backs (no maxVisible limit) while still capping width.
- Highlighted opponent resource badge in red when over discard limit.
- Nudged opponent bar down to avoid VP clipping and centered the avatar+action dock pill.
- Fixed bottom action dock container positioning by moving the centering wrapper under a fixed parent.
- Softened the opponent discard-limit badge styling to match the player warning tone.
- Moved player hand counts out of the avatar stats and into resource/dev-card badges.
- Hid player hand badges behind a local flag and switched badge placement to the outside corner.
- Disabled text selection/context menus on the main game UI with an opt-in attribute for log/chat/status.

## Status (2026-01-14)
- Fixed dev-card play gating so older copies remain playable after buying another copy in the same turn.
- Added game-core test coverage for mixed-age dev cards of the same type.
- Added core helper for playable dev-card counts and updated the UI to enable only that many copies per type.
- Added a future-plan note on a potential player-view model and a small UI test to guard dev-card gating.
- Added fixed dev-card ordering with stacked per-type rendering and a small grouping helper/test.
- Switched dev-card disabled styling to a non-transparent filter and added configurable badge thresholds for stacks.
- Added a Space-bar shortcut on the main game screen to roll or end turn when eligible, with UI gating synced to core/ctx checks.
- Logged a server-enforced turn-timer design doc with stage timers and auto-move handling.
- Added server-side TimerManager + pubSub hook for turn/stage timers and turn-time bonuses.
- Added auto-timeout moves (auto roll/place/discard/robber/etc.) and wired them into stage move lists.
- Extended server stage timers to cover placement, robber movement, and road-building dev card flow.
- Switched the game server to native ESM (local `type: module`) and updated `pnpm serve` to drop the `esm` loader.
- Updated server imports to use `boardgame.io/dist/cjs/*` so Node ESM can resolve them without directory imports.
- Updated the Catana game config to import `boardgame.io` core from `dist/cjs` for Node ESM compatibility.
- Updated Catana effects plugin import to the explicit `bgio-effects/dist/plugin.js` entry for Node ESM resolution.
- Removed the stale `initialiseGraph` import from `app/catana/Game.js` to satisfy ESM named export checks.
- Replaced `react-hexgrid` usage in core board utils with an internal hexagon generator to keep server-side ESM compatible, and fixed the `jsnetworkx` default import; `pnpm serve` now runs without experimental flags.
- Added a local Next image wrapper for Catana UI components to normalize default imports under ESM.

## Status (2026-01-15)
- Added a server timer snapshot endpoint and a bottom-right UI countdown pill.
- Timer snapshots now attach to state updates; the UI uses them with a one-time seed fetch for initial sync.
- Added a preGame phase with ready-up + 15s auto-start before placement begins.
- TimerManager now handles the preGame stage and delays post-roll timers by the roll-animation buffer.
- Auto-move robber now filters legal tiles under friendly-robber rules.
- Timer UI hides during preGame and uses floor seconds to avoid early auto-roll visuals.
- Auto-move dispatch now includes player credentials from match metadata so server-side timers can act on behalf of authenticated players.
- TimerManager now detects robberDiscard via core turn state and auto-dispatches discards for every pending player.

## Status (2026-01-16)
- Logged a GSAP-based effects + audio system design with a cue-driven event bus and centralized AudioManager.

## Status (2026-01-16)
- Added an Effects layer (EffectBus, GameEffects, EffectLayer) with GSAP-based resource distribution and cue-driven audio wiring.
- Centralized board layout helpers and passed board refs for effect positioning.

## Status (2026-01-16)
- Fixed initial placement resource distribution gating to use per-player remaining settlements (no extra resources on first placement).

## Status (2026-01-16)
- Moved initial placement resource grants into game-core with new tests, and wired Moves to forward core distributions only.

## Status (2026-01-17)
- Added per-cue hidden-tab audio policy and wired turn-start + dice-roll cues to the effects bus.

## Status (2026-01-18)
- Added pop/overshoot + jitter to resource distribution card animations for a more "alive" feel.

## Status (2026-01-19)
- Added a dev-only Effects Lab route with deterministic replays for animation tuning.
- Fixed Effects Lab hydration by deferring the EffectLayer portal until client mount.
- Added an effects registry + dropdown selector in the lab and wired an audio toggle via the effect bus.
- Wrote an implementation plan for the game log panel and structured log entries.

## Status (2026-01-19)
- Implemented a public game log in `G.gameLog` with structured entries and forced-action logging.
- Centralized status/log copy in `app/catana/utils/gameText.js` and added a token formatter.
- Added a left-side Game Log panel with scrollable entries and resource icons.
- Added app-level tests for log helper/init, log entry formatting, and log panel wiring.
- Refined the log UI height/z-index and added placement turn dividers plus a main-phase separator.
- Suppressed auto tags for resource gains and styled the log scrollbar for a cohesive UI.
- Added auto-scroll to the log panel and a placement-phase divider entry.
- Paused autoscroll on manual scroll and added a delayed resume on mouse leave.
- Smoothed log autoscroll behavior (wheel-only) and moved placement divider logging to phase start.
- Increased header contrast with a stronger background + divider line.
- Hid the log scrollbar until hover to match default OS behavior.
- Inset the scroll area to keep the scrollbar away from rounded corners.
- Logged a design doc for the game log panel, structured log entries, and shared text templates.

## Status (2026-01-19)
- Logged a board-generation config + official spiral placement design doc to guide strategy refactors.

## Status (2026-01-19)
- Added board spec/config registries and official spiral utilities for deterministic placement.
- Refactored board generation to accept a BoardConfig and apply terrain/number/port strategies.
- Updated Catana setup/tests to use board configs and removed the old board preset module.

## Status (2026-01-19)
- Removed the placement-phase start log entry so the game log begins empty.
- Skipped the placement turn divider on the final placement road so only the main-phase divider remains.
- Added a placement log regression test for the final-divider behavior.
- Added top padding to the log list and refined autoscroll to pause on hover and only jump on new entries after idle.

## Status (2026-01-19)
- Disabled default dragging across Catana UI images (resource bar, dock, log icons, trade modal, dev cards via `NextImage`) and added a UI test to guard non-draggable images.

## Status (2026-01-19)
- Added an effects/audio quick reference to `AGENTS.md` and linked it from agent notes for future sessions.
- Swapped resource distribution audio to the pop-out cue (`resource:pop:start`) mapped to `ui-pop-resource-out.mp3`.

## Status (2026-01-19)
- Synced resource distribution travel to start after all pops, with a tiny travel stagger and a single travel cue mapped to `card_woosh.mp3`.

## Status (2026-01-19)
- Added a 20ms lead for the resource travel cue so the woosh aligns with motion.

## Status (2026-01-20)
- Added a top-left mute toggle that persists audio mute state in localStorage and uses Howler global mute.
- Moved the Game Log panel anchor to the bottom-left of the screen.

## Status (2026-01-20)
- Added placement drop + dust animations for settlement/road builds with a shared sound cue.

## Status (2026-01-20)
- Added a Piece Placement entry to the Effects Lab with full tuning controls.
- Reworked the Piece Placement lab layout to use a side-by-side control panel and preview.
- Widened the Effects Lab container and constrained the preview canvas to avoid horizontal scrolling.
- Updated placement defaults (longer drop, no squish) and split shadow vs. dust burst visuals.

## Status (2026-01-20)
- Logged a placement animation design doc for settlement/road drop + dust effects with a shared cue.

## Status (2026-01-20)
- Derived placement effect duration from shared defaults to keep state updates aligned with the animation.
- Attached a board-scoped placement layer and added board-space rendering in the placement runner.
- Wrapped animated roads so drop translation doesn't disturb rotated road placement.

## Status (2026-01-20)
- Suppressed build action highlights immediately after a placement click and restored them once board state advances.

## Status (2026-01-20)
- Added a small post-hold to placement animations to avoid single-frame flicker before state updates.

## Status (2026-01-20)
- Kept the post-hold out of the effect duration so the animation overlaps the state update and avoids lingering flicker.

## Status (2026-01-20)
- Effects Lab audio now defaults on and supports a per-effect custom sound override with delay tuning.

## Status (2026-01-20)
- Added audio format passthrough for custom Effects Lab uploads so blob URLs play reliably.

## Status (2026-01-20)
- Split placement audio cues so settlements and roads use distinct sounds.

## Status (2026-01-21)
- Logged a design doc for dice roll audio variants with shuffle-bag selection and subtle jitter.
