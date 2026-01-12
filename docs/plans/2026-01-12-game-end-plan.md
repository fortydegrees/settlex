# Game End Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** End the game immediately when the active player reaches the victory point threshold during normal play, with core state as the authority.

**Architecture:** Add `gameOver` to core `GameState` and a `checkAndApplyWin` helper in `game-core/src/rules/victory.ts`. Call the helper after VP-affecting actions (build actions, dev card wins) and expose game over to boardgame.io via `endIf` in `app/catana/Game.js`.

**Tech Stack:** TypeScript (game-core), Vitest, boardgame.io, Next.js UI.

### Task 1: Add core game-over helper tests

**Files:**
- Modify: `game-core/src/rules/victory.test.ts`

**Step 1: Write the failing tests**

Add tests that reference a new `checkAndApplyWin` helper and the new `gameOver` field:

```ts
import { checkAndApplyWin } from "./victory";

it("sets gameOver when current player reaches threshold in normal phase", () => {
  const state = createEmptyState(["0"]);
  state.phase = "normal";
  state.turn.currentPlayerId = "0";
  state.ruleset.victoryPointsToWin = 1;
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };

  checkAndApplyWin(state, "0");

  expect(state.gameOver).toEqual({ winnerId: "0", reason: "victoryPoints" });
});

it("ignores wins outside normal phase", () => {
  const state = createEmptyState(["0"]);
  state.phase = "placement";
  state.turn.currentPlayerId = "0";
  state.ruleset.victoryPointsToWin = 1;
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };

  checkAndApplyWin(state, "0");

  expect(state.gameOver).toBe(null);
});

it("ignores wins when acting player is not current player", () => {
  const state = createEmptyState(["0", "1"]);
  state.phase = "normal";
  state.turn.currentPlayerId = "0";
  state.ruleset.victoryPointsToWin = 1;
  state.buildingsByNodeId[1] = { ownerId: "1", type: "settlement" };

  checkAndApplyWin(state, "1");

  expect(state.gameOver).toBe(null);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C game-core test -- --run src/rules/victory.test.ts`

Expected: FAIL (missing `checkAndApplyWin` / `gameOver`).

**Step 3: Commit the failing tests**

```bash
git add game-core/src/rules/victory.test.ts
git commit -m "test: add game-over helper coverage"
```

### Task 2: Add core game-over state + helper

**Files:**
- Modify: `game-core/src/core/state.ts`
- Modify: `game-core/src/rules/victory.ts`

**Step 1: Implement minimal code**

Add to `GameState`:

```ts
gameOver: { winnerId: string; reason: "victoryPoints" } | null;
```

Initialize to `null` in `createEmptyState`.

Add helper in `game-core/src/rules/victory.ts`:

```ts
export function checkAndApplyWin(state: GameState, actingPlayerId: string): void {
  if (state.phase !== "normal") return;
  if (state.gameOver) return;
  if (state.turn.currentPlayerId !== actingPlayerId) return;
  if (checkWin(state, actingPlayerId)) {
    state.gameOver = { winnerId: actingPlayerId, reason: "victoryPoints" };
  }
}
```

**Step 2: Run test to verify it passes**

Run: `pnpm -C game-core test -- --run src/rules/victory.test.ts`

Expected: PASS.

**Step 3: Commit**

```bash
git add game-core/src/core/state.ts game-core/src/rules/victory.ts
git commit -m "feat: add core game-over state and helper"
```

### Task 3: Add game-over wiring tests for actions

**Files:**
- Modify: `game-core/src/rules/victory.test.ts`

**Step 1: Write failing tests**

Add integration-style tests that use existing actions:

```ts
import { applyBuildCity } from "./buildActions";
import { buyDevCard } from "./devCards";
import { buildTopology } from "../core/topology";
import { generateBoard } from "../board/generateBoard";
import { spec } from "../spec";
import { makeDeterministicRng } from "../testUtils";
import { ResourceType } from "../types";

it("sets gameOver after building a city in normal play", () => {
  const tiles = generateBoard(spec, makeDeterministicRng(1));
  const board = buildTopology(tiles);
  const state = createEmptyState(["0"]);
  state.phase = "normal";
  state.turn.currentPlayerId = "0";
  state.ruleset.victoryPointsToWin = 2;
  const node = board.landNodeIds[0];
  state.buildingsByNodeId[node] = { ownerId: "0", type: "settlement" };
  state.playerStateById["0"].resources = [
    ResourceType.WHEAT,
    ResourceType.WHEAT,
    ResourceType.ORE,
    ResourceType.ORE,
    ResourceType.ORE
  ];

  const result = applyBuildCity(state, board, node, "0");

  expect(result.ok).toBe(true);
  expect(state.gameOver?.winnerId).toBe("0");
});

it("sets gameOver when buying a victory point dev card", () => {
  const state = createEmptyState(["0"]);
  state.phase = "normal";
  state.turn.currentPlayerId = "0";
  state.ruleset.victoryPointsToWin = 1;
  state.devDeck = ["victoryPoint"];
  state.playerStateById["0"].resources = [
    ResourceType.SHEEP,
    ResourceType.WHEAT,
    ResourceType.ORE
  ];

  const result = buyDevCard(state, "0");

  expect(result.ok).toBe(true);
  expect(state.gameOver?.winnerId).toBe("0");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C game-core test -- --run src/rules/victory.test.ts`

Expected: FAIL (no wiring yet).

**Step 3: Commit failing tests**

```bash
git add game-core/src/rules/victory.test.ts
git commit -m "test: cover game-over wiring via actions"
```

### Task 4: Wire win checks into actions

**Files:**
- Modify: `game-core/src/rules/buildActions.ts`
- Modify: `game-core/src/rules/devCards.ts`
- Modify: `game-core/src/rules/apply.ts`

**Step 1: Implement minimal wiring**

Import and call `checkAndApplyWin` after VP-affecting updates:
- `applyBuildRoad`, `applyFreeRoad`, `applyBuildSettlement`, `applyBuildCity` (after recompute).
- `applyRoadBuilding` and `applyKnight` (after recompute).
- `buyDevCard` (after adding the card).
- `applyPlaceSettlement` / `applyPlaceRoad` (safe no-op during placement).

**Step 2: Run tests**

Run: `pnpm -C game-core test -- --run src/rules/victory.test.ts`

Expected: PASS.

**Step 3: Commit**

```bash
git add game-core/src/rules/buildActions.ts game-core/src/rules/devCards.ts game-core/src/rules/apply.ts
git commit -m "feat: trigger game-over after VP changes"
```

### Task 5: Surface game-over to boardgame.io

**Files:**
- Modify: `app/catana/Game.js`
- Create: `app/catana/__tests__/Game.mainPhaseEnd.test.js` (or extend existing Game tests)

**Step 1: Write failing test**

```js
import { Catan } from "../Game";

it("main phase endIf returns gameOver when set", () => {
  const endIf = Catan.phases.main.endIf;
  const G = { core: { gameOver: { winnerId: "0", reason: "victoryPoints" } } };
  expect(endIf({ G })).toEqual(G.core.gameOver);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- --run app/catana/__tests__/Game.mainPhaseEnd.test.js`

Expected: FAIL (endIf returns undefined).

**Step 3: Implement minimal change**

Update `app/catana/Game.js` main phase `endIf` to:

```js
endIf: ({ G }) => G.core.gameOver ?? undefined,
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- --run app/catana/__tests__/Game.mainPhaseEnd.test.js`

Expected: PASS.

**Step 5: Commit**

```bash
git add app/catana/Game.js app/catana/__tests__/Game.mainPhaseEnd.test.js
git commit -m "feat: end game when core reports winner"
```

### Task 6: Update agent docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Update notes**
- Note that core game-over state exists and endIf reads it.

**Step 2: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: note core game-over wiring"
```
