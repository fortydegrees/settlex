# Server Stage Timers Design

**Goal:** Extend server-side timers to cover placement, robber movement, and dev-card road building timeouts while keeping turn timer behavior consistent.

## Context
The server has a `TimerManager` that schedules stage timeouts and a post-roll turn timer. It currently handles `main:preRoll` (auto roll), `main:robberDiscard` (auto discard), and `main:postRoll` (auto end turn). Additional stages exist in game flow, including placement settlement/road and robber movement. Dev-card play is handled without adding a new stage (mono/yop are UI dialogs; road building is tracked via `G.devCardPlay`).

## Design
### Stage keys and timeouts
We continue using the stage key `${ctx.phase}:${ctx.activePlayers?.[ctx.currentPlayer] ?? ""}` with a single override: if `ctx.phase === "main"` and `G.devCardPlay?.type === "roadBuilding"` with `pendingRoads > 0` and `playerId === ctx.currentPlayer`, treat the stage key as `main:roadBuilding`.

Stage timeouts:
- `placement:settlement` -> 60s, `autoPlaceSettlement`
- `placement:road` -> 10s, `autoPlaceRoad`
- `main:robberDiscard` -> 20s, `autoDiscard` (existing)
- `main:moveRobber` -> 20s, `autoMoveRobber`
- `main:preRoll` -> 5s, `autoRoll` (existing)
- `main:roadBuilding` -> 10s, `autoPlaceRoad`

We explicitly **skip steal-target and dev-card choice timers** (mono/yop dialogs). The road-building timer is stage-like: it pauses the turn timer and clears as soon as `G.devCardPlay` is removed.

### Turn timer interaction
When any stage timer is active (including `main:roadBuilding`), the post-roll turn timer is paused. The turn timer is reset on turn changes and resumes for `main:postRoll` stages.

## Testing
Extend `server/__tests__/TimerManager.test.js` with fake timers to validate:
- placement settlement/road stage timeouts dispatch correct auto moves
- moveRobber stage timeout dispatches `autoMoveRobber`
- roadBuilding override dispatches `autoPlaceRoad` and pauses the turn timer

## Risks
Low: logic stays within `TimerManager` and does not modify client/UI behavior or core rules.
