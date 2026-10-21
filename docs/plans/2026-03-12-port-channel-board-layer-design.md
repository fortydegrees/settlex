# Catana Port Channel Board Layer Design

Date: 2026-03-12

## Goal
Replace the separate rotated port bridge pieces with a board-level visual channel that makes each port feel embedded into the shoreline while keeping the existing circular port marker and rate badge.

## Approved Direction
- Keep the current circular port marker and bottom `2:1` / `3:1` badge.
- Remove the old standalone pier/bridge look as the primary connector treatment.
- Add one tapered shoreline channel per port between the board underlay and the tile layer.
- Let the channel sit behind land tiles and port markers, but in front of the static underlay.

## Why This Direction
- The current bridges still need hand-tuned offsets and look imported from a different art system.
- The mockup works because the connector reads as part of the coast, not as a separate object.
- The standard board already has a stable fixed layout, so a board-level visual layer is simpler than continuing per-port bridge geometry tweaks.

## Visual Rules
- Outer band: warm sand, matching the coastline band.
- Inner channel: pale blue-white, subtle, not saturated.
- Shape: one short tapered connector from the coast toward the port token.
- No plank lines, wood grain, or literal bridge details.
- The port token remains the main identity; the channel only communicates access.

## Layering
From back to front:
1. `BoardUnderlay`
2. `BoardPortChannels`
3. land tiles and port markers
4. placed roads / settlements / cities
5. action highlights

This keeps the connector integrated with the map while ensuring roads and buildings still dominate gameplay readability.

## Scope
- Standard board only.
- No rules changes.
- No runtime topology changes.
- No new theme-specific asset matrix unless needed later.

## Implementation Shape
- Add a new `BoardPortChannels` component in `app/catana/`.
- Render an absolute full-board SVG so it can use the same tile-center coordinate math as the rest of the board.
- For each `TileTypes.PORT`, derive one channel from the board-facing edge of the port tile toward the marker center.
- Stop rendering the old per-port connector divs in `Port`.

## Testing
- Add a board-layering regression that asserts the new layer renders between underlay and tiles.
- Add a render test for `BoardPortChannels` that verifies one channel group per port.
- Update port rendering tests to reflect marker-only port rendering.
- Manual browser QA for visual alignment on the standard board.
