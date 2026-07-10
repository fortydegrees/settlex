# Engine Transaction Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make rejected core rule operations leave match state unchanged while preserving current valid gameplay.

**Architecture:** Retain the mutable `GameState` API, but validate complete operations against temporary arrays or shallow overlays before committing. Add direct failure-state and conservation contracts so future rule changes cannot reintroduce partial mutations.

**Tech Stack:** TypeScript 5.2, Vitest 1.6, pnpm, existing `game-core` rules and topology helpers.

## Global Constraints

- Do not change the public `GameState` shape or boardgame.io integration.
- Do not clone the entire match state in production code.
- Do not change valid gameplay results.
- Rejected covered operations must leave state deeply equal to its pre-call snapshot.
- Finite-bank resource cards must not be created or lost.
- Use deterministic inputs only; no `Math.random` or time-based engine logic.
- Balanced-board generation is out of scope.
- Add no dependencies.

---

### Task 1: Make resource spending intrinsically atomic

**Files:**
- Modify: `game-core/src/rules/buildCosts.test.ts`
- Modify: `game-core/src/rules/buildActions.ts:37-57`

**Interfaces:**
- Consumes: existing `spendResources(cost, playerResources, bankResources, finite)` API.
- Produces: the same result type, with a no-mutation guarantee on `{ ok: false }`.

- [ ] **Step 1: Write the failing direct-helper test**

Import `spendResources` and `ResourceType`, then add:

```ts
it("spendResources leaves hand and bank unchanged when the full cost is unavailable", () => {
  const hand = [ResourceType.WOOD];
  const bank = [ResourceType.ORE];
  const handBefore = [...hand];
  const bankBefore = [...bank];

  const result = spendResources(
    { [ResourceType.WOOD]: 1, [ResourceType.BRICK]: 1 },
    hand,
    bank,
    true
  );

  expect(result).toEqual({ ok: false, error: "missing-resource" });
  expect(hand).toEqual(handBefore);
  expect(bank).toEqual(bankBefore);
});
```

- [ ] **Step 2: Run the focused test and confirm the current partial mutation**

Run: `pnpm -C game-core exec vitest run src/rules/buildCosts.test.ts`

Expected: FAIL because the Wood card has been removed and added to the bank before Brick fails.

- [ ] **Step 3: Add a complete affordability preflight**

At the start of `spendResources`, before its mutation loop, add:

```ts
if (!canAfford(cost, playerResources)) {
  return { ok: false, error: "missing-resource" };
}
```

Keep the existing mutation loop and return type. After the preflight, every removal in that loop is guaranteed to succeed.

- [ ] **Step 4: Run focused build and development-card tests**

Run: `pnpm -C game-core exec vitest run src/rules/buildCosts.test.ts src/rules/devCards.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the atomic spend checkpoint**

```bash
git add game-core/src/rules/buildCosts.test.ts game-core/src/rules/buildActions.ts
git commit -m "fix(core): make resource spending atomic"
```

### Task 2: Validate both Road Building edges before board mutation

**Files:**
- Modify: `game-core/src/rules/devCards.test.ts`
- Modify: `game-core/src/rules/devCards.ts:203-241`

**Interfaces:**
- Consumes: `applyRoadBuilding(state, board, playerId, [first, second])` and `buildableEdges`.
- Produces: the same API, including second-road chaining, without temporary mutation of the real road map.

- [ ] **Step 1: Write the illegal-second-road state contract**

Add after the existing chaining test:

```ts
it("road building leaves state unchanged when the second road is illegal", () => {
  const state = createEmptyState(["0"]);
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
  const before = structuredClone(state);

  const result = applyRoadBuilding(state, chainBoard, "0", ["1,2", "1,3"]);

  expect(result).toEqual({ ok: false, error: "illegal-road" });
  expect(state).toEqual(before);
});
```

- [ ] **Step 2: Run the focused test**

Run: `pnpm -C game-core exec vitest run src/rules/devCards.test.ts`

Expected: PASS on final state because current rollback deletes the staged road; this is a characterization test that locks the contract before structural cleanup.

- [ ] **Step 3: Replace mutation-and-rollback with a shallow staged state**

Replace the temporary assignment/deletion around `legalAfterFirst` with:

```ts
const stateAfterFirst: GameState = {
  ...state,
  roadsByEdgeId: {
    ...state.roadsByEdgeId,
    [first]: playerId
  }
};
const legalAfterFirst = buildableEdges(stateAfterFirst, board, playerId, {
  initialPlacement: false
});
if (!legalAfterFirst.includes(second)) {
  return { ok: false, error: "illegal-road" };
}

state.roadsByEdgeId[first] = playerId;
state.roadsByEdgeId[second] = playerId;
```

`GameState` is already imported as a type in this file.

- [ ] **Step 4: Run the complete development-card test file**

Run: `pnpm -C game-core exec vitest run src/rules/devCards.test.ts`

Expected: PASS, including distinct roads, chained roads and unchanged-state rejection.

- [ ] **Step 5: Commit the Road Building staging checkpoint**

```bash
git add game-core/src/rules/devCards.test.ts game-core/src/rules/devCards.ts
git commit -m "refactor(core): stage road building validation"
```

### Task 3: Harden robber actor and selector validation

**Files:**
- Modify: `game-core/src/rules/turnFlow.test.ts:315-404`
- Modify: `game-core/src/rules/turnFlow.ts:328-390`

**Interfaces:**
- Consumes: optional `stolenCardIndex?: number`; omission retains deterministic index zero.
- Produces: new errors `unknown-player` and `invalid-random-selector` before any mutation.

- [ ] **Step 1: Add failing malformed-call tests**

Add:

```ts
it("rejects an unknown robber actor without moving the robber", () => {
  const state = createEmptyState(["0", "1"]);
  const before = structuredClone(state);

  const result = applyMoveRobber(state, board, 1, "9", 0);

  expect(result).toEqual({ ok: false, error: "unknown-player" });
  expect(state).toEqual(before);
});

it.each([Number.NaN, Number.POSITIVE_INFINITY, -0.1, 1])(
  "rejects invalid robber selector %s without changing state",
  (selector) => {
    const state = createEmptyState(["0", "1"]);
    state.buildingsByNodeId[1] = { ownerId: "1", type: "settlement" };
    state.playerStateById["1"].resources = [ResourceType.WOOD];
    const before = structuredClone(state);

    const result = applyMoveRobber(state, board, 1, "0", selector, "1");

    expect(result).toEqual({ ok: false, error: "invalid-random-selector" });
    expect(state).toEqual(before);
  }
);
```

- [ ] **Step 2: Run tests and verify both missing validations fail**

Run: `pnpm -C game-core exec vitest run src/rules/turnFlow.test.ts`

Expected: FAIL because an unknown actor can currently move the robber and selector `1` can select `undefined`.

- [ ] **Step 3: Validate actor before board legality**

At the top of `applyMoveRobber`, add:

```ts
if (!state.playerStateById[actingPlayerId]) {
  return { ok: false, error: "unknown-player" };
}
```

- [ ] **Step 4: Validate a supplied selector before committing a steal**

After victim resolution but before assigning `state.robberTileId`, add:

```ts
if (
  victimId &&
  stolenCardIndex !== undefined &&
  (!Number.isFinite(stolenCardIndex) ||
    stolenCardIndex < 0 ||
    stolenCardIndex >= 1)
) {
  return { ok: false, error: "invalid-random-selector" };
}
```

Keep `const rand = stolenCardIndex !== undefined ? stolenCardIndex : 0` for the existing optional fallback.

- [ ] **Step 5: Run focused turn-flow tests**

Run: `pnpm -C game-core exec vitest run src/rules/turnFlow.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the robber validation checkpoint**

```bash
git add game-core/src/rules/turnFlow.test.ts game-core/src/rules/turnFlow.ts
git commit -m "fix(core): reject malformed robber moves"
```

### Task 4: Lock trade failure atomicity

**Files:**
- Modify: `game-core/src/rules/trading.test.ts`
- Conditional modify: `game-core/src/rules/trading.ts:176-235` only if a test exposes a reachable partial mutation.

**Interfaces:**
- Consumes: existing single, batch and player trade APIs.
- Produces: explicit deep-equality guarantees for rejected trades.

- [ ] **Step 1: Strengthen rejected trade tests with snapshots**

In the existing finite-bank single-trade, invalid batch receive-count and
receiver-insufficient player-trade tests, place this immediately before the
rule call:

```ts
const before = structuredClone(state);
```

Then add this after the existing error assertion:

```ts
expect(state).toEqual(before);
```

Add this complete batch-shortage case:

```ts
it("rejects a finite-bank batch shortage without transferring earlier cards", () => {
  const state = createEmptyState(["0"]);
  state.ruleset.tradeRates.bank = 4;
  state.ruleset.bank.finite = true;
  state.playerStateById["0"].resources = Array(8).fill(ResourceType.ORE);
  state.bank.resources = [ResourceType.BRICK];
  const before = structuredClone(state);

  const result = applyMaritimeTradeBatch(state, board, "0", {
    give: Array(8).fill(ResourceType.ORE),
    receive: [ResourceType.BRICK, ResourceType.WOOD]
  });

  expect(result).toEqual({ ok: false, error: "bank-empty" });
  expect(state).toEqual(before);
});
```

- [ ] **Step 2: Run the complete trading suite**

Run: `pnpm -C game-core exec vitest run src/rules/trading.test.ts`

Expected: PASS if the existing batch preflight makes all later sub-trades infallible.

- [ ] **Step 3: Keep production code unchanged when the contract is already proved**

If Step 2 passes, do not refactor `applyMaritimeTradeBatch`; the complete input and bank preflight already supplies the atomic guarantee. If any snapshot assertion fails, replace its mutation loop with copied player/bank arrays, perform all removals on the copies, and assign both arrays only after every removal succeeds.

- [ ] **Step 4: Commit the trade contract checkpoint**

```bash
git add game-core/src/rules/trading.test.ts game-core/src/rules/trading.ts
git commit -m "test(core): lock atomic trade failures"
```

Omit `game-core/src/rules/trading.ts` from `git add` when Step 3 requires no production change.

### Task 5: Add finite-bank conservation contracts

**Files:**
- Create: `game-core/src/rules/resourceConservation.test.ts`

**Interfaces:**
- Consumes: `applyDiscard`, `applyBuildRoad`, `buyDevCard`, `applyMaritimeTrade`, and `applyResourceDistribution`.
- Produces: test-only per-resource totals across the bank and all player hands.

- [ ] **Step 1: Create the conservation helper and representative tests**

Create the file with this content:

```ts
import { describe, expect, it } from "vitest";
import { createEmptyState, type GameState } from "../core/state";
import { buildTopology } from "../core/topology";
import { ResourceType, TileTypes, type Resource } from "../types";
import { applyBuildRoad } from "./buildActions";
import { buyDevCard } from "./devCards";
import { applyDiscard, applyResourceDistribution } from "./turnFlow";
import { applyMaritimeTrade } from "./trading";

const board = buildTopology([
  {
    coordinate: [0, 0, 0] as [number, number, number],
    type: TileTypes.LAND,
    tile: {
      id: 1,
      resource: ResourceType.WOOD,
      number: 8,
      nodes: { NORTH: 1, SOUTH: 2 },
      edges: { EAST: [1, 2] as [number, number] }
    }
  }
]);

function resourceTotals(state: GameState): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const resource of state.bank.resources) {
    totals[resource] = (totals[resource] ?? 0) + 1;
  }
  for (const player of Object.values(state.playerStateById)) {
    for (const resource of player.resources) {
      totals[resource] = (totals[resource] ?? 0) + 1;
    }
  }
  return totals;
}

function moveFromBankToPlayer(
  state: GameState,
  playerId: string,
  resources: Resource[]
) {
  for (const resource of resources) {
    const index = state.bank.resources.indexOf(resource);
    expect(index).toBeGreaterThanOrEqual(0);
    state.bank.resources.splice(index, 1);
    state.playerStateById[playerId].resources.push(resource);
  }
}

describe("finite-bank resource conservation", () => {
  it("conserves resources when discarding", () => {
    const state = createEmptyState(["0"]);
    moveFromBankToPlayer(state, "0", Array(8).fill(ResourceType.WOOD));
    state.turn.phase = "robberDiscard";
    state.turn.pendingDiscards = ["0"];
    const before = resourceTotals(state);

    expect(applyDiscard(state, "0", Array(4).fill(ResourceType.WOOD))).toEqual({ ok: true });
    expect(resourceTotals(state)).toEqual(before);
  });

  it("conserves resources when building", () => {
    const state = createEmptyState(["0"]);
    moveFromBankToPlayer(state, "0", [ResourceType.WOOD, ResourceType.BRICK]);
    state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
    const before = resourceTotals(state);

    expect(applyBuildRoad(state, board, "1,2", "0").ok).toBe(true);
    expect(resourceTotals(state)).toEqual(before);
  });

  it("conserves resources when buying a development card", () => {
    const state = createEmptyState(["0"]);
    state.devDeck = ["knight"];
    moveFromBankToPlayer(state, "0", [
      ResourceType.SHEEP,
      ResourceType.WHEAT,
      ResourceType.ORE
    ]);
    const before = resourceTotals(state);

    expect(buyDevCard(state, "0").ok).toBe(true);
    expect(resourceTotals(state)).toEqual(before);
  });

  it("conserves resources in a maritime trade", () => {
    const state = createEmptyState(["0"]);
    state.ruleset.tradeRates.bank = 4;
    moveFromBankToPlayer(state, "0", Array(4).fill(ResourceType.WOOD));
    const before = resourceTotals(state);

    expect(
      applyMaritimeTrade(state, board, "0", {
        give: ResourceType.WOOD,
        receive: ResourceType.BRICK
      }).ok
    ).toBe(true);
    expect(resourceTotals(state)).toEqual(before);
  });

  it("conserves resources during production", () => {
    const state = createEmptyState(["0"]);
    state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
    const before = resourceTotals(state);

    expect(applyResourceDistribution(state, board, 8).ok).toBe(true);
    expect(resourceTotals(state)).toEqual(before);
  });
});
```

- [ ] **Step 2: Run the new invariant file**

Run: `pnpm -C game-core exec vitest run src/rules/resourceConservation.test.ts`

Expected: PASS with the fixed discard path and existing finite-bank transfer behavior.

- [ ] **Step 3: Run all game-core tests and build**

Run: `pnpm -C game-core test`

Expected: all game-core tests PASS.

Run: `pnpm -C game-core build`

Expected: TypeScript build exits 0.

- [ ] **Step 4: Commit the invariant checkpoint**

```bash
git add game-core/src/rules/resourceConservation.test.ts
git commit -m "test(core): enforce finite resource conservation"
```

### Task 6: Record the engine hardening checkpoint

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Interfaces:**
- Consumes: final focused test/build evidence from Tasks 1-5.
- Produces: durable repo guidance that rejected rule moves must not mutate state.

- [ ] **Step 1: Add dated progress and durable notes**

Record the exact hardened helpers, new error cases, conservation coverage and commands run. Add a durable note stating:

```md
- Core rule contract: a returned `{ ok: false }` must leave `GameState`
  unchanged. Validate complete inputs against temporary arrays or shallow
  overlays before committing; do not use mutation-and-rollback as validation.
```

- [ ] **Step 2: Verify documentation and diff hygiene**

Run: `git diff --check`

Expected: no output and exit 0.

- [ ] **Step 3: Commit the engine checkpoint documentation**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record engine transaction contracts"
```
