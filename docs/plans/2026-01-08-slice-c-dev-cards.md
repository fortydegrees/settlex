# Slice C (Development Cards) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement dev card deck, purchasing, play rules, and effects (Knight, Road Building, Year of Plenty, Monopoly, VP) with tests.

**Architecture:** Extend core state with dev deck + player dev hand/played tracking. Add `devCards.ts` rule helpers that validate play timing and apply effects. Keep effects deterministic. No UI wiring in this slice.

**Tech Stack:** TypeScript, Vitest, `game-core`.

---

### Task 1: State + types for dev cards

**Files:**
- Modify: `game-core/src/types.ts`
- Modify: `game-core/src/core/state.ts`
- Modify: `game-core/src/ruleset.ts`
- Create: `game-core/src/rules/devCards.ts`
- Create: `game-core/src/rules/devCards.test.ts`
- Modify: `game-core/src/index.ts`

**Step 1: Write failing tests**

Create `game-core/src/rules/devCards.test.ts` with deck + purchase tests:

```ts
import { describe, it, expect } from "vitest";
import { createEmptyState } from "../core/state";
import { ResourceType } from "../types";
import { createStandardDevDeck, buyDevCard } from "./devCards";

describe("dev cards - deck", () => {
  it("creates a 25-card deck with standard counts", () => {
    const deck = createStandardDevDeck();
    expect(deck).toHaveLength(25);
    expect(deck.filter((c) => c === "knight")).toHaveLength(14);
    expect(deck.filter((c) => c === "victoryPoint")).toHaveLength(5);
    expect(deck.filter((c) => c === "roadBuilding")).toHaveLength(2);
    expect(deck.filter((c) => c === "yearOfPlenty")).toHaveLength(2);
    expect(deck.filter((c) => c === "monopoly")).toHaveLength(2);
  });
});

describe("dev cards - purchase", () => {
  it("buys a card when resources are sufficient", () => {
    const state = createEmptyState(["0"]);
    state.devDeck = ["knight"];
    state.playerStateById["0"].resources = [
      ResourceType.SHEEP,
      ResourceType.WHEAT,
      ResourceType.ORE
    ];

    const result = buyDevCard(state, "0");

    expect(result.ok).toBe(true);
    expect(state.devDeck).toHaveLength(0);
    expect(state.playerStateById["0"].devCards).toEqual(["knight"]);
  });
});
```

**Step 2: Run tests to verify failure**

```bash
pnpm -C game-core test -- src/rules/devCards.test.ts
```
Expected: FAIL.

**Step 3: Implement scaffolding**

- Add `DevCardType` union in `types.ts`.
- Extend `PlayerState` with:
  - `devCards: DevCardType[]`
  - `devCardsBoughtThisTurn: DevCardType[]`
  - `devCardsPlayedThisTurn: number`
  - `knightsPlayed: number`
- Extend `GameState` with `devDeck: DevCardType[]`.
- Extend `Ruleset` with dev card counts and `devCardsEnabled` flag.
- Implement `createStandardDevDeck()` and `buyDevCard()` in `devCards.ts`.
- Export new modules in `index.ts`.

**Step 4: Run tests to verify pass**

```bash
pnpm -C game-core test -- src/rules/devCards.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add game-core/src/types.ts game-core/src/core/state.ts game-core/src/ruleset.ts game-core/src/rules/devCards.ts game-core/src/rules/devCards.test.ts game-core/src/index.ts
git commit -m "feat(core): add dev card deck + purchase"
```

---

### Task 2: Play rules and per-turn limits

**Files:**
- Modify: `game-core/src/rules/devCards.test.ts`
- Modify: `game-core/src/rules/devCards.ts`

**Step 1: Write failing tests**

Append tests:

```ts
import { canPlayDevCard, playDevCard } from "./devCards";

it("prevents playing more than one dev card per turn", () => {
  const state = createEmptyState(["0"]);
  state.playerStateById["0"].devCards = ["knight"];
  state.playerStateById["0"].devCardsPlayedThisTurn = 1;

  expect(canPlayDevCard(state, "0", "knight")).toBe(false);
});

it("prevents playing a dev card bought this turn", () => {
  const state = createEmptyState(["0"]);
  state.playerStateById["0"].devCards = ["knight"];
  state.playerStateById["0"].devCardsBoughtThisTurn = ["knight"];

  expect(canPlayDevCard(state, "0", "knight")).toBe(false);
});
```

**Step 2: Run tests to verify failure**

```bash
pnpm -C game-core test -- src/rules/devCards.test.ts
```
Expected: FAIL.

**Step 3: Implement**

Implement `canPlayDevCard()` to enforce:
- not played this turn already (except VP cards)
- not bought this turn

**Step 4: Run tests**

```bash
pnpm -C game-core test -- src/rules/devCards.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add game-core/src/rules/devCards.ts game-core/src/rules/devCards.test.ts
git commit -m "feat(core): enforce dev card play limits"
```

---

### Task 3: Card effects (Knight, Year of Plenty, Monopoly, Road Building, VP)

**Files:**
- Modify: `game-core/src/rules/devCards.test.ts`
- Modify: `game-core/src/rules/devCards.ts`

**Step 1: Write failing tests**

Append tests (minimal):

```ts
import { applyYearOfPlenty, applyMonopoly, applyKnight, applyRoadBuilding } from "./devCards";

it("year of plenty takes two resources if bank has them", () => {
  const state = createEmptyState(["0"]);
  state.bank.resources = [ResourceType.WOOD, ResourceType.BRICK];
  const result = applyYearOfPlenty(state, "0", [ResourceType.WOOD, ResourceType.BRICK]);
  expect(result.ok).toBe(true);
  expect(state.playerStateById["0"].resources).toEqual([ResourceType.WOOD, ResourceType.BRICK]);
});

it("monopoly transfers resources from other players", () => {
  const state = createEmptyState(["0", "1"]);
  state.playerStateById["1"].resources = [ResourceType.WOOD, ResourceType.WOOD];
  const result = applyMonopoly(state, "0", ResourceType.WOOD);
  expect(result.ok).toBe(true);
  expect(state.playerStateById["0"].resources).toEqual([ResourceType.WOOD, ResourceType.WOOD]);
  expect(state.playerStateById["1"].resources).toEqual([]);
});

it("knight increments knightsPlayed", () => {
  const state = createEmptyState(["0"]);
  const result = applyKnight(state, "0");
  expect(result.ok).toBe(true);
  expect(state.playerStateById["0"].knightsPlayed).toBe(1);
});

it("road building allows two free roads if legal", () => {
  const state = createEmptyState(["0"]);
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
  const result = applyRoadBuilding(state, board, "0", ["1,2", "1,2"]);
  expect(result.ok).toBe(false);
});
```

(We’ll implement the real road building rule to place two distinct legal roads; test can be refined to ensure legality enforcement.)

**Step 2: Run tests to verify failure**

```bash
pnpm -C game-core test -- src/rules/devCards.test.ts
```
Expected: FAIL.

**Step 3: Implement effects**

- `applyYearOfPlenty`: if bank lacks any requested resource and finite, take none.
- `applyMonopoly`: transfer all cards of chosen resource from others to player.
- `applyKnight`: increments knightsPlayed; robber placement handled by `turnFlow` (return a flag).
- `applyRoadBuilding`: validate two distinct legal edges; add roads without cost, but still enforce piece limits.
- `playDevCard()` orchestrates removal from hand, increments `devCardsPlayedThisTurn`, and calls effect.

**Step 4: Run tests**

```bash
pnpm -C game-core test -- src/rules/devCards.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add game-core/src/rules/devCards.ts game-core/src/rules/devCards.test.ts
git commit -m "feat(core): implement dev card effects"
```
