# Generated Island Underlay Design

Date: 2026-03-07

## Goal
Replace the current hand-shaped Catana island underlay with a reproducible SVG generated from the actual standard 19-land-tile board footprint, while keeping the change entirely in the UI layer.

## Why This Direction
- The previous manual SVG underlay was too tied to one hand-authored silhouette and repeatedly drifted away from the real board shape.
- A full engine-level `land / water / port` migration would be cleaner long-term, but it is too intrusive for launch scope.
- The current launch board shape is fixed, so the best practical solution is to derive the underlay once from the real hex layout, check the SVG into the repo, and render it as a static asset.

## Non-Goals
- No `game-core` topology or rules changes.
- No explicit authoritative water tiles in the engine yet.
- No per-edge coastline component system.
- No runtime polygon union or underlay generation on every render.
- No theme-specific underlay variants in this pass.

## Constraints
- Launch only needs the current standard board footprint.
- The board already supports zoom/pan; the underlay only needs to scale and position correctly with existing board layout math.
- The underlay must remain decorative and never intercept input.
- Avoid new dependencies if the geometry can be produced with small local utilities.

## Decision Summary
The approved approach is:

1. Generate the board underlay geometry from the current standard land hex footprint.
2. Export one checked-in SVG asset for launch.
3. Render that SVG as a static, non-interactive underlay in the Catana board.
4. Keep a small local generator script in the repo so the asset can be regenerated later instead of redrawn by hand.

This is intentionally a launch-scoped compromise between the two extremes:
- not a hard-drawn arbitrary island blob,
- not a full native water-tile migration yet.

## Rejected Alternatives

### 1. Keep hand-editing one island SVG
Rejected because it is not meaningfully tied to the real board footprint and became a taste-driven iteration trap.

### 2. Add edge-based coast strips and corner joiners
Rejected because it is more rendering complexity than needed for launch and creates unnecessary piece-composition problems.

### 3. Migrate the engine to native land/water/port map topology now
Rejected for launch because it touches board specs, generation, rendering, and tests much more broadly than this problem warrants.

## Geometry Model
The underlay should be derived from the actual land hex geometry, not from screenshots.

Canonical generation pipeline:

1. Start from the current standard land tile coordinates.
2. Convert each land tile into a hex polygon using the same coordinate system already used by Catana board rendering.
3. Collect all hex edges.
4. Remove edges shared by two adjacent land tiles.
5. Order the remaining outer edges into one closed perimeter loop.
6. Expand the loop outward by a fixed amount.
7. Round or smooth the corners enough to feel intentional, while keeping the silhouette clearly board-shaped rather than blob-like.
8. Generate layered paths from that perimeter for the final SVG art.

The important property is reproducibility: the shape should come from code and board geometry, not hand tracing.

## Asset Strategy
The generator should output one static asset for launch, for example:

- `public/svgs/board_underlay_standard.svg`

That SVG should contain the full layered underlay artwork:
- outer blue transition band,
- pale surf band,
- sand body,
- inner muted land tint.

The runtime board should only load and position this asset. It should not rebuild geometry during normal React renders.

The generator itself should live in the repo as a local script so the asset can be regenerated later if:
- the board footprint changes,
- the styling ratios change,
- or the team later adds custom map support.

## Runtime Integration
Runtime work stays in `app/catana` only.

Recommended integration shape:
- replace the current island-base variant plumbing with one single underlay asset resolver,
- keep a small board-relative frame/layout helper so placement remains deterministic and testable,
- mount the underlay before land tiles in `app/catana/Board.js`,
- keep `pointer-events: none` and `aria-hidden`.

Render order:
1. page water background
2. generated board underlay SVG
3. land tiles
4. ports
5. roads, settlements, cities, robber, and action affordances
6. effects

## Visual Direction
The underlay should still feel like a background mass behind the tiles, not a literal textured island.

Art rules:
- flat/vector only,
- no noisy sand textures,
- no intricate beach illustration,
- no per-edge decorative props,
- gentle curves, but still recognizably based on the board footprint.

Color/layer rules:
- one sand/land body,
- one inner land tint,
- two light water-transition tones,
- all visually secondary to the actual land tiles.

## Testing
Testing should focus on reproducibility and placement, not gameplay.

Required checks:
- geometry helper test for stable outer-boundary derivation from the standard land tile footprint,
- frame/layout helper test for deterministic placement from `size` and `center`,
- theme asset helper test for the new single underlay asset path,
- board-layering test confirming the underlay renders before land tiles and does not interfere with interaction,
- manual visual QA in the live Catana board at desktop and smaller viewport sizes.

## Cleanup / Superseded Direction
This design supersedes the previous manual multi-variant island-base direction:
- `board_island_base_tight.svg`
- `board_island_base_medium.svg`
- `board_island_base_broad.svg`

Those files and the associated variant-selection plumbing should be removed once the generated underlay is in place.

## Future Evolution
If Settlex later supports non-standard maps or explicit water gameplay, the long-term direction is still native map topology with explicit land/water/port cells.

This design keeps that path open by:
- deriving the asset from geometry instead of hand art,
- isolating the current solution to UI-only code,
- and preserving a generator that can later be upgraded from “generate once for the standard board” to “generate per board shape”.
