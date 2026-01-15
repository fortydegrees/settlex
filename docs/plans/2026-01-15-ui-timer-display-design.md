# UI Timer Display Design

**Goal:** Show a single, authoritative timer in the bottom-right UI that reflects the active stage timer when present, otherwise the turn timer, using server-sourced remaining time that survives reconnects.

## Context
TimerManager now owns stage and turn timers on the server. The client currently has no timer data. We want a lightweight UI display (mm:ss) near the status text in the bottom-right panel, consistent with the existing blue/rounded styling. Accuracy on reconnect matters.

## Approach
### Server snapshot on updates
Attach a timer snapshot to each server update/patch payload via `timerPubSub`, computed by TimerManager:
- If a stage timer is active (placement, preRoll, robberDiscard, moveRobber, roadBuilding), return that.
- Otherwise, if the turn timer is active (postRoll), return that.

TimerManager tracks stage start time and duration and computes remaining time based on `Date.now()` without persisting in game state. This avoids touching deterministic game state.

### Seed endpoint for initial sync (one-time)
Add a lightweight HTTP route on the game server:
`GET /timer/:matchID`

The endpoint returns the same timer snapshot + `serverTimeMs`, used only when the client has no snapshot yet.

Payload example:
```json
{ "matchID": "default", "timer": { "kind": "stage", "remainingMs": 12000, "totalMs": 20000, "stageKey": "main:moveRobber" }, "serverTimeMs": 1700000000000 }
```

### Client snapshot + local countdown
The UI consumes `timerSnapshot` from state updates, then counts down locally based on `Date.now()` since receipt (adjusted by server time). If the snapshot is missing on initial sync, it performs a single seed fetch. This yields accurate time on reconnect and smooth display between updates.

### UI placement
Place the timer to the right of the existing status text in `PlayerActionContainer`, using a small rounded pill with the same blue + ring styling used in the action dock. Display is `mm:ss` only.

## Risks
- Seed endpoint is a best-effort fallback; if unavailable, UI hides timer until the next state update.

## Testing
- Add TimerManager unit tests for `getTimerSnapshot` (stage vs turn, remaining time decreases).
- Add timerPubSub tests ensuring snapshots attach to update/patch payloads.
- Manual UI verification: timer appears near status text and counts down; switches between stage/turn timers.
