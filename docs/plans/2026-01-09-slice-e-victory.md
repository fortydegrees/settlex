# Slice E (Victory + Awards) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Longest Road, Largest Army, and victory point helpers with ruleset-configurable thresholds, plus award updates after relevant actions.

**Architecture:** Implement `rules/victory.ts` with recompute helpers and derived VP calculation. Store awards in `GameState` and update after road/settlement/city/knight actions. Use DFS to compute longest road and standard tie behavior (current holder retains if tied).

**Tech Stack:** TypeScript, Vitest, `game-core`.

---

### Task 1: Ruleset + state scaffolding, Largest Army helper

**Files:**
- Modify: `game-core/src/ruleset.ts`
- Modify: `game-core/src/core/state.ts`
- Create: `game-core/src/rules/victory.ts`
- Create: `game-core/src/rules/victory.test.ts`
- Modify: `game-core/src/index.ts`

**Step 1: Write the failing test**

Create `game-core/src/rules/victory.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createEmptyState } from "../core/state";
import { recomputeLargestArmy } from "./victory";

describe("largest army", () => {
  it("awards largest army at threshold", () => {
    const state = createEmptyState(["0", "1"]);
    state.playerStateById["0"].knightsPlayed = 3;

    recomputeLargestArmy(state);

    expect(state.awards.largestArmyOwnerId).toBe("0");
  });

  it("keeps current owner on tie", () => {
    const state = createEmptyState(["0", "1"]);
    state.awards.largestArmyOwnerId = "0";
    state.playerStateById["0"].knightsPlayed = 3;
    state.playerStateById["1"].knightsPlayed = 3;

    recomputeLargestArmy(state);

    expect(state.awards.largestArmyOwnerId).toBe("0");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm -C game-core test -- src/rules/victory.test.ts
```
Expected: FAIL (module not found).

**Step 3: Write minimal implementation**

- Add to `ruleset.ts`:
  - `victoryPointsToWin: 10`
  - `longestRoadMinLength: 5`
  - `largestArmyMinKnights: 3`
- Add to `core/state.ts`:
  - `awards: { longestRoadOwnerId: string | null; largestArmyOwnerId: string | null }`
  - Initialize both to `null` in `createEmptyState`.
- Create `rules/victory.ts` with:

```ts
import { GameState } from "../core/state";

export function recomputeLargestArmy(state: GameState) {
  const minKnights = state.ruleset.largestArmyMinKnights;
  const current = state.awards.largestArmyOwnerId;
  let max = 0;
  let leaders: string[] = [];

  for (const [playerId, player] of Object.entries(state.playerStateById)) {
    if (player.knightsPlayed > max) {
      max = player.knightsPlayed;
      leaders = [playerId];
    } else if (player.knightsPlayed === max) {
      leaders.push(playerId);
    }
  }

  if (max < minKnights) {
    state.awards.largestArmyOwnerId = null;
    return;
  }
  if (leaders.length === 1) {
    state.awards.largestArmyOwnerId = leaders[0];
    return;
  }
  state.awards.largestArmyOwnerId = current && leaders.includes(current) ? current : null;
}
```

- Export from `index.ts`.

**Step 4: Run test to verify it passes**

```bash
pnpm -C game-core test -- src/rules/victory.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add game-core/src/ruleset.ts game-core/src/core/state.ts game-core/src/rules/victory.ts game-core/src/rules/victory.test.ts game-core/src/index.ts
git commit -m "feat(core): add largest army awards scaffolding"
```

---

### Task 2: Longest Road algorithm + tests

**Files:**
- Modify: `game-core/src/rules/victory.test.ts`
- Modify: `game-core/src/rules/victory.ts`

**Step 1: Write the failing tests**

Append to `victory.test.ts`:

```ts
import { recomputeLongestRoad } from "./victory";
import { BoardTopology } from "../core/topology";

function makeBoard(edges: Array<[number, number]>): BoardTopology {
  const edgeNodes: Record<string, [number, number]> = {};
  const nodeEdges: Record<number, string[]> = {};
  const nodeNeighbors: Record<number, number[]> = {};
  const nodeSet = new Set<number>();

  for (const [a, b] of edges) {
    const id = a < b ? `${a},${b}` : `${b},${a}`;
    edgeNodes[id] = [a, b];
    nodeSet.add(a);
    nodeSet.add(b);
    nodeEdges[a] = nodeEdges[a] ?? [];
    nodeEdges[b] = nodeEdges[b] ?? [];
    nodeEdges[a].push(id);
    nodeEdges[b].push(id);
    nodeNeighbors[a] = nodeNeighbors[a] ?? [];
    nodeNeighbors[b] = nodeNeighbors[b] ?? [];
    if (!nodeNeighbors[a].includes(b)) nodeNeighbors[a].push(b);
    if (!nodeNeighbors[b].includes(a)) nodeNeighbors[b].push(a);
  }

  return {
    tiles: [],
    nodeIds: Array.from(nodeSet),
    landNodeIds: Array.from(nodeSet),
    edgeIds: Object.keys(edgeNodes),
    edgeNodes,
    nodeEdges,
    nodeNeighbors,
    portsByNodeId: {}
  };
}

describe("longest road", () => {
  it("awards longest road at threshold", () => {
    const board = makeBoard([[1,2],[2,3],[3,4],[4,5],[5,6]]);
    const state = createEmptyState(["0"]);
    state.roadsByEdgeId = {
      "1,2": "0",
      "2,3": "0",
      "3,4": "0",
      "4,5": "0",
      "5,6": "0"
    };

    recomputeLongestRoad(state, board);

    expect(state.awards.longestRoadOwnerId).toBe("0");
  });

  it("keeps current owner on tie", () => {
    const board = makeBoard([[1,2],[2,3],[3,4],[4,5],[5,6]]);
    const state = createEmptyState(["0","1"]);
    state.awards.longestRoadOwnerId = "0";
    state.roadsByEdgeId = {
      "1,2": "0",
      "2,3": "0",
      "3,4": "0",
      "4,5": "0",
      "5,6": "0",
      "10,11": "1",
      "11,12": "1",
      "12,13": "1",
      "13,14": "1",
      "14,15": "1"
    };

    recomputeLongestRoad(state, board);

    expect(state.awards.longestRoadOwnerId).toBe("0");
  });

  it("breaks road through opponent settlement", () => {
    const board = makeBoard([[1,2],[2,3],[3,4],[4,5]]);
    const state = createEmptyState(["0","1"]);
    state.roadsByEdgeId = {
      "1,2": "0",
      "2,3": "0",
      "3,4": "0",
      "4,5": "0"
    };
    state.buildingsByNodeId[3] = { ownerId: "1", type: "settlement" };

    recomputeLongestRoad(state, board);

    expect(state.awards.longestRoadOwnerId).toBe(null);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm -C game-core test -- src/rules/victory.test.ts
```
Expected: FAIL (recomputeLongestRoad missing).

**Step 3: Write minimal implementation**

In `victory.ts`, implement `recomputeLongestRoad(state, board)` using DFS over player edges:
- Block traversal at opponent buildings.
- No edge reuse.
- Apply tie rule (current holder keeps if tied).
- Threshold from `ruleset.longestRoadMinLength`.

**Step 4: Run test to verify it passes**

```bash
pnpm -C game-core test -- src/rules/victory.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add game-core/src/rules/victory.ts game-core/src/rules/victory.test.ts
git commit -m "feat(core): add longest road award logic"
```

---

### Task 3: Victory points + win check

**Files:**
- Modify: `game-core/src/rules/victory.test.ts`
- Modify: `game-core/src/rules/victory.ts`

**Step 1: Write the failing tests**

Append:

```ts
import { getVictoryPoints, checkWin } from "./victory";
import { ResourceType } from "../types";

it("computes victory points from board, dev cards, and awards", () => {
  const state = createEmptyState(["0"]);
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
  state.buildingsByNodeId[2] = { ownerId: "0", type: "city" };
  state.playerStateById["0"].devCards = ["victoryPoint"];
  state.awards.longestRoadOwnerId = "0";

  expect(getVictoryPoints(state, "0")).toBe(1 + 2 + 1 + 2);
});

it("checks win immediately", () => {
  const state = createEmptyState(["0"]);
  state.ruleset.victoryPointsToWin = 3;
  state.buildingsByNodeId[1] = { ownerId: "0", type: "city" };
  state.awards.largestArmyOwnerId = "0";

  expect(checkWin(state, "0")).toBe(true);
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm -C game-core test -- src/rules/victory.test.ts
```
Expected: FAIL (missing helpers).

**Step 3: Write minimal implementation**

Add to `victory.ts`:
- `getVictoryPoints(state, playerId)`
- `checkWin(state, playerId)`

**Step 4: Run test to verify it passes**

```bash
pnpm -C game-core test -- src/rules/victory.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add game-core/src/rules/victory.ts game-core/src/rules/victory.test.ts
git commit -m "feat(core): add victory point helpers"
```

---

### Task 4: Wire award recomputation into actions

**Files:**
- Modify: `game-core/src/rules/buildActions.ts`
- Modify: `game-core/src/rules/apply.ts`
- Modify: `game-core/src/rules/devCards.ts`
- Modify: `game-core/src/rules/victory.test.ts`

**Step 1: Write the failing tests**

Append:

```ts
import { applyBuildRoad } from "./buildActions";
import { applyKnight } from "./devCards";

it("updates longest road after building roads", () => {
  const board = makeBoard([[1,2],[2,3],[3,4],[4,5],[5,6]]);
  const state = createEmptyState(["0"]);
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
  state.playerStateById["0"].resources = [
    ResourceType.WOOD, ResourceType.BRICK,
    ResourceType.WOOD, ResourceType.BRICK,
    ResourceType.WOOD, ResourceType.BRICK,
    ResourceType.WOOD, ResourceType.BRICK,
    ResourceType.WOOD, ResourceType.BRICK
  ];

  applyBuildRoad(state, board, "1,2", "0");
  applyBuildRoad(state, board, "2,3", "0");
  applyBuildRoad(state, board, "3,4", "0");
  applyBuildRoad(state, board, "4,5", "0");
  applyBuildRoad(state, board, "5,6", "0");

  expect(state.awards.longestRoadOwnerId).toBe("0");
});

it("updates largest army after knight play", () => {
  const state = createEmptyState(["0"]);
  state.playerStateById["0"].devCards = ["knight"];
  state.playerStateById["0"].devCardsBoughtThisTurn = [];

  applyKnight(state, "0");

  expect(state.awards.largestArmyOwnerId).toBe("0");
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm -C game-core test -- src/rules/victory.test.ts
```
Expected: FAIL (awards not updated).

**Step 3: Write minimal implementation**

- Import and call `recomputeLongestRoad` in:
  - `applyBuildRoad`, `applyBuildSettlement`, `applyBuildCity`
  - `applyPlaceSettlement`, `applyPlaceRoad` (initial placement)
  - `applyRoadBuilding` (dev card)
- Import and call `recomputeLargestArmy` in `applyKnight`.

**Step 4: Run test to verify it passes**

```bash
pnpm -C game-core test -- src/rules/victory.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add game-core/src/rules/buildActions.ts game-core/src/rules/apply.ts game-core/src/rules/devCards.ts game-core/src/rules/victory.test.ts
git commit -m "feat(core): recompute awards after actions"
```

---

### Task 5: Update agent docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Update docs**

Add a bullet noting slice E victory/awards work and where logic lives.

**Step 2: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs(agent): update progress for victory slice"
```
