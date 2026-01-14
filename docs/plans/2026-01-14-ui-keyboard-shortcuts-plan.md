# UI keyboard shortcuts implementation plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Space bar shortcut on the main Catana game screen that rolls dice when eligible, otherwise ends the turn, and keep UI states in sync.

**Architecture:** Compute `canRoll`/`canEnd` in `GameScreen` using core + ctx state, pass into `PlayerActionContainer`, and add a window `keydown` listener scoped to GameScreen that respects modals and editable targets.

**Tech Stack:** React (Next.js), boardgame.io client state, Vitest for unit tests.

### Task 1: Add tests for the Space shortcut hook-in

**Files:**
- Modify: `app/catana/__tests__/GameScreen.interactionGuards.test.js`

**Step 1: Write the failing test**

Add a test that asserts `GameScreen.js` contains the Space key handler and editable target guard.

```js
it("handles Space keydown for shortcuts", () => {
  const contents = fs.readFileSync(screenPath, "utf8");
  expect(contents).toMatch(/Space/);
  expect(contents).toMatch(/keydown/);
});

it("guards keyboard shortcuts for editable targets", () => {
  const contents = fs.readFileSync(screenPath, "utf8");
  expect(contents).toMatch(/contenteditable/i);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run app/catana/__tests__/GameScreen.interactionGuards.test.js`
Expected: FAIL with missing match for `Space`/`contenteditable`.

**Step 3: Commit**

```bash
git add app/catana/__tests__/GameScreen.interactionGuards.test.js
git commit -m "test: cover game screen keyboard shortcut guards"
```

### Task 2: Implement shortcut listener and shared eligibility

**Files:**
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/components/PlayerActionContainer.js`

**Step 1: Implement eligibility computation in GameScreen**

Add `canRoll` and `canEnd` booleans based on `G.core.turn` + `ctx` + `playerID`:

```js
const canRoll = Boolean(
  playerID &&
  bgioProps.ctx.currentPlayer === playerID &&
  bgioProps.ctx.activePlayers?.[playerID] === "preRoll" &&
  bgioProps.G.core?.phase === "normal" &&
  bgioProps.G.core?.turn?.phase === "preRoll"
);

const canEnd = Boolean(
  playerID &&
  bgioProps.ctx.currentPlayer === playerID &&
  bgioProps.ctx.activePlayers?.[playerID] === "postRoll" &&
  bgioProps.G.core?.phase === "normal" &&
  bgioProps.G.core?.turn?.hasRolled &&
  bgioProps.G.core?.turn?.phase === "postRoll" &&
  (bgioProps.G.core?.turn?.pendingDiscards?.length ?? 0) === 0
);
```

**Step 2: Add keydown listener in GameScreen**

Implement a `useEffect` that registers a window `keydown` handler checking:
- `event.code === "Space"`
- no modifiers, no repeat
- not in editable target (`input`, `textarea`, `select`, or `[contenteditable="true"]`)
- no modal open (`showTradeModal`, `needsToDiscard`, dev card modal)

Then call `moves.rollDice()` if `canRoll`, else `moves.endTurn()` if `canEnd`.

**Step 3: Wire canRoll/canEnd into PlayerActionContainer**

Add props `canRoll` and `canEnd`, replace inline dice checks with `canRoll`, and gate End Turn click/opacity with `canEnd`.

**Step 4: Run tests**

Run: `pnpm verify`
Expected: PASS (lint warnings allowed as currently present).

**Step 5: Commit**

```bash
git add app/catana/GameScreen.js app/catana/components/PlayerActionContainer.js
git commit -m "feat: add spacebar shortcut for roll/end turn"
```

### Task 3: Update agent notes

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Update PROGRESS.md**

Add a brief entry noting the keyboard shortcut and UI gating work.

**Step 2: Update NOTES.md**

Note any caveats (e.g., shortcut disabled while modal open; ignored for editable inputs).

**Step 3: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: note keyboard shortcut behavior"
```
