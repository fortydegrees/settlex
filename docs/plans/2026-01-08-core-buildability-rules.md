# Core Buildability Rules Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Introduce a clean core state model and implement buildability rules (setup + normal placement) in `game-core` with deterministic tests.

**Architecture:** Add a small core model (topology + state + caches) and pure rule functions for buildable nodes/edges and placement. Use axial/cube topology already produced by `generateBoard` and derive a graph (nodes, edges, neighbors). Keep caches in state but recompute them in `apply*` functions for correctness.

**Tech Stack:** TypeScript, Vitest, game-core.

**Assumption:** This slice focuses on *geometric* legality (distance rule + connectivity). Resource-cost validation can be layered later when we tackle economy/trading.

### Task 1: Add core topology + minimal state types (driven by buildability test)

**Files:**
- Create: `game-core/src/core/ids.ts`
- Create: `game-core/src/core/topology.ts`
- Create: `game-core/src/core/state.ts`
- Create: `game-core/src/rules/buildability.ts`
- Create: `game-core/src/rules/buildability.test.ts`
- Modify: `game-core/src/index.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { spec } from "../spec";
import { generateBoard } from "../board/generateBoard";
import { makeDeterministicRng } from "../testUtils";
import { buildTopology } from "../core/topology";
import { createEmptyState } from "../core/state";
import { buildableNodes } from "./buildability";

// Initial placement: with empty board, all land nodes should be buildable.

describe("buildability - initial placement", () => {
  it("returns all land nodes when no buildings exist", () => {
    const tiles = generateBoard(spec, makeDeterministicRng(1));
    const board = buildTopology(tiles);
    const state = createEmptyState(["0", "1"]);

    const nodes = buildableNodes(state, board, "0", { initialPlacement: true });

    expect(nodes.slice().sort((a, b) => a - b)).toEqual(
      board.landNodeIds.slice().sort((a, b) => a - b)
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C game-core test -- src/rules/buildability.test.ts`
Expected: FAIL with missing modules (`core/topology`, `core/state`, `buildability`).

**Step 3: Write minimal implementation**

`game-core/src/core/ids.ts`
```ts
export type NodeId = number;
export type EdgeId = string;

export function edgeId(a: NodeId, b: NodeId): EdgeId {
  return a < b ? `${a},${b}` : `${b},${a}`;
}

export function parseEdgeId(id: EdgeId): [NodeId, NodeId] {
  const [a, b] = id.split(",").map(Number);
  return [a, b];
}
```

`game-core/src/core/topology.ts`
```ts
import { TileTypes, ResourceType } from "../types";
import { EdgeId, NodeId, edgeId } from "./ids";

export type BoardTile = {
  coordinate: [number, number, number];
  type: string;
  tile: {
    id: number;
    resource?: string | null;
    number?: number | null;
    nodes?: Record<string, NodeId>;
    edges?: Record<string, [NodeId, NodeId]>;
    direction?: string;
  };
};

export type BoardTopology = {
  tiles: BoardTile[];
  nodeIds: NodeId[];
  landNodeIds: NodeId[];
  edgeIds: EdgeId[];
  edgeNodes: Record<EdgeId, [NodeId, NodeId]>;
  nodeEdges: Record<NodeId, EdgeId[]>;
  nodeNeighbors: Record<NodeId, NodeId[]>;
  portsByNodeId: Record<NodeId, ResourceType>;
};

export function buildTopology(tiles: BoardTile[]): BoardTopology {
  const nodeSet = new Set<NodeId>();
  const landNodeSet = new Set<NodeId>();
  const edgeNodes: Record<EdgeId, [NodeId, NodeId]> = {};
  const nodeEdges: Record<NodeId, EdgeId[]> = {};
  const nodeNeighbors: Record<NodeId, NodeId[]> = {};
  const portsByNodeId: Record<NodeId, ResourceType> = {};

  for (const tile of tiles) {
    const nodes = tile.tile.nodes ?? {};
    const edges = tile.tile.edges ?? {};

    for (const node of Object.values(nodes)) {
      nodeSet.add(node);
      if (tile.type === TileTypes.LAND) {
        landNodeSet.add(node);
      }
    }

    for (const edge of Object.values(edges)) {
      const [a, b] = edge;
      const id = edgeId(a, b);
      if (!edgeNodes[id]) {
        edgeNodes[id] = [a, b];
      }
      nodeEdges[a] = nodeEdges[a] ?? [];
      nodeEdges[b] = nodeEdges[b] ?? [];
      if (!nodeEdges[a].includes(id)) nodeEdges[a].push(id);
      if (!nodeEdges[b].includes(id)) nodeEdges[b].push(id);
    }

    if (tile.type === TileTypes.PORT && tile.tile.nodes && tile.tile.resource) {
      for (const node of Object.values(tile.tile.nodes)) {
        portsByNodeId[node] = tile.tile.resource as ResourceType;
      }
    }
  }

  for (const id of Object.keys(edgeNodes)) {
    const [a, b] = edgeNodes[id];
    nodeNeighbors[a] = nodeNeighbors[a] ?? [];
    nodeNeighbors[b] = nodeNeighbors[b] ?? [];
    if (!nodeNeighbors[a].includes(b)) nodeNeighbors[a].push(b);
    if (!nodeNeighbors[b].includes(a)) nodeNeighbors[b].push(a);
  }

  return {
    tiles,
    nodeIds: Array.from(nodeSet),
    landNodeIds: Array.from(landNodeSet),
    edgeIds: Object.keys(edgeNodes),
    edgeNodes,
    nodeEdges,
    nodeNeighbors,
    portsByNodeId
  };
}
```

`game-core/src/core/state.ts`
```ts
import { EdgeId, NodeId } from "./ids";
import { NodeBuildingTypes } from "../types";

export type Building = { ownerId: string; type: string };

export type GameState = {
  phase: "placement" | "normal";
  players: string[];
  buildingsByNodeId: Record<NodeId, Building>;
  roadsByEdgeId: Record<EdgeId, string>;
  pendingRoadFromNodeIdByPlayer: Record<string, NodeId | null>;
  caches: {
    buildableNodeIdsByPlayer: Record<string, NodeId[]>;
    buildableEdgeIdsByPlayer: Record<string, EdgeId[]>;
  };
};

export function createEmptyState(players: string[]): GameState {
  const pending: Record<string, NodeId | null> = {};
  const buildableNodes: Record<string, NodeId[]> = {};
  const buildableEdges: Record<string, EdgeId[]> = {};
  for (const p of players) {
    pending[p] = null;
    buildableNodes[p] = [];
    buildableEdges[p] = [];
  }
  return {
    phase: "placement",
    players,
    buildingsByNodeId: {},
    roadsByEdgeId: {},
    pendingRoadFromNodeIdByPlayer: pending,
    caches: {
      buildableNodeIdsByPlayer: buildableNodes,
      buildableEdgeIdsByPlayer: buildableEdges
    }
  };
}
```

`game-core/src/rules/buildability.ts`
```ts
import { BoardTopology } from "../core/topology";
import { GameState } from "../core/state";
import { NodeId } from "../core/ids";

export function buildableNodes(
  state: GameState,
  board: BoardTopology,
  playerId: string,
  { initialPlacement }: { initialPlacement: boolean }
): NodeId[] {
  const occupied = new Set(
    Object.keys(state.buildingsByNodeId).map((n) => Number(n))
  );
  const blocked = new Set<NodeId>(occupied);
  for (const node of occupied) {
    const neighbors = board.nodeNeighbors[node] ?? [];
    for (const n of neighbors) blocked.add(n);
  }

  const candidates = initialPlacement
    ? board.landNodeIds
    : nodesConnectedToPlayerRoads(state, board, playerId);

  return candidates.filter((n) => !blocked.has(n));
}

function nodesConnectedToPlayerRoads(
  state: GameState,
  board: BoardTopology,
  playerId: string
): NodeId[] {
  const nodes = new Set<NodeId>();
  for (const [edgeId, ownerId] of Object.entries(state.roadsByEdgeId)) {
    if (ownerId !== playerId) continue;
    const [a, b] = board.edgeNodes[edgeId];
    nodes.add(a);
    nodes.add(b);
  }
  return Array.from(nodes);
}
```

`game-core/src/index.ts`
```ts
export * from "./core/ids";
export * from "./core/topology";
export * from "./core/state";
export * from "./rules/buildability";
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C game-core test -- src/rules/buildability.test.ts`
Expected: PASS (1 test).

**Step 5: Commit**

```bash
git add game-core/src/core/ids.ts game-core/src/core/topology.ts game-core/src/core/state.ts game-core/src/rules/buildability.ts game-core/src/rules/buildability.test.ts game-core/src/index.ts
git commit -m "feat: add core topology and buildable nodes"
```

### Task 2: Enforce distance rule in setup (adjacency exclusion)

**Files:**
- Modify: `game-core/src/rules/buildability.test.ts`
- Modify: `game-core/src/rules/buildability.ts`

**Step 1: Write the failing test**

```ts
it("excludes nodes adjacent to an existing settlement", () => {
  const tiles = generateBoard(spec, makeDeterministicRng(2));
  const board = buildTopology(tiles);
  const state = createEmptyState(["0", "1"]);

  const occupied = board.landNodeIds[0];
  state.buildingsByNodeId[occupied] = { ownerId: "0", type: "settlement" };

  const nodes = buildableNodes(state, board, "0", { initialPlacement: true });
  const neighbors = board.nodeNeighbors[occupied] ?? [];

  expect(nodes).not.toContain(occupied);
  for (const n of neighbors) {
    expect(nodes).not.toContain(n);
  }
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C game-core test -- src/rules/buildability.test.ts`
Expected: FAIL if adjacency logic is missing.

**Step 3: Write minimal implementation**

No new logic required if Task 1 included neighbor exclusion; if it didn’t, implement the `blocked` set in `buildableNodes`.

**Step 4: Run test to verify it passes**

Run: `pnpm -C game-core test -- src/rules/buildability.test.ts`
Expected: PASS (2 tests).

**Step 5: Commit**

```bash
git add game-core/src/rules/buildability.test.ts game-core/src/rules/buildability.ts
git commit -m "test: enforce distance rule for setup"
```

### Task 3: Normal placement requires road connectivity

**Files:**
- Modify: `game-core/src/rules/buildability.test.ts`
- Modify: `game-core/src/rules/buildability.ts`

**Step 1: Write the failing test**

```ts
it("requires road connectivity in normal play", () => {
  const tiles = generateBoard(spec, makeDeterministicRng(3));
  const board = buildTopology(tiles);
  const state = createEmptyState(["0", "1"]);
  state.phase = "normal";

  const [edgeId] = board.edgeIds;
  state.roadsByEdgeId[edgeId] = "0";

  const nodes = buildableNodes(state, board, "0", { initialPlacement: false });
  const [a, b] = board.edgeNodes[edgeId];

  expect(nodes).toContain(a);
  expect(nodes).toContain(b);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C game-core test -- src/rules/buildability.test.ts`
Expected: FAIL if normal-play connectivity not enforced.

**Step 3: Write minimal implementation**

Implement `nodesConnectedToPlayerRoads` in `buildability.ts` and ensure it is used when `initialPlacement=false`.

**Step 4: Run test to verify it passes**

Run: `pnpm -C game-core test -- src/rules/buildability.test.ts`
Expected: PASS (3 tests).

**Step 5: Commit**

```bash
git add game-core/src/rules/buildability.test.ts game-core/src/rules/buildability.ts
git commit -m "test: require road connectivity for settlements"
```

### Task 4: Add buildable edges (setup + normal)

**Files:**
- Modify: `game-core/src/rules/buildability.ts`
- Modify: `game-core/src/rules/buildability.test.ts`

**Step 1: Write the failing tests**

```ts
import { buildableEdges } from "./buildability";

it("returns unoccupied edges adjacent to a specific node in setup", () => {
  const tiles = generateBoard(spec, makeDeterministicRng(4));
  const board = buildTopology(tiles);
  const state = createEmptyState(["0", "1"]);

  const node = board.landNodeIds[0];
  const edges = buildableEdges(state, board, "0", {
    initialPlacement: true,
    fromNodeId: node
  });

  const expected = board.nodeEdges[node];
  expect(edges.slice().sort()).toEqual(expected.slice().sort());
});

it("returns unoccupied edges adjacent to player roads/buildings in normal play", () => {
  const tiles = generateBoard(spec, makeDeterministicRng(5));
  const board = buildTopology(tiles);
  const state = createEmptyState(["0", "1"]);

  const [edgeId] = board.edgeIds;
  state.roadsByEdgeId[edgeId] = "0";

  const edges = buildableEdges(state, board, "0", {
    initialPlacement: false
  });

  const [a, b] = board.edgeNodes[edgeId];
  const expected = new Set([...(board.nodeEdges[a] ?? []), ...(board.nodeEdges[b] ?? [])]);
  for (const e of expected) {
    expect(edges).toContain(e);
  }
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C game-core test -- src/rules/buildability.test.ts`
Expected: FAIL (missing `buildableEdges`).

**Step 3: Write minimal implementation**

```ts
import { EdgeId, NodeId } from "../core/ids";

export function buildableEdges(
  state: GameState,
  board: BoardTopology,
  playerId: string,
  { initialPlacement, fromNodeId }: { initialPlacement: boolean; fromNodeId?: NodeId }
): EdgeId[] {
  const occupied = new Set(Object.keys(state.roadsByEdgeId));

  const candidates = new Set<EdgeId>();
  if (initialPlacement) {
    if (fromNodeId === undefined) return [];
    for (const e of board.nodeEdges[fromNodeId] ?? []) candidates.add(e);
  } else {
    const nodes = new Set<NodeId>();
    for (const [edgeId, ownerId] of Object.entries(state.roadsByEdgeId)) {
      if (ownerId !== playerId) continue;
      const [a, b] = board.edgeNodes[edgeId];
      nodes.add(a); nodes.add(b);
    }
    for (const [nodeId, building] of Object.entries(state.buildingsByNodeId)) {
      if (building.ownerId === playerId) nodes.add(Number(nodeId));
    }
    for (const nodeId of nodes) {
      for (const e of board.nodeEdges[nodeId] ?? []) candidates.add(e);
    }
  }

  return Array.from(candidates).filter((e) => !occupied.has(e));
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C game-core test -- src/rules/buildability.test.ts`
Expected: PASS (5 tests).

**Step 5: Commit**

```bash
git add game-core/src/rules/buildability.test.ts game-core/src/rules/buildability.ts
git commit -m "feat: add buildable edges rules"
```

### Task 5: Apply placement with cache recompute

**Files:**
- Create: `game-core/src/rules/apply.ts`
- Modify: `game-core/src/core/state.ts`
- Modify: `game-core/src/rules/buildability.test.ts`
- Modify: `game-core/src/index.ts`

**Step 1: Write the failing tests**

```ts
import { applyPlaceSettlement, applyPlaceRoad, recomputeCaches } from "./apply";

it("applyPlaceSettlement adds building and updates caches", () => {
  const tiles = generateBoard(spec, makeDeterministicRng(6));
  const board = buildTopology(tiles);
  const state = createEmptyState(["0", "1"]);

  const node = board.landNodeIds[0];
  const result = applyPlaceSettlement(state, board, node, "0", { initialPlacement: true });

  expect(result.ok).toBe(true);
  expect(result.state.buildingsByNodeId[node]).toBeTruthy();
  expect(result.state.pendingRoadFromNodeIdByPlayer["0"]).toBe(node);
  expect(result.state.caches.buildableNodeIdsByPlayer["0"].length).toBeGreaterThan(0);
});

it("applyPlaceRoad adds road and clears pending placement", () => {
  const tiles = generateBoard(spec, makeDeterministicRng(7));
  const board = buildTopology(tiles);
  const state = createEmptyState(["0", "1"]);

  const node = board.landNodeIds[0];
  const edge = board.nodeEdges[node][0];
  state.pendingRoadFromNodeIdByPlayer["0"] = node;

  const result = applyPlaceRoad(state, board, edge, "0", { initialPlacement: true });

  expect(result.ok).toBe(true);
  expect(result.state.roadsByEdgeId[edge]).toBe("0");
  expect(result.state.pendingRoadFromNodeIdByPlayer["0"]).toBe(null);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C game-core test -- src/rules/buildability.test.ts`
Expected: FAIL with missing `applyPlaceSettlement` / `applyPlaceRoad`.

**Step 3: Write minimal implementation**

`game-core/src/rules/apply.ts`
```ts
import { BoardTopology } from "../core/topology";
import { GameState } from "../core/state";
import { buildableNodes, buildableEdges } from "./buildability";
import { NodeId, EdgeId } from "../core/ids";

export function recomputeCaches(state: GameState, board: BoardTopology): GameState {
  for (const playerId of state.players) {
    state.caches.buildableNodeIdsByPlayer[playerId] = buildableNodes(state, board, playerId, {
      initialPlacement: state.phase === "placement"
    });
    state.caches.buildableEdgeIdsByPlayer[playerId] = buildableEdges(state, board, playerId, {
      initialPlacement: state.phase === "placement",
      fromNodeId: state.pendingRoadFromNodeIdByPlayer[playerId] ?? undefined
    });
  }
  return state;
}

export function applyPlaceSettlement(
  state: GameState,
  board: BoardTopology,
  nodeId: NodeId,
  playerId: string,
  { initialPlacement }: { initialPlacement: boolean }
) {
  const legal = buildableNodes(state, board, playerId, { initialPlacement });
  if (!legal.includes(nodeId)) {
    return { ok: false, state, error: "illegal-settlement" };
  }
  state.buildingsByNodeId[nodeId] = { ownerId: playerId, type: "settlement" };
  if (initialPlacement) {
    state.pendingRoadFromNodeIdByPlayer[playerId] = nodeId;
  }
  recomputeCaches(state, board);
  return { ok: true, state };
}

export function applyPlaceRoad(
  state: GameState,
  board: BoardTopology,
  edgeId: EdgeId,
  playerId: string,
  { initialPlacement }: { initialPlacement: boolean }
) {
  const legal = buildableEdges(state, board, playerId, {
    initialPlacement,
    fromNodeId: initialPlacement ? state.pendingRoadFromNodeIdByPlayer[playerId] ?? undefined : undefined
  });
  if (!legal.includes(edgeId)) {
    return { ok: false, state, error: "illegal-road" };
  }
  state.roadsByEdgeId[edgeId] = playerId;
  if (initialPlacement) {
    state.pendingRoadFromNodeIdByPlayer[playerId] = null;
  }
  recomputeCaches(state, board);
  return { ok: true, state };
}
```

Update `game-core/src/core/state.ts` types if needed.

Update `game-core/src/index.ts`:
```ts
export * from "./rules/apply";
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C game-core test -- src/rules/buildability.test.ts`
Expected: PASS (7 tests).

**Step 5: Commit**

```bash
git add game-core/src/rules/apply.ts game-core/src/core/state.ts game-core/src/rules/buildability.test.ts game-core/src/index.ts
git commit -m "feat: apply placement rules with caches"
```

### Task 6: Update agent docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/FEATURES.json`

**Step 1: Update PROGRESS**

Add a bullet noting core buildability rules and core model scaffolding added.

**Step 2: Update FEATURES**

Mark `core-extraction` and `core-tests` as in-progress with buildability tests added.

**Step 3: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/FEATURES.json
git commit -m "docs: update progress for core buildability"
```
