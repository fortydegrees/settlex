# Architecture Refactor Reference - 2026-06-13

This note summarizes the large Catana architecture refactor on
`codex/home-demo-board-cleanup-20260610`, after
`origin/codex/home-demo-board-cleanup-20260610`. It is a reference for future
agents and maintainers, not a full step-by-step changelog. The detailed working
log for the pass was `/tmp/refactor-settlex.md`.

## Outcome

The refactor was mostly extraction and boundary cleanup. Game behavior was
intended to remain stable while high-change areas were split into named,
testable modules.

The main result:

- `Game.js` is now the boardgame.io shell for phases, setup wiring, and move
  registration, not the owner of setup, dev-scenario, and masking details.
- `Moves.js` is now a compatibility export surface. New work should import
  from the focused `app/catana/moves/*` modules directly.
- `Board.js` remains the 2D playfield renderer, but pure build/preview target
  derivation now lives in `app/catana/utils/*`.
- `GameScreen.js` remains the live game screen orchestrator, but several pure
  display, timer, effect-payload, and command-state derivations now live in
  small helpers.
- Server timeout and bot fallback stage classification now share one stage
  policy module.
- Focused verification lanes exist so UI-adjacent work does not have to start
  from full `pnpm verify`.

## New Boundaries

### Game Setup

Setup concerns moved from `app/catana/Game.js` into:

- `app/catana/gameSetup/initialState.js`
- `app/catana/gameSetup/devScenarios.js`
- `app/catana/gameSetup/playerView.js`

Use these files for mode/ruleset/board setup, deterministic initial state,
dev-scenario merge and context seeding, and player-view masking. Avoid adding
more setup logic directly to `Game.js`.

### Move Ownership

Move behavior is split under `app/catana/moves/`:

- `buildMoves.js` - road, settlement, city placement and buildability wrappers
- `turnMoves.js` - dice, discard, end turn, forced turn actions
- `robberMoves.js` - robber placement, victim selection, forced robber moves
- `devCardMoves.js` - buy, start, resolve, cancel, and road-building dev cards
- `tradeMoves.js` - maritime trade
- `preGameMoves.js` - ready/start flow
- `forcedPlacementMoves.js` - placement timeout actions
- `terminalMoves.js` - resign, disconnect forfeit, idle forfeit
- `debugMoves.js` - dev-only scenario capture/load moves
- `awardLogging.js` and `resourceLogging.js` - game-log/effect payload helpers
- `stageControl.js`, `randomChoice.js`, and `resourceCounts.js` - small shared
  move utilities
- `legacyMoves.js` - compatibility-only legacy exports

Prefer direct imports from these modules. Keep `Moves.js` as a compatibility
surface unless there is a deliberate migration plan to remove it.

### Server Stage Policy

`server/stagePolicy.js` owns stage classification used by timers and bots:

- stage key resolution
- timeout move selection
- timeout duration
- bot-action stage checks
- bot fallback move selection

`server/timers/TimerManager.js` and `server/bots/pufferBotManager.js` should not
grow separate copies of stage policy.

`server/runtimeConfig.js` owns game and lobby port resolution. Keep isolated
smoke-test ports there rather than hardcoding port parsing in server startup.

### Board Derivation

`Board.js` should focus on rendering, hover/presentation state, DOM target
registration, and effect listeners.

Pure target derivation lives in:

- `app/catana/utils/boardPreviewTargets.js`
- `app/catana/utils/boardBuildInteraction.js`

Do not reintroduce mirrored state for values derivable from `G`, `ctx`,
`playerID`, and `playerAction`. `buildableRoads` was intentionally changed to
memoized derived data.

### Game Screen Derivation

`GameScreen.js` still owns the live screen, event handlers, effects wiring, and
render assembly. The extracted helpers are:

- `app/catana/utils/gameScreenDisplayModel.js`
- `app/catana/utils/timerSnapshot.js`
- `app/catana/utils/cardTransferPayloads.js`
- `app/catana/utils/gameScreenCommandState.js`
- `app/catana/dev/sandbox/effectPayloads.js`

Future changes should keep pure formulas in helpers and leave `GameScreen.js`
for orchestration. Good next slices are effect-runner lifecycle cleanup,
presence/timer polling cleanup, and dev-sandbox event bridge cleanup.

## Verification Policy

Use focused tests for the touched boundary and a live sandbox smoke for
UI/effect-facing Catana work.

Useful lanes added in this pass:

- `pnpm run test:logic`
- `pnpm run test:server`
- `pnpm run test:catana`

Root Vitest excludes linked worktrees and generated `game-core/dist` output to
avoid duplicate discovery.

Use broad `pnpm verify` for release, PR closeout, broad engine-risk work, or
when focused checks do not cover the touched surface.

## What This Enables

New base-game modes are now mostly a matter of composing `modeId`, `rulesetId`,
and `boardConfigId`, plus focused tests. Full expansions such as Seafarers or
Cities and Knights still need new rule/state primitives, but the current
boundaries are clean enough to start that work without another broad refactor.

A 3D renderer can be explored behind the board/playfield boundary. Keep `G`,
`ctx`, moves, rules, HUD, server authority, and the existing effects bus intact;
swap or parallelize only the playfield renderer first, ideally in the Catana
dev sandbox.

## Remaining Architecture Candidates

These were intentionally deferred:

- `GameScreen.js` effect runner factories, presence/timer polling, and
  dev-sandbox event bridge
- `LobbyPageClient.js` workflow-controller extraction for identity restoration,
  matchmaking, friend challenges, custom/scenario starts, polling, and local
  storage
- Gradual replacement of brittle source-string tests with direct helper tests
  whenever a boundary is touched

Do not treat these as mandatory before product work. Use them when a feature or
bugfix already touches the area.
