# UI Core Render Maps Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Render the Catana board using `G.core` ownership data while deriving geometry from `G.tiles` via memoized render maps.

**Architecture:** Add a small UI helper that builds node/edge render maps from tiles. `Board.js` uses those maps for geometry and `G.core` for ownership. No changes to game-core behavior.

**Tech Stack:** Next.js/React (app), @settlex/game-core, Vitest (root), pnpm.

---

### Task 1: Add render-map helper + unit tests

**Files:**
- Create: `app/catana/utils/renderMaps.js`
- Create: `app/catana/utils/renderMaps.test.js`

**Step 1: Write the failing test**

Create `app/catana/utils/renderMaps.test.js`:

```javascript
import { describe, it, expect } from "vitest";
import { buildRenderMaps } from "./renderMaps";

const tiles = [
  {
    coordinate: [0, 0, 0],
    type: "Land",
    tile: {
      id: 1,
      nodes: { NORTH: 1, SOUTH: 2 },
      edges: { EAST: [1, 2] }
    }
  },
  {
    coordinate: [1, 0, -1],
    type: "Land",
    tile: {
      id: 2,
      nodes: { NORTH: 1, SOUTH: 3 },
      edges: { EAST: [1, 3] }
    }
  }
];

describe("buildRenderMaps", () => {
  it("dedupes shared node ids and keeps first render mapping", () => {
    const { nodeRenderById } = buildRenderMaps(tiles);
    expect(Object.keys(nodeRenderById)).toHaveLength(3);
    expect(nodeRenderById["1"]).toEqual({
      tile_coordinate: [0, 0, 0],
      direction: "NORTH",
      tileId: 1
    });
  });

  it("generates stable edge ids from node pairs", () => {
    const { edgeRenderById } = buildRenderMaps(tiles);
    expect(Object.keys(edgeRenderById)).toEqual(["1,2", "1,3"]);
    expect(edgeRenderById["1,2"]).toEqual({
      tile_coordinate: [0, 0, 0],
      direction: "EAST"
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm vitest run app/catana/utils/renderMaps.test.js
```

Expected: FAIL (module missing or `buildRenderMaps` not defined).

**Step 3: Write minimal implementation**

Create `app/catana/utils/renderMaps.js`:

```javascript
import { edgeId } from "@settlex/game-core";

export function buildRenderMaps(tiles) {
  const nodeRenderById = {};
  const edgeRenderById = {};

  for (const tile of tiles ?? []) {
    const nodes = tile?.tile?.nodes ?? {};
    const edges = tile?.tile?.edges ?? {};

    for (const [direction, nodeId] of Object.entries(nodes)) {
      const key = String(nodeId);
      if (!nodeRenderById[key]) {
        nodeRenderById[key] = {
          tile_coordinate: tile.coordinate,
          direction,
          tileId: tile.tile.id
        };
      }
    }

    for (const [direction, pair] of Object.entries(edges)) {
      const [a, b] = pair;
      const id = edgeId(a, b);
      if (!edgeRenderById[id]) {
        edgeRenderById[id] = {
          tile_coordinate: tile.coordinate,
          direction
        };
      }
    }
  }

  return { nodeRenderById, edgeRenderById };
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm vitest run app/catana/utils/renderMaps.test.js
```

Expected: PASS.

**Step 5: Commit**

```bash
git add app/catana/utils/renderMaps.js app/catana/utils/renderMaps.test.js
git commit -m "test(ui): add render map helper"
```

---

### Task 2: Refactor Board.js to use core + render maps

**Files:**
- Modify: `app/catana/Board.js`

**Step 1: Update imports and add render maps**

- Import `buildRenderMaps` from `./utils/renderMaps`.
- Add `playerById` mapping for quick owner lookup.
- Add `const { nodeRenderById, edgeRenderById } = useMemo(() => buildRenderMaps(G.tiles), [G.tiles]);`.

**Step 2: Render buildings from core**

- Replace `Object.keys(G.nodes)` loop with:
  - `Object.entries(G.core.buildingsByNodeId)`
  - lookup render info via `nodeRenderById[nodeId]`
  - lookup player via `playerById[ownerId]`

- Replace `Object.keys(G.edges)` loop with:
  - `Object.entries(G.core.roadsByEdgeId)`
  - lookup render info via `edgeRenderById[edgeId]`
  - lookup player via `playerById[ownerId]`

**Step 3: Render actions from ID lists**

- For `G.valids.nodes` (array of node IDs), lookup `nodeRenderById[nodeId]` and render `ActionNode` using the render metadata.
- For `G.valids.edges` (array of edge IDs), lookup `edgeRenderById[edgeId]` and render `Edge` using the render metadata.
- Update the `buildableRoads` section to use `edgeRenderById` rather than `G.edges`.

**Step 4: Remove all remaining `G.nodes` / `G.edges` render references**

Ensure no remaining usages in `Board.js` (search after edit).

**Step 5: Verify**

Run unit test from Task 1 (ensures render mapping still correct):

```bash
pnpm vitest run app/catana/utils/renderMaps.test.js
```

Optional manual check (UI wiring):

```bash
pnpm dev
```

Load `http://localhost:3000/catana` and confirm:
- tiles render
- existing settlements/roads render (if any)
- placement highlights appear for settlement/road

**Step 6: Commit**

```bash
git add app/catana/Board.js
git commit -m "refactor(ui): render board from core state"
```
