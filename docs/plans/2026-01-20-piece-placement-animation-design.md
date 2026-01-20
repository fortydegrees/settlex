# Piece Placement Animation (Drop + Dust) Design

## Goal
Add a fun, readable placement animation for settlements and roads, with a shared sound cue, using the existing effects system so UI stays thin and effects remain deterministic.

## Non-goals
- No new sound assets (reuse an existing sound).
- No gameplay rule changes.
- No complex cinematic camera or pathing.

## UX Summary
When a settlement or road is placed, the piece drops a short distance from above its landing spot, squashes slightly on impact, then settles. A soft dust ring pulses outward at the impact point. A shared placement sound plays at impact. Total duration ~450–650ms.

## Architecture + Data Flow
1. Move handlers (`placeSettlement`, `placeRoad`) trigger a new effect: `effects.placePiece({ pieceType, id, playerId, initialPlacement })`.
2. Effects plugin declares `placePiece` with a short duration to allow sequencing.
3. `GameEffects` listens for the `placePiece` effect and emits a bus event (e.g., `build:place`) with a stable `effectId` like `build:${pieceType}:${id}` to avoid duplicate triggers.
4. `effects/registry.js` maps `build:place` to a GSAP runner in `effects/placePiece.js`.
5. The runner creates temporary DOM elements inside `EffectLayer` (overlay piece + dust ring) and animates them. On impact, it calls `emitCue('build:place')`.

## Rendering + Positioning
- The runner uses `buildRenderMaps(G.tiles)` and `getBoardLayout({ width, height })` to resolve node/edge geometry.
- It computes the absolute landing position with `tilePixelVector` + `getNodeDelta` / `getEdgeDelta`, then offsets by the board DOM rect.
- The overlay piece uses the same SVG as the placed piece: `/svgs/${pieceType}_${color}.svg`.

## Sound
- Add `build:place` to `soundThemes.js` using an existing sound (e.g., `/sounds/ui-pop-resource-out.mp3`).
- Shared sound for settlements and roads.

## Guardrails
- Skip animation when `document.hidden`.
- Early-return if layout or render maps are missing.
- Pointer events remain disabled on overlay elements.

## Tests
- Update `effects/registry.test.js` to assert `build:place` is registered.
- Add a Moves test asserting `effects.placePiece` is called after successful settlement/road placement.

## Open Questions
- Should auto-placement (forced placement) also trigger the animation? (Assume yes for now.)
