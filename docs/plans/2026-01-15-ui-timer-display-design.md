# UI Timer Display Design

**Goal:** Show a single, authoritative timer in the bottom-right UI that reflects the active stage timer when present, otherwise the turn timer, using server-sourced remaining time that survives reconnects.

## Context
TimerManager now owns stage and turn timers on the server. The client currently has no timer data. We want a lightweight UI display (mm:ss) near the status text in the bottom-right panel, consistent with the existing blue/rounded styling. Accuracy on reconnect matters.

## Approach
### Server snapshot endpoint
Add a lightweight HTTP route on the game server:
`GET /timer/:matchID`

The endpoint returns a timer snapshot computed by TimerManager:
- If a stage timer is active (placement, preRoll, robberDiscard, moveRobber, roadBuilding), return that.
- Otherwise, if the turn timer is active (postRoll), return that.

Payload example:
```json
{ "matchID": "default", "timer": { "kind": "stage", "remainingMs": 12000, "totalMs": 20000, "stageKey": "main:moveRobber" }, "serverTimeMs": 1700000000000 }
```

TimerManager will track stage start time and duration and compute remaining time based on `Date.now()` without persisting in game state. This avoids touching deterministic game state.

### Client polling + local countdown
The UI polls the endpoint every ~2s (or 1s if we want smoother correction), stores the server snapshot, and renders a local countdown based on `Date.now()` since receipt. This yields accurate time on reconnect and smooth display between polls.

### UI placement
Place the timer to the right of the existing status text in `PlayerActionContainer`, using a small rounded pill with the same blue + ring styling used in the action dock. Display is `mm:ss` only.

## Risks
- Server endpoint adds a small polling load; rate kept low.
- If timer data is unavailable (match not found), UI hides timer.

## Testing
- Add TimerManager unit tests for `getTimerSnapshot` (stage vs turn, remaining time decreases).
- Manual UI verification: timer appears near status text and counts down; switches between stage/turn timers.
