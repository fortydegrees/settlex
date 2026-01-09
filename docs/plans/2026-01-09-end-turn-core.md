# Core End-Turn Helper Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a core `applyEndTurn` helper that enforces legality, advances the current player, and resets per-turn state; wire UI to call it instead of relying on UI-owned turn transitions.

**Architecture:** Implement `applyEndTurn` in `game-core/src/rules/turnFlow.ts` with strict preconditions and deterministic turn reset. Add focused tests in `turnFlow.test.ts`. Update `Moves.js` end-turn move to call the core helper and log errors.

**Tech Stack:** TypeScript (`game-core`), Vitest, boardgame.io UI shell.

---

### Task 1: Add failing tests for applyEndTurn

**Files:**
- Modify: `game-core/src/rules/turnFlow.test.ts`

**Step 1: Write the failing tests**

Append to `turnFlow.test.ts`:

```ts
import { applyEndTurn } from "./turnFlow";

it("advances the current player and resets turn state", () => {
  const state = createEmptyState(["0", "1"]);
  state.turn.currentPlayerId = "0";
  state.turn.phase = "postRoll";
  state.turn.hasRolled = true;
  state.turn.lastRollTotal = 9;
  state.turn.pendingDiscards = [];
  state.playerStateById["0"].devCardsBoughtThisTurn = ["knight"];
  state.playerStateById["0"].devCardsPlayedThisTurn = 1;

  const result = applyEndTurn(state);

  expect(result.ok).toBe(true);
  expect(state.turn.currentPlayerId).toBe("1");
  expect(state.turn.phase).toBe("preRoll");
  expect(state.turn.hasRolled).toBe(false);
  expect(state.turn.lastRollTotal).toBeNull();
  expect(state.turn.pendingDiscards).toEqual([]);
  expect(state.playerStateById["0"].devCardsBoughtThisTurn).toEqual([]);
  expect(state.playerStateById["0"].devCardsPlayedThisTurn).toBe(0);
});

it("wraps to the first player when ending the last player's turn", () => {
  const state = createEmptyState(["0", "1"]);
  state.turn.currentPlayerId = "1";
  state.turn.phase = "postRoll";
  state.turn.hasRolled = true;

  const result = applyEndTurn(state);

  expect(result.ok).toBe(true);
  expect(state.turn.currentPlayerId).toBe("0");
});

it("rejects end turn before rolling", () => {
  const state = createEmptyState(["0"]);
  state.turn.phase = "preRoll";
  state.turn.hasRolled = false;

  const result = applyEndTurn(state);

  expect(result.ok).toBe(false);
});

it("rejects end turn when robber flow is active", () => {
  const state = createEmptyState(["0"]);
  state.turn.phase = "robberMove";
  state.turn.hasRolled = true;

  const result = applyEndTurn(state);

  expect(result.ok).toBe(false);
});

it("rejects end turn when discards are pending", () => {
  const state = createEmptyState(["0"]);
  state.turn.phase = "postRoll";
  state.turn.hasRolled = true;
  state.turn.pendingDiscards = ["0"];

  const result = applyEndTurn(state);

  expect(result.ok).toBe(false);
});
```

**Step 2: Run the test to verify it fails**

```bash
pnpm -C game-core test -- src/rules/turnFlow.test.ts
```
Expected: FAIL (missing `applyEndTurn` export).

**Step 3: Commit**

```bash
git add game-core/src/rules/turnFlow.test.ts
git commit -m "test(core): add applyEndTurn coverage"
```

---

### Task 2: Implement applyEndTurn

**Files:**
- Modify: `game-core/src/rules/turnFlow.ts`
- Modify: `game-core/src/index.ts` (export helper if needed)

**Step 1: Implement helper**

Add to `turnFlow.ts`:

```ts
export function applyEndTurn(
  state: GameState
): { ok: true } | { ok: false; error: string } {
  if (state.phase !== "normal") {
    return { ok: false, error: "not-in-normal-phase" };
  }
  if (!state.turn.hasRolled) {
    return { ok: false, error: "not-rolled" };
  }
  if (state.turn.phase !== "postRoll") {
    return { ok: false, error: "turn-not-finished" };
  }
  if (state.turn.pendingDiscards.length > 0) {
    return { ok: false, error: "discard-pending" };
  }

  const currentIndex = state.players.indexOf(state.turn.currentPlayerId);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % state.players.length;
  const currentId = state.turn.currentPlayerId;
  const nextId = state.players[nextIndex] ?? currentId;

  state.turn.currentPlayerId = nextId;
  state.turn.phase = "preRoll";
  state.turn.hasRolled = false;
  state.turn.lastRollTotal = null;
  state.turn.pendingDiscards = [];

  const currentPlayer = state.playerStateById[currentId];
  if (currentPlayer) {
    currentPlayer.devCardsBoughtThisTurn = [];
    currentPlayer.devCardsPlayedThisTurn = 0;
  }

  return { ok: true };
}
```

Ensure `applyEndTurn` is exported from `game-core/src/index.ts` if used in UI.

**Step 2: Run tests to verify pass**

```bash
pnpm -C game-core test -- src/rules/turnFlow.test.ts
```
Expected: PASS.

**Step 3: Commit**

```bash
git add game-core/src/rules/turnFlow.ts game-core/src/index.ts
git commit -m "feat(core): add applyEndTurn helper"
```

---

### Task 3: Wire UI end-turn to core

**Files:**
- Modify: `app/catana/Moves.js`

**Step 1: Add endTurn move**

Add `applyEndTurn` import and implement:

```js
export const endTurn = {
  move: (context) => {
    const { G } = context;
    const result = applyEndTurn(G.core);
    if (!result.ok) {
      console.log("Cannot end turn yet:", result.error);
    }
  }
};
```

Ensure the End Turn button uses this move (already calls `moves.endTurn()`).

**Step 2: Manual check**

Run `pnpm dev` and verify end turn advances to next player only after a roll.

**Step 3: Commit**

```bash
git add app/catana/Moves.js
git commit -m "feat(ui): end turn via core helper"
```

---

### Task 4: Update agent docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Update notes**

Add note that `applyEndTurn` exists and UI uses it.

**Step 2: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs(agent): note core end turn helper"
```

