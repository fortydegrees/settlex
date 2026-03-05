# Island Base Board Design

Date: 2026-03-05

## Goal
Add an abstract island/base behind the Catana land tiles so the board reads as one cohesive island instead of disconnected floating hexes.

## Non-Goals (v1)
- Add explicit water tiles or change board topology.
- Refactor board sizing, zoom, or placement geometry.
- Introduce realistic textures, painterly coastlines, or decorative props.
- Ship per-theme island artwork unless the shared underlay clearly fails.

## UX Summary
- At first glance, the board should read as a single island mass.
- The land tiles, tokens, pieces, and ports must remain the dominant visual layer.
- The island should feel designed for Catana's flat, bright look rather than copied from classic Catan art.

## Visual Direction
- Use a single abstract plate that follows the standard 19-tile board footprint.
- Shape: broad hex-like silhouette with gentle scalloping around the perimeter so it hints at coastline without becoming illustrative.
- Layers inside the art:
- muted warm-green interior land mass,
- thin warm sand rim,
- subtle outer shadow or water glow into the blue background.
- Keep the artwork flat/vector only. No texture fills, no woodgrain, no painterly beach treatment.

## Implementation Summary
- Add a dedicated SVG underlay asset at `public/svgs/board_island_base.svg`.
- Render the island as a separate, non-interactive board layer inside `app/catana/Board.js`, before tiles and effect/building layers.
- Size and position it from the existing `size` and `center` values already produced by `getBoardLayout(...)`.
- Use a small pure layout helper to convert `{ center, size }` into the underlay frame so sizing math is testable without rendering the whole board.
- Add a theme helper in `app/catana/theme/themes.js` even if all themes share the same asset in v1; that keeps a clean extension point for future overrides.

## Layering Rules
- The island underlay must sit below tiles, ports, buildings, action affordances, and effects.
- It must use `pointer-events: none` so it cannot intercept clicks or hover behavior.
- It should be marked decorative (`aria-hidden`) because it adds mood, not gameplay information.

## Acceptance Criteria
- The board no longer reads as disconnected floating hexes.
- The underlay remains visually secondary to tiles, number tokens, pieces, and ports.
- The island scales cleanly with the existing board layout on desktop and smaller mobile-style viewports.
- No road, settlement, city, robber, or port interaction is blocked or visually obscured.
- The result still feels consistent with Catana's flat, bright, glass-friendly design language.

## Testing
- Unit test the new theme helper that resolves the island asset path.
- Unit test the island frame/layout helper that converts board `size` and `center` into absolute positioning.
- Add a focused board-layering test to ensure the island base is rendered before tiles.
- Run visual QA in the live app at a normal desktop viewport and a smaller mobile-style viewport.
- During QA, confirm that ports, build affordances, robber placement, and effect overlays all remain above the island base.
