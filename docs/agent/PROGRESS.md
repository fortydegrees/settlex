# PROGRESS

## Status (2026-02-15)
- Added a Next dev route for palette iteration at `app/catana/dev/palette-preview/page.js` (URL: `/catana/dev/palette-preview`).
- Route is development-only and calls `notFound()` outside development mode.
- Added `app/catana/dev/palette-preview/PaletteBoardPreviewClient.js` with:
- palette selector (`Option C`/`Option D`),
- global number-token toggle,
- selected-resource-row preview,
- full board preview (3-4-5-4-3 / 19 hexes).
- Updated token rendering in this route to use board-editor parity math (same chip sizing and offset rules as `app/board-editor/Tile.js`) so board-context reads match in-game sizing better.
- Fixed layout regression on this route by hard-constraining SVG tiles to parent bounds (`width/height: 100%` + explicit board tile dimensions) and replacing var-driven grid sizing with a stable flex row layout to prevent giant/overlapping tiles.
- Adjusted token vertical placement for this route's overlay context: replaced large margin-based shift with a small transform offset so number chips render on the tile face instead of below tiles.
- Fine-tuned token placement again by nudging the overlay upward (`translateY(size * -0.04)`) so chips sit closer to the visual center of the tile face.
- Fixed root cause of off-tile token rendering in some browsers by anchoring the token overlay with explicit bounds (`top/right/bottom/left: 0`, `width/height: 100%`) and resetting token transform to neutral.
- Fixed remaining token-below-tile bug by moving tile frame/svg/token overlay layout from parent `styled-jsx` selectors into inline styles in `TileFrame` (child component), avoiding scoped-style boundary issues across component boundaries.
- Updated token sizing/placement model in the dev palette route to match in-game behavior:
- token `size` now auto-derives from each tile's rendered height (`height / 2`) via `ResizeObserver` in `TileFrame`,
- token vertical placement uses the same in-game offset math (`marginTop: size / 1.66`),
- this naturally makes top-row chips larger/lower than board-preview chips when tile sizes differ.

## Status (2026-02-14)
- Added RL experiment tooling for blog/eval reporting:
- `ai/pufferlib/python/settlex_puffer/eval_curve.py` evaluates all `model_*.pt` checkpoints in a run directory and appends seeded win-rate summaries to CSV (supports resume and `--watch` polling mode).
- `ai/pufferlib/python/settlex_puffer/plot_curve.py` plots one or more eval-curve CSVs to PNG (with optional CI band).
- Added package entrypoints in `ai/pufferlib/python/pyproject.toml`:
- `settlex-puffer-eval-curve`, `settlex-puffer-plot-curve`.
- Updated `ai/pufferlib/README.md` with commands for collecting and plotting checkpoint performance curves for blog posts.
- Added a shared 4-part roadmap doc for synchronized blog + engineering planning:
- `docs/plans/2026-02-14-puffer-4-part-roadmap.md`.
- Linked the roadmap from `ai/pufferlib/README.md` under Writeups.
- Added v3 planning capture doc focused on imitation-learning warm start:
- `ai/pufferlib/writeup-v3-notes.md` (timing decision, data-size estimates in games/actions, opening-only ROI, risks, open questions, and candidate experiment recipe).
- Updated roadmap sequencing so v3 is imitation/sample-efficiency and v4 combines performance + scale.
- Linked v3 notes from `ai/pufferlib/README.md`.
- Added Intel-mac torch compatibility shim in `ai/pufferlib/python/settlex_puffer/train.py`:
- if `torch.uint64` is missing (observed on older x86 macOS wheels), alias it to `torch.int64` before importing PufferLib, preventing startup crash in `pufferlib.pytorch`.

## Status (2026-02-13)
- Added `public/svgs/concepts/resource-palette-preview.html` to visually compare resource color palette options using classic seam-strong tile geometry.
- Preview now renders five rows, including new `Slate Ore / Split Greens` and `Accessibility Patterns` options in addition to the existing pop variants.
- Added row-level SVG vibrance controls (`saturate`/`contrast`) for the pop-focused options so saturation differences are visibly stronger in side-by-side review.
- Refined tile body shading to match the flatter `tile_ore.svg` feel: body now renders as a flat base color with very low-opacity radial lift/shade overlays instead of a strong radial ramp.
- Added an interactive gradient lab in the preview page with style presets (`Subtle Flat`, `Ore Directional`, `Striped Mid Band`) plus sliders for body depth, ring depth, and stripe strength.
- Added ring-gradient experimentation controls (`Ring Direction` and `Edge Shadow Lift`) so the darkest lower edge can be softened and gradient direction can be flipped/rotated away from simple bottom-dark shading.
- Set gradient lab defaults to `Ore Directional` with `Body Depth 100%`, `Ring Depth 100%`, `Ring Direction Diagonal TR->BL`, `Edge Shadow Lift 62%`, and stripes disabled.
- Retuned the new bright-wheat row to avoid washout by replacing near-white wheat highlights with more saturated yellow-gold stops.
- Removed the wheat-only sheen treatment and switched back to pure color tuning only, per feedback to avoid special-case rendering.
- Tuned Option B wheat to be brighter without washout (`base #ffd43b`, `highlight #ffed8e`) and softened the dark read by lifting shadow (`#c26a06`) and reducing row contrast (`1.05`).
- Added data-driven resource pattern overlays (6-10% opacity) for accessibility experiments: ore speckle/facets, wheat grain lines, sheep dots, lumber vertical lines, and brick staggered rectangles.
- Added an interactive wheat color tuner for Option D/E: base color picker plus auto-derived highlight/shadow via sliders (highlight lift, shadow drop, saturation shift, hue nudge).
- Added `public/svgs/concepts/resource-palette-board-preview.html` as a focused C/D palette preview page with a dropdown selector and a `Show number tokens` checkbox.
- Added a full 19-hex board preview to the new page (3-4-5-4-3 rows) so palette changes can be judged in board context, not only per-resource tiles.
- Updated that page's number token rendering to match `app/board-editor/Tile.js` proportions/offset behavior (rounded square chip, size ratio, and pip layout) instead of the earlier circular placeholder.
- Fixed token scale on the board preview by switching to a viewBox-based SVG token overlay so number/pip sizing stays visually consistent with tile scaling.
- Kept the outer tile border fixed at `#fbbf24` across all previews and varied only inner gradients/seam separators to match the requested comparison constraints.

## Status (2026-02-13)
- Added `public/svgs/concepts/tile_lumber_final.svg` as a new forest/lumber concept tile matching the `tile_ore_final.svg` hex geometry and cream border style.
- Built the inner art from layered green triangular facets to mirror the provided mountain-forest reference image.
- Added `public/svgs/concepts/tile_template.svg` as a first-pass canonical tile template (`346x400` viewBox) with a hard-edge border, shared inner hex clip, and replaceable layered facet placeholders for resource-specific variants.

## Status (2026-02-12)
- Added smooth width transitions for opponent resource/dev card stacks in `app/catana/components/OpponentPlayerBox.js` to prevent jumpy growth when counts change.
- Added regression coverage in `app/catana/__tests__/OpponentPlayerBox.test.js` to lock the transition class usage.

## Status (2026-02-12)
- Added game-log award events for Longest Road and Largest Army ownership changes in `app/catana/Moves.js`.
- Added log text formatting for `award:longestRoad` and `award:largestArmy` in `app/catana/utils/gameText.js`.
- Added/updated app tests for award log wiring and text formatting.
- Checked off the completed double-click zoom toggle item in `TODOS.txt`.

## Status (2026-02-12)
- Added `doubleClick` toggle mode support in the local `react-zoom-pan-pinch` copy so double-click can zoom in from base scale and reset back to initial scale when already zoomed in.
- Enabled `doubleClick={{ mode: "toggle" }}` on Catana `GameScreen` and board-editor `TransformWrapper` instances.
- Added unit coverage for the new mode resolver in `react-zoom-pan-pinch/core/double-click/double-click.logic.test.ts`.

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

## Status (2026-01-21)
- Dice roll audio now uses 5 shuffled variants with subtle pitch/volume jitter.
- Moved dice roll mp3 assets to `public/sounds/` for `/sounds/*` serving.
## Status (2026-01-21)
- Improved city upgrade hover/placement animation + sound.
- Cleared city hover immediately on placement click to avoid double-ghosting during the drop.
- City upgrade overlap suppression now keys off active `placePiece` effects to avoid showing a city/settlement under the drop.
- City placement overlay now renders above roads during the drop animation.
- Added placement-start turn-start cue logic with tests to avoid double-dings on snake turns.
- Split placement layers so road drops stay behind buildings while city drops stay above roads.

## Status (2026-01-22)
- Added game-over log formatting plus a one-time `game:over` log entry from moves.
- Added game-over modal + postgame overlay scaffolding and wired GameScreen to show them on win.
- Added game-over audio cues (win/lose) and guarded `ctx.activePlayers` access in Board.
- Revealed full player state when `G.core.gameOver` is set so final VP/dev-card scores display correctly for all players.
- Restyled game-over modal/postgame overlay to the blue/glass theme and added winner confetti via canvas-confetti.

## Status (2026-01-28)
- Added a failing test guard to require a "Results" label in the game-over screen source.
- Added a reusable glass pill button and top-right Results control to reopen the game-over modal.

## Status (2026-02-04)
- Added a Catana-styled lobby UI under `app/catana/lobby/` with room list + join/create flows.
- Added a Catana frontend design skill doc at `docs/agent/skills/catana-brand/SKILL.md` to codify the sky+glass visual recipes for new pages (lobby/blog/marketing).

## Status (2026-02-06)
- Gated `DEBUG_*` moves in `app/catana/Game.js` so they are only exposed when `NODE_ENV !== "production"`.
- Added `app/catana/__tests__/Game.debugMoves.test.js` to assert debug moves are hidden in production and available in non-production.
- Removed legacy `app/catana/game/*` files, moved active exports to `app/catana/types.js`, and updated Catana imports to the new path.
- Removed the stale deleted-file include from `tsconfig.json`.
- Fixed `app/catana/__tests__/Game.placementPhase.test.js` by passing `{ G }` into `turnOrder.playOrder(...)`; full root Vitest now passes (71 files / 267 tests).
- Updated root `verify` script to run full repo tests via `pnpm exec vitest run` (instead of only `game-core` tests) before lint.
- Fixed stale build-placement UI state after turn handoff: `GameScreen` now clears local `playerAction` when the viewer is no longer eligible to build (phase/stage/player mismatch).
- Added `app/catana/utils/playerAction.js` + `app/catana/__tests__/playerAction.test.js` to codify reset rules (including turn-end while placing road/city).
- Spacebar end-turn now mirrors the button path by clearing local build intent before calling `moves.endTurn()`.

## Status (2026-02-06)
- Added a standalone Settlex RL harness under `ai/pufferlib/` that uses `game-core` as-is (no engine code changes required).
- Added `ai/pufferlib/js/settlexEnv.cjs`, a deterministic self-play env with fixed discrete action space and per-step action masking over placement/main/robber flows.
- Added `ai/pufferlib/js/engine_host.cjs`, a JSONL stdio bridge so Python can step/reset/spec the JS engine wrapper.
- Added JS tests: `ai/pufferlib/js/__tests__/settlexEnv.test.js` and `ai/pufferlib/js/__tests__/engineHost.test.js`.
- Added Python integration in `ai/pufferlib/python/settlex_puffer/`:
  - Gym wrapper (`env.py`) + host client (`bridge.py`)
  - masked policy (`policy.py`) that enforces legal-action logits
  - smoke runner (`smoke.py`) and PufferLib train entrypoint (`train.py`)
- Added packaging + docs: `ai/pufferlib/python/pyproject.toml` and `ai/pufferlib/README.md`.
- Verified end-to-end:
  - JS tests pass for env/host
  - random-policy smoke rollout runs
  - short CPU PufferLib train run completes and writes checkpoints to a run directory

## Status (2026-02-06)
- Expanded RL action space with explicit dev-card play actions in `ai/pufferlib/js/settlexEnv.cjs`:
  - `playDev:knight`
  - `playDev:roadBuilding`
  - `playDev:monopoly:<resource>`
  - `playDev:yearOfPlenty:<resource>+<resource>`
- Added dev-card flow tests in `ai/pufferlib/js/__tests__/settlexEnv.devCards.test.js` covering mask exposure and phase transitions.
- Added checkpoint evaluation script `ai/pufferlib/python/settlex_puffer/evaluate.py` and CLI entrypoint `settlex-puffer-eval` for win-rate tracking vs random opponents.
- Re-verified smoke + short CPU training run after dev-card action expansion.

## Status (2026-02-06)
- Updated Puffer trainer defaults in `ai/pufferlib/python/settlex_puffer/train.py` to avoid common startup failures (`minibatch_size` now defaults to `128`).
- Added a guard that clamps `minibatch_size` when `batch_size=auto` so short/local runs do not trip `batch_size < minibatch_size` errors.
- Re-verified short CPU training run and checkpoint evaluation after the trainer config fix.

## Status (2026-02-06)
- Added server-side Puffer bot adapter plumbing:
  - `server/bots/pufferStateAdapter.js` maps live `G/ctx` -> policy observation/mask and maps policy actions -> boardgame move payloads.
  - `server/bots/PufferPolicyClient.js` runs a persistent Python JSONL inference worker.
  - `server/bots/pufferBotManager.js` manages bot seat detection, policy inference, and random/legal fallback.
- Added Python inference worker `ai/pufferlib/python/settlex_puffer/infer_server.py` and script entrypoint `settlex-puffer-infer`.
- Integrated bot dispatch path in `server/server.js` with multi-step move support (`buildAutoMoveAction` now accepts args) and bot-seat caching from lobby metadata.
- Extended `TimerManager` to schedule fast `autoBot` ticks for bot-controlled stages and to re-schedule when state updates in the same turn/stage.
- Added lobby UX to fill open seats with bots in `app/catana/lobby/[matchID]/MatchPageClient.js` using `data.bot = "puffer"`.
- Added tests:
  - `server/__tests__/pufferStateAdapter.test.js`
  - `server/__tests__/pufferBotManager.test.js`
  - `app/catana/__tests__/MatchPageClient.botFill.test.js`
  - updates in `server/__tests__/dispatchUtils.test.js` and `server/__tests__/TimerManager.test.js`

## Status (2026-02-06)
- Added a direct main lobby CTA in `app/catana/lobby/LobbyPageClient.js`: **Play Against Bot**.
- New flow creates a 2-player match, joins the human to seat `0`, auto-joins seat `1` as `[BOT] Puffer` with `data.bot = "puffer"`, and routes to the match page.
- Added source-level regression test `app/catana/__tests__/LobbyPageClient.playVsBot.test.js`.

## Status (2026-02-06)
- Enabled duel rules by default for 2-player games in `app/catana/Game.js`:
  - `victoryPointsToWin = 15`
  - `discardLimit = 9`
- Added explicit ruleset resolution in setup with optional `setupData.rulesetId` override (`"duel"` or `"standard"`).
- 3+ player games continue to default to standard rules (`10 VP`, discard limit `7`).
- Added setup coverage in `app/catana/__tests__/Game.boardConfig.test.js` for both 2-player duel default and 3+ player standard default.

## Status (2026-02-11)
- Added explicit server-only game config at `server/serverGame.js` (`ServerCatan`) with debug moves and effects plugin disabled.
- Refactored `app/catana/Game.js` to export `createCatanGame(...)` and keep `Catan` as the client/default config.
- Removed global mutable `STATIC_GRAPH` usage from `app/catana/Game.js` setup flow.
- Added dispatch extraction `server/dispatch/dispatchMatchUpdate.js` with top-level error handling and reduced DB reads (initial + final sync fetch instead of per planned move).
- Added server regression tests:
  - `server/__tests__/serverGameConfig.test.js`
  - `server/__tests__/dispatchMatchUpdate.test.js`
- Added shared board wiring helpers in `game-core/src/board/hexWiring.ts` and reused them in:
  - `game-core/src/board/generateBoard.ts`
  - `game-core/src/board/generateBoardClass.ts`
- Added board wiring tests in `game-core/src/board/hexWiring.test.ts`.
- Added render performance guards and updates:
  - `app/catana/GameScreen.js`: memoized player-view map + timer ticker only when timer is visible.
  - `app/catana/components/PlayerActionContainer.js`: precomputed resource counts (removed repeated per-resource filters).
  - `app/catana/components/GameLogPanel.js`: memoized formatted log entries.
  - `app/catana/__tests__/renderPerfGuards.test.js`.
- Expanded `game-core` rule coverage for critical failure paths:
  - `game-core/src/rules/turnFlow.test.ts`
  - `game-core/src/rules/trading.test.ts`
  - `game-core/src/rules/devCards.test.ts`

## Status (2026-02-11, hotfix)
- Fixed server crash during second placement settlement when resource distribution effects emitted:
  - `server/serverGame.js` now keeps effects plugin enabled (`includeEffects: true`) so move contexts include `effects`.
  - `app/catana/Moves.js` now treats effect emits as optional (`effects?.roll?.(...)`, `effects?.distributeCardsFromTile?.(...)`) to prevent hard crashes if plugin wiring is absent.
- Added regression coverage:
  - `app/catana/__tests__/Moves.resourceDistribution.test.js` now verifies `placeSettlement` does not throw when `effects` is missing.
  - `server/__tests__/serverGameConfig.test.js` now asserts server config retains plugin wiring while still hiding debug moves.

## Status (2026-02-11, puffer 1v1 alignment)
- Fixed Puffer bot stage/mode mismatch that could cause illegal `rollDice` attempts during robber resolution after knight play:
  - `server/bots/pufferStateAdapter.js` now infers a mode override from boardgame stages and maps `main:moveRobber` -> `robberMove` and `main:robberDiscard` -> `robberDiscard`.
  - Regression test added in `server/__tests__/pufferStateAdapter.test.js` to lock behavior when `ctx.activePlayers[currentPlayer] === "moveRobber"` while `G.core.turn.phase === "preRoll"`.
- Updated RL env ruleset selection in `ai/pufferlib/js/settlexEnv.cjs`:
  - Added `rulesetId` option (`"auto" | "duel" | "standard"`).
  - Default `rulesetId: "auto"` now picks duel rules for 2-player (`15 VP`, discard `9`) and standard for 3-4 players.
  - Env spec now surfaces resolved `rulesetId`.
- Added RL env regression coverage in `ai/pufferlib/js/__tests__/settlexEnv.test.js`:
  - 2-player defaults to duel rules.
  - explicit `rulesetId: "standard"` keeps standard rules in 2-player env.
- Fixed placement actor inference in `server/bots/pufferStateAdapter.js` for lobbies where placement starts with an offset `ctx.turn`:
  - Adapter now anchors placement index to `ctx.currentPlayer` and uses turn proximity only as a tie-break.
  - Prevents immediate fallback `autoPlaceSettlement/autoPlaceRoad` on the bot’s second placement turn.
  - Regression test added in `server/__tests__/pufferStateAdapter.test.js`.

## Status (2026-02-11, puffer docs)
- Expanded `ai/pufferlib/writeup.md` with per-section “Why this / Tradeoffs / Alternatives” callouts to make the blogpost draft explain decision-making, not just the implementation steps.

## Status (2026-02-11, puffer encoder + search upgrade)
- Upgraded RL observation schema to `v2` in `ai/pufferlib/js/settlexEnv.cjs` with explicit board-layout features:
  - Per-land-tile: resource one-hot, number one-hot, pip weight, robber flag.
  - Per-node: port one-hot, adjacent pip-by-resource totals, total pips, settlement/city occupancy one-hots.
  - Per-edge: ownership one-hot (unowned + per-player owner).
- Added schema/action metadata in env spec:
  - `observationLayout`
  - `observationSchemaHash`
  - `actionSpaceHash`
  - propagated through `server/bots/pufferStateAdapter.js` so serving uses the exact same schema contract.
- Added factorized relational policy `ai/pufferlib/python/settlex_puffer/policy_factorized.py` and wired it into:
  - training (`ai/pufferlib/python/settlex_puffer/train.py`)
  - checkpoint evaluation (`ai/pufferlib/python/settlex_puffer/evaluate.py`)
  - inference worker (`ai/pufferlib/python/settlex_puffer/infer_server.py`)
- Added inference modes for search support:
  - `score_actions` (masked logits + value)
  - `eval_batch` (value-only batched scoring)
- Added optional expectimax-style action search for live bots:
  - new module `server/bots/pufferSearch.js`
  - manager wiring + env vars in `server/bots/pufferBotManager.js`:
    - `SETTLEX_PUFFER_SEARCH`
    - `SETTLEX_PUFFER_SEARCH_BUDGET_MS`
    - `SETTLEX_PUFFER_SEARCH_TOPK`
    - `SETTLEX_PUFFER_SEARCH_MAX_DEPTH`
- Fixed a factorized-policy indexing bug (duplicate settlement/city node labels could overflow node token indices) and added regression coverage in `ai/pufferlib/python/tests/test_policy_factorized.py`.
- Verification:
  - `pnpm exec vitest run ai/pufferlib/js/__tests__/settlexEnv.test.js server/__tests__/pufferStateAdapter.test.js server/__tests__/pufferBotManager.test.js`
  - `python -m unittest discover -s ai/pufferlib/python/tests -p 'test_policy_factorized.py'`
  - short smoke train/eval on factorized policy path completed successfully.

## Status (2026-02-11, puffer writeup v2)
- Added a follow-up blogpost-style writeup capturing the V2 changes and learnings:
  - `ai/pufferlib/writeup-v2.md`

## Status (2026-02-12, bot pregame + avatar polish)
- Fixed bot pregame readiness delay for bot-controlled seats:
  - `server/timers/TimerManager.js` now schedules `autoBot` for unready bot players during `preGame:waiting` (not only `ctx.currentPlayer`), so bot seats auto-submit `readyUp`.
  - `server/bots/pufferBotManager.js` now returns `readyUp` during `preGame:waiting`.
- Updated bot avatar metadata to robot emoji:
  - `app/catana/lobby/LobbyPageClient.js` (`Play Against Bot` flow) now joins bot seat with `emoji: "🤖"`.
  - `app/catana/lobby/[matchID]/MatchPageClient.js` (`Fill Open Seats With Bots`) now joins bot seats with `emoji: "🤖"`.
- Added/updated regression coverage:
  - `server/__tests__/TimerManager.test.js`
  - `server/__tests__/pufferBotManager.test.js`
  - `app/catana/__tests__/LobbyPageClient.playVsBot.test.js`
  - `app/catana/__tests__/MatchPageClient.botFill.test.js`

## Status (2026-02-12, puffer placement fallback fix)
- Fixed search-time mutation bug that caused bot policy fallback to random legal actions during placement with errors like:
  - `TypeError: Cannot add property <edgeId>, object is not extensible`
- Root cause:
  - `server/bots/pufferStateAdapter.js` hydrated `env.state` with direct `G.core` reference.
  - In expectimax search, env simulation mutates state (`roadsByEdgeId`, buildings, etc.), but boardgame-provided state objects can be frozen/non-extensible.
- Fix:
  - `server/bots/pufferStateAdapter.js` now clones `G.core` when hydrating adapter env state.
- Regression coverage:
  - `server/__tests__/pufferStateAdapter.test.js` adds `hydrates a mutable core clone for search simulation`.

## Status (2026-02-13, tile template base)
- Added canonical base tile template at `public/svgs/concepts/tile_template_base.svg`:
  - fixed dimensions `width="346" height="400" viewBox="0 0 346 400"`.
  - hard-edged hex border ring with solid flat fill `#fbbf24` (no border gradient).
  - reusable inner clip contract via `tileInnerHex`, `tileInnerClip`, and clipped `tileArt`.
- Added spec note `docs/plans/2026-02-13-tile-template-base-spec.md` documenting:
  - border thickness decision,
  - border color rationale with alternatives,
  - inner clip geometry contract,
  - Catana style fit rationale.

## Status (2026-02-13, classic tileset shell concept)
- Added a competitor-inspired but Catana-tuned classic tileset shell:
  - `public/svgs/concepts/tile_template_classic.svg`
  - keeps canonical `346x400` geometry and shared flat amber outer mould (`#fbbf24`),
  - adds per-tileset inner surface stack (base radial fill + two inner ring bands + vignette),
  - includes centered badge container with replaceable `tileBadgeIcon` group.
- Added a concrete ore example built on the same shell:
  - `public/svgs/concepts/tile_ore_classic.svg`
  - silver body/ring palette and simple geometric rock badge icon.
- Adjusted classic badge placement upward (translate Y `-48`) in both files so the bottom-middle area stays clear for number tokens.
- Refined ore classic tile per feedback:
  - removed circular badge plate (fill ring + stroke ring + highlight ellipse),
  - kept only the raised ore icon group so the mark sits directly on tile art.
- Added ore badge readability variants for review (same tile body, different icon separation treatments):
  - `public/svgs/concepts/tile_ore_classic_v2_stroke.svg` (bold dark silhouette outline + light edge),
  - `public/svgs/concepts/tile_ore_classic_v3_keyline.svg` (subtle shadow + light keyline),
  - `public/svgs/concepts/tile_ore_classic_v4_plate.svg` (angular non-circular backplate + stroke).
- Added ring seam-separator mockups on the keyline ore variant to test border articulation:
  - `public/svgs/concepts/tile_ore_classic_v3_keyline_seam_soft.svg` (subtle seam),
  - `public/svgs/concepts/tile_ore_classic_v3_keyline_seam_strong.svg` (high-contrast seam).
- Added first classic non-badge resource set using the strong seam treatment:
  - `public/svgs/concepts/tile_wheat_classic_v1_seam_strong.svg`
  - `public/svgs/concepts/tile_sheep_classic_v1_seam_strong.svg`
  - `public/svgs/concepts/tile_lumber_classic_v1_seam_strong.svg`
  - `public/svgs/concepts/tile_brick_classic_v1_seam_strong.svg`
- Each tile keeps the shared outer mould (`#fbbf24`), removes the centered badge/emblem group, and uses resource-specific body/ring/seam palettes.

## Status (2026-02-14, puffer blog roadmap restructure)
- Reworked `docs/plans/2026-02-14-puffer-4-part-roadmap.md` from a fixed 4-part framing to an expanded series roadmap with a clearer narrative arc:
  - Part 1 baseline,
  - Part 2 representation upgrade,
  - Part 3 evaluation discipline,
  - Part 4 reward + episode control,
  - Part 5 imitation warm-start,
  - Part 6 search-augmented inference,
  - Part 7 local throughput,
  - Part 8 cloud scaling,
  - Part 9 native simulator decision.
- Added an explicit "Narrative Rule" to track progress by one primary metric per post (strength, reliability, sample efficiency, SPS, or cost), so posts remain empirical even when win-rate gains are not immediate.
- Added a `Narrative Handoff (Open -> Close)` section with concrete opening problem and closing lead-in lines for Parts 1-9 to make post-to-post transitions explicit during writing.
- Refined Part 1 -> Part 2 framing to avoid unsupported "plateau" claims:
  - Part 1 should close on observed qualitative representation limits (e.g., weak placement intuition), unless quantitative plateau evidence exists.
