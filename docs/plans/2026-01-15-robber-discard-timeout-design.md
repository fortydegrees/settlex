# Robber Discard Timeout - Design

## Context
Auto-discard timers should trigger during the robber discard stage, even when the current player is not one of the discarding players. The timer should discard for all pending players when it expires.

## Problem
TimerManager only looked at the current player's active stage to detect `robberDiscard`. When the current player is not discarding, no stage timer starts, so auto-discard never fires.

## Decision
Detect `robberDiscard` via core turn state (`G.core.turn.phase` / `pendingDiscards`) and dispatch `autoDiscard` for every pending player on timeout.

## Approach
- Stage detection: if `ctx.phase === "main"` and core turn indicates `robberDiscard` (or pending discards exist), treat the stage key as `main:robberDiscard`.
- Stage timeout: when `main:robberDiscard` triggers, capture the pending discards list and dispatch `autoDiscard` sequentially for each player ID.
- Turn timer remains paused during the discard stage, as before.

## Data Flow
TimerManager schedules the stage timeout from `onState()`. On timeout, it calls the server dispatch function for each pending player to execute `autoDiscard` moves.

## Testing
Add a TimerManager unit test that sets `pendingDiscards` for non-current players and confirms `autoDiscard` is dispatched for each pending player.
