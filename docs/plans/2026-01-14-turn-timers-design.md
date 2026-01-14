# Turn Timers Design (Server-Enforced)

## Goal
Add server-enforced timers for turns and stages without forking boardgame.io. Timeouts should trigger deterministic auto-actions (randomized via boardgame.io RNG) and keep the main turn timer paused while short stage timers run.

## Non-Goals (for now)
- Persist timers across server restarts.
- Full game-mode configuration system.
- Framework-level changes to boardgame.io.

## Constraints
- Server authoritative: clients cannot decide timeouts.
- Deterministic outcomes: no `Math.random`; use `ctx.random`.
- Avoid framework fork; keep changes in app/server code.

## Architecture
- **TimerManager (server-side):**
  - Tracks per-match timing state (phase, stage, current player, remaining turn budget).
  - Owns all `setTimeout` handles.
  - Schedules either a **stage timeout** or **turn timeout** based on current game state.
  - Clears/resets timers on state changes.
- **State change hook:**
  - Provide a custom `pubSub` implementation to `SocketIO({ pubSub })`.
  - The pubSub intercepts `publish(MATCH-<id>, payload)` and forwards updates to TimerManager.
  - TimerManager inspects `payload.state.ctx` (phase, currentPlayer, activePlayers) to derive stage.
- **Timeout actions:**
  - TimerManager dispatches synthetic move actions via a server-side `Master.onUpdate(...)` call.
  - These actions correspond to explicit auto-moves defined in `app/catana/Moves.js`.

## Timer Model
Two timers per match:
1) **Turn timer (budget):** counts down during normal turn flow (post-roll).
2) **Stage timer:** short timer for stage-specific decisions (pre-roll, discard, robber, placement, dev-card choices).

When a stage timer is active, the turn timer is paused. When the stage auto-resolves, the remaining turn time resumes.

### Default durations (initial hardcoded)
- Placement/settlement: 60s
- Placement/road: 10s
- Main/preRoll: 5s
- Main/postRoll (turn budget): 45s
- Discard (rolled 7): 20s
- Robber placement: 20s
- Steal target: 15s
- Dev-card choice: 10–15s

### Time extensions (initial hardcoded)
On certain actions (bank trade, build road/settlement/city, buy dev, play dev), add +10s to the remaining turn budget. Optional cap can be enforced (e.g., max +30s per turn).

## Auto-Moves (Server Only)
Add explicit moves for timeout resolution. These should be named `auto*` and use `ctx.random`.

- `autoRoll` (preRoll timeout)
- `autoPlaceSettlement`, `autoPlaceRoad` (placement)
- `autoDiscard` (discard stage)
- `autoMoveRobber` (robber stage)
- `autoChooseSteal` (steal target stage)
- `autoResolveDevCard` (dev-card choice stage)
- `autoEndTurn` (turn budget timeout if no stage active)

Auto-moves must verify they are still in the expected phase/stage before acting. Use the same validation and helpers as the standard moves to guarantee legality.

## Logging
- Auto placements, robber actions, discards, and dev-card choices should be logged as auto-actions.
- Auto roll and auto end-turn do not need explicit log entries.

## Error Handling
- Timer callbacks re-check match state before acting; no-ops if state advanced.
- If an auto-move returns `INVALID_MOVE` or no-ops, clear the stage timer and resume turn time.
- Wrap timer callbacks to avoid server crashes on unexpected errors.

## Testing
- Unit tests for auto-move legality and deterministic selection.
- TimerManager integration test with fake timers + mocked pubSub publish.
- Manual multiplayer validation with staged timeouts.

## Future Config
The hardcoded timer table can later move into a `ruleset` or mode config (e.g., `fast`, `casual`, 1v1 defaults).
