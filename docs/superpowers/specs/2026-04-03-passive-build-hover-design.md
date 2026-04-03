# Passive Build Hover Design

## Goal
Add a desktop-only quality-of-life interaction that lets experienced players build roads, settlements, and cities directly from the board by hovering a valid target and clicking it, without first pressing the matching dock action.

## Non-goals
- No mobile or touch-specific interaction changes.
- No changes to placement phase behavior.
- No changes to explicit dock build behavior.
- No "show all valid build locations" mode during passive hover.
- No game-rule or engine-authority changes.

## UX Summary
During a normal turn, if the local player is the active `postRoll` player and has not armed an explicit build action from the dock, the board stays visually quiet until the cursor hovers a valid build target:

- Hovering a valid road edge reveals the existing road preview and allows click-to-build.
- Hovering a valid open settlement node reveals the existing settlement preview and allows click-to-build.
- Hovering one of the player's settlements that can be upgraded reveals the existing city-upgrade preview and allows click-to-build.

Only the currently hovered valid target shows a preview. Nothing global is highlighted by default.

If the player clicks `Road`, `Settlement`, or `City` in the dock, the current explicit-mode behavior remains unchanged and passive hover affordances are disabled until that mode exits.

## Architecture + Data Flow
1. Keep `playerAction` as the explicit dock-driven interaction state. Do not reuse it for passive hover.
2. In `app/catana/Board.js`, derive a `passiveBuildEnabled` gate:
   - current player perspective only
   - `ctx.phase === "main"`
   - local active stage is `postRoll`
   - `playerAction == null`
   - no dev-card road-building placement in progress
   - no other special interaction stage such as robber movement
3. When `passiveBuildEnabled` is true, derive three legal target sets from current state:
   - passive road edges: `canBuildRoad(...)` plus `buildableEdges(...)`
   - passive settlement nodes: `canBuildSettlement(...)` plus `buildableNodes(...)`
   - passive city nodes: `canBuildCity(...)` plus owned settlement node ids
4. Render passive hit areas only for those legal targets. The hit areas remain invisible until hovered.
5. Reuse the existing click path for successful builds:
   - road -> `moves.placeRoad(edgeId)`
   - settlement -> `moves.placeSettlement(nodeId)`
   - city -> `moves.placeCity(nodeId)`
6. Reuse the existing local suppression/reset behavior after a click:
   - call `handleBuildCommit()`
   - clear hover state
   - do not touch `playerAction`, because passive mode only exists when it is already `null`
7. Keep explicit dock mode rendering as the higher-priority branch. If `playerAction` is set to `placeRoad`, `placeSettlement`, or `placeCity`, render today's full valid-target behavior and skip passive rendering entirely.

## Rendering Notes
- Roads already have a passive-oriented hover path in `app/catana/Edge.js`; finish wiring that path from `app/catana/Board.js` instead of inventing a second road-preview system.
- Settlements and cities should reuse `app/catana/ActionNode.js` preview rendering rather than introducing a different hover visual.
- Passive city hover should plug into the same settlement-hiding logic already used by explicit city placement so the underlying settlement does not double-render during hover or drop.
- Passive hit areas should remain invisible when not hovered, so the board does not look busy.

## File-Level Changes
- `app/catana/Board.js`
  - derive passive build gate and legal target sets
  - render passive road/settlement/city targets only when explicit build mode is inactive
  - extend existing city-hover suppression so passive city hover behaves like explicit city hover
- `app/catana/Edge.js`
  - reuse or slightly tighten the existing hoverable edge branch for passive road build
  - preserve current explicit placement branch unchanged
- `app/catana/ActionNode.js`
  - support passive node hover without showing the idle action circle
  - keep current explicit placement visuals unchanged
- tests under `app/catana/__tests__/`
  - cover passive gating and hover/click behavior

## Guardrails
- Passive hover must never activate during placement, `preRoll`, discard, robber move, or road-building dev-card resolution.
- Passive hover must disappear immediately when explicit dock build mode is armed.
- Passive targets must be derived fresh from authoritative state on each render; do not cache stale legality.
- The feature remains desktop-focused for now; no attempt to emulate hover semantics on coarse pointers.

## Tests
- Add board interaction tests confirming passive previews do not render until hover.
- Add tests confirming passive road/settlement/city click paths call the same moves as explicit placement.
- Add gating tests confirming passive mode is disabled when:
  - `playerAction` is set
  - phase is `placement`
  - active stage is not `postRoll`
  - road-building dev-card placement is active
- Add a regression test confirming explicit dock behavior still shows all valid targets as it does today.

## Open Questions
- None for v1. The approved scope is desktop-only passive hover build during normal `postRoll`, with dock behavior unchanged.
