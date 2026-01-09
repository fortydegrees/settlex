# Core End-Turn Helper Design

## Goal
Centralize end-turn transitions in `game-core` so UI no longer owns turn resets. Ending a turn should be legal only when the current player has rolled and any robber/discard work is complete.

## Contract
Add `applyEndTurn(state)` in `game-core/src/rules/turnFlow.ts`.

**Legal when:**
- `state.phase === "normal"`
- `state.turn.hasRolled === true`
- `state.turn.phase === "postRoll"`
- `state.turn.pendingDiscards.length === 0`
- Disallow end-turn if `turn.phase` is `robberDiscard`, `robberMove`, or `robberSteal`

**Effects on success:**
- Advance `turn.currentPlayerId` to next id in `state.players` (wrap).
- Reset turn flags: `turn.phase = "preRoll"`, `turn.hasRolled = false`, `turn.lastRollTotal = null`, `turn.pendingDiscards = []`.
- Reset per-turn dev card flags for the player ending the turn:
  - `devCardsBoughtThisTurn = []`
  - `devCardsPlayedThisTurn = 0`

## Tests
Add unit tests in `game-core/src/rules/turnFlow.test.ts`:
- Happy path: advances player, resets turn fields and dev-card-per-turn fields.
- Blocked: cannot end if `hasRolled` false or phase not `postRoll`.
- Blocked: cannot end with `pendingDiscards` or `robber*` phases.
- Wraparound: last player advances to first.

## UI Integration
Add `moves.endTurn` in `app/catana/Moves.js` that calls `applyEndTurn(G.core)` and logs on error. The End Turn button should call this move (no need to call `events.endTurn()` in normal play).

