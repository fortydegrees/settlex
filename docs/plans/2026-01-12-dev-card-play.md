# Dev Card Play Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable playing dev cards (knight, road building, year of plenty, monopoly) with server-tracked flows, proper rules enforcement, and UI feedback.

**Architecture:** Store a transient `G.devCardPlay` state for in‑progress dev card actions (YoP/Monopoly selection, road‑building placements). Add a core helper to place a free road without spending resources. Moves validate `canPlayDevCard` and stage (`preRoll`/`postRoll`). UI uses `TradeDiscardModal` in new dev modes and allows clickable dev cards with playability styling.

**Tech Stack:** boardgame.io (moves/stages), React/Next.js UI, Tailwind CSS, game-core rules, Vitest.

---

### Task 1: Core helper for free road placement

**Files:**
- Modify: `game-core/src/rules/buildActions.ts`
- Test: `game-core/src/rules/buildCosts.test.ts`

**Step 1: Write the failing test**
```ts
it("applyFreeRoad places a road without spending resources", () => {
  const state = createEmptyState(["0"]);
  state.playerStateById["0"].resources = [ResourceType.WOOD, ResourceType.BRICK];
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };

  const result = applyFreeRoad(state, board, "1,2", "0");

  expect(result.ok).toBe(true);
  expect(state.playerStateById["0"].resources).toEqual([ResourceType.WOOD, ResourceType.BRICK]);
  expect(state.playerStateById["0"].roadsRemaining).toBe(state.ruleset.pieceLimits.roads - 1);
});
```

**Step 2: Run test to verify it fails**
Run: `pnpm -C game-core test -- buildCosts.test.ts`
Expected: FAIL because `applyFreeRoad` is not defined.

**Step 3: Write minimal implementation**
```ts
export function applyFreeRoad(state: GameState, board: BoardTopology, edgeId: EdgeId, playerId: string) {
  const player = state.playerStateById[playerId];
  if (!player) return { ok: false, state, error: "unknown-player" } as const;
  if (player.roadsRemaining <= 0) return { ok: false, state, error: "no-pieces-left" } as const;
  const legal = buildableEdges(state, board, playerId, { initialPlacement: false });
  if (!legal.includes(edgeId)) return { ok: false, state, error: "illegal-road" } as const;
  state.roadsByEdgeId[edgeId] = playerId;
  player.roadsRemaining -= 1;
  recomputeCaches(state, board);
  recomputeLongestRoad(state, board);
  return { ok: true, state } as const;
}
```

**Step 4: Run test to verify it passes**
Run: `pnpm -C game-core test -- buildCosts.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add game-core/src/rules/buildActions.ts game-core/src/rules/buildCosts.test.ts
git commit -m "feat(game-core): add free road placement helper"
```

---

### Task 2: Dev‑card play moves + tests (server‑tracked)

**Files:**
- Modify: `app/catana/Moves.js`
- Modify: `app/catana/Game.js`
- Test: `app/catana/__tests__/Moves.devCards.test.js` (new)

**Step 1: Write the failing tests**
Create `app/catana/__tests__/Moves.devCards.test.js`:
```js
import { describe, it, expect, vi } from "vitest";
import { createEmptyState, buildTopology } from "@settlex/game-core";
import { playDevCardStart, placeRoadFromDevCard, confirmDevCardPlay } from "../Moves";

const coreTopology = buildTopology([]);

it("playDevCardStart sets devCardPlay for year of plenty", () => {
  const state = createEmptyState(["0"]);
  state.playerStateById["0"].devCards = ["yearOfPlenty"];
  const ctx = { currentPlayer: "0", activePlayers: { "0": "preRoll" } };
  const context = { G: { core: state }, playerID: "0", ctx };

  playDevCardStart.move(context, "yearOfPlenty");

  expect(context.G.devCardPlay).toEqual({ type: "yearOfPlenty", playerId: "0" });
});

it("playDevCardStart sends knight to moveRobber and stores return stage", () => {
  const state = createEmptyState(["0"]);
  state.playerStateById["0"].devCards = ["knight"];
  const events = { setStage: vi.fn() };
  const ctx = { currentPlayer: "0", activePlayers: { "0": "preRoll" } };
  const context = { G: { core: state }, playerID: "0", ctx, events };

  playDevCardStart.move(context, "knight");

  expect(context.G.robberReturnToStage).toBe("preRoll");
  expect(events.setStage).toHaveBeenCalledWith("moveRobber");
});

it("placeRoadFromDevCard consumes pendingRoads and clears when done", () => {
  const state = createEmptyState(["0"]);
  state.playerStateById["0"].devCards = ["roadBuilding"];
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
  const context = {
    G: { core: state, coreTopology, devCardPlay: { type: "roadBuilding", playerId: "0", pendingRoads: 1 } },
    playerID: "0",
    ctx: { currentPlayer: "0", activePlayers: { "0": "postRoll" } },
  };

  placeRoadFromDevCard.move(context, "1,2");

  expect(context.G.devCardPlay).toBe(null);
  expect(state.playerStateById["0"].devCards).toEqual([]);
});
```

**Step 2: Run test to verify it fails**
Run: `pnpm test app/catana/__tests__/Moves.devCards.test.js`
Expected: FAIL (moves do not exist).

**Step 3: Write minimal implementation**
- Add `playDevCardStart`, `confirmDevCardPlay`, `placeRoadFromDevCard`, and `cancelDevCardPlay` in `app/catana/Moves.js`.
- Add `devCardPlay: null` and `robberReturnToStage: null` to the `setup` return object in `app/catana/Game.js`.
- Allow new moves in `preRoll` and `postRoll` stages.
- Update `moveRobber` to respect `G.robberReturnToStage ?? "postRoll"` and clear it after use.

**Step 4: Run tests to verify they pass**
Run: `pnpm test app/catana/__tests__/Moves.devCards.test.js`
Expected: PASS.

**Step 5: Commit**
```bash
git add app/catana/Moves.js app/catana/Game.js app/catana/__tests__/Moves.devCards.test.js
git commit -m "feat(app): add dev card play moves"
```

---

### Task 3: Road‑building UI mode wiring

**Files:**
- Modify: `app/catana/Board.js`
- Modify: `app/catana/Edge.js`
- Modify: `app/catana/GameScreen.js`

**Step 1: Write a failing test (optional UI test — pending approval)**
If no UI test infra is desired, skip this step with explicit approval.

**Step 2: Implement minimal wiring**
- Treat `playerAction === "roadBuilding"` like `placeRoad` for buildable edge highlights.
- When `playerAction === "roadBuilding"`, call `moves.placeRoadFromDevCard` in `Edge`.
- In `GameScreen`, add an effect that sets `playerAction` to `"roadBuilding"` when `G.devCardPlay.type === "roadBuilding"` for the current player, and clears it when done.

**Step 3: Manual verification**
- Start a game, play Road Building, place roads (1 or 2 depending on remaining roads), ensure card is consumed and action ends.

**Step 4: Commit**
```bash
git add app/catana/Board.js app/catana/Edge.js app/catana/GameScreen.js
git commit -m "feat(ui): wire road-building placement mode"
```

---

### Task 4: Dev‑card UI + modal reuse

**Files:**
- Modify: `app/catana/components/TradeDiscardModal.js`
- Modify: `app/catana/components/DevCardDisplay.js`
- Modify: `app/catana/components/DevCardDisplay.css`
- Modify: `app/catana/components/PlayerActionContainer.js`
- Modify: `app/catana/GameScreen.js`

**Step 1: Write failing test (optional UI test — pending approval)**
If no UI test infra is desired, skip this step with explicit approval.

**Step 2: Implement minimal UI**
- Extend `TradeDiscardModal` modes:
  - `dev-yop`: select exactly two resources (bank‑checked if finite).
  - `dev-monopoly`: select exactly one resource (no bank constraint).
- In `GameScreen`, render modal when `G.devCardPlay.type` matches; on confirm, call `moves.confirmDevCardPlay` and close; on cancel, call `moves.cancelDevCardPlay`.
- In `PlayerActionContainer`, compute `isDevPlayable` using `canPlayDevCard`, stage (`preRoll`/`postRoll`), and `devCardPlay` in progress; pass click handlers to `DevCardDisplay`.
- In `DevCardDisplay`, add playable/disabled styling, hover/active raise, and a small “play” interaction state. (Optional: minimal fade/scale on play via a transient local state.)

**Step 3: Manual verification**
- Knight: plays, triggers robber, returns to correct stage (pre/post roll).
- YoP: select two resources; bank constraints enforced; card consumed.
- Monopoly: select resource; resources transfer; card consumed.
- Road Building: places free roads; card consumed after placements.
- Only one dev card per turn; cannot play on purchase turn.

**Step 4: Commit**
```bash
git add app/catana/components/TradeDiscardModal.js app/catana/components/DevCardDisplay.js app/catana/components/DevCardDisplay.css app/catana/components/PlayerActionContainer.js app/catana/GameScreen.js
git commit -m "feat(ui): enable dev card play UX"
```
