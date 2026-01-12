# Core Game-End Design

## Goal
End the game immediately when the active player reaches or exceeds the victory point threshold during the normal phase, with the core engine as the single source of truth.

## Rules/Decisions
- Only end the game during `state.phase === "normal"` (not placement).
- Only the acting player can trigger a win; use `state.turn.currentPlayerId` for validation.
- Winning condition is `getVictoryPoints(state, actingPlayerId) >= ruleset.victoryPointsToWin`.
- End should occur immediately after the action that grants the points.

## Core Contract
Add to `GameState`:
- `gameOver: { winnerId: string; reason: "victoryPoints" } | null`

Add helper in `game-core/src/rules/victory.ts`:
- `checkAndApplyWin(state, actingPlayerId)`
  - return early if `state.phase !== "normal"` or `state.gameOver` is already set.
  - return early if `actingPlayerId !== state.turn.currentPlayerId`.
  - if `checkWin(state, actingPlayerId)` is true, set `state.gameOver`.

## Trigger Points
Call `checkAndApplyWin` after any action that can change victory points or awards, including:
- Settlement/city placement (including initial placement actions).
- Road placement/free road (after recomputing longest road).
- Knight play (after recomputing largest army).
- Playing a victory point dev card.

## UI/Server Integration
- In `app/catana/Game.js` main phase `endIf`, return `G.core.gameOver` when set.
- No additional UI logic required for correctness; UI can optionally display the winner from core state.

## Tests
- `game-core/src/rules/victory.test.ts`:
  - does not end game during placement phase.
  - ends game immediately when the current player crosses threshold.
  - does not end when a non-current player has enough points.
