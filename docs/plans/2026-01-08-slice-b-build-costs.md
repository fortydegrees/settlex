# Slice B (Build Costs + Piece Limits + Placement Enforcement) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enforce resource costs and piece limits for builds in core, and add explicit build actions for road/settlement/city with tests.

**Architecture:** Extend `Ruleset` with build costs + piece limits, extend `PlayerState` with remaining pieces, and add new build helpers in `game-core/src/rules/buildActions.ts`. Existing placement helpers remain for setup phase. Costs are charged in normal builds, not initial placement.

**Tech Stack:** TypeScript, Vitest, `game-core`.

---

### Task 1: Ruleset + PlayerState scaffolding

**Files:**
- Modify: `game-core/src/ruleset.ts`
- Modify: `game-core/src/core/state.ts`
- Modify: `game-core/src/types.ts`
- Modify: `game-core/src/index.ts`

**Step 1: Write the failing test**

Create `game-core/src/rules/buildCosts.test.ts` (new file) with a minimal smoke test that checks pieces are initialized from ruleset:

```ts
import { describe, it, expect } from "vitest";
import { createEmptyState } from "../core/state";

describe("build costs - state init", () => {
  it("initializes piece counts from ruleset", () => {
    const state = createEmptyState(["0"]);
    expect(state.playerStateById["0"].roadsRemaining).toBeGreaterThan(0);
    expect(state.playerStateById["0"].settlementsRemaining).toBeGreaterThan(0);
    expect(state.playerStateById["0"].citiesRemaining).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm -C game-core test -- src/rules/buildCosts.test.ts
```
Expected: FAIL (fields missing).

**Step 3: Implement scaffolding**

- Add `Cost` type and `Resource` alias if needed.
- Update `Ruleset` to include:
  - `pieceLimits: { roads: number; settlements: number; cities: number }`
  - `buildCosts: { road: Cost; settlement: Cost; city: Cost }`
- Update `createStandardRuleset()` with classic values.
- Update `PlayerState` in `core/state.ts` to include remaining piece counts.
- Initialize those counts in `createEmptyState()` from ruleset.
- Export any new types in `index.ts`.

**Step 4: Run test to verify it passes**

```bash
pnpm -C game-core test -- src/rules/buildCosts.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add game-core/src/ruleset.ts game-core/src/core/state.ts game-core/src/types.ts game-core/src/index.ts game-core/src/rules/buildCosts.test.ts
git commit -m "feat(core): add build cost/piece limit scaffolding"
```

---

### Task 2: Add build actions (road/settlement/city) with cost enforcement

**Files:**
- Create: `game-core/src/rules/buildActions.ts`
- Modify: `game-core/src/rules/buildCosts.test.ts`
- Modify: `game-core/src/index.ts`

**Step 1: Write failing tests**

Append tests:

```ts
import { TileTypes, ResourceType } from "../types";
import { buildTopology } from "../core/topology";
import { applyBuildRoad, applyBuildSettlement, applyBuildCity } from "./buildActions";

const tiles = [
  {
    coordinate: [0, 0, 0],
    type: TileTypes.LAND,
    tile: { id: 1, resource: ResourceType.WOOD, number: 8, nodes: { NORTH: 1, SOUTH: 2 }, edges: { EAST: [1, 2] } }
  }
];

const board = buildTopology(tiles);

it("applyBuildRoad spends resources and decrements pieces", () => {
  const state = createEmptyState(["0"]);
  state.playerStateById["0"].resources = [ResourceType.WOOD, ResourceType.BRICK];
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };

  const result = applyBuildRoad(state, board, "1,2", "0");

  expect(result.ok).toBe(true);
  expect(state.playerStateById["0"].resources).toEqual([]);
  expect(state.playerStateById["0"].roadsRemaining).toBe(
    state.ruleset.pieceLimits.roads - 1
  );
});

it("applyBuildSettlement enforces cost and connectivity", () => {
  const state = createEmptyState(["0"]);
  state.playerStateById["0"].resources = [
    ResourceType.WOOD,
    ResourceType.BRICK,
    ResourceType.SHEEP,
    ResourceType.WHEAT
  ];
  state.roadsByEdgeId["1,2"] = "0";

  const result = applyBuildSettlement(state, board, 1, "0");

  expect(result.ok).toBe(true);
  expect(state.playerStateById["0"].settlementsRemaining).toBe(
    state.ruleset.pieceLimits.settlements - 1
  );
});

it("applyBuildCity upgrades settlement and adjusts pieces", () => {
  const state = createEmptyState(["0"]);
  state.playerStateById["0"].resources = [
    ResourceType.WHEAT,
    ResourceType.WHEAT,
    ResourceType.ORE,
    ResourceType.ORE,
    ResourceType.ORE
  ];
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };

  const result = applyBuildCity(state, board, 1, "0");

  expect(result.ok).toBe(true);
  expect(state.buildingsByNodeId[1].type).toBe("city");
  expect(state.playerStateById["0"].citiesRemaining).toBe(
    state.ruleset.pieceLimits.cities - 1
  );
  expect(state.playerStateById["0"].settlementsRemaining).toBe(
    state.ruleset.pieceLimits.settlements + 1
  );
});
```

**Step 2: Run tests to verify failure**

```bash
pnpm -C game-core test -- src/rules/buildCosts.test.ts
```
Expected: FAIL (missing functions).

**Step 3: Implement build actions**

Create `buildActions.ts` with:
- `canAfford(cost, resources)`
- `spendResources(cost, playerResources, bankResources, finite)`
- `applyBuildRoad(state, board, edgeId, playerId)`
- `applyBuildSettlement(state, board, nodeId, playerId)`
- `applyBuildCity(state, board, nodeId, playerId)`

Rules:
- Use `buildableEdges` / `buildableNodes` for placement validity (normal play).
- Enforce piece limits (roads/settlements/cities remaining > 0).
- Enforce resource costs (if insufficient → error).
- Spend resources (remove from player; return to bank if finite).
- City upgrade: settlement must belong to player; settlement count increases by 1, city count decreases by 1.

**Step 4: Run tests**

```bash
pnpm -C game-core test -- src/rules/buildCosts.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add game-core/src/rules/buildActions.ts game-core/src/rules/buildCosts.test.ts game-core/src/index.ts
git commit -m "feat(core): add build actions with cost enforcement"
```

---

### Task 3: Placement helpers enforce piece limits (setup phase only)

**Files:**
- Modify: `game-core/src/rules/apply.ts`
- Modify: `game-core/src/rules/buildCosts.test.ts`

**Step 1: Write failing tests**

Append tests:

```ts
import { applyPlaceSettlement, applyPlaceRoad } from "./apply";

it("applyPlaceSettlement fails when no settlements remain", () => {
  const state = createEmptyState(["0"]);
  state.playerStateById["0"].settlementsRemaining = 0;
  const result = applyPlaceSettlement(state, board, 1, "0", { initialPlacement: true });
  expect(result.ok).toBe(false);
});

it("applyPlaceRoad fails when no roads remain", () => {
  const state = createEmptyState(["0"]);
  state.playerStateById["0"].roadsRemaining = 0;
  const node = 1;
  state.pendingRoadFromNodeIdByPlayer["0"] = node;
  const edgeId = "1,2";
  const result = applyPlaceRoad(state, board, edgeId, "0", { initialPlacement: true });
  expect(result.ok).toBe(false);
});
```

**Step 2: Run tests to verify failure**

```bash
pnpm -C game-core test -- src/rules/buildCosts.test.ts
```
Expected: FAIL.

**Step 3: Implement**

Update `applyPlaceSettlement` and `applyPlaceRoad` to check remaining piece counts and decrement on success.

**Step 4: Run tests**

```bash
pnpm -C game-core test -- src/rules/buildCosts.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add game-core/src/rules/apply.ts game-core/src/rules/buildCosts.test.ts
git commit -m "feat(core): enforce piece limits in placement"
```
