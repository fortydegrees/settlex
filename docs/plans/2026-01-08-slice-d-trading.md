# Slice D (Trading + Ports) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement maritime trading and player trading rules (bank/port ratios, port eligibility, duel disallow player trades) with tests.

**Architecture:** Add trade helpers in `game-core/src/rules/trading.ts`. Trades are validated against bank resources (finite by default). Port eligibility is derived from `coreTopology.portsByNodeId` and player buildings. No UI wiring in this slice.

**Tech Stack:** TypeScript, Vitest, `game-core`.

---

### Task 1: Ruleset + state support for trading

**Files:**
- Modify: `game-core/src/ruleset.ts`
- Modify: `game-core/src/core/state.ts`
- Create: `game-core/src/rules/trading.ts`
- Create: `game-core/src/rules/trading.test.ts`
- Modify: `game-core/src/index.ts`

**Step 1: Write failing tests**

Create `game-core/src/rules/trading.test.ts` with a port eligibility + bank trade test:

```ts
import { describe, it, expect } from "vitest";
import { createEmptyState } from "../core/state";
import { buildTopology } from "../core/topology";
import { ResourceType, TileTypes } from "../types";
import { canUsePort, applyMaritimeTrade } from "./trading";

const tiles = [
  {
    coordinate: [0, 0, 0],
    type: TileTypes.PORT,
    tile: {
      id: 1,
      resource: ResourceType.WOOD,
      nodes: { NORTH: 1, SOUTH: 2 },
      edges: {}
    }
  }
];

const board = buildTopology(tiles);

describe("trading", () => {
  it("detects port eligibility from player buildings", () => {
    const state = createEmptyState(["0"]);
    state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };

    expect(canUsePort(state, board, "0", ResourceType.WOOD)).toBe(true);
  });

  it("applies 2:1 trade when specific port owned", () => {
    const state = createEmptyState(["0"]);
    state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
    state.playerStateById["0"].resources = [ResourceType.WOOD, ResourceType.WOOD];

    const result = applyMaritimeTrade(
      state,
      board,
      "0",
      { give: ResourceType.WOOD, receive: ResourceType.BRICK }
    );

    expect(result.ok).toBe(true);
    expect(state.playerStateById["0"].resources).toEqual([ResourceType.BRICK]);
  });
});
```

**Step 2: Run tests to verify failure**

```bash
pnpm -C game-core test -- src/rules/trading.test.ts
```
Expected: FAIL.

**Step 3: Implement scaffolding**

- Extend `Ruleset` with:
  - `allowPlayerTrades: boolean`
  - `tradeRates: { bank: 4; genericPort: 3; specificPort: 2 }`
- Implement `canUsePort` and `applyMaritimeTrade` in `trading.ts`.
- Export in `index.ts`.

**Step 4: Run tests to verify pass**

```bash
pnpm -C game-core test -- src/rules/trading.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add game-core/src/ruleset.ts game-core/src/rules/trading.ts game-core/src/rules/trading.test.ts game-core/src/index.ts
git commit -m "feat(core): add maritime trading rules"
```

---

### Task 2: Bank trade validation + player trade rules

**Files:**
- Modify: `game-core/src/rules/trading.test.ts`
- Modify: `game-core/src/rules/trading.ts`

**Step 1: Write failing tests**

Append tests:

```ts
import { applyPlayerTrade } from "./trading";

it("rejects bank trade when player lacks resources", () => {
  const state = createEmptyState(["0"]);
  const result = applyMaritimeTrade(state, board, "0", {
    give: ResourceType.WOOD,
    receive: ResourceType.BRICK
  });

  expect(result.ok).toBe(false);
});

it("rejects player trade when ruleset disallows it", () => {
  const state = createEmptyState(["0", "1"]);
  state.ruleset.allowPlayerTrades = false;

  const result = applyPlayerTrade(state, "0", "1", {
    give: [ResourceType.WOOD],
    receive: [ResourceType.BRICK]
  });

  expect(result.ok).toBe(false);
});
```

**Step 2: Run tests to verify failure**

```bash
pnpm -C game-core test -- src/rules/trading.test.ts
```
Expected: FAIL.

**Step 3: Implement**

- `applyMaritimeTrade` should validate player resources and bank availability (finite bank).
- `applyPlayerTrade` should be a simple exchange that validates both sides and `allowPlayerTrades`.

**Step 4: Run tests**

```bash
pnpm -C game-core test -- src/rules/trading.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add game-core/src/rules/trading.ts game-core/src/rules/trading.test.ts
git commit -m "feat(core): add player trade rules"
```
