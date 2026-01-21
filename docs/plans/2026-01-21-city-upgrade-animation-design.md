# City Upgrade Animation Design

## Goal
Improve the city upgrade UX so the hover highlight sits directly on the node, hides the existing settlement while highlighted, and plays the standard placement animation/sound on confirm.

## Non-goals
- No new sound assets.
- No rules or move validation changes.
- No hover audio.

## UX Summary
- Hovering a buildable city node shows a static, on-node city highlight (flash/opacity pulse, no bounce).
- The underlying settlement is hidden only while that specific node is highlighted.
- On click/confirm, the settlement disappears immediately (no animation) and the city drop animation plays (same as settlement placement) with the same sound.

## Architecture + Data Flow
1. `Board` tracks hovered node and a short-lived `pendingCityNodeId` after click to avoid flicker.
2. `Node` rendering skips settlement visuals if the node matches the hovered/pending city upgrade.
3. `ActionNode` renders a `Piece` highlight without bounce and with a flash class when `buildingType === "city"`.
4. `placeCity` move emits `effects.placePiece({ pieceType: "city", id, playerId })` after successful upgrade.
5. `createPiecePlacementRunner` handles `pieceType === "city"` by reusing the settlement drop animation but swapping to the city SVG. It emits the same placement sound cue (either `build:city` mapped to the settlement sound, or directly `build:settlement`).

## Rendering + Positioning
- Hover highlight uses the same positioning as placed pieces; no vertical offset change.
- Flash is driven by CSS opacity (no GSAP on hover).
- The placement animation uses the existing GSAP drop/squish/dust sequence.

## Sound
- No hover sound.
- City placement uses the same sound as settlement placement.

## Guardrails
- Only hide the settlement for the hovered/pending node.
- Clear `pendingCityNodeId` once the core state reflects a city at that node.
- Skip animations when `document.hidden`.

## Tests
- Update `Moves.placePieceEffects` to assert `effects.placePiece` is called for city upgrades.
- Update effects wiring tests to include `build:city` (if added as a cue).

## Open Questions
- Whether to emit a distinct `build:city` cue or reuse `build:settlement` directly. (Default: distinct cue mapped to the settlement sound.)
