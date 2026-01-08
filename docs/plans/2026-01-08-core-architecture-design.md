# Core Engine Architecture Design

**Goal:** Establish a clean, deterministic Catan core engine in `game-core` with a stable state model, centralized rules, and cacheable derived data, while keeping boardgame.io as the outer orchestrator.

**Non-goals (for now):**
- Replacing boardgame.io (we keep it as the driver).
- Custom event logs (boardgame.io already provides replay/logging).
- Expansion rules (Cities & Knights, Seafarers, etc.).

## Architecture Overview
We split the engine into three layers:
1) **Board Topology (immutable)**: tiles, nodes, edges derived from a spec. No buildings/roads.
2) **Game State (mutable)**: placements and player state, plus caches.
3) **Rules (pure)**: validate and apply moves; update caches deterministically.

Boardgame.io becomes a thin adapter that maps `G` to the core state, calls pure rules, and applies validated state updates.

## Board Topology (immutable)
- Tiles are keyed by axial/cube coordinates (`q/r/s`).
- Nodes and edges are first-class graph identities:
  - **Node ID**: a stable integer or canonical key derived from the topology.
  - **Edge ID**: normalized pair of node IDs (`min,max`) or a stable hash.
- Tiles reference their node IDs (6 per land tile). Edges are not stored on tiles; they’re global.
- Ports are defined by coordinate + node pairs.

## Core Game State (mutable)
Stored in `GameState` (serializable):
- **Placements**
  - `buildingsByNodeId: Map<NodeId, { ownerId, type }>`
  - `roadsByEdgeId: Map<EdgeId, ownerId>`
- **Players**
  - resources, dev cards, remaining pieces, victory points
- **Bank / Dice / Robber / Phase**
- **Caches (derived, updated in rules)**
  - `connectedComponentsByPlayer`
  - `buildableNodeIds` (per player, per phase)
  - `buildableEdgeIds` (per player, per phase)
  - `portsByNodeId` (derived once from board)
  - optional: `longestRoadByPlayer`

Caches are never the source of truth; they’re recomputable via `recomputeCaches(state, board)`.

## Rules API (pure)
Minimal, deterministic functions in `game-core`:
- `buildableNodes(state, board, { initialPlacement })`
- `buildableEdges(state, board, { initialPlacement })`
- `canPlaceSettlement(...)`, `canPlaceRoad(...)`
- `applyPlaceSettlement(state, board, nodeId, playerId, ctx)`
- `applyPlaceRoad(state, board, edgeId, playerId, ctx)`

Each `apply*` returns `{ ok, state, errors? }` and updates caches in one place.

## Phase Handling
Core state tracks phase/flags explicitly (e.g., `setup`, `roll`, `build`, `robber`). Rules guard on phase so legality is centralized. Boardgame.io may still manage turn flow, but core validation is authoritative.

## Determinism & RNG
Randomness is injected (seeded RNG) only for dice/cards. Buildability logic remains deterministic and testable.

## Testing Strategy
- TDD for each rule slice.
- Tests assert both **legal move sets** and **state transitions**.
- Recompute-caches tests to ensure derived data stays consistent.

## Migration Plan (next slices)
1) Implement the new core types + rule API (no UI changes yet).
2) Add tests for setup + normal placement rules in `game-core`.
3) Add adapter layer to map existing `G` to `GameState`.
4) Gradually move `Moves.js` logic to core and delete legacy rule paths.

