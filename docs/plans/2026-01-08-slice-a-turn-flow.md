# Slice A (Turn Flow + Dice + Robber + Resource Distribution) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add core turn-flow helpers, resource distribution, robber placement rules, and discard handling for roll=7, with tests.

**Architecture:** Extend `GameState` with ruleset/bank/player resources and a minimal `turn` state. Implement `turnFlow` rule helpers in `game-core/src/rules/turnFlow.ts` and test with small custom boards. No UI wiring in this slice.

**Tech Stack:** TypeScript, Vitest, `game-core`.

---

### Task 1: Add ruleset/bank/player/turn scaffolding + discard handling

**Files:**
- Create: `game-core/src/rules/turnFlow.test.ts`
- Create: `game-core/src/rules/turnFlow.ts`
- Modify: `game-core/src/core/state.ts`
- Modify: `game-core/src/types.ts`
- Create: `game-core/src/ruleset.ts`
- Modify: `game-core/src/index.ts`

**Step 1: Write the failing test**

Create `game-core/src/rules/turnFlow.test.ts` with discard tests:

```ts
import { describe, it, expect } from "vitest";
import { TileTypes, ResourceType } from "../types";
import { buildTopology } from "../core/topology";
import { createEmptyState } from "../core/state";
import { playersNeedingDiscard, applyDiscard } from "./turnFlow";

const tiles = [
  {
    coordinate: [0, 0, 0],
    type: TileTypes.LAND,
    tile: { id: 1, resource: ResourceType.WOOD, number: 8, nodes: { NORTH: 1, SOUTH: 2 }, edges: {} }
  }
];

const board = buildTopology(tiles);

describe("turnFlow - discard", () => {
  it("flags players over discard limit", () => {
    const state = createEmptyState(["0", "1"]);
    state.ruleset.discardLimit = 7;
    state.playerStateById["0"].resources = Array(8).fill(ResourceType.WOOD);
    state.playerStateById["1"].resources = Array(7).fill(ResourceType.WOOD);

    expect(playersNeedingDiscard(state)).toEqual(["0"]);
  });

  it("applyDiscard removes cards and advances phase when all done", () => {
    const state = createEmptyState(["0", "1"]);
    state.ruleset.discardLimit = 7;
    state.turn.phase = "robberDiscard";
    state.turn.pendingDiscards = ["0"];
    state.playerStateById["0"].resources = Array(8).fill(ResourceType.WOOD);

    const result = applyDiscard(state, "0", Array(4).fill(ResourceType.WOOD));

    expect(result.ok).toBe(true);
    expect(state.playerStateById["0"].resources).toHaveLength(4);
    expect(state.turn.pendingDiscards).toEqual([]);
    expect(state.turn.phase).toBe("robberMove");
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
pnpm -C game-core test -- src/rules/turnFlow.test.ts
```
Expected: FAIL (missing exports/types).

**Step 3: Write minimal implementation**

- Add `Resource` type alias to `game-core/src/types.ts` if missing.
- Create `game-core/src/ruleset.ts`:

```ts
import { ResourceType, type Resource } from "./types";

export type Ruleset = {
  discardLimit: number;
  friendlyRobber: { enabled: boolean; vpThreshold: number };
  bank: { finite: boolean; resourceCounts: Record<Resource, number> };
};

export function createStandardRuleset(): Ruleset {
  return {
    discardLimit: 7,
    friendlyRobber: { enabled: false, vpThreshold: 2 },
    bank: {
      finite: true,
      resourceCounts: {
        [ResourceType.WOOD]: 19,
        [ResourceType.BRICK]: 19,
        [ResourceType.SHEEP]: 19,
        [ResourceType.WHEAT]: 19,
        [ResourceType.ORE]: 19,
        [ResourceType.DESERT]: 0,
        [ResourceType.GOLD]: 0,
        [ResourceType.WATER]: 0,
        [ResourceType.EMPTY]: 0,
        [ResourceType.ANY]: 0
      }
    }
  };
}
```

- Update `game-core/src/core/state.ts` to include:
  - `ruleset: Ruleset`
  - `bank: { resources: Resource[] }`
  - `playerStateById: Record<string, { resources: Resource[]; victoryPoints: number }>`
  - `turn: { phase: "preRoll" | "postRoll" | "robberDiscard" | "robberMove" | "robberSteal"; hasRolled: boolean; lastRollTotal: number | null; pendingDiscards: string[]; currentPlayerId: string }`
  - `robberTileId: number | null`

- Implement `createEmptyState(players)` to initialize the above with `createStandardRuleset()` and empty resources.

- Create `game-core/src/rules/turnFlow.ts` with:
  - `playersNeedingDiscard(state)`
  - `applyDiscard(state, playerId, resources)` (validate count and ownership; update pending discards)

- Export new modules in `game-core/src/index.ts`.

**Step 4: Run test to verify it passes**

```bash
pnpm -C game-core test -- src/rules/turnFlow.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add game-core/src/core/state.ts game-core/src/types.ts game-core/src/rules/turnFlow.ts game-core/src/rules/turnFlow.test.ts game-core/src/ruleset.ts game-core/src/index.ts
git commit -m "feat(core): add turn state and discard helpers"
```

---

### Task 2: Resource distribution (roll ≠ 7) with bank shortage rule

**Files:**
- Modify: `game-core/src/rules/turnFlow.test.ts`
- Modify: `game-core/src/rules/turnFlow.ts`

**Step 1: Write the failing tests**

Append tests:

```ts
import { applyResourceDistribution } from "./turnFlow";

it("distributes resources for matching roll when bank has enough", () => {
  const state = createEmptyState(["0"]);
  state.bank.resources = [ResourceType.WOOD, ResourceType.WOOD];
  state.robberTileId = null;
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };

  const result = applyResourceDistribution(state, board, 8);

  expect(result.ok).toBe(true);
  expect(state.playerStateById["0"].resources).toEqual([ResourceType.WOOD]);
  expect(state.bank.resources).toHaveLength(1);
});

it("gives none if bank lacks enough of a resource", () => {
  const state = createEmptyState(["0", "1"]);
  state.bank.resources = [ResourceType.WOOD];
  state.robberTileId = null;
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
  state.buildingsByNodeId[2] = { ownerId: "1", type: "settlement" };

  const result = applyResourceDistribution(state, board, 8);

  expect(result.ok).toBe(true);
  expect(state.playerStateById["0"].resources).toEqual([]);
  expect(state.playerStateById["1"].resources).toEqual([]);
  expect(state.bank.resources).toHaveLength(1);
});
```

**Step 2: Run tests to verify failure**

```bash
pnpm -C game-core test -- src/rules/turnFlow.test.ts
```
Expected: FAIL (function missing).

**Step 3: Implement minimal distribution**

In `turnFlow.ts`, add:
- `applyResourceDistribution(state, board, rollTotal)`
  - Skip roll 7.
  - Ignore robber tile.
  - Count required per resource.
  - If bank lacks for a resource, distribute none of that resource.
  - Remove resources from bank and add to player resources.

**Step 4: Run tests**

```bash
pnpm -C game-core test -- src/rules/turnFlow.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add game-core/src/rules/turnFlow.ts game-core/src/rules/turnFlow.test.ts
git commit -m "feat(core): add resource distribution rules"
```

---

### Task 3: Robber placement rules + eligible victims

**Files:**
- Modify: `game-core/src/rules/turnFlow.test.ts`
- Modify: `game-core/src/rules/turnFlow.ts`

**Step 1: Write failing tests**

Append tests:

```ts
import { canPlaceRobber, applyMoveRobber, getRobberVictims } from "./turnFlow";

it("blocks robber placement on tiles adjacent to players <= vp threshold", () => {
  const state = createEmptyState(["0"]);
  state.ruleset.friendlyRobber.enabled = true;
  state.ruleset.friendlyRobber.vpThreshold = 2;
  state.playerStateById["0"].victoryPoints = 2;
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };

  expect(canPlaceRobber(state, board, 1)).toBe(false);
});

it("returns eligible victims on robber tile", () => {
  const state = createEmptyState(["0", "1"]);
  state.buildingsByNodeId[1] = { ownerId: "1", type: "settlement" };

  const victims = getRobberVictims(state, board, 1, "0");
  expect(victims).toEqual(["1"]);
});

it("applyMoveRobber updates tile when legal", () => {
  const state = createEmptyState(["0", "1"]);
  const result = applyMoveRobber(state, board, 1, "0");
  expect(result.ok).toBe(true);
  expect(state.robberTileId).toBe(1);
});
```

**Step 2: Run tests to verify failure**

```bash
pnpm -C game-core test -- src/rules/turnFlow.test.ts
```
Expected: FAIL.

**Step 3: Implement**

In `turnFlow.ts`, add:
- `canPlaceRobber(state, board, tileId)` (friendly‑robber checks)
- `getRobberVictims(state, board, tileId, actingPlayerId)`
- `applyMoveRobber(state, board, tileId, actingPlayerId)`

**Step 4: Run tests**

```bash
pnpm -C game-core test -- src/rules/turnFlow.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add game-core/src/rules/turnFlow.ts game-core/src/rules/turnFlow.test.ts
git commit -m "feat(core): add robber placement rules"
```

---

### Task 4: Roll resolution (7 vs non-7) and phase updates

**Files:**
- Modify: `game-core/src/rules/turnFlow.test.ts`
- Modify: `game-core/src/rules/turnFlow.ts`

**Step 1: Write failing tests**

Append tests:

```ts
import { applyRollDice } from "./turnFlow";

it("sets postRoll and distributes on non-7", () => {
  const state = createEmptyState(["0"]);
  state.turn.phase = "preRoll";
  state.bank.resources = [ResourceType.WOOD];
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };

  const result = applyRollDice(state, board, 8);

  expect(result.ok).toBe(true);
  expect(state.turn.phase).toBe("postRoll");
  expect(state.turn.hasRolled).toBe(true);
  expect(state.playerStateById["0"].resources).toEqual([ResourceType.WOOD]);
});

it("enters robberDiscard on 7 and tracks pending discards", () => {
  const state = createEmptyState(["0"]);
  state.turn.phase = "preRoll";
  state.playerStateById["0"].resources = Array(8).fill(ResourceType.WOOD);
  state.ruleset.discardLimit = 7;

  const result = applyRollDice(state, board, 7);

  expect(result.ok).toBe(true);
  expect(state.turn.phase).toBe("robberDiscard");
  expect(state.turn.pendingDiscards).toEqual(["0"]);
});
```

**Step 2: Run tests to verify failure**

```bash
pnpm -C game-core test -- src/rules/turnFlow.test.ts
```
Expected: FAIL.

**Step 3: Implement**

In `turnFlow.ts`, add:
- `applyRollDice(state, board, rollTotal)`
  - Sets `turn.hasRolled`, `turn.lastRollTotal`.
  - If roll==7: compute pending discards → `robberDiscard` or `robberMove` if none.
  - Else: call `applyResourceDistribution` and set `postRoll`.

**Step 4: Run tests**

```bash
pnpm -C game-core test -- src/rules/turnFlow.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add game-core/src/rules/turnFlow.ts game-core/src/rules/turnFlow.test.ts
git commit -m "feat(core): add roll resolution phase updates"
```
