# UI keyboard shortcuts (space for roll/end)

## Goal
Add a clean, performant keyboard shortcut on the main Catana game screen so pressing Space rolls dice when possible, otherwise ends the turn when possible, and otherwise does nothing. The shortcut should be safe around inputs and modals.

## Scope
- Main Catana game screen only (`app/catana/GameScreen.js`).
- Space bar triggers `rollDice` when eligible; otherwise triggers `endTurn` when eligible.
- UI reflects eligibility (dice opacity/click guard; End Turn opacity/click guard).

## Non-goals
- No global shortcut registry or multi-shortcut system.
- No changes to game-core rules or server behavior.
- No new dependencies.

## Eligibility logic
Derived from core + ctx to avoid duplicating game rules:
- `canRoll`: current player + active stage `preRoll` + core `turn.phase === "preRoll"` + core `phase === "normal"`.
- `canEnd`: current player + active stage `postRoll` + core `phase === "normal"` + core `turn.hasRolled` + core `turn.phase === "postRoll"` + no pending discards.

These booleans are treated conservatively (missing data => not allowed) and shared by UI and shortcut.

## Shortcut handling
A `window` keydown listener in `GameScreen`:
- Handles `event.code === "Space"` only.
- Ignores repeats, modifier combos, and already-prevented events.
- Ignores events targeting editable elements (`input`, `textarea`, `select`, contenteditable) or inside one.
- Disabled while any modal is open (trade, discard, dev-card modal).
- Calls `preventDefault()` to avoid page scroll.
- Executes `rollDice` if `canRoll`, else `endTurn` if `canEnd`.

## UI behavior
- Dice opacity/click uses `canRoll` instead of inline checks.
- End Turn button mirrors dice behavior with lighter/disabled styling and click guard.

## Testing
- Manual: verify space rolls in preRoll, ends in postRoll, and does nothing otherwise.
- Manual: verify no action while a modal is open or focus is in an input.
- Manual: verify no scroll on space.
