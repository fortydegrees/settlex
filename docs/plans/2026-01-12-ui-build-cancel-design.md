# UI Build-Action Cancel (Quality of Life) Design

## Goal
Allow players to cancel normal build actions (road, settlement, city) by clicking anywhere that is not an action circle, while still letting the clicked UI control execute. This should not apply during placement phase or when a build is triggered by dev cards (e.g. Road Building).

## Requirements
- Cancellable actions: `placeRoad`, `placeSettlement`, `placeCity` only.
- Not cancellable in placement phase (`ctx.phase === "placement"`).
- Not cancellable for dev-card flows (e.g. `roadBuilding`).
- Clicking non-action-circle UI should both cancel and still execute the clicked control.
- Clicking an action circle should not cancel and should place as usual.

## Approach
Add a capture-phase click handler on the GameScreen root that checks if the player is in a cancellable action and not in placement. If the click target is not inside an action circle, clear `playerAction`. Tag action circles with `data-action-circle="true"` on the `ActionNode` root element to allow quick hit testing with `closest()`.

This is a UI-only change. Core rules remain authoritative, and no move logic changes are needed.

## Data Flow / Component Touch Points
- `app/catana/GameScreen.js`: add `onClickCapture` to the root wrapper; uses `setPlayerAction(null)` when appropriate.
- `app/catana/ActionNode.js`: add `data-action-circle="true"` on the clickable node/edge circle so GameScreen can detect it.

## Error Handling
If a click target is missing or lacks `closest`, treat it as non-action-circle and cancel when allowed. Do not stop propagation; the original click continues and the UI control runs.

## Testing
Manual verification:
1) In main phase with `placeRoad`, `placeSettlement`, or `placeCity`, click empty board: action cancels.
2) In main phase, click Trade/End Turn/etc.: action cancels and the button still runs.
3) Click an action circle: does not cancel; placement proceeds.
4) In placement phase, clicking elsewhere does not cancel placement.
5) During dev-card Road Building, clicking elsewhere does not cancel.

Optional (later): add a small UI unit test around a `shouldCancel` helper.
