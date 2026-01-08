# UI Render Maps Design

**Goal:** Update the Catana UI to render from `G.core` ownership data while deriving geometry from `G.tiles`.

## Summary
- The UI will no longer read `G.nodes` / `G.edges`.
- Board geometry stays in `G.tiles` (tile coordinates + per-tile node/edge direction data).
- Ownership lives in `G.core` (buildings and roads).

## Approach (Option A)
In `app/catana/Board.js`, build two memoized render maps from `G.tiles`:

- `nodeRenderById`: `nodeId -> { tile_coordinate, direction, tileId }`
- `edgeRenderById`: `edgeId -> { tile_coordinate, direction }`

Then render:
- Settlements/cities by iterating `G.core.buildingsByNodeId` and looking up render info in `nodeRenderById`.
- Roads by iterating `G.core.roadsByEdgeId` and looking up render info in `edgeRenderById`.
- Build actions (`G.valids.nodes`, `G.valids.edges`) as IDs only; look up render info in the same maps.

This keeps game-core authoritative for ownership and keeps UI geometry derived from tiles without adding extra state.
