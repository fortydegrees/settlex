# PROGRESS

## Status (2026-06-13, dev-sandbox effect payload helpers)
- Extracted Catana dev-sandbox effect payload shaping into
  `app/catana/dev/sandbox/effectPayloads.js`.
- `GameScreen` still owns the browser event listener lifecycle, but delegates
  dev-card play, robber-move, and award-claim sandbox payload construction to
  the helper.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/devSandboxEffectPayloads.test.js --reporter=dot` (red: missing `effectPayloads`)
- `pnpm exec vitest run app/catana/__tests__/devSandboxEffectPayloads.test.js app/catana/__tests__/GameScreen.devCardPlay.test.js app/catana/__tests__/GameScreen.devCardReveal.test.js app/catana/__tests__/GameScreen.diceEffects.test.js --reporter=dot`
- `pnpm exec vitest run app/catana/__tests__/GameScreen.*.test.js app/catana/__tests__/devSandboxEffectPayloads.test.js --reporter=dot`
- `pnpm exec eslint app/catana/GameScreen.js app/catana/dev/sandbox/effectPayloads.js app/catana/__tests__/devSandboxEffectPayloads.test.js app/catana/__tests__/GameScreen.devCardPlay.test.js app/catana/__tests__/GameScreen.devCardReveal.test.js app/catana/__tests__/GameScreen.diceEffects.test.js`
- `git diff --check`
- Live smoke: `http://127.0.0.1:3100/catana/dev/sandbox?viewportWall=1`
  rendered board tiles and game-feed content; captured console had no errors.

## Status (2026-06-13, GameScreen display model helper)
- Extracted `GameScreen` player/display derivation into
  `app/catana/utils/gameScreenDisplayModel.js`.
- The helper now owns merged player identity maps, effective in-game colors,
  player view models, winner copy, scoreboard rows, log player map, and
  postgame summary rows.
- `app/catana/GameScreen.js` now delegates those screen-facing model concerns
  to one memoized helper call while keeping render/effect orchestration in the
  component.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/gameScreenDisplayModel.test.js --reporter=dot` (red: missing `gameScreenDisplayModel`)
- `pnpm exec vitest run app/catana/__tests__/gameScreenDisplayModel.test.js app/catana/__tests__/GameScreen.statusPresentation.test.js app/catana/__tests__/GameScreen.playerColors.test.js app/catana/__tests__/GameScreen.gameOver.test.js app/catana/__tests__/GameOverModal.test.js app/catana/__tests__/PostgameOverlay.test.js --reporter=dot`
- `pnpm exec vitest run app/catana/__tests__/GameScreen.*.test.js app/catana/__tests__/gameScreenDisplayModel.test.js --reporter=dot`
- `pnpm exec eslint app/catana/GameScreen.js app/catana/utils/gameScreenDisplayModel.js app/catana/__tests__/gameScreenDisplayModel.test.js app/catana/__tests__/GameScreen.gameOver.test.js app/catana/__tests__/GameScreen.playerColors.test.js`
- `git diff --check`
- Live smoke: `http://127.0.0.1:3100/catana/dev/sandbox?viewportWall=1`
  rendered board tiles and game-feed content; captured console had no errors.

## Status (2026-06-13, board underlay fetch priority)
- Fixed React DOM prop casing for eager board-underlay images in
  `app/catana/BoardUnderlay.js` and
  `app/catana/lobby/[matchID]/LiveMatchLoadingShell.js`.
- This removes the live sandbox React warning caused by lowercase
  `fetchpriority`.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/BoardUnderlay.render.test.js app/catana/__tests__/Board.layering.test.js app/catana/__tests__/LiveMatchLoadingShell.render.test.js --reporter=dot`
- `pnpm exec eslint app/catana/BoardUnderlay.js 'app/catana/lobby/[matchID]/LiveMatchLoadingShell.js' app/catana/__tests__/BoardUnderlay.render.test.js app/catana/__tests__/Board.layering.test.js app/catana/__tests__/LiveMatchLoadingShell.render.test.js`
- `git diff --check`
- Live smoke: `http://127.0.0.1:3100/catana/dev/sandbox?viewportWall=1`
  rendered board/feed content; captured console had no errors.

## Status (2026-06-13, board preview target helpers)
- Extracted Board robber/build preview target derivation into
  `app/catana/utils/boardPreviewTargets.js`.
- Added focused coverage in `app/catana/__tests__/boardPreviewTargets.test.js`
  for valid robber target filtering, magnetic robber targets, land preview tile
  centers, and magnetic build targets.
- `app/catana/Board.js` now delegates preview-target data shaping to the helper
  while retaining rendering and event-handler ownership.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/boardPreviewTargets.test.js --reporter=dot` (red: missing `boardPreviewTargets`)
- `pnpm exec vitest run app/catana/__tests__/boardPreviewTargets.test.js app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/Board.robberPlacementUx.test.js app/catana/__tests__/RobberPlacementPreview.test.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js app/catana/__tests__/renderPerfGuards.test.js --reporter=dot`
- `pnpm exec eslint app/catana/Board.js app/catana/utils/boardPreviewTargets.js app/catana/__tests__/boardPreviewTargets.test.js app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/Board.robberPlacementUx.test.js app/catana/__tests__/RobberPlacementPreview.test.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js app/catana/__tests__/renderPerfGuards.test.js`
- `git diff --check`

## Status (2026-06-13, timer snapshot helpers)
- Extracted GameScreen timer snapshot normalization and remaining-time math into
  `app/catana/utils/timerSnapshot.js`.
- Added focused coverage in `app/catana/__tests__/timerSnapshot.test.js` for
  server-delay calculation, clock-skew clamping, missing snapshots, and elapsed
  countdown clamping.
- `app/catana/GameScreen.js` now uses the helper for both bgio-provided timer
  snapshots and fetch-seeded timer snapshots.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/timerSnapshot.test.js --reporter=dot` (red: missing `timerSnapshot`)
- `pnpm exec vitest run app/catana/__tests__/timerSnapshot.test.js app/catana/__tests__/GameScreen.statusPresentation.test.js app/catana/__tests__/renderPerfGuards.test.js app/catana/__tests__/gameStatus.test.js --reporter=dot`
- `pnpm exec eslint app/catana/GameScreen.js app/catana/utils/timerSnapshot.js app/catana/__tests__/timerSnapshot.test.js app/catana/__tests__/GameScreen.statusPresentation.test.js app/catana/__tests__/renderPerfGuards.test.js app/catana/__tests__/gameStatus.test.js`
- `git diff --check`

## Status (2026-06-13, card-transfer payload helpers)
- Extracted GameScreen card-transfer payload builders for dev-card purchases,
  maritime trade, discard, and robber steal animations into
  `app/catana/utils/cardTransferPayloads.js`.
- Added focused pure-helper coverage in
  `app/catana/__tests__/cardTransferPayloads.test.js`.
- `app/catana/GameScreen.js` now imports the transfer builders instead of
  owning payload shape inline.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/cardTransferPayloads.test.js --reporter=dot` (red: missing `cardTransferPayloads`)
- `pnpm exec vitest run app/catana/__tests__/cardTransferPayloads.test.js app/catana/__tests__/GameScreen.devCardReveal.test.js app/catana/__tests__/GameScreen.devCardPlay.test.js --reporter=dot`
- `pnpm exec eslint app/catana/GameScreen.js app/catana/utils/cardTransferPayloads.js app/catana/__tests__/cardTransferPayloads.test.js app/catana/__tests__/GameScreen.devCardReveal.test.js app/catana/__tests__/GameScreen.devCardPlay.test.js`
- `git diff --check`

## Status (2026-06-13, move export surface)
- Extracted the remaining pre-game readiness/start moves, forced placement
  timeout moves, and maritime trade move from `app/catana/Moves.js` into
  `app/catana/moves/preGameMoves.js`,
  `app/catana/moves/forcedPlacementMoves.js`, and
  `app/catana/moves/tradeMoves.js`.
- Moved unused legacy compatibility exports into
  `app/catana/moves/legacyMoves.js`.
- `app/catana/Game.js` no longer imports from the generic `Moves.js`
  aggregator; `Moves.js` is now only a compatibility export surface for older
  imports.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/preGameMoves.test.js app/catana/__tests__/Moves.autoTimeouts.test.js app/catana/__tests__/Moves.trade.test.js --reporter=dot` (red: missing `preGameMoves`, `forcedPlacementMoves`, and `tradeMoves`)
- `pnpm exec vitest run app/catana/__tests__/Moves.compatExports.test.js app/catana/__tests__/preGameMoves.test.js app/catana/__tests__/Moves.autoTimeouts.test.js app/catana/__tests__/Moves.trade.test.js app/catana/__tests__/Moves.gameLog.test.js app/catana/__tests__/Game.readyUpStaleState.test.js app/catana/__tests__/preGameReady.test.js app/catana/__tests__/Game.debugMoves.test.js server/__tests__/serverGameConfig.test.js server/__tests__/stagePolicy.test.js server/__tests__/TimerManager.test.js server/__tests__/pufferBotManager.test.js --reporter=dot`
- `pnpm exec eslint app/catana/Moves.js app/catana/Game.js app/catana/moves/preGameMoves.js app/catana/moves/forcedPlacementMoves.js app/catana/moves/tradeMoves.js app/catana/moves/legacyMoves.js app/catana/__tests__/Moves.compatExports.test.js app/catana/__tests__/preGameMoves.test.js app/catana/__tests__/Moves.autoTimeouts.test.js app/catana/__tests__/Moves.trade.test.js app/catana/__tests__/Moves.gameLog.test.js app/catana/__tests__/Game.readyUpStaleState.test.js app/catana/__tests__/preGameReady.test.js app/catana/__tests__/Game.debugMoves.test.js server/__tests__/serverGameConfig.test.js server/__tests__/stagePolicy.test.js server/__tests__/TimerManager.test.js server/__tests__/pufferBotManager.test.js`
- `git diff --check`

## Status (2026-06-13, dev-card move boundary)
- Extracted dev-card buy/start/confirm/auto-resolve/cancel/free-road move
  definitions from `app/catana/Moves.js` into
  `app/catana/moves/devCardMoves.js`.
- Updated `app/catana/Game.js` and dev-card tests to import the narrower
  dev-card boundary while preserving compatibility re-exports from `Moves.js`.
- `Moves.js` now retains only pre-game, auto-placement, steal placeholder, and
  maritime-trade move definitions plus compatibility exports for the split move
  modules.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/Moves.devCards.test.js --reporter=dot` (red: missing `devCardMoves`)
- `pnpm exec vitest run app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/Moves.gameLog.test.js app/catana/__tests__/Moves.robber.test.js app/catana/__tests__/Game.placementPhase.test.js app/catana/__tests__/Game.debugMoves.test.js server/__tests__/serverGameConfig.test.js --reporter=dot`
- `pnpm exec eslint app/catana/Moves.js app/catana/Game.js app/catana/moves/devCardMoves.js app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/Moves.gameLog.test.js app/catana/__tests__/Moves.robber.test.js app/catana/__tests__/Game.placementPhase.test.js app/catana/__tests__/Game.debugMoves.test.js server/__tests__/serverGameConfig.test.js`
- `git diff --check`

## Status (2026-06-13, turn move boundary)
- Extracted dice rolling, balanced dice draw, resource-distribution effect
  dispatch, end-turn handling, discard handling, and forced turn/discard moves
  from `app/catana/Moves.js` into `app/catana/moves/turnMoves.js`.
- Added `app/catana/moves/resourceCounts.js` for shared discard/trade resource
  count logging.
- Updated `app/catana/Game.js` and direct turn tests to import the narrower
  turn boundary while preserving compatibility re-exports from `Moves.js`.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/resourceCounts.test.js app/catana/__tests__/Moves.endTurn.test.js app/catana/__tests__/Moves.balancedDice.test.js app/catana/__tests__/Game.endTurn.test.js app/catana/__tests__/Moves.robber.test.js app/catana/__tests__/Moves.autoTimeouts.test.js --reporter=dot` (red: missing `turnMoves` and `resourceCounts`)
- `pnpm exec vitest run app/catana/__tests__/resourceCounts.test.js app/catana/__tests__/Moves.endTurn.test.js app/catana/__tests__/Moves.balancedDice.test.js app/catana/__tests__/Game.endTurn.test.js app/catana/__tests__/Moves.robber.test.js app/catana/__tests__/Moves.autoTimeouts.test.js --reporter=dot`
- `pnpm exec vitest run app/catana/__tests__/resourceCounts.test.js app/catana/__tests__/Moves.endTurn.test.js app/catana/__tests__/Moves.balancedDice.test.js app/catana/__tests__/Game.endTurn.test.js app/catana/__tests__/Moves.robber.test.js app/catana/__tests__/Moves.autoTimeouts.test.js app/catana/__tests__/Moves.gameLog.test.js app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/Game.placementPhase.test.js app/catana/__tests__/Game.debugMoves.test.js server/__tests__/serverGameConfig.test.js --reporter=dot`
- `pnpm exec eslint app/catana/Moves.js app/catana/Game.js app/catana/moves/turnMoves.js app/catana/moves/resourceCounts.js app/catana/moves/robberMoves.js app/catana/__tests__/resourceCounts.test.js app/catana/__tests__/Moves.endTurn.test.js app/catana/__tests__/Moves.balancedDice.test.js app/catana/__tests__/Game.endTurn.test.js app/catana/__tests__/Moves.robber.test.js app/catana/__tests__/Moves.autoTimeouts.test.js app/catana/__tests__/Moves.gameLog.test.js app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/Game.placementPhase.test.js app/catana/__tests__/Game.debugMoves.test.js server/__tests__/serverGameConfig.test.js`
- `git diff --check`

## Status (2026-06-13, robber move boundary)
- Extracted manual and forced robber movement, robber target candidacy,
  no-valid-tile skip handling, robber return-stage resolution, and shared stage
  control from `app/catana/Moves.js` into `app/catana/moves/robberMoves.js`
  and `app/catana/moves/stageControl.js`.
- Added `app/catana/moves/randomChoice.js` for deterministic forced-move
  selection shared by timeout moves and robber automation.
- Updated `app/catana/Game.js` and direct robber tests to import the narrower
  robber boundary while preserving compatibility re-exports from `Moves.js`.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/stageControl.test.js app/catana/__tests__/randomChoice.test.js app/catana/__tests__/Moves.robber.test.js --reporter=dot` (red: missing `robberMoves`, `stageControl`, and `randomChoice`)
- `pnpm exec vitest run app/catana/__tests__/stageControl.test.js app/catana/__tests__/randomChoice.test.js app/catana/__tests__/Moves.robber.test.js --reporter=dot`
- `pnpm exec vitest run app/catana/__tests__/stageControl.test.js app/catana/__tests__/randomChoice.test.js app/catana/__tests__/Moves.robber.test.js app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/Moves.gameLog.test.js app/catana/__tests__/Moves.balancedDice.test.js app/catana/__tests__/Moves.autoTimeouts.test.js app/catana/__tests__/Game.debugMoves.test.js server/__tests__/serverGameConfig.test.js --reporter=dot`
- `pnpm exec eslint app/catana/Moves.js app/catana/Game.js app/catana/moves/robberMoves.js app/catana/moves/randomChoice.js app/catana/moves/stageControl.js app/catana/__tests__/Moves.robber.test.js app/catana/__tests__/randomChoice.test.js app/catana/__tests__/stageControl.test.js app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/Moves.gameLog.test.js app/catana/__tests__/Moves.balancedDice.test.js app/catana/__tests__/Moves.autoTimeouts.test.js app/catana/__tests__/Game.debugMoves.test.js server/__tests__/serverGameConfig.test.js`
- `git diff --check`

## Status (2026-06-13, build move boundary)
- Extracted settlement/road/city placement moves and buildability helpers from
  `app/catana/Moves.js` into `app/catana/moves/buildMoves.js`.
- Updated `app/catana/Game.js`, `app/catana/Board.js`, and focused build tests
  to depend on the narrower build-move boundary while preserving compatibility
  re-exports from `Moves.js`.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/Moves.placePieceEffects.test.js app/catana/__tests__/Moves.placementLog.test.js app/catana/__tests__/Moves.resourceDistribution.test.js app/catana/__tests__/Game.placementPhase.test.js --reporter=dot` (red: missing `../moves/buildMoves`)
- `pnpm exec vitest run app/catana/__tests__/Moves.placePieceEffects.test.js app/catana/__tests__/Moves.placementLog.test.js app/catana/__tests__/Moves.resourceDistribution.test.js app/catana/__tests__/Game.placementPhase.test.js app/catana/__tests__/Moves.gameLog.test.js app/catana/__tests__/Moves.devCards.test.js --reporter=dot`
- `pnpm exec vitest run app/catana/__tests__/Board.passiveBuildHover.test.js app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/Board.activePlayers.test.js --reporter=dot`
- `pnpm exec eslint app/catana/Moves.js app/catana/moves/buildMoves.js app/catana/Game.js app/catana/Board.js app/catana/__tests__/Moves.placePieceEffects.test.js app/catana/__tests__/Moves.placementLog.test.js app/catana/__tests__/Moves.resourceDistribution.test.js app/catana/__tests__/Game.placementPhase.test.js app/catana/__tests__/Moves.gameLog.test.js app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/Board.passiveBuildHover.test.js app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/Board.activePlayers.test.js`
- `git diff --check`

## Status (2026-06-13, resource logging boundary)
- Extracted resource gain/shortage game-log helpers from `app/catana/Moves.js`
  into `app/catana/moves/resourceLogging.js`.
- Added direct coverage in `app/catana/__tests__/resourceLogging.test.js` for
  grouped resource gains and filtered shortages.
- Kept existing integration coverage for dice/resource distribution paths.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/resourceLogging.test.js --reporter=dot`
- `pnpm exec vitest run app/catana/__tests__/resourceLogging.test.js app/catana/__tests__/Moves.gameLog.test.js app/catana/__tests__/Moves.resourceDistribution.test.js --reporter=dot`
- `pnpm exec eslint app/catana/Moves.js app/catana/moves/resourceLogging.js app/catana/__tests__/resourceLogging.test.js app/catana/__tests__/Moves.gameLog.test.js app/catana/__tests__/Moves.resourceDistribution.test.js`
- `git diff --check`

## Status (2026-06-13, award logging boundary)
- Extracted award-change logging and longest-road award animation payload
  selection from `app/catana/Moves.js` into
  `app/catana/moves/awardLogging.js`.
- Added direct coverage in `app/catana/__tests__/awardLogging.test.js` for
  longest-road log/effect payloads and largest-army log behavior.
- Kept existing `Moves.gameLog.test.js` integration coverage for build/dev-card
  paths that call the award logger through normal moves.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/awardLogging.test.js --reporter=dot`
- `pnpm exec vitest run app/catana/__tests__/awardLogging.test.js app/catana/__tests__/Moves.gameLog.test.js --reporter=dot`
- `pnpm exec eslint app/catana/Moves.js app/catana/moves/awardLogging.js app/catana/__tests__/awardLogging.test.js app/catana/__tests__/Moves.gameLog.test.js`
- `git diff --check`

## Status (2026-06-13, terminal move boundary)
- Extracted terminal/forfeit moves from `app/catana/Moves.js` into
  `app/catana/moves/terminalMoves.js`.
- Extracted shared game-over logging into `app/catana/moves/gameOver.js` so
  normal moves and terminal moves use the same `maybeLogGameOver` helper
  without keeping terminal policy in the normal move module.
- Updated `Game.js` to import resign/disconnect/idle terminal moves from the
  terminal module while leaving exposure policy unchanged.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/Moves.resign.test.js app/catana/__tests__/Moves.gameLog.test.js --reporter=dot`
- `pnpm exec vitest run app/catana/__tests__/Moves.resign.test.js app/catana/__tests__/Moves.gameLog.test.js app/catana/__tests__/Game.debugMoves.test.js server/__tests__/serverGameConfig.test.js --reporter=dot`
- `pnpm exec eslint app/catana/Game.js app/catana/Moves.js app/catana/moves/gameOver.js app/catana/moves/terminalMoves.js app/catana/__tests__/Moves.resign.test.js app/catana/__tests__/Moves.gameLog.test.js app/catana/__tests__/Game.debugMoves.test.js server/__tests__/serverGameConfig.test.js`
- `git diff --check`

## Status (2026-06-13, player-view masking boundary)
- Extracted secret-state masking from `app/catana/Game.js` into
  `app/catana/gameSetup/playerView.js`.
- Added direct helper coverage in
  `app/catana/__tests__/playerViewMasking.test.js` while keeping the existing
  `Catan.playerView` integration coverage in `stateMasking.test.js`.
- `Game.js` now wires `playerView: maskPlayerView`.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/playerViewMasking.test.js --reporter=dot`
- `pnpm exec vitest run app/catana/__tests__/playerViewMasking.test.js app/catana/__tests__/stateMasking.test.js app/catana/__tests__/Game.debugMoves.test.js server/__tests__/serverGameConfig.test.js --reporter=dot`
- `pnpm exec eslint app/catana/Game.js app/catana/gameSetup/playerView.js app/catana/__tests__/playerViewMasking.test.js app/catana/__tests__/stateMasking.test.js app/catana/__tests__/Game.debugMoves.test.js server/__tests__/serverGameConfig.test.js`
- `git diff --check`

## Status (2026-06-13, initial-state setup boundary)
- Extracted initial board/rules/dice state creation from `app/catana/Game.js`
  into `app/catana/gameSetup/initialState.js`.
- Added focused coverage in `app/catana/__tests__/initialState.test.js` for
  placement-order generation, mode/rules resolution, deterministic initial
  state, and the required boardgame.io random source.
- `Game.js` now re-exports `getPlacementOrder` for existing callers and keeps
  setup orchestration as `createInitialGameState` followed by
  `applyDevScenarioSetup`.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/initialState.test.js --reporter=dot`
- `pnpm exec vitest run app/catana/__tests__/initialState.test.js app/catana/__tests__/Game.boardConfig.test.js app/catana/__tests__/Game.placementOrder.test.js app/catana/__tests__/Game.logInit.test.js app/catana/__tests__/Game.debugMoves.test.js server/__tests__/serverGameConfig.test.js --reporter=dot`
- `pnpm exec eslint app/catana/Game.js app/catana/gameSetup/initialState.js app/catana/__tests__/initialState.test.js app/catana/__tests__/Game.boardConfig.test.js app/catana/__tests__/Game.placementOrder.test.js app/catana/__tests__/Game.logInit.test.js app/catana/__tests__/Game.debugMoves.test.js server/__tests__/serverGameConfig.test.js`
- `git diff --check`

## Status (2026-06-13, dev-scenario setup boundary)
- Extracted dev-scenario parsing, validation, setup-state merging, and
  boardgame.io context seeding from `app/catana/Game.js` into
  `app/catana/gameSetup/devScenarios.js`.
- Added focused coverage in `app/catana/__tests__/devScenarios.test.js` for
  current/legacy scenario wrappers, production/player-count guardrails, and
  post-roll context seeding.
- `Game.js` now delegates dev scenario setup through `applyDevScenarioSetup`
  while keeping normal board/rules setup inline.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/devScenarios.test.js --reporter=dot`
- `pnpm exec vitest run app/catana/__tests__/devScenarios.test.js app/catana/__tests__/Game.boardConfig.test.js app/catana/__tests__/Game.debugMoves.test.js app/catana/__tests__/DevSandboxBoardShell.test.js server/__tests__/serverGameConfig.test.js --reporter=dot`
- `pnpm exec eslint app/catana/Game.js app/catana/gameSetup/devScenarios.js app/catana/__tests__/devScenarios.test.js app/catana/__tests__/Game.boardConfig.test.js app/catana/__tests__/Game.debugMoves.test.js app/catana/__tests__/DevSandboxBoardShell.test.js server/__tests__/serverGameConfig.test.js`
- `git diff --check`

## Status (2026-06-13, debug move boundary)
- Extracted dev-only/debug move definitions from `app/catana/Moves.js` into
  `app/catana/moves/debugMoves.js`.
- `app/catana/Game.js` now imports the grouped `DEBUG_MOVES` set from that
  module and remains the production/non-production exposure gate.
- Updated debug move tests to import debug helpers from the debug module, while
  keeping existing game/server exposure guards.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/Moves.debugScenario.test.js app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/Game.debugMoves.test.js server/__tests__/serverGameConfig.test.js --reporter=dot`
- `pnpm exec vitest run app/catana/__tests__/Moves.debugScenario.test.js app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/Game.debugMoves.test.js app/catana/__tests__/Game.placementPhase.test.js app/catana/__tests__/preGameReady.test.js server/__tests__/serverGameConfig.test.js --reporter=dot`
- `pnpm exec eslint app/catana/Game.js app/catana/Moves.js app/catana/moves/debugMoves.js app/catana/__tests__/Moves.debugScenario.test.js app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/Game.debugMoves.test.js server/__tests__/serverGameConfig.test.js`
- `git diff --check`

## Status (2026-06-13, balanced-board diagnostics)
- Gated balanced-board generation diagnostics behind the existing
  `logGenerationStats` option so normal board generation and test runs stay
  quiet by default.
- Added regression coverage in `game-core/src/board/boardInvariants.test.ts`
  for both default silence and the opt-in diagnostics path.
- Focused verification:
- `pnpm -C game-core test -- src/board/boardInvariants.test.ts`
- `pnpm run test:server`
- `pnpm run test:logic`
- `git diff --check`

## Status (2026-06-13, verification lanes)
- Added explicit verification lanes so refactor checks can match the work:
  `pnpm run test:logic` for game-core build/tests,
  `pnpm run test:server` for server/runtime/non-app support tests, and
  `pnpm run test:catana` for Catana app tests when a broad Catana pass is
  warranted.
- Updated `pnpm verify` to compose the focused lanes plus the existing app
  runner and lint, instead of hiding the verification policy inside one long
  command.
- Added root Vitest discovery exclusions for linked worktrees and generated
  `game-core/dist` output so broad runs do not pick up duplicate or generated
  tests.
- Added a regression guard in
  `scripts/release/__tests__/verification-lanes.test.mjs`.
- Focused verification:
- `pnpm exec vitest run scripts/release/__tests__/verification-lanes.test.mjs --reporter=dot`
- `pnpm exec vitest run app/catana/__tests__/GameScreen.devCardPlay.test.js app/catana/__tests__/GameScreen.devCardReveal.test.js app/catana/__tests__/Board.buildPickupPreview.test.js --reporter=dot`
- `pnpm run test:logic`
- `pnpm run test:server`
- `git diff --check`

## Status (2026-06-12, dev-card presentation payload boundary)
- Extracted dev-card presentation payload helpers into `app/catana/moves/devCardPresentation.js`.
- `app/catana/Moves.js` now imports effect-id builders, knight/road-building/choice payload builders, monopoly transfer summaries, masked-resource detection, award owner snapshots, and pending knight animation resolution from the dedicated helper module.
- Kept boardgame.io move exports and game-stage wiring unchanged.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/devCardPresentation.test.js app/catana/__tests__/devCardFlow.test.js app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/Moves.autoTimeouts.test.js app/catana/__tests__/Game.placementPhase.test.js --reporter=dot --exclude '.worktrees/**'`
- `pnpm exec eslint app/catana/Moves.js app/catana/moves/devCardFlow.js app/catana/moves/devCardPresentation.js app/catana/__tests__/devCardFlow.test.js app/catana/__tests__/devCardPresentation.test.js app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/Moves.autoTimeouts.test.js app/catana/__tests__/Game.placementPhase.test.js`
- `git diff --check -- app/catana/Moves.js app/catana/moves/devCardPresentation.js app/catana/__tests__/devCardPresentation.test.js`
- Browser sandbox reload at `http://localhost:3000/catana/dev/sandbox?viewportWall=1`: board-like surface rendered, game-log content was present, and browser console errors were empty.

## Status (2026-06-12, dev-card flow helper boundary)
- Extracted pure dev-card choice flow helpers into `app/catana/moves/devCardFlow.js`.
- `app/catana/Moves.js` now imports the dev-card choice stage name, choice-card predicate, return-stage helper, standard resource order, and auto Year of Plenty payload builder instead of owning those details inline.
- Kept the boardgame.io move exports unchanged, so `Game.js` and existing move-stage wiring remain stable.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/devCardFlow.test.js app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/Moves.autoTimeouts.test.js app/catana/__tests__/Game.placementPhase.test.js --reporter=dot --exclude '.worktrees/**'`
- `pnpm exec eslint app/catana/Moves.js app/catana/moves/devCardFlow.js app/catana/__tests__/devCardFlow.test.js app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/Moves.autoTimeouts.test.js app/catana/__tests__/Game.placementPhase.test.js`
- `git diff --check -- app/catana/Moves.js app/catana/moves/devCardFlow.js app/catana/__tests__/devCardFlow.test.js`
- Browser sandbox verification at `http://localhost:3000/catana/dev/sandbox?viewportWall=1`: board-like surface rendered after hydration, game-log content was present, and browser console errors were empty.

## Status (2026-06-12, server stage policy refactor)
- Extracted shared server stage policy into `server/stagePolicy.js` so timer expiry, bot fallback moves, and bot dispatch eligibility use one stage-key resolver for forced robber discard, road-building, and dev-card choice states.
- Replaced duplicate stage-key/fallback logic in `server/timers/TimerManager.js` and `server/bots/pufferBotManager.js`.
- Added `server/runtimeConfig.js` so the game server and lobby API keep the existing `8000`/`8080` defaults while allowing explicit alternate ports for isolated live smoke tests.
- Focused verification:
- `pnpm exec vitest run server/__tests__/stagePolicy.test.js server/__tests__/runtimeConfig.test.js server/__tests__/TimerManager.test.js server/__tests__/pufferBotManager.test.js server/__tests__/timerPubSub.test.js --reporter=dot --exclude '.worktrees/**'`
- `pnpm exec eslint server/stagePolicy.js server/runtimeConfig.js server/timers/TimerManager.js server/bots/pufferBotManager.js server/__tests__/stagePolicy.test.js server/__tests__/runtimeConfig.test.js`
- `git diff --check -- server/stagePolicy.js server/runtimeConfig.js server/timers/TimerManager.js server/bots/pufferBotManager.js server/server.js server/__tests__/stagePolicy.test.js server/__tests__/runtimeConfig.test.js`
- Live smoke: started `pnpm serve` with `SETTLEX_GAME_SERVER_PORT=18000 SETTLEX_LOBBY_API_PORT=18080`, confirmed lobby API `GET /games` returned `200`, confirmed `GET /timer/nonexistent-match` returned `404`, then stopped the temporary server.

## Status (2026-06-05, docs index)
- Added a generated docs map at `docs/INDEX.md` so agents can route directly to the right durable doc across `docs/agent`, `docs/plans`, `docs/superpowers`, deploy notes, and future plans.
- Added `scripts/write-docs-index.mjs` plus `pnpm docs:index` to regenerate the map after adding, removing, or renaming Markdown docs.
- Added focused script coverage for heading extraction, stable path mapping, `INDEX.md` exclusion, and writing the generated output.
- Focused verification:
- `pnpm exec vitest run scripts/__tests__/write-docs-index.test.mjs --reporter=dot`
- `pnpm docs:index`

## Status (2026-06-04, homepage demo board implementation)
- Implemented the curated homepage demo board module under `app/catana/homeDemo/`.
- Added a static board preset, authored four-colour legal-ish placement sequence, demo-owned committed road/building state, reduced-motion final state, board-only renderer, and `GameEffects` bridge using the existing placement GSAP/audio stack.
- Rewired the dev home-table `ready` and `hybrid` variants to use `HomeDemoBoard`/`HomeDemoEffectBridge` instead of the boardgame.io sandbox board path; production homepage routing is unchanged.
- Kept lasting demo pieces separate from the temporary GSAP DOM so placement effects can clean themselves up normally while the title-screen board keeps its visible result until the loop reset.
- Fixed the React `fetchPriority` casing warning in `BoardUnderlay`.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/homeDemoSequence.test.js app/catana/__tests__/HomeDemoBoard.source.test.js`
- `pnpm exec eslint app/catana/homeDemo/*.js app/catana/BoardUnderlay.js app/catana/dev/home-table/HomeTablePrototypeClient.js app/catana/__tests__/homeDemoSequence.test.js app/catana/__tests__/HomeDemoBoard.source.test.js` (passes with two existing prototype `<img>` warnings in `HomeTablePrototypeClient.js`)
- Browser verification at `/catana/dev/home-table?variant=ready`: desktop and mobile screenshots saved as `output/playwright/home-demo-board-desktop.png` and `output/playwright/home-demo-board-mobile.png`; both rendered the board and committed demo pieces with no page/console errors in fresh browser contexts.

## Status (2026-06-04, homepage demo board spec)
- Wrote the approved design spec for the homepage demo board at `docs/superpowers/specs/2026-06-04-homepage-demo-board-design.md`.
- Locked the next direction as a curated static board preset with an authored legal-ish four-colour event loop, demo-owned committed piece state, existing GSAP/audio effects, tunable timing, reduced-motion fallback, and no live game moves/server/runtime board generation.
- Wrote the implementation plan at `docs/superpowers/plans/2026-06-04-homepage-demo-board.md`; first implementation pass should stabilize `/catana/dev/home-table` before production homepage promotion.

## Status (2026-06-04, homepage attract-mode prototype)
- Added a presentation-only attract loop to the dev homepage table prototype at `/catana/dev/home-table?variant=ready`.
- The loop computes final overlay positions from the real board geometry, then scripts lightweight board-life beats: a road/settlement placement and a settlement-to-city upgrade.
- Reworked the first pass to use the existing Catana effect stack: `GameEffects`, `createEffectBus`, and `createPiecePlacementRunner` now provide the GSAP placement motion and build audio cues instead of a custom CSS-only animation.
- Stabilized the prototype-only final-piece layer so static road/settlement/city pieces are revealed just before the GSAP temporary DOM is cleaned up, then persist through the sequence until the clean loop reset.
- Kept the loop non-interactive and out of game state: it does not call moves, mutate `G`, or imply the homepage board is an editable board.
- Tuned the first pass down from multiple simultaneous piece additions to one construction beat and one upgrade beat so the title screen feels alive without becoming cluttered.
- Fixed Next hydration warnings by gating the `GameEffects` portal until after client mount.
- Focused verification:
- `pnpm exec eslint app/catana/dev/home-table/HomeTablePrototypeClient.js app/catana/dev/home-table/HomeTableAttractLoop.js`
- Browser verification at `http://localhost:3000/catana/dev/home-table?variant=ready`: no console errors after reload, real-effect screenshot saved as `output/playwright/home-table-attract-real-effects.png`.
- Timing verification saved as `output/playwright/home-table-attract-stable-samples-2.json`; final city-state screenshot saved as `output/playwright/home-table-attract-stable-final.png`.

## Status (2026-06-03, underlay wave preview)
- Added a dev-only Catana underlay wave tuning route at `/catana/dev/underlay-waves`.
- The route renders the real generated board-underlay geometry inline, with selectable GSAP preview variants for incoming lap and slow drift.
- Revised the first pass away from outward expanding-surf glow and removed the non-working shore-wash variant.
- The lap/drift overlays now render above the static underlay as translucent duplicate shoreline layers, so the visible SVG outline can move instead of only tinting a fixed silhouette.
- Added board, port, base-layer, preview-scale, and motion-speed controls so shoreline motion can be judged both alone and behind a simplified board context.
- Kept the work preview-only; production `BoardUnderlay` and `public/svgs/board_underlay_standard.svg` are unchanged.
- Focused verification:
- `pnpm exec eslint app/catana/dev/underlay-waves/UnderlayWavesClient.js app/catana/dev/underlay-waves/page.js`
- `git diff --check -- app/catana/dev/underlay-waves docs/agent/PROGRESS.md docs/agent/NOTES.md`

## Status (2026-06-03, homepage direction brief)
- Approved the Settlehex homepage product/UX direction before visual implementation.
- Locked the homepage as a game-first title screen with beta/community proof-of-life rather than a conventional marketing page or full lobby dashboard.
- Saved the direction brief at `docs/superpowers/specs/2026-06-03-settlehex-homepage-direction-brief.md`.
- Current UX hierarchy: `Play Online` primary, `Play vs Bot` strong no-wait secondary, `Play a Friend` tertiary, with changelog/devlog/Discord/beta status as a compact supporting layer.
- Added the account/identity requirement: show guest or logged-in identity as a compact shell control, not as a competing hero CTA.
- Preferred visual direction for further exploration: a real board/table hero that shows Settlehex polish while keeping CTAs readable and stable.

## Status (2026-06-02, release mark design-system cleanup)
- Replaced the homepage release pill with quiet `release N` metadata text that opens the same release-notes disclosure.
- Added shared `app/ui/MetaDisclosure.js` for ambient metadata that can reveal details without borrowing action-button chrome.
- Added the metadata-disclosure recipe to the UI showcase and documented the role-first chrome decision in the Catana brand skill.
- Updated release label generation so the helper exposes `release N`, not `rN`.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/releaseInfo.test.js app/catana/__tests__/VersionBadge.source.test.js app/catana/__tests__/SettlexUiRecipes.source.test.js --reporter=dot`
- `pnpm exec eslint app/ui/MetaDisclosure.js app/catana/lobby/releaseInfo.js app/catana/lobby/VersionBadge.js app/catana/dev/ui/UiShowcaseClient.js app/catana/__tests__/releaseInfo.test.js app/catana/__tests__/VersionBadge.source.test.js app/catana/__tests__/SettlexUiRecipes.source.test.js`
- `git diff --check`
- Browser verification at `http://localhost:3002`: desktop rendered the release mark fixed bottom-right; mobile rendered it as a right-aligned footer mark below the lobby controls; both opened the release-notes panel.

## Status (2026-06-02, app test runner worktree exclusion)
- Fixed the app Vitest runner so per-file app test invocations exclude nested `.worktrees/**` checkouts.
- Root cause: Vitest treated the per-file path as a filter and also ran matching tests inside `.worktrees/release-versioning`, which made local `pnpm verify` fail against stale auxiliary worktree tests.
- Focused verification:
- `pnpm exec vitest run scripts/release/__tests__/run-vitest-app-tests.test.mjs --reporter=dot`
- `pnpm exec vitest run app/catana/__tests__/SettlexUiRecipes.source.test.js --reporter=dot --exclude '.worktrees/**'`
- `pnpm exec vitest run app/catana/__tests__/SidebarConnectionStudy.source.test.js --reporter=dot --exclude '.worktrees/**'`
- `node --check scripts/run-vitest-app-tests.mjs`

## Status (2026-06-02, release workflow cleanup)
- Tightened the repo-local `$settlex-release` skill into an operational runbook for release drafting, approval, push/deploy monitoring, retry fixes, and live badge verification.
- Added `pnpm release:status` as the deterministic release-readiness summary for approval state, release-note changes, deploy-infra changes, and required checks.
- Updated the Codex release hook to use the same status logic, so deploy-infra retries under an already-approved release are not blocked by a fake version-bump requirement.
- Focused verification:
- `pnpm exec vitest run scripts/release/__tests__/check-release.test.mjs scripts/release/__tests__/status.test.mjs scripts/release/__tests__/codex-release-guard.test.mjs server/__tests__/deploymentFiles.source.test.js --reporter=dot`
- `pnpm release:status`
- `pnpm release:check -- --require-approved`
- `git diff --check`

## Status (2026-06-02, release version visibility)
- Added a tracked release-note source for public deploy history at `release/release-notes.json`.
- Added `pnpm release:check` to validate release notes, require `approved: true` for production deploy checks, and require `currentVersion` to increase when `release/release-notes.json` changes in CI.
- Added a small homepage `rN` release badge that opens approved release highlights plus build metadata through the shared animated Popover.
- Wired GitHub Actions, `deploy-prod.sh`, Docker Compose, and `Dockerfile.web` so production builds receive release version, commit SHA, and build timestamp.
- Added repo-local Codex release workflow guardrails: `.agents/skills/settlex-release/SKILL.md` plus `.codex/hooks/settlex-release-guard.mjs`.
- Release 1 is approved with the public title `Initial MVP Launch`.
- Fixed production deploy retries after the first `main` push:
- `infra/scripts/deploy-prod.sh` no longer requires host-level Node before Docker build to read the release version.
- Docker builds pin Corepack to `pnpm@9.13.2` in `Dockerfile.web`, `Dockerfile.game`, and `package.json` so server builds do not drift to pnpm 11 on Node 20.
- Focused verification:
- `pnpm exec vitest run scripts/release/__tests__/check-release.test.mjs scripts/release/__tests__/codex-release-guard.test.mjs app/catana/__tests__/releaseInfo.test.js app/catana/__tests__/VersionBadge.source.test.js server/__tests__/deploymentFiles.source.test.js --reporter=dot`
- `pnpm release:check`
- `pnpm release:check -- --require-approved`
- `pnpm release:check -- --require-bump-from origin/main`
- `pnpm lint`
- `pnpm build`
- `pnpm verify`
- `git diff --check`
- `pnpm exec vitest run server/__tests__/deploymentFiles.source.test.js --reporter=dot`
- `bash -n infra/scripts/deploy-prod.sh`
- `docker build -f Dockerfile.web --target deps .`
- `docker build -f Dockerfile.game .`
- Browser verification at `http://localhost:3000`: the homepage rendered the bottom-right `r1` badge, and clicking it opened the release panel with the release 1 highlights and `Build local`.

## Status (2026-06-02, UUPM UI sanity pass)
- Applied a small reversible UI/accessibility pass based on UI UX Pro Max checklist items while keeping Catana brand rules authoritative.
- Added focus-visible treatment to the shared `Popover` trigger and reduced-motion handling to its popup.
- Increased `SwatchPicker` and the mobile match-menu trigger to 44px touch targets, and added clearer accessible names for color swatches plus compact lobby/identity fields.
- Fixed the reduced-motion media-query typo in the sidebar connection dev surface.
- Saved the reverse patch to `/tmp/settlex-uupm-quick-fixes.patch`; `git apply --check -R /tmp/settlex-uupm-quick-fixes.patch` passed.
- Captured before/after screenshots under `/tmp/settlex-uupm-screenshots/`, including identity modal and mobile sandbox states.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/SettlexUiPickers.source.test.js app/catana/__tests__/SettlexUiRecipes.source.test.js --exclude '.worktrees/**' --reporter=dot`
- `git diff --check -- app/ui/Button.js app/ui/Popover.js app/ui/SwatchPicker.js app/catana/components/MobileMatchMenu.js app/catana/lobby/LobbyPageClient.js app/catana/lobby/IdentityModal.js app/catana/dev/sidebar-connection/SidebarConnectionClient.js app/catana/__tests__/SettlexUiPickers.source.test.js app/catana/__tests__/SettlexUiRecipes.source.test.js`

## Status (2026-06-02, mobile command-row timer)
- Added a reserved bottom-right timer slot to the mobile command row so timer text remains visible beside `Roll Dice`, `End Turn`, and passive status states.
- Kept timer visibility tied to the existing `showStatusTimer` path while preserving the timer column as a muted `--:--` placeholder when timer text is hidden.
- Tuned the command row controls to a `3.25rem` / `52px` height on SE-width phones while keeping the resource inventory rail unchanged.
- Softened passive mobile command/status copy from extra-bold to semibold so forced/waiting text reads less like a primary CTA.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/MobilePrimaryTurnButton.test.js --reporter=dot`
- `pnpm exec eslint app/catana/components/MobilePlayerCockpit.js app/catana/components/MobilePrimaryTurnButton.js app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/MobilePrimaryTurnButton.test.js`
- `git diff --check -- app/catana/components/MobilePlayerCockpit.js app/catana/components/MobilePrimaryTurnButton.js app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/MobilePrimaryTurnButton.test.js docs/agent/NOTES.md docs/agent/PROGRESS.md docs/superpowers/specs/2026-06-02-mobile-command-row-timer-design.md docs/superpowers/plans/2026-06-02-mobile-command-row-timer.md`
- Browser sandbox verification at `/catana/dev/sandbox?viewportWall=1`: at `375x667`, the command row rendered `[92px feed] [183px End Turn] [64px timer]` with all three controls at `52px` height and the timer slot showing `--:--`; at `414x896`, it rendered `[100px feed] [210px End Turn] [64px timer]` at the original `62px` height. The sandbox intentionally has no timer snapshot, so it verified the reserved placeholder rather than live countdown text.

## Status (2026-06-02, game-log dice shadow)
- Removed the drop shadow from compact dice faces when they render inside game-log feed entries.
- Kept the existing shadowed mini dice default for other compact dice surfaces such as mobile turn/status displays.
- Focused verification:
- `pnpm exec eslint app/catana/components/MiniDiceFace.js app/catana/components/FeedTokenRow.js`
- `git diff --check -- app/catana/components/MiniDiceFace.js app/catana/components/FeedTokenRow.js docs/agent/PROGRESS.md docs/agent/NOTES.md`

## Status (2026-06-01, mobile haptic feedback)
- Added a Catana haptic feedback manager on the existing presentation effect bus.
- `GameEffects` now creates `HapticManager` beside `AudioManager`, unlocks both from the first pointer gesture, and cleans up haptic subscriptions on unmount.
- Added a default haptic theme for mobile control taps, dice impact, turn start, build placement, dev-card play/resolve, robber move, awards, and game over.
- Wired the phone cockpit to emit local haptic events for action dock presses, quick trade taps, dev-card tray toggles/plays, Roll taps, and End Turn hold start/confirm.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/effects/HapticManager.test.js app/catana/__tests__/effects/GameEffects.test.js app/catana/__tests__/GameScreen.diceEffects.test.js app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/MobilePrimaryTurnButton.test.js --reporter=dot`
- `pnpm exec eslint app/catana/effects/HapticManager.js app/catana/effects/hapticThemes.js app/catana/effects/GameEffects.js app/catana/components/MobilePlayerCockpit.js app/catana/components/MobilePrimaryTurnButton.js app/catana/__tests__/effects/HapticManager.test.js app/catana/__tests__/effects/GameEffects.test.js app/catana/__tests__/GameScreen.diceEffects.test.js app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/MobilePrimaryTurnButton.test.js`
- `git diff --check -- app/catana/effects/HapticManager.js app/catana/effects/hapticThemes.js app/catana/effects/GameEffects.js app/catana/components/MobilePlayerCockpit.js app/catana/components/MobilePrimaryTurnButton.js app/catana/__tests__/effects/HapticManager.test.js app/catana/__tests__/effects/GameEffects.test.js app/catana/__tests__/GameScreen.diceEffects.test.js app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/MobilePrimaryTurnButton.test.js docs/agent/NOTES.md docs/agent/PROGRESS.md`

## Status (2026-06-01, mobile forced-action status wrap)
- Changed the mobile bottom command/status label to wrap up to two lines instead of truncating forced-action copy.
- Suppressed the dice suffix in non-thinking status states so high-attention states such as robber move prioritize the instruction text.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/MobilePlayerCockpit.source.test.js --reporter=dot`
- `pnpm exec eslint app/catana/components/MobilePlayerCockpit.js app/catana/__tests__/MobilePlayerCockpit.source.test.js`
- `git diff --check -- app/catana/components/MobilePlayerCockpit.js app/catana/__tests__/MobilePlayerCockpit.source.test.js docs/agent/NOTES.md docs/agent/PROGRESS.md`
- Browser sandbox verification at `375x667`: the Robber move preset rendered both `Move the robber` and opponent-view `Visitor 1 is moving the robber` in the bottom status box without a top strip, truncation, or dice suffix.

## Status (2026-06-01, mobile bottom command status)
- Hid the always-on mobile top turn-context strip for MVP so the board has one fewer persistent overlay.
- Moved persistent mobile turn/status responsibility into the bottom command box: forced states and waiting states use `gameStatus.title`, and rolled dice can render there when no Roll/End primary CTA is available.
- Kept `MobileTurnContextStrip` available as a future transient event-toast component rather than deleting the concept.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/GameScreen.mobileShell.source.test.js app/catana/__tests__/MobilePlayerCockpit.source.test.js --reporter=dot`
- `pnpm exec eslint app/catana/GameScreen.js app/catana/components/MobilePlayerCockpit.js app/catana/__tests__/GameScreen.mobileShell.source.test.js app/catana/__tests__/MobilePlayerCockpit.source.test.js`
- `git diff --check -- app/catana/GameScreen.js app/catana/components/MobilePlayerCockpit.js app/catana/__tests__/GameScreen.mobileShell.source.test.js app/catana/__tests__/MobilePlayerCockpit.source.test.js docs/agent/NOTES.md docs/agent/PROGRESS.md`
- Browser sandbox verification at `375x667`: the top mobile turn strip was absent, the bottom command box stayed visible, and an opponent-turn state rendered `Visitor 1's turn` with two dice faces in the bottom status box.

## Status (2026-06-01, mobile dice face roll display)
- Added shared `MiniDiceFace` rendering for compact pip-style dice.
- Tuned the dice face to read as white/ivory physical dice with a light HUD edge rather than translucent blue glass chips.
- Replaced the phone turn-context hard numeric roll chips with the actual rolled dice faces while preserving sr-only dice and total text.
- Updated game-log roll formatting to emit `die` tokens and render those tokens through `FeedTokenRow`, so log entries match the status strip.
- Updated the existing source expectation for `MobileTurnContextStrip`; no new test coverage was added per request.
- Focused verification:
- `pnpm exec eslint app/catana/components/MiniDiceFace.js app/catana/components/MobileTurnContextStrip.js app/catana/components/FeedTokenRow.js app/catana/utils/gameText.js app/catana/__tests__/MobileTurnContextStrip.test.js`
- `git diff --check -- app/catana/components/MiniDiceFace.js app/catana/components/MobileTurnContextStrip.js app/catana/components/FeedTokenRow.js app/catana/utils/gameText.js app/catana/__tests__/MobileTurnContextStrip.test.js docs/agent/NOTES.md docs/agent/PROGRESS.md`
- Browser sandbox verification at `375x667`: `http://localhost:3000/catana/dev/sandbox?viewportWall=1` rendered two `.mobile-turn-context__die` faces in the mobile status strip, and the regular sandbox pre-roll scenario rendered two game-log dice tokens after rolling (`Die 5`, `Die 2`).

## Status (2026-06-01, mobile match utility menu)
- Replaced the phone-only standalone mute and resign corner controls with a single compact top-right `MobileMatchMenu`.
- The menu uses the existing shared `Popover` behavior with Catana glass styling and contains Sound, Game rules, Settings, and optional Resign match.
- Kept Log/Chat in the bottom command row and left the existing `ResignConfirmDialog` as the destructive confirmation path.
- Desktop keeps the existing top-left utility cluster and right-side resign pill; the phone layout hides the desktop cluster.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/GameScreen.mobileShell.source.test.js app/catana/__tests__/MobileMatchMenu.source.test.js --reporter=dot`
- `pnpm exec eslint app/catana/GameScreen.js app/catana/components/MobileMatchMenu.js app/catana/__tests__/GameScreen.mobileShell.source.test.js app/catana/__tests__/MobileMatchMenu.source.test.js`
- Browser sandbox verification at `http://localhost:3000/catana/dev/sandbox?viewportWall=1` with `375x667`: closed menu trigger measured `36x36` at the top-right, desktop utility cluster display was `none`, the opened menu showed Sound/Game rules/Settings/Resign, and screenshots were saved under `output/playwright/mobile-match-menu-*.png`.

## Status (2026-05-20, mobile resource danger emphasis)
- Increased the mobile local inventory rail's over-limit danger state so it reads closer to desktop: stronger rose fill/shadow plus a rose avatar ring.
- Softened the heavy mobile rail ring from the first pass so the avatar tile now carries the clearest danger cue.
- Mirrored over-limit danger into opponent boxes by passing danger panel chrome and a rose avatar ring through `PlayerAvatarStats`.
- Added `data-mobile-inventory-tone` and `data-mobile-avatar-tone` markers for the mobile rail state while keeping the existing shared `isOverLimit` model unchanged.
- Focused verification:
- `pnpm exec eslint app/catana/components/MobilePlayerCockpit.js app/catana/components/OpponentPlayerBox.js app/catana/components/PlayerAvatarStats.js`
- `pnpm exec vitest run app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/OpponentPlayerBox.test.js app/catana/__tests__/playerAvatarStats.test.js --reporter=dot`
- `git diff --check -- app/catana/components/MobilePlayerCockpit.js app/catana/components/OpponentPlayerBox.js app/catana/components/PlayerAvatarStats.js app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/OpponentPlayerBox.test.js app/catana/__tests__/playerAvatarStats.test.js docs/agent/NOTES.md docs/agent/PROGRESS.md`

## Status (2026-05-20, mobile feed control highlight cleanup)
- Removed the visible focus ring classes from the mobile game-log/chat command-row buttons and the expanded drawer's Log/Chat tabs.
- Added `.catana-mobile-feed-control` so those feed controls explicitly suppress native WebKit tap highlight/callout chrome during long press.
- Focused verification:
- `pnpm exec eslint app/catana/components/MobilePlayerCockpit.js app/catana/components/MobileMetaDrawer.js`
- `pnpm exec vitest run app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/MobileMetaDrawer.source.test.js --reporter=dot`
- `git diff --check -- app/catana/components/MobilePlayerCockpit.js app/catana/components/MobileMetaDrawer.js app/globals.css docs/agent/NOTES.md docs/agent/PROGRESS.md`

## Status (2026-05-20, exact Longest Road award path)
- Changed Longest Road award animation payloads to use the exact winning road path instead of every road owned by the new award holder.
- `game-core/src/rules/victory.ts` now exposes `getLongestRoadResult(...)`, which preserves the existing length API while returning the selected path's edge ids for presentation.
- `app/catana/Moves.js` uses that exact path when emitting `awardClaimed`, with a fallback to all owned roads only if topology is unavailable.
- Added regression coverage for the core path helper and for excluding an off-path branch road from the award animation payload.
- Focused verification:
- `pnpm -C game-core test -- --run src/rules/victory.test.ts`
- `pnpm exec vitest run app/catana/__tests__/Moves.gameLog.test.js --reporter=dot`
- `pnpm exec eslint game-core/src/rules/victory.ts game-core/src/rules/victory.test.ts app/catana/Moves.js app/catana/__tests__/Moves.gameLog.test.js`
- `pnpm -C game-core build`
- `git diff --check`

## Status (2026-05-20, mobile log/chat bottom sheet)
- Replaced the phone-only floating left Log/Chat rail with a compact bottom command-row feed trigger inside the mobile cockpit.
- `GameScreen` now owns controlled mobile meta-sheet state and passes it to both `MobilePlayerCockpit` and `LeftMetaRail`.
- Mobile `LeftMetaRail` now delegates to `MobileMetaDrawer`, a Vaul-backed bottom drawer with a drag handle and Log/Chat tabs.
- The mobile drawer is non-modal: no backdrop/blur, no outside-tap close, and the visible board remains interactive for panning while the feed is open.
- The bottom command row keeps one compact split feed control plus the remaining slot for `Roll Dice`, hold-to-end-turn, or passive turn status.
- Added `vaul` as a dependency for drawer behavior without adopting shadcn or a new visual system.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/MobileMetaDrawer.source.test.js app/catana/__tests__/MobileMetaDrawer.package.test.js app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/GameScreen.mobileShell.source.test.js --reporter=dot`
- `pnpm exec vitest run app/catana/__tests__/MobilePrimaryTurnButton.test.js app/catana/__tests__/MobileTurnContextStrip.test.js app/catana/__tests__/ChatPanel.test.js app/catana/__tests__/GameScreen.statusPresentation.test.js app/catana/__tests__/DebugUiVisibility.test.js --reporter=dot`
- `pnpm exec eslint app/catana/components/MobileMetaDrawer.js app/catana/components/MobilePlayerCockpit.js app/catana/components/LeftMetaRail.js app/catana/__tests__/MobileMetaDrawer.source.test.js app/catana/__tests__/MobileMetaDrawer.package.test.js app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/LeftMetaRail.test.js`
- `git diff --check`
- Browser sandbox verification at `http://127.0.0.1:3001/catana/dev/sandbox`: XR viewport rendered with compact feed trigger, Log drawer, Chat drawer, close control, and active tab state. SE viewport metrics showed the drawer occupying the lower portion of the viewport (`top ~= 320px`, `bottom ~= 667px` at `375x667`), but the screenshot command timed out on the SE capture.

## Status (2026-05-09, mobile dev-card picker)
- Replaced the mobile cockpit's scaled desktop dev-card display with a mobile-specific dev-card stack button and anchored tray picker.
- Shared dev-card metadata/grouping now lives in `app/catana/components/devCardDisplayUtils.js`, so desktop and mobile use the same card order, counts, and playability rules.
- The mobile button stays hidden at 0 dev cards, but can render an invisible reveal anchor during first-card purchase animations so card travel still has a destination without reserving visible rail space.
- Focused verification:
- `pnpm exec eslint app/catana/components/devCardDisplayUtils.js app/catana/components/DevCardDisplay.js app/catana/components/MobileDevCardButton.js app/catana/components/MobileDevCardTray.js app/catana/components/MobilePlayerCockpit.js`
- `pnpm exec vitest run app/catana/__tests__/DevCardDisplayGroups.test.js app/catana/__tests__/MobileDevCardButton.source.test.js app/catana/__tests__/MobileDevCardTray.source.test.js app/catana/__tests__/MobilePlayerCockpit.source.test.js --reporter=dot`
- `pnpm exec vitest run app/catana/__tests__/DevCardDisplay.assets.test.js app/catana/__tests__/PlayerActionBadges.test.js --reporter=dot`
- `git diff --check`

## Status (2026-05-06, Catana viewport wall)
- Added a dev-only responsive viewport wall at `/catana/dev/viewports`.
- The wall embeds `/catana/dev/sandbox` at extra-wide, laptop, iPad landscape/portrait, and phone landscape/portrait sizes, with Fit/Large/Small preview scale controls, per-frame open links, and a reload-all action.
- Added `viewportWall=1` sandbox mode so embedded frames hide the sandbox control panel and show only the game UI.
- Focused verification:
- `pnpm exec eslint app/catana/dev/viewports/ViewportWallClient.js app/catana/dev/viewports/page.js app/catana/dev/sandbox/SandboxClient.js app/catana/dev/sandbox/SandboxBoardShell.js app/catana/__tests__/DevViewportWall.source.test.js`
- `pnpm exec vitest run app/catana/__tests__/DevViewportWall.source.test.js --reporter=dot`
- Playwright rendered `/catana/dev/viewports` against the existing local dev server on port 3000 and captured `output/playwright/catana-viewport-wall-clean.png`.

## Status (2026-05-03, responsive desktop feed tightening)
- Tuned the desktop `LeftMetaRail` feed for mid-width laptops:
- the lane now clamps narrower around ~1700px viewports while preserving the roomier >2000px default,
- `Game Log` stays taller than `Chat`, and the expanded frame headers use less padding.
- the desktop feed now uses a fixed mid-left dock shell with independent slot motion, so `Game Log` lifts upward from its collapsed baseline, `Chat` opens downward from its slot, and the buttons stay put while panels expand.
- the `Game Log` desktop frame now uses a two-stage reveal: the collapsed button widens in place first, then the log slot animates to `collapsedHeight - openHeight` while growing, so the title/body reveal upward instead of behaving like the chat panel.
- the `Game Log` minimize path now does the reverse order the user asked for: it drops down and shortens first, then narrows back to the button width.
- the inner desktop feed frame now fills its animated slot instead of running its own fixed-height animation, so the outer slot is the only owner of `top`/height geometry and the log bottom does not visually dip during minimize.
- chat now has the same outer-slot phase ownership as game log, but keeps a fixed top anchor so its open animation can stage downward instead of jumping to full height immediately.
- fixed the log phase callback so chat frame updates cannot overwrite the log phase with `"chat"`/`"log"` and accidentally force the wrong height path.
- Focused verification:
- `pnpm exec eslint app/catana/components/LeftMetaRail.js app/catana/__tests__/LeftMetaRail.test.js`
- `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js --reporter=dot`
- `git diff --check`

## Status (2026-05-03, UI context harness first pass)
- Added a lightweight Catana UI-context layer so future agents can find the right surface-specific guidance without changing the core workflow:
- `docs/agent/UI_CONTEXT.md` now routes UI/HUD/animation/audio/copy/timing work to the correct local dev surface and records recurring agent reminders.
- Added local README beacons for `app/catana/dev/sandbox/`, `app/catana/dev/effects/`, and `app/catana/components/`.
- Linked the UI context from `docs/agent/HANDOFF.md`.
- Added a UI verification matrix to `docs/agent/TESTING_NOTES.md` covering sandbox, effects lab, sidebar geometry, shared UI primitives, and server-authoritative logic.
- Focused verification:
- `git diff --check`

## Status (2026-05-02, remote city upgrade animation)
- Added a presentation-only remote city-upgrade animation for opponent settlement-to-city builds.
- `app/catana/effects/placePiece.js` now detects non-local city upgrades and overlays a temporary settlement plus city in the effect layer: the settlement lifts/fades off the node, then the city drops into place with the existing shadow, dust, settle, and `build:city` cue language.
- Local city placement keeps the existing build-pickup/drop path; `GameScreen` passes the viewer player id into the placement runner so the runner can split local vs remote presentation.
- Focused verification:
- `pnpm exec eslint app/catana/effects/placePiece.js app/catana/effects/placePieceDefaults.js app/catana/GameScreen.js app/catana/__tests__/effects/placePieceWiring.test.js`
- `pnpm exec vitest run app/catana/__tests__/effects/placePieceWiring.test.js app/catana/__tests__/effects/placePieceDefaults.test.js app/catana/__tests__/Moves.placePieceEffects.test.js --reporter=dot`
- `git diff --check`

## Status (2026-05-02, Longest Road award animation first pass)
- Added a presentation-only Longest Road award animation:
- live Longest Road owner changes emit an `awardClaimed` effect payload with the winner, prior owner, and winner road ids,
- `GameEffects` routes award claims through the effect bus as `award:claim`,
- `app/catana/effects/awardClaim.js` shimmers the winner's roads and flies a compact Longest Road token into that player's road-stat HUD target.
- Revised the road flourish to animate the actual placed road DOM pieces instead of drawing a separate overlay shimmer:
- the winner's rendered roads now lift slightly off the board, scale up, glow in the player color, and settle back before the token lands.
- Follow-up tuning:
- removed road transform animation after sandbox testing showed placed roads could shift/rotate because their board placement already uses CSS transforms,
- the actual road pieces now use a slower glow/brightness/box-shadow pass only, leaving their transform stack untouched.
- Removed the road `z-index` bump from the award glow so settlements and cities keep stacking above roads during and after the effect.
- Removed rectangular road `box-shadow` from the glow; the road pieces now use only `filter: drop-shadow(...)` so the glow follows the visible road art instead of showing the element box.
- Staggered the award sequence so the road glow completes before the Longest Road token appears and flies into the player HUD.
- Tuned the Longest Road token beat so it pops larger, holds for about half a second, then shrinks while moving to the HUD target.
- Added Longest Road takeover motion: if `previousOwnerId` is present, the token starts at the previous holder's Longest Road HUD stat and travels to the new holder after the road glow.
- Smoothed the road glow release by fading to transparent matching filter functions over a longer exit instead of tweening directly back to `filter: none`.
- Added Largest Army award/takeover motion after Knight resolve: first awards pop from the new holder's army HUD stat, while takeovers move from the previous holder's army stat to the new holder.
- Retuned first Largest Army awards so the army badge starts from the rendered board robber instead of the new holder's army HUD stat.
- Generalized `awardClaim.js` so Longest Road and Largest Army share the same award token choreography with different icons, HUD anchors, and optional road glow.
- Increased the shared award-token pop from `1.24x` to `1.5x` and restyled the token as a warmer gold award badge.
- Added a dev-sandbox `Replay Longest Road Award` button under board effects for manual tuning without mutating game state.
- Added a dev-sandbox `Replay Road Takeover` button for the previous-holder transfer path.
- Added dev-sandbox `Replay Largest Army Award` and `Replay Army Takeover` buttons for direct army award tuning.
- Corrected the HUD effect anchors in `PlayerAvatarStats` so Longest Road and Largest Army have distinct ids: `p{playerId}-longest-road` and `p{playerId}-largest-army`.
- Focused verification:
- `pnpm exec eslint app/catana/effects/awardClaim.js app/catana/effects/GameEffects.js app/catana/effects/registry.js app/catana/GameScreen.js app/catana/Moves.js app/catana/components/PlayerAvatarStats.js app/catana/dev/sandbox/SandboxBoardShell.js app/catana/dev/sandbox/SandboxPanel.js`
- no tests added or run, per presentation-only animation guidance.

## Status (2026-05-02, remote robber move animation)
- Added a presentation-only remote robber move animation:
- real robber moves emit a `robberMove` effect payload with source/destination tile ids,
- `GameEffects` routes it through the effect bus as `robber:move`,
- `app/catana/effects/robberMove.js` renders a lifted glide and landing drop for non-placing viewers, while skipping the active manual placer and respecting reduced motion/hidden-tab policy,
- the live overlay temporarily hides the destination static robber so viewers do not see a duplicate piece during travel.
- Added a dev-sandbox `Replay Remote Robber Move` button that dispatches the same board effect without changing game state, so the motion can be tuned from `/catana/dev/sandbox`.
- Focused verification:
- `pnpm exec eslint app/catana/effects/robberMove.js app/catana/effects/GameEffects.js app/catana/effects/registry.js app/catana/GameScreen.js app/catana/Tile.js app/catana/dev/sandbox/SandboxBoardShell.js app/catana/dev/sandbox/SandboxPanel.js app/catana/Moves.js`
- no tests added or run, per presentation-only animation guidance.

## Status (2026-05-02, remote robber move landing tune)
- Tuned the remote robber move animation after sandbox review:
- removed the white dust/flash underlay from the moving robber,
- changed the runner to prefer the actual rendered robber DOM position as its source/destination anchor when available, so live landings align to the same left-offset resting placement used by the board tile instead of the raw tile center.
- Follow-up sandbox fix:
- when sandbox replay has no destination robber DOM because it does not mutate game state, the runner now carries the measured source robber resting offset to the destination fallback instead of landing at the raw tile center.
- Focused verification:
- `pnpm exec eslint app/catana/effects/robberMove.js`
- no tests added or run, per presentation-only animation guidance.

## Status (2026-05-02, Catana fast-iteration guidance tightened)
- Updated repo-root `AGENTS.md` so browser-based visual companions/mockups are reserved for cases where they are clearly needed or explicitly requested.
- Clarified that presentation-only Catana animation features should use focused manual/dev-surface verification by default, without adding tests unless shared logic, reusable helpers, event wiring, state flow, or regression coverage is involved.

## Status (2026-05-01, gameplay card-transfer animation wiring)
- Added effect wiring for several previously silent card movements:
- opponent development-card purchases now reuse the authoritative `buyDevCardReveal` event, preserving the buyer-only face reveal while showing other viewers a dev-card back moving into the buyer's dev stack,
- robber steals now emit a public transfer event with thief/victim ids and animate a resource card from victim to thief; thief/victim clients attempt a local before/after hand diff to show the resource face, while uninvolved viewers fall back to the resource back,
- maritime trades now emit give/receive transfer payloads and animate resource cards through the shared effect layer,
- robber discards now emit discard payloads and animate the discarded resource cards away from the player.
- `app/catana/effects/cardTransfer.js` owns the shared GSAP card-transfer runner for resource backs/faces and dev-card backs.
- `app/catana/GameEffects.js`, `app/catana/effects/registry.js`, and `app/catana/GameScreen.js` now route the new events through the same effect-bus pattern used by resource distribution and dev-card play.
- Focused verification:
- source review only per request; browser control and test runs intentionally skipped.

## Status (2026-05-01, local HUD center alignment restore)
- Kept the local VP badge on the avatar tile's top-right corner so it reads as an avatar chip instead of a panel-end badge.
- Kept the player dock outside the shared glass shell so the button shading/backdrop blur remains intact.
- Added a rail-measured dock overlay so the dock still anchors to the resource-count rail, preserving the pre-merge top-of-bar positioning behavior instead of centering against the whole merged HUD row.
- Focused verification:
  - `pnpm exec vitest run app/catana/__tests__/PlayerActionBadges.test.js app/catana/__tests__/PlayerActionContainer.hitbox.test.js app/catana/__tests__/Dock.buildPickupUx.test.js --reporter=dot`
  - `pnpm exec eslint app/catana/components/PlayerActionContainer.js app/catana/components/ActionsDock/Dock.js`

## Status (2026-05-01, bottom dice tray chrome removal)
- Removed the visible glass background from the bottom-right dice tray while keeping its fixed hit area, spacing, inactive dimming, and roll-only interactivity.
- Focused verification:
- pending.

# Status (2026-05-01, HUD badge polish for VP and build counts)
- Re-skinned the player VP bubble and the build-piece remaining-count badges so they read like part of the Catana glass HUD instead of plain MVP-era circles.
- `app/catana/components/PlayerAvatarStats.js` now uses a shared `catana-hud-vp-badge` treatment for the VP count.
- `app/catana/components/ActionsDock/DockCard.js` now uses a shared `catana-hud-piece-count-badge` treatment for road/settlement/city remaining counts.
- `app/catana/components/hudGlass.css` now owns the shared badge visuals, including glass fill, subtle amber VP emphasis, and smaller inventory-chip styling for piece counts.
- The build-piece chips were then toned down further with lighter numerals and less ornate shadowing so they read as utility counters rather than a separate accent language.
- The VP badge was also revised away from a visible gold rim toward the shared white/sky glass HUD ring, leaving only a faint warm interior highlight.
- Focused verification:
- `pnpm exec eslint app/catana/components/PlayerAvatarStats.js app/catana/components/ActionsDock/DockCard.js`
- `git diff --check`

## Status (2026-05-01, opponent resource-card shadow cleanup)
- Removed the image drop shadow from opponent resource-card stacks while leaving other `CardStack` uses unchanged.
- `app/catana/components/CardStack.js` now accepts an `imageClassName` override for stack-specific card image styling.
- `app/catana/components/OpponentPlayerBox.js` now passes a shadow-free `object-contain` image class for the opponent resource stack, so the stacked resource backs read flatter in the dock.
- Focused verification:
- pending visual check in the Catana dev sandbox.

## Status (2026-05-01, opponent avatar and local dev holder tuning)
- Tuned the extended Catana avatar panel:
- the mounted username nameplate now left-aligns its text,
- the mounted username nameplate now sizes to its text, capped by the panel max width for long names,
- the mounted username nameplate now uses lighter text, a lower profile, and subtler border/shadow treatment,
- the extended opponent VP badge is slightly smaller and less stark,
- the extended opponent VP badge now anchors to the avatar tile's bottom-right corner instead of bottom-left.
- the top opponent row now sits at `top-10` to leave more padding above the mounted username tabs.
- the mounted username tab now uses a left-side-only downward connector, with the tab's right edge squared at the panel seam instead of curving or dropping down.
- the local dev-card holder now renders as an embedded right-hand bay inside the bottom resource rail, separated by a subtle vertical divider.
- the local dev-card bay divider no longer adds extra left margin after ore, so divider spacing is balanced against the first dev card.
- the local dev-card bay now stays mounted at zero width and eases open with a slow-fast-slow max-width transition when the first dev card appears.
- the local dev-card bay divider now uses a sky-tinted line with a white highlight so it reads more clearly on the bottom glass rail.
- the opponent panel divider now uses the same sky-tinted line and white highlight for consistency.
- the mounted opponent username text now uses lighter weight, softer shadow, and slight letter spacing to reduce letter merging.
- the turn status/timer now stays in the bottom-right turn cluster as a smaller passive pill above the dice tray and end-turn button, with wider dice spacing to avoid overlap.
- the bottom-right dice tray now stays visible across turn-control modes and only becomes clickable during roll mode.
- inactive bottom-right dice now render dimmed/desaturated and the dice content is lowered/clipped within the tray so it sits inside the holder.
- the bottom-right action cluster now uses the same 16px outer viewport padding as the top-left utility cluster, removes its downward nudge, and has slightly wider internal gaps.
- restored the live-game resign/results pill placement by moving fixed positioning to an outer wrapper instead of applying it directly to the shared `GlassPillButton`.
- Focused verification:
- `pnpm exec eslint app/catana/components/DevCardDisplay.js app/catana/components/PlayerActionContainer.js app/catana/components/OpponentPlayerBox.js app/catana/components/PlayerAvatarStats.js`
- `pnpm exec vitest run app/catana/__tests__/DevCardDisplayLayout.source.test.js app/catana/__tests__/DevCardDisplay.disabledStyle.test.js app/catana/__tests__/PlayerActionBadges.test.js --reporter=dot`
- `pnpm exec eslint app/catana/components/TurnControlCluster.js app/catana/components/PlayerActionContainer.js app/catana/__tests__/PlayerActionContainer.hitbox.test.js app/catana/__tests__/TurnControlCluster.test.js`
- `pnpm exec vitest run app/catana/__tests__/TurnControlCluster.test.js app/catana/__tests__/PlayerActionContainer.hitbox.test.js --reporter=dot`
- `pnpm exec eslint app/catana/GameScreen.js app/catana/__tests__/GameScreen.gameOver.test.js`
- `pnpm exec vitest run app/catana/__tests__/GameScreen.gameOver.test.js --reporter=dot`

## Status (2026-04-30, prod deploy verify unblock)
- Investigated the slow `deploy-prod` pushes on `main`.
- Current behavior:
- GitHub Actions runs `pnpm verify` before any server deploy work; recent long runs were stuck in the verify job and never reached the rsync/Docker deploy job.
- `app/catana/__tests__/Game.logInit.test.js` and `app/catana/__tests__/Game.phaseLog.test.js` now use `makeDeterministicRng` instead of a constant RNG, avoiding infinite balanced-board generation during setup tests.
- `app/catana/__tests__/Moves.gameLog.test.js` now seeds the expected dev-card choice stage for the monopoly-result log case.
- stale source guards in `app/catana/__tests__/DevSandboxPanel.source.test.js` and `app/catana/__tests__/DevCardDisplay.disabledStyle.test.js` now match the current dev-card sandbox/display implementation.
- `pnpm verify` now splits app Vitest files through `scripts/run-vitest-app-tests.mjs`, with a per-file timeout, so a single app test hang fails clearly instead of tying up deployment for hours.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/Game.logInit.test.js app/catana/__tests__/Game.phaseLog.test.js app/catana/__tests__/Game.placementOrder.test.js --reporter=dot`
- `pnpm run test:app`

## Status (2026-04-29, dev-card magic dock prototype)
- Replaced the local player's dev-card placeholder tray with a MagicDock-inspired grouped card dock.
- Current behavior:
- `app/catana/components/DevCardDisplay.js` groups the hand by development-card type, keeps playable cards clickable by type, keeps victory points passive, renders every duplicate copy as a compressed horizontal mini-stack inside one continuous dock target, adds hover-driven fan/lean during dock magnification, damps neighboring card-type magnification, and adds compact centered tooltips with card name, description, and count.
- `app/catana/components/DevCardDisplay.css` now gives the tray a light glass dock shell plus cursor-proximity card magnification/lift, per-card disabled dimming, thresholded count badges for duplicate card types, and reduced-motion fallback.
- `app/catana/components/PlayerActionContainer.js` keeps the dev-card dock aligned with the player action dock in the original right-side slot, preserving the hand-tray baseline while the prototype interaction is evaluated on desktop.
- Focused verification:
- `pnpm exec eslint app/catana/components/DevCardDisplay.js app/catana/components/PlayerActionContainer.js`
- Browser sandbox checks at `/catana/dev/sandbox`, including a two-copy Year of Plenty mini-stack, hover tooltip, and whole-stack magnification/lift.
- No automated tests were added for this prototype pass.

## Status (2026-04-28, desktop separate feed frames)
- Reworked the low-chrome desktop feed from one tabbed `Log` / `Chat` panel into two independent HUD frames.
- Current behavior:
- `app/catana/components/LeftMetaRail.js` renders desktop `Game Log` and `Chat` as equal-size translucent frames in the same bottom-left feed lane,
- both desktop frames are visible by default and can be minimized/restored independently,
- desktop feed frames now use a taller clamped height and a stable full-width minimized row state so closing both panels keeps the stack vertical instead of producing loose side-by-side pills,
- open/restore uses a restrained CSS height/opacity/transform transition; Playwright sampling confirmed restore height animates from `44px` toward the `256px` desktop panel height at `1440x900`,
- `app/catana/components/ChatPanel.js` now accepts `rootClassName` so the desktop chat feed can fill the HUD frame and keep the composer pinned to the bottom,
- mobile keeps the existing compact rail/drawer behavior.
- Focused verification:
- `pnpm exec eslint app/catana/components/LeftMetaRail.js app/catana/components/ChatPanel.js app/catana/GameScreen.js`
- `pnpm exec vitest run --dir app/catana/__tests__ LeftMetaRail.test.js ChatPanel.test.js`
- `git diff --check`
- Playwright sandbox checks at `/catana/dev/sandbox` on `1440x900` for both frames open, log minimized with chat still open, both frames minimized as stacked full-width rows, and restore animation sampling.

## Status (2026-04-27, desktop low-chrome feed HUD experiment)
- Replaced the desktop vertical meta/utility rail experiment with a lower-chrome, WoW-inspired feed treatment.
- Current behavior:
- `app/catana/components/LeftMetaRail.js` now renders desktop `Log` / `Chat` as a compact bottom-left translucent feed dock with tabs and a minimize state,
- `app/catana/GameScreen.js` no longer reserves desktop playfield width for the old left shelf, so the board and bottom action dock center against the actual viewport again,
- desktop mute, game settings, and game rules are back in the top-left utility cluster,
- mobile keeps the existing compact rail/drawer behavior for now.
- Focused verification:
- `pnpm exec eslint app/catana/components/LeftMetaRail.js app/catana/GameScreen.js`
- Playwright sandbox checks at `/catana/dev/sandbox` on `1440x900` for the Log view, Chat tab, minimized feed state, and top-left settings/rules actions.

## Status (2026-04-27, desktop meta rail utility consolidation)
- Reworked the desktop left meta rail from a Log/Chat-only toggle strip into the desktop utility rail.
- Current behavior:
- `app/catana/components/LeftMetaRail.js` now renders chunkier Catana-style desktop rail buttons, groups information panels separately from utility actions, and uses full selected-button treatment instead of the previous thin active stripe,
- `app/catana/GameScreen.js` passes desktop rail actions for audio mute, game rules, and game settings, while the old top-left utility cluster is hidden on desktop and retained for smaller viewports,
- `Log` and `Chat` still toggle independently and can remain open together,
- the left playfield inset now accounts for the wider rail plus panel shelf.
- Focused verification:
- `pnpm exec eslint app/catana/components/LeftMetaRail.js app/catana/GameScreen.js`
- Playwright sandbox check at `/catana/dev/sandbox` on `1440x900` desktop for both panels open, settings/rules rail actions, and `390x844` mobile to confirm the compact mobile HUD path remains intact.

## Status (2026-04-26, desktop vertical left meta rail)
- Replaced the experimental desktop bottom-left `Log` / `Chat` chips with a compact vertical icon rail next to the left meta panel stack.
- Current behavior:
- `app/catana/components/LeftMetaRail.js` now treats the desktop left meta area as a persistent icon spine plus independently toggleable `Game Log` and `Chat` panels,
- both desktop panels can still be open at the same time, while either rail icon or the panel minimize button can close its own panel without affecting the other,
- the desktop left playfield inset now accounts for the rail plus panel shelf, so the board/action dock alignment remains centered in the remaining free playfield,
- mobile keeps the existing one-panel-at-a-time rail/drawer behavior.
- Focused verification:
- `pnpm exec eslint app/catana/components/LeftMetaRail.js app/catana/GameScreen.js app/catana/Board.js app/catana/components/PlayerActionContainer.js app/catana/utils/boardLayout.js`
- Playwright sandbox check at `/catana/dev/sandbox` with both desktop panels open, independent Log/Chat toggles, both panels closed, and a 390px mobile viewport screenshot.

## Status (2026-04-22, agent fast-iteration carveout)
- Added an explicit fast-iteration rule to the repo-root `AGENTS.md` so small UI/audio/animation tuning passes can use direct edits and manual sandbox verification without defaulting to new tests or broad suites.
- Current direction:
- keep the existing test-first stance for game rules, state transitions, shared logic, wiring changes, and regressions,
- treat Catana sandbox/effects-lab tuning as a separate faster loop where value-only tweaks, timing nudges, sound swaps, CSS tuning, and copy adjustments should usually skip test edits unless explicitly requested.
- Focused verification:
- `git diff --check`

## Status (2026-04-22, dice roll audio/animation sync)
- Synced the Catana dice visuals to the current heavy-shake + baseline-throw audio path instead of letting the dice use a separate hardcoded roll duration.
- Current behavior:
- `app/catana/effects/GameEffects.js` now resolves one shared `dice:roll` cue plan per roll, emits that exact plan to audio, and also emits a `dice:roll:timeline` bus event for the dice visuals,
- `app/catana/effects/diceRollTimeline.js` converts the chosen cue plan into `shakeMs` and `settleMs`, with a `500ms` settle fallback if clip timings are unavailable,
- `app/catana/GameScreen.js` now creates a shared `effectsBus` and passes it into both `GameEffects` and `PlayerActionContainer`,
- `app/catana/components/PlayerActionContainer.js` now listens for `dice:roll:timeline` on that shared bus, with the older raw `roll` listener retained only as a local fallback path,
- `app/catana/components/Die.js` no longer swaps between looping CSS animation and later CSS transitions; it now runs one continuous Web Animations API roll per die using the old keyframe shape and the chosen final face as the end frame,
- `app/catana/effects/diceRollTimeline.js` now derives a shared shake window plus per-layer throw timings from the selected audio plan, so the dice can follow the actual chosen throw layers instead of a guessed settle tail,
- `app/catana/effects/AudioManager.js` now supports separate visual and audio throw timings via cue-level `startDelayPortion` and `impactLeadPortion`, so the current dice animation timing can stay put while each throw clip is played later based on its own length,
- `app/catana/components/diceAnimationPlan.js` now maps die 1 and die 2 onto those planned throw layers when available, so each die starts easing when its assigned throw layer starts and lands when that layer ends, while still using distinct tumble variants so the dice do not move in lockstep,
- `app/catana/components/dieRollPlan.js` now normalizes that continuous-roll request for the die instead of building multi-phase shake/brake/settle state,
- `app/catana/effects/soundThemes.js` now includes explicit duration maps for the current heavy shake clips and baseline throw clips so the visual timing follows the current runtime assets,
- refreshed the served baseline `die-throw-1..4.mp3` copies from `sounds/dice_roll/` after the latest trim pass and updated the throw `durationMsBySrc` values to match the new files,
- the active audition state remains the same sonically: heavy processed shake lead-in from `public/sounds/dice-heavy/` plus the baseline layered `die-throw` clips.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/diceAnimationPlan.test.js app/catana/__tests__/Die.rollPlan.test.js app/catana/__tests__/effects/AudioManager.test.js app/catana/__tests__/effects/diceRollTimeline.test.js app/catana/__tests__/effects/GameEffects.test.js app/catana/__tests__/effects/soundThemes.test.js app/catana/__tests__/effects/EffectsLabAudioOverride.test.js app/catana/__tests__/GameScreen.diceEffects.test.js app/catana/__tests__/PlayerActionContainer.diceRollTimeline.test.js`
- `pnpm lint`

## Status (2026-04-22, layered dice-roll audio experiment)
- Switched the `dice:roll` cue over to the new `die-throw` sample set and changed playback from one random variant to two distinct layered variants per roll.
- Current behavior:
- `app/catana/effects/AudioManager.js` now supports `layers` on variant-based cues so a single bus event can play multiple distinct files from the same shuffled pool,
- `app/catana/effects/AudioManager.js` also supports optional `layerDelayMs`, so layered cues can start slightly offset instead of sample-aligned,
- `app/catana/effects/AudioManager.js` also supports an optional `leadIn` clip or variant pool, so a cue can play a short intro sound and then trigger its main playback on the intro clip's `end` event,
- `app/catana/effects/AudioManager.js` can also hand off from a lead-in slightly before the clip ends when that lead-in provides source durations plus an overlap window,
- generated a reversible `public/sounds/dice-heavy/` experiment set by processing the source dice clips through ffmpeg EQ/compression to darken the top end and add more low-mid body without overwriting the source or baseline runtime copies,
- `app/catana/effects/soundThemes.js` now points `dice:roll` at a shuffled heavy shake lead-in from `/sounds/dice-heavy/dice-shake-{1,2,3,4,5}.mp3`, followed by the layered baseline `/sounds/die-throw-{1,2,3,4}.mp3` pair, keeping the small `0-30ms` layer stagger, widened rate randomization to `0.95-1.05`, and conservative per-layer volume,
- refreshed the served `public/sounds` copies from `sounds/dice_roll/` after the latest trimmed throw/shake source edits, including the new `dice-shake-5.mp3` source file for future auditioning,
- the existing `/catana/dev/sandbox` route remains the primary iteration surface for this experiment, so dice animation and follow-up resource distribution can still be auditioned in one place.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/effects/AudioManager.test.js`
- design note: `docs/superpowers/specs/2026-04-22-dice-roll-layered-audio-design.md`
- implementation note: `docs/superpowers/plans/2026-04-22-dice-roll-layered-audio-plan.md`

## Status (2026-04-21, standard UI foundation phase-1 plan)
- Wrote the first implementation plan for the new Settlex standard UI system.
- Current direction:
- `docs/superpowers/plans/2026-04-21-standard-ui-foundation-phase-1-plan.md` scopes Phase 1 to the shared foundation plus `Button`, `Panel`, `Banner`, `Input`, `Select`, `Dialog`, and `AlertDialog`,
- the first proving-ground migrations are the reconnect banner, idle prompt, resign confirmation, and the duplicated panel/field/button helpers in `MatchPageClient` and the custom-game slice of `LobbyPageClient`,
- `@base-ui/react` is the assumed primitive dependency for dialog/alert-dialog behavior, while simple inputs/selects stay as shared styled wrappers over native elements in this phase.
- Focused verification:
- plan grounded against `app/layout.js`, `app/globals.css`, `app/catana/components/{StatusBanner,GlobalReconnectBanner,IdlePromptModal,GlassPillButton}.js`, `app/catana/GameScreen.js`, `app/catana/lobby/[matchID]/MatchPageClient.js`, and `app/catana/lobby/LobbyPageClient.js`
- no implementation changes yet; this is the execution handoff plan for Phase 1
## Status (2026-04-21, standard UI system design)
- Wrote the design spec for a shared Settlex standard UI system spanning product surfaces and in-game standard UI, with bespoke exceptions only for gameplay-specific controls and board presentation.
- Current direction:
- `docs/superpowers/specs/2026-04-21-settlex-standard-ui-system-design.md` recommends one shared Settlex UI layer over unstyled primitives rather than separate "web" and "game chrome" systems,
- the recommended foundation is `Base UI` for accessibility/behavior primitives,
- the main motion reference is `Animate UI`,
- the main surface/style reference is `AICanvas`, translated into the existing Catana light/airy language rather than copied literally,
- the first standardized inventory is `Button`, `Dialog`, `AlertDialog`, `Banner`, `Toast`, `Panel`, `Sheet/Drawer`, `Tabs`, `Tooltip`, `Popover`, `Input`, `Textarea`, `Select`, `Slider`, `Switch`, `Checkbox`, `Table`, and `ScrollArea`.
- Focused verification:
- design reviewed against `docs/agent/skills/catana-brand/SKILL.md`, existing UI components under `app/catana/`, and the referenced external component systems and primitive-library docs
- no code or dependency changes yet; this is a design-direction checkpoint before planning

## Status (2026-04-19, git artifact cleanup)
- Removed generated Puffer training runs and checkpoint files from Git tracking while keeping the local files on disk.
- Current behavior:
- `.gitignore` now ignores `ai/pufferlib/runs*/`, Puffer `*.pt` checkpoints, and generated `*.egg-info/` package metadata,
- the tracked repository payload drops from roughly `323M` to `28M`,
- no `ai/**/*.pt` files remain tracked.
- Focused verification:
- `git ls-files -z | xargs -0 du -ch | tail -1`
- `git ls-files 'ai/**/*.pt' | wc -l`
- `git diff --check`

## Status (2026-04-16, feed-panel autoscroll idle resume)
- Corrected the live chat/send case and broadened the shared idle-resume behavior to the `Game Log` panel without adding log send-specific behavior.
- Current behavior:
- `app/catana/components/ChatPanel.js` now bumps a chat-only `resumeAutoScrollKey` whenever the local player successfully submits a message, so the chat feed immediately scrolls back to the bottom and re-enables autoscroll for the subsequent echoed message,
- `app/catana/components/FeedPanel.js` now supports an optional forced auto-scroll trigger plus panel-wide hover/focus tracking and idle-delay configuration, and uses the shared idle callback to scroll back to the bottom when that timer expires,
- `app/catana/components/FeedPanelScrollState.js` now supports forced scroll, focus-aware idle resume, configurable idle timing, and an idle-resume callback; both chat and log now use a 12s idle window that re-enables autoscroll and snaps back to the latest entry after inactivity.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/ChatPanel.test.js app/catana/__tests__/renderPerfGuards.test.js`
- `pnpm exec eslint app/catana/components/ChatPanel.js app/catana/components/FeedPanel.js app/catana/components/FeedPanelScrollState.js app/catana/components/GameLogPanel.js app/catana/__tests__/ChatPanel.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/renderPerfGuards.test.js`

## Status (2026-04-16, side-tab ribbon bottom-corner cleanup)
- Corrected the side-tab-only interpretation of the chat/footer hard-edge feedback.
- Current behavior:
- `app/catana/components/ChatPanel.js` has its composer visual treatment restored to the prior full-width footer/input styling; the production chat panel was not the target for this pass,
- `app/catana/dev/sidebar-connection/SidebarConnectionClient.js` also restores the mock chat composer to that prior treatment,
- the actual side-tab ribbon panel content wrapper now clips to the same `SIDE_TAB_PANEL_RADIUS` as the SVG shell, preventing the rectangular content layer from peeking through at the bottom-left and bottom-right rounded corners,
- `app/catana/__tests__/SidebarConnectionStudy.source.test.js` now guards the explicit side-tab content clipping rather than composer styling.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/ChatPanel.test.js app/catana/__tests__/SidebarConnectionStudy.source.test.js`
- browser check at `/catana/dev/sidebar-connection` in `Chat only`

## Status (2026-04-15, sidebar connection GSAP motion pass)
- Replaced the dev-only `/catana/dev/sidebar-connection` mockup motion driver with calmer GSAP easing.
- Current behavior:
- `app/catana/dev/sidebar-connection/SidebarConnectionClient.js` no longer imports `@react-spring/web`; both comparison variants now animate from a small `useGsapDockMotion` helper,
- panel progress and row height tween over `0.22s` with `power3.out`, matching the repo's GSAP UI-following patterns instead of using spring physics,
- the motion hook respects `prefers-reduced-motion: reduce` by reducing the tween duration to zero,
- `app/catana/__tests__/SidebarConnectionStudy.source.test.js` now guards the GSAP import, easing, reduced-motion handling, and removal of React Spring usage.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/SidebarConnectionStudy.source.test.js`
- `pnpm exec eslint app/catana/dev/sidebar-connection/page.js app/catana/dev/sidebar-connection/SidebarConnectionClient.js app/catana/__tests__/SidebarConnectionStudy.source.test.js`
- browser check at `/catana/dev/sidebar-connection`; sampled `Dock only` and `Both open` toggles showed monotonic button movement with no overshoot.

## Status (2026-04-15, side-tab ribbon compact button stack)
- Tightened the dev-only `/catana/dev/sidebar-connection` side-tab ribbon button treatment after the latest visual review.
- Current behavior:
- `app/catana/dev/sidebar-connection/SidebarConnectionClient.js` now gives the side-tab button shell the same visible white stroke treatment as the thin-header taper baseline,
- side-tab row spacing is now neighbor-aware through `getSideTabRowHeight`, so dock buttons keep their compact closed spacing unless two adjacent panels are both open,
- when only `Chat` is open, the `Log` and `Chat` buttons remain next to each other in the same compact dock stack,
- when only `Game Log` is open, the `Chat` button sits directly below the shifted open log tab instead of being pushed under the full log panel,
- only the `Both open` state reserves the expanded panel height between rows.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/SidebarConnectionStudy.source.test.js`
- browser coordinate checks and screenshots at `/catana/dev/sidebar-connection` in `Both open`, `Chat only`, `Log only`, and `Dock only`

## Status (2026-04-15, side-tab ribbon title-over-button lift)
- Corrected the dev-only `/catana/dev/sidebar-connection` side-tab ribbon lift so the panel moves up relative to the expanded dock button.
- Current behavior:
- `app/catana/dev/sidebar-connection/SidebarConnectionClient.js` now uses `SIDE_TAB_PANEL_OPEN_LIFT = 8` to raise the panel/title bar while keeping the expanded button in its dock slot,
- the side-tab panel now uses `SIDE_TAB_PANEL_GAP = 12`, moving the panel 8px left so the selected button reads closer to a square tab instead of a stretched horizontal bridge,
- `SIDE_TAB_BUTTON_OPEN_TOP` is no longer derived from the lifted panel top; the header/body seam is tracked separately as `SIDE_TAB_HEADER_SEAM_Y`,
- the side-tab connector's top curve now ends at that seam so the transition does not bleed up into the title bar,
- `app/catana/__tests__/SidebarConnectionStudy.source.test.js` now guards the named lift, 12px panel gap, decoupled button open top, and seam-based connector join.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/SidebarConnectionStudy.source.test.js`
- browser coordinate check and screenshot at `/catana/dev/sidebar-connection` in `Both open`

## Status (2026-04-15, side-tab ribbon rendered alignment fix)
- Corrected the dev-only `/catana/dev/sidebar-connection` side-tab ribbon after the previous tweak proved too subtle in the browser.
- Current behavior:
- `app/catana/dev/sidebar-connection/SidebarConnectionClient.js` now aligns the actual icon button layer with the SVG side-tab path instead of translating it from an implicit `top: 0`,
- the side-tab panel is raised to the row top and the active tab top is derived from the panel header height, so the tab lands on the title/body seam in the rendered layout,
- `app/catana/__tests__/SidebarConnectionStudy.source.test.js` now guards the panel/button constants and the explicit button top style so this offset does not come back.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/SidebarConnectionStudy.source.test.js`
- browser coordinate check and screenshots at `/catana/dev/sidebar-connection` in `Both open` and `Log only`

## Status (2026-04-15, side-tab ribbon button alignment)
- Tightened the dev-only `/catana/dev/sidebar-connection` side-tab ribbon after visual review.
- Current behavior:
- `app/catana/dev/sidebar-connection/SidebarConnectionClient.js` now keeps the side-tab button at the same 72px footprint without the extra open-state scale, so the icon alignment matches the thin-header taper button more closely,
- the side-tab panel top is raised slightly so the tab connection lands at the header/body boundary instead of overlapping awkwardly into the title bar area,
- `app/catana/__tests__/SidebarConnectionStudy.source.test.js` now guards both the side-tab direction and these alignment constants.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/SidebarConnectionStudy.source.test.js`
- manual browser check at `/catana/dev/sidebar-connection` in `Both open` and `Log only`

## Status (2026-04-15, sidebar connection side-tab ribbon pass)
- Reworked the dev-only `/catana/dev/sidebar-connection` `New Variant` from the raised shoulder/blob experiment into a cleaner `Side-Tab Ribbon` study.
- Current behavior:
- `app/catana/dev/sidebar-connection/SidebarConnectionClient.js` now draws the new variant as one side-tab SVG shell where the active dock button plugs directly into the panel surface with short horizontal joins,
- the active tab sits higher against the panel header/body boundary so it reads more like a conventional selected tab and less like a soft connector entering the middle of the panel body,
- the older `Thin Header Taper` study remains visible beside it for comparison, while the new side-tab direction is guarded by `app/catana/__tests__/SidebarConnectionStudy.source.test.js`.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/SidebarConnectionStudy.source.test.js`
- manual browser check at `/catana/dev/sidebar-connection` in `Both open` and `Log only`

## Status (2026-04-15, sidebar connection shoulder mockup raised)
- Refined the dev-only `/catana/dev/sidebar-connection` mockup so the `Dock-To-Body Shoulder` study now reads as a panel emerging above the button instead of connecting into the middle of the body.
- Current behavior:
- `app/catana/dev/sidebar-connection/SidebarConnectionClient.js` now treats the shoulder study as one owning shell instead of a connector sitting behind a separate card: the open state is rendered as one custom SVG silhouette that includes the active button and the whole outer panel body,
- the visible `Game Log` / `Chat` card chrome inside that shell is now lightweight inset content rather than a second frosted card, which makes the shoulder read much more like a single ribboned disclosure surface,
- the active button still springs down into its open position, and the mockup keeps both the shoulder study and the thin-header taper study side by side for direct visual comparison.
- the comparison route still shows both the thin-header taper and the raised shoulder study side by side, so further visual decisions can be made against a stable baseline.
- Focused verification:
- `pnpm exec eslint app/catana/dev/sidebar-connection/page.js app/catana/dev/sidebar-connection/SidebarConnectionClient.js`
- manual browser check at `/catana/dev/sidebar-connection` in `Both open` and `Log only`

## Status (2026-04-14, desktop left meta dock)
- Reworked the left meta UI into a desktop-first dock while keeping the mobile rail path.
- Current behavior:
- `app/catana/components/LeftMetaRail.js` now renders two layouts: a desktop row-following dock with one button per row and independently open `Game Log` / `Chat` panels, plus a mobile rail that still uses a single active panel,
- desktop now defaults both `Log` and `Chat` open, keeps lower dock buttons flowing underneath expanded rows, and no longer collapses panels on board click or unfocus,
- the desktop dock panels now use a stronger blue-glass body with firmer header/footer opacity, while `app/catana/components/ChatPanel.js` restores the flatter footer/input treatment by using a transparent composer input instead of the inset glass field.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/ChatPanel.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/DebugUiVisibility.test.js`
- `pnpm exec eslint app/catana/components/LeftMetaRail.js app/catana/components/ChatPanel.js app/catana/components/GameLogPanel.js app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/ChatPanel.test.js`
- `git diff --check`
- manual browser check at `/catana/dev/sandbox` on desktop, including both-panels-open default, closing `Chat` while keeping `Log` open, and confirming a board click leaves the open dock untouched.

## Status (2026-04-14, port exchange-rate labels now scale with board size)
- Fixed the intermittent oversized port-rate text so the `2:1` / `3:1` labels now scale from board tile size instead of a fixed root-font `rem`.
- Current behavior:
- `app/catana/Port.js` now derives the badge text `fontSize` from the board `size` prop before rendering the rate label,
- `app/catana/Port.css` no longer hard-codes the badge text to `0.85rem`,
- `app/catana/__tests__/Port.render.test.js` now locks in the regression by asserting that large and small board sizes render different inline font sizes for the badge text.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/Port.render.test.js`

## Status (2026-04-14, collapsible left meta sidebar)
- Replaced the old stacked bottom-left log/chat column with the first production pass of the shared collapsible sidebar pattern.
- Current behavior:
- `app/catana/components/LeftMetaRail.js` now renders a slim icon rail with `Log` and `Chat` buttons, keeps one active panel at a time, opens that panel in a responsive glass drawer, and closes via the same button, backdrop tap, or `Escape`,
- `app/catana/components/GameLogPanel.js` and `app/catana/components/ChatPanel.js` now accept `panelClassName` overrides so the sidebar can reuse the existing feed panels without forking their contents,
- the narrow-screen sidebar stack now sits higher (`bottom-32`) so the drawer clears the bottom action dock better in portrait while preserving the same rail behavior on desktop and landscape.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/ChatPanel.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/DebugUiVisibility.test.js`
- manual browser check at `/catana/dev/sandbox` in phone landscape and phone portrait, including open/close checks for both `Game Log` and `Chat`.

## Status (2026-04-13, placement status uses live turn owner)
- Fixed the placement-phase status/action copy so it follows the live boardgame.io turn owner instead of stale core turn state.
- Current behavior:
- `app/catana/utils/gameStatus.js` now resolves the acting player from `ctx.currentPlayer` first, with a fallback to `G.core.turn.currentPlayerId` for seeded/scenario paths,
- placement-phase viewer-aware copy and active-player highlighting now stay aligned with the actual setup turn owner after each snake-draft handoff,
- `app/catana/__tests__/gameStatus.test.js` now includes a regression where placement `ctx.currentPlayer` has advanced while `core.turn.currentPlayerId` is still stale.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/gameStatus.test.js app/catana/__tests__/GameScreen.statusPresentation.test.js app/catana/__tests__/PlayerActionContainer.status.test.js`
- `pnpm exec eslint app/catana/utils/gameStatus.js app/catana/__tests__/gameStatus.test.js`

## Status (2026-04-13, removed server roll timer padding)
- Removed the server-side roll animation buffer so authoritative timers now measure actionable time instead of cinematic delay.
- Current behavior:
- `server/timers/TimerManager.js` now starts post-roll, robber-discard, and move-robber timers immediately when the match enters those timed states, even if the triggering move was a roll,
- `server/__tests__/TimerManager.test.js` now asserts that post-roll and move-robber timers start immediately after a roll instead of waiting an extra `3.5s`,
- client effects remain the place to hide or soften transition visuals; the server no longer pads turn or stage time for flourish.
- Focused verification:
- `pnpm exec vitest run server/__tests__/TimerManager.test.js -t "starts postRoll turn timer immediately after a roll|starts moveRobber stage timer immediately after a roll"`

## Status (2026-04-13, same-stage turn bonus timer fix)
- Fixed the live server turn timer so bonus-time moves still add time when the match stays in the same `main:postRoll` stage and turn.
- Current behavior:
- `server/timers/TimerManager.js` now applies turn bonus time before taking the same-stage/same-turn early return, so bonus moves like `maritimeTrade` no longer get ignored just because they do not advance stage or turn,
- `server/__tests__/TimerManager.test.js` now includes a regression test covering a running post-roll timer, elapsed time, and a same-stage bonus move.
- Focused verification:
- `pnpm exec vitest run server/__tests__/TimerManager.test.js -t "adds bonus time during same-stage postRoll updates"`

## Status (2026-04-13, low-timer turn control polish)
- Added the approved low-time and right-edge tweaks for the bottom-right turn controls.
- Current behavior:
- `app/catana/components/PlayerActionContainer.js` now flags visible non-roll timers at `0:05` or lower and passes that presentation state into `TurnControlCluster`,
- `app/catana/components/TurnControlCluster.js` keeps the alert local to the timer segment with rose/danger glass, danger text glow, and a one-second reduced-motion-safe pulse from `TurnControlCluster.css`,
- the bottom-right cluster now sits closer to the desktop right edge by removing the remaining inner right padding and relying on the fixed overlay's `px-4` screen-edge margin.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/TurnControlCluster.test.js app/catana/__tests__/PlayerActionContainer.hitbox.test.js app/catana/__tests__/PlayerActionContainer.status.test.js app/catana/__tests__/turnControlMode.test.js app/catana/__tests__/GameScreen.statusPresentation.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js app/catana/__tests__/PlayerActionBadges.test.js app/catana/__tests__/renderPerfGuards.test.js`
- `pnpm exec eslint app/catana/components/TurnControlCluster.js app/catana/components/PlayerActionContainer.js app/catana/__tests__/TurnControlCluster.test.js app/catana/__tests__/PlayerActionContainer.status.test.js app/catana/__tests__/PlayerActionContainer.hitbox.test.js`
- `git diff --check`
- manual browser check at `/catana/dev/sandbox`, including a simulated `0:05` timer segment because the sandbox route does not seed live timer snapshots; follow-up check confirmed the post-roll button sits 16px from the right edge, matching the left feed panels' 16px edge offset.

## Status (2026-04-13, end-turn button softened)
- Refined the bottom-right end-turn button treatment after visual review.
- Current behavior:
- `app/catana/components/TurnControlCluster.js` keeps the enabled `End turn` control as the only lime CTA, but softens the lime gradient and icon color so it no longer reads as a hard green/white block,
- unavailable end-turn states now keep the same footprint while using a faint blue-white `currentColor` icon and no text-white utility override, so the button reads disabled instead of stark black,
- the icon is slightly smaller/slimmer inside both states while the status strip alignment and other HUD/resource boxes are unchanged.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/TurnControlCluster.test.js app/catana/__tests__/PlayerActionContainer.hitbox.test.js app/catana/__tests__/PlayerActionContainer.status.test.js app/catana/__tests__/turnControlMode.test.js app/catana/__tests__/GameScreen.statusPresentation.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js app/catana/__tests__/PlayerActionBadges.test.js app/catana/__tests__/renderPerfGuards.test.js`
- `pnpm exec eslint app/catana/components/TurnControlCluster.js app/catana/__tests__/TurnControlCluster.test.js app/catana/__tests__/PlayerActionContainer.hitbox.test.js`
- `git diff --check`
- manual browser check at `/catana/dev/sandbox` for `General sandbox` and `Settlement placement`.

## Status (2026-04-13, turn-control baseline lowered)
- Lowered the bottom-right turn-control cluster so the integrated status/action strip returns to its previous baseline while the taller end-turn rail sits lower.
- Current behavior:
- `app/catana/components/TurnControlCluster.js` keeps the strip/button center alignment but offsets the cluster down by `translate-y-2.5`,
- source/render guards now lock that offset so future alignment tweaks do not accidentally lift the strip again.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/TurnControlCluster.test.js app/catana/__tests__/PlayerActionContainer.hitbox.test.js app/catana/__tests__/PlayerActionContainer.status.test.js app/catana/__tests__/turnControlMode.test.js app/catana/__tests__/GameScreen.statusPresentation.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js app/catana/__tests__/PlayerActionBadges.test.js app/catana/__tests__/renderPerfGuards.test.js`
- `pnpm exec eslint app/catana/components/TurnControlCluster.js app/catana/__tests__/TurnControlCluster.test.js app/catana/__tests__/PlayerActionContainer.hitbox.test.js`
- `git diff --check`
- manual browser check at `/catana/dev/sandbox` for `General sandbox` and `Pre-roll`.

## Status (2026-04-13, turn-control glass refinement)
- Refined the bottom-right turn controls so the status/timer now reads as a single translucent glass strip instead of stacked chips.
- Current behavior:
- `app/catana/components/TurnControlCluster.js` now renders one integrated strip with an optional embedded timer segment,
- strip copy/timer now use white-on-glass text treatment instead of the darker slate text from the first refinement pass,
- roll state no longer overloads the bottom CTA: it restores the old standalone dice above the rail, while the lower button stays as a neutral end-turn placeholder until post-roll,
- the `End turn` CTA keeps the same footprint but is vertically centered against the strip and drops the heavy amber shell / hard border treatment in favor of a softer glass shell and lighter lime action core,
- no timer state now collapses to a shorter centered status pill instead of preserving extra empty width.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/TurnControlCluster.test.js app/catana/__tests__/PlayerActionContainer.hitbox.test.js app/catana/__tests__/PlayerActionContainer.status.test.js app/catana/__tests__/turnControlMode.test.js app/catana/__tests__/GameScreen.statusPresentation.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js app/catana/__tests__/PlayerActionBadges.test.js app/catana/__tests__/renderPerfGuards.test.js`
- `pnpm exec eslint app/catana/components/TurnControlCluster.js app/catana/components/PlayerActionContainer.js app/catana/__tests__/TurnControlCluster.test.js app/catana/__tests__/PlayerActionContainer.hitbox.test.js app/catana/__tests__/PlayerActionContainer.status.test.js`
- `git diff --check`
- manual browser check at `/catana/dev/sandbox` on the feature-branch dev server for `General sandbox` and `Pre-roll`.

## Status (2026-04-11, bottom-right turn controls visual follow-up)
- Fixed the follow-up styling issue where the new turn-control status chip and roll button rendered too faint or transparent.
- Current behavior:
- `TurnControlCluster` now uses Tailwind-supported opacity tokens for the glass chips and primary CTA,
- the roll/end-turn CTA uses the same lime action treatment instead of a nearly invisible white button,
- inactive forced-action states keep the same footprint with readable muted glass.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/turnControlMode.test.js app/catana/__tests__/TurnControlCluster.test.js app/catana/__tests__/PlayerActionContainer.status.test.js app/catana/__tests__/PlayerActionContainer.hitbox.test.js app/catana/__tests__/PlayerActionBadges.test.js app/catana/__tests__/GameScreen.statusPresentation.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js app/catana/__tests__/renderPerfGuards.test.js`
- `pnpm exec eslint app/catana/components/TurnControlCluster.js app/catana/components/PlayerActionContainer.js app/catana/GameScreen.js app/catana/utils/turnControlMode.js app/catana/__tests__/TurnControlCluster.test.js app/catana/__tests__/turnControlMode.test.js app/catana/__tests__/PlayerActionContainer.status.test.js app/catana/__tests__/PlayerActionContainer.hitbox.test.js app/catana/__tests__/GameScreen.statusPresentation.test.js`
- `git diff --check`
- manual browser check at `/catana/dev/sandbox` for pre-roll, post-roll, waiting, and road-placement presets on the worktree dev server.

## Status (2026-04-11, bottom-right turn controls redesigned)
- Replaced the old bottom-right dice/status/end-turn stack with a dedicated turn-control module.
- Current behavior:
- `app/catana/components/TurnControlCluster.js` now renders a right-side primary CTA plus left-side status/timer chips,
- the CTA morphs from roll to end-turn using existing `canRoll` / `canEnd` inputs through `app/catana/utils/turnControlMode.js`,
- forced-action states keep the control footprint with a muted disabled button instead of dropping the whole corner UI,
- `GameScreen` now hides the turn-control module in replay/game-over views while leaving the rest of the player-hand surface intact,
- status/timer content still reuses the existing `gameStatus.title` and timer-visibility pipeline instead of introducing a second copy/state layer.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/turnControlMode.test.js app/catana/__tests__/TurnControlCluster.test.js app/catana/__tests__/PlayerActionContainer.status.test.js app/catana/__tests__/PlayerActionContainer.hitbox.test.js app/catana/__tests__/PlayerActionBadges.test.js app/catana/__tests__/GameScreen.statusPresentation.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js app/catana/__tests__/renderPerfGuards.test.js`
- manual browser check at `/catana/dev/sandbox` for pre-roll, road-placement, and game-over presets on the worktree dev server.

## Status (2026-04-11, bottom-right turn-controls design written)
- Wrote the approved design spec for redesigning Catana's bottom-right timer / status / roll / end-turn area.
- Approved direction for this slice:
- the corner becomes one persistent turn-control module instead of separate dice/status/end-turn widgets,
- the main action is a stable rounded-square CTA that morphs between Roll and End Turn,
- a numeric timer chip sits above a short status chip to the left of that button,
- forced-action states keep the same corner footprint with a muted disabled main button instead of removing the control surface,
- status/timer content reuses the existing `gameStatus.title` and timer-visibility model instead of inventing a new copy/state layer.
- Spec path:
- `docs/superpowers/specs/2026-04-11-bottom-right-turn-controls-design.md`
- No implementation yet; this entry records the approved design baseline only.

## Status (2026-04-11, agent docs now call out Catana dev tooling)
- Updated the agent-facing docs so future agents can discover the two Catana dev testing surfaces without codebase spelunking.
- Current behavior:
- `AGENTS.md` now points directly to `app/catana/dev/sandbox/` as the real-board local sandbox and `app/catana/dev/effects/` as the isolated effects lab,
- `docs/agent/NOTES.md` now tells agents when to use `/catana/dev/sandbox` versus `/catana/dev/effects`.
- Focused verification:
- `git diff --check`
- inspected `AGENTS.md`, `docs/agent/NOTES.md`, and `docs/agent/PROGRESS.md`

## Status (2026-04-10, dev-card sleeping veil no longer draws an inner frame)
- Fixed the visual glitch where disabled dev cards rendered a second inset box over the card art.
- Current behavior:
- unplayable dev cards still use the cool translucent "sleeping" veil,
- the veil now spans and clips to the actual card bounds instead of drawing an inset framed overlay,
- the disabled knight/other dev-card edges now stay clean in the dock.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/DevCardDisplay.disabledStyle.test.js`
- visually checked `/catana/dev/effects` with the disabled knight card after hot reload.

## Status (2026-04-10, robber hover preview stays aligned under board zoom)
- Fixed the Catana robber placement preview drift that showed up when hovering a robber action target after zooming the board.
- Added a grounded board shadow under the placed robber so the resting piece reads as sitting on the tile instead of floating above it.
- Current behavior:
- the playful robber preview now locks from the hovered action target's viewport center instead of jumping back to unscaled board-space tile coordinates,
- the intended "slightly left of the number token" landing offset now scales with the live board zoom, so the locked preview stays visually aligned at both zoomed-in and zoomed-out levels,
- the placed robber in `app/catana/Tile.js` now uses the same shadow footprint/gradient language as the moving preview, just positioned closer to the piece base, and it still dims during the origin-preview state,
- added regression/source guards for zoomed hover locking in `app/catana/__tests__/utils/robberPlacementPreviewMotion.test.js` and for the grounded placed-robber render in `app/catana/__tests__/Tile.robberPlacementUx.test.js`.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/utils/robberPlacementPreviewMotion.test.js app/catana/__tests__/RobberPlacementPreview.test.js app/catana/__tests__/RobberPlacementPreview.springMotion.test.js app/catana/__tests__/Board.robberPlacementUx.test.js`
- `pnpm exec eslint app/catana/RobberPlacementPreview.js app/catana/utils/robberPlacementPreviewMotion.js app/catana/__tests__/utils/robberPlacementPreviewMotion.test.js`
- `pnpm exec vitest run app/catana/__tests__/Tile.robberPlacementUx.test.js`
- `pnpm exec eslint app/catana/Tile.js app/catana/__tests__/Tile.robberPlacementUx.test.js`

## Status (2026-04-10, Catana sandbox follow-up fixes)
- Fixed two post-implementation sandbox regressions that showed up during manual use of the new dev route.
- Current behavior:
- `app/catana/dev/sandbox/SandboxBoardShell.js` now syncs local `ctx.activePlayers` from the sandbox core turn state on mount/reset, so post-roll presets really enter `postRoll` instead of looking post-roll in `G.core` while staying stuck in `preRoll` at the local bgio stage layer,
- dev-card purchases now work from sandbox presets such as `General sandbox`, `Post-roll`, and `Dev-card ready` because the dock action stage and the underlying move legality are aligned again,
- `app/catana/components/DevCardDisplay.css` no longer overrides the stacked dev-card buttons back to `position: relative`, so multiple non-VP dev cards stay in one horizontal tray instead of dropping below it.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/DevSandboxBoardShell.test.js app/catana/__tests__/DevSandboxBoardShell.source.test.js app/catana/__tests__/DevSandboxClient.source.test.js app/catana/__tests__/DevSandboxPresets.test.js app/catana/__tests__/DevSandboxPanel.source.test.js app/catana/__tests__/DevCardDisplayLayout.source.test.js app/catana/__tests__/DevCardDisplayGroups.test.js app/catana/__tests__/PlayerActionBadges.test.js app/catana/__tests__/Moves.devCards.test.js`
- manual smoke-check via `pnpm dev` at `/catana/dev/sandbox` confirmed the buy-dev dock action is enabled in post-roll sandbox states and extra dev cards remain on one row.

## Status (2026-04-10, Catana dev sandbox route added)
- Added a dev-only Catana sandbox route at `/catana/dev/sandbox` that boots the real game screen locally without `pnpm serve` or live match wiring.
- Current behavior:
- `app/catana/dev/sandbox/SandboxClient.js` builds a preset-specific local `boardgame.io/react` client, remounts it on preset change/reset, and now waits until client mount before rendering to avoid the hydration mismatch that showed up during manual smoke-check,
- `app/catana/dev/sandbox/presets.js` defines the fixed v1 sandbox presets and viewer-seat coercion helpers, while `createSandboxGame.js` injects sandbox-only `devScenarioState` boot data instead of changing live route setup,
- `SandboxBoardShell` reuses `GameScreenWithEffects` with local match metadata plus a collapsible overlay panel for preset switching, viewer-seat switching, reset, quick resources, and quick dev-card nudges.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/DevSandboxRoute.source.test.js app/catana/__tests__/DevSandboxClient.source.test.js app/catana/__tests__/DevSandboxPresets.test.js app/catana/__tests__/DevSandboxBoardShell.source.test.js app/catana/__tests__/DevSandboxPanel.source.test.js`
- `pnpm exec vitest run app/catana/__tests__/DebugUiVisibility.test.js app/catana/__tests__/LobbyPageClient.scenarios.test.js`
- manual smoke-check via `pnpm dev` at `/catana/dev/sandbox`

## Status (2026-04-09, repo tree cleaned and push blockers verified away)
- Cleaned repo noise from the perf follow-up and re-verified that the current working tree is pushable.
- Current behavior:
- generated profiling output under `artifacts/` and `traces/` is now ignored and removed from the working tree,
- the stale source-contract tests now point at the real post-refactor targets (`AccountPageClient` for account branding copy and `MemoizedCatanBoard` for theme wiring),
- `pnpm verify` passes again,
- a clean `rm -rf .next && pnpm build` passes again; the earlier missing chunk error was from sharing `.next` with an active `pnpm dev` session, not from a real production build break.
- Focused verification:
- `pnpm exec vitest run app/__tests__/publicBranding.source.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`
- `pnpm verify`
- `rm -rf .next && pnpm build`
- `git diff --check`

## Status (2026-04-09, split-port timer and idle routes work again in local dev)
- Fixed the local invite/game-page follow-up bug where `/timer` and `/idle` requests were blocked or missing during split-port dev runs.
- Current behavior:
- the custom `server.router` routes in `server/server.js` now emit permissive CORS headers and respond to `OPTIONS`, so the Next app on `3000` can call the bgio API app on `8080` for timer seeding and idle acknowledgement,
- `GameScreen` continues to use the lobby/API origin helper for `/timer` and `/idle`, which is correct because `boardgame.io` mounts the shared router on the separate API app when `lobbyConfig.apiPort` is configured.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/GameScreen.idleGrace.test.js server/__tests__/serverRoutes.source.test.js`
- `pnpm exec eslint app/catana/GameScreen.js app/catana/__tests__/GameScreen.idleGrace.test.js server/server.js server/__tests__/serverRoutes.source.test.js`
- `git diff --check`

## Status (2026-04-09, local match bootstrap no longer hard-requires internal URL env)
- Removed the local-dev bootstrap footgun where app-owned match routes threw `GAME_SERVER_INTERNAL_URL is required` unless that env var was manually set, and corrected the fallback target to the actual bgio lobby API port.
- Current behavior:
- the server-side bgio wrapper in `lib/server/matches/joinMatchForAccount.js` now falls back to `http://localhost:8080` outside production, which is the bgio lobby API port used for create/join/metadata HTTP calls,
- the browser-facing live game connection origin remains `http://localhost:8000`; local dev still uses split ports on purpose,
- production still relies on explicit `GAME_SERVER_INTERNAL_URL` wiring; the fallback is dev/test only.
- Focused verification:
- `pnpm exec vitest run lib/server/__tests__/matchBootstrap.test.js`
- `pnpm exec eslint lib/server/matches/joinMatchForAccount.js lib/server/__tests__/matchBootstrap.test.js`
- `git diff --check`

## Status (2026-04-09, live `/g` boot path now starts from server-known seat state)
- Tightened the direct live-game route boot path so `/g/:matchID` no longer depends on `localStorage` before it can render a game-shaped shell.
- Current behavior:
- app-owned seat-claiming routes now mirror returned bgio seat credentials into match/player-scoped `HttpOnly` cookies, and `/api/matches/leave` clears that cookie when the seat is released,
- `app/g/[matchID]/page-content.js` now reads the server-fetched live match payload plus the seat credential cookie and passes both into `MatchPageClient`,
- `MatchPageClient` now seeds its initial `match` and `credentials` state from those server props and only falls back to `localStorage` when the cookie-backed path is unavailable,
- the bgio client now uses `LiveMatchLoadingShell`, which renders the board underlay eagerly/high-priority during live-match sync so direct `/g` loads show a board-shaped shell instead of the default text-only `connecting...` placeholder.
- Focused verification:
- `pnpm exec vitest run app/__tests__/gMatchPage.test.js app/__tests__/api/matchRoutes.test.js app/__tests__/api/challengeRoutes.test.js app/catana/__tests__/MatchPageClient.boot.source.test.js app/catana/__tests__/LiveMatchLoadingShell.render.test.js`
- `pnpm exec eslint app/api/matches/create/handler.js app/api/matches/join/handler.js app/api/matches/leave/handler.js app/api/challenges/create/handler.js 'app/api/challenges/[matchID]/accept/handler.js' 'app/g/[matchID]/page-content.js' 'app/catana/lobby/[matchID]/MatchPageClient.js' 'app/catana/lobby/[matchID]/LiveMatchLoadingShell.js' lib/server/session/matchCredentialCookie.js app/__tests__/gMatchPage.test.js app/__tests__/api/matchRoutes.test.js app/__tests__/api/challengeRoutes.test.js app/catana/__tests__/MatchPageClient.boot.source.test.js app/catana/__tests__/LiveMatchLoadingShell.render.test.js`
- `pnpm build`
- `git diff --check`

## Status (2026-04-09, prod build blocker, archive crash, and warnings cleaned up)
- Fixed the current production-build blocker, the live archive insert crash, and the remaining build/lint warnings surfaced during the perf audit follow-up.
- Current behavior:
- `pnpm build` no longer type-checks the legacy `misc/` Colonist adapter code, so missing `@colonist/*` packages in that dead slice no longer block the real app build,
- archive writes now serialize replay/state payloads as JSON strings before they are inserted into `JSONB` columns, which stops the `22P02 invalid input syntax for type json` crash during finished-match archival,
- the `/account` route now keeps query-param decoding in a server page wrapper and moves the interactive claim UI into `AccountPageClient`, so the previous full-page client-render deopt warning is gone,
- the Catana warning cleanup pass removed the CSS nesting warning, fixed the hook-dependency warnings, stabilized the effects-lab memo deps, and explicitly disabled the raw-`img` lint rule only in the UI files that intentionally use plain `<img>` tags,
- `next.config.js` now aliases `bufferutil` and `utf-8-validate` to `false`, which removes the noisy optional native-addon resolution warnings from the `ws` dependency chain.
- Focused verification:
- `pnpm exec vitest run server/__tests__/ArchiveManager.test.js server/__tests__/buildInputs.source.test.js app/__tests__/accountPage.source.test.js app/catana/__tests__/renderPerfGuards.test.js app/catana/__tests__/useWindowSize.test.js app/catana/__tests__/BoardUnderlay.render.test.js`
- `pnpm exec eslint server/archive/archiveFinishedMatch.js next.config.js app/account/page.js app/account/AccountPageClient.js app/__tests__/accountPage.source.test.js app/catana/Card.js app/catana/DevCardPurchaseReveal.js app/catana/Tile.css app/catana/Tile.js app/catana/components/ActionsDock/DockCard.js app/catana/components/ActionsDock/hooks/useMousePosition.js app/catana/components/PlayerActionContainer.js app/catana/components/TradeDiscardModal.js app/catana/dev/effects/EffectsLabClient.js server/__tests__/ArchiveManager.test.js server/__tests__/buildInputs.source.test.js`
- clean temp-copy build: `pnpm build` in `/tmp/settlex-buildcheck`

## Status (2026-04-09, board first paint and timer rerender guards tightened)
- Tightened two client-side Catana perf guards that showed up in browser profiling on the live game route.
- Current behavior:
- `useWindowSize` now starts from a shared fallback viewport instead of `undefined`, so the board mounts on the first render and the board underlay image is discoverable in initial HTML,
- `BoardUnderlay` now explicitly marks the underlay image eager/high-priority for the initial board paint,
- `GameScreen` now mounts `MemoizedCatanBoard`, so the 250ms countdown/disconnect/idle ticker no longer re-renders the whole board subtree when board props are unchanged,
- `Board` now lazy-loads the robber/build placement preview components and prewarms those chunks during browser idle time, so GSAP-heavy preview code stays off the initial critical path without adding a first-preview hitch,
- the old debug `board render` console spam is gone.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/useWindowSize.test.js app/catana/__tests__/BoardUnderlay.render.test.js app/catana/__tests__/renderPerfGuards.test.js`
- `pnpm exec eslint app/catana/utils/useWindowSize.js app/catana/BoardUnderlay.js app/catana/Board.js app/catana/GameScreen.js app/catana/__tests__/useWindowSize.test.js app/catana/__tests__/BoardUnderlay.render.test.js app/catana/__tests__/renderPerfGuards.test.js`

## Status (2026-04-09, friend challenge invites added)
- Added the front-page `Play a Friend` flow with private invite creation, a dedicated `/challenge/:matchID` accept route, and a home-page waiting modal.
- Current behavior:
- friend challenges are still normal 2-player bgio matches, but they are tagged with app-owned `friend_challenge` metadata and use a distinct `/challenge/:matchID` share URL instead of the live `/g/:matchID` route,
- the inviter seat is randomized at challenge creation time so the creator does not always go first,
- existing-account invitees auto-accept immediately, while first-time invitees use the shared identity modal with generated guest defaults,
- invite links expire after 5 minutes if unclaimed and are canceled immediately when the inviter closes the modal,
- private challenge matches are filtered out of `/api/matches/open` and rejected by the normal public `/api/matches/join` path.
- Focused verification:
- `pnpm exec vitest run lib/server/__tests__/matchBootstrap.test.js lib/server/__tests__/friendChallenge.test.js lib/server/__tests__/listPublicOpenMatches.test.js app/__tests__/api/matchRoutes.test.js app/__tests__/api/challengeRoutes.test.js app/__tests__/challengePage.test.js app/__tests__/challengePageClient.source.test.js app/__tests__/api/routeModuleExports.source.test.js app/catana/__tests__/playerIdentityStorage.test.js app/catana/__tests__/LobbyPageClient.identity.test.js app/catana/__tests__/LobbyPageClient.playWithFriend.test.js app/catana/__tests__/LobbyPageClient.playVsBot.test.js app/catana/__tests__/LobbyPageClient.matchmakingFeedback.test.js`

## Status (2026-04-09, deploy sync now respects `.gitignore`)
- Tightened the OCI deploy sync step so rsync respects repository ignore rules instead of relying only on a short manual exclude list.
- Current behavior:
- the deploy workflow still uses rsync over SSH,
- but it now applies `.gitignore` as an rsync filter,
- and it keeps explicit excludes for `.git/`, `node_modules/`, `.next/`, and `.env.prod`.
- Focused verification:
- `pnpm exec vitest run server/__tests__/deploymentFiles.source.test.js`

## Status (2026-04-09, deploy flow switched to server-native OCI rebuilds)
- Replaced the GHCR/image-build deployment path with a simpler server-native rebuild flow for the ARM OCI host.
- Current behavior:
- GitHub Actions still runs `pnpm verify`,
- then syncs the checked-out repo to the VM over SSH,
- then triggers `infra/scripts/deploy-prod.sh` on the VM,
- the VM keeps `postgres` and `caddy` running and rebuilds only `web` and `game` locally with Docker Compose.
- Implementation highlights:
- `infra/docker-compose.prod.yml` now builds `Dockerfile.web` and `Dockerfile.game` from source on the server instead of requiring pinned image tags,
- `.github/workflows/deploy-prod.yml` no longer uses QEMU, Buildx, or GHCR login/push steps,
- `docs/deploy/oci-mvp.md` now documents the reduced secret surface and the server-native rebuild flow.
- Focused verification:
- `pnpm exec vitest run server/__tests__/deploymentFiles.source.test.js`
- `bash -n infra/scripts/deploy-prod.sh`

## Status (2026-04-08, unified `/g/:matchID` live-or-archive lifecycle)
- Fixed the finished-match restart path and replaced the old lobby URL model with a single canonical match route.
- Current behavior:
- finished matches are archived immediately with replay data plus durable chat rows,
- live finished matches stay available for postgame chat while any tracked seat remains connected,
- live cleanup now waits for `finished + archived + all disconnected + grace timer`,
- later visits to the same `/g/:matchID` URL fall back to archive-backed replay/postgame mode instead of recreating a fresh bgio match.
- Implementation highlights:
- added `lib/server/db/sql/0003_archived_match_chat.sql` and archived-by-match lookup helpers,
- added `server/chat/MatchChatStore.js` and `server/lifecycle/FinishedMatchRetentionManager.js`,
- wired `server/timers/timerPubSub.js`, `server/archive/archiveFinishedMatch.js`, and `server/server.js` to retain chat, archive it, and clean finished live matches only after disconnect-based retention expires,
- added `lib/server/matches/getMatchPageData.js` plus the new `app/g/[matchID]/` route,
- removed the old route entry files `app/catana/lobby/page.js` and `app/catana/lobby/[matchID]/page.js`,
- updated reconnect and navigation flows to target `/g/:matchID`.
- Focused verification:
- `pnpm exec vitest run server/__tests__/MatchChatStore.test.js server/__tests__/FinishedMatchRetentionManager.test.js server/__tests__/timerPubSub.test.js server/__tests__/ArchiveManager.test.js server/__tests__/TimerManager.test.js server/__tests__/serverGameConfig.test.js lib/server/__tests__/dbMigrations.test.js lib/server/__tests__/getArchivedMatchByMatchId.test.js lib/server/__tests__/getMatchPageData.test.js lib/server/__tests__/matchBootstrap.test.js app/__tests__/gMatchPage.test.js app/__tests__/replayPage.test.js app/__tests__/replayPageClient.test.js app/__tests__/api/matchRoutes.test.js app/catana/__tests__/reconnectBanner.test.js app/catana/__tests__/ReconnectBannerPersistence.source.test.js app/catana/__tests__/LobbyPageClient.matchmakingFeedback.test.js app/catana/__tests__/LobbyPageClient.playVsBot.test.js app/catana/__tests__/LobbyPageClient.identity.test.js app/catana/__tests__/LobbyPageClient.scenarios.test.js app/catana/__tests__/MatchPageClient.botFill.test.js`
- `pnpm exec eslint server/chat/MatchChatStore.js server/lifecycle/FinishedMatchRetentionManager.js server/timers/timerPubSub.js server/archive/archiveFinishedMatch.js server/server.js server/__tests__/MatchChatStore.test.js server/__tests__/FinishedMatchRetentionManager.test.js server/__tests__/timerPubSub.test.js server/__tests__/ArchiveManager.test.js lib/server/matches/getArchivedMatchByMatchId.js lib/server/matches/getMatchPageData.js lib/server/replays/getArchivedReplay.js lib/server/__tests__/dbMigrations.test.js lib/server/__tests__/getArchivedMatchByMatchId.test.js lib/server/__tests__/getMatchPageData.test.js 'app/g/[matchID]/page.js' 'app/g/[matchID]/page-content.js' 'app/replays/[replayId]/ReplayPageClient.js' app/replays/replayClientState.js app/__tests__/gMatchPage.test.js app/__tests__/replayPageClient.test.js app/catana/utils/reconnectBanner.js app/catana/lobby/LobbyPageClient.js 'app/catana/lobby/[matchID]/MatchPageClient.js' app/catana/__tests__/reconnectBanner.test.js`
- `git diff --check`

## Status (2026-04-08, finished matches stay terminal)
- Fixed the deployed postgame restart bug by closing two separate server-side holes.
- `server/timers/TimerManager.js` now treats `ctx.gameover` / `G.core.gameOver` as terminal and immediately clears armed stage timers, turn timers, and pending bot dispatches before any same-stage same-turn early return.
- `server/archive/ArchiveManager.js` now makes live finished-match cleanup opt-in instead of the default archive path, and `server/server.js` no longer wires the live bgio wipe after archiving.
- Why that second change was needed:
- stock `boardgame.io` auto-creates a missing match on sync, so wiping a finished live match let an open page reconnect into a brand-new `waiting to start` match with a fresh board under the same match id.
- Added regressions in:
- `server/__tests__/TimerManager.test.js`
- `server/__tests__/ArchiveManager.test.js`
- Focused verification:
- `pnpm exec vitest run server/__tests__/TimerManager.test.js server/__tests__/ArchiveManager.test.js`
- `pnpm exec vitest run server/__tests__/timerPubSub.test.js server/__tests__/serverGameConfig.test.js`

## Status (2026-04-07, accounts/profiles/replay design written)
- Wrote the approved spec in:
- `docs/superpowers/specs/2026-04-07-accounts-profiles-and-replay-design.md`
- Approved direction for this slice:
- first-play identity remains low-friction, but now creates a real server-backed `guest` account with a long-lived session cookie,
- usernames are globally unique, profiles are public at `/u/:username`, and finished-match replay pages are public,
- `boardgame.io` stays the live in-memory game engine for MVP, while Settlex-owned Postgres tables store accounts, username history, and archived finished-match replay data forever,
- local development uses local Postgres plus `pnpm dev` / `pnpm serve`, while production runs on one OCI ARM VM with Docker Compose and one Postgres instance,
- no staging and no restart-safe live-match persistence in this MVP.
- No implementation yet; this entry records the design baseline only.

## Status (2026-04-07, Catana left rail cleanup)
- Removed the in-match Dev Tools card from the left meta rail so the sidebar only carries the player-facing Game Log and Chat panels.
- Gave the rail a modest large-screen width bump and increased both feed panels slightly on `xl` screens so long log/chat rows feel less cramped without introducing user-resize behavior.
- Made the shared feed-panel title bar non-selectable so dragging across the panel no longer highlights `Game Log` / `Chat` header text.
- Updated the Catana source-contract tests to lock the new rail shape:
- no `DebugPanel` in `LeftMetaRail`,
- `w-72 md:w-80 xl:w-96` rail sizing,
- matching `h-[20vh] xl:h-[24vh]` log/chat panel heights.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/FeedPanel.test.js app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/DebugUiVisibility.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/ChatPanel.test.js`

## Status (2026-04-07, status/log presentation plan written)
- Wrote the implementation plan in:
- `docs/superpowers/plans/2026-04-07-game-status-and-log-presentation-plan.md`
- Planned execution shape for this slice:
- viewer-aware status model first,
- Catana status-box/timer wiring second,
- richer Monopoly and finite-bank-shortage core payloads third,
- richer canonical log entries fourth,
- client-local log reveal timing and reconnect-safe flush behavior last.

## Status (2026-04-07, status/log presentation design written)
- Wrote the approved spec in:
- `docs/superpowers/specs/2026-04-07-game-status-and-log-presentation-design.md`
- Approved direction for this slice:
- keep the status box as a viewer-personalized current-prompt/orientation surface,
- keep the thought bubble as the icon-only companion to the same shared status model,
- keep the game log as canonical history, but improve its payloads for Monopoly / robber / finite-bank-shortage cases,
- make distribution-related log visibility client-local so animations can delay reveal without delaying canonical state,
- treat reconnect as a hard reset for local reveal gating so backfilled log entries appear immediately.
- No implementation yet; this entry records the design baseline only.

## Status (2026-04-07, dev cards use sleeping disabled styling)
- Replaced the old disabled dev-card grayscale/brown treatment with a softer "sleeping card" treatment.
- Current behavior:
- unplayable dev cards keep their base card color instead of desaturating into brown,
- a cool translucent veil now sits over the card to communicate "not usable right now" without adding text or badges,
- playable dev cards and their hover/active behavior remain unchanged.
- Implementation shape:
- `app/catana/components/DevCardDisplay.css` now uses a subtle blue-white overlay on `.devcard-disabled` instead of the old grayscale filter.
- Focused verification:
- inspected the updated disabled-state CSS and compared it against the approved side-by-side mockup used during visual review.

## Status (2026-04-07, batched maritime trades and monopoly picker cleanup)
- Fixed the awkward bank-trade UX where maritime trades had to be submitted one at a time even when the offer already contained multiple valid port/bank chunks.
- Current behavior:
- `TradeDiscardModal` now lets the player build one maritime submission with multiple give chunks and multiple receive picks in the same dialog.
- In trade mode, clicking a give resource adds one full tradable chunk at that resource's current best rate (`2:1`, `3:1`, or `4:1`), so one click on `wheat` can add `4`, and two clicks on `ore` can add `8`.
- The receive row now uses the same +/- count-box pattern as the give row, capped by the total number of trade chunks unlocked by the selected offer.
- `Monopoly` no longer uses +/- steppers; it now reuses the icon-button picker pattern so exactly one resource is highlighted and then claimed.
- Rule / move changes:
- `game-core/src/rules/trading.ts` now exposes `getMaritimeTradeReceiveCount(...)` plus `applyMaritimeTradeBatch(...)` so mixed-rate maritime offers can be validated and applied atomically.
- `app/catana/Moves.js` now accepts maritime payloads with multiple receive resources and logs aggregated give/receive counts in one `trade:maritime` entry.
- Added regression coverage in:
- `game-core/src/rules/trading.test.ts`
- `app/catana/__tests__/Moves.trade.test.js`
- `app/catana/__tests__/TradeDiscardModal.test.js`
- Focused verification:
- `pnpm exec vitest run game-core/src/rules/trading.test.ts app/catana/__tests__/Moves.trade.test.js app/catana/__tests__/TradeDiscardModal.test.js app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/gameText.test.js app/catana/__tests__/tradeQuickOpen.test.js`
- `pnpm -C game-core build`

## Status (2026-04-07, gameplay coverage audit pass)
- Tightened gameplay test coverage around robber and trade flow after auditing PyCatan, JSettlers2, and catanatron:
- fixed a core rules gap where `applyMoveRobber` allowed the robber to be moved onto its current tile,
- added a core regression in `game-core/src/rules/turnFlow.test.ts` for illegal same-tile robber placement,
- added a positive player-trade execution regression in `game-core/src/rules/trading.test.ts`,
- added a 3-player boardgame.io reducer test in `app/catana/__tests__/Moves.robber.test.js` covering multi-player discard sequencing and handoff back to the roller for `moveRobber`.
- Matched the official FAQ rule for finite-bank resource shortages:
- `game-core/src/rules/turnFlow.ts` now gives all remaining cards of a resource to the lone entitled player when the bank cannot fully satisfy that single player's claim,
- if multiple players are entitled to that resource and the bank cannot satisfy all of them, none of that resource is distributed that turn.
- Added regressions for the FAQ shortage rule and unordered discards:
- `game-core/src/rules/turnFlow.test.ts` now covers a lone city receiving the last matching bank card instead of zero cards,
- `game-core/src/rules/turnFlow.test.ts` also covers pending discarders resolving in arbitrary order,
- `app/catana/__tests__/Moves.robber.test.js` now proves pending discarders can discard out of order before robber control returns to the roller.
- Tightened dev-card edge coverage around `roadBuilding`, `yearOfPlenty`, and `monopoly`:
- `app/catana/Moves.js` now refuses to start `roadBuilding` if the player has no legal free-road placements, even if they still have road pieces,
- `app/catana/Moves.js` now auto-finishes `roadBuilding` after the first free road if no second legal placement remains,
- `app/catana/__tests__/Moves.devCards.test.js` now covers:
- `roadBuilding` with exactly one road piece left,
- `roadBuilding` with zero road pieces left,
- `roadBuilding` with zero legal placements,
- `roadBuilding` auto-finishing when only one legal placement exists,
- `game-core/src/rules/devCards.test.ts` now covers:
- `yearOfPlenty` taking two copies of the same resource when both are available,
- `monopoly` as a no-op when opponents hold none of the chosen resource.
- Verification for the gameplay coverage pass:
- `pnpm exec vitest run game-core/src/rules/turnFlow.test.ts game-core/src/rules/trading.test.ts game-core/src/rules/devCards.test.ts game-core/src/rules/victory.test.ts app/catana/__tests__/Moves.robber.test.js app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/Moves.endTurn.test.js`

## Status (2026-04-04, robber handoff stall after out-of-turn discard fixed)
- Fixed the hang where a `7` roll could get stuck on `Move Robber` after the last discard was made by a non-current player.
- Root cause:
- `app/catana/Moves.js` was advancing from `robberDiscard` with `events.setStage("moveRobber")`.
- In boardgame.io, `setStage` targets the move caller, not necessarily `ctx.currentPlayer`.
- So when player `0` finished the last discard on player `1`'s turn, the state became:
- `G.core.turn.phase === "robberMove"`
- `ctx.currentPlayer === "1"`
- `ctx.activePlayers["0"] === "moveRobber"`
- which stranded robber control on the wrong seat and left bot/timer progression unable to resolve the turn.
- Current fix:
- robber stage entry/exit now explicitly retarget the current player via `events.setActivePlayers({ currentPlayer: ..., others: null })`,
- `discardResources` now hands control straight to that current-player robber stage once discards are complete instead of ending only the discarding player's stage first.
- Added regression coverage in:
- `app/catana/__tests__/Moves.robber.test.js`
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/Moves.robber.test.js app/catana/__tests__/Moves.devCards.test.js server/__tests__/TimerManager.test.js server/__tests__/pufferBotManager.test.js server/__tests__/pufferStateAdapter.test.js`

## Status (2026-04-05, dev-card reveal design revised to effect-driven buyer-only flow)
- Revised the dev-card purchase reveal design in:
- `docs/superpowers/specs/2026-04-05-dev-card-purchase-reveal-design.md`
- Approved direction for this slice:
- stop deriving the bought card face by diffing local `beforeCards` / `afterCards`,
- emit an authoritative `buyDevCardReveal` effect carrying the bought `cardType`,
- keep the reveal buyer-only in the client,
- freeze the local dev-card dock presentation and local VP badge presentation until the reveal lands,
- leave engine state, scoring, and game-over authority immediate underneath the local UI freeze.

## Status (2026-04-05, effect-driven dev-card reveal implementation plan written)
- Wrote the implementation plan in:
- `docs/superpowers/plans/2026-04-05-dev-card-purchase-reveal-plan.md`
- Planned execution shape for this slice:
- return and emit the authoritative bought `cardType` from the core rule + move path,
- wire that payload through `bgio-effects`,
- start the buyer-only reveal from the effect payload instead of local hand diffing,
- freeze the buyer's dock hand and VP badge presentation until reveal completion,
- keep engine state and scoring immediate underneath the local UI delay.

## Status (2026-04-04, private buy-dev reveal now runs from dock to hand)
- Added the local-only dev-card purchase reveal for the `buy dev` dock action.
- Interaction shape:
- the dock now squashes only the dev-card emblem, not the green plus badge,
- `PlayerActionContainer` captures the dock button rect plus the local player's pre-buy dev-card snapshot,
- `GameScreen` watches the local `player.devCards` delta, identifies the newly bought dev card, and starts one transient reveal payload,
- `DevCardPurchaseReveal` animates emblem -> card back build -> face flip -> travel to the real `DevCardDisplay` hand area.
- Privacy rule:
- the reveal is derived only from the local player's visible `player.devCards`,
- so non-buyers do not get the card-face reveal through the shared effect system.
- Audio/motion:
- the reveal uses local Howler playback with the existing resource-card pop / woosh files,
- and the send-to-hand leg uses the same general travel feel as resource distribution rather than inventing a new motion family.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/utils/devCardPurchaseReveal.test.js`
- `pnpm exec eslint app/catana/components/ActionsDock/DockCard.js app/catana/components/PlayerActionContainer.js app/catana/components/DevCardDisplay.js app/catana/GameScreen.js app/catana/DevCardPurchaseReveal.js app/catana/utils/devCardPurchaseReveal.js`
- Browser verification:
- a temporary dev-only harness route was created, used to capture center/back/face/hand screenshots of the new reveal, then deleted before committing the feature.
- Residual lint noise:
- only the existing `@next/next/no-img-element` warnings remain, plus the same warning on the new reveal component because the animated temporary card still uses plain `img` tags.

## Status (2026-04-04, preload timer no longer cancels before road lock)
- Fixed the real road-hover regression introduced by the dock preload work.
- Root cause:
- `BuildPlacementPreview` owned the `launchReady` timer in one effect,
- but the main animation effect cleanup was also clearing that timer,
- so when build targets registered during the preload window and triggered a rerender, the timer could be canceled before it fired.
- Result:
- the picked-up road still followed the cursor, but it stayed in the prelaunch branch (`launchReady === false`), so it never locked onto action targets and never rotated off the default vertical angle.
- Current fix:
- `app/catana/BuildPlacementPreview.js` no longer clears the preload timer from the broad animation-effect cleanup,
- timer cleanup now stays scoped to the dedicated preload-timer effect and the explicit inactive/reset path.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/BuildPlacementPreview.springMotion.test.js app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/Dock.buildPickupUx.test.js app/catana/__tests__/utils/buildPlacementPreviewMotion.test.js`
- `pnpm exec eslint app/catana/BuildPlacementPreview.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js`

## Status (2026-04-04, road target handoff now waits for visible turn-in)
- Fixed the remaining road-hover presentation bug where the floating road could hand off to the edge-local flashing preview before its own turn into the target edge was readable.
- Root cause:
- `BuildPlacementPreview` still treated target handoff as a pure timeout,
- but road lock-in uses spring-driven rotation,
- so after the dock preload and the stronger lock spring, the fixed timeout could still expire before the follower had visibly rotated close enough to the edge angle.
- Implementation shape:
- `app/catana/utils/buildPlacementPreviewMotion.js` now exports `isBuildTargetHandoffReady(...)`,
- `road` handoff uses a minimum delay plus rotation/position thresholds, with a max-delay fallback so it cannot get stuck,
- `settlement` / `city` keep the simpler time-only handoff,
- `app/catana/BuildPlacementPreview.js` now tracks when each lock starts and only flips `showTargetPreview` for roads once that readiness check passes.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/utils/buildPlacementPreviewMotion.test.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/Dock.buildPickupUx.test.js`
- `pnpm exec eslint app/catana/BuildPlacementPreview.js app/catana/utils/buildPlacementPreviewMotion.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js app/catana/__tests__/utils/buildPlacementPreviewMotion.test.js`

## Status (2026-04-04, road handoff and dock preload retuned)
- Retuned two parts of the build pickup motion:
- `road` now keeps the floating follower visible longer on a valid edge target before handing off to the edge-local flashing preview, so the turn into the edge is readable again,
- the dock icon preload now holds the squash longer before release, with cubic easing into the compressed state and reverse cubic easing out of it when the piece launches.
- Implementation shape:
- `app/catana/utils/buildPlacementPreviewMotion.js` now exports `getBuildTargetHandoffDelayMs(pieceType)` and gives `road` a longer edge-lock handoff than `settlement` / `city`,
- `app/catana/BuildPlacementPreview.js` uses that piece-type-specific handoff delay instead of a single shared constant,
- `app/catana/components/PlayerActionContainer.js` increases the hidden preload delay to `132ms`,
- `app/catana/components/ActionsDock/DockCard.js` drives the icon squash with explicit press-in / release configs instead of one generic spring response.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/playerAction.test.js app/catana/__tests__/GameScreen.cancelBuildAction.test.js app/catana/__tests__/Dock.buildPickupUx.test.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/ActionNode.test.js app/catana/__tests__/utils/buildPlacementPreviewMotion.test.js`
- `pnpm exec eslint app/catana/components/ActionsDock/DockCard.js app/catana/components/PlayerActionContainer.js app/catana/BuildPlacementPreview.js app/catana/utils/buildPlacementPreviewMotion.js app/catana/__tests__/Dock.buildPickupUx.test.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/utils/buildPlacementPreviewMotion.test.js`

## Status (2026-04-04, dock icon wrapper selectors fixed)
- Fixed the remaining dock regressions where build icons rendered too large and the road icon disappeared entirely.
- Root cause:
- the preload wrapper styles in `app/catana/components/ActionsDock/dockStyles.css` were written as Sass-style nested selectors (`&__img`, `&__img-shell`),
- in this repo's actual CSS pipeline those selectors did not compile into real `.card__img` / `.card__img-shell` class rules,
- so the wrapper had no layout styles at runtime, settlement/city fell back to their raw intrinsic SVG size, and the road SVG collapsed to `0px` because that asset only has a `viewBox` and no explicit `width` / `height`.
- Fix:
- replaced the invalid nested selector form with flat class selectors for `.card__img` and `.card__img-shell`.
- Verification:
- `pnpm exec vitest run app/catana/__tests__/Dock.buildPickupUx.test.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js`
- live browser verification on a temporary dev-only dock harness confirmed:
- the road icon renders again,
- settlement/city return to the old card footprint,
- the cursor-follow handoff still behaves correctly after the previous preload fix.

## Status (2026-04-04, dock icon sizing and hidden pointer follow restored)
- Fixed the follow-up regressions from the preload handoff change:
- the dock build icons are back to their original sizing footprint,
- the road icon renders again in the selected card instead of disappearing,
- the hidden preload no longer pins the build preview to the dock origin, so the detached piece resumes following the live cursor as soon as it releases.
- Root cause:
- the icon wrapper had taken over the old sizing semantics (`80%` width moved from the `img` to the shell), which changed the art footprint and broke the rotated road icon rendering,
- `BuildPlacementPreview` was also freezing `currentPositionRef` at the dock origin during the hidden preload window, so the follower could not continue tracking the pointer behind the scenes.
- Implementation shape:
- `app/catana/components/ActionsDock/dockStyles.css` now keeps the squash wrapper full-card sized and restores the old `img`-level `80%` sizing,
- `app/catana/BuildPlacementPreview.js` no longer forces the preview motion state back to `origin` on every hidden-preload frame.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/Dock.buildPickupUx.test.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js`

## Status (2026-04-04, dock preload handoff regressions fixed)
- Fixed the regressions introduced by the dock-icon pre-squash pass:
- the detached `road` / `settlement` / `city` piece now stays fully hidden until the preload releases,
- the hidden preload window keeps tracking the live pointer so the piece launches toward the current cursor again instead of sticking to the dock origin,
- the dock icon shell is back to the old centered footprint so the build icons no longer sit misaligned in their cards.
- Implementation shape:
- `app/catana/BuildPlacementPreview.js` now keeps the visual preview frozen at the dock origin only while `launchReady` is false, but still updates `desiredPositionRef` from the latest pointer coordinates during that hidden preload,
- the same file also keeps the road's hidden baseline rotation at `90deg` during the preload hold,
- `app/catana/components/ActionsDock/dockStyles.css` restores the centered icon shell sizing (`80%` shell, `100%` image within it) instead of stretching the wrapper to the full card.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/Dock.buildPickupUx.test.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js`
- `pnpm exec vitest run app/catana/__tests__/Dock.buildPickupUx.test.js app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js app/catana/__tests__/utils/buildPlacementPreviewMotion.test.js`
- `pnpm exec eslint app/catana/components/ActionsDock/DockCard.js app/catana/components/PlayerActionContainer.js app/catana/Board.js app/catana/BuildPlacementPreview.js app/catana/__tests__/Dock.buildPickupUx.test.js app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js`

## Status (2026-04-04, dock icon pre-squash added before build launch)
- Added a short dock-icon pre-squash before `road` / `settlement` / `city` pickup launch:
- the icon inside the dock button compresses briefly,
- then the existing build pickup appears and follows the current cursor.
- Implementation shape:
- `app/catana/components/ActionsDock/DockCard.js` now animates the icon only (`scaleX` / `scaleY` / `y`) instead of the whole card,
- `app/catana/components/PlayerActionContainer.js` tags explicit build actions with `preLaunchDelayMs`,
- `app/catana/BuildPlacementPreview.js` respects `startedAtMs` + `launchDelayMs` so the preview stays hidden during that tiny preload window while still tracking pointer movement for the eventual handoff.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/Dock.buildPickupUx.test.js app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js app/catana/__tests__/utils/buildPlacementPreviewMotion.test.js`
- `pnpm exec eslint app/catana/components/ActionsDock/DockCard.js app/catana/components/PlayerActionContainer.js app/catana/Board.js app/catana/BuildPlacementPreview.js app/catana/__tests__/Dock.buildPickupUx.test.js app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js`

## Status (2026-04-04, build piece shadows now gate on board land)
- Matched build-piece shadow behavior to the robber preview:
- the `road` / `settlement` / `city` in-hand shadow now stays hidden while the piece is off-board,
- it only appears once the preview is over board land.
- Implementation shape:
- `app/catana/Board.js` now passes the same `landRobberPreviewTiles` + `size` data into `BuildPlacementPreview`,
- `app/catana/BuildPlacementPreview.js` reuses `isPointOverRobberBoardLand(...)` to gate the build shadow in both normal-motion and reduced-motion paths.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js app/catana/__tests__/utils/buildPlacementPreviewMotion.test.js`
- `pnpm exec eslint app/catana/Board.js app/catana/BuildPlacementPreview.js app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js`

## Status (2026-04-04, launch orientation and cursor bias tuned)
- Fixed the initial road pickup orientation bug:
- the in-hand road now starts from the same vertical baseline as the rendered road graphic, so it no longer pops out sideways and rotates back to vertical on click.
- Retuned the dock-click launch motion to read more clearly as a pickup:
- higher lift / overshoot than the previous pass,
- a small cursor-directed drift during the launch window so fast upward mouse movement feels more connected to the piece being picked up,
- existing target lock / handoff behavior stays unchanged after the launch completes.
- Implementation shape:
- `app/catana/utils/buildPlacementPreviewMotion.js` now exposes `getBuildPickupLaunchBias(...)` alongside the launch envelope config,
- `app/catana/BuildPlacementPreview.js` applies that bias only during the initial launch and keeps the underlying follower / target-lock state intact.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/BuildPlacementPreview.springMotion.test.js app/catana/__tests__/utils/buildPlacementPreviewMotion.test.js`

## Status (2026-04-04, dock pickup launch motion tightened)
- Tweaked the initial `road` / `settlement` / `city` dock click animation so the picked-up piece now gets a short two-step launch envelope before the existing cursor-follow handoff:
- small pressed hold,
- quick upward lift,
- tiny overshoot settle back into the live follower.
- Implementation shape:
- launch tuning now lives in `app/catana/utils/buildPlacementPreviewMotion.js` via `getBuildPickupLaunchMotion(pieceType)`,
- `app/catana/BuildPlacementPreview.js` applies that launch on the preview visual layer only, so the outer preview still owns true cursor-follow position and board-target handoff.
- Tuning intent:
- approved default is the tighter `option 1` motion (`~296ms` total) so it stays fast for repeated placement,
- moving it toward the bouncier `option 2` later should only require changing launch offsets/scales/durations, not restructuring the handoff logic.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js app/catana/__tests__/utils/buildPlacementPreviewMotion.test.js`
- `pnpm exec eslint app/catana/BuildPlacementPreview.js app/catana/utils/buildPlacementPreviewMotion.js app/catana/__tests__/utils/buildPlacementPreviewMotion.test.js`
- Browser verification note:
- attempted a live check through the local lobby flow after starting `pnpm serve`,
- the dev scenario room created successfully, but the match page stalled on `connecting...`, so the final motion feel was not validated from a trustworthy live board render in this pass.

## Status (2026-04-03, action dock build pickup implemented)
- Reworked the explicit build buttons in the Catana action dock to remove the old magnify behavior and the looping bounce.
- Current interaction:
- `road`, `settlement`, and `city` now start a real build-pickup flow from the clicked dock button,
- the piece launches from the button into a cursor-following `BuildPlacementPreview`,
- the selected dock button stays subtly active while the piece is in hand,
- `Escape`, click-cancel, end turn, game-over, and other reset paths now clear the pickup immediately with no fly-back.
- Board wiring added in:
- `app/catana/components/ActionsDock/Dock.js`
- `app/catana/components/ActionsDock/DockCard.js`
- `app/catana/components/PlayerActionContainer.js`
- `app/catana/BuildPlacementPreview.js`
- `app/catana/Board.js`
- `app/catana/ActionNode.js`
- `app/catana/utils/playerAction.js`
- Runtime regressions fixed during browser verification:
- `ActionNode` build-target registration no longer depends on unstable `buildTargetMeta` object identity, which had caused a `Maximum update depth exceeded` loop as soon as a road pickup rendered live board targets.
- explicit build mode now also resets when the underlying action stops being legal, not just when the turn/stage changes, which prevents stale `Place Road` UI from surviving after resources/legality change.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/playerAction.test.js app/catana/__tests__/GameScreen.cancelBuildAction.test.js app/catana/__tests__/Dock.buildPickupUx.test.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/ActionNode.test.js app/catana/__tests__/Board.robberPlacementUx.test.js`
- Browser checks on fresh scenario-backed matches verified:
- road pickup appears from the dock, follows the cursor, snaps to legal edge targets, and cancels cleanly on `Escape`,
- city pickup appears from the dock, follows the cursor, and snaps to legal upgrade nodes,
- stale illegal build pickup clears on reload after legality/turn changes instead of leaving the dock stuck in `Place Road`.

## Status (2026-04-03, dock build pickup design written)
- Wrote the dock interaction design spec in:
- `docs/superpowers/specs/2026-04-03-action-dock-build-pickup-design.md`
- Approved direction for this slice:
- keep the current Catana dock styling/layout,
- remove dock magnify and the old looping bounce,
- scope the interaction cleanup to explicit `road` / `settlement` / `city` build actions only,
- make the clicked build piece visually launch from the dock button into a live cursor-following placement preview that reuses the robber-placement motion model,
- keep cancel immediate and quiet with no fly-back animation.

## Status (2026-04-03, stale pregame readyUp accepted on server)
- Fixed the remaining human-matchmaking `waiting to start` bug where the board could load, one player would still sit in pregame for `~10-15s`, and the server logged:
- `ERROR: invalid stateID, was=[0], expected=[1] - playerID=[1] - action[readyUp]`
- Root cause:
- even after the client-side sync guard, `readyUp` could still race with another human's earlier `readyUp` between initial sync and the local patch/update landing.
- boardgame.io sends multiplayer moves optimistically from the client's current local store state, so the second player's pregame ready could be submitted against stale `_stateID=0` even though the move itself was still semantically safe to apply on server state `1`.
- Current fix:
- `app/catana/Moves.js` now marks `readyUp` with `ignoreStaleStateID: true`, allowing the master to apply a just-stale pregame ready on top of the latest authoritative state.
- Added a server-level regression in `app/catana/__tests__/Game.readyUpStaleState.test.js` that reproduces the exact two-human race:
- player `0` readies at state `0`,
- player `1` then readies with stale state `0`,
- the match still advances into `placement`.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/Game.readyUpStaleState.test.js app/catana/__tests__/preGameReady.test.js`
- `pnpm exec vitest run app/catana/__tests__/LobbyPageClient.matchmakingFeedback.test.js app/catana/__tests__/GameScreen.connectionBanner.test.js`

## Status (2026-04-03, human matchmaking ready-up race and lobby handoff flash fixed)
- Fixed the intermittent human-vs-human `waiting to start` regression where one seat could miss auto-ready and the match sat in pregame until the `15s` timer advanced it.
- Root cause:
- `app/catana/GameScreen.js` was auto-sending `readyUp` as soon as the local boardgame.io client rendered `preGame`.
- In multiplayer, the client mounts with a local initial state before socket sync completes, so the first browser arriving after another seat had already moved could dispatch `readyUp` with stale `_stateID=0`.
- The server then rejected that move with `invalid stateID ... action[readyUp]`, leaving that player unready until `autoStartGame`.
- UX issue addressed in the same slice:
- `app/catana/lobby/LobbyPageClient.js` was clearing `searchState` before `router.push(...)`, which exposed the home screen for a short moment after a match was found.
- Current fix:
- added `app/catana/utils/preGameReady.js` and now gate `readyUp` behind authoritative multiplayer sync (`isConnected` plus synced `matchData`) and the server's own `readyByPlayerId` state,
- kept the matchmaking modal mounted through navigation by introducing a small lobby-side `phase` field and switching the modal copy to `Match found!` / `Loading board…` during route handoff.
- Focused verification:
- `pnpm exec vitest run app/catana/__tests__/preGameReady.test.js app/catana/__tests__/LobbyPageClient.matchmakingFeedback.test.js app/catana/__tests__/GameScreen.connectionBanner.test.js`
- `pnpm exec vitest run app/catana/__tests__/LobbyPageClient.playVsBot.test.js app/catana/__tests__/ReconnectBannerPersistence.source.test.js`

## Status (2026-04-03, idle ack route port mismatch fixed)
- Fixed the `I'm still here` idle acknowledgement flow failing with a browser CORS/preflight error.
- Root cause:
- `app/catana/GameScreen.js` was calling custom Koa routes on `http://<host>:8000`, but with `server.run({ port: 8000, lobbyConfig: { apiPort: 8080 } })` the `server.router` routes are mounted on the separate API app at `:8080`, not on the socket/game server at `:8000`.
- The browser symptom looked like CORS, but the real failure was a preflight `OPTIONS` request hitting the wrong port and getting a bare `404`.
- Current fix:
- `GameScreen.js` now uses the API/lobby base URL (`:8080`) for both `/timer/:matchID` seed fetches and `/idle/:matchID/ack`.
- Focused verification:
- `pnpm vitest run app/catana/__tests__/GameScreen.idleGrace.test.js`

## Status (2026-04-03, AFK timer live-pubsub regression fixed)
- Fixed the live server wiring bug that prevented the AFK idle modal and AFK forfeit from ever triggering in real matches.
- Root cause:
- `server/timers/timerPubSub.js` was treating Boardgame.io pubsub updates like client-facing transport payloads.
- In production, raw master `update` payloads arrive as `[matchID, state]`, with the move log still living on `state.deltalog`.
- Because the wrapper only looked for `args[2]`, `IdlePresenceManager` never saw `autoRoll` / `autoEndTurn`, so idle strikes stayed at `0`.
- Current fix:
- `createTimerPubSub(...)` now extracts deltalog from the raw state payload (`state.deltalog` / `state.G.deltalog`) when explicit deltalog args are absent.
- Added a regression test in `server/__tests__/timerPubSub.test.js` that simulates raw master `update` payloads and verifies a real idle strike is recorded.
- Focused verification:
- `pnpm vitest run server/__tests__/timerPubSub.test.js`
- `pnpm vitest run server/__tests__/IdlePresenceManager.test.js server/__tests__/acknowledgeIdle.test.js`

## Status (2026-04-03, green circled plus asset added)
- Added a new plus icon asset in:
- `public/svgs/plus/circled_plus_green.svg`
- Asset direction for this slice:
- reuse the circular form and beveled treatment from `circled_m.svg`,
- swap the blue palette for the green gradient family from `check_mark_button.svg`,
- replace the center glyph with a scaled plus from `plus.svg` using the existing soft glow + near-white face treatment.
## Status (2026-04-03, idle / AFK grace implemented)
- Implemented the 1v1 idle / AFK grace flow across server presence, server dispatch, and the Catana match UI.
- Server behavior now:
- `server/presence/IdlePresenceManager.js` tracks consecutive idle strikes from fully auto-resolved normal gameplay turns,
- `2` consecutive strikes start a `60s` `Idle` grace window,
- `server/presence/acknowledgeIdle.js` plus `POST /idle/:matchID/ack` clear the idle window with authenticated credentials,
- idle timeout dispatches the new server-only `resolveIdleForfeit` move, ending the match as `AFK Forfeit`.
- Client behavior now:
- `app/catana/utils/idlePresence.js` mirrors the disconnect snapshot math for live countdowns,
- `app/catana/GameScreen.js` merges idle server events into the log, gives disconnect precedence over idle seat state, and shows a local `Are you still there?` modal with countdown + `I'm still here`,
- `PlayerAvatarStats`, `OpponentPlayerBox`, and `PlayerActionContainer` reuse the existing warning-seat shell for both `Disconnected` and `Idle`.
- Focused verification:
- `pnpm exec vitest run server/__tests__/IdlePresenceManager.test.js server/__tests__/acknowledgeIdle.test.js server/__tests__/timerPubSub.test.js server/__tests__/dispatchMatchUpdate.test.js app/catana/__tests__/Moves.resign.test.js app/catana/__tests__/idlePresence.test.js app/catana/__tests__/gameText.test.js app/catana/__tests__/IdlePromptModal.source.test.js app/catana/__tests__/GameScreen.idleGrace.test.js app/catana/__tests__/PlayerAvatarStatsPresence.test.js app/catana/__tests__/OpponentPlayerBox.test.js app/catana/__tests__/PlayerActionBadges.test.js`

## Status (2026-04-03, idle / AFK grace implementation plan written)
- Wrote the implementation plan in:
- `docs/superpowers/plans/2026-04-03-idle-afk-grace-plan.md`
- Planned execution shape for this slice:
- add a dedicated `IdlePresenceManager` beside disconnect presence,
- detect strikes from fully auto-resolved normal gameplay turns,
- add a small authenticated `POST /idle/:matchID/ack` route for `I'm still here`,
- reuse the current seat/log warning language with `Idle` copy and a local countdown modal,
- keep disconnect precedence explicit rather than collapsing idle + disconnect into one manager.

## Status (2026-04-03, idle / AFK grace design written)
- Wrote the 1v1 idle / AFK grace design spec in:
- `docs/superpowers/specs/2026-04-03-idle-afk-grace-design.md`
- Approved product direction for this slice:
- count idle strikes only in normal gameplay,
- one strike = a human seat's turn resolves with only server timeout moves and no human-authored move,
- any real human move resets the consecutive strike count,
- `2` consecutive strikes start a `60s` `Idle` grace window,
- everyone sees seat + log state, only the affected local player sees the modal,
- acknowledgement goes through a small authenticated custom server endpoint because idle state stays outside `G.core`.
- Related MVP compromise recorded in:
- `docs/mvp-compromises.md`

## Status (2026-04-03, player color conflict-groups design written)
- Wrote the conflict-policy design in:
- `docs/superpowers/specs/2026-04-03-player-color-conflicts-design.md`
- Approved product direction for this slice:
- keep exact duplicate colour protection,
- add explicit in-game conflict groups for:
  - `lavender` / `violet` / `purple`
  - `lavender` / `magenta` / `purple`
- `red` / `coral`
- keep `violet` + `magenta` allowed,
- retire `olive` from live use by removing it from selectable/assignable palettes and normalizing old `olive` values to `lime`.

## Status (2026-04-03, player color conflicts implementation plan written)
- Wrote the implementation plan in:
- `docs/superpowers/plans/2026-04-03-player-color-conflicts-plan.md`
- Planned direction for this slice:
- retire `olive` from the canonical player palette and normalize legacy `olive` values to `lime`,
- add an explicit conflict-aware effective-color resolver instead of generalized similarity heuristics,
- wire `GameScreen.js` to use that resolver as the in-game color source,
- remove the remaining avatar-only `chosenColor` preference so avatar backgrounds match resolved piece colors.

## Status (2026-04-03, player color conflicts implemented)
- Retired `olive` from the live Catana player palette:
- `app/catana/theme/playerColors.js` now treats `olive` as a legacy alias to `lime`,
- `PLAYER_COLOR_OPTIONS` no longer exposes `olive`,
- piece asset resolution now maps old `olive` ids onto the `lime` SVG family through normal color normalization.
- Added an explicit in-game player-color conflict policy in:
- `app/catana/utils/playerColorsInGame.js`
- Approved conflict groups now prevent these combinations from appearing together in one match:
  - `lavender` with `violet`, `purple`, or `magenta`
  - `purple` with `lavender`, `violet`, or `magenta`
  - `red` with `coral`
- `violet` and `magenta` remain allowed together by design.
- Rewired `app/catana/GameScreen.js` so effective match colors now come from the conflict-aware resolver before building player views, board color props, log player colors, and placement-effect piece colors.
- Removed the last avatar-only color split:
- `app/catana/components/PlayerAvatarStats.js` now uses `player.color` only, so avatar gradients follow the resolved in-game piece color instead of a separate `chosenColor` override.

## Status (2026-04-02, player effective colors implementation plan written)
- Wrote the implementation plan in:
- `docs/superpowers/plans/2026-04-02-player-effective-colors-plan.md`
- Planned direction for this slice:
- add a pure resolver that converts `core.players` order plus `matchData[].data.color` into one `effectiveColorByPlayerId` map,
- build `playerViewMap` from that resolved map instead of hardcoded seat colours,
- thread the same resolved colours through board pieces, placement previews/effects, avatar boxes, log/chat highlights, and postgame colour accents,
- remove the current `chosenColor` vs seat-colour split inside the match UI.

## Status (2026-04-02, lobby matchmaking feedback made immediate)
- Fixed the main lobby UX gap where the 1v1 `Play` button could appear inert for the second player while the client joined an already-open match.
- Root cause:
- `app/catana/lobby/LobbyPageClient.js` only set `searchState` after the create-and-join path completed, so the existing searching modal never appeared during the "join open seat" path.
- Current fix:
- `Play` now sets a local searching state immediately on click before any matchmaking network branch runs,
- the same searching modal is shown right away for both "join existing match" and "create new waiting match",
- cancel/poll behavior stays gated until the client has a real `matchID` and `playerID` to leave safely,
- focused source coverage now guards the immediate-feedback wiring.
- Verification:
- `pnpm exec vitest run app/catana/__tests__/LobbyPageClient*.test.js app/catana/__tests__/ReconnectBannerPersistence.source.test.js`
- `pnpm exec eslint app/catana/lobby/LobbyPageClient.js app/catana/__tests__/LobbyPageClient.matchmakingFeedback.test.js app/catana/__tests__/LobbyPageClient.playVsBot.test.js app/catana/__tests__/LobbyPageClient.scenarios.test.js`

## Status (2026-04-02, board join crash fixed)
- Fixed the `Cannot access 'isCurrentPlayerPerspective' before initialization` crash that blocked the board from loading after the `activePlayers` guard refactor.
- Root cause:
- `app/catana/Board.js` declared `mainBuildableNodes` before the turn-context guards it closed over, so the first render hit a temporal-dead-zone error.
- Current fix:
- local turn/stage guard constants are declared before the `mainBuildableNodes` memo that depends on them,
- regression coverage now asserts that declaration order.
- Verification:
- `pnpm exec vitest run app/catana/__tests__/Board.activePlayers.test.js app/catana/__tests__/Game.placementPhase.test.js app/catana/__tests__/Moves.resign.test.js app/catana/__tests__/Game.boardConfig.test.js server/__tests__/dispatchMatchUpdate.test.js`

## Status (2026-04-02, placement action-node regression fixed)
- Fixed the board-side regression introduced by widening `ctx.activePlayers` for out-of-turn resign.
- Root cause:
- `app/catana/Board.js` was still treating broad `activePlayers` membership as "this viewer can interact", so non-current seats could keep seeing placement/build affordances while their own stage was `null`.
- Current board gating:
- derive the local viewer's stage with `ctx.activePlayers?.[playerID] ?? null`,
- require `ctx.currentPlayer === playerID` plus a non-null local stage before showing live board interactions,
- gate placement settlement/road highlights off the local player's actual stage instead of any staged seat existing in the match.
- Verification:
- `pnpm exec vitest run app/catana/__tests__/Board.activePlayers.test.js app/catana/__tests__/Game.placementPhase.test.js app/catana/__tests__/Moves.resign.test.js app/catana/__tests__/Game.boardConfig.test.js server/__tests__/dispatchMatchUpdate.test.js`

## Status (2026-04-02, in-game transport reconnect banner added)
- Added a client-local "Connection lost. Trying to reconnect..." banner in `app/catana/GameScreen.js`.
- Scope of this pass:
- driven by `bgioProps.isConnected` from the `boardgame.io` transport, not by seat presence,
- only appears after the client has successfully connected at least once,
- debounced by 1200ms so brief socket flaps do not flash the banner,
- suppressed again immediately on reconnect or once game-over is active.
- Follow-up polish:
- the in-game transport warning now reuses the same shared `StatusBanner` shell as the global reconnect banner,
- `GameScreen` renders opponents and the transport warning as one fixed top-center stack, so the warning sits below the opponent row instead of overlapping it.
- Verification:
- `pnpm vitest run app/catana/__tests__/GameScreen.connectionBanner.test.js app/catana/__tests__/GameScreen.gameOver.test.js`
- `pnpm vitest run app/catana/__tests__/GameScreen.connectionBanner.test.js app/catana/__tests__/GlobalReconnectBanner.source.test.js app/catana/__tests__/StatusBanner.source.test.js app/catana/__tests__/GameScreen.gameOver.test.js`

## Status (2026-04-02, player piece asset migration shipped)
- Moved all live Catana road, settlement, and city SVGs into `public/svgs/pieces/` and added the missing lobby-colour variants for:
- `green`
- `orange`
- `purple`
- `pink`
- `cyan`
- `amber`
- Runtime piece pathing now goes through `app/catana/theme/pieceAssets.js`, which builds nested `pieces/<piece>_<color>.svg` filenames plus direct `/svgs/pieces/...` URLs.
- Board piece rendering now prefers the chosen lobby colour metadata over the old seat-order fallback when that metadata is present, while still falling back to `UI_PLAYER_COLORS` if a seat has no chosen colour.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/pieceAssets.test.js app/catana/__tests__/playerView.test.js app/catana/__tests__/renderPerfGuards.test.js app/catana/__tests__/themeAssets.test.js`
- `node -e "import('./app/catana/types.js')"`
- `node -e "import('./app/board-editor/utils/types.js')"`
- `rg -n "colonist\\.io/dist/images/(settlement|city|road)_" app/catana/types.js app/board-editor/utils/types.js`
- `rg --files public/svgs | rg '(^|/)(road|settlement|city)_(red|blue|green|orange|purple|pink|cyan|amber)\\.svg$'`
- `xmllint --noout public/svgs/pieces/*.svg`

## Status (2026-04-02, out-of-turn resign fixed)
- Fixed the live resign turn-gate so any seated player can resign immediately, even when they are not the current active turn seat.
- Engine/state changes:
- `app/catana/Game.js` now keeps non-current seats `Stage.NULL`-active in placement/main turn config and when booting dev scenarios into saved turn context.
- `app/catana/Moves.js` now preserves those `Stage.NULL` seats when robber-discard narrows active players, so resign still works during discard resolution.
- `server/dispatch/dispatchMatchUpdate.js` now prefers a real staged seat over `Stage.NULL` seats for targeted server moves, so server-owned dispatch still chooses the correct actor after widening `activePlayers`.
- Regression coverage added for:
- out-of-turn resign during a normal turn,
- out-of-turn resign during robber discard,
- turn-config and scenario-seeding active-player shape for global moves.

## Status (2026-04-02, game-over confetti replay fixed)
- Fixed the winner-confetti replay bug when reopening the Results modal after game end.
- Root cause:
- `GameOverModal` kept its own `useRef` confetti guard, so closing and reopening the modal remounted it and replayed the celebration.
- Current behavior:
- `GameScreen` now owns the winner-confetti seen state for the active game-over,
- the confetti flag resets only when the game-over state clears,
- reopening Results in the same finished game no longer re-fires confetti.
- Verification:
- `pnpm exec vitest run app/catana/__tests__/GameOverModal.test.js app/catana/__tests__/GameScreen.gameOver.test.js`

## Status (2026-04-02, disconnect pulse collision fixed)
- Fixed the disconnect-seat pulse bug on the current `main` worktree.
- Root causes addressed:
- board-level `@keyframes pulse` in `app/catana/Board.css` was colliding with Tailwind's `animate-pulse`,
- `GameScreen` was still exposing disconnect presence after the reconnect window had closed because it trusted `statusByPlayerId` instead of the active countdown.
- UI behavior now:
- board-only pulse keyframes use `board-pulse`,
- disconnect pulse is applied once at the seat wrapper level via `seat-disconnected-pulse`,
- disconnected avatar / panel / card surfaces no longer pulse independently,
- disconnect visuals clear when the active reconnect window ends.
- Verification:
- `pnpm vitest run app/catana/__tests__/GameScreen.gameOver.test.js app/catana/__tests__/Board.pulseAnimation.test.js app/catana/__tests__/disconnectPresence.test.js app/catana/__tests__/PlayerAvatarStatsPresence.test.js app/catana/__tests__/OpponentPlayerBox.test.js app/catana/__tests__/PlayerActionBadges.test.js`

## Status (2026-04-02, disconnect seat visual polish tightened)
- Tightened the disconnect-seat styling on merged `main` after screenshot review.
- Visual adjustments in this pass:
- restored the white glass ring treatment on the road/army panel, opponent card box, and disconnected player dock,
- moved the warning glyph inward so it no longer sits on the avatar border,
- switched the disconnect countdown pill to the repo's rose danger styling,
- suppressed the opponent thought bubble while a seat is disconnected,
- changed disconnected avatar/panels to a stronger grayscale read with a light Tailwind pulse.
- Verification:
- `pnpm exec vitest run app/catana/__tests__/PlayerAvatarStatsPresence.test.js app/catana/__tests__/OpponentPlayerBox.test.js app/catana/__tests__/PlayerActionBadges.test.js`

## Status (2026-04-02, disconnect seat styling regression fixed)
- Fixed the avatar / road-army layout regression introduced by the disconnect-presence UI.
- Root cause:
- `PlayerAvatarStats` added a widened avatar column plus `items-center` alignment, which created a permanent horizontal gap and made the road/army panel drop when the disconnect timer pill appeared.
- Styling adjustments in this pass:
- restored flush avatar-to-stats alignment,
- top-aligned the opponent row so extra disconnect height does not drag adjacent boxes,
- removed the warning emoji bubble in favor of a plain corner glyph,
- shifted disconnected seat tinting to a subtle rose treatment,
- removed the rendered `SERVER` pill from log entries while keeping italic server copy.
- Verification:
- `pnpm verify`

## Status (2026-04-02, Catana live chat panel + wrap fix)
- Replaced the preview-only chat slice with live `boardgame.io` chat wiring in:
- `app/catana/components/ChatPanel.js`
- `app/catana/utils/chatMessages.js`
- `app/catana/components/LeftMetaRail.js`
- The chat composer now lives inside the chat card footer, anchored at the bottom of the same panel instead of sitting in a separate stacked box.
- Players can send trimmed text-only chat messages with Enter; spectators see the live transcript but get a disabled read-only composer.
- Follow-up visual pass:
- removed the extra helper copy under the chat input,
- tightened the footer/input padding,
- reduced the chat transcript inset slightly so the panel reads closer to the reference mock.
- Fixed the shared feed row wrapping bug by removing the row-level `flex-wrap` layout from the log/chat adapters and letting token rows wrap as normal inline content.
- Extended or replaced the chat-focused tests in:
- `app/catana/__tests__/FeedPanel.test.js`
- `app/catana/__tests__/ChatPanel.test.js`
- `app/catana/__tests__/chatMessages.test.js`
- `app/catana/__tests__/GameLogPanel.test.js`
- Verification:
- `pnpm exec vitest run app/catana/__tests__/FeedPanel.test.js app/catana/__tests__/ChatPanel.test.js app/catana/__tests__/chatMessages.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/gameText.test.js app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/DebugUiVisibility.test.js app/catana/__tests__/renderPerfGuards.test.js app/catana/__tests__/uiNoDragImages.test.js app/catana/__tests__/GameScreen.interactionGuards.test.js`
- `pnpm lint`

## Status (2026-04-02, global reconnect banner implemented)
- Implemented the reconnect-banner MVP across root layout, Catana lobby flows, and game-over cleanup.
- New client/runtime seams:
- `app/catana/utils/activeMatchStorage.js`
- `app/catana/utils/reconnectBanner.js`
- `app/catana/components/GlobalReconnectBanner.js`
- Lifecycle wiring now:
- writes `catana:last-active-match` when a human seat is successfully joined or resumed,
- clears that record on known game-over for the same seated match,
- clears it when matchmaking search is cancelled after leaving the queued seat.

## Status (2026-04-02, Catana left meta rail shipped)
- Added `app/catana/components/LeftMetaRail.js` as the fixed bottom-left owner for the meta panels.
- Moved the dev-only debug panel into the rail and normalized `app/catana/components/DebugPanel.js` to a normal block-level panel.
- Let `app/catana/components/GameLogPanel.js` accept a `rootClassName` override so the log can be placed inside the rail without owning viewport positioning.
- Rewired `app/catana/GameScreen.js` to mount `LeftMetaRail` with the game log entries, player map, theme, player ID, and BGIO props.
- Updated the debug visibility regression so it checks the extracted rail path instead of expecting `GameScreen.js` to own the debug panel directly.
- Verification:
- `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/DebugUiVisibility.test.js`
- `pnpm exec vitest run app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/ChatPanel.test.js app/catana/__tests__/renderPerfGuards.test.js`

## Status (2026-04-02, global reconnect banner plan written)
- Wrote the implementation plan in:
- `docs/superpowers/plans/2026-04-02-global-reconnect-banner-plan.md`

## Status (2026-04-02, Catana chat preview fix pass)
- Fixed `buildChatPreviewEntries(...)` so an explicit `playerID` stays the current speaker even when it is absent from `playerMap`.
- Removed viewport-fixed placement responsibility from `ChatPanel.js`; the panel is now layout-neutral and ready for a parent rail to position later.
- Tightened the chat panel preview copy so the disabled composer reads as preview-only instead of a live input.
- Adjusted the chat-focused contract tests in:
- `app/catana/__tests__/chatPreview.test.js`
- `app/catana/__tests__/ChatPanel.test.js`
- Verification:
- `pnpm exec vitest run app/catana/__tests__/gameText.test.js app/catana/__tests__/chatPreview.test.js app/catana/__tests__/ChatPanel.test.js`

## Status (2026-04-02, global reconnect banner design approved)
- Wrote the approved reconnect-banner design spec in:
- `docs/superpowers/specs/2026-04-02-global-reconnect-banner-design.md`
- Wrote the repo-level MVP compromise ledger in:
- `docs/mvp-compromises.md`

## Status (2026-04-02, Catana in-match chat panel implementation plan written)
- Wrote the implementation plan in:
- `docs/superpowers/plans/2026-04-02-chat-panel-plan.md`
- Plan direction for this slice:
- extract a shared feed-panel shell,
- move the existing game log onto that shell,
- add a presentational chat panel beneath it,
- mount both inside a single fixed left rail,
- move the dev-only debug panel into that same rail.

## Status (2026-04-02, Catana in-match chat panel design approved)
- Wrote the approved in-match chat panel spec in:
- `docs/superpowers/specs/2026-04-02-chat-panel-design.md`
- Approved direction for this slice:
- keep the current game log on the left,
- add chat as a second panel stacked below it,
- use the same width and equal-height panels for the first pass,
- keep chat presentational only for now, with transport/send wiring deferred.

## Status (2026-04-02, Catana chat preview panel shipped)
- Added `formatChatEntry` to `app/catana/utils/gameText.js` so chat entries reuse the existing player token model without resource expansion.
- Added the deterministic preview transcript helper in `app/catana/utils/chatPreview.js`.
- Replaced the `ChatPanel.js` scaffold with a presentational preview panel that renders through `FeedPanel`, maps preview rows through `FeedTokenRow`, and shows disabled glass-style composer chrome with preview-only copy.
- Extended the chat-focused contract tests in:
- `app/catana/__tests__/gameText.test.js`
- `app/catana/__tests__/chatPreview.test.js`
- `app/catana/__tests__/ChatPanel.test.js`
- Verification:
- `pnpm exec vitest run app/catana/__tests__/gameText.test.js app/catana/__tests__/chatPreview.test.js app/catana/__tests__/ChatPanel.test.js`

## Status (2026-04-01, disconnect/reconnect regression follow-up fixed)
- Fixed the first live regression found in the disconnect/resign MVP:
- disconnect timeout no longer stalls at `00:00`,
- reconnect now rebroadcasts authoritative presence even when the pub/sub cache is cold.
- Server/runtime follow-up changes:
- `dispatchMatchUpdate` now executes `resolveDisconnectForfeit` as the active seat while targeting the disconnected loser,
- stage move maps now expose `resign` and `resolveDisconnectForfeit` in every live stage where boardgame.io checks availability,
- `timerPubSub` can load current state on `matchData` when no cached board state has been seen yet.
- Verification:
- `pnpm verify`

## Status (2026-04-01, disconnect/resign authoritative flow shipped)
- Added the approved 1v1 disconnect/resign MVP across server and client.
- Server/runtime behavior now includes:
- server-owned disconnect presence state with a 60 second reconnect window,
- rebroadcast of cached board state on `matchData` disconnect/reconnect changes,
- immediate resign loss,
- disconnect timeout resolving as opponent win.
- Client/UI behavior now includes:
- authoritative `server:*` log lines merged with `G.gameLog`,
- disconnected seat badge, countdown pill, dimming, and subtle pulse,
- minimal resign control with confirmation,
- game-over copy that recognizes `Resignation` and `Disconnect Forfeit`.

## Status (2026-04-01, Catana opponent empty-card placeholder cleanup)
- Removed the white inset outline from empty opponent card placeholders while keeping the transparent/faded card silhouettes.
- Runtime changes:
- `app/catana/components/CardStack.js` now uses only the faded empty-state opacity treatment and no longer adds the white ring classes for zero-count stacks.
- Added focused regression coverage in:
- `app/catana/__tests__/CardStack.emptyState.test.js`

## Status (2026-04-01, Catana board initial viewport centering)
- Fixed the first-load Catana board framing so the board is centered on the browser viewport instead of the reduced board-safe height.
- Runtime changes:
- `app/catana/utils/boardLayout.js` still sizes the board against the reserved UI height, but now anchors the board center to the full viewport midpoint.
- Added regression coverage in:
- `app/catana/__tests__/utils/boardLayout.test.js`
- `app/catana/__tests__/GameScreen.zoomPan.test.js`

## Status (2026-04-01, turn-scoped modal cleanup on timeout/end turn)
- Fixed stale turn-scoped UI so modal flows close when the viewer loses the turn or leaves the required stage.
- Runtime changes:
- `app/catana/GameScreen.js` now derives trade/dev-dialog visibility from a shared turn-context guard.
- `app/catana/Moves.js` now clears unresolved `devCardPlay` state when a turn ends, preventing `Year of Plenty` / `Monopoly` dialogs from surviving an auto-timeout end turn.
- Added focused regression coverage in:
- `app/catana/__tests__/turnUiState.test.js`
- `app/catana/__tests__/Moves.endTurn.test.js`

## Status (2026-04-01, resource-card fronts for brick/sheep/wood)
- Added standalone resource-front SVGs in:
- `public/svgs/new_cards/brick_dev.svg`
- `public/svgs/new_cards/sheep_dev.svg`
- `public/svgs/new_cards/wood_dev.svg`
- Direction for this pass:
- reuse the current cream resource-card shell,
- replace the blue inner field with resource-matched radial gradients pulled from the `emoji` tile palette,
- remove the white hex badge and center the resource emblem directly on the field.

## Status (2026-03-31, bot matches start immediately)
- Fixed the solo-bot pregame delay so `Play Against Bot` no longer waits for the full pregame timeout before starting.
- Runtime changes:
- `server/timers/timerPubSub.js` seeds dynamic bot seats from transport `matchData` payloads before later pregame state updates are processed.
- `server/bots/pufferBotManager.js` supports syncing bot-seat detection from filtered `matchData` arrays as well as full metadata records.
- `server/server.js` passes the bot manager into the timer pubsub wrapper so the cache is primed during live transport updates.
- Added focused regression coverage in:
- `server/__tests__/timerPubSub.test.js`

## Status (2026-04-01, resource distribution bespoke card fronts)
- Updated the tile resource-distribution effect in:
- `app/catana/effects/resourceDistribution.js`
- Resource distribution pop-outs now use the bespoke per-resource card fronts from:
- `public/svgs/cards/resource/`
- Updated card-back/front consumers to the moved asset folders:
- `app/catana/components/OpponentPlayerBox.js`
- `app/catana/components/DevCardDisplay.js`
- Added focused regression coverage in:
- `app/catana/__tests__/effects/resourceDistribution.test.js`
- `app/catana/__tests__/DevCardDisplay.assets.test.js`

## Status (2026-04-02, shared feed-shell contract established)
- Extracted the Catana feed shell into shared components in:
- `app/catana/components/FeedPanel.js`
- `app/catana/components/FeedTokenRow.js`
- Added a memoized `ChatPanel.js` scaffold so the perf guard can lock the upcoming chat panel contract.
- Rewired `GameLogPanel.js` to delegate chrome, auto-scroll, and token rendering to the shared feed shell while keeping the existing `game-log-*` CSS aliases for compatibility.
- Updated the contract tests in:
- `app/catana/__tests__/FeedPanel.test.js`
- `app/catana/__tests__/uiNoDragImages.test.js`
- `app/catana/__tests__/renderPerfGuards.test.js`
- Refreshed the `GameLogPanel` source test to reflect the new delegation.
- Verification:
- `pnpm exec vitest run app/catana/__tests__/FeedPanel.test.js app/catana/__tests__/uiNoDragImages.test.js app/catana/__tests__/renderPerfGuards.test.js app/catana/__tests__/GameLogPanel.test.js`

## Status (2026-03-31, robber placement UX design approved)
- Wrote the approved robber-placement UX spec in:
- `docs/superpowers/specs/2026-03-31-robber-placement-ux-design.md`
- Approved direction for this slice:
- preserve the current robber placement behavior as `minimal`,
- add a `playful` cursor-follow overlay with magnetic target stickiness,
- make `playful` the new desktop default,
- defer any user-facing settings UI while keeping a clean internal motion-mode seam.
- Implementation is intentionally scoped to UI/runtime behavior only:
- no engine or server robber rules should change,
- no 3D tilt in the first pass,
- reduced-motion and coarse-pointer environments should fall back to `minimal`.

## Status (2026-03-28, dev-card icon live tuning)
- Wrote the implementation plan for the approved live pass in:
- `docs/superpowers/plans/2026-03-28-dev-card-icon-tuning-plan.md`
- Updated the live dev-card dock asset in:
- `public/svgs/icon_devcard.svg`
- Applied the approved tuning:
- tighter `viewBox` crop so the icon occupies more of the dock card,
- uneven blue lift with the biggest change in the darkest stop,
- warmer hammer handle / shadow ramps for better disabled-state contrast.
- Kept the existing hammer-disc concept and warm top-half palette intact; this pass is a tuning pass, not a symbol redesign.
- Verification:
- `xmllint --noout public/svgs/icon_devcard.svg`
- `rsvg-convert -w 96 -h 96 public/svgs/icon_devcard.svg > /tmp/devcard-icon-96.png`
- `rsvg-convert -w 64 -h 64 public/svgs/icon_devcard.svg > /tmp/devcard-icon-64.png`

## Status (2026-03-24, resource-card emblem concept pass)
- Wrote the approved emblem-only spec and implementation plan in:
- `docs/superpowers/specs/2026-03-24-resource-card-emblem-design.md`
- `docs/superpowers/plans/2026-03-24-resource-card-emblem-plan.md`
- Created three temporary standalone resource-card emblem SVGs in:
- `tmp/card-back-concepts/resource-emblems/`
- Variant set:
- `hybrid-seal.svg`
- `network-hex.svg`
- `medallion-cluster.svg`
- Shared direction for this pass:
- reuse the Catana tile-style outer hex badge,
- replace the question-mark center idea with a five-hex resource/network emblem,
- keep the work standalone so it can be reviewed before changing `card_rescardback`.
- Rendered review artifacts:
- `/tmp/resource-emblem-renders/contact-sheet.png`
- `/tmp/resource-emblem-renders/contact-sheet-72.png`
- Current read from the concept logic:
- `network-hex` is the most direct `board/resources` read,
- `hybrid-seal` is the best balance if the emblem still wants badge presence,
- `medallion-cluster` is the most ceremonial and the least literal.
- Live `public/svgs/card_rescardback.svg` remains unchanged in this pass.

## Status (2026-03-24, resource-card emblem design approved)
- Wrote the approved standalone resource-card emblem spec in:
- `docs/superpowers/specs/2026-03-24-resource-card-emblem-design.md`
- New direction replaces the question-mark center symbol exploration with a Catana-native hex-network emblem:
- tile-style outer hex badge,
- five connected inner hexes,
- warm cream / amber structure,
- restrained tile-like radial lift.
- This spec is intentionally scoped to the emblem only, not a full `card_rescardback` replacement yet.
- No live SVG assets were changed in this step.

## Status (2026-03-23, dev-card icon variation set)
- Wrote the approved development-card icon exploration spec and plan in:
- `docs/superpowers/specs/2026-03-23-dev-card-icon-variations-design.md`
- `docs/superpowers/plans/2026-03-23-dev-card-icon-variations-plan.md`
- Created four Catana-native candidate SVGs derived from the recreated split-medallion symbol, all in:
- `tmp/devcard-icon-variants/`
- Variant set:
- `forge-stamp.svg`
- `makers-mark.svg`
- `struck-seal.svg`
- `guild-token.svg`
- Shared direction:
- keep the medallion/seal read,
- shift the palette and proportions away from a direct official clone,
- add a simplified hammer cue instead of reusing the current Colonist-derived full card-back art.
- Rendered review artifacts:
- `/tmp/devcard-icon-renders/contact-sheet.png`
- `/tmp/devcard-icon-renders/contact-sheet-38.png`
- Quick read from the dock-scale pass:
- `makers-mark` survives `38px` best,
- `forge-stamp` is the safest close second,
- `struck-seal` is the most expressive,
- `guild-token` feels least like a direct clone but gives up some small-size clarity.
- Live `public/svgs/icon_devcard.svg` was intentionally left untouched in this pass.

## Status (2026-03-23, dev-card icon fluent-hammer round 2)
- Downloaded the official Microsoft Fluent Emoji flat hammer source to:
- `tmp/devcard-icon-variants/round2/fluent-hammer-flat.svg`
- Built a second four-icon variant set using that exact hammer geometry as the base, with:
- flat fills only,
- stricter Catana palette alignment,
- no global gradients or glossy lighting.
- Round-2 SVGs:
- `tmp/devcard-icon-variants/round2/forge-stamp-fluent.svg`
- `tmp/devcard-icon-variants/round2/makers-mark-fluent.svg`
- `tmp/devcard-icon-variants/round2/struck-seal-fluent.svg`
- `tmp/devcard-icon-variants/round2/guild-token-fluent.svg`
- Round-2 renders:
- `/tmp/devcard-icon-renders/round2/contact-sheet.png`
- `/tmp/devcard-icon-renders/round2/contact-sheet-38.png`
- Current read from the Fluent-based pass:
- `makers-mark-fluent` is the clearest and most stable at dock size,
- `forge-stamp-fluent` is the best balance if the icon should still feel seal-first,
- `struck-seal-fluent` adds motion but is weaker than the first two,
- `guild-token-fluent` is the most remixed badge but not the strongest small-size read.

## Status (2026-03-23, hidden card-back concept pass)
- Wrote the approved hidden-card-back concept spec and plan in:
- `docs/superpowers/specs/2026-03-23-card-back-concepts-design.md`
- `docs/superpowers/plans/2026-03-23-card-back-concepts-plan.md`
- Created six temporary card-back SVG concepts in:
- `tmp/card-back-concepts/`
- Resource concepts:
- `resource-question-hex.svg`
- `resource-question-window.svg`
- `resource-question-bands.svg`
- Dev concepts:
- `dev-seal.svg`
- `dev-forge.svg`
- `dev-banner.svg`
- Rendered review sheets:
- `/tmp/card-back-concepts-renders/resources-sheet.png`
- `/tmp/card-back-concepts-renders/dev-sheet.png`
- `/tmp/card-back-concepts-renders/stack-size-sheet.png`
- Current read from the real `52 x 72` pass:
- `resource-question-bands` is the clearest resource back,
- `resource-question-window` is the safest polished fallback,
- `dev-seal` is the strongest dev back,
- `dev-forge` is interesting but weaker at small size,
- `dev-banner` feels too nested for the opponent stack view.
- Live `public/svgs/card_rescardback.svg` and `public/svgs/card_devcardback.svg` were intentionally left untouched.

## Status (2026-03-23, hidden card-back radial refinement pass)
- Created a tile-style radial-lighting round on the two strongest card-back concepts:
- `tmp/card-back-concepts/round2/resource-question-bands-tilelift.svg`
- `tmp/card-back-concepts/round2/dev-seal-tilelift.svg`
- The radial treatment follows the board-tile logic:
- slightly lighter center,
- slightly darker edges,
- low contrast,
- emblem shapes kept mostly flat for readability.
- Rendered comparison sheets:
- `/tmp/card-back-concepts-renders/round2/resource-compare.png`
- `/tmp/card-back-concepts-renders/round2/dev-compare.png`
- `/tmp/card-back-concepts-renders/round2/stack-compare.png`
- Current read:
- the radial pass is subtle but better aligned with the Catana tile language,
- it improves overall finish without materially hurting the `52 x 72` stack read,
- the gradient versions now edge out the fully flat versions for both `resource-question-bands` and `dev-seal`.

## Status (2026-03-23, hidden card-back board-fit polish pass)
- Created a second polish round to push the best card backs closer to the current board/UI language:
- `tmp/card-back-concepts/round3/resource-question-bands-boardfit.svg`
- `tmp/card-back-concepts/round3/dev-seal-boardfit.svg`
- Changes in this round:
- creamier outer keyline,
- lighter/more board-like edge treatment,
- softer symbol ink on the resource `?`,
- reduced harsh dark framing.
- Rendered comparison sheets:
- `/tmp/card-back-concepts-renders/round3/resource-compare.png`
- `/tmp/card-back-concepts-renders/round3/dev-compare.png`
- `/tmp/card-back-concepts-renders/round3/stack-compare.png`
- Current read:
- round 3 feels more native to the board/UI styling,
- but it also gives up a little contrast compared with round 2,
- `resource-question-bands-boardfit` is probably the better fit overall,
- `dev-seal-boardfit` is aesthetically closer to the board, but the stronger round-2 version may still win if maximum stack readability is the priority.

## Status (2026-03-23, robber SVG gradient-family pass)
- Reworked `public/svgs/icon_robber.svg` away from many tiny flat gray facets and into a smaller set of broad gradient-shaded masses.
- Current local pass uses:
- head,
- top plane,
- main body,
- side body,
- stem,
- base
- with restrained neutral-gray gradients and a darker rim, aiming to match the general shading model of the settlement/road assets more closely than the earlier cel-shaded trace.
- Current caveat:
- the shading model is closer, but the silhouette has also been simplified and may need another pass if the traced robber shape should be preserved more literally.
- Verification:
- `xmllint --noout public/svgs/icon_robber.svg`
- `rsvg-convert -w 180 -h 180 public/svgs/icon_robber.svg`
- `rsvg-convert -w 96 -h 96 public/svgs/icon_robber.svg`
- `rsvg-convert -w 64 -h 64 public/svgs/icon_robber.svg`

## Status (2026-03-22, robber smooth-gradient concept pass)
- Ran a focused `imagegen` shading pass to reduce the painted/cel-shaded look on the shortlisted robber concepts.
- Used strict edit prompts with `input_fidelity=high` so the form and projection stayed close to the round-2 concepts while the lighting became broader and more linear.
- Outputs are in:
- `output/imagegen/robber-gradient-round1/`
- Best current smooth-shading references:
- `concept2-smooth-1.png`
- `concept2-smooth-2.png`
- Secondary structured options:
- `concept4-smooth-1.png`
- `concept4-smooth-2.png`

## Status (2026-03-22, robber imagegen concept pass)
- Ran live `imagegen` concept exploration for the robber using the bundled CLI and the OpenAI Image API.
- First pass from `icon_robber copy.svg` drifted back toward a generic chess-pawn read.
- Stronger second pass used the current higher-view robber sketch as the edit anchor and produced more traceable concepts in:
- `output/imagegen/robber-projection-round2/`
- Best current references from that pass:
- `robber-concept-2.png`
- `robber-concept-4.png`
- These are concept references for manual SVG redraw, not production assets.

## Status (2026-03-22, robber projection aligned to piece family)
- Refined `public/svgs/icon_robber.svg` to feel closer to the existing settlement/city projection rather than a flatter side-on pawn.
- Applied a shared projection guide instead of chasing a literal camera angle:
- more top-plane visibility on head, body, and base,
- less front-face height,
- minimal side reveal,
- still kept the silhouette chunky enough for small-size readability.
- Verification:
- `xmllint --noout public/svgs/icon_robber.svg`
- `rsvg-convert -w 96 -h 96 public/svgs/icon_robber.svg`
- `rsvg-convert -w 64 -h 64 public/svgs/icon_robber.svg`
- visual family comparison render against `settlement_red.svg`, `city_red.svg`, and `road_red.svg`

## Status (2026-03-22, robber icon redrawn)
- Replaced the old detailed robber art in `public/svgs/icon_robber.svg` with a faceless gray pawn-stack piece.
- The live asset now follows the same board-piece language as the current `road` / `settlement` / `city` family:
- chunky silhouette,
- restrained directional gradients,
- darker rim,
- no character detail or ninja cues.
- Final proportion choice deliberately stayed bolder than the first pass so the icon holds up better at small rendered sizes.
- Verification:
- `rsvg-convert -w 96 -h 96 public/svgs/icon_robber.svg`
- `rsvg-convert -w 64 -h 64 public/svgs/icon_robber.svg`
- visual family comparison render against `settlement_red.svg`, `city_red.svg`, and `road_red.svg`
- no automated tests were needed because this was an asset-only change

## Status (2026-03-22, robber icon design and plan approved)
- Wrote the approved design spec for replacing the current robber art in:
- `docs/superpowers/specs/2026-03-22-robber-icon-design.md`
- Approved direction:
- faceless `pawn stack` blocker piece,
- neutral gray Catana board-piece language,
- restrained directional gradients to match the current `road` / `settlement` / `city` family.
- Added the implementation plan in:
- `docs/superpowers/plans/2026-03-22-robber-icon-plan.md`
- This is design/planning only so far; `public/svgs/icon_robber.svg` has not been redrawn yet in this step.

## Status (2026-03-20, longest-road status icon redrawn)
- Replaced the copied placeholder in `public/svgs/icon_longest_road.svg` with a Catana-native status glyph built from two chunky connected road pieces.
- Kept the icon asset-only and UI-sized for `app/catana/components/PlayerAvatarStats.js`, using a compact `32 x 32` SVG with neutral warm road-piece tones so the adjacent stat number remains the main highlight.
- Captured the approved design and implementation notes in:
- `docs/superpowers/specs/2026-03-20-longest-road-icon-design.md`
- `docs/superpowers/plans/2026-03-20-longest-road-icon-plan.md`
- Verification:
- manual render check with `rsvg-convert -w 28 -h 28 public/svgs/icon_longest_road.svg`
- no automated tests were needed because runtime code did not change

## Status (2026-03-19, settlement PNG prototype support removed)
- Removed the temporary emoji-theme settlement asset override in `app/catana/theme/themes.js`; settlement lookups now resolve through the normal `/svgs/settlement_<color>.svg` path instead of rewriting to `/test_designs/settlement_red.png`.
- Removed the raster-only settlement sizing/alignment branch from:
- `app/catana/Piece.js`
- `app/catana/effects/placePiece.js`
- Focused regression coverage now checks that the runtime no longer carries the PNG-specific settlement path:
- `app/catana/__tests__/themeAssets.test.js`
- `app/catana/__tests__/Piece.test.js`
- `app/catana/__tests__/effects/placePieceWiring.test.js`
- Verification:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/Piece.test.js app/catana/__tests__/effects/placePieceWiring.test.js`
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/Port.render.test.js app/catana/__tests__/Board.layering.test.js app/catana/__tests__/effects/placePieceWiring.test.js app/catana/__tests__/Moves.placePieceEffects.test.js`

## Status (2026-03-18, first piece asset imagegen pass completed)
- Ran the approved 9-variant `imagegen` concept batch for `settlement`, `road`, and `city`.
- Generated outputs live under:
- `output/imagegen/piece-assets-concepts/`
- Added a side-by-side review sheet at:
- `output/imagegen/piece-assets-concepts/contact-sheet.png`
- Initial shortlist after reviewing the first pass:
- `08-minimal-edge-restrained-gradients.png` — strongest balance of simple silhouette, readable road chunkiness, and a city that still feels like an upgrade rather than a different icon family.
- `03-soft-tinted-hybrid.png` — strongest of the slightly richer/shaded options; more stylized and less austere than `08`, while still feeling traceable into SVG.
- Secondary fallback:
- `09-minimal-edge-hybrid.png` — clean and traceable, but weaker than `08` in family cohesion.
- Clear rejects from pass 1:
- grounded/base-plaque variants (`02`, `04`, `06`) drift too far toward “miniature on a stand” rather than placed board piece,
- `07` introduces glow/background treatment that is unusable for production tracing,
- `05` is too castle-like and detailed for the current MVP target.
- Current recommendation:
- use `08` as the safest tracing reference,
- optionally borrow a little of `03`'s richer color-plane treatment if `08` feels too austere in the next refinement pass.

## Status (2026-03-18, piece asset imagegen batch prepared)
- Added the execution plan for the first concept-generation pass in:
- `docs/superpowers/plans/2026-03-18-piece-assets-imagegen-plan.md`
- Prepared the temporary 9-job image batch input at:
- `tmp/imagegen/piece-assets-concepts.jsonl`
- Output target for the first pass is:
- `output/imagegen/piece-assets-concepts/`
- Dry-ran the bundled image generation CLI successfully with the approved shared prompt contract:
- `python3 /Users/david/.codex/skills/imagegen/scripts/image_gen.py generate-batch ... --dry-run`
- Dry-run validated:
- all 9 jobs parse correctly,
- output filenames are stable and ordered,
- each payload uses `gpt-image-1.5`, `1536x1024`, and `high` quality,
- prompt variation is limited to the intended edge-treatment/shading matrix.
- Current blocker:
- live generation is still blocked in this shell because `OPENAI_API_KEY` is not set.

## Status (2026-03-18, settlement/road/city asset design brief approved)
- Wrote the approved Catana design brief for replacement `settlement`, `road`, and `city` assets in:
- `docs/superpowers/specs/2026-03-18-piece-assets-design.md`
- Locked the MVP direction to a `hybrid soft-edge` piece family:
- angled tabletop perspective,
- silhouette-first forms,
- low detail,
- `city` as a direct upgrade of `settlement`,
- controlled exploration of edge treatment and shading instead of committing to Colonist-style outlines/bevels.
- Defined the concept-generation contract for the first image pass:
- one concept sheet per run containing all three pieces together,
- `3 x 3` matrix across edge treatment (`soft tinted`, `hybrid`, `minimal`) and shading (`flat planes`, `restrained gradients`, `hybrid`),
- output intended as tracing reference for later SVG production, not final art.
- No production SVGs generated in this pass yet; this entry records the approved design and prompt contract only.

## Status (2026-03-16, bottom HUD hitbox narrowed for board panning)
- Fixed the bottom HUD overlay in `app/catana/components/PlayerActionContainer.js` so blank space across the full-width bottom strip no longer intercepts pointer events.
- The fixed bottom container is now `pointer-events-none` by default, while the actual centered dock and right-side dice/end-turn column opt back into `pointer-events-auto`.
- This preserves the existing layout while allowing board pan gestures to start in the empty area around the bottom-right HUD instead of being blocked by the full-width flex wrapper.
- Added focused coverage in:
- `app/catana/__tests__/PlayerActionContainer.hitbox.test.js`
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/PlayerActionContainer.hitbox.test.js app/catana/__tests__/PlayerActionBadges.test.js app/catana/__tests__/GameScreen.interactionGuards.test.js app/catana/__tests__/GameScreen.zoomPan.test.js`

## Status (2026-03-16, zoom/pan bottom-edge fix)
- Fixed board zoom/pan bounds in the local `react-zoom-pan-pinch` fork so bounds now come from the actual transformed content size plus configured extra pan room, instead of treating the extra offsets as the entire scaled bounds.
- This restores enough negative pan range to zoom into the bottom and right edges of the board while keeping the existing extra sea/headroom allowances in `GameScreen`.
- Updated `app/catana/GameScreen.js` to set `disablePadding={true}` on `TransformWrapper`, so wheel zoom no longer overshoots and snaps back on zoom stop.
- Added regression coverage in:
- `react-zoom-pan-pinch/core/bounds/bounds.utils.test.ts`
- `app/catana/__tests__/GameScreen.zoomPan.test.js`
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/GameScreen.audioMute.test.js app/catana/__tests__/GameScreen.cancelBuildAction.test.js app/catana/__tests__/GameScreen.gameOver.test.js app/catana/__tests__/GameScreen.interactionGuards.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js app/catana/__tests__/GameScreen.zoomPan.test.js react-zoom-pan-pinch/core/bounds/bounds.utils.test.ts react-zoom-pan-pinch/core/double-click/double-click.logic.test.ts`
- `pnpm verify`

## Status (2026-03-16, dedicated high-contrast port icons)
- Added a dedicated port-icon asset path in `app/catana/theme/themes.js`:
- `getPortIconPath(themeId, resource)`
- `getClassicPortIconPath(resource)`
- Emoji-theme resource ports now resolve to a separate Fluent `High Contrast` asset family under:
- `public/svgs/palette-themes/emoji/port_icon_wood.svg`
- `public/svgs/palette-themes/emoji/port_icon_brick.svg`
- `public/svgs/palette-themes/emoji/port_icon_sheep.svg`
- `public/svgs/palette-themes/emoji/port_icon_wheat.svg`
- `public/svgs/palette-themes/emoji/port_icon_ore.svg`
- Generic `3:1` ports now use a dedicated question-mark SVG instead of the old three-dot glyph:
- `public/svgs/palette-themes/emoji/port_icon_any.svg`
- `public/svgs/port_icon_any.svg` (classic/non-emoji fallback)
- Follow-up art tuning:
- softened all dedicated port icon ink from hard black `#212121` to lighter sand-brown `#A8986F` so the symbols sit more calmly on the pale port disk.
- replaced the dedicated brick port icon with the same mortar-and-bricks silhouette used by the tile brick icon, restyled into the softer port-ink treatment so tile and port brick shapes now match.
- Updated `app/catana/Port.js` so both specific-resource and generic ports render through the image-based port-icon path and retain classic fallback behavior on image error.
- Tile emoji icons remain the existing Fluent `Flat` assets; only port markers now use the separate higher-contrast set.
- Added focused coverage in:
- `app/catana/__tests__/themeAssets.test.js`
- `app/catana/__tests__/Port.render.test.js`
- `app/catana/__tests__/Port.iconAssets.test.js`
- Verification:
- `pnpm exec vitest run app/catana/__tests__/Port.iconAssets.test.js app/catana/__tests__/themeAssets.test.js app/catana/__tests__/Port.render.test.js app/catana/__tests__/Board.layering.test.js app/catana/__tests__/BoardPortChannels.render.test.js app/catana/__tests__/utils/portLayout.test.js`
- `pnpm lint` (passes with existing unrelated warnings only)

## Status (2026-03-16, port connector test tightened)
- Tightened `app/catana/__tests__/BoardPortChannels.render.test.js` to assert two connector bars per port group, not just total connectors.
- Removed the unused `connector` param from `getConnectorBarStyle` in `app/catana/BoardPortChannels.js`.
- Verification:
- `pnpm vitest app/catana/__tests__/BoardPortChannels.render.test.js`

## Status (2026-03-09, runtime-composed port markers implemented)
- Replaced the old literal port asset stack in `app/catana/Port.js` with a runtime-composed marker system.
- Added pure port layout helper:
- `app/catana/utils/portLayout.js`
- Added focused runtime styling:
- `app/catana/Port.css`
- Added focused tests:
- `app/catana/__tests__/utils/portLayout.test.js`
- `app/catana/__tests__/Port.render.test.js`
- Implemented MVP port structure:
- two explicit connector planks,
- one embedded circular harbor marker,
- reused themed resource icon for specific ports,
- bottom-centered rate badge (`2:1` for specific ports, `3:1` for generic ports),
- simple neutral 3-dot glyph for generic `Any` ports.
- Important implementation correction from code review:
- connector anchors are now derived from actual coastal node directions using `getNodeDelta(...)`, not from legacy hand-tuned fractions.
- Follow-up visual tuning:
- port marker footprint was reduced from the first MVP pass,
- connector anchors now start inset from the coastal node centers and terminate sooner so the planks read as shoreline bridges rather than running underneath settlement/city positions.
- Important implementation note:
- `app/catana/Port.js` now uses `React.createElement(...)` instead of JSX because the Vitest/Vite server-render path for this file failed import analysis on JSX in `.js`.
- Residual MVP gap:
- focused tests now prove node-anchored connector geometry for one shoreline direction plus isolated port markup structure,
- but there is still no full live-board visual regression check for all six port directions.
- Verification:
- `pnpm exec vitest run app/catana/__tests__/utils/portLayout.test.js app/catana/__tests__/Port.render.test.js app/catana/__tests__/Board.layering.test.js app/catana/__tests__/themeAssets.test.js`
- `pnpm lint` (passes with existing unrelated warnings only)

## Status (2026-03-09, port marker MVP direction approved)
- Approved a launch-scoped replacement for the current copied/literal Catana port visuals.
- New direction:
- use an embedded abstract shoreline marker instead of scenic harbor art,
- keep the marker mostly map-like with light glass/frosted accents,
- reuse the existing themed resource icons as the center glyph for specific ports,
- render the trade rate as a separate bottom-centered badge (`2:1` / `3:1`),
- render exactly two explicit bridge/causeway connectors to the eligible coastal nodes.
- Decided against both extremes for launch:
- not a literal boat/sign harbor treatment,
- not a fully illustrated mini-island scene,
- not a floating UI chip disconnected from the board.
- Added design doc `docs/plans/2026-03-09-port-marker-mvp-design.md`.
- Added implementation plan `docs/plans/2026-03-09-port-marker-mvp-plan.md`.

## Status (2026-03-08, board theme picker removed and emoji defaulted)
- Removed the in-game theme picker UI from `app/catana/GameScreen.js`.
- Kept theme plumbing intact on the board/game screen:
- `themeId` is still read, stored, and passed into board/HUD/modal components.
- Default/fallback theme resolution now uses `emoji` in `app/catana/theme/themes.js`.
- Preserved classic asset fallback behavior for helper paths like `getClassicSvgPath(...)` so non-emoji fallback rendering still points at `/svgs/*`.
- Updated focused tests:
- `app/catana/__tests__/GameScreen.themeSwitcher.test.js`
- `app/catana/__tests__/themeAssets.test.js`
- Verification:
- `pnpm exec vitest run app/catana/__tests__/GameScreen.themeSwitcher.test.js app/catana/__tests__/themeAssets.test.js`
- `pnpm lint` (passes with existing unrelated warnings only)

## Status (2026-03-07, generated standard-board underlay implemented)
- Replaced the superseded hand-shaped `board_island_base_*` approach with a generated standard-board underlay asset:
- `public/svgs/board_underlay_standard.svg`
- Added pure underlay helpers:
- `app/catana/utils/boardUnderlayGeometry.mjs` (+ JS re-export wrapper)
- `app/catana/utils/boardUnderlayLayout.js`
- Added reproducible generator script:
- `scripts/generate-board-underlay.mjs`
- Added runtime underlay component:
- `app/catana/BoardUnderlay.js`
- Updated runtime wiring:
- `app/catana/theme/themes.js` now exposes `getBoardUnderlayPath(themeId)`
- `app/catana/Board.js` now renders `<BoardUnderlay ... />` before `{tiles}`
- Removed superseded files:
- `app/catana/BoardIslandBase.js`
- `app/catana/utils/islandBaseLayout.js`
- `public/svgs/board_island_base_tight.svg`
- `public/svgs/board_island_base_medium.svg`
- `public/svgs/board_island_base_broad.svg`
- Important geometry correction: the true perimeter of the standard 19-land-tile pointy-top board is `30` boundary edges / ordered points, not `18`.
- Verification:
- `pnpm exec vitest run app/catana/__tests__/utils/boardUnderlayGeometry.test.js app/catana/__tests__/utils/boardUnderlayLayout.test.js app/catana/__tests__/themeAssets.test.js app/catana/__tests__/Board.layering.test.js app/catana/__tests__/uiNoDragImages.test.js`
- `pnpm lint` (warnings only; no new underlay-specific lint errors)
- Visual QA:
- desktop board screenshot: `.playwright-cli/page-2026-03-07T11-51-37-369Z.png`
- narrow/mobile board screenshot: `.playwright-cli/page-2026-03-07T11-53-52-707Z.png`
- Known unrelated runtime issue during QA: `/timer/:matchID` still hits an existing localhost CORS problem from `http://localhost:8000`, but the board itself renders and the underlay loads correctly.

## Status (2026-03-07, generated-underlay island direction approved)
- Approved a launch-scoped replacement for the manual Catana island SVG variants.
- New direction:
- keep `game-core` unchanged,
- do not add native water tiles yet,
- do not render per-edge coast pieces,
- instead generate one board-shaped underlay SVG from the actual standard 19-land-tile footprint and check that asset into the repo.
- The generated asset is intended to replace the hand-shaped `board_island_base_*` files and their variant plumbing once implemented.
- The underlay will remain a decorative Catana UI layer rendered behind land tiles, but its shape will be reproducible from board geometry instead of hand-edited silhouettes.
- Added design doc `docs/plans/2026-03-07-generated-island-underlay-design.md`.
- Added implementation plan `docs/plans/2026-03-07-generated-island-underlay-plan.md`.

## Status (2026-03-06, Catana island base manual SVG variants)
- Replaced the old fused-hex island underlay with three hand-drawn layered SVG variants:
- `public/svgs/board_island_base_tight.svg`
- `public/svgs/board_island_base_medium.svg`
- `public/svgs/board_island_base_broad.svg`
- Updated `app/catana/theme/themes.js` so `getBoardIslandBasePath(themeId, variantId?)` resolves explicit `tight / medium / broad` island assets and falls back to `medium`.
- Wired `medium` as the current default asset for the live board while keeping the other two variants available for visual comparison.
- Kept the layout math unchanged in `app/catana/utils/islandBaseLayout.js`; the new pass changes only the SVG art direction, not board geometry.
- Manual design changes in the new SVGs:
- simplified curve-friendly coastline instead of enlarged fused hexes,
- exactly four visible layers: blue outer glow, pale surf ring, sand shell, inner land tint,
- removed texture/pattern details and kept the style flat/vector to match Catana.
- Added a local preview surface at `output/imagegen/island-variants/index.html` plus generated board-overlay assets for comparing the three SVG variants against the current board art.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/BoardIslandBase.test.js app/catana/__tests__/Board.layering.test.js app/catana/__tests__/utils/islandBaseLayout.test.js`
- Current state: `medium` is only a provisional default pending visual sign-off; `tight` and `broad` are available as direct comparison references.

## Status (2026-03-06, medium island base scaled up inside fixed frame)
- Enlarged only the art inside `public/svgs/board_island_base_medium.svg` without changing `app/catana/utils/islandBaseLayout.js`.
- Updated the medium variant layer scales to make the backing plate more visible around the outer ring:
- blue glow: `scale(1.14 1.12)`
- pale surf ring: `scale(1.09 1.075)`
- sand shell: `scale(1.045 1.035)`
- inner land tint: `scale(0.76 0.72)` with slightly reduced opacity
- This keeps the same board-relative frame sizing while fixing the “backing board is too hidden under the tiles” problem.
- Re-verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/BoardIslandBase.test.js app/catana/__tests__/Board.layering.test.js app/catana/__tests__/utils/islandBaseLayout.test.js`
- Live QA: captured a fresh `/catana/lobby/<match>?playerID=0` emoji-theme screenshot after the SVG-only scale change; the plate is now clearly visible around the board perimeter.

## Status (2026-03-06, medium island silhouette redrawn as softened board hex)
- Replaced the `medium` variant path in `public/svgs/board_island_base_medium.svg` with a 12-point softened super-hex silhouette tied to the board footprint.
- The new outline uses six broad side bulges and six major corners, so the backing plate reads as an expanded/smoothed version of the board shape instead of a round island/blob.
- Kept the existing four-layer treatment and the previously enlarged in-SVG scale values; only the `medium` path geometry changed in this pass.
- Added regression coverage in `app/catana/__tests__/themeAssets.test.js` to lock the new softened-hex path signature.
- Re-verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/BoardIslandBase.test.js app/catana/__tests__/Board.layering.test.js app/catana/__tests__/utils/islandBaseLayout.test.js`
- Live QA: fresh emoji-theme board screenshot now shows a curvy/wavy hex underlay rather than the earlier rounder plate.

## Status (2026-03-05, Catana island base underlay)
- Added a shared board underlay asset at `public/svgs/board_island_base.svg` to visually connect the land hexes into one island mass.
- Added `getBoardIslandBasePath(...)` in `app/catana/theme/themes.js` so the island base resolves through the same theme helper layer as other board assets.
- Added `app/catana/utils/islandBaseLayout.js` with `getIslandBaseFrame(...)` to keep the island sizing math pure and testable (`8.9x` width, `8.24x` height, rounded frame output).
- Added `app/catana/BoardIslandBase.js` as a decorative, non-interactive image underlay (`pointerEvents: none`, `aria-hidden`).
- Wired the underlay into `app/catana/Board.js` before `{tiles}` so ports, tokens, pieces, and effect layers still render above it.
- Replaced the initial oversized blob silhouette with a tighter board-shaped shoreline built from enlarged hex footprints, so the coast hugs the outer ring instead of reading like a circular platter.
- Added focused coverage:
- `app/catana/__tests__/themeAssets.test.js`
- `app/catana/__tests__/utils/islandBaseLayout.test.js`
- `app/catana/__tests__/BoardIslandBase.test.js`
- `app/catana/__tests__/Board.layering.test.js`
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/utils/islandBaseLayout.test.js app/catana/__tests__/BoardIslandBase.test.js app/catana/__tests__/Board.layering.test.js app/catana/__tests__/uiNoDragImages.test.js`
- Visual QA:
- Desktop `/catana` spectator view now reads as a single island instead of floating tiles.
- Smaller mobile-style viewport keeps the island readable; unrelated existing issue noted: top HUD is clipped on the narrow viewport.

## Status (2026-03-05, island base design + implementation plan)
- Added design doc `docs/plans/2026-03-05-island-base-design.md` for a flat SVG island underlay behind the Catana land tiles.
- Added implementation plan `docs/plans/2026-03-05-island-base-plan.md`.
- Approved direction is a non-interactive abstract island plate: muted green land mass, thin sand rim, soft outer glow/shadow, rendered below tiles and ports.
- Planned implementation keeps board geometry unchanged and routes the SVG through theme helpers for future overrides.

## Status (2026-03-05, zoom/pan bounds asymmetry fix)
- Fixed asymmetric zoomed-out pan bounds in `react-zoom-pan-pinch/core/bounds/bounds.utils.ts`.
- Root cause: `calculateBounds(...)` used different multipliers for negative vs positive bounds when `scale < 1`, creating one-sided horizontal movement limits and rebound bias.
- Updated bounds scaling to use one shared zoom multiplier on both min/max sides for both axes.
- Added regression coverage in `react-zoom-pan-pinch/core/bounds/bounds.utils.test.ts` to lock symmetric horizontal bounds behavior when limits are symmetric.
- Verified with:
- `pnpm exec vitest run react-zoom-pan-pinch/core/bounds/bounds.utils.test.ts`
- `pnpm verify` (fails in this workspace on unrelated existing expectation drift: `app/catana/__tests__/Moves.gameLog.test.js` expects no `robber:skip` entry)

## Status (2026-03-05, emoji tile icon overlay nudged lower)
- Adjusted emoji-only tile icon vertical placement in `app/catana/Tile.js` to sit a bit lower on the tile face.
- Increased `EMOJI_TILE_ICON_TOP_MULTIPLIER` to `1.16` and applied it only when `themeId === "emoji"` (`size * TILE_ICON_TOP_FACTOR * 1.16`) for an extra downward nudge.
- This keeps non-emoji themes on the existing top alignment.
- Extended `app/catana/__tests__/Tile.iconSizing.test.js` to assert emoji-only top positioning wiring.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js app/catana/__tests__/Tile.iconSizing.test.js`

## Status (2026-03-05, emoji tile icon overlay scaled down 15%)
- Updated tile overlay icon sizing in `app/catana/Tile.js` so only the `emoji` theme uses a smaller icon footprint.
- Added `EMOJI_TILE_ICON_SCALE_MULTIPLIER = 0.85`, applied on top of existing `TILE_ICON_SCALE` for tile overlays (`size * 0.68 * 0.85`).
- Non-emoji themes keep current tile icon size behavior unchanged.
- Added coverage in `app/catana/__tests__/Tile.iconSizing.test.js` to lock emoji-only scaling wiring.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js app/catana/__tests__/Tile.iconSizing.test.js`

## Status (2026-03-05, emoji icons switched to Fluent flat SVGs)
- Replaced emoji theme icon files with Microsoft Fluent `Flat` SVG assets, preserving local file names and existing theme routing:
- `icon_wood.svg` <- `assets/Wood/Flat/wood_flat.svg`
- `icon_brick.svg` <- `assets/Brick/Flat/brick_flat.svg`
- `icon_sheep.svg` <- `assets/Ewe/Flat/ewe_flat.svg`
- `icon_wheat.svg` <- `assets/Sheaf of rice/Flat/sheaf_of_rice_flat.svg`
- `icon_ore.svg` <- `assets/Rock/Flat/rock_flat.svg`
- `icon_desert.svg` <- `assets/Cactus/Flat/cactus_flat.svg`
- This supersedes the earlier same-day `Color` variant swap for the same six files.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-03-05, emoji icons switched to Fluent color SVGs)
- Replaced emoji glyph-based icon wrappers in `public/svgs/palette-themes/emoji/` with Microsoft Fluent `Color` SVG assets, keeping existing local filenames and theme routing intact:
- `icon_wood.svg` <- `assets/Wood/Color/wood_color.svg`
- `icon_brick.svg` <- `assets/Brick/Color/brick_color.svg`
- `icon_sheep.svg` <- `assets/Ewe/Color/ewe_color.svg`
- `icon_wheat.svg` <- `assets/Sheaf of rice/Color/sheaf_of_rice_color.svg`
- `icon_ore.svg` <- `assets/Rock/Color/rock_color.svg`
- `icon_desert.svg` <- `assets/Cactus/Color/cactus_color.svg`
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-03-05, emoji desert tone tuning - lighter midpoint)
- Tuned `public/svgs/palette-themes/emoji/tile_desert.svg` to a lighter midpoint between the original bright version and the first dim pass.
- Adjusted border/fill/inner-stroke gradient stops upward and reduced vignette strength (`0.04→0.02` center, `0.24→0.20` edge) to keep the desert subdued but less heavy.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-03-05, emoji desert icon routing + SVG dim pass)
- Removed desert cactus marker from tile art and switched to the same overlay icon model used by other tiles:
- Added `public/svgs/palette-themes/emoji/icon_desert.svg` (`🌵`).
- Updated `app/catana/theme/themes.js` so `getResourceIconPath("emoji", "Desert")` returns `/svgs/palette-themes/emoji/icon_desert.svg`, while non-emoji themes still return no desert icon.
- Applied a dimmer desert palette directly in `public/svgs/palette-themes/emoji/tile_desert.svg` (darker/muted gradient stops + stronger vignette) for a permanent subdued desert look.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-03-05, emoji desert cactus icon)
- Added cactus emoji icon directly into emoji desert tile art:
- `public/svgs/palette-themes/emoji/tile_desert.svg`
- Desert icon is now part of the SVG (top-centered `🌵`) so it follows the same emoji-theme visual style without changing shared resource-icon path logic.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-03-05, emoji desert tile styled + wired)
- Added emoji-specific desert tile override in `app/catana/theme/themes.js`:
- `"tile_desert.svg": "/svgs/palette-themes/emoji/tile_desert.svg"`
- Added new rounded-corner desert tile asset in the same visual language as the edited emoji resource tiles:
- `public/svgs/palette-themes/emoji/tile_desert.svg`
- Desert tile now uses the same inner rounded hex geometry + gradient/stroke/vignette layering approach as the updated emoji tile set.
- Extended `app/catana/__tests__/themeAssets.test.js` to assert `emoji` resolves `tile_desert.svg` through the emoji theme folder.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-03-05, emoji rounded-tiles geometry pass 2)
- Reworked emoji rounded tile composition to restore a full tile footprint and reduce “squished” appearance on board.
- Each emoji resource tile now uses:
- a full-size rounded outer hex (border shell close to original tile extents), and
- an inset rounded inner hex (resource fill area) with highlight/vignette overlays.
- Updated files:
- `public/svgs/palette-themes/emoji/tile_brick.svg`
- `public/svgs/palette-themes/emoji/tile_lumber.svg`
- `public/svgs/palette-themes/emoji/tile_wool.svg`
- `public/svgs/palette-themes/emoji/tile_grain.svg`
- `public/svgs/palette-themes/emoji/tile_ore.svg`
- Kept emoji theme fallback behavior from prior fix (`disableBackgroundFallback`) so classic tiles do not bleed through transparent corners.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-03-05, emoji rounded-tiles bleed fix + geometry retune)
- Fixed emoji tile rendering bleed-through by disabling layered classic background fallback for the `emoji` theme in `app/catana/theme/themes.js` (`disableBackgroundFallback: true`).
- Root cause was tile background layering (`url(themed), url(classic)`): transparent regions in rounded emoji tiles exposed classic sharp-corner tile art beneath.
- Retuned rounded geometry in all emoji resource tile SVGs to use a fuller board footprint (closer to native tile bounds) while preserving rounded corners:
- `public/svgs/palette-themes/emoji/tile_brick.svg`
- `public/svgs/palette-themes/emoji/tile_lumber.svg`
- `public/svgs/palette-themes/emoji/tile_wool.svg`
- `public/svgs/palette-themes/emoji/tile_grain.svg`
- `public/svgs/palette-themes/emoji/tile_ore.svg`
- Added assertion in `app/catana/__tests__/themeAssets.test.js` that `getBackgroundImageWithFallback("emoji", "tile_ore.svg")` resolves to a single emoji tile URL (no classic layered fallback).
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-03-05, emoji theme rounded tile geometry)
- Updated `emoji` theme tile mapping in `app/catana/theme/themes.js` to use emoji-local tile assets instead of Palette B tile files:
- `tile_ore.svg`, `tile_grain.svg`, `tile_wool.svg`, `tile_lumber.svg`, `tile_brick.svg` now resolve to `/svgs/palette-themes/emoji/*`.
- Added rounded-corner tile SVGs for all resource tiles in:
- `public/svgs/palette-themes/emoji/tile_brick.svg`
- `public/svgs/palette-themes/emoji/tile_lumber.svg`
- `public/svgs/palette-themes/emoji/tile_wool.svg`
- `public/svgs/palette-themes/emoji/tile_grain.svg`
- `public/svgs/palette-themes/emoji/tile_ore.svg`
- Each tile keeps the existing theme contract (`346x400` tile artboard) and uses resource-specific fill/border gradients with rounded-corner hex geometry.
- Updated test coverage in `app/catana/__tests__/themeAssets.test.js` to assert emoji tile overrides are used.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-03-04, emoji theme variant)
- Added a new `emoji` Catana theme in `app/catana/theme/themes.js`.
- `emoji` reuses Palette B tile assets (`option-b`) and only overrides resource icons to:
- `public/svgs/palette-themes/emoji/icon_wood.svg`
- `public/svgs/palette-themes/emoji/icon_brick.svg`
- `public/svgs/palette-themes/emoji/icon_sheep.svg`
- `public/svgs/palette-themes/emoji/icon_wheat.svg`
- `public/svgs/palette-themes/emoji/icon_ore.svg`
- Emoji icons are SVG wrappers containing centered emoji glyphs, so all existing icon consumers (tile overlay, resource bar, game log, trade/discard UI, etc.) continue to work without component-level logic changes.
- Expanded theme asset coverage in `app/catana/__tests__/themeAssets.test.js` to assert emoji theme registration and path resolution contract.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-03-04, log metadata + identity/color utilities refactor)
- Added shared player identity helper `app/catana/utils/playerIdentity.js` with `sanitizeDisplayName(...)` and reused it across:
- `app/catana/GameScreen.js`
- `app/catana/lobby/LobbyPageClient.js`
- `app/catana/lobby/[matchID]/MatchPageClient.js`
- Added shared player color helper `app/catana/theme/playerColors.js` (`PLAYER_COLOR_OPTIONS`, `getPlayerColorOption`, `getPlayerNameHex`) and reused it across:
- `app/catana/lobby/LobbyPageClient.js`
- `app/catana/components/PlayerAvatarStats.js`
- `app/catana/components/GameLogPanel.js`
- Updated `GameScreen` log metadata assembly to use a stable `seatColorMap` fallback (from seat order) instead of `playerViewMap[id]?.color`, reducing avoidable log-token churn.
- Memoized the log component export with `React.memo` in `app/catana/components/GameLogPanel.js`.
- Existing `[BOT]` prefixes are now sanitized at render time in lobby/match seat labels and in-game name mapping, while newer bots keep clean `Puffer` names from join payloads.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/renderPerfGuards.test.js app/catana/__tests__/playerIdentity.test.js app/catana/__tests__/playerColors.test.js`
- `pnpm exec vitest run app/catana/__tests__/LobbyPageClient.playVsBot.test.js app/catana/__tests__/MatchPageClient.botFill.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/uiNoDragImages.test.js app/catana/__tests__/renderPerfGuards.test.js app/catana/__tests__/gameText.test.js`

## Status (2026-03-04, bot display-name cleanup)
- Removed the `[BOT]` name prefix in lobby bot join payloads so bot names are cleaner now that emoji-based identity is visible in log/UI.
- Updated:
- `app/catana/lobby/LobbyPageClient.js`
- `app/catana/lobby/[matchID]/MatchPageClient.js`
- Bot names now render as `Puffer <seat>` instead of `[BOT] Puffer <seat>`.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/LobbyPageClient.playVsBot.test.js app/catana/__tests__/MatchPageClient.botFill.test.js`

## Status (2026-03-04, game log player avatar + color metadata)
- Updated game-log player token formatting to support player metadata objects (`name`, `emoji`, `color`) in `app/catana/utils/gameText.js` while keeping backward compatibility with plain string name maps.
- Wired `GameScreen` to build and pass `playerMap` into `GameLogPanel`, combining:
- player names from match metadata,
- avatar emoji from match metadata,
- chosen lobby colors from match metadata (`player.data.color`), with seat-color fallback only when missing.
- Updated `GameLogPanel` player rendering to show `{emoji} {name}` and tint the name to the player's chosen avatar color.
- Expanded log tint support for all lobby color IDs (`red`, `blue`, `green`, `orange`, `purple`, `pink`, `cyan`, `amber`).
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/gameText.test.js`
- `pnpm exec vitest run app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/uiNoDragImages.test.js`
- `pnpm exec vitest run app/catana/__tests__/renderPerfGuards.test.js`

## Status (2026-03-04, game log resource icons as full cards)
- Updated game-log resource formatting so resource counts expand into full per-card icon tokens (no `2x` labels and no comma separators).
- This applies across all log events that use resource maps, including `discard`, `resource:gain`, and `trade:maritime`.
- Updated `app/catana/components/GameLogPanel.js` to render resource tokens as icons only (with resource `title` for hover context).
- Added test coverage updates in `app/catana/__tests__/gameText.test.js` to assert icon-per-card token expansion and comma removal.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/gameText.test.js`
- `pnpm exec vitest run app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/uiNoDragImages.test.js`
- Note: `pnpm exec vitest run app/catana/__tests__/Moves.gameLog.test.js` currently fails in this workspace from an unrelated expectation drift (`robber:skip` extra entry).

## Status (2026-03-02, robber no-valid-tile skip flow)
- Added a guarded robber fallback in `app/catana/Moves.js` so when there are zero legal robber tiles, gameplay does not stall.
- New helper flow now logs `robber:skip`, keeps robber position unchanged, and advances to the correct return stage (`preRoll` or `postRoll`) as if robber resolution completed.
- Wired the skip path into all robber entry points:
- `rollDice` when a 7 enters robber flow with no candidates,
- `discardResources` when pending discards finish into robber flow,
- `playDevCardStart` for knight-triggered robber flow,
- `autoMoveRobber` timeout fallback when no candidate tile exists.
- Added log text support in `app/catana/utils/gameText.js` for `robber:skip` ("had no valid tile for robber movement").
- Added/updated coverage in:
- `app/catana/__tests__/Moves.robber.test.js` (7-roll skip path + auto-timeout skip path),
- `app/catana/__tests__/Moves.devCards.test.js` (knight-triggered skip path + existing moveRobber path with legal tiles),
- `app/catana/__tests__/gameText.test.js` (`robber:skip` formatting).
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/Moves.robber.test.js app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/gameText.test.js`

## Status (2026-03-02, game log timeout copy cleanup)
- Updated game-log text rendering in `app/catana/utils/gameText.js` to hide all internal `forced:*` marker entries from the UI.
- Forced player actions now render with ` (timeout)` instead of ` (auto)` (for example: `Player placed a settlement (timeout)`).
- This keeps bot usernames/actions unchanged in normal play while making timeout-forced moves explicit and readable.
- Added/updated coverage in `app/catana/__tests__/gameText.test.js` for:
- hiding all `forced:*` entry types,
- preserving no timeout suffix for roll/resource gain,
- adding timeout suffix for forced player actions.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/gameText.test.js`
- `pnpm exec vitest run app/catana/__tests__/Moves.gameLog.test.js`

## Status (2026-03-02, Option B icon normalization pass)
- Normalized the active Option B resource icon assets to a shared canonical artboard (`256x256`, `viewBox="0 0 256 256"`):
- `public/svgs/palette-themes/option-b/icon_wood.svg`
- `public/svgs/palette-themes/option-b/icon_brick.svg`
- `public/svgs/palette-themes/option-b/icon_sheep.svg`
- `public/svgs/palette-themes/option-b/icon_wheat.svg`
- `public/svgs/palette-themes/option-b/icon_ore.svg`
- Each icon now uses an explicit normalization transform (`<g id="icon-artwork" transform="...">`) so rendering comes from one consistent coordinate contract instead of mixed source viewBoxes.
- Re-tuned tile icon placement in `app/catana/Tile.js` for normalized assets:
- `TILE_ICON_TOP_FACTOR` `0.186`,
- `TILE_ICON_SCALE` `0.58`,
- retained only small per-resource optical deltas in `TILE_ICON_SCALE_BY_RESOURCE` and `TILE_ICON_TOP_NUDGE_BY_RESOURCE`.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js app/catana/__tests__/uiNoDragImages.test.js`

## Status (2026-02-23, road blocking at opponent intersections)
- Fixed normal-play road legality in `game-core/src/rules/buildability.ts`.
- `buildableEdges(...)` now excludes road-endpoint nodes occupied by opponent settlements/cities when deriving expansion candidates.
- This enforces the Catan rule that roads cannot be extended through an opponent-owned intersection.
- Added regression coverage in `game-core/src/rules/buildability.test.ts`:
- `does not allow extending a road through an opponent settlement`.
- Verified with:
- `pnpm -C game-core test -- src/rules/buildability.test.ts`
- `pnpm -C game-core test`

## Status (2026-02-23, canonical resource icon template)
- Added a canonical square resource icon template at `public/svgs/concepts/resource_icon_template_256.svg`.
- Template establishes the shared icon contract:
- `256x256` artboard with root `viewBox="0 0 256 256"`,
- centered crosshair/anchor guides,
- `192x192` safe area for visible art,
- optional tile top-band guide for in-tile readability checks.
- Added design spec at `docs/plans/2026-02-23-resource-icon-canonical-template-spec.md` with migration strategy (keep current nudges until all icons are normalized, then collapse to shared tile icon positioning).

## Status (2026-02-23, icon scale normalization pass)
- Added per-resource tile icon scale tuning in `app/catana/Tile.js` (`TILE_ICON_SCALE_BY_RESOURCE`) to account for different icon viewBox/aspect ratios.
- Applied smaller in-tile icon scales for wood/wheat (`Wood 0.56`, `Wheat 0.54`) while keeping others at `0.62`.
- Shifted all tile icons slightly lower again (`TILE_ICON_TOP_FACTOR 0.165`) with updated per-resource downward nudges (sheep still lowest).
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-02-23, per-resource tile icon nudge)
- Further adjusted tile icon overlay placement in `app/catana/Tile.js` by introducing per-resource vertical nudges:
- global top factor raised to `0.155`,
- per-resource offsets via `TILE_ICON_TOP_NUDGE_BY_RESOURCE`,
- sheep intentionally pushed lower than wood/tree (`Sheep: +0.03`, `Wood: +0.00`).
- Kept shared icon scale at `0.62` and preserved theme-aware icon fallback behavior.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-02-23, tile icon alignment tuning)
- Adjusted in-tile resource icon overlay sizing/placement in `app/catana/Tile.js` to better match classic embedded icon composition:
- icon scale reduced from `0.72 * size` to `0.62 * size`,
- icon top offset moved from `0.10 * size` to `0.14 * size`.
- Added named constants (`TILE_ICON_TOP_FACTOR`, `TILE_ICON_SCALE`) for quick visual iteration.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-02-23, palette-b focus + tile icons)
- Simplified in-game theme options in `app/catana/theme/themes.js` to `Classic` + `Palette B` (removed other palette variants and removed `custom` from the theme registry).
- Kept palette overrides focused on `option-b` and expanded `palette-b` overrides to include shared resource icons:
- `icon_wood.svg`, `icon_brick.svg`, `icon_sheep.svg`, `icon_wheat.svg`, `icon_ore.svg`.
- Copied current canonical icon SVGs into `public/svgs/palette-themes/option-b/` so Palette B now owns an editable icon set without breaking Classic.
- Added tile-level resource icon overlay in `app/catana/Tile.js` (theme-aware icon path + classic fallback), positioned near top-center of the hex so tile art and shared icon language stay aligned.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-02-22, oreDirectional defaults synced)
- Replaced the temporary subtle-flat bake and synchronized all in-game palette SVG sets to the saved gradient-lab defaults from `resource-palette-preview.html`:
- preset `Ore Directional`,
- body depth `170%`,
- ring depth `72%`,
- ring direction `Vertical (dark bottom)`,
- edge shadow lift `12%`,
- stripes `off`.
- Applied this profile across all palette folders under `public/svgs/palette-themes/` (`option-a`, `option-b`, `option-c`, `option-d`, `option-c-rich`, `option-d-rich`) while preserving each tile's base/highlight/shadow/ink colors.
- Profile parity matches the preview math, including ring-shadow color lift and separator-shadow softening/opacity derived from `edge shadow lift`.

## Status (2026-02-22, resource distribution zoom size normalization)
- Updated resource-card distribution sizing to respect board zoom at spawn and normalize during travel in `app/catana/effects/resourceDistribution.js`.
- Card pop/settle scale now multiplies by current board viewport scale, preserving tile-relative size at origin.
- Travel animation now interpolates scale back to HUD baseline (`scale: 1`) so cards land at a consistent UI size.
- Added focused coverage in `app/catana/__tests__/effects/resourceDistribution.test.js` for board-space scaling + HUD normalization.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/effects/resourceDistribution.test.js`
- `pnpm exec vitest run app/catana/__tests__/effects`

## Status (2026-02-22, resource distribution zoom spawn fix)
- Fixed resource-card distribution spawn origin under board zoom in `app/catana/effects/resourceDistribution.js`.
- Root cause was mixed coordinate spaces: tile positions were board-local while board origin used viewport coordinates (`getBoundingClientRect`) without applying current zoom scale.
- Added explicit viewport-scale conversion (`getBoardViewportScale`) and zoom-aware tile start mapping (`getTileCardStartPosition`) before GSAP spawn.
- Added focused unit coverage in `app/catana/__tests__/effects/resourceDistribution.test.js` for scaled start-position math.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/effects/resourceDistribution.test.js`
- `pnpm exec vitest run app/catana/__tests__/effects`

## Status (2026-02-22, subtle-flat pass)
- Converted all in-game palette tile SVG sets under `public/svgs/palette-themes/` to the `Subtle Flat` gradient profile (including rich variants) to reduce glossy/washed-out ring behavior.
- Applied subtle-flat geometry/stops consistently for body and ring gradients:
- body lift: lighter, flatter radial (`cx 158, cy 130, r 224`; `0.2 -> 0.08 -> 0`)
- body shade: restrained depth (`cx 182, cy 244, r 244`; `0 -> 0.08 -> 0.18`)
- ring gradients: simple vertical highlight-to-shadow ramps (removed mid-ring extra highlight stop)
- Verified there is no board-wide saturation/brightness CSS filter affecting all tiles; tile-level filter in `app/catana/Tile.js` only applies during robber hover/placement states.
- Verified theme wiring/tests remain green:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-02-22, rich variants)
- Added richer in-game palette variants to the dev `Theme` selector: `Palette C Rich` (`palette-c-rich`) and `Palette D Rich` (`palette-d-rich`).
- Added tile-only override asset sets at:
- `public/svgs/palette-themes/option-c-rich/`
- `public/svgs/palette-themes/option-d-rich/`
- Rich variants are tuned to reduce washout by lowering highlight opacity and increasing shadow/vignette depth while preserving the same hue families.
- Updated `app/catana/theme/themes.js` theme registry with the two new IDs and override mappings.
- Extended `app/catana/__tests__/themeAssets.test.js` for new theme registration, ID resolution, and rich-variant path mapping.
- Verified with:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-02-22)
- Added in-game palette theme options to the dev `Theme` selector via `app/catana/theme/themes.js`: `Palette C`, `Palette B`, `Palette A`, `Palette D` (theme IDs: `palette-c`, `palette-b`, `palette-a`, `palette-d`).
- Kept non-tile assets on classic paths for these palettes and added per-file tile overrides for:
- `tile_ore.svg`, `tile_grain.svg`, `tile_wool.svg`, `tile_lumber.svg`, `tile_brick.svg`,
- mapped to `public/svgs/palette-themes/option-{c,b,a,d}/...`.
- This avoids breakage for assets that do not exist in palette folders (e.g. robber/building icons) while still swapping resource tile art on-board.
- Extended theme asset tests in `app/catana/__tests__/themeAssets.test.js` to cover:
- palette theme registration,
- tile override path resolution,
- non-overridden asset fallback to classic base paths.
- Verified with targeted test runs:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js`
- `pnpm exec vitest run app/catana/__tests__/GameScreen.themeSwitcher.test.js`

## Status (2026-02-20)
- Disabled debug UI surfaces on gameplay screens:
- Removed `DebugPanel` render/import from `app/catana/GameScreen.js`.
- Set `debug: false` on boardgame.io clients in `app/catana/page.js` and `app/catana/lobby/[matchID]/MatchPageClient.js` to suppress the built-in debug overlay.
- Added coverage in `app/catana/__tests__/DebugUiVisibility.test.js`.
- Added subtle game-log feed motion polish in `app/catana/components/GameLogPanel.js` and `app/globals.css`.
- New log rows now get a short fade/slide-in via `game-log-entry` so incoming events feel more alive without heavy animation.
- Added a top-edge fade mask (`game-log-fade`) on the scroll region so older entries soften as they move out of focus.
- Updated log autoscroll to use smooth scrolling when motion is allowed and preserve instant scrolling for reduced-motion users.
- Added test coverage in `app/catana/__tests__/GameLogPanel.test.js` for the new feed animation hooks.

## Status (2026-02-16)
- Added a dev-only in-game `Theme` dropdown in `app/catana/GameScreen.js` that switches visual assets live without refreshing.
- Added lightweight theme infrastructure at `app/catana/theme/themes.js`:
- `classic` theme base: `/svgs`
- `custom` theme base: `/svgs-custom`
- helper APIs for asset path resolution + fallback
- localStorage persistence key `catana:themeId`
- Wired `themeId` through board/HUD rendering paths so these update live:
- tiles (`Tile.js`)
- ports (`Port.js`)
- robber icon (`Tile.js`)
- settlements/cities/roads (`Node.js`, `Edge.js`, `ActionNode.js`, `Piece.js`)
- resource icons (`PlayerActionContainer.js`, `TradeDiscardModal.js`, `GameLogPanel.js`, `resourceDistribution.js`, `DebugPanel.js`, `Card.js`)
- Updated placement effect visuals (`app/catana/effects/placePiece.js`) to use current theme assets for settlement/city/road animation overlays.
- Added focused tests:
- `app/catana/__tests__/themeAssets.test.js` (theme helper behavior)
- `app/catana/__tests__/GameScreen.themeSwitcher.test.js` (dev switcher wiring/persistence hooks)
- Updated `app/catana/__tests__/uiNoDragImages.test.js` for new resource-icon path helper usage.

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
- Retuned wheat palette in `/catana/dev/palette-preview` to a cleaner amber ramp inspired by the provided reference:
- `base #fbbf24` (amber-400),
- `highlight #fcd34d` (amber-300),
- `shadow #f59e0b` (amber-500),
- applied consistently to both Option C and Option D while leaving gradient structure unchanged.
- Second wheat brightness pass to better match the bright top reference look (while still no special-case sheen):
- `base #fbbf24` (unchanged),
- `highlight #fde68a` (lighter top pop),
- `shadow #eab308` (less brown/dark than prior orange shadow),
- applied to both Option C and Option D.
- Reintroduced pre-SVG wheat baselines as selectable options in `/catana/dev/palette-preview`:
- `Option A` = legacy pre-SVG C (`#f4bd1f / #ffe682 / #a85500`),
- `Option B` = legacy pre-SVG D (`#ffd43b / #ffed8e / #c26a06`),
- `Option C` = current lighter wheat experiment (`#fbbf24 / #fde68a / #eab308`).
- Updated palette selector and helper copy to A/B/C and defaulted selection to Option C for ongoing wheat tuning.
- Retuned Option C wheat again because A vs C still read too similar in the tile body:
- moved to a stronger bright-gold body set (`base #fcd34d`, `highlight #fef08a`, `shadow #f59e0b`) and warmer vignette tint (`ink #b45309`) so the center/base reads visibly lighter, not only the ring.
- Slightly increased Option C filter to `saturate(1.2) contrast(1.05)` for clearer separation against A.
- Applied the same updated Option C bright-gold wheat set to `public/svgs/concepts/resource-palette-preview.html`:
- Option C wheat now matches the dev-route values (`#fcd34d`, `#fef08a`, `#f59e0b`, `ink #b45309`) with `tileFilter` aligned to `saturate(1.2) contrast(1.05)` for parity while iterating ring highlight/seam controls.
- Applied the same wheat set to rows A, D, and E in `public/svgs/concepts/resource-palette-preview.html` and restored row B.
- Current row order on that page is now `Option C`, `Option B`, `Option A`, `Option D`, `Option E`.
- Applied the same bright-gold wheat set to row B as well, so all rendered rows (C/B/A/D/E) now share wheat colors while ring/seam tuning is compared.
- Saved new default gradient-lab preset values in `public/svgs/concepts/resource-palette-preview.html`:
- style `Ore Directional`,
- body depth `170%`,
- ring depth `72%`,
- ring direction `Vertical (dark bottom)`,
- edge shadow lift `12%`,
- stripes `off`.
- Kept wheat locked for cross-row ring/highlight comparison and updated the lock-note copy to reflect all current rows (`A/B/C/D/E`).
- Updated `/catana/dev/palette-preview` dropdown to include all five palette rows for parity with the HTML concept page:
- options now `C, B, A, D, E` (in that order),
- row palettes mirror the current concept-page set, including shared bright-gold wheat across rows,
- Option E note clarifies that accessibility pattern overlays are not rendered in this board-preview route.

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

## Status (2026-02-23, wheat icon shading variants)
- Added two shading-variant copies of the working wheat resource icon for visual comparison without changing base silhouette:
  - `design/working_draft/wheat_icon_shading_subtle.svg`
  - `design/working_draft/wheat_icon_shading_rich.svg`
- Both variants keep the same shape and experiment with local grain/lobe accent fills (two-tone look), with:
  - `subtle`: lower-opacity accents and minimal extra detail,
  - `rich`: stronger accents plus a central stem highlight strip.

## Status (2026-02-23, resource icon outsourcing guide)
- Added an authoritative Catana resource icon handoff guide:
  - `docs/agent/skills/catana-brand/RESOURCE_ICON_STYLE_GUIDE.md`
- Guide captures:
  - brand-aligned icon style pillars,
  - canonical 256 template and safe-area contract,
  - per-resource silhouette briefs (wood/brick/sheep/wheat/ore),
  - tokenized color strategy, no-sticker/no-heavy-gloss constraints,
  - acceptance checklist for small-size/in-game legibility.
- Added discoverability link from:
  - `docs/agent/skills/catana-brand/SKILL.md`

## Status (2026-03-04, tile icon transform normalization)
- Updated tile resource-icon placement in `app/catana/Tile.js` to use one uniform transform for all resources.
- Removed per-resource scale and top-offset overrides so icon redesign can proceed on a single canonical placement.
- Set the global transform to the previous Sheep baseline:
  - top factor: `0.204`
  - scale: `0.68`

## Status (2026-03-05, emoji settlement PNG preview override)
- Added a temporary emoji-theme asset override in `app/catana/theme/themes.js` so all settlement piece files (`settlement_<color>.svg`) resolve to:
  - `/test_designs/settlement_red.png`
- Purpose: quick in-game visual testing of a PNG settlement concept without modifying piece placement/rendering logic.
- Added test coverage in `app/catana/__tests__/themeAssets.test.js` for emoji settlement override resolution.

## Status (2026-03-05, raster prototype auto-fit for pieces)
- Updated piece rendering to auto-detect raster assets (`.png/.jpg/.webp/.gif`) and apply raster-friendly placement:
  - `app/catana/Piece.js`
  - `app/catana/effects/placePiece.js`
- Raster assets now render with:
  - `background-size: contain` (instead of `cover`)
  - `background-position: center bottom`
  - slightly adjusted vertical anchor (`0.59` vs SVG `0.63`)
- SVG assets keep existing behavior unchanged.
- Added helper and test coverage:
  - `isRasterAssetPath(...)` in `app/catana/theme/themes.js`
  - assertions in `app/catana/__tests__/themeAssets.test.js`

## Status (2026-03-05, settlement PNG prototype size tuning)
- Tuned settlement prototype rendering to appear smaller when the themed settlement asset is raster:
  - `app/catana/Piece.js`
  - `app/catana/effects/placePiece.js`
- Added a settlement-only raster render scale constant (`0.88`) so PNG mockups stay closer to previous SVG visual footprint on board.
- Non-raster/SVG settlement assets and city/road rendering remain unchanged.

## Status (2026-03-05, settlement PNG vertical alignment nudge)
- Added a settlement-only raster Y lift (`5px`) to better align the temporary PNG prototype on board nodes.
- Applied consistently to both static board rendering and placement animation rendering:
  - `app/catana/Piece.js`
  - `app/catana/effects/placePiece.js`

## Status (2026-03-04, resource bar icon legibility)
- Increased resource bar icon display sizes in `app/catana/components/PlayerActionContainer.js`:
  - Brick/Ore icons from `h-6` -> `h-9`
  - Sheep icon from `h-7` -> `h-10`
  - Wood/Wheat icons from `h-8` -> `h-10`
- Increased resource count text size in the same component from `text-3xl` -> `text-4xl` and widened count slot (`w-6` -> `w-8`) for clearer readability.
- Added a UI guard test in `app/catana/__tests__/uiNoDragImages.test.js` to ensure larger icon classes remain in place.

## Status (2026-03-04, resource bar spacing + count stability)
- Tightened count-to-icon spacing in `app/catana/components/PlayerActionContainer.js` (`mr-2` -> `mr-1`) so rows feel less spread out.
- Reduced count size (`text-4xl` -> `text-3xl`) while keeping legibility.
- Added number stability helpers to reduce visual shift between digits:
  - fixed count slot width `w-7`,
  - centered text `text-center`,
  - compact line box `leading-none`.
- Removed `tabular-nums` so the resource count uses default font rendering.

## Status (2026-03-04, resource bar icon style normalization)
- Replaced per-resource icon sizing branches in `app/catana/components/PlayerActionContainer.js` with one shared icon style for all resources.
- Resource icons now render with a uniform fixed slot/class:
  - `h-10 w-10 object-contain`
- This ensures consistent count-to-icon spacing regardless of individual SVG intrinsic width/padding differences.
- Updated UI guard test in `app/catana/__tests__/uiNoDragImages.test.js` to assert the shared class and no longer expect mixed `h-9`/`h-10` sizing.

## Status (2026-03-09, port connector visual targeting)
- Replaced the experimental free-angle connector geometry with the original fixed six-way bridge transform system from the older port implementation.
- `app/catana/utils/portLayout.js` now uses:
  - the legacy connector direction map,
  - fixed `0 / ±60deg` rotations,
  - the legacy `port_pier.svg` bridge asset for consistent shoreline alignment.
- This restores the previously proven coast/port bridge angles instead of continuously solving connector vectors.
- Follow-up fix: bridge placement is now anchored from the actual connected node coordinates rather than the old hardcoded per-direction offsets, so the restored legacy angles line up with the current curved board geometry.
- Final fix: port connectors now resolve from the same `nodeRenderById` render-map entries used by `ActionNode` and settlement placement.
  - `app/catana/Board.js` passes `nodeRenderById` into each `Port`.
  - `app/catana/Port.js` resolves `tile.nodes` through that map and hands the exact render nodes to `getPortRenderModel(...)`.
  - `app/catana/utils/portLayout.js` computes each bridge from the real rendered node tile-coordinate + node-direction pair, including ports whose two coastal nodes come from different land tiles.
- Added focused regression coverage in `app/catana/__tests__/utils/portLayout.test.js` for east and southeast ports using actual node-anchored connector expectations.

## Status (2026-03-10, port connector rollback for manual tuning)
- Rolled back the latest node-render-driven bridge placement change while keeping the new port marker/icon system intact.
- `app/catana/Board.js` no longer passes `nodeRenderById` into `Port`.
- `app/catana/Port.js` again asks `getPortRenderModel(...)` for direction-based connector placement only.
- `app/catana/utils/portLayout.js` is back on the simpler legacy direction map for bridges (`0 / ±60deg` rotations from the port tile direction).
- Follow-up correction: the rollback now restores the original hand-tuned diagonal bridge offsets as well, not the intermediate node-centered variant.
- This leaves the new port icons/badge system in place while restoring the older bridge positioning so manual tweaking can continue from that baseline.

## Status (2026-03-10, port connector concept SVGs)
- Added three standalone connector concept assets for design exploration in `public/svgs/concepts/`:
  - `port_connector_sandbar.svg`
  - `port_connector_frosted.svg`
  - `port_connector_hybrid.svg`
- All three use the existing `80x240` pier footprint so they can be swapped into the current port connector slot without changing layout math.

## Status (2026-03-10, port bridge layering)
- Wrapped each port’s marker/connector/badge in a dedicated low-z `.portLayer` stacking context in `app/catana/Port.js` / `app/catana/Port.css`.
- Port internal z-order is now:
  - marker: `z-index: 1`
  - connector/pier: `z-index: 2`
  - rate badge: `z-index: 3`
- Because the board still renders `{tiles}` before `{buildings}`, placed settlements/cities/roads remain above the full port layer while the connector now sits on top of the circular port marker.

## Status (2026-03-10, smaller port icon footprint)
- Reduced the port marker icon footprint in `app/catana/Port.css`:
  - resource icon: `52%` -> `46%`
  - generic "3 dots" glyph: `44% x 22%` -> `40% x 20%`
- Added a regression in `app/catana/__tests__/Port.render.test.js` so future styling changes keep the smaller icon sizing.

## Status (2026-03-12, board-level port channels)
- Replaced the visible old per-port bridge treatment with a board-level `BoardPortChannels` SVG layer in `app/catana/BoardPortChannels.js`.
- `app/catana/Board.js` now renders that layer between `BoardUnderlay` and `{tiles}`, so the channels read as part of the map while the circular port markers still sit on top.
- `app/catana/Port.js` no longer renders the old `port-connector` divs; the port component is back to marker + badge only.
- The current channel art direction is:
  - one tapered channel per port,
  - warm sand outer band using the shared board sand `#E5D08A`,
  - pale blue inner lane,
  - curved path geometry rather than rotated pier assets.
- The current tuning pass widened the coast-side end of the channels and switched from straight polygons to curved SVG paths to better match the softer underlay silhouette.
- Added coverage in:
  - `app/catana/__tests__/BoardPortChannels.render.test.js`
  - `app/catana/__tests__/Board.layering.test.js`
  - `app/catana/__tests__/Port.render.test.js`

## Status (2026-03-16, simple port connectors)
- Simplified the board-level port connection treatment in `app/catana/BoardPortChannels.js` from one heavier merged shoreline channel per port to two short sandy connector bars per port.
- Kept the existing layer slot unchanged:
  - `BoardUnderlay`
  - `BoardPortChannels`
  - `{tiles}` / port token
  - placed pieces
- Preserved the existing correct connector targeting by reusing `getPortRenderModel(...).connectors` from `app/catana/utils/portLayout.js` rather than introducing new geometry logic.
- Updated `app/catana/__tests__/BoardPortChannels.render.test.js` to assert:
  - one channel group per port,
  - two connector bars per port,
  - no old merged channel markup.
- Design outcome:
  - lighter than the board-channel experiment,
  - keeps the important “these two nodes access this port” signal,
  - easier to tune visually than the merged coastline-extension treatment.

## Status (2026-03-16, node-anchored simple port connectors)
- Refined the simple connector pass so the visible sandy bars are now anchored near the real coastal node circles instead of being centered inside the old legacy connector shells.
- `app/catana/utils/portLayout.js` now exposes `nodeDirection` on each connector so the render layer can place bars from actual node-facing geometry.
- `app/catana/BoardPortChannels.js` now computes each bar from:
  - the port tile center,
  - `getNodeDelta(...)` for the correct coastal vertex,
  - the current port marker center,
  - a short clamped length that stops before the token.
- This keeps the lighter “two separate sandy markers” direction while fixing the mid-water floating/undersized look from the first simple-bar attempt.

## Status (2026-03-19, settlement piece reference iteration)
- Switched the piece-asset exploration loop from broad `imagegen` variation batches to one-at-a-time reference-driven edits.
- Built a two-image reference pack under `tmp/imagegen/refs/`:
  - `board-style-ref.png` cropped from the current board look to anchor gradients/softness,
  - `settlement-ref.png` rasterized from the existing settlement SVG as a loose projection/detail reference.
- Learned from the first reference edit that using the rendered settlement directly as the primary image over-constrains the model and tends to preserve too much of the old shape while reintroducing glow.
- Created `settlement-silhouette-ref.png` as a simplified silhouette anchor, then used that plus the board crop to produce a materially better flat/front settlement direction at:
  - `output/imagegen/piece-settlement-iterative/02-silhouette-anchor.png`
  - `output/imagegen/piece-settlement-iterative/03-house-read.png`
- Current best direction:
  - `02-silhouette-anchor.png` for overall projection/rendering language fit,
  - `03-house-read.png` if we want the same base but with a clearer settlement/house read.
- Follow-up settlement branch from `03-house-read.png`:
  - `04-more-piece-like.png` is the most useful refinement so far; it keeps the good flat board-piece read while making the roof/body relationship feel more like a placed game piece.
  - `05-broader-stable.png` regressed by inventing a base/plinth and should not be reused.
  - `06-cleaner-flatter.png` stayed too close to `03-house-read.png` to justify the branch.
  - `07-inset-door-shadow.png` is a light cleanup pass on `04`; the change is subtle but keeps the same direction viable.
- Roof-forward exploration from `04-more-piece-like.png`:
  - `08-roof-forward-subtle.png`, `09-roof-forward-stronger.png`, and `10-roof-overhang.png` all preserve the same style and slightly increase roof dominance/top-down read.
  - The differences are intentionally small:
    - `08` is the gentlest push,
    - `09` is the strongest “bigger roof / higher perspective” read,
    - `10` is close to `09` but with a touch more overhang flavor.
  - None of these broke the established flat board-piece language, which means the roof-forward direction is safe to continue if preferred.

## Status (2026-03-19, user-SVG transform test)
- Took the user-provided settlement SVG markup and saved it as `tmp/imagegen/refs/settlement-user-start.svg`, then rasterized it to `settlement-user-start.png` for edit-mode use.
- Ran a reference-driven `imagegen` edit using:
  - the user SVG raster as the primary geometry anchor,
  - the existing Colonist settlement raster as a proportion cue only,
  - the board crop as the Catana rendering/style cue.
- Outputs:
  - `output/imagegen/piece-settlement-iterative/11-user-svg-proportion-shift.png`
  - `output/imagegen/piece-settlement-iterative/12-user-svg-stronger-roof.png`
- Result:
  - this workflow preserved the user’s cleaned-up settlement family more faithfully than earlier freeform generations,
  - `12-user-svg-stronger-roof.png` is the stronger and more useful result for the desired “bigger roof / smaller visible face / higher perspective” proportion shift.

## Status (2026-03-19, Colonist-geometry style transfer test)
- Switched to a stricter style-transfer workflow:
  - `settlement-colonist-whitebg.png` as the exact settlement geometry/proportion anchor,
  - `04-more-piece-like.png` as the newer Catana settlement style cue,
  - `board-style-ref.png` as the board softness/gradient cue.
- Outputs:
  - `output/imagegen/piece-settlement-iterative/13-colonist-restyle-conservative.png`
  - `output/imagegen/piece-settlement-iterative/14-colonist-restyle-softer.png`
- Result:
  - this branch preserves the familiar Colonist silhouette/proportions better than the roof/body proportion experiments,
  - `14-colonist-restyle-softer.png` is the cleaner of the two and currently the best “same geometry, newer Catana treatment” direction.

## Status (2026-03-19, true Colonist redraw branch)
- Corrected the anchor to the real source file: `public/svgs/settlement_red_colonist.svg`.
- First reran strict style-transfer against the true anchor:
  - `15-true-colonist-restyle-conservative.png`
  - `16-true-colonist-restyle-softer.png`
- Those still read too much like softened repaints, so the prompt was loosened from “preserve exact geometry” to “preserve roof-first recognizability, but redraw in Catana style.”
- New outputs:
  - `17-colonist-rebuild-highfid.png`
  - `18-colonist-rebuild-lowfid.png`
- Result:
  - `17` is the first useful “new piece based on Colonist perspective” direction,
  - `18` over-drifts and gets too narrow/awkward.

## Status (2026-03-19, exact outline-guide test)
- Replaced the approximate silhouette guide with the user-provided exact outline SVG at `tmp/imagegen/refs/settlement-outline-user.svg`.
- Rasterized that to `settlement-outline-user.png` and used it as the sole geometry guide in a `sketch-to-render` pass:
  - `output/imagegen/piece-settlement-iterative/20-user-outline-render.png`
- Result:
  - the model still rounds the lower face back into a generic house shape instead of respecting the exact flat-bottom + obtuse-angle guide,
  - this is the clearest evidence so far that `imagegen` is not reliable enough to solve the final settlement geometry.

## Status (2026-03-19, manual settlement SVG rebuild)
- Rebuilt `public/svgs/settlement_red.svg` by hand instead of continuing prompt iteration.
- Geometry source:
  - preserved the Colonist settlement silhouette / roof-face line structure,
  - used the exact same roof/body/door angle language from `public/svgs/settlement_red_colonist.svg` and `public/svgs/settlement_colonist_outline.svg`.
- Style source:
  - applied the softer Catana orange gradient family from the newer traced settlement direction,
  - removed the hard Colonist magenta/black outline treatment in favor of tonal plane separation and a darker orange shell.
- Validation:
  - SVG passes `xmllint --noout`,
  - raster preview generated at `tmp/settlement-preview/settlement_red.png`,
  - side-by-side comparison generated at `tmp/settlement-preview/settlement_comparison_white.png`.
- Result:
  - the settlement now keeps the exact face/roof geometry the user wanted,
  - the rendering language is materially closer to the Catana board than the old Colonist asset,
  - remaining tradeoff is intentional: readability now comes from color-plane contrast rather than a hard perimeter stroke.

## Status (2026-03-19, red palette alignment pass)
- Kept the user-authored settlement geometry in `public/svgs/settlement_red.svg` and retuned only the color ramp.
- New red pass is anchored loosely to the existing Catana player red family in `app/catana/theme/playerColors.js`:
  - darker shell / outline tone moved from orange to a warm red-brown,
  - roof and face gradients shifted from orange/coral to a warmer red/coral ramp,
  - door darkened into a deeper red shadow tone.
- Verification:
  - `xmllint --noout public/svgs/settlement_red.svg`
  - raster preview generated at `tmp/settlement-preview/settlement_red_warm.png`
- Result:
  - the piece now reads as red rather than orange,
  - it still stays slightly warmer/softer than the avatar red, which should make it fit the board language better than a literal Tailwind red clone.
  - Follow-up micro-iteration selected `05-richer-right-roof` as the current live red:
    - right roof / darker planes got a small saturation and contrast bump,
    - light planes stayed warm so the asset does not drift back toward Colonist harshness.

## Status (2026-03-19, road SVG direction set)
- Drew three actual red road SVG candidates under `tmp/road-svg-exploration/` instead of continuing with prose-only direction discussion:
  - `road_red_variant_classic.svg`
  - `road_red_variant_ridge.svg`
  - `road_red_variant_chunky.svg`
- All three respect the current runtime constraints in `app/catana/Edge.js` / `app/catana/effects/placePiece.js`:
  - straight horizontal asset,
  - shallow strip proportions,
  - runtime rotation still handles direction on the board.
- Generated white-background previews plus a comparison sheet at:
  - `tmp/road-svg-exploration/road_variants_comparison.png`
- Current read:
  - `classic` is the safest baseline,
  - `ridge` is the strongest “match the settlement roof-plane language” option,
  - `chunky` is the most toy-like / bold but may be a little too stubby.

## Status (2026-03-19, softer road pass)
- Replaced the angular road exploration with a softer silhouette pass that fits Catana better.
- New SVG candidates:
  - `tmp/road-svg-exploration/road_red_variant_soft_capsule.svg`
  - `tmp/road-svg-exploration/road_red_variant_soft_chamfer.svg`
  - `tmp/road-svg-exploration/road_red_variant_soft_ribbon.svg`
- Generated a white-background comparison sheet at:
  - `tmp/road-svg-exploration/road_variants_soft_comparison.png`
- Current read:
  - `soft_capsule` is friendliest but risks feeling too generic/mobile,
  - `soft_chamfer` is the strongest balance between “piece” and “Catana softness,”
  - `soft_ribbon` is the safest / simplest if we want almost no shape personality.

## Status (2026-03-19, road gradient-only pass)
- Kept the preferred `soft_capsule` silhouette and explored gradient-led rendering instead of the inset two-tone panel treatment.
- New SVG candidates:
  - `tmp/road-svg-exploration/road_red_variant_soft_capsule_gradient_plain.svg`
  - `tmp/road-svg-exploration/road_red_variant_soft_capsule_gradient_sheen.svg`
  - `tmp/road-svg-exploration/road_red_variant_soft_capsule_gradient_edge.svg`
- Comparison sheet generated at:
  - `tmp/road-svg-exploration/road_variants_soft_capsule_gradient_comparison.png`
- Current read:
  - `gradient_plain` is the cleanest and most board-native,
  - `gradient_sheen` adds softness but risks reading a little glossy,
  - `gradient_edge` keeps more piece definition and is the strongest if we want a slightly richer token.

## Status (2026-03-19, road taper variants)
- Took the `gradient_plain` capsule road and tested subtle pointed/tapered ends instead of a pure capsule.
- New candidates:
  - `tmp/road-svg-exploration/road_red_variant_soft_taper_subtle.svg`
  - `tmp/road-svg-exploration/road_red_variant_soft_taper_mid.svg`
  - `tmp/road-svg-exploration/road_red_variant_soft_taper_strong.svg`
- Comparison sheet:
  - `tmp/road-svg-exploration/road_variants_taper_comparison.png`
- Current read:
  - `taper_subtle` is the only one that adds useful piece identity without becoming too classic/stylized,
  - `taper_mid` and `taper_strong` start reading more like tokens/badges than a soft Catana road.

## Status (2026-03-19, rounded-hex road pass)
- Tested a new road direction based on the placeholder’s hex-corner logic, but rounded/softened.
- New candidates:
  - `tmp/road-svg-exploration/road_red_variant_hex_round_soft.svg`
  - `tmp/road-svg-exploration/road_red_variant_hex_round_balanced.svg`
  - `tmp/road-svg-exploration/road_red_variant_hex_round_strong.svg`
- Comparison sheet:
  - `tmp/road-svg-exploration/road_variants_hex_round_comparison.png`
- Current read:
  - `hex_round_balanced` is the strongest bridge between the old placeholder silhouette and the newer Catana softness,
  - `hex_round_soft` is probably too close to the capsule,
  - `hex_round_strong` starts tipping back toward a harder token silhouette.

## Status (2026-03-19, rounded-hex road shell thinning)
- Compared the original `hex_round_balanced` road against thinner-shell follow-ups:
  - `tmp/road-svg-exploration/road_red_variant_hex_round_balanced_thin.svg`
  - `tmp/road-svg-exploration/road_red_variant_hex_round_balanced_ultrathin.svg`
- Comparison sheet:
  - `tmp/road-svg-exploration/road_variants_hex_round_thin_comparison.png`
- Current read:
  - `balanced_thin` is the best fit so far,
  - `balanced_ultrathin` starts losing too much token definition,
  - original `balanced` confirms the earlier concern that the shell/border read too heavy against the live settlement.

## Status (2026-03-19, rounded-hex road shorter ends)
- Shortened the end caps on the current `balanced_thin` road to reduce the stretched placeholder feel.
- New candidates:
  - `tmp/road-svg-exploration/road_red_variant_hex_round_balanced_short_ends.svg`
  - `tmp/road-svg-exploration/road_red_variant_hex_round_balanced_tight_ends.svg`
- Comparison sheet:
  - `tmp/road-svg-exploration/road_variants_hex_round_short_ends_comparison.png`
- Current read:
  - `balanced_short_ends` is the strongest refinement,
  - `balanced_tight_ends` starts getting too compressed/rounded and loses some of the nice road-piece tension.

## Status (2026-03-19, red road asset applied)
- Replaced the copied placeholder in `public/svgs/road_red.svg` with the chosen `balanced_thin` rounded-hex road.
- This keeps:
  - the softer rounded-hex silhouette,
  - the thinner perimeter shell,
  - the gradient-led red treatment that matches the new settlement better than the old hard outlined road.
- Verification:
  - `xmllint --noout public/svgs/road_red.svg`
  - rendered preview at `tmp/road-preview/road_red_applied.png`

## Status (2026-03-19, road same-box rounded reset)
- Confirmed the core constraint:
  - the road must keep the old blue template box/footprint,
  - but should still use the softer rounded Catana design language rather than the hard old placeholder silhouette.
- `public/svgs/road_red.svg` now keeps the exact same viewBox as `public/svgs/road_blue.svg`:
  - `-70.835 76.935 193.57 39.71`
- Within that same box, red road geometry was redrawn into a rounded capsule-like Catana piece instead of reusing the blue road’s hard-edged polygon.
- Verification:
  - `xmllint --noout public/svgs/road_red.svg`
  - confirmed matching viewBox values for `road_blue.svg` and `road_red.svg`
  - isolated render: `tmp/road-preview/road_red_rounded_same_box.png`
  - board-context mock: `tmp/road-preview/road_red_rounded_same_box_board_mock.png`

## Status (2026-03-19, road native-stroke pass)
- Replaced the road’s fake outer shell layer with a native SVG `stroke` on the rounded body path.
- Reason:
  - the shell-layer approach was making the perimeter feel too chunky and dumb on the board,
  - the road is simple enough that a real stroke is a better fit than the settlement’s manual shell construction.
- Current implementation:
  - same rounded path,
  - `stroke="#a4221a"`,
  - `stroke-width="3.25"`,
  - `stroke-linejoin="round"`,
  - `paint-order="stroke fill"` so the fill sits inside the rim more cleanly.
- Verification:
  - `xmllint --noout public/svgs/road_red.svg`
  - isolated render: `tmp/road-preview/road_red_stroke_white.png`
  - board-context mock: `tmp/road-preview/road_red_stroke_board_mock.png`

## Status (2026-03-19, road cross-gradient correction)
- Corrected the road gradient interpretation:
  - the user wanted the tonal change to run across the road thickness,
  - not along the road length.
- Updated the `body` gradient in `public/svgs/road_red.svg` so the road now has:
  - lighter top/bottom edges,
  - darker middle band through the center.
- No geometry or stroke changes in this pass.
- Verification:
  - `xmllint --noout public/svgs/road_red.svg`
  - isolated render: `tmp/road-preview/road_red_stroke_cross_gradient_white.png`
  - board-context mock: `tmp/road-preview/road_red_stroke_cross_gradient_board_mock.png`

## Status (2026-03-19, blue road parity pass)
- Applied the current live red-road treatment to `public/svgs/road_blue.svg`.
- Blue road now matches red road in:
  - geometry,
  - shared template viewBox,
  - native stroke approach,
  - cross-road gradient structure.
- Only the palette changed to a blue player-color ramp and darker blue rim.
- Verification:
  - `xmllint --noout public/svgs/road_blue.svg`
  - isolated render: `tmp/road-preview/road_blue_new_white.png`
  - board-context mock: `tmp/road-preview/road_blue_new_board_mock.png`

## Status (2026-03-19, blue settlement parity pass)
- Replaced the old Colonist-style `public/svgs/settlement_blue.svg` with the current live red-settlement geometry and a blue palette translation.
- Blue settlement now matches red settlement in:
  - silhouette,
  - perspective,
  - shading structure,
  - overall Catana rendering language.
- Only the color ramp changed, keyed to the blue player family and the new blue road.
- Verification:
  - `xmllint --noout public/svgs/settlement_blue.svg`
  - isolated render: `tmp/settlement-preview/settlement_blue_new.png`
  - red/blue comparison: `tmp/settlement-preview/settlement_red_blue_comparison.png`

## Status (2026-03-19, slight road length increase)
- Made the live red and blue roads a little longer without touching layout code.
- Implementation detail:
  - kept the same `viewBox` and renderer footprint,
  - stretched the road path occupancy inside the box by moving the start/end from `-53.5 / 104` to `-57 / 107.5`.
- This is the correct low-risk fix for tighter visual road connections:
  - it reduces the visible gap between adjacent roads,
  - while preserving board placement math and rotation behavior.
- Verification:
  - `xmllint --noout public/svgs/road_red.svg public/svgs/road_blue.svg`
  - renders:
    - `tmp/road-preview/road_red_longer.png`
    - `tmp/road-preview/road_blue_longer.png`
    - `tmp/road-preview/road_red_blue_longer_comparison.png`

## Status (2026-03-19, road end clipping fix)
- After the slight length increase, the road ends started clipping on-board.
- Root cause investigation showed the rendered road pixels were touching the horizontal edges of the SVG image:
  - before fix: high-res blue road render bounds were `0 .. 1999`
  - so the issue was real SVG/image clipping, not board placement math.
- Fixed by adding a tiny shared horizontal pad to the road `viewBox`:
  - old: `-70.835 76.935 193.57 39.71`
  - new: `-73.835 76.935 199.57 39.71`
- This preserves the longer road shape while giving the tips enough image-space margin to avoid being chopped.
- Verification:
  - `xmllint --noout public/svgs/road_red.svg public/svgs/road_blue.svg`
  - high-res blue render bounds after fix: `2 .. 1983` (no edge touch)
  - render: `tmp/road-preview/road_blue_no_clip_white.png`

## Status (2026-03-19, city red stretch pass 1)
- Replaced the old Colonist-style `public/svgs/city_red.svg` with a first settlement-derived city pass.
- This first pass intentionally keeps the city conservative:
  - same roof silhouette and roof-plane treatment as the live settlement,
  - taller front body overlay,
  - lowered/taller door,
  - one centered upper window,
  - no annex yet.
- Verification:
  - `xmllint --noout public/svgs/city_red.svg`
  - isolated render: `tmp/city-preview/city_red_stretch_pass1.png`
  - settlement/city comparison: `tmp/city-preview/settlement_city_red_comparison.png`

## Status (2026-03-22, city red palette alignment)
- Tuned the live `public/svgs/city_red.svg` colors so the rear/right city mass sits closer to the established red settlement palette.
- Kept geometry untouched and only adjusted rear gradient stops:
  - removed the overly dark top reds in the rear roof/body gradients,
  - moved the rear cap/body fills back toward the same warm coral-red family used by `public/svgs/settlement_red.svg`,
  - left the front house colors alone.
- Result:
  - the city now reads more like the same red asset family as the settlement,
  - the rear section no longer punches darker/harsher than the main house.
- Verification:
  - `xmllint --noout public/svgs/city_red.svg`
  - isolated render: `tmp/city-preview/city_red_live_palette_check_tuned.png`
  - settlement/city comparison: `tmp/city-preview/settlement_city_red_palette_comparison_tuned.png`

## Status (2026-03-22, city blue palette transfer)
- Replaced the old Colonist-style `public/svgs/city_blue.svg` with the same live city structure now used by `public/svgs/city_red.svg`.
- This was a straight palette transfer, following the same pattern used earlier for the settlement assets:
  - kept the city geometry/style aligned to the live red city,
  - swapped shell, door, face, roof, and rear-mass colors into the established blue family from `public/svgs/settlement_blue.svg`,
  - kept the rear/right city mass in the same relative palette relationship as the tuned red city.
- Result:
  - blue city now reads as the same asset family as both the red city and blue settlement,
  - and no longer uses the old black-stroked Colonist city treatment.
- Verification:
  - `xmllint --noout public/svgs/city_blue.svg`
  - isolated render: `tmp/city-preview/city_blue_new.png`
  - red/blue city comparison: `tmp/city-preview/city_red_blue_comparison.png`
  - blue settlement/city comparison: `tmp/city-preview/settlement_city_blue_comparison.png`

## Status (2026-03-22, city blue rear-roof softening)
- Softened the blue city’s small rear roof/body transition after it read a bit harsher than the rest of the asset family.
- Kept geometry untouched and made the smallest possible palette change:
  - darkened the lightest stop of the rear body gradient from `#82d8ff` to `#6fc3ff`,
  - leaving the rest of the city blue palette intact.
- Result:
  - the rear roof/body seam reads less abrupt,
  - while still keeping the lower rear block a bit more side-on than the main house.
- Verification:
  - `xmllint --noout public/svgs/city_blue.svg`
  - softened render: `tmp/city-preview/city_blue_softened.png`
  - before/after comparison: `tmp/city-preview/city_blue_softened_comparison.png`

## Status (2026-03-28, dev-only scenario tooling)
- Added a dev-only Catana scenario path that avoids the old brittle mid-match `ctx` hot-load.
- `app/api/scenarios/route.js` now normalizes legacy scenario files and saves new files as `{ state: <G> }` instead of raw `{ G, ctx }` snapshots.
- `app/catana/Game.js` now accepts `setupData.devScenarioState` outside production and seeds boardgame.io `ctx` from the saved Catana turn/phase so a match can boot straight into the saved point.
- Reintroduced a cleaned-up `DebugPanel` in `app/catana/GameScreen.js`, gated by `NODE_ENV !== "production"`:
  - player selector,
  - give resource buttons,
  - give dev-card buttons,
  - save current state as a named scenario via an authoritative debug snapshot capture,
  - no in-match scenario load button.
- Added dev-only lobby support in `app/catana/lobby/LobbyPageClient.js`:
  - fetches saved scenarios from `/api/scenarios`,
  - shows a `Start from scenario` control in the custom-game area,
  - creates matches with `setupData.devScenarioState`.
- Added a new debug move `DEBUG_takeDevCards` and coverage for:
  - scenario API normalization,
  - setup-time scenario boot,
  - debug move exposure,
  - dev-card grant behavior,
  - scenario snapshot capture/clear behavior,
  - dev-only UI wiring in lobby/game screen.
- Tuned the new resource card-back asset in `public/svgs/resource_back.svg` to the approved `B` palette direction:
  - lighter Catana-leaning blue ramp and frame,
  - subtle cream gradients on the outer card stock and center hex face,
  - structure and gold linework otherwise preserved.
- Finalized the resource card-back divider treatment in `public/svgs/resource_back.svg`:
  - replaced the full horizontal band with split `15px` side bars,
  - kept the mid-card anchor while making the center medallion feel less boxed in.
- Locked in the alternate hex-emblem resource-back concept in `public/svgs/resource_back_hex_design.svg`:
  - kept the five-hex center motif,
  - switched it to the approved uniform debossed `balanced` treatment so all inner hexes share the same local shading,
  - slightly enlarged/repositioned the inner motif for better read inside the main badge.
- Refined the dev-card back draft in `public/svgs/devback_design.svg`:
  - kept the same overall card shell as the resource-back family,
  - softened the orange field toward a calmer amber-clay gradient,
  - gave the enlarged circular seal a subtle cream gradient,
  - slightly reduced the center treatment and shortened the side stubs for better spacing.
- Revised the dev-card back field in `public/svgs/devback_design.svg` after comparing it against the live board palette:
  - replaced the muddier amber-clay field with a brighter board-orange gradient,
  - kept the approved cream shell, enlarged circular seal, and shorter side stubs unchanged,
  - anchored the new orange closer to the existing Catana brick/dev-card warm palette so it contrasts more cleanly with the blue resource back.
- Promoted the approved card-back designs into the live board asset filenames:
  - `public/svgs/card_rescardback.svg` now uses the approved `resource_back_hex_design.svg` art,
  - `public/svgs/card_devcardback.svg` now uses the approved `devback-seal-flat-rim.svg` art,
  - kept the existing opponent stack sizing unchanged because the new backs preserve the old portrait aspect ratio and render cleanly at the current `52x72` board size.
- Reverted the live resource back to the simpler hex version after board-scale review:
  - `public/svgs/card_rescardback.svg` now mirrors `public/svgs/resource_back.svg` instead of the busier five-hex badge concept,
  - kept `public/svgs/card_devcardback.svg` unchanged,
  - left the hidden-card board sizing untouched because the simpler replacement keeps the same portrait footprint.
- Finalized a small board-scale polish pass on the live dev back:
  - slightly increased the central seal in `public/svgs/card_devcardback.svg`,
  - lengthened and lightened the middle stubs so they remain visible on the orange field,
  - mirrored the same tweak into `public/svgs/devback-seal-flat-rim.svg` so the source concept stays aligned with the live asset.
- Updated the non-production dev-card icon copy to match the newer card-back seal treatment:
  - edited `public/svgs/icon_devcard_.svg` only, leaving `public/svgs/icon_devcard.svg` untouched,
  - swapped the old gray/glossy outer rim for the flatter cream seal used on `public/svgs/card_devcardback.svg`,
  - removed the separate glossy rim stroke so the copy icon reads like the same badge family as the live dev-card back.
- Added a restrained depth pass to the `Year of Plenty` dev-card front in `public/svgs/year_of_plenty.svg`:
  - introduced soft warm drop shadows on the two overlapping resource-card backs,
  - added a much lighter matching shadow to the `+2` text,
  - kept the stronger between-card shadow layer so the cards still separate clearly without making the text feel embossed.
- Tuned the `Year of Plenty` card shadows one more step after review:
  - increased only the two card-back drop shadows,
  - left the `+2` text shadow unchanged,
  - landed on a slightly stronger read that still stays soft and Catana-flat.
- Normalized `public/svgs/year_of_plenty.svg` back onto the standard card canvas:
  - replaced the accidental multi-million-unit root `viewBox`/`width`/`height`,
  - set it to the same `1256 x 1750` card coordinate system used by the other card assets,
  - so it opens and frames correctly in tools like Inkscape without the art disappearing onto a huge page.
- Fixed `public/svgs/year_of_plenty.svg` to be fully self-contained for editor compatibility:
  - removed broken `softShadow` / `hexShadow` filter references from the copied resource-card groups,
  - replaced stale unresolved gradient IDs like `outerCream` / `faceCream` / `topWarm` with local IDs or `none`,
  - so Inkscape no longer drops the card artwork and only shows the clipped shadow layer.
- Replaced `feDropShadow` usage in `public/svgs/year_of_plenty.svg` with explicit blur/composite filter chains:
  - kept the same card/text shadow intent,
  - but switched to a more conservative SVG filter structure that should be more compatible with Inkscape’s renderer.
- Tuned the road piece inside `public/svgs/roadbuilding.svg` to match the Catana road-family shading in a dev-card material palette:
  - kept the same three-stop road gradient structure used by `public/svgs/road_red.svg` and `public/svgs/road_blue.svg`,
  - replaced the dull gray-beige middle band with a warmer sand-gold center,
  - shifted the road outline to a darker gold-brown so it reads like dev-card trim rather than player paint.
- Added a separate warm receiver/player bust asset for Monopoly/front-card concept work:
  - kept the original dark `public/svgs/bust_in_silhouette_color.svg` untouched for “other player” use,
  - created `public/svgs/bust_in_silhouette_warm.svg` from the same geometry,
  - remapped its gradients into a muted honey/peach version of the smiling-face palette so it reads friendlier without turning into a literal emoji face.
- Polished the Monopoly dev-card working composition in `public/svgs/monopoly_working.svg`:
  - replaced the neon-green arrow fill with a cream-to-gold gradient that matches the card border/material system,
  - reduced the visual weight of the top dark-bust row by shrinking and lifting the giver groups,
  - enlarged and raised the warm receiving bust so the destination player reads more clearly in the lower half.
- Ran a follow-up alignment pass on `public/svgs/monopoly_working.svg` after manual drag edits:
  - re-centered the middle card on the main card axis,
  - leveled the left/right cards so they sit at matching heights,
  - and evenly spaced the three arrows on a shared horizontal row with the center arrow aligned to the main centerline.
- Ported the robber placement UX from the separate `codex/robber-placement-ux` worktree back into the live root branch:
  - restored the `playful` robber follower as the default root-branch behavior while preserving the `minimal` path behind `resolveRobberPlacementMotionMode`,
  - merged the board/tile integration, portal preview, magnetic target logic, head-led lean, origin-robber dimming, and board-only landing shadow into the branch that also carries the current graphics work,
  - and verified the focused robber-placement Vitest slice plus targeted ESLint pass in the root repo after the port.
- Fixed the robber placement preview so it scales with live board zoom during placement:
  - threaded the current `TransformWrapper` scale out of `GameScreen.js` and into `Board.js`,
  - passed that live board viewport scale into `RobberPlacementPreview.js` so the overlay preview no longer stays visually fixed while the board zoom changes,
  - and added regression coverage for the scale helper plus the zoom-state wiring in the board/screen source tests.
- Hid explicit bank count badges in the `Year of Plenty` picker by default while keeping the finite-bank selection caps unchanged.
- Added a match-scoped `G.gameSettings.showYearOfPlentyBankCounts` flag in `app/catana/Game.js` so the old visible-count behavior can be re-enabled later as a lobby/game option.
- Replaced the old 8-color player palette contract with the new 20-color contrast-first candidate set in `app/catana/theme/playerColors.js`:
  - canonical lobby/piece IDs are now `red`, `sky`, `green`, `teal`, `orange`, `magenta`, `purple`, `maroon`, `olive`, `brown`, `royal`, `violet`, `lime`, `coral`, `lavender`, `tan`, `black`, `white`, `silver`, and `gold`,
  - legacy reads are normalized through `blue -> sky`, `cyan -> teal`, `pink -> coral`, and `amber -> gold`,
  - seat fallback colors now use the stronger six-color subset `red`, `sky`, `green`, `orange`, `teal`, `magenta`.
- Normalized lobby and endgame color usage so canonical IDs work outside the piece renderer:
  - `LobbyPageClient.js` now normalizes stored/submitted player colors and uses canonical `sky` for the bot seat instead of writing `blue`,
  - `GameOverModal.js` and `PostgameOverlay.js` now resolve canonical IDs like `sky` / `gold` to actual hex swatch colors before applying inline `backgroundColor`.
- Added `scripts/generate-player-piece-palette.mjs` as a rerunnable generator for the Catana player-piece family:
  - it derives road/settlement/city shading from the canonical `PLAYER_COLOR_OPTIONS` hex values,
  - gives `black`, `white`, `silver`, and `gold` stronger board-readable ramps,
  - removes unsupported legacy filenames from `public/svgs/pieces/` and rewrites the directory as the canonical 60-file set.
- Regenerated the full local player-piece inventory under `public/svgs/pieces/`:
  - road, settlement, and city SVGs now exist for all 20 canonical IDs,
  - obsolete `blue`, `cyan`, `pink`, and `amber` piece filenames were removed,
  - inventory/source tests now cover the palette metadata, alias normalization, bot-seat canonical writes, and canonical endgame swatches.
- Verification for the contrast-palette slice:
  - `pnpm exec vitest run app/catana/__tests__/playerColors.test.js app/catana/__tests__/pieceAssets.test.js app/catana/__tests__/playerView.test.js app/catana/__tests__/renderPerfGuards.test.js app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameOverModal.test.js app/catana/__tests__/PostgameOverlay.test.js app/catana/__tests__/LobbyPageClient.playVsBot.test.js`
  - `node scripts/generate-player-piece-palette.mjs`
  - `xmllint --noout public/svgs/pieces/*.svg`
  - `node -e "import('./app/catana/types.js')"`
  - `node -e "import('./app/board-editor/utils/types.js')"` (passes with the pre-existing `MODULE_TYPELESS_PACKAGE_JSON` warning)
- Reordered the lobby username swatches so the classic Catan-like colors lead the picker while preserving the full palette:
  - added `PLAYER_COLOR_PICKER_OPTIONS` in `app/catana/theme/playerColors.js` with `red`, `sky`, `white`, and `orange` first,
  - updated `app/catana/lobby/LobbyPageClient.js` to render the circular chips from that picker-specific order instead of the raw canonical registry order.
- Updated the player action dock build buttons to reflect the player’s effective in-game piece color:
  - `app/catana/components/PlayerActionContainer.js` now derives the road/settlement/city icon assets from `player.color` instead of always using red,
  - that keeps the dock preview aligned with the board pieces and avatar box after duplicate-color resolution.
- Ran a conservative polish pass on the generated `public/svgs/pieces/` palette family after visual review:
  - lifted `black` toward charcoal/slate so it feels less dead-heavy against Catana's light board language,
  - increased separation for `silver` and `white` so the light pieces do not wash out as easily,
  - shifted `olive` cleaner/fresher, `tan` warmer/richer, and `magenta` slightly away from neon toward berry,
  - left the stronger on-theme colors (`red`, `sky`, `green`, `teal`, `orange`, `gold`, `royal`, `violet`, `brown`, `maroon`, etc.) untouched.
- Re-rendered local review sheets for the full generated piece family in `tmp/pieces-palette-review/`:
  - `settlements_sheet.png`
  - `roads_sheet.png`
  - `cities_sheet.png`
  - `all_pieces_sheet.png`
- Verification for the palette-polish pass:
  - `xmllint --noout public/svgs/pieces/*.svg`
  - `rsvg-convert -w 220 -h 220 public/svgs/pieces/*.svg` (batched locally into `tmp/pieces-palette-review/renders/`)
- Aligned the live UI palette source in `app/catana/theme/playerColors.js` with the refined piece families:
  - updated `black`, `silver`, `white`, `olive`, `tan`, and `magenta` swatch/gradient/nameHex values so the username picker and avatar boxes better match the softened Catana piece ramps,
  - kept the stronger existing entries like `red`, `sky`, `green`, `teal`, `orange`, and `gold` unchanged,
  - regenerated `public/svgs/pieces/` from the canonical palette source afterward so future reruns of `scripts/generate-player-piece-palette.mjs` preserve the same direction.
- Created a quick local UI sanity preview at `tmp/palette-ui-preview.html` / `tmp/palette-ui-preview.png` to visually confirm the picker swatches and avatar-style gradients still feel Catana after the palette-source update.
- Verification for the UI/piece palette alignment pass:
  - `pnpm exec vitest run app/catana/__tests__/playerColors.test.js app/catana/__tests__/pieceAssets.test.js app/catana/__tests__/LobbyPageClient.playVsBot.test.js app/catana/__tests__/themeAssets.test.js`
  - `node scripts/generate-player-piece-palette.mjs`
  - `xmllint --noout public/svgs/pieces/*.svg`
- Fixed the idle acknowledge `400 playerID and credentials are required` regression after the earlier port correction:
  - root cause was the custom `server.router.post("/idle/:matchID/ack", ...)` route reading `ctx.request.body` without registering `koaBody()`,
  - that meant the browser POST reached the right API app on `:8080`, but Koa never parsed the JSON payload, so the handler saw an empty body and rejected the request as missing auth fields.
- Added a regression to lock the server route wiring:
  - `server/__tests__/serverRoutes.source.test.js` now checks that `server/server.js` imports `koa-body` and wires `koaBody()` into the idle acknowledge route.
- Verification for the idle acknowledge route-body fix:
  - `pnpm vitest run server/__tests__/serverRoutes.source.test.js server/__tests__/acknowledgeIdle.test.js app/catana/__tests__/GameScreen.idleGrace.test.js server/__tests__/timerPubSub.test.js server/__tests__/IdlePresenceManager.test.js`
## Status (2026-04-03)
- Added desktop-only passive build hover for normal `postRoll` turns:
  - valid road edges, settlement nodes, and city-upgrade settlements now allow hover-to-preview and click-to-build when no explicit dock build mode is armed,
  - the board stays visually quiet by default and only reveals the hovered valid target.
- Tightened passive road hover after visual review:
  - `HoverableEdge` now hides all passive road action circles until the cursor is directly over a valid road edge,
  - hovering one passive road target no longer leaves the other eligible road circles faintly visible.
- Preserved the existing dock-driven build flow:
  - explicit `Road`, `Settlement`, and `City` actions still show their full valid-target affordances and override passive hover mode,
  - passive mode is disabled during placement, non-`postRoll` stages, and road-building dev-card resolution.
- Reused the existing city-upgrade suppression path so passive city hover hides the underlying settlement and avoids double-ghosting during placement animation.
- Verification for passive build hover:
  - `pnpm exec vitest run app/catana/__tests__/passiveBuildMode.test.js app/catana/__tests__/Board.passiveBuildHover.test.js app/catana/__tests__/ActionNode.passiveHover.test.js app/catana/__tests__/Board.buildActionSuppression.test.js app/catana/__tests__/ActionNode.test.js app/catana/__tests__/cancelBuildAction.test.js app/catana/__tests__/GameScreen.cancelBuildAction.test.js`
- Fixed the overlapping disconnect-window bug that let one player's refresh cancel another player's reconnect timer:
  - root cause was `DisconnectPresenceManager` modeling disconnect state with a single match-wide `activeDisconnectPlayerId`, `deadlineAtMs`, and timeout handle,
  - if player B disconnected and then player A briefly refreshed, player A's disconnect overwrote the active seat and cleared the only timer,
  - when player A reconnected, the manager nulled the global active disconnect so player B no longer rendered as disconnected and never hit `resolveDisconnectForfeit`.
- Current fix:
  - `server/presence/DisconnectPresenceManager.js` now tracks timeout state per player and recomputes the legacy active disconnect from all still-live disconnected seats,
  - `app/catana/utils/disconnectPresence.js` now derives visible disconnect badges/countdowns from each disconnected seat's own `reconnectDeadlineAtMs` instead of a single global active seat,
  - `app/catana/GameScreen.js` now keeps the ticker alive whenever any disconnect countdown is visible, not only when one legacy active ID exists.
- Added regressions for the overlap case:
  - `server/__tests__/DisconnectPresenceManager.test.js` covers "player 1 disconnected, player 0 refreshes, player 1 still forfeits on time",
  - `app/catana/__tests__/disconnectPresence.test.js` covers rendering multiple concurrent disconnect countdowns from one snapshot.
- Verification for the overlapping disconnect fix:
  - `pnpm vitest run server/__tests__/DisconnectPresenceManager.test.js server/__tests__/timerPubSub.test.js app/catana/__tests__/disconnectPresence.test.js app/catana/__tests__/GameScreen.idleGrace.test.js app/catana/__tests__/renderPerfGuards.test.js`
- Added postgame social presence log entries so players chatting after game end can see whether the other seat is still around:
  - after `gameover`, disconnect transitions no longer produce reconnect-window semantics,
  - instead the server now emits `server:leave` and `server:return` events for real socket presence changes,
  - the log formatter renders these as concise `left.` / `rejoined.` copy and leaves avatar-box presence unchanged postgame.
- Root cause of the old spammy behavior:
  - `DisconnectPresenceManager` already suppressed postgame reconnect timers, but it still updated `lastConnectedByPlayerId`,
  - that meant a refresh after game end produced `server:reconnect` on the way back without ever logging a matching leave/disconnect event.
- Added regressions for the postgame presence split:
  - `server/__tests__/DisconnectPresenceManager.test.js` covers leave/rejoin transitions after `gameover` with no timer or forfeit,
  - `app/catana/__tests__/gameText.test.js` covers the new `server:leave` and `server:return` log copy.
- Verification for the postgame presence log tweak:
  - `pnpm vitest run server/__tests__/DisconnectPresenceManager.test.js server/__tests__/timerPubSub.test.js app/catana/__tests__/disconnectPresence.test.js app/catana/__tests__/gameText.test.js app/catana/__tests__/renderPerfGuards.test.js`
- Removed the retired classic base tile/resource SVG files from `public/svgs` without leaving broken theme paths behind:
  - `app/catana/theme/themes.js` now redirects classic tile/resource lookups to the emoji asset set for compatibility,
  - `app/catana/types.js` and `app/board-editor/utils/types.js` no longer point at deleted `/svgs/tile_*.svg` or `/svgs/icon_*.svg` files.
- Updated theme regression coverage to match the new asset contract:
  - `app/catana/__tests__/themeAssets.test.js` now checks compatibility redirects and on-disk emoji assets instead of requiring the removed classic fallback SVGs.
- Verification for the asset-retirement compatibility pass:
  - `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/Port.render.test.js app/catana/__tests__/effects/resourceDistribution.test.js`
  - `pnpm verify`
- Fixed the stale explicit-build preview regression introduced by the dock pickup work:
  - moving between nearby legal road edges or settlement nodes could leave the previous ghosted piece visible,
  - root cause was split between overly sticky magnetic target retention in `buildPlacementPreviewMotion` and the old board hover ghosts still rendering during explicit pickup mode.
- Current fix:
  - `app/catana/utils/buildPlacementPreviewMotion.js` now switches immediately to a closer legal target instead of staying locked to the previous one until it fully exits the release radius,
  - `app/catana/ActionNode.js` and `app/catana/Edge.js` now suppress their legacy hover ghosts whenever explicit build-target registration is active, so only the live pickup follower can render.
- Added targeted regression coverage for the stale-preview path:
  - `app/catana/__tests__/utils/buildPlacementPreviewMotion.test.js` covers the closer-target handoff while the old target is still inside release radius,
  - `app/catana/__tests__/BuildPickupHoverGhost.source.test.js` guards that node/edge hover ghosts stay disabled during pickup mode.
- Verification for the stale explicit-build preview fix:
  - `pnpm exec vitest run app/catana/__tests__/playerAction.test.js app/catana/__tests__/GameScreen.cancelBuildAction.test.js app/catana/__tests__/Dock.buildPickupUx.test.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/ActionNode.test.js app/catana/__tests__/Board.robberPlacementUx.test.js app/catana/__tests__/utils/buildPlacementPreviewMotion.test.js app/catana/__tests__/BuildPickupHoverGhost.source.test.js`
  - `pnpm exec eslint app/catana/ActionNode.js app/catana/Edge.js app/catana/utils/buildPlacementPreviewMotion.js app/catana/__tests__/BuildPickupHoverGhost.source.test.js app/catana/__tests__/utils/buildPlacementPreviewMotion.test.js`
- Tightened robber/build preview magnetism to the actual target hit areas:
  - build pickup and robber preview no longer lock when the pointer is merely near a legal target,
  - they now lock only while the pointer is inside the real action-circle / robber target area, then immediately return to free-follow when the pointer leaves it.
- Current fix:
  - `app/catana/utils/buildPlacementPreviewMotion.js` now uses target `width` / `height` when present to derive the snap radius from the real DOM hit area instead of the old loose fallback bubble,
  - `app/catana/utils/robberPlacementPreviewMotion.js` now does the same for real robber targets while preserving the old unsized fallback semantics for helper-only callers,
  - `app/catana/BuildPlacementPreview.js` and `app/catana/RobberPlacementPreview.js` now pass the registered target dimensions into those motion helpers.
- Verification for the tighter hit-area snap:
  - `pnpm exec vitest run app/catana/__tests__/utils/buildPlacementPreviewMotion.test.js app/catana/__tests__/utils/robberPlacementPreviewMotion.test.js`
  - `pnpm exec vitest run app/catana/__tests__/BuildPlacementPreview.springMotion.test.js app/catana/__tests__/RobberPlacementPreview.springMotion.test.js app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/Board.robberPlacementUx.test.js`
  - `pnpm exec eslint app/catana/utils/buildPlacementPreviewMotion.js app/catana/utils/robberPlacementPreviewMotion.js app/catana/BuildPlacementPreview.js app/catana/RobberPlacementPreview.js app/catana/__tests__/utils/buildPlacementPreviewMotion.test.js app/catana/__tests__/utils/robberPlacementPreviewMotion.test.js`
- Reworked explicit build pickup so locked targets reuse the board’s existing local animations instead of showing a second floating preview:
  - off-target, the picked-up road / settlement / city follower remains the only visible object,
  - once the follower settles onto a valid target, visibility hands off to the existing edge/node hover animation after a short delay,
  - leaving the target resumes the same follower from the locked position so the piece still reads as one continuous object.
- Also aligned build follower sizing with real board piece sizing:
  - `BuildPlacementPreview` now derives its road and node piece frames from the same board tile size relationships as `Edge` / `Piece`,
  - the old over-large preview heuristics are gone, so zoomed follower size is now based on board tile size plus `boardViewportScale`.
- Current fix:
  - `app/catana/Board.js` now tracks `buildPickupPresentation` and passes the handoff state into registered road/node targets,
  - `app/catana/BuildPlacementPreview.js` now exposes `onPresentationChange`, delays the locked handoff slightly, and hides its own visible layer while the board-local preview owns the lock,
  - `app/catana/ActionNode.js` and `app/catana/Edge.js` now allow explicit build previews only through that handoff path instead of suppressing them unconditionally.
- Verification for the build-preview handoff:
  - `pnpm exec vitest run app/catana/__tests__/BuildPlacementPreview.springMotion.test.js app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/BuildPickupHoverGhost.source.test.js app/catana/__tests__/utils/buildPlacementPreviewMotion.test.js`
  - `pnpm exec vitest run app/catana/__tests__/playerAction.test.js app/catana/__tests__/GameScreen.cancelBuildAction.test.js app/catana/__tests__/Dock.buildPickupUx.test.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/ActionNode.test.js app/catana/__tests__/BuildPickupHoverGhost.source.test.js app/catana/__tests__/utils/buildPlacementPreviewMotion.test.js`
  - `pnpm exec eslint app/catana/BuildPlacementPreview.js app/catana/ActionNode.js app/catana/Edge.js app/catana/Board.js app/catana/utils/buildPlacementPreviewMotion.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/BuildPickupHoverGhost.source.test.js`
- Fixed the road preview long-arc rotation bug during target handoff:
  - when a vertical in-hand road snapped onto an angled edge, the follower could interpolate raw degrees and rotate the long way around,
  - the preview now computes the shortest signed angle delta before applying its spring step.
- Verification for the shortest-arc road rotation fix:
  - `pnpm exec vitest run app/catana/__tests__/utils/buildPlacementPreviewMotion.test.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js`
  - `pnpm exec vitest run app/catana/__tests__/playerAction.test.js app/catana/__tests__/GameScreen.cancelBuildAction.test.js app/catana/__tests__/Dock.buildPickupUx.test.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/ActionNode.test.js app/catana/__tests__/BuildPickupHoverGhost.source.test.js app/catana/__tests__/utils/buildPlacementPreviewMotion.test.js`
  - `pnpm exec eslint app/catana/utils/buildPlacementPreviewMotion.js app/catana/BuildPlacementPreview.js app/catana/__tests__/utils/buildPlacementPreviewMotion.test.js`
- Fixed the dev-card purchase reveal jitter loop:
  - root cause was `GameScreen` passing a fresh inline `onComplete` callback into `DevCardPurchaseReveal` on every render,
  - the reveal timeline effect depended on that callback identity, so normal `GameScreen` rerenders could kill and restart the GSAP timeline repeatedly while the card was mid-flight.
- Current fix:
  - `app/catana/GameScreen.js` now passes a stable `handleDevCardRevealComplete` callback,
  - `app/catana/DevCardPurchaseReveal.js` now stores `onComplete` in a ref and keys the main GSAP effect only on `reveal`, so parent rerenders no longer restart the animation.
- Verification for the dev-card reveal jitter fix:
  - `pnpm exec eslint app/catana/GameScreen.js app/catana/DevCardPurchaseReveal.js`
- Refined the dev-card purchase reveal pacing and hand ownership:
  - slowed the private reveal into clearer stages: longer dock preload, slower travel to center, a short hold before flip, a longer post-flip hold, and a return-to-hand travel aligned to the resource-card travel timing (`0.6s`, `power2.out`),
  - moved the center reveal slightly higher on screen so it reads as a lift out of the dock instead of a short hop,
  - the newly bought dev card is now hidden from the local `DevCardDisplay` while the reveal is pending or active, so it does not appear in the hand before the card physically lands there.
- Current fix:
  - `app/catana/utils/devCardPurchaseReveal.js` now owns the staged reveal timings plus helper logic for temporarily hiding the bought dev card from the visible hand,
  - `app/catana/DevCardPurchaseReveal.js` now uses those staged timings and adds a center hold before the flip plus a longer face hold before the return flight,
  - `app/catana/GameScreen.js` now computes a hidden purchased card type from pending/active local reveal state and removes exactly one matching card from the displayed hand until the reveal completes,
  - `app/catana/components/PlayerActionContainer.js` gives `buy dev` a longer dock preload delay than the build-piece buttons.
- Verification for the dev-card reveal pacing/hand-ownership refinement:
  - `pnpm exec vitest run app/catana/__tests__/utils/devCardPurchaseReveal.test.js`
  - `pnpm exec eslint app/catana/GameScreen.js app/catana/DevCardPurchaseReveal.js app/catana/components/PlayerActionContainer.js app/catana/utils/devCardPurchaseReveal.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js`
- Fixed the first-dev-card reveal drop and made the sequence read as distinct GSAP stages:
  - root cause of the occasional first-click no-show was `DevCardDisplay` unmounting entirely when the bought card was temporarily hidden from the visible hand, leaving no destination rect for the reveal to fly into,
  - `DevCardDisplay` can now stay mounted as an empty destination shell during the private reveal, so first-buy has a stable landing target,
  - removed the old `devcard-pop` hand entry animation from `DevCardDisplay`; the private purchase reveal now owns the motion instead of fighting a second local pop in the hand,
  - re-staged `DevCardPurchaseReveal` into clearer beats with pauses between travel, back reveal, flip, and return-to-hand.
- Current fix:
  - `app/catana/components/DevCardDisplay.js` now accepts `forceMount` and keeps a real shell mounted even when `cards` is temporarily empty,
  - `app/catana/components/DevCardDisplay.css` no longer defines the legacy `devcard-pop` keyframes,
  - `app/catana/components/PlayerActionContainer.js` and `app/catana/GameScreen.js` now keep that shell mounted only while a bought card is hidden during the active local reveal,
  - `app/catana/utils/devCardPurchaseReveal.js` now exposes the more explicitly staged timing profile,
  - `app/catana/DevCardPurchaseReveal.js` now runs those stages sequentially instead of overlapping them into one rushed motion.
- Verification for the first-buy shell + staged-timeline refinement:
  - `pnpm exec vitest run app/catana/__tests__/PlayerActionBadges.test.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js`
  - `pnpm exec eslint app/catana/GameScreen.js app/catana/DevCardPurchaseReveal.js app/catana/components/PlayerActionContainer.js app/catana/components/DevCardDisplay.js app/catana/utils/devCardPurchaseReveal.js app/catana/__tests__/PlayerActionBadges.test.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js`
- Refined the dev-card launch feel so the dock squash actually reads:
  - `DevCardPurchaseReveal` now keeps the detached actor hidden until the dock preload finishes, instead of drawing it immediately at the dock origin and visually masking the squash,
  - on release, the actor now does a short upward release-pop before the slower center flight, so the opening motion reads as `squish -> pop out -> travel` instead of `appear and drift`,
  - slowed the full reveal profile again: longer center travel, longer pauses, slower back reveal, slower flip, longer face hold, and a slower return-to-hand.
- Current fix:
  - `app/catana/DevCardPurchaseReveal.js` now starts with `autoAlpha: 0`, reveals the actor only after the launch delay, and adds a short release-pop stage before the center travel,
  - `app/catana/utils/devCardPurchaseReveal.js` now exposes the slower timing profile including the new `releasePop` segment,
  - `app/catana/components/PlayerActionContainer.js` now holds the dock preload for longer (`320ms`) before the detached actor appears.
- Verification for the dev-card launch gating + slower timing refinement:
  - `pnpm exec vitest run app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js`
  - `pnpm exec eslint app/catana/DevCardPurchaseReveal.js app/catana/components/PlayerActionContainer.js app/catana/utils/devCardPurchaseReveal.js app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js`
- Fixed the dev-card face reveal and retuned the post-flip pacing:
  - the reveal no longer relies on the card container’s `rotationY` alone to expose the bought card face,
  - `DevCardPurchaseReveal` now animates explicit back/front face layers so the actual dev-card art comes in reliably after the turn,
  - the revealed face now hangs for `0.5s`,
  - the return-to-hand travel is back to `0.6s power2.out`, matching the resource-card travel speed/curve.
- Current fix:
  - `app/catana/DevCardPurchaseReveal.js` now owns separate `backFaceRef` / `frontFaceRef` layers and animates them in sequence during the flip,
  - `app/catana/utils/devCardPurchaseReveal.js` now sets the normal-motion face hold to `0.5s` and the return-to-hand leg to `0.6s`.
- Verification for the dev-card face-reveal + return-speed tweak:
  - `pnpm exec vitest run app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js`
  - `pnpm exec eslint app/catana/DevCardPurchaseReveal.js app/catana/utils/devCardPurchaseReveal.js app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js`
- Fixed the two remaining dev-card reveal ownership bugs:
  - the visible dev-card hand no longer tries to “hide one matching type” from the live hand during the reveal,
  - instead, `GameScreen` now keeps rendering the exact pre-purchase hand snapshot until the reveal completes, which avoids premature reappearance and removes the ambiguity when the bought card matches an existing dev-card type,
  - the flip now swaps back/front content at the midpoint of the rotating card container, which is more reliable than the previous per-face rotation attempt and should ensure the bought card art actually appears after the turn.
- Current fix:
  - `app/catana/utils/devCardPurchaseReveal.js` now exposes `getVisibleDevCardsDuringReveal(...)` and no longer relies on card-type subtraction for hand visibility,
  - `app/catana/GameScreen.js` now stores `beforeCards` on the active reveal and keeps the displayed dev-card hand pinned to that pre-purchase snapshot while the reveal is pending/active,
  - `app/catana/DevCardPurchaseReveal.js` now rotates `flipNode` to 90 degrees, swaps the back/front visibility, then rotates back in with the front face visible.
- Verification for the dev-card snapshot-hand + midpoint-swap fix:
  - `pnpm exec vitest run app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js`
  - `pnpm exec eslint app/catana/GameScreen.js app/catana/DevCardPurchaseReveal.js app/catana/utils/devCardPurchaseReveal.js app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js`
- Fixed the last dev-card flip seam where the card could still appear to turn into another back instead of the bought card art.
- Current fix:
  - `app/catana/DevCardPurchaseReveal.js` no longer depends on separate back/front face layers during the turn,
  - the reveal now keeps a single visible card image and swaps its `src` from the dev-card back to the bought card asset exactly at the flip midpoint before rotating back in.
- Verification for the single-face midpoint swap:
  - `pnpm exec vitest run app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js`
  - `pnpm exec eslint app/catana/DevCardPurchaseReveal.js app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js`
- Reworked the dev-card turn itself to use the standard 3D two-face flip pattern instead of midpoint art-swapping.
- Current fix:
  - `app/catana/DevCardPurchaseReveal.js` now mounts both the card back and the bought-card face for the entire reveal,
  - the reveal uses a dedicated `card3dRef` with `preserve-3d`,
  - the bought-card face is pre-rotated `-180deg`,
  - the flip now rotates that 3D card from `0 -> 180`, which matches the canonical GSAP/CSS card-flip structure more closely than the previous midpoint-swap hack.
- Verification for the canonical 3D flip rewrite:
  - `pnpm exec vitest run app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js`
  - `pnpm exec eslint app/catana/DevCardPurchaseReveal.js app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js`
- Reverted the heavier 3D flip rewrite and restored the previous midpoint-swap flip look for the dev-card reveal.
- Current fix:
  - `app/catana/DevCardPurchaseReveal.js` is back on the earlier single-card flip presentation,
  - but the revealed card art is now owned by React state via `displayedCardSrc` instead of an imperative `setAttribute("src", ...)`,
  - this prevents normal rerenders during the reveal from snapping the image back to `card_devcardback.svg` mid-animation.
- Verification for the restored midpoint flip + state-owned face art:
  - `pnpm exec vitest run app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js`
  - `pnpm exec eslint app/catana/DevCardPurchaseReveal.js app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js`
- Found the deeper root cause behind the “reveal still shows the dev-card back” reports on the saved buy-dev repro:
  - the local scenario file `app/catana/scenarios/buy_dev_new22.json` had a masked `core.devDeck` full of `"hidden"` placeholders,
  - buying a dev card from that scenario literally gives the player `"hidden"`, so the reveal can only fall back to the back art.
- Current fix:
  - `app/catana/Moves.js` now marks `DEBUG_captureScenarioState` and `DEBUG_clearCapturedScenarioState` as `client: false` so scenario snapshots are captured server-side instead of from optimistic player-view state,
  - `app/catana/__tests__/Moves.debugScenario.test.js` now locks that server-only behavior.
- Verification for the scenario-capture authority fix:
  - `pnpm exec vitest run app/catana/__tests__/Moves.debugScenario.test.js app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js`
  - `pnpm exec eslint app/catana/Moves.js app/catana/DevCardPurchaseReveal.js app/catana/__tests__/Moves.debugScenario.test.js app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js`
- Replaced the dev-card hand-diff startup with an authoritative effect-driven buyer-only reveal flow and froze the local VP badge alongside the dock until the card lands.
- Current fix:
  - `game-core/src/rules/devCards.ts` now returns the bought `cardType` from `buyDevCard(...)`, and `app/catana/Moves.js` emits `effects.buyDevCardReveal({ playerId, cardType })` from that authoritative result.
  - `app/catana/Game.js`, `app/catana/effects/GameEffects.js`, and `app/catana/effects/registry.js` now carry `buyDevCardReveal` through the Catana effect bus as `devcard:reveal`.
  - `app/catana/GameScreen.js` now starts the reveal from the effect payload, keeps the local hand frozen on `beforeCards`, and threads a frozen `vpSnapshot` to the local dock/avatar until the reveal completes.
  - `app/catana/components/PlayerActionContainer.js` captures the pre-buy hand and VP snapshot before calling `moves.buyDevCard()`, and `app/catana/components/PlayerAvatarStats.js` can render from that frozen VP override.
  - `app/catana/utils/devCardPurchaseReveal.js` no longer exposes the old bought-card diff helpers.
- Verification for the authoritative buyer-only reveal + frozen VP release:
  - `pnpm exec vitest run app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/Moves.gameLog.test.js app/catana/__tests__/effects/GameEffects.test.js app/catana/__tests__/effects/registry.test.js app/catana/__tests__/GameScreen.devCardReveal.test.js app/catana/__tests__/PlayerActionContainer.devCardReveal.test.js app/catana/__tests__/playerAvatarStats.test.js app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js`
  - `pnpm verify` (passes; lint still reports the repo’s existing Next.js `<img>` / hook warnings, including the longstanding warning in `app/catana/components/PlayerActionContainer.js`)
- Fixed the remaining secret-state bug where `buyDevCardReveal` could still carry `"hidden"` from optimistic client state instead of the real dev-card type.
- Current fix:
  - `app/catana/Moves.js` now marks `buyDevCard` as `client: false`, so the draw and reveal effect run only on authoritative server state rather than against masked `playerView` state.
  - `app/catana/__tests__/Moves.devCards.test.js` now locks that server-only move contract.
- Verification for the server-only buy-dev draw:
  - `pnpm exec vitest run app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/Moves.gameLog.test.js`
  - `pnpm verify` (passes; lint warnings remain the repo’s existing Next.js `<img>` / hook warnings)
- Added a dedicated dev-card reveal harness to the effects lab so launch timing can be tuned without recreating a live match.
- Current fix:
  - `app/catana/dev/effects/DevCardRevealLab.jsx` now mounts the real `DockCard`, `DevCardPurchaseReveal`, and `DevCardDisplay` shell in a deterministic preview scene.
  - `app/catana/dev/effects/registry.js` now exposes that preview as `Dev Card Reveal` in `/catana/dev/effects`.
  - `app/catana/components/ActionsDock/DockCard.js` now uses a slower, springier dev-card prelaunch anticipation/rebound.
  - `app/catana/DevCardPurchaseReveal.js` now begins the detached actor earlier and overlaps center travel slightly more aggressively.
  - `app/catana/utils/devCardPurchaseReveal.js` now shortens the parked holds around center arrival and back reveal so the emblem-to-card transition reads less like a stop-start.
- Verification for the dev-card lab + motion timing pass:
  - `pnpm exec vitest run app/catana/__tests__/Dock.buildPickupUx.test.js app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/effects/effectsLabRegistry.test.js app/catana/__tests__/effects/DevCardRevealLab.source.test.js`
  - `pnpm exec eslint app/catana/components/ActionsDock/DockCard.js app/catana/DevCardPurchaseReveal.js app/catana/utils/devCardPurchaseReveal.js app/catana/dev/effects/DevCardRevealLab.jsx app/catana/dev/effects/registry.js app/catana/__tests__/Dock.buildPickupUx.test.js app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/effects/effectsLabRegistry.test.js app/catana/__tests__/effects/DevCardRevealLab.source.test.js`
- Follow-up polish for the detached dev-card actor spawn:
  - `app/catana/DevCardPurchaseReveal.js` now spawns the detached actor substantially smaller (`0.46` instead of `0.84`) and lets it grow to `0.92` during `releasePop` before the existing center travel reaches full size.
  - This keeps the first visible emblem much closer to the dock emblem scale while preserving the current timing and motion structure.
- Verification for the detached-actor spawn-scale tweak:
  - `pnpm exec vitest run app/catana/__tests__/DevCardPurchaseReveal.source.test.js`
  - `pnpm exec eslint app/catana/DevCardPurchaseReveal.js app/catana/__tests__/DevCardPurchaseReveal.source.test.js`
- Implemented the status/log presentation rollout from the April 7 design + plan in the `codex/status-log-presentation` worktree.
- Current status-box / thought-bubble contract:
  - `app/catana/utils/gameStatus.js` now returns a viewer-aware status object with stable `text` plus richer `kind` and `title` fields.
  - the local status box now renders `gameStatus.title`, while the thought bubble still only follows `statusType`.
  - copy is now viewer-personalized for roll, turn ownership, discard, robber-move, robber-steal, and placement prompts, including plural discard copy when multiple players are discarding.
  - `shouldShowGameStatusTimer(...)` now hides semantically stale timer snapshots so the box no longer shows an old pre-roll timer beside the wrong prompt.
- Current public log contract:
  - `game-core/src/rules/devCards.ts::applyMonopoly(...)` now returns `{ ok: true, resource, amountStolen }`.
  - `game-core/src/rules/turnFlow.ts::applyResourceDistribution(...)` / `applyRollDice(...)` now return `shortages` metadata describing both full-denial and lone-claimant partial-allocation bank shortages.
  - `app/catana/Moves.js` now appends:
    - `dev:monopolyResult`
    - `resource:shortage`
    - richer `robber:move` payloads with `tileResource` + `tileNumber`
  - `app/catana/utils/gameText.js` now formats:
    - monopoly claimed totals,
    - robber destinations,
    - public steal copy as `stole a card`,
    - bank-shortage explanations.
- Current local log-reveal contract:
  - canonical `G.gameLog` entries are still appended immediately and in authoritative order.
  - `app/catana/utils/gameLogPresentation.js` classifies locally delayable entries (`resource:gain`, `resource:shortage`) for the local client only.
  - `GameScreen` now keeps local `presentedGameLogEntries`, `deferredLogEntries`, and `lastSeenGameLogId`, and flushes deferred entries when the local resource-distribution effect reports completion.
  - reconnect rule:
    - the status box recomputes directly from authoritative state,
    - any locally deferred log entries are flushed/cleared,
    - the next backlog batch bypasses local delay so no entries stay stuck behind dead animation gates.
- Verification for the status/log rollout:
  - focused app batch:
    - `pnpm exec vitest run app/catana/__tests__/gameStatus.test.js app/catana/__tests__/PlayerActionContainer.status.test.js app/catana/__tests__/GameScreen.statusPresentation.test.js app/catana/__tests__/Moves.gameLog.test.js app/catana/__tests__/gameText.test.js app/catana/__tests__/gameLogPresentation.test.js app/catana/__tests__/effects/resourceDistribution.test.js app/catana/__tests__/GameScreen.logPresentation.test.js`
  - focused core batch:
    - `pnpm -C game-core test -- --run src/rules/devCards.test.ts src/rules/turnFlow.test.ts`
    - `pnpm -C game-core build`
  - broader smoke batch:
    - `pnpm exec vitest run app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/Moves.robber.test.js app/catana/__tests__/disconnectPresence.test.js app/catana/__tests__/GameLogPanel.test.js`
  - targeted lint:
    - `pnpm exec eslint app/catana/GameScreen.js app/catana/components/PlayerActionContainer.js app/catana/utils/gameStatus.js app/catana/utils/gameText.js app/catana/utils/gameLogPresentation.js app/catana/effects/resourceDistribution.js app/catana/__tests__/gameStatus.test.js app/catana/__tests__/PlayerActionContainer.status.test.js app/catana/__tests__/GameScreen.statusPresentation.test.js app/catana/__tests__/Moves.gameLog.test.js app/catana/__tests__/gameText.test.js app/catana/__tests__/gameLogPresentation.test.js app/catana/__tests__/effects/resourceDistribution.test.js app/catana/__tests__/GameScreen.logPresentation.test.js`
    - `pnpm exec eslint game-core/src/rules/devCards.ts game-core/src/rules/turnFlow.ts game-core/src/rules/devCards.test.ts game-core/src/rules/turnFlow.test.ts`
  - remaining lint note:
    - the longstanding Next.js `@next/next/no-img-element` warning in `app/catana/components/PlayerActionContainer.js` is still present and was not introduced by this rollout.
- Added approved design + execution docs for MVP accounts/profiles/replay:
  - spec: `docs/superpowers/specs/2026-04-07-accounts-profiles-and-replay-design.md`
  - plan: `docs/superpowers/plans/2026-04-07-accounts-profiles-and-replay-plan.md`
  - current implementation direction:
    - guest-first real accounts with server-backed session cookies,
    - app-owned match bootstrap APIs instead of raw public bgio lobby mutations,
    - in-memory live bgio matches with transactional finished-match archival to Postgres,
    - local dev using local Postgres plus direct local game transport,
    - prod using one OCI VM with Caddy fronting web + game services on one host,
    - GitHub Actions as the default push-to-prod path: verify -> build `linux/amd64` images -> push to GHCR -> SSH deploy to OCI.
- Implemented the first OCI deployment scaffolding slice in the `codex/accounts-infra` worktree.
- Current deployment scaffolding status:
  - repo now includes `Dockerfile.web`, `Dockerfile.game`, local/prod Compose files, `infra/Caddyfile`, `infra/scripts/deploy-prod.sh`, and `.github/workflows/deploy-prod.yml`.
  - deployment source-contract coverage lives in `server/__tests__/deploymentFiles.source.test.js`.
  - the deploy target is `linux/amd64`, because the real Oracle VM was verified as `x86_64 Ubuntu 24.04`, not ARM.
  - `infra/scripts/deploy-prod.sh` now skips `pnpm db:migrate` until that script exists, so the current infra rollout remains compatible with the pre-database app.
- OCI bootstrap status:
  - installed Docker `28.2.2` and Docker Compose `2.37.1` on `145.241.244.120`.
  - prepared `/srv/settlex`.
  - wrote `/srv/settlex/.env.prod` with generated app/db secrets and `600` permissions.
  - synced the current deployment scaffold onto the VM so GitHub Actions can target the expected directory layout.
- Unblocked the failing `Dockerfile.web` GitHub Actions build in the `codex/fix-web-build-resources` worktree.
- Build-fix changes:
  - removed the tracked root-level `resources` symlink that caused `next build` / Docker web builds to fail with `ENOENT` in CI.
  - patched the vendored `react-zoom-pan-pinch` hooks to use explicit function guards for cleanup callbacks so Next type-checking no longer fails on `void | (() => void)` optional calls.
  - excluded `react-zoom-pan-pinch/stories` from app TypeScript checking and fixed `react-zoom-pan-pinch/utils/styles.utils.ts` to import `../models` instead of the unresolved bare `models` path.
  - added source regression coverage in `server/__tests__/buildInputs.source.test.js` for the broken-symlink case and the vendored zoom-pan-pinch build-input expectations.
- Verification for the build-fix slice:
  - `pnpm exec vitest run server/__tests__/buildInputs.source.test.js server/__tests__/deploymentFiles.source.test.js`
  - `pnpm build`
  - `pnpm verify`
- Unblocked production Catana matchmaking after the site came up on OCI:
  - root cause was browser-side Catana code still constructing direct `:8080` lobby URLs and `:8000` Socket.IO URLs, which times out in prod because only ports `80/443` are public behind Caddy.
  - added `app/catana/utils/serverOrigins.js` so production uses same-origin by default while local development still keeps split `8000/8080` ports unless `NEXT_PUBLIC_GAME_SERVER_ORIGIN` is set.
  - rewired `app/catana/page.js`, `app/catana/lobby/LobbyPageClient.js`, `app/catana/lobby/[matchID]/MatchPageClient.js`, `app/catana/GameScreen.js`, and `app/catana/utils/reconnectBanner.js` to use the shared helper instead of hardcoded port math.
  - added source/behavior coverage in `app/catana/__tests__/serverOrigins.test.js`, `app/catana/__tests__/serverOriginsWiring.source.test.js`, and updated `app/catana/__tests__/GameScreen.idleGrace.test.js`.
- Verification for the prod-origin slice:
  - `pnpm exec vitest run app/catana/__tests__/serverOrigins.test.js app/catana/__tests__/serverOriginsWiring.source.test.js app/catana/__tests__/GameScreen.idleGrace.test.js app/catana/__tests__/reconnectBanner.test.js`
  - `pnpm build`
- Added the first accounts/database foundation slice.
- DB foundation changes:
  - added `pg` and a new local migration workflow via `pnpm db:migrate` and `pnpm db:migrate:test`.
  - created `lib/server/db/getPool.js` and `lib/server/db/runMigrations.js` for a shared Postgres pool and ordered SQL migration execution.
  - added `lib/server/db/sql/0001_accounts_archive.sql` and `lib/server/db/sql/0002_magic_links.sql` with the initial account/archive/magic-link schema.
  - added `scripts/db/migrate.mjs` and `.env.example` so local and future prod DB setup has a documented entry point.
  - updated `infra/docker-compose.local.yml` to publish Postgres on `55432` instead of `5432`, because this machine already had another Postgres listener on `localhost:5432` and that made the default local workflow ambiguous.
- Verification for the DB foundation slice:
  - `pnpm exec vitest run lib/server/__tests__/dbMigrations.test.js`
  - `docker compose -f infra/docker-compose.local.yml up -d postgres`
  - `pnpm db:migrate`
  - verified tables inside local Postgres: `accounts`, `account_emails`, `auth_identities`, `guest_sessions`, `username_history`, `archived_matches`, `archived_match_players`, `archived_match_replays`, `magic_link_tokens`, `settlex_migrations`
  - `pnpm verify`
- Added the guest-account and server-backed session foundation slice.
- Guest account/session changes:
  - created `lib/server/accounts/normalizeUsername.js` with trim + whitespace collapse, `[bot]` rejection, and a hard `28`-character cap aligned with the current lobby/match identity UI.
  - created `lib/server/accounts/createGuestAccount.js`, `getSessionAccount.js`, and `updateGuestIdentity.js` for transactional guest creation, opaque session lookup, and guest identity refresh against the new Postgres schema.
  - created `lib/server/session/cookieNames.js` and `writeSessionCookie.js` so the app now has a single `settlex_session` cookie contract instead of browser-local identity being the only source of truth.
  - added thin Next route factories in `app/api/account/guest/route.js` and `app/api/account/me/route.js`; the factories accept an injected pool in tests, while production can resolve the shared pool lazily.
  - added a fake in-memory account pool harness in `lib/server/__tests__/helpers/fakeAccountsPool.js` to keep the new service and route tests focused on account/session behavior without requiring a real Postgres instance.
- Verification for the guest account/session slice:
  - `pnpm exec vitest run lib/server/__tests__/guestAccounts.test.js`
  - `pnpm exec vitest run app/__tests__/api/accountGuestRoute.test.js`
  - `pnpm exec vitest run lib/server/__tests__/guestAccounts.test.js app/__tests__/api/accountGuestRoute.test.js`
  - `pnpm verify`
- Added the app-owned match bootstrap/API slice.
- Match bootstrap/API changes:
  - created `lib/server/matches/createMatchForAccount.js`, `joinMatchForAccount.js`, and `leaveMatchForAccount.js` as thin wrappers over the internal bgio lobby HTTP API exposed at `GAME_SERVER_INTERNAL_URL`.
  - the join wrapper now writes richer participant snapshots into bgio seat metadata:
    - humans: `participantType`, `accountId`, `usernameSnapshot`, `avatarSnapshot`
    - bots: `participantType`, `botKey`, `usernameSnapshot`, `avatarSnapshot`
    - compatibility fields such as `emoji`, `color`, `bot`, and `isBot` still ship for the current UI/bot manager expectations.
  - created `app/api/matches/create/route.js`, `join/route.js`, `leave/route.js`, and `[matchID]/route.js` so browser mutation flows now cross a Settlex-owned API boundary instead of calling bgio lobby mutation routes directly.
  - rewired `app/catana/lobby/LobbyPageClient.js` so:
    - it restores or silently creates a guest account from stored local identity through `/api/account/me` and `/api/account/guest`
    - create/join/leave bot/human mutations go through `/api/matches/*`
    - direct bgio reads remain only for the public match list while mutation traffic is app-owned
  - rewired `app/catana/lobby/[matchID]/MatchPageClient.js` so match metadata reads use `/api/matches/[matchID]`, seat joins use `/api/matches/join`, and the live board still points at `getGameServerOrigin()` for realtime play.
  - updated the existing Catana source-contract tests to reflect the new app-route payload shape and the reduced need for the lobby-origin helper on the match page.
- Verification for the match bootstrap/API slice:
  - `pnpm exec vitest run lib/server/__tests__/matchBootstrap.test.js`
  - `pnpm exec vitest run app/__tests__/api/matchRoutes.test.js`
  - `pnpm exec vitest run lib/server/__tests__/matchBootstrap.test.js app/__tests__/api/matchRoutes.test.js app/catana/__tests__/LobbyPageClient.identity.test.js app/catana/__tests__/LobbyPageClient.matchmakingFeedback.test.js app/catana/__tests__/LobbyPageClient.playVsBot.test.js app/catana/__tests__/MatchPageClient.botFill.test.js`
  - `pnpm verify`
- Added the finished-match archive slice.
- Archive slice changes:
  - created `server/archive/archiveFinishedMatch.js` as the transactional archive writer from live bgio state into Postgres-owned `archived_matches`, `archived_match_players`, and `archived_match_replays`.
  - created `server/archive/cleanupArchivedMatch.js` so archived finished matches can be wiped from the live bgio store after a short grace period instead of accumulating in memory forever.
  - created `server/archive/ArchiveManager.js` to de-duplicate archive attempts per `matchID`, remember the latest `matchData`, and schedule cleanup only after a successful archive handoff.
  - updated `server/timers/timerPubSub.js` to forward both final `state` and `matchData` payloads into the archive manager, keeping the finished-match hook inside the same event stream the timer/presence logic already listens to.
  - updated `server/server.js` to instantiate the archive manager with the live bgio DB plus the shared Postgres pool, so game completion now archives durably before the in-memory match record is cleaned up.
  - added `server/__tests__/ArchiveManager.test.js` and extended `server/__tests__/timerPubSub.test.js` to lock the archive-once, cleanup-after-success, and pubsub-forwarding behavior in place.
- Verification for the archive slice:
  - `pnpm exec vitest run server/__tests__/ArchiveManager.test.js`
  - `pnpm exec vitest run server/__tests__/timerPubSub.test.js`
  - `pnpm exec vitest run server/__tests__/ArchiveManager.test.js server/__tests__/timerPubSub.test.js`
  - `pnpm verify`
- Added the public profile slice.
- Public profile changes:
  - created `lib/server/profiles/getPublicProfile.js` to resolve a current account by username, aggregate archived wins/losses/game counts, and return recent archived matches with replay ids.
  - created `lib/server/__tests__/publicProfile.test.js` to lock the query contract against the current accounts/archive schema.
  - created `app/u/[username]/page.js` as the first public profile route, rendering joined date, summary stats, and replay links from the server-side profile query.
  - created `app/__tests__/profilePage.test.js` to assert the page loads its data through `getPublicProfile` and keeps replay links on `/replays/:id`.
- Verification for the public profile slice:
  - `pnpm exec vitest run lib/server/__tests__/publicProfile.test.js`
  - `pnpm exec vitest run app/__tests__/profilePage.test.js`
  - `pnpm exec vitest run lib/server/__tests__/publicProfile.test.js app/__tests__/profilePage.test.js`
  - `pnpm verify`
- Added the archived replay slice.
- Archived replay changes:
  - created `lib/server/replays/getArchivedReplay.js` to load archived match metadata, participant snapshots, and replay payload by public replay id.
  - created `lib/server/replays/buildReplayFrames.js` to rebuild sequential replay frames from archived `initialState` plus the stored bgio action log.
  - created `app/replays/[replayId]/page.js`, `ReplayPageClient.js`, and `app/replays/components/ReplayControls.js` so archived replays now have a real public page with prev/next/scrubber controls.
  - updated `app/catana/GameScreen.js` so replay rendering skips live-only behavior like timer seeding, auto-ready, resign, and live effects.
  - updated `app/catana/__tests__/GameScreen.gameOver.test.js` and added `lib/server/__tests__/replayFrames.test.js` plus `app/__tests__/replayPage.test.js` to lock the replay contract in place.
- Verification for the archived replay slice:
  - `pnpm exec vitest run lib/server/__tests__/replayFrames.test.js`
  - `pnpm exec vitest run app/__tests__/replayPage.test.js`
  - `pnpm exec vitest run app/catana/__tests__/GameScreen.gameOver.test.js`
  - `pnpm exec vitest run lib/server/__tests__/replayFrames.test.js app/__tests__/replayPage.test.js app/catana/__tests__/GameScreen.gameOver.test.js`
  - `pnpm verify`
- Added the account-claim magic-link slice.
- Claim flow changes:
  - created `lib/server/accounts/requestMagicLink.js` and `consumeMagicLink.js` for one-time token issuance, token verification, account upgrade, verified email persistence, and `magic_link` identity attachment.
  - created `lib/server/email/createEmailTransport.js` with a dev-friendly preview transport that logs and returns the magic-link URL instead of requiring a provider during local work.
  - created `app/api/account/claim/request/route.js` and `consume/route.js` so the browser can request a link while the clicked email URL upgrades the same account via a redirect-based consume flow.
  - created `app/account/page.js` as the minimal current-account UI for entering an email and opening the local/dev preview link.
  - updated `app/catana/lobby/LobbyPageClient.js` and `app/catana/lobby/[matchID]/MatchPageClient.js` to surface an `Account` entry point from the existing Catana flows.
  - extended `lib/server/__tests__/helpers/fakeAccountsPool.js` and added `lib/server/__tests__/magicLinks.test.js` plus `app/__tests__/api/accountClaimRoute.test.js` to keep the claim flow covered without requiring a real database or SMTP provider.
- Verification for the claim flow slice:
  - `pnpm exec vitest run lib/server/__tests__/magicLinks.test.js`
  - `pnpm exec vitest run app/__tests__/api/accountClaimRoute.test.js`
  - `pnpm exec vitest run lib/server/__tests__/magicLinks.test.js app/__tests__/api/accountClaimRoute.test.js`
  - `pnpm verify`
- Added the OCI ARM cutover and production-build hardening slice.
- OCI ARM cutover changes:
  - updated `.github/workflows/deploy-prod.yml` to publish multi-arch `linux/amd64,linux/arm64` images so the new ARM OCI VM can be the primary host without losing x86 rollback flexibility.
  - updated `docs/deploy/oci-mvp.md` and added `docs/superpowers/plans/2026-04-08-oci-arm-cutover-plan.md` to record the fresh-DB ARM migration shape and the one-host bootstrap steps.
  - extracted test-only route factories out of `app/api/**/route.js` files into adjacent `handler.js` modules, then marked all app API route wrappers as `dynamic = "force-dynamic"` so `next build` stops pre-executing runtime-only handlers.
  - extracted the public profile and replay page factories into adjacent `page-content.js` modules so `page.js` only exposes valid Next page exports during production builds.
  - updated `Dockerfile.web` so the runtime image includes `scripts/db` plus `lib/server/db`, allowing `pnpm db:migrate` to run inside the deployed web container as intended by `infra/scripts/deploy-prod.sh`.
  - manually bootstrapped the new OCI ARM VM at `145.241.254.241` with Docker, Compose, `rsync`, `/srv/settlex`, a fresh `.env.prod`, fresh Postgres volume, and a working compose stack (`web`, `game`, `proxy`, `postgres`).
  - browser-smoked the new host on `http://145.241.254.241` by creating two isolated players, matching them into the same live game, and confirming both landed on `/catana/lobby/<match>?playerID=...`.
- Verification for the OCI ARM cutover slice:
  - `pnpm exec vitest run server/__tests__/deploymentFiles.source.test.js`
  - `pnpm exec vitest run app/__tests__/api/routeModuleExports.source.test.js app/__tests__/profilePage.test.js app/__tests__/replayPage.test.js app/__tests__/api/accountClaimRoute.test.js app/__tests__/api/accountGuestRoute.test.js app/__tests__/api/matchRoutes.test.js`
  - `pnpm build`
  - `curl -I http://145.241.254.241`
  - `curl http://145.241.254.241/games/catan`
- Finalized the OCI workflow to ARM-only image builds now that the old x86 rollback box is being retired.
- Verification for the ARM-only follow-up:
  - `pnpm exec vitest run server/__tests__/deploymentFiles.source.test.js`
- Switched production over to the `settlehex.com` domain and tightened the public branding surface.
- Domain/branding cutover changes:
  - updated the Oracle VM prod env from the raw IP bootstrap values to `SITE_HOST=settlehex.com`, `PUBLIC_APP_URL=https://settlehex.com`, and `NEXT_PUBLIC_GAME_SERVER_ORIGIN=https://settlehex.com`, then redeployed the stack so Caddy could obtain and serve the live TLS certificate.
  - changed the visible shell copy from `Catana` / `Settlex account` to `Settlehex` / `Settlehex account` in the app metadata, lobby hero, match room header, and account page.
  - removed the visible `/catana` match-room link, changed the in-game postgame lobby button to return to `/`, and converted `app/catana/page.js` into a server redirect back to the root lobby instead of exposing a second public entry route.
  - added `app/__tests__/publicBranding.source.test.js` and updated `app/catana/__tests__/serverOriginsWiring.source.test.js` to lock the public branding and legacy-route behavior.
- Verification for the domain/branding cutover:
  - `pnpm exec vitest run app/__tests__/publicBranding.source.test.js app/catana/__tests__/serverOriginsWiring.source.test.js`
  - `dig @1.1.1.1 settlehex.com +short`
  - `curl -I --resolve settlehex.com:80:145.241.254.241 http://settlehex.com`
  - `curl -I --resolve settlehex.com:443:145.241.254.241 https://settlehex.com`
- Renamed the runtime database/session infrastructure from `settlex` to `settlehex`.
- Runtime infra rename changes:
  - updated local and test Postgres defaults in `package.json`, `.env.example`, and `lib/server/db/getPool.js` to use `postgres://settlehex:settlehex@localhost:55432/settlehex`.
  - renamed the migration bookkeeping table from `settlex_migrations` to `settlehex_migrations` in `lib/server/db/runMigrations.js` and `lib/server/db/sql/0001_accounts_archive.sql`.
  - renamed the guest session cookie from `settlex_session` to `settlehex_session` in `lib/server/session/cookieNames.js` and the API/account tests that exercise authenticated route access.
  - renamed the local and prod Postgres Docker volumes to `settlehex-postgres-local` and `settlehex-postgres-prod`, and updated the local compose database/user/password defaults to `settlehex`.
  - updated the dev magic-link preview log prefix to `[settlehex magic link]`.
- Verification for the runtime infra rename:
  - `pnpm exec vitest run lib/server/__tests__/dbMigrations.test.js lib/server/__tests__/getPool.test.js lib/server/__tests__/guestAccounts.test.js app/__tests__/api/accountGuestRoute.test.js app/__tests__/api/accountClaimRoute.test.js app/__tests__/api/challengeRoutes.test.js app/__tests__/api/matchRoutes.test.js server/__tests__/deploymentFiles.source.test.js`
  - `docker compose -f infra/docker-compose.local.yml up -d postgres`
  - `pnpm db:migrate`
  - `docker exec infra-postgres-1 psql -U settlehex -d settlehex -c "\\dt" -c "select * from settlehex_migrations order by filename;"`
  - `pnpm build`
  - `pnpm verify`
- Fixed the game-over modal so the gold winner card follows the actual `isWinner` row instead of blindly promoting the highest-VP scoreboard entry.
- Endgame winner-modal notes:
  - `GameScreen` still sorts the scoreboard by VP for standings, but `GameOverModal` now promotes the explicit winner row and renders every other player in the secondary chips.
  - this closes the AFK-forfeit case where the timed-out player could have more VP than the real winner and previously looked like the winner in the gold card.
- Verification for the winner-card fix:
  - `pnpm exec vitest run app/catana/__tests__/GameOverModal.test.js`
- Added a desktop dock experiment for the left meta rail so log/chat can feel attached to the dock instead of reading like detached floating cards.
- Desktop meta-dock experiment notes:
  - desktop dock buttons are now icon-first, stay open independently, and use a shared light header tone when active so the control reads as part of the open panel rather than a separate chip.
  - open desktop rows now render a small bridge strip between the dock button and the panel header, which gets closer to the mockup where the panel appears to extend out of the dock.
  - desktop open/close reflow now uses GSAP `Flip` so rows shift smoothly when panels are toggled without changing the existing mobile drawer behavior.
- Verification for the desktop dock experiment:
  - `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/ChatPanel.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/DebugUiVisibility.test.js`
  - `pnpm exec eslint app/catana/components/LeftMetaRail.js app/catana/components/ChatPanel.js app/catana/components/GameLogPanel.js app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/ChatPanel.test.js`
  - `git diff --check`
- Reset the desktop meta-dock styling after the first connected-panel experiment felt worse in motion and added a stray decorative bridge shape.
- Desktop meta-dock reset notes:
  - removed the GSAP `Flip` reflow from the dock rows so open/close state changes are immediate again instead of feeling sluggish.
  - restored the older chat/log shell treatment:
    - `bg-white/50` header bars
    - `bg-white/35` chat footer
    - `bg-white/50` inset chat composer field with the earlier inner-ring look
  - replaced the previous bridge ornament with a flat header-colored connector strip so the active button and panel header read as one continuous bar.
- Verification for the desktop meta-dock reset:
  - `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/ChatPanel.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/DebugUiVisibility.test.js`
  - `pnpm exec eslint app/catana/components/LeftMetaRail.js app/catana/components/ChatPanel.js app/catana/components/GameLogPanel.js app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/ChatPanel.test.js`
  - `git diff --check`
- Refined the desktop active-state connector from a flat strip into a shaped tab that bulges out of the active dock button before running into the panel header.
- Desktop meta-dock connector-shape notes:
  - replaced the plain rectangular connector with an SVG-backed shape so the active icon button feels more like it is feeding into the header bar instead of sitting next to a separate strip.
  - kept the reset styling baseline intact:
    - no GSAP row animation
    - restored panel shell/header/footer styling
    - only the connector silhouette changed
- Verification for the connector-shape refinement:
  - `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/ChatPanel.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/DebugUiVisibility.test.js`
  - `pnpm exec eslint app/catana/components/LeftMetaRail.js app/catana/components/ChatPanel.js app/catana/components/GameLogPanel.js app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/ChatPanel.test.js`
  - `git diff --check`
- Refined the active desktop dock chrome again so the button and header are driven by one shared shell instead of a visible button surface sitting on top of a connector.
- Unified active-shell notes:
  - active desktop buttons now become visually transparent when open; the shared SVG shell owns the fill/stroke instead.
  - desktop dock panels now pass a transparent header background override so the shared shell can visually become the header bar instead of reading like a backdrop behind it.
  - the shared shell still uses the same restored `bg-white/50` / `border-white/40` visual language, but now reads much closer to a single continuous path from button into header.
- Verification for the unified active-shell refinement:
  - `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/ChatPanel.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/DebugUiVisibility.test.js`
  - `pnpm exec eslint app/catana/components/LeftMetaRail.js app/catana/components/ChatPanel.js app/catana/components/GameLogPanel.js app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/ChatPanel.test.js`
  - `git diff --check`
- Added a fresh dev-only connection study route at `/catana/dev/sidebar-connection` to evaluate the left-dock attachment effect without touching the live `LeftMetaRail` implementation.
- Sidebar connection study notes:
  - the new route compares two desktop-only mockups side by side:
    - `Variant A / Ribbon Shell`
    - `Variant B / Header Cap`
  - both mockups use a single active shell for the icon + header and keep the panel body separate underneath, which makes it easier to judge the “connected” feeling without the complexity of the real game UI code.
  - the mockups use lightweight `@react-spring/web` state transitions for open/close so the movement can be judged along with the chrome shape.
  - controls on the page cover the main states we care about right now:
    - both panels open
    - log only
    - chat only
    - dock only
- Verification for the sidebar connection study route:
  - `pnpm exec eslint app/catana/dev/sidebar-connection/page.js app/catana/dev/sidebar-connection/SidebarConnectionClient.js`
  - browser verification at `http://localhost:3000/catana/dev/sidebar-connection`
- Iterated `Variant B` on the sidebar connection study route into a `Headerless Rail` version so the active rail owns the title and the body starts beneath it without a second header layer.
- Headerless rail iteration notes:
  - the earlier `Header Cap` variant still read as two stacked glass objects because the body card visually carried its own top chrome.
  - the new `Headerless Rail` version removes that extra top chrome from the body and lowers the body card so the active rail is the only header treatment.
  - this keeps the springy dock/button motion while reducing the “overlapping cards” read that was making the connection feel fake.
- Verification for the headerless rail iteration:
  - `pnpm exec eslint app/catana/dev/sidebar-connection/page.js app/catana/dev/sidebar-connection/SidebarConnectionClient.js`
  - browser verification at `http://localhost:3000/catana/dev/sidebar-connection`
- Refined the sidebar connection study again so the route now focuses only on the `Headerless Rail` direction and uses one animated shell for both the closed button and open rail.
- Unified-shell refinement notes:
  - dropped the side-by-side variant comparison from the mockup route so the page can focus on the single promising direction instead of splitting attention across weaker alternatives.
  - the dock button is no longer a separate filled element sitting on top of a rail:
    - one animated shell now owns the button in the closed state
    - that same shell widens into the open title rail
  - the title fades/slides into the widening shell, while the body continues to settle in underneath it as a separate card.
  - checked the key states after the refinement:
    - both open
    - log only
    - dock only
- Verification for the unified-shell refinement:
  - `pnpm exec eslint app/catana/dev/sidebar-connection/page.js app/catana/dev/sidebar-connection/SidebarConnectionClient.js`
  - browser verification at `http://localhost:3000/catana/dev/sidebar-connection`
- Tuned the sidebar connection study styling back toward the original chat/log box treatment while keeping the unified shell interaction model.
- Original-box styling pass notes:
  - removed the decorative inner lines from the white rail/header shell so the open state reads as clean `bg-white/50` chrome instead of a styled object with extra ornament.
  - restyled the body cards to mirror the original panel vocabulary more closely:
    - `rounded-lg`
    - `bg-white/25`
    - `ring-1 ring-white/30`
    - smaller log/chat typography and spacing
    - original-style chat footer/input treatment
  - widened the body to sit directly underneath the rail so the body/header relationship feels closer to the old full-width boxes instead of a detached sub-card.
- Verification for the original-box styling pass:
  - `pnpm exec eslint app/catana/dev/sidebar-connection/page.js app/catana/dev/sidebar-connection/SidebarConnectionClient.js`
  - browser verification at `http://localhost:3000/catana/dev/sidebar-connection` in:
    - both-open state
    - log-only state
- Refined the original-box styling pass again to sharpen the rail/body seam and re-inset the body under the rail instead of letting it span the full rail width.
- Seam + inset refinement notes:
  - removed the previous 2px overlap between the rail and body; the body now starts directly below the rail, which avoids the blurry stacked-glass handoff.
  - added a single crisp white seam line at the bottom of the rail / top of the body to get closer to the clean divider line from the original panel header.
  - narrowed the body and shifted it right so it sits under roughly `button width + a little extra`, instead of matching the full rail width.
- Verification for the seam + inset refinement:
  - `pnpm exec eslint app/catana/dev/sidebar-connection/page.js app/catana/dev/sidebar-connection/SidebarConnectionClient.js`
  - browser verification at `http://localhost:3000/catana/dev/sidebar-connection` in:
    - both-open state
    - log-only state
- Flattened the dock chrome a bit more on the sidebar connection study route by removing the focus ring, dropping the shell shadow, and squaring off the open rail's bottom-right corner.
- Dock chrome flattening notes:
  - the interactive icon button no longer shows the extra white focus ring after click/focus in the mockup route.
  - removed the animated shell shadow so the dock/header reads flatter and closer to the rest of the glass UI.
  - the open rail keeps its rounded shape except for the bottom-right edge, which is now squared off to better match the simplified body/header relationship.
- Verification for the dock chrome flattening pass:
  - `pnpm exec eslint app/catana/dev/sidebar-connection/page.js app/catana/dev/sidebar-connection/SidebarConnectionClient.js`
  - browser verification at `http://localhost:3000/catana/dev/sidebar-connection`
- Reworked the sidebar connection study shell again so the open header is thinner than the button and uses a tapered SVG shell that keeps the button-to-rail transition smooth.
- Tapered thin-header refinement notes:
  - fixed the slight right-edge mismatch by defining the open shell width from the same `BODY_RIGHT` value that sets the body width/inset.
  - replaced the old full-height open rail rectangle with an SVG path driven by spring progress:
    - closed state is a rounded button
    - open state becomes a thinner header rail
    - the transition between them is a smooth curved taper instead of a hard step
  - kept the body inset and crisp seam line so the thinner rail still lands cleanly on the box beneath it.
- Verification for the tapered thin-header refinement:
  - `pnpm exec eslint app/catana/dev/sidebar-connection/page.js app/catana/dev/sidebar-connection/SidebarConnectionClient.js`
  - browser verification at `http://localhost:3000/catana/dev/sidebar-connection` in:
    - both-open state
    - log-only state
- Added a second comparison study to the sidebar connection route so the current thin-header taper and a new dock-to-body shoulder concept can be judged side by side.
- Dock-to-body shoulder comparison notes:
  - restored the route to a two-variant comparison layout:
    - `Current / Thin Header Taper`
    - `New Variant / Dock-To-Body Shoulder`
  - the new shoulder variant introduces:
    - a visible dock column behind the buttons
    - an active shell that shares the body material
    - a connection that opens into the panel shoulder/body plane rather than thinning into the header
    - a standard internal panel header band so the connection belongs to the body, not the title strip
- Verification for the dock-to-body shoulder comparison:
  - `pnpm exec eslint app/catana/dev/sidebar-connection/page.js app/catana/dev/sidebar-connection/SidebarConnectionClient.js`
  - browser verification at `http://localhost:3000/catana/dev/sidebar-connection` in:
    - both-open state
    - log-only state
- Locked the sidebar connection study direction around the `Side-Tab Ribbon` variant and cleaned up the click motion while preserving the earlier open-state geometry.
- Side-tab ribbon motion notes:
  - root cause of the visible bounce was the side-tab button animating from `translateY(0)` to `translateY(33px)`, with the row height changing by the same offset.
  - the side-tab button now stays at the fixed dock-stack position when clicked; single-open transitions no longer compress or expand the neighboring row.
  - the panel geometry was raised instead of moving the button, so the title bar still sits above the fixed button and the connector lands at the header/body seam.
  - consecutive open panels still use the extended panel gap, and the side-tab study stage has extra top breathing room so the raised first panel is not clipped.
  - the connected panel/shell still animates with GSAP, but there is no visible button translate or crossfade.
- Verification for the fixed-button side-tab motion pass:
  - Chrome DevTools visual checks at `http://127.0.0.1:3000/catana/dev/sidebar-connection` confirmed log-only and chat-only states keep the fixed button stack while preserving the raised header/tab connection.
  - Chrome DevTools transition sample confirmed the side-tab buttons stayed at fixed `y` positions through the click transition (`chatDelta: 0`, `logDelta: 0`).
  - screenshots captured:
    - `.tmp/side-tab-fixed-button-raised-panel-chat-open-2.png`
    - `.tmp/side-tab-fixed-button-log-open-final.png`
  - `pnpm exec vitest run app/catana/__tests__/SidebarConnectionStudy.source.test.js`
  - `pnpm exec eslint app/catana/dev/sidebar-connection/page.js app/catana/dev/sidebar-connection/SidebarConnectionClient.js app/catana/__tests__/SidebarConnectionStudy.source.test.js`
  - `git diff --check`

## Status (2026-04-16, dev-card reveal uses 3D GSAP flip)
- Replaced the private dev-card purchase reveal's midpoint image swap with a CodePen-style two-face 3D card flip.
- The reveal still keeps the existing dock release, center travel, hold timing, audio cues, and return-to-hand motion.
- Implementation notes:
  - `DevCardPurchaseReveal` now mounts both the dev-card back and bought-card face for the whole reveal.
  - `flipRef` owns the perspective wrapper, while `card3dRef` rotates from `0` to `180` degrees with GSAP.
  - face wrappers own `backfaceVisibility: "hidden"` and keep the SVG images inside the transformed wrappers.
- Verification so far:
  - `pnpm exec vitest run app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/utils/devCardPurchaseReveal.test.js app/catana/__tests__/effects/DevCardRevealLab.source.test.js`
  - Chrome DevTools check at `/catana/dev/effects`: overlay stays mounted through the center flip window, both face images are present, wrapper perspective is applied, and the inner card has a live `matrix3d(...)` rotation.
- Added old/new side-by-side comparison to the dev-card reveal lab.
- Comparison lab notes:
  - `DevCardPurchaseReveal` defaults to the new 3D flip, but accepts `flipVariant="midpoint"` for the lab-only old behavior.
  - `/catana/dev/effects` now shows `Old Midpoint` and `New 3D` lanes with one `Replay Both` control.
  - each lane supplies its own `centerPoint` so the two reveal actors fly to separate lane-local apex markers instead of overlapping at viewport center.
- Quick browser performance sample:
  - Chrome DevTools `requestAnimationFrame` / long-task sampling over three single-lane runs per variant showed both variants around a 16.6ms average frame interval.
  - no sampled old/new run had frames over 20ms, frames over 33ms, or long tasks on the desktop dev browser.
- Captured the remaining side-tab ribbon cleanup as a design-only follow-up before implementation.
- Sidebar overlap/lift design notes:
  - wrote `docs/superpowers/specs/2026-04-16-sidebar-connection-overlap-and-lift-design.md` for the remaining `/catana/dev/sidebar-connection` issue.
  - confirmed the tiny both-open overlap is most likely caused by open-row spacing using the negative raised-panel top offset in `getSideTabRowHeight()`.
  - confirmed the requested visual adjustment is a modest extra shell/header lift so the title bar reads above the fixed dock button, not a full extra title-bar jump.
  - implementation should keep the fixed button model, raise the shell slightly, and decouple row reservation from that visual lift.
- Finished the remaining side-tab ribbon overlap/lift cleanup in the dev route.
- Side-tab overlap/lift implementation notes:
  - increased `SIDE_TAB_PANEL_OPEN_LIFT` from `8` to `12` in `app/catana/dev/sidebar-connection/SidebarConnectionClient.js` so the header sits a touch higher above the fixed side-tab button.
  - fixed the both-open overlap by changing `getSideTabRowHeight()` to reserve `panel.height + SIDE_TAB_OPEN_PANEL_GAP` instead of subtracting space through the negative raised-panel top offset.
  - kept the fixed button-top model unchanged; only the shell lift and consecutive-open row reservation changed.
- Verification for the side-tab overlap/lift pass:
  - `pnpm exec vitest run app/catana/__tests__/SidebarConnectionStudy.source.test.js`
  - `pnpm exec eslint app/catana/dev/sidebar-connection/page.js app/catana/dev/sidebar-connection/SidebarConnectionClient.js app/catana/__tests__/SidebarConnectionStudy.source.test.js`
  - Chrome DevTools check at `http://127.0.0.1:3000/catana/dev/sidebar-connection` confirmed:
    - both-open side-tab panels now have a 20px gap (`Game Log` bottom `658`, `Chat` top `678`) with no overlap
    - single-open `Game Log` still keeps the button fixed while the header sits visibly above it
  - screenshots captured:
    - `.tmp/sidebar-connection-both-open-after-fix.png`
    - `.tmp/sidebar-connection-log-only-after-fix.png`
- Integrated the approved side-tab ribbon treatment into the production desktop `LeftMetaRail`.
- Left meta rail production ribbon notes:
  - `app/catana/components/LeftMetaRail.js` now replaces the old desktop connector shell with the side-tab ribbon geometry used in `/catana/dev/sidebar-connection`, including the fixed button stack, lifted unified SVG shell, GSAP reveal motion, and both-open row spacing model.
  - `GameLogPanel` and `ChatPanel` stay as the real production content bodies; the ribbon integration is handled from `LeftMetaRail` with parent-driven styling overrides.
  - `MobileMetaRail` was left unchanged in this pass.
  - the only production-only follow-up tweak from browser verification was widening the fixed desktop wrapper and allowing horizontal overflow so the ribbon does not get clipped by the real board viewport.
- Verification for the production left meta rail ribbon pass:
  - `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js`
  - `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/ChatPanel.test.js`
  - `pnpm exec eslint app/catana/components/LeftMetaRail.js app/catana/components/GameLogPanel.js app/catana/components/ChatPanel.js app/catana/__tests__/LeftMetaRail.test.js`
  - Chrome DevTools checks at `http://127.0.0.1:3001/catana/dev/sandbox` confirmed:
    - both-open desktop state now renders the production ribbon visibly at the left edge instead of clipping to a narrow fixed wrapper
    - log-only and chat-only states preserve the fixed button stack model
    - the chat composer remained editable (`value: "hello"`, `disabled: false`) in the ribbon shell
  - comparison check at `http://127.0.0.1:3001/catana/dev/sidebar-connection` used the approved dev ribbon as the visual reference for the production desktop pass
  - screenshots captured:
    - `.tmp/left-meta-rail-sandbox-after-width-fix.png`
    - `.tmp/left-meta-rail-sandbox-log-only.png`
    - `.tmp/left-meta-rail-sandbox-chat-only-2.png`
    - `.tmp/sidebar-connection-reference-1440.png`
- Restored the production desktop meta rail to the older bottom-left anchoring while keeping the new ribbon chrome.
- Bottom-anchored ribbon notes:
  - `app/catana/components/LeftMetaRail.js` no longer stretches the desktop rail from `top-24` to `bottom-6`; the desktop wrapper is now fixed at `left-4 bottom-6`.
  - the desktop wrapper/content containers also no longer rely on `min-h-full` / full-height overflow behavior, so the ribbon stack sizes to its content and sits at the bottom-left of the board again.
  - this preserves the current ribbon treatment but restores the earlier visual hierarchy: `Chat` bottom-left, `Game Log` above it.
- Verification for the bottom-anchored desktop ribbon tweak:
  - `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js`
  - `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/ChatPanel.test.js`
  - `pnpm exec eslint app/catana/components/LeftMetaRail.js app/catana/components/GameLogPanel.js app/catana/components/ChatPanel.js app/catana/__tests__/LeftMetaRail.test.js`
  - Chrome DevTools check at `http://127.0.0.1:3001/catana/dev/sandbox` confirmed the desktop stack now sits at the bottom-left again with `Chat` at the bottom and `Game Log` above it.
  - screenshot captured:
    - `.tmp/left-meta-rail-bottom-anchored.png`
- Added anchor-aware desktop ribbon geometry so the bottom-left rail can place buttons against different parts of each panel shell.
- Left meta rail anchor-mode notes:
  - `app/catana/components/LeftMetaRail.js` now exports `getSideTabLayoutMetrics({ panelHeight, anchor })` and supports `top`, `middle`, and `bottom` anchor modes for desktop side-tab rows.
  - production defaults are now `Game Log -> middle` and `Chat -> bottom`, which keeps `Chat` inside the viewport when the desktop stack is anchored from the bottom-left.
  - row spacing now uses actual current/next panel footprints instead of one fixed top-anchored open-height assumption.
- Verification for the anchor-mode pass:
  - `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js`
  - `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/ChatPanel.test.js`
  - `pnpm exec eslint app/catana/components/LeftMetaRail.js app/catana/__tests__/LeftMetaRail.test.js`
  - Chrome DevTools checks at `http://127.0.0.1:3000/catana/dev/sandbox` confirmed:
    - both-open desktop state renders `log=middle` and `chat=bottom` with a 20px gap (`log` bottom `446`, `chat` top `466`) in a `1136x768` viewport
    - `Chat` remains within the viewport (`bottom 696` in a `768`px-tall viewport)
    - chat-only and log-only states remain visually stable with the new anchor geometry
  - screenshots captured:
    - `.tmp/left-meta-rail-anchor-modes-current.png`
    - `.tmp/left-meta-rail-anchor-modes-chat-only.png`
    - `.tmp/left-meta-rail-anchor-modes-log-only.png`
    - `.tmp/left-meta-rail-anchor-modes-both-open-small.png`
- Refined the desktop anchor geometry so `middle` and `bottom` keep the same rounded upper connector feel as the original lifted shell.
- Anchor-join refinement notes:
  - `app/catana/components/LeftMetaRail.js` now keeps `middle` and `bottom` on a lifted upper join seam instead of snapping the seam to the button top.
  - the `bottom` anchor now also stops short of the button baseline with a small lift, so it reads as near-bottom rather than fully flush.
  - this preserves the visual curve the user called out without changing the existing row-spacing model.
- Verification for the anchor-join refinement:
  - `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js`
  - Chrome DevTools checks at `http://127.0.0.1:3000/catana/dev/sandbox` confirmed:
    - both-open state keeps a smooth upper elbow on the `Game Log` middle anchor
    - chat-only state keeps the upper elbow and shows the `bottom` anchor slightly lifted from the button baseline
  - screenshots captured:
    - `.tmp/left-meta-rail-anchor-join-refined-both-open.png`
    - `.tmp/left-meta-rail-anchor-join-refined-chat-only.png`
- Corrected the `bottom` anchor's lower connector so it actually moves upward with the lifted shell instead of stretching farther down.
- Bottom-connector correction notes:
  - `app/catana/components/LeftMetaRail.js` now returns `lowerJoinY` from `getSideTabLayoutMetrics()`.
  - the shell path uses `lowerJoinY` instead of a fixed `72px` lower rejoin point, so the `bottom` anchor's visible connector rises with the panel instead of leaving a longer downward tail.
- Verification for the bottom-connector correction:
  - `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js`
  - Chrome DevTools checks at `http://127.0.0.1:3000/catana/dev/sandbox` confirmed:
    - chat-only state shows the lower connector higher than before
    - both-open state still reads cleanly after the lower-join change
  - screenshots captured:
    - `.tmp/chat-only-lower-join-up.png`
    - `.tmp/both-open-lower-join-up.png`
- Corrected the anchor-mode design target for the bottom chat shell before further implementation.
- Bottom-anchor design clarification:
  - the previous refinement moved the whole chat panel too high; the intended production rule is to keep the chat panel body on the old desktop bottom baseline and lift only the lower connector seam above the message/composer band.
  - updated spec: `docs/superpowers/specs/2026-04-16-left-meta-rail-anchor-modes-design.md`
- Added mode-based match creation for Catana defaults and 1v1 matchmaking.
- Game mode wiring notes:
  - `game-core/src/gameModes.ts` now defines serializable mode ids: `duel`, `standard-3p`, and `standard-4p`.
  - `duel` resolves to `rulesetId: "duel"` plus `boardConfigId: "standard-balanced"`, so default 1v1 setup now uses balanced board generation.
  - `app/catana/Game.js` resolves `setupData.modeId` first and falls back by player count for older/dev callers.
  - public 1v1 matchmaking and bot creation now create matches with `modeId: "duel"` instead of raw `numPlayers: 2`.
  - open-match listing accepts `modeId` filtering so future 4p queues can avoid joining 1v1 waiting rooms.
  - friend challenges stamp the same duel mode metadata alongside `matchKind: "friend_challenge"`.
- Verification for mode-based matchmaking defaults:
  - `pnpm -C game-core test`
  - `pnpm -C game-core build`
  - `pnpm exec vitest run --exclude '.worktrees/**' lib/server/__tests__/listPublicOpenMatches.test.js app/catana/__tests__/Game.boardConfig.test.js app/__tests__/api/matchRoutes.test.js app/__tests__/api/challengeRoutes.test.js app/catana/__tests__/LobbyPageClient.matchmakingFeedback.test.js app/catana/__tests__/LobbyPageClient.playVsBot.test.js app/catana/__tests__/LobbyPageClient.playWithFriend.test.js`
- Added the first live Settlex standard UI showcase and migrated the main proving-ground surfaces onto shared primitives.
- Standard UI phase 1 notes:
  - `app/catana/lobby/[matchID]/MatchPageClient.js` now imports shared `Panel`, `Input`, `Select`, `Button`, and `Banner` instead of maintaining local glass helpers for the join-seat flow.
  - `app/catana/lobby/LobbyPageClient.js` now routes the lobby card, join-by-code row, custom-room tools, dev-scenario picker, open-games list, and feedback banners through the shared `app/ui/*` layer.
  - `app/catana/dev/ui/page.js` and `app/catana/dev/ui/UiShowcaseClient.js` provide a development-only component-registry screen for the standard layer, including live dialog and alert-dialog previews.
  - the showcase page was browser-checked at `http://localhost:3001/catana/dev/ui` on desktop and mobile-sized viewports using the Playwright skill.
- Verification for the standard UI proving-ground pass:
  - `pnpm exec vitest run app/catana/__tests__/SettlexUiFoundation.source.test.js app/catana/__tests__/SettlexUiRecipes.source.test.js app/catana/__tests__/StatusBanner.source.test.js app/catana/__tests__/GlobalReconnectBanner.source.test.js app/catana/__tests__/SettlexDialogs.source.test.js app/catana/__tests__/IdlePromptModal.source.test.js app/catana/__tests__/GameScreen.gameOver.test.js app/catana/__tests__/MatchPageClient.standardUi.source.test.js app/catana/__tests__/LobbyPageClient.standardUi.source.test.js app/catana/__tests__/StandardUiShowcase.source.test.js`
  - `pnpm exec eslint app/ui/Button.js app/ui/Panel.js app/ui/Banner.js app/ui/Input.js app/ui/Select.js app/ui/Dialog.js app/ui/AlertDialog.js app/catana/lobby/LobbyPageClient.js 'app/catana/lobby/[matchID]/MatchPageClient.js' app/catana/dev/ui/UiShowcaseClient.js app/catana/dev/ui/page.js app/catana/components/IdlePromptModal.js app/catana/components/ResignConfirmDialog.js app/catana/GameScreen.js`
- Added a stronger visual identity pass for the shared Settlex UI primitives.
- Standard UI visual-pass notes:
  - `app/ui/Button.js` now uses more opinionated rounded control silhouettes, gradient fills, stronger inset highlights, and a shared lift-on-hover motion language.
  - `app/ui/Panel.js` now uses a deeper layered-glass shell with a brighter top seam and a more recognizable header strip instead of the flatter old card treatment.
  - `app/ui/Banner.js`, `Input.js`, `Select.js`, `Dialog.js`, and `AlertDialog.js` now match that same chrome family, so the system feels related across feedback, forms, and overlays.
  - browser checks at `http://localhost:3002/catana/dev/ui` confirmed the new primitive family reads more like one product kit on both desktop and mobile; the mobile dialog also remained centered and usable.
- Verification for the standard UI visual pass:
  - `pnpm exec vitest run app/catana/__tests__/SettlexUiFoundation.source.test.js app/catana/__tests__/SettlexUiRecipes.source.test.js app/catana/__tests__/StandardUiShowcase.source.test.js app/catana/__tests__/SettlexDialogs.source.test.js app/catana/__tests__/StatusBanner.source.test.js app/catana/__tests__/GlobalReconnectBanner.source.test.js app/catana/__tests__/IdlePromptModal.source.test.js app/catana/__tests__/GameScreen.gameOver.test.js app/catana/__tests__/MatchPageClient.standardUi.source.test.js app/catana/__tests__/LobbyPageClient.standardUi.source.test.js`
  - `pnpm exec eslint app/ui/Button.js app/ui/Panel.js app/ui/Banner.js app/ui/Input.js app/ui/Select.js app/ui/Dialog.js app/ui/AlertDialog.js app/catana/dev/ui/UiShowcaseClient.js app/catana/lobby/LobbyPageClient.js 'app/catana/lobby/[matchID]/MatchPageClient.js' app/catana/components/IdlePromptModal.js app/catana/components/ResignConfirmDialog.js app/catana/GameScreen.js`
- Added a reusable handoff doc for parallel standard-UI design experiments.
- Handoff prompt note:
  - `docs/agent/SETTLEX_STANDARD_UI_VARIANT_PROMPT.md` packages the current architecture, brand constraints, scope boundaries, working files, comparison criteria, and a copy-paste prompt for another agentic coding model.
  - the doc also includes optional bias lines so multiple external models can be nudged into different but still brand-compatible directions.
- Recovered the dev-only variant experiment after an interrupted jewel-like overwrite.
- Variant recovery note:
  - restored `app/ui/*` and `app/globals.css` to the committed shared-layer baseline so the experiment no longer mutates the canonical primitives.
  - `app/catana/dev/ui/UiShowcaseClient.js` now keeps the comparison explicitly inside the showcase route with three lanes:
    - `Current Pass`
    - `Liquid Glass`
    - `Motion-Accent CTA`
  - browser checks at `http://localhost:3000/catana/dev/ui` confirmed the comparison route renders on desktop and mobile after the recovery, with screenshots captured under `output/playwright/`.
- Verification for the variant recovery pass:
  - `pnpm exec vitest run app/catana/__tests__/StandardUiShowcase.source.test.js app/catana/__tests__/SettlexUiRecipes.source.test.js app/catana/__tests__/SettlexDialogs.source.test.js`
  - `pnpm exec eslint app/catana/dev/ui/UiShowcaseClient.js`
- Restored shared modal entry motion to the experimental showcase variants.
- Variant motion note:
  - the split between `Current Pass` and the experimental lanes had accidentally dropped the shared overlay animation classes from the custom dev-only modal.
  - `app/catana/dev/ui/UiShowcaseClient.js` now applies `settlex-ui-dialog-backdrop` and `settlex-ui-dialog-popup` to the experimental modal shell, so `Liquid Glass` and `Motion-Accent CTA` reuse the same dialog entry timing as the canonical shared layer.
- Verification for the variant motion fix:
  - `pnpm exec vitest run app/catana/__tests__/StandardUiShowcase.source.test.js`
  - `pnpm exec eslint app/catana/dev/ui/UiShowcaseClient.js`
  - live browser check at `http://localhost:3000/catana/dev/ui` confirmed the `Motion-Accent CTA` popup computes `animation-name: settlex-ui-dialog-in` and the backdrop computes `animation-name: settlex-ui-backdrop-in`
- Promoted the `Motion-Accent CTA` experiment into the actual Settlex shared UI baseline.
- Promotion note:
  - `app/ui/Button.js`, `Panel.js`, `Banner.js`, `Input.js`, `Select.js`, `Dialog.js`, and `AlertDialog.js` now use the motion-accent styling as the canonical shared layer.
  - `app/globals.css` now includes the shared `settlex-ui-cta-shimmer` keyframes used by the promoted CTA buttons.
  - `app/catana/dev/ui/UiShowcaseClient.js` is no longer a three-way comparison page; it is back to a single baseline showcase built from the promoted shared primitives.
  - browser checks at `http://localhost:3000/catana/dev/ui` confirmed the promoted baseline on desktop and mobile, including the updated dialog shell.
- Verification for the motion-accent promotion pass:
  - `pnpm exec vitest run app/catana/__tests__/SettlexUiFoundation.source.test.js app/catana/__tests__/SettlexUiRecipes.source.test.js app/catana/__tests__/StandardUiShowcase.source.test.js app/catana/__tests__/SettlexDialogs.source.test.js app/catana/__tests__/StatusBanner.source.test.js app/catana/__tests__/GlobalReconnectBanner.source.test.js app/catana/__tests__/IdlePromptModal.source.test.js app/catana/__tests__/GameScreen.gameOver.test.js app/catana/__tests__/MatchPageClient.standardUi.source.test.js app/catana/__tests__/LobbyPageClient.standardUi.source.test.js`
  - `pnpm exec eslint app/ui/Button.js app/ui/Panel.js app/ui/Banner.js app/ui/Input.js app/ui/Select.js app/ui/Dialog.js app/ui/AlertDialog.js app/catana/dev/ui/UiShowcaseClient.js app/catana/dev/ui/page.js app/catana/lobby/LobbyPageClient.js 'app/catana/lobby/[matchID]/MatchPageClient.js' app/catana/components/IdlePromptModal.js app/catana/components/ResignConfirmDialog.js app/catana/GameScreen.js`
- Added the semantic button layer on top of the motion-accent baseline and applied it to the homepage.
- Semantic-button pass note:
  - `app/ui/Button.js` now exposes semantic roles `primary`, `secondary`, `accent`, `subtle`, `ghost`, and `danger`, plus an `xl` size for oversized hero CTAs.
  - legacy `pill` and `chip` names still resolve through aliases, so older call sites keep working while the public API shifts toward product-meaningful names.
  - `app/catana/lobby/LobbyPageClient.js` now uses those shared variants for the main homepage entrypoints instead of hardcoded CTA classes:
    - `Play` uses `primary`
    - `Play a Friend` uses `secondary`
    - `Play Against Bot` uses `accent`
    - room-code join and custom-game entry now use shared button recipes too
  - the homepage shell widened from `max-w-sm` to `max-w-xl`, gained a clearer matchmaking header, and turned the room-code flow into a distinct inset sub-surface so the page reads like an intentional landing surface rather than a compressed form stack.
  - `app/catana/dev/ui/UiShowcaseClient.js` now demonstrates the new semantic names (`secondary`, `accent`, `subtle`) instead of teaching `pill` / `chip`.
- Verification for the semantic-button homepage pass:
  - `pnpm exec vitest run app/catana/__tests__/LobbyPageClient.playVsBot.test.js app/catana/__tests__/LobbyPageClient.playWithFriend.test.js app/catana/__tests__/LobbyPageClient.matchmakingFeedback.test.js app/catana/__tests__/LobbyPageClient.identity.test.js app/catana/__tests__/LobbyPageClient.scenarios.test.js app/catana/__tests__/LobbyPageClient.standardUi.source.test.js app/catana/__tests__/SettlexUiRecipes.source.test.js app/catana/__tests__/StandardUiShowcase.source.test.js`
  - `pnpm exec eslint app/ui/Button.js app/catana/lobby/LobbyPageClient.js app/catana/dev/ui/UiShowcaseClient.js`
  - Playwright screenshots captured from `http://localhost:3000/`:
    - `output/playwright/homepage-semantic-buttons-desktop.png`
    - `output/playwright/homepage-semantic-buttons-mobile.png`
- Added reusable picker primitives and migrated the lobby identity/friend-invite modals onto the shared UI layer.
- Picker + modal pass note:
  - new shared primitives:
    - `app/ui/IconButton.js`
    - `app/ui/SwatchPicker.js`
    - `app/ui/Popover.js`
  - `IconButton` now covers icon-only controls such as the emoji left/right cycle buttons while staying inside the shared semantic button language.
  - `SwatchPicker` preserves the existing lobby color-swatch feel and selected treatment, but moves it into the shared kit so future avatar/theme pickers do not reimplement it.
  - `Popover` is now the first shared floating-picker primitive, built on `@base-ui/react/popover`, and is used for the emoji chooser instead of a local click-outside panel.
  - `app/catana/lobby/IdentityModal.js` now uses `Dialog`, `Input`, `Button`, `IconButton`, `SwatchPicker`, and `Popover`.
  - `app/catana/lobby/FriendChallengeModal.js` now uses `Dialog`, `Panel`, `Input`, and `Button` rather than a custom full-screen shell.
  - browser-checked the username modal flow at `http://localhost:3000/`:
    - base modal open state
    - emoji popover open state
    - fixed a popover layering issue by raising `Popover.Positioner` to `z-[60]`
  - screenshots captured:
    - `output/playwright/identity-modal-popover-open-fixed.png`
- Verification for the picker + modal pass:
  - `pnpm exec vitest run app/catana/__tests__/SettlexUiPickers.source.test.js app/catana/__tests__/LobbyPageClient.identity.test.js app/catana/__tests__/LobbyPageClient.playWithFriend.test.js`
  - `pnpm exec vitest run app/catana/__tests__/LobbyPageClient.standardUi.source.test.js app/catana/__tests__/LobbyPageClient.identity.test.js app/catana/__tests__/LobbyPageClient.playWithFriend.test.js app/catana/__tests__/SettlexUiPickers.source.test.js app/catana/__tests__/SettlexDialogs.source.test.js app/catana/__tests__/SettlexUiRecipes.source.test.js`
  - `pnpm exec eslint app/ui/IconButton.js app/ui/SwatchPicker.js app/ui/Popover.js app/catana/lobby/IdentityModal.js app/catana/lobby/FriendChallengeModal.js`
- Added a short workflow doc for future agents adding shared standard UI primitives.
- Shared-primitive workflow note:
  - new doc: `docs/agent/skills/catana-brand/ADDING_SHARED_PRIMITIVES.md`
  - purpose:
    - make future primitive work more repeatable
    - stop agents from “vibing” from scratch when adding things like `Tooltip`, `Toast`, `Table`, or `Tabs`
    - give one short reference for:
      - what counts as a shared primitive
      - what to read first
      - current canonical primitives
      - design / implementation / reference rules
      - definition of done
      - a reusable prompt template
  - `docs/agent/skills/catana-brand/SKILL.md` now points to that workflow doc when the task is adding or extending a reusable product-surface primitive.
  - `AGENTS.md` in the working tree now tells UI-building agents to read the workflow doc as well when the task adds a reusable standard UI primitive.
- Verification for the shared-primitive workflow doc pass:
  - reference check via `rg -n "ADDING_SHARED_PRIMITIVES" AGENTS.md docs/agent/skills/catana-brand/SKILL.md docs/agent/skills/catana-brand/ADDING_SHARED_PRIMITIVES.md`
  - no code-path tests run; this was a docs/instructions pass only
- Tightened the shared banner indicator alignment.
- Banner polish note:
  - `app/ui/Banner.js` now applies a small top offset to the status dot so it aligns more naturally with the banner title line, especially on the danger variant.
  - this was a polish-only change; no banner structure or styling direction changed beyond the indicator position.
- Verification for the banner polish:
  - `pnpm exec vitest run app/catana/__tests__/SettlexUiRecipes.source.test.js`
  - `pnpm exec eslint app/ui/Banner.js`
  - browser check at `http://localhost:3000/catana/dev/ui`
  - screenshot: `output/playwright/banner-indicator-alignment-fixed.png`
- Softened the homepage matchmaking-card typography so the panel no longer reads with near-black ink.
- Homepage typography polish note:
  - `app/catana/lobby/LobbyPageClient.js` now uses the lighter standard-ui text hierarchy inside the main matchmaking card:
    - heading: `text-slate-800` instead of `text-slate-900`
    - body copy: `text-slate-600` instead of `text-slate-700`
    - helper/eyebrow labels: `text-slate-500` instead of `text-slate-600`
  - this preserves contrast on the light panel while reducing the “too black / too standard web card” feel the user flagged.
- Verification for the homepage typography polish:
  - `pnpm exec vitest run app/catana/__tests__/LobbyPageClient.standardUi.source.test.js`
  - `pnpm exec eslint app/catana/lobby/LobbyPageClient.js`
- Reduced ambient CTA shimmer so it is opt-in instead of automatic for all emphasis buttons.
- CTA sheen polish note:
  - `app/ui/Button.js` now exposes a `sheen` prop instead of automatically animating all `primary`, `accent`, and `danger` buttons.
  - the lobby homepage keeps sheen only on the main `Play` CTA in `app/catana/lobby/LobbyPageClient.js`.
  - `Play a Friend`, `Play Against Bot`, danger actions, and other shared buttons still keep their hover/press motion, but no longer run a constant ambient sweep by default.
- Verification for the CTA sheen polish:
  - `pnpm exec vitest run app/catana/__tests__/SettlexUiRecipes.source.test.js app/catana/__tests__/LobbyPageClient.standardUi.source.test.js`
  - `pnpm exec eslint app/ui/Button.js app/catana/lobby/LobbyPageClient.js`
- Added the first Knight development-card play animation path.
- Knight dev-card animation note:
  - `playDevCardStart` now emits public `devCardPlayStarted` payloads for Knight plays and stores a pending presentation record until robber resolution.
  - robber completion now emits `devCardPlayResolved`, allowing the UI to park the played Knight during robber placement and release the Largest Army count on landing.
  - `GameEffects` forwards those authoritative lifecycle effects onto `devcard:play:start` and `devcard:play:resolve`.
  - `app/catana/effects/devCardPlay.js` owns the GSAP choreography:
    - local viewer: Knight card hops out from the local card group
    - opponent/spectator viewer: Knight card emerges from the opponent dev-card stack
    - resolve: parked card flies to the actor's Largest Army target and then releases the frozen stat display
  - `/catana/dev/sandbox` now has dev-only controls for `Opponent Plays Knight`, `Resolve Opponent Knight`, and `Reset Knight Visual`.
- Verification for the Knight dev-card animation path:
  - `pnpm exec vitest run app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/effects/GameEffects.test.js app/catana/__tests__/effects/registry.test.js app/catana/__tests__/effects/devCardPlayPerspective.test.js app/catana/__tests__/utils/devCardPlayPresentation.test.js app/catana/__tests__/effects/devCardPlay.test.js app/catana/__tests__/effects/soundThemes.test.js app/catana/__tests__/DevCardDisplayLayout.source.test.js app/catana/__tests__/PlayerActionContainer.devCardReveal.test.js app/catana/__tests__/playerAvatarStats.test.js app/catana/__tests__/GameScreen.devCardPlay.test.js app/catana/__tests__/DevSandboxPanel.source.test.js`
  - `pnpm exec eslint app/catana/Moves.js app/catana/Game.js app/catana/GameScreen.js app/catana/effects/GameEffects.js app/catana/effects/registry.js app/catana/effects/devCardPlay.js app/catana/effects/devCardPlayPerspective.js app/catana/effects/soundThemes.js app/catana/utils/devCardPlayPresentation.js app/catana/components/DevCardDisplay.js app/catana/components/PlayerActionContainer.js app/catana/components/OpponentPlayerBox.js app/catana/components/PlayerAvatarStats.js app/catana/dev/sandbox/SandboxPanel.js app/catana/dev/sandbox/SandboxBoardShell.js`
  - `pnpm dev` served the worktree on `http://localhost:3001`; `curl -I http://localhost:3001/catana/dev/sandbox` returned `200 OK`.
  - Chrome DevTools smoke check confirmed the sandbox route renders the new controls and synthetic opponent start/resolve/reset actions run without new console errors.
- Tuned Knight dev-card play scale and shadow:
  - local played Knight now parks at 2x scale.
  - opponent/spectator played Knight now parks at 2x scale.
  - parked cards use a stronger drop-shadow and larger source offset so they read as floating above the board.
  - opponent/spectator reveal now pops the dev-card back out first, then flips to the Knight face once parked.
- Polished the friend-invite modal so the share-link area reads as a lighter grouped section instead of a full card nested inside the dialog.
- Friend-invite modal polish note:
  - `app/catana/lobby/FriendChallengeModal.js` no longer uses a nested `Panel` for the share row.
  - the share area is now a lighter inset section with an eyebrow label, which reduces the “card within a card” effect inside the dialog.
  - the copy button now reserves a fixed width and resets after a short timeout, so `Copy` -> `Copied` no longer causes the input width to jump.
- Verification for the friend-invite modal polish:
  - `pnpm exec vitest run app/catana/__tests__/LobbyPageClient.playWithFriend.test.js`
  - `pnpm exec eslint app/catana/lobby/FriendChallengeModal.js app/catana/__tests__/LobbyPageClient.playWithFriend.test.js`
- Fixed the reconnect banner so a freshly-created private friend invite no longer reads as an active game after a homepage refresh.
- Pending friend-challenge reconnect note:
  - `app/catana/utils/reconnectBanner.js` now suppresses the global reconnect banner when the saved match is a private friend challenge with an open seat.
  - this keeps the saved seat record around, so if the friend joins later the browser can still offer a rejoin path once the live match is actually full.
  - the banner only treats the invite as an active match after both seats are occupied.
- Verification for the pending friend-challenge reconnect fix:
  - `pnpm exec vitest run app/catana/__tests__/reconnectBanner.test.js`
- Added first-pass friend-challenge rehydration so a pending `Play a Friend` invite survives lobby refresh instead of silently disappearing from local UI state.
- Friend-challenge rehydration note:
  - `app/catana/utils/pendingFriendChallenge.js` now stores a minimal local pointer for the inviter’s pending challenge and restores it against `/api/challenges/:matchID` on lobby load.
  - `app/catana/lobby/LobbyPageClient.js` writes that pointer when challenge creation succeeds, reopens the waiting modal after refresh when the invite is still pending, routes into `/g/:matchID` if the friend joined while the page was away, and clears the pointer on accept/cancel/expiry.
  - explicit close still means cancel; refresh now means resume if the server still considers the invite pending.
- Verification for the friend-challenge rehydration pass:
  - `pnpm exec vitest run app/catana/__tests__/pendingFriendChallenge.test.js app/catana/__tests__/LobbyPageClient.playWithFriend.test.js`
- Tightened the shared-primitive workflow so future agents must do reference-first design work for new standard UI components.
- Shared-primitive workflow polish note:
  - `docs/agent/skills/catana-brand/ADDING_SHARED_PRIMITIVES.md` now requires agents to:
    - check `app/ui/*` first
    - review two or three targeted external references for new shared interaction patterns
    - prefer copying/adapting open-code interaction recipes over inventing from scratch
    - record which references informed the work when relevant
  - `docs/agent/skills/catana-brand/SKILL.md` and `AGENTS.md` now both point future UI work toward that reference-first process instead of leaving external references as purely optional.
- Verification for the shared-primitive workflow polish:
  - `rg -n "reference-first|two or three|targeted external references|inventing a new shared interaction pattern" docs/agent/skills/catana-brand/ADDING_SHARED_PRIMITIVES.md docs/agent/skills/catana-brand/SKILL.md AGENTS.md`
  - `git diff --check`
- Polished the friend-invite share row into a more intentional invite-link control.
- Share-row polish note:
  - `app/catana/lobby/FriendChallengeModal.js` now treats the invite link as a unified input-group style control instead of a generic field plus trailing button.
  - the row now has:
    - a lighter grouped surface
    - an inline expiry pill
    - icon-backed `Copy link` action with stable sizing
    - a success-tint path for copied state
    - click-to-select behavior without auto-selecting the URL on modal open
  - external references used for the interaction pattern:
    - Animate UI copy button
    - Shadcn Space promo-code copy
    - Shadcnblocks input-group patterns
  - updated source assertion in `app/catana/__tests__/LobbyPageClient.playWithFriend.test.js` to match the new invite-link control.
- Verification for the share-row polish:
  - `pnpm exec vitest run app/catana/__tests__/LobbyPageClient.playWithFriend.test.js --exclude='.worktrees/**'`
  - `pnpm exec eslint app/catana/lobby/FriendChallengeModal.js app/catana/__tests__/LobbyPageClient.playWithFriend.test.js`
  - browser-check at `http://localhost:3000/` with the real waiting-for-friend modal on desktop and mobile
  - screenshots:
    - `output/playwright/friend-challenge-share-row-resting.png`
    - `output/playwright/friend-challenge-share-row-mobile.png`
- Follow-up polish pass:
  - `app/catana/lobby/FriendChallengeModal.js`
    - widened the invite modal from `max-w-md` to `max-w-lg`
    - tightened the share row so the input and copy action read more like a single desktop bar
    - shortened the copy CTA label from `Copy link` to `Copy`
  - `app/ui/Banner.js`
    - refactored the shared banner shell to stack content and actions on mobile and restore a row layout on larger screens
    - added an internal actions wrapper so banner consumers no longer have to solve the mobile action layout themselves
  - `app/catana/components/GlobalReconnectBanner.js`
    - widened the reconnect banner to `max-w-2xl`
    - made `Rejoin match` and `Dismiss` explicitly responsive so they center and stack cleanly on small screens
  - `app/ui/Button.js`
    - fixed disabled shared buttons so gradient backgrounds do not survive disabled state
    - disabled buttons now drop their background image, use a muted solid fill, and keep a lighter border
- Verification for the follow-up polish pass:
  - `pnpm exec vitest run app/catana/__tests__/LobbyPageClient.playWithFriend.test.js app/catana/__tests__/SettlexUiRecipes.source.test.js app/catana/__tests__/GlobalReconnectBanner.source.test.js --exclude='.worktrees/**'`
  - `pnpm exec eslint app/ui/Button.js app/ui/Banner.js app/catana/components/GlobalReconnectBanner.js app/catana/lobby/FriendChallengeModal.js app/catana/__tests__/LobbyPageClient.playWithFriend.test.js app/catana/__tests__/SettlexUiRecipes.source.test.js app/catana/__tests__/GlobalReconnectBanner.source.test.js`
  - `http://localhost:3000/` browser sanity check via live Playwright DOM snapshots for:
    - reconnect banner present with responsive action structure
    - waiting-for-friend modal showing the revised `Invite Link` row
- Invite-row micro polish:
  - `app/catana/lobby/FriendChallengeModal.js`
    - removed the copy label from the docked invite-row action so the control is icon-only
    - removed the hover lift from that local copy action so it stays visually fused to the input
    - tightened the row further so the input and copy affordance read as one bar on all viewports
    - kept accessibility via `aria-label`, and still switch the icon for copied-state feedback
  - updated the source assertion in `app/catana/__tests__/LobbyPageClient.playWithFriend.test.js`
- Verification for the invite-row micro polish:
  - `pnpm exec vitest run app/catana/__tests__/LobbyPageClient.playWithFriend.test.js --exclude='.worktrees/**'`
  - `pnpm exec eslint app/catana/lobby/FriendChallengeModal.js app/catana/__tests__/LobbyPageClient.playWithFriend.test.js`
  - Playwright element screenshot:
    - `output/playwright/share-copy-icon-button.png`

## Status (2026-04-25, split meta HUD redesign)
- Superseded the utility-dock direction with a conventional split HUD:
  - `Game Log` renders as a fixed desktop panel on the left,
  - `Chat` renders as a fixed desktop panel on the right,
  - both desktop panels default open,
  - each bottom edge toggle independently opens/closes its own panel,
  - closed desktop panels leave only the compact Log/Chat toggles,
  - mobile keeps the existing one-active-panel rail.
- Added a top-left game utility cluster:
  - persistent mute/unmute control,
  - game settings dialog for local audio/theme state,
  - game rules dialog for the current match ruleset,
  - settings/rules buttons are hidden on the narrow mobile HUD so they do not crowd the top player row.
- Kept the shared Settlex `Tooltip` primitive for the desktop icon utility controls.
- Focused verification:
  - `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/GameScreen.audioMute.test.js app/catana/__tests__/leftMetaRailPreferences.test.js`
  - `pnpm exec vitest run app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/ChatPanel.test.js app/catana/__tests__/renderPerfGuards.test.js`
  - `pnpm exec vitest run app/catana/__tests__/SettlexUiRecipes.source.test.js`
  - `pnpm exec eslint app/catana/components/LeftMetaRail.js app/catana/GameScreen.js app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/GameScreen.audioMute.test.js app/ui/Tooltip.js`
  - `pnpm exec eslint app/catana/dev/ui/UiShowcaseClient.js app/catana/__tests__/SettlexUiRecipes.source.test.js`
  - `git diff --check -- app/catana/components/LeftMetaRail.js app/catana/GameScreen.js app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/GameScreen.audioMute.test.js app/ui/Tooltip.js`
  - browser check at `/catana/dev/sandbox` for both-open desktop layout, independent Log/Chat toggle states, settings/rules dialogs, right toggle clearance from the turn button, and mobile HUD regression.

## Status (2026-04-26, left meta rail layout experiment)
- Follow-up experiment to compare against the split left/right HUD:
  - desktop `Game Log` and `Chat` now stack together on the left again,
  - board layout centers inside the remaining playfield after subtracting the left meta rail width,
  - the bottom hand/action dock is nudged toward that playfield center but clamped so it does not collide with the turn controls,
  - opponent/status row gets the same clamped nudge,
  - mobile remains on the compact one-active-panel rail.
- Verification for this exploratory pass:
  - `pnpm exec eslint app/catana/components/LeftMetaRail.js app/catana/GameScreen.js app/catana/Board.js app/catana/components/PlayerActionContainer.js app/catana/utils/boardLayout.js`
  - browser screenshots at `/catana/dev/sandbox`:
    - `output/playwright/left-meta-experiment-4.png`
    - `output/playwright/left-meta-experiment-collapsed.png`
    - `output/playwright/left-meta-experiment-mobile.png`

## Status (2026-04-26, Catana synth audio canvas design)
- Added the approved design for a dev-only Catana sound-design workbench:
  - source recipes under `sounds/catana-synth/`,
  - rendered audition outputs kept separate from `public/sounds/`,
  - a future `/catana/dev/sounds` lab for comparing generated variants against the existing resource and placement anchor sounds.
- Committed the design doc as `docs: add catana synth audio canvas design`.
- Added and committed the implementation plan for the audio canvas:
  - incorporates Strudel/Dittytoy research as local recipe/scheduler inspiration,
  - avoids importing Strudel in v1 because the local one-shot SFX renderer does not need a full live-coding engine,
  - includes MIDI/note-name helpers and event sequencing for short melodic cues such as game start.

## Status (2026-04-28, VP badge animated count)
- Added a reusable Catana `AnimatedCount` component for compact whole-value changes:
  - short slide/fade animation on increases and decreases,
  - tabular numeric layout to avoid badge jitter,
  - `prefers-reduced-motion` fallback,
  - optional `motionValue` for display strings that are not plain numbers.
- Wired the component only into the `PlayerAvatarStats` victory-point badge.
  - Resource, development-card, and other HUD numbers remain unchanged for now so routine numeric churn does not compete with board/effects motion.
  - Local hidden-VP strings such as `2 (+1)` animate based on total points while preserving the existing public/hidden display rules.
- Verification:
  - `pnpm exec vitest run app/catana/__tests__/AnimatedCount.test.js app/catana/__tests__/playerAvatarStats.test.js app/catana/__tests__/PlayerAvatarStatsCounts.test.js app/catana/__tests__/PlayerActionContainer.devCardReveal.test.js app/catana/__tests__/GameScreen.devCardReveal.test.js --exclude '**/.worktrees/**'`
  - `pnpm exec eslint app/catana/components/AnimatedCount.js app/catana/components/PlayerAvatarStats.js app/catana/__tests__/AnimatedCount.test.js app/catana/__tests__/playerAvatarStats.test.js`
  - `git diff --check -- app/catana/components/AnimatedCount.js app/catana/components/AnimatedCount.css app/catana/components/PlayerAvatarStats.js app/catana/__tests__/AnimatedCount.test.js app/catana/__tests__/playerAvatarStats.test.js`
  - Browser check at `/catana/dev/sandbox` using the Quick Dev Cards VP control, with DOM animation-state inspection plus desktop and mobile screenshots:
    - `tmp/vp-animated-count-sandbox-final.png`
    - `tmp/vp-animated-count-mobile.png`

## Status (2026-04-28, action dock press prototype)
- Added a small reversible action-dock motion prototype inspired by the glass-sidebar reference:
  - enabled dock cards now scale up on hover,
  - whole-button press is back to the former subtle 4% compression so it does not compete with the existing icon squash,
  - selected cards get a subtle resting scale,
  - the existing build-piece prelaunch squash/pop-out behavior is unchanged.
- Verification:
  - browser check at `/catana/dev/sandbox` on `http://localhost:3010`,
  - DOM inspection confirmed hover reaches `scale(1.1)` with a 5px lift and hovered press settles around `scale(1.05)`,
  - screenshot captured at `/tmp/settlex-action-dock-press-prototype.png`.
- Known local dev noise during verification:
  - Next emitted repeated `EMFILE: too many open files, watch` warnings,
  - the browser console still shows the existing `fetchpriority` React warning from `BoardUnderlay`.

## Status (2026-04-28, top-left utility tooltip timing)
- Matched the top-left utility button tooltip delay to the quicker log/chat restore-button hover labels.
- Current behavior:
  - the top-left `TooltipProvider` in `GameScreen` uses `delay={0}`,
  - the shared tooltip visual fade remains unchanged,
  - only the game utility cluster timing changed.

## Status (2026-04-29, Road Building dev-card play animation)
- Extended the existing GSAP dev-card play runner to support Road Building:
  - local and opponent start/reveal use the same parked-card treatment as Knight,
  - final Road Building resolution uses a short spent-card lift, shrink, and fade instead of flying to a counter,
  - local Road Building temporarily hides one Road Building card from the dock while the played card is parked.
- Added Road Building play/flip/resolve cues to the current sound theme using the existing card whoosh.
- Added Road Building start/resolve buttons to `/catana/dev/sandbox` dev-card effects.
- Verification:
  - `pnpm exec eslint app/catana/Moves.js app/catana/effects/devCardPlay.js app/catana/effects/soundThemes.js app/catana/GameScreen.js app/catana/dev/sandbox/SandboxPanel.js app/catana/dev/sandbox/SandboxBoardShell.js`

## Status (2026-04-29, YoP and Monopoly dev-card play animation)
- Extended the dev-card play lifecycle to Year of Plenty and Monopoly:
  - `playDevCardStart` emits the same parked-card start effect used by Knight/Road Building,
  - `confirmDevCardPlay` emits a resolve payload after the authoritative move applies,
  - YoP resolve carries the selected resources,
  - Monopoly resolve carries per-player resource transfers.
- Added a lightweight resource-card flow before the spent-card exit:
  - YoP resources flow from the parked dev card to the actor's resource area,
  - Monopoly resources flow from each affected player's resource area to the actor.
- Added YoP/Monopoly play, flip, and resolve cue mappings using the current card whoosh.
- Added YoP/Monopoly controls to the `/catana/dev/sandbox` dev-card effects panel.
- Verification:
  - `pnpm exec vitest run app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/effects/devCardPlay.test.js app/catana/__tests__/GameScreen.devCardPlay.test.js --exclude='.worktrees/**'`
  - `pnpm exec eslint app/catana/Moves.js app/catana/effects/devCardPlay.js app/catana/effects/soundThemes.js app/catana/GameScreen.js app/catana/dev/sandbox/SandboxPanel.js app/catana/dev/sandbox/SandboxBoardShell.js app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/effects/devCardPlay.test.js`

## Status (2026-04-30, local Monopoly resolve animation fix)
- Fixed the local-player Monopoly resolve path in live games:
  - local optimistic move execution can run against player-view-masked opponent hands,
  - those masked hands contain `hidden` placeholders instead of real resource names,
  - the optimistic Monopoly resolve effect is now suppressed when transfer counts are not knowable,
  - the server-authoritative resolve payload can then drive the incoming-card animation with real transfer counts.
- Added a regression test for masked local Monopoly confirmation.
- Verification:
  - `pnpm exec vitest run app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/effects/devCardPlay.test.js app/catana/__tests__/GameScreen.devCardPlay.test.js --exclude='.worktrees/**'`
  - `pnpm exec eslint app/catana/Moves.js app/catana/__tests__/Moves.devCards.test.js`

## Status (2026-04-30, forced YoP and Monopoly choices)
- Changed Year of Plenty and Monopoly dev-card play from a cancellable picker into a forced choice stage:
  - `playDevCardStart` now parks the card and enters `devCardChoice`,
  - the choice stage exposes only confirm, auto-resolve, terminal, and debug moves,
  - stale `cancelDevCardPlay` calls no longer clear YoP/Monopoly pending choices.
- Removed the cancel handler from the YoP/Monopoly dialog path so the modal only offers the forced confirmation flow.
- Wired timeout/bot handling for forced dev-card choices:
  - server timers dispatch `autoResolveDevCard` for `devCardChoice`,
  - Puffer bot fallback also auto-resolves the pending choice,
  - auto Year of Plenty chooses available finite-bank resources and still completes if fewer than two are available.
- Verification:
  - `pnpm exec vitest run app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/Moves.endTurn.test.js app/catana/__tests__/Moves.resign.test.js app/catana/__tests__/Game.placementPhase.test.js app/catana/__tests__/Game.debugMoves.test.js app/catana/__tests__/GameScreen.devCardPlay.test.js app/catana/__tests__/turnUiState.test.js server/__tests__/TimerManager.test.js server/__tests__/pufferBotManager.test.js server/__tests__/pufferStateAdapter.test.js server/__tests__/serverGameConfig.test.js --exclude='.worktrees/**'`
  - `pnpm exec eslint app/catana/Moves.js app/catana/Game.js app/catana/GameScreen.js app/catana/utils/turnUiState.js server/timers/TimerManager.js server/bots/pufferBotManager.js app/catana/__tests__/Moves.devCards.test.js app/catana/__tests__/Game.placementPhase.test.js app/catana/__tests__/GameScreen.devCardPlay.test.js app/catana/__tests__/turnUiState.test.js server/__tests__/TimerManager.test.js server/__tests__/serverGameConfig.test.js app/catana/__tests__/Game.debugMoves.test.js app/catana/__tests__/Moves.resign.test.js server/__tests__/pufferBotManager.test.js server/__tests__/pufferStateAdapter.test.js`

## Status (2026-04-30, duel balanced dice)
- Added ruleset-level dice modes:
  - standard keeps `diceMode: "random"`,
  - duel now uses `diceMode: "balanced"`.
- Added a deterministic balanced dice helper in `game-core`:
  - 36-card exact dice-pair deck,
  - reshuffle below 13 cards,
  - five-roll recent-total penalty,
  - Colonist-style 7 balancing by player and streak.
- Wired Catana live rolls so `rollDice` uses balanced state only when the ruleset asks for it; random mode still uses `random.D6(2)`.
- Added private match-scoped `G.diceState` for balanced games and masked it in `playerView` to expose only `{ mode: "balanced" }`.
- Design note: `docs/superpowers/specs/2026-04-30-balanced-dice-design.md`.
- Verification:
  - `pnpm -C game-core build`
  - `pnpm -C game-core test`
  - `pnpm exec vitest run app/catana/__tests__/Game.boardConfig.test.js app/catana/__tests__/stateMasking.test.js app/catana/__tests__/Moves.balancedDice.test.js`
  - Broader targeted Catana run still has an existing dev-card-choice failure in `app/catana/__tests__/Moves.gameLog.test.js`; the balanced-dice tests in that run passed.

## Status (2026-04-30, darker blue lobby default)
- Changed Catana's default blue treatment from `sky` to `royal`:
  - legacy `blue` identity ids now normalize to `royal`,
  - automatic seat fallback uses `royal` for the second color,
  - the color picker surfaces `royal` as the second swatch,
  - guest/bot match fallbacks use `royal` instead of `sky`.
- Curated the lobby color picker down to 12 visible choices while keeping the full palette available for stored identities and assets.
- Updated the swatch picker presentation for the curated set: larger swatches, intrinsic centered 4-column grid, and more breathing room.
- Reordered picker colors to lead with primary hues and keep black/white at the end.
- Verification:
  - Not run; value-only UI tuning per request.

## Status (2026-04-30, bottom HUD glass visual spike)
- Added a shared Catana HUD glass treatment for bottom gameplay chrome.
- Applied the treatment to:
  - the local action/resource dock shell,
  - dock action buttons,
  - local avatar stat panel,
  - opponent avatar stat panels,
  - opponent resource/dev-card panels.
- Nudged the turn-control cluster inward and moved dice slightly higher to reduce the bottom-right crowding.
- Increased dock button blur and opacity so underlying panel borders do not show through as strongly.
- Moved the dock disabled dimming filter off the button surface and onto the icon layer, then added an inner dock-button fill layer so the parent resource shell does not show through crisply.
- Removed dock-button overflow clipping so count badges can extend outside the button again, and made dock buttons use a mostly solid frosted fill because a child backdrop filter cannot reliably blur the parent resource shell.
- Moved dock-button backdrop blur onto the visible `::before` glass layer with a transparent button background so the button reads as frosted glass rather than a white solid tile.
- Removed the dock-button pseudo-element glass layer and put the translucent gradient, shadow, and `backdrop-filter` directly on `.catana-hud-dock-card`, matching the working dock/status-box pattern.
- Moved the action dock out of the resource shell so dock-button backdrop filters are no longer nested inside the parent `.catana-hud-glass` backdrop root.
- Reworked the avatar/stat transition so the avatar leads as the strong identity tile and the glass stat panel tucks behind with an asymmetric left edge.
- Flattened the stat panel's left edge and tucked it further under the avatar so the join does not show a visible rounded dip.
- Reduced the opponent resource/dev-card container radius so it reads as secondary chrome next to the avatar/stat unit.
- Widened the opponent resource/dev-card container slightly with more horizontal padding and stack gap.
- Reworked opponent HUD into one shared glass panel: road/army stats, a vertical divider, and resource/dev stacks now live inside the same stat panel behind the avatar.
- Replaced the tall-panel username experiment with a mounted glass nameplate above the compact opponent panel, kept the VP badge on the avatar's top-left, and nudged the top opponent row down for clearance.
- Softened the mounted nameplate by removing its hard border and increasing backdrop blur/saturation so it reads less like an outlined pill.
- Repositioned the mounted nameplate so its bottom sits on the compact panel's top edge and its center aligns with the stat/card panel.
- Restyled the mounted nameplate to match the main glass panel, with the bottom border omitted so it attaches visually to the panel below.
- Added a reversible avatar-tab nameplate variation using the player's avatar gradient, attached from the avatar side and extending over the shared opponent panel.
- Fixed the avatar-tab nameplate so its background explicitly uses the avatar gradient instead of being overridden by the base glass nameplate background, and increased its white outline to match the avatar tile treatment.
- Moved the avatar-tab nameplate so its bottom edge aligns with the top of the compact stat/card panel and restored its left white border.
- Shifted the avatar-tab nameplate left so its left edge aligns with the avatar tile.
- Repositioned the avatar-tab nameplate using the shared stat/card panel's center point for comparison.
- Reverted the avatar-tab nameplate experiment and restored the glass-themed mounted nameplate as the accepted direction.
- Shifted the glass-themed nameplate left over the avatar side for a quick comparison.
- Moved the opponent extended-layout VP badge from avatar top-left to avatar bottom-left.
- Verification:
  - Not run; visual spike per request.

## Status (2026-04-30, local resource dock count feedback)
- Added local resource dock count feedback:
  - the per-resource counts in `PlayerActionContainer` now render through `AnimatedCount`,
  - increases flash green with a small upward count motion,
  - decreases flash rose with a small downward count motion,
  - opponent hidden resource totals are unchanged.
- Fixed the dock loss animation selector so it is more specific than the generic decrease animation and the rose flash actually applies.
- Verification:
  - `pnpm exec vitest run app/catana/__tests__/PlayerActionBadges.test.js app/catana/__tests__/AnimatedCount.test.js`

## Status (2026-04-30, local resource count timing)
- Doubled the local resource dock count-change animation duration:
  - resource count enter/gain-loss flash: `220ms` -> `440ms`,
  - old-count exit: `180ms` -> `360ms`,
  - fallback clear timeout: `260ms` -> `520ms`.
- Verification:
  - `pnpm exec vitest run app/catana/__tests__/AnimatedCount.test.js`
  - `pnpm exec vitest run app/catana/__tests__/AnimatedCount.test.js app/catana/__tests__/PlayerActionBadges.test.js` still hits the current HUD-glass source-test mismatch in `PlayerActionBadges.test.js` (`ring-white/60` no longer present in the dirty working tree).

## Status (2026-05-01, left meta rail log lift)
- Raised the desktop left meta rail so the game log sits higher on the screen and gave the open feed panels more vertical room by increasing the shared open-height clamp.

## Status (2026-04-30, player color test maintenance)
- Updated stale player-color tests to match the current visual color contract:
  - legacy `blue` now canonicalizes to `royal`,
  - second-seat and bot fallback color expectations now use `royal`,
  - the lobby picker expectation now matches the curated 12-color order.
- Verification:
  - `pnpm exec vitest run app/catana/__tests__/playerColors.test.js app/catana/__tests__/LobbyPageClient.identity.test.js app/catana/__tests__/LobbyPageClient.playVsBot.test.js app/catana/__tests__/playerIdentityStorage.test.js app/catana/__tests__/playerView.test.js app/catana/__tests__/pieceAssets.test.js app/catana/__tests__/themeAssets.test.js app/catana/__tests__/GameScreen.playerColors.test.js app/catana/__tests__/playerColorsInGame.test.js app/catana/__tests__/playerAvatarStats.color.test.js app/catana/__tests__/GameOverModal.test.js app/catana/__tests__/PostgameOverlay.test.js`

## Status (2026-05-01, balanced dice masked-state rehydration)
- Hardened balanced dice so the first local roll can rehydrate from the masked player-view state:
  - `drawBalancedDice` now normalizes a partial `{ mode: "balanced" }` state before using the deck or seven counters,
  - the normalized state preserves the exact deck/counter behavior for real game state,
  - the first optimistic client-side roll no longer crashes when the balanced dice state has been player-view masked.
- Verification:
  - `pnpm -C game-core exec vitest run src/rules/balancedDice.test.ts`
  - `pnpm -C game-core build`
  - `pnpm -C game-core test`
  - `pnpm exec vitest run app/catana/__tests__/Moves.balancedDice.test.js app/catana/__tests__/Game.boardConfig.test.js app/catana/__tests__/stateMasking.test.js`

## Status (2026-05-01, local HUD shared seam)
- Reworked the local player HUD so the road/army stats and resource/dev-card rail now share one glass panel with a single internal divider, matching the opponent box seam treatment.
- Added a small `showStatsPanelNameplate` escape hatch on `PlayerAvatarStats` so the self HUD can reuse the shared shell without mounting the opponent-style nameplate.
- Verification:
  - `pnpm exec vitest run app/catana/__tests__/PlayerActionBadges.test.js app/catana/__tests__/PlayerActionContainer.hitbox.test.js app/catana/__tests__/TurnControlCluster.test.js --reporter=dot`

## Status (2026-04-30, dev-card purchase count timing)
- Changed `buyDevCardReveal` to a zero-duration bgio effect so the authoritative post-purchase board state can render immediately:
  - the local resource dock count decrements as soon as the buy move resolves,
  - `DevCardPurchaseReveal` still owns the visual reveal animation,
  - the local dev-card hand and VP badge remain frozen during the reveal.
- Added a source contract test for the non-blocking purchase reveal effect.
- Verification:
  - `pnpm exec vitest run app/catana/__tests__/GameScreen.devCardReveal.test.js --reporter=dot`

## Status (2026-04-30, dev-card shell entrance)
- Smoothed the local dev-card shell transition when a player goes from 0 to 1 dev cards:
  - empty forced-mounted shells stay invisible but keep their layout anchor for reveal destinations,
  - the visible shell fades and settles upward with the same short bouncy timing used for Catana game feedback,
  - reduced-motion users get the shell without the entrance animation.
- Verification:
  - `pnpm exec vitest run app/catana/__tests__/DevCardDisplayLayout.source.test.js app/catana/__tests__/DevCardDisplay.disabledStyle.test.js --reporter=dot`
  - `pnpm exec eslint app/catana/components/DevCardDisplay.js`

## Status (2026-05-06, chat minimize motion)
- Adjusted the desktop left meta rail chat minimize sequence so the chat panel collapses vertically first, then shrinks horizontally like the game log panel.
- Verification:
  - `pnpm exec eslint app/catana/components/LeftMetaRail.js`
  - `git diff --check -- app/catana/components/LeftMetaRail.js`

## Status (2026-05-06, chat glass touch-up)
- Lightly retuned the log/chat desktop feed frame toward the newer Catana HUD glass language with a softer border, lighter blue-white gradient, and calmer shadow.
- Updated the chat composer into a rounded glass input inside a subtler footer band, and muted the empty chat row so the open panel reads less like a flat blue sheet.
- Verification:
  - `pnpm exec eslint app/catana/components/ChatPanel.js app/catana/components/LeftMetaRail.js`
  - `git diff --check -- app/catana/components/ChatPanel.js app/catana/components/LeftMetaRail.js`

## Status (2026-05-06, utility button hierarchy)
- Rebalanced the peripheral control hierarchy:
  - softened the top-left mute/settings/rules buttons with a quieter glass fill and lighter shadow,
  - raised the log/chat compact toggles with a clearer frosted fill, stronger border, and darker icon,
  - gave desktop minimized log/chat buttons a slightly stronger restore-state glass treatment.
- Verification:
  - Not run; value-only UI tuning per request.

## Status (2026-05-06, mobile portrait game shell)
- Added a portrait phone shell for Catana:
  - `GameScreen` swaps the desktop local HUD for `MobilePlayerCockpit` below the phone-width breakpoint,
  - the mobile cockpit reuses the local player avatar/stats, resources, dev-card bay, Trade/Build/Dev actions, turn context, and a single large Roll/End Turn CTA,
  - the turn context strip keeps timer and dice result near the action area,
  - mobile Log/Chat buttons float above the cockpit, and the 1v1 opponent strip is moved below the top controls on phone.
- Extracted local dock/resource/action/timer derivation into `useLocalPlayerDockModel` so desktop and mobile share the same action model.
- Added a board layout override for mobile overlay HUDs so the board is sized from the phone viewport instead of desktop reserved HUD height.
- Verification:
  - `pnpm exec eslint app/catana/GameScreen.js app/catana/Board.js app/catana/utils/boardLayout.js app/catana/components/MobilePlayerCockpit.js app/catana/components/MobileTurnContextStrip.js app/catana/components/MobilePrimaryTurnButton.js app/catana/components/useLocalPlayerDockModel.js app/catana/components/PlayerActionContainer.js app/catana/components/LeftMetaRail.js app/catana/__tests__/GameScreen.mobileShell.source.test.js app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/MobilePrimaryTurnButton.test.js app/catana/__tests__/MobileTurnContextStrip.test.js app/catana/__tests__/useLocalPlayerDockModel.test.js app/catana/__tests__/utils/boardLayout.test.js`
  - `pnpm exec vitest run app/catana/__tests__/useLocalPlayerDockModel.test.js app/catana/__tests__/MobileTurnContextStrip.test.js app/catana/__tests__/MobilePrimaryTurnButton.test.js app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/GameScreen.mobileShell.source.test.js app/catana/__tests__/utils/boardLayout.test.js app/catana/__tests__/PlayerActionBadges.test.js app/catana/__tests__/PlayerActionContainer.hitbox.test.js app/catana/__tests__/PlayerActionContainer.status.test.js app/catana/__tests__/Dock.buildPickupUx.test.js app/catana/__tests__/TurnControlCluster.test.js app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/GameScreen.statusPresentation.test.js app/catana/__tests__/GameScreen.gameOver.test.js --reporter=dot`
  - `pnpm exec playwright screenshot --viewport-size=390,844 "http://localhost:3010/catana/dev/sandbox?viewportWall=1&capture=v4" output/playwright/catana-mobile-cockpit-390x844-portrait-focus-v4.png`

## Status (2026-05-07, mobile portrait top/side polish)
- Tightened the first mobile shell polish pass:
  - phone layouts pass `compact` to `OpponentPlayerBox`, scaling the existing shared opponent HUD down instead of creating a separate opponent component,
  - mobile Log/Chat controls now use smaller glass buttons with normal labels, stronger blur, and no old all-caps letter-spaced badge treatment,
  - the mobile meta rail sits above the board layer so the controls stay readable when the board overlaps the left edge.
- Verification:
  - `pnpm exec eslint app/catana/GameScreen.js app/catana/components/OpponentPlayerBox.js app/catana/components/LeftMetaRail.js app/catana/__tests__/OpponentPlayerBox.test.js app/catana/__tests__/LeftMetaRail.test.js`
  - `pnpm exec vitest run app/catana/__tests__/OpponentPlayerBox.test.js app/catana/__tests__/LeftMetaRail.test.js --reporter=dot`
  - `pnpm exec playwright screenshot --viewport-size=430,932 "http://localhost:3010/catana/dev/sandbox?viewportWall=1&capture=iphone14promax-polish-3" output/playwright/catana-mobile-cockpit-430x932-polish-3.png`

## Status (2026-05-07, mobile action dock order)
- Moved the mobile Trade/Build/Dev action dock above the local player resource bar so the resource bar reads as the stable inventory base of the cockpit.
- Added a source guard for the mobile cockpit ordering.
- Verification:
  - `pnpm exec eslint app/catana/components/MobilePlayerCockpit.js app/catana/__tests__/MobilePlayerCockpit.source.test.js`
  - `pnpm exec vitest run app/catana/__tests__/MobilePlayerCockpit.source.test.js --reporter=dot`
  - `pnpm exec playwright screenshot --viewport-size=430,932 "http://localhost:3010/catana/dev/sandbox?viewportWall=1&capture=iphone14promax-actions-above-resources" output/playwright/catana-mobile-cockpit-430x932-actions-above-resources.png`

## Status (2026-05-07, mobile top chrome)
- Moved the compact phone opponent strip up near the top of the viewport so it sits between the left mute control and right resign control.
- Changed the phone resign affordance from a text pill to a compact circular red-flag icon; desktop keeps the existing text pill.
- Verification:
  - `pnpm exec eslint app/catana/GameScreen.js app/catana/__tests__/GameScreen.mobileShell.source.test.js`
  - `pnpm exec vitest run app/catana/__tests__/GameScreen.mobileShell.source.test.js --reporter=dot`
  - `git diff --check -- app/catana/GameScreen.js app/catana/__tests__/GameScreen.mobileShell.source.test.js`

## Status (2026-05-08, mobile cockpit compact tray)
- Reworked the mobile bottom cockpit toward the compact tray direction:
  - replaced the mobile-only `PlayerAvatarStats` embed with a custom compact inventory strip,
  - floated the action dock half over the tray top edge,
  - kept road/army stats as small chips beside the avatar,
  - kept resources and the dev-card stack inline in the same inventory strip,
  - slimmed the turn context strip and detached the primary Roll/End Turn CTA below the tray.
- Verification:
  - `pnpm exec eslint app/catana/components/MobilePlayerCockpit.js app/catana/components/MobilePrimaryTurnButton.js app/catana/components/MobileTurnContextStrip.js app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/MobilePrimaryTurnButton.test.js app/catana/__tests__/MobileTurnContextStrip.test.js`
  - `pnpm exec vitest run app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/MobilePrimaryTurnButton.test.js app/catana/__tests__/MobileTurnContextStrip.test.js --reporter=dot`

## Status (2026-05-08, mobile cockpit identity sizing)
- Reduced the mobile local avatar tile and VP badge so the cockpit identity area is less dominant.
- Kept the mobile cockpit stat/resource number weights lighter while scaling the road/army chips and resource counts/icons back up for readability.
- Verification:
  - `pnpm exec eslint app/catana/components/MobilePlayerCockpit.js app/catana/__tests__/MobilePlayerCockpit.source.test.js`
  - `pnpm exec vitest run app/catana/__tests__/MobilePlayerCockpit.source.test.js --reporter=dot`
  - `git diff --check -- app/catana/components/MobilePlayerCockpit.js docs/agent/PROGRESS.md docs/agent/NOTES.md`

## Status (2026-05-08, mobile cockpit hierarchy cleanup)
- Flattened the mobile cockpit internals so the outer cockpit card is the main container:
  - removed the default inner resource-row border/background,
  - changed road/army from pill chips to simple icon+number stats,
  - softened the turn context strip so it reads as status text rather than a second framed panel.
- Verification:
  - `pnpm exec eslint app/catana/components/MobilePlayerCockpit.js app/catana/components/MobileTurnContextStrip.js app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/MobileTurnContextStrip.test.js`
  - `pnpm exec vitest run app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/MobileTurnContextStrip.test.js --reporter=dot`
  - `git diff --check -- app/catana/components/MobilePlayerCockpit.js app/catana/components/MobileTurnContextStrip.js docs/agent/PROGRESS.md docs/agent/NOTES.md`

## Status (2026-05-08, mobile cockpit outer frame removal)
- Removed the visible outer mobile cockpit frame; it is now only a layout wrapper.
- Promoted the local player/resource inventory row into the single primary glass rail, with the turn context strip and End Turn CTA remaining separate below it.
- Verification:
  - `pnpm exec eslint app/catana/components/MobilePlayerCockpit.js app/catana/components/MobileTurnContextStrip.js app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/MobileTurnContextStrip.test.js`
  - `pnpm exec vitest run app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/MobileTurnContextStrip.test.js --reporter=dot`
  - `git diff --check -- app/catana/components/MobilePlayerCockpit.js app/catana/components/MobileTurnContextStrip.js docs/agent/PROGRESS.md docs/agent/NOTES.md`

## Status (2026-05-08, mobile top turn context trial)
- Moved the mobile turn context strip out of the bottom cockpit and into the top phone HUD stack under the opponent box.
- Left the bottom cockpit focused on the floating action dock, inventory rail, and primary CTA.
- Verification:
  - `pnpm exec eslint app/catana/GameScreen.js app/catana/components/MobilePlayerCockpit.js app/catana/components/MobileTurnContextStrip.js app/catana/__tests__/GameScreen.mobileShell.source.test.js app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/MobileTurnContextStrip.test.js`
  - `pnpm exec vitest run app/catana/__tests__/GameScreen.mobileShell.source.test.js app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/MobileTurnContextStrip.test.js --reporter=dot`
  - `git diff --check -- app/catana/GameScreen.js app/catana/components/MobilePlayerCockpit.js app/catana/components/MobileTurnContextStrip.js app/catana/__tests__/GameScreen.mobileShell.source.test.js app/catana/__tests__/MobilePlayerCockpit.source.test.js docs/agent/PROGRESS.md docs/agent/NOTES.md`

## Status (2026-05-08, mobile vertical rhythm tweak)
- Lowered the phone opponent/status HUD stack slightly so it feels less pinned to the safe area.
- Increased spacing between the floating mobile action dock buttons.
- Verification:
  - `pnpm exec eslint app/catana/GameScreen.js app/catana/components/MobilePlayerCockpit.js app/catana/__tests__/GameScreen.mobileShell.source.test.js app/catana/__tests__/MobilePlayerCockpit.source.test.js`
  - `pnpm exec vitest run app/catana/__tests__/GameScreen.mobileShell.source.test.js app/catana/__tests__/MobilePlayerCockpit.source.test.js --reporter=dot`
  - `git diff --check -- app/catana/GameScreen.js app/catana/components/MobilePlayerCockpit.js app/catana/__tests__/GameScreen.mobileShell.source.test.js docs/agent/PROGRESS.md docs/agent/NOTES.md`

## Status (2026-05-08, mobile end-turn hold confirm)
- Changed the mobile End Turn CTA to require a 1s hold before firing, with a visible gradient fill progress affordance.
- Kept Roll Dice as a normal tap action and added Space/Enter hold support for keyboard users.
- Verification:
  - `pnpm exec eslint app/catana/components/MobilePrimaryTurnButton.js app/catana/__tests__/MobilePrimaryTurnButton.test.js`
  - `pnpm exec vitest run app/catana/__tests__/MobilePrimaryTurnButton.test.js --reporter=dot`
  - `git diff --check -- app/catana/components/MobilePrimaryTurnButton.js app/catana/__tests__/MobilePrimaryTurnButton.test.js`

## Status (2026-05-08, mobile native tap highlight)
- Scoped native mobile tap-highlight suppression to the Catana game screen so long-pressing HUD buttons does not show the browser's rectangular overlay.
- Kept keyboard focus styling intact by targeting tap highlight/callout/selection rather than removing focus rings.
- Verification:
  - `pnpm exec eslint app/catana/GameScreen.js app/catana/__tests__/GameScreen.mobileShell.source.test.js`
  - `pnpm exec vitest run app/catana/__tests__/GameScreen.mobileShell.source.test.js --reporter=dot`
  - `git diff --check -- app/catana/GameScreen.js app/globals.css app/catana/__tests__/GameScreen.mobileShell.source.test.js docs/agent/PROGRESS.md docs/agent/NOTES.md`

## Status (2026-05-08, mobile end-turn context menu suppression)
- Prevented the native context menu on the mobile End Turn hold button so releasing after a long press does not open the browser menu.
- Verification:
  - `pnpm exec eslint app/catana/components/MobilePrimaryTurnButton.js app/catana/__tests__/MobilePrimaryTurnButton.test.js`
  - `pnpm exec vitest run app/catana/__tests__/MobilePrimaryTurnButton.test.js --reporter=dot`
  - `git diff --check -- app/catana/components/MobilePrimaryTurnButton.js app/catana/__tests__/MobilePrimaryTurnButton.test.js docs/agent/PROGRESS.md docs/agent/NOTES.md`

## Status (2026-05-09, mobile dock context menu suppression)
- Prevented the native context menu on shared action dock cards so long-pressing Buy Dev or build/trade dock buttons does not open the browser menu.
- Verification:
  - `pnpm exec eslint app/catana/components/ActionsDock/DockCard.js app/catana/__tests__/Dock.buildPickupUx.test.js`
  - `pnpm exec vitest run app/catana/__tests__/Dock.buildPickupUx.test.js --reporter=dot`
  - `git diff --check -- app/catana/components/ActionsDock/DockCard.js app/catana/__tests__/Dock.buildPickupUx.test.js docs/agent/PROGRESS.md docs/agent/NOTES.md`

## Status (2026-05-09, mobile local stat parity)
- Aligned the mobile local road/army number treatment with the opponent `PlayerAvatarStats` style: larger type, fixed width, and matching shadow/award color.
- Verification:
  - `pnpm exec eslint app/catana/components/MobilePlayerCockpit.js app/catana/__tests__/MobilePlayerCockpit.source.test.js`
  - `pnpm exec vitest run app/catana/__tests__/MobilePlayerCockpit.source.test.js --reporter=dot`
  - `git diff --check -- app/catana/components/MobilePlayerCockpit.js docs/agent/PROGRESS.md docs/agent/NOTES.md`

## Status (2026-05-09, mobile local stat scale)
- Reduced the local mobile road/army number scale so it better matches icon size while preserving the opponent-style shadow treatment.
- Tightened the local stat group spacing near the inventory divider.
- Verification:
  - `pnpm exec eslint app/catana/components/MobilePlayerCockpit.js app/catana/__tests__/MobilePlayerCockpit.source.test.js`
  - `pnpm exec vitest run app/catana/__tests__/MobilePlayerCockpit.source.test.js --reporter=dot`
  - `git diff --check -- app/catana/components/MobilePlayerCockpit.js docs/agent/PROGRESS.md`

## Status (2026-06-13, board build-interaction boundary)
- Extracted board build-interaction derivation into `app/catana/utils/boardBuildInteraction.js`.
- `Board.js` now consumes pure helpers for local stage ownership, explicit road targets, main node targets, and passive build targets, leaving render state, DOM target registration, and effect listeners in the component.
- Replaced mirrored `buildableRoads` state with memoized derived data.
- Verification:
  - `pnpm exec vitest run app/catana/__tests__/boardBuildInteraction.test.js app/catana/__tests__/Board.passiveBuildHover.test.js app/catana/__tests__/Board.activePlayers.test.js app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/Board.robberPlacementUx.test.js app/catana/__tests__/boardPreviewTargets.test.js app/catana/__tests__/renderPerfGuards.test.js --reporter=dot`
  - `pnpm exec eslint app/catana/Board.js app/catana/utils/boardBuildInteraction.js app/catana/__tests__/boardBuildInteraction.test.js app/catana/__tests__/Board.passiveBuildHover.test.js app/catana/__tests__/Board.activePlayers.test.js app/catana/__tests__/renderPerfGuards.test.js`
  - `git diff --check`
  - Live sandbox smoke at `http://127.0.0.1:3100/catana/dev/sandbox?viewportWall=1`: board underlay rendered, 19 hex tiles were present, game-log content was visible, and browser warning/error logs were empty.

## Status (2026-06-13, GameScreen command-state boundary)
- Extracted visible dice, discard requirement, roll/end-turn command availability, and modal-blocking derivation into `app/catana/utils/gameScreenCommandState.js`.
- `GameScreen.js` now keeps the event handlers and render wiring while delegating pure turn-command state.
- Verification:
  - `pnpm exec vitest run app/catana/__tests__/gameScreenCommandState.test.js app/catana/__tests__/GameScreen.statusPresentation.test.js app/catana/__tests__/GameScreen.diceEffects.test.js app/catana/__tests__/GameScreen.interactionGuards.test.js app/catana/__tests__/turnUiState.test.js app/catana/__tests__/turnControlMode.test.js app/catana/__tests__/GameScreen.mobileShell.source.test.js app/catana/__tests__/renderPerfGuards.test.js --reporter=dot`
  - `pnpm exec eslint app/catana/GameScreen.js app/catana/utils/gameScreenCommandState.js app/catana/__tests__/gameScreenCommandState.test.js`
  - `git diff --check`
  - Live sandbox smoke at `http://127.0.0.1:3100/catana/dev/sandbox?viewportWall=1`: board underlay rendered, 19 hex tiles were present, game-log and Resign content were visible, and browser warning/error logs were empty.

## Status (2026-06-13, architecture refactor reference)
- Added `docs/agent/ARCHITECTURE_REFACTOR_2026-06-13.md` as a durable summary of the large architecture refactor.
- The note records the new setup, move, server-stage, board, GameScreen, and verification boundaries, plus deferred candidates for future work.
- Verification:
  - `git diff --check -- docs/agent/ARCHITECTURE_REFACTOR_2026-06-13.md docs/agent/PROGRESS.md docs/agent/NOTES.md`

## Status (2026-06-13, performance audit effects cleanup)
- Started the deep Catana performance audit in `/tmp/perf-settlex.md` with production build/route-weight evidence, dev-sandbox browser baselines, and route teardown notes.
- Hardened the first evidence-backed lifecycle issue: `AudioManager.destroy()` now unloads cached Howler instances and clears audio variant caches.
- Bounded `EffectBus` dedupe memory by pruning stale effect IDs after the dedupe window.
- Verification:
  - Red test run failed first for missing Howl unload and missing effect-bus dedupe-cache visibility.
  - `pnpm vitest run app/catana/__tests__/effects/AudioManager.test.js app/catana/__tests__/effects/EffectBus.test.js --exclude '.worktrees/**'`
  - Live sandbox smoke on an already loaded `/catana/dev/sandbox?viewportWall=1`: dispatched robber, award, and dev-card effect events; board stayed rendered with 19 hexes, no warning/error logs, and no failed requests.

## Status (2026-06-13, performance audit board flash cleanup)
- Hardened the second lifecycle issue from the performance audit: board resource/robber flash-clear timers are now tracked in a board-local registry and cleared on unmount.
- Kept flash timing behavior unchanged; the change only routes scheduled clears through a cleanup-aware helper.
- Verification:
  - Red guard failed first for missing board flash-timeout tracking.
  - `pnpm vitest run app/catana/__tests__/renderPerfGuards.test.js --exclude '.worktrees/**'`
  - `pnpm exec eslint app/catana/Board.js app/catana/__tests__/renderPerfGuards.test.js`
  - `git diff --check`
  - Live sandbox state check on loaded `/catana/dev/sandbox?viewportWall=1`: title `Settlehex`, board underlay present, 19 hexes, and game-log text visible.

## Status (2026-06-13, performance audit player-view masking)
- Optimized `maskPlayerView` after the engine/server benchmark identified whole-state JSON cloning as the largest non-bot hotspot.
- Replaced whole-`G` deep cloning with selective cloning: private player/deck/dice data is still cloned or masked, while large public board/topology surfaces are reused.
- Measured `playerView mask player 0` at `554.853 us/op` after the change, down from `21389.484 us/op` on the same generated-board fixture.
- Verification:
  - Red masking contract failed first on public-board identity with the old JSON-clone implementation.
  - `pnpm vitest run app/catana/__tests__/playerViewMasking.test.js app/catana/__tests__/stateMasking.test.js --exclude '.worktrees/**'`
  - `SETTLEX_PERF_ONLY=playerView node /tmp/settlex-engine-perf.cjs`
  - `pnpm exec eslint app/catana/gameSetup/playerView.js app/catana/__tests__/playerViewMasking.test.js`
  - `git diff --check`

## Status (2026-06-13, performance audit HUD timer render path)
- Reduced repeated HUD work on the `GameScreen` 250ms timer/presence tick path.
- Memoized opponent player derivation in `GameScreen`, memo-wrapped `OpponentPlayerBox`, and memoized longest-road/VP derivations in shared desktop/mobile player stat surfaces.
- Kept game-rule behavior unchanged; this is a render-waste reduction for unchanged board/player state during countdown updates.
- Verification:
  - `pnpm exec eslint app/catana/GameScreen.js app/catana/components/OpponentPlayerBox.js app/catana/components/PlayerAvatarStats.js app/catana/components/MobilePlayerCockpit.js`
  - `git diff --check`
  - Live in-app browser smoke at `http://127.0.0.1:3100/catana/dev/sandbox?viewportWall=1`: title `Settlehex`, 19 hexes, 3 opponent boxes, turn controls mounted, game-log text visible, and browser warning/error logs empty.

## Status (2026-06-13, performance audit dock render path)
- Reduced repeated local HUD/dock work during timer-driven rerenders.
- Stabilized desktop dock build/dev-card handlers in `PlayerActionContainer`, matching the mobile cockpit pattern.
- Replaced repeated per-action dock availability callbacks with one memoized `actionAvailability` object in `useLocalPlayerDockModel`.
- Corrected the earlier Puffer adapter benchmark: rerun measured about `327 us/op`, so the previous high value was stale/noisy and was not optimized.
- Verification:
  - `pnpm exec eslint app/catana/components/useLocalPlayerDockModel.js app/catana/components/PlayerActionContainer.js`
  - `git diff --check`
  - Desktop in-app browser smoke at `http://127.0.0.1:3000/catana/dev/sandbox?viewportWall=1`: title `Settlehex`, 19 `.hex` nodes, 5 dock cards, enabled dock actions present, resource counts visible, End Turn enabled, game log visible, and browser warning/error logs empty.
  - Mobile viewport smoke at `390x844`: 19 `.hex` nodes, mobile cockpit visible, 5 dock cards, 3 enabled dock actions, resource counts visible, `Hold to end turn` enabled, game log visible, browser warning/error logs empty; viewport reset afterward.

## Status (2026-06-13, performance audit dock anchor measurement)
- Removed an every-render layout measurement from the desktop local HUD path.
- `PlayerActionContainer` now remeasures the local dock anchor only when resource/dev-card HUD content changes, while the existing `ResizeObserver` still handles actual element resize/mount changes.
- Verification:
  - `pnpm exec eslint app/catana/components/PlayerActionContainer.js`
  - `git diff --check`
  - Desktop in-app browser smoke after reload: title `Settlehex`, 19 `.hex` nodes, 5 dock cards, 3 enabled dock actions, resource counts visible, End Turn enabled, game log visible, browser warning/error logs empty.
  - Mobile viewport smoke at `390x844` after reload: 19 `.hex` nodes, mobile cockpit visible, 5 dock cards, 3 enabled dock actions, resource counts visible, `Hold to end turn` enabled, game log visible, browser warning/error logs empty; viewport reset afterward.
