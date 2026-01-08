# Core G-Shape Migration (Slice 1) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace boardgame.io `G` state with the new core `GameState` for placement moves and expose buildability helpers, accepting a temporary UI break until slice 2.

**Architecture:** `G` becomes the canonical core state (from `game-core/src/core/state.ts`). Moves call `game-core` rules (`applyPlaceSettlement`, `applyPlaceRoad`) and buildability helpers. UI will be refactored in the next slice to read from the new core shape.

**Tech Stack:** Next.js, boardgame.io, TypeScript in game-core, JavaScript in UI.

### Task 1: Add core state to game setup

**Files:**
- Modify: `app/catana/Game.js`
- Test: `game-core/src/rules/buildability.test.ts` (no change, sanity only)

**Step 1: Write the failing test**

No new tests in UI yet; we’ll rely on `game-core` tests for rule correctness and manual dev‑server sanity after slice 2. (TDD for UI comes in slice 2 when UI is refactored.)

**Step 2: Run test to verify baseline**

Run: `pnpm -C game-core test`
Expected: PASS (11 tests).

**Step 3: Write minimal implementation**

In `app/catana/Game.js`:
- Import core helpers from `@settlex/game-core`:
  - `buildTopology`, `createEmptyState`, `applyPlaceSettlement`, `applyPlaceRoad`, `buildableNodes`, `buildableEdges`
- In `setup()`, build topology from generated tiles and initialize `G.core`:
  - `G.core = createEmptyState(players)`
  - `G.core.phase = ctx.phase === "placement" ? "placement" : "normal"`
  - Store `G.coreTopology` (or `G.coreBoard`) as serialized topology (or just keep in module‑level cache if required)

**Step 4: Run game-core tests**

Run: `pnpm -C game-core test`
Expected: PASS

**Step 5: Commit**

```bash
git add app/catana/Game.js
git commit -m "feat: initialize core game state in setup"
```

### Task 2: Port placement moves to core rules

**Files:**
- Modify: `app/catana/Moves.js`

**Step 1: Write the failing test**

Add a small move‑level test in `server` or a simple unit test in `app/catana` if possible. If not, note that moves are thin wrappers and rely on `game-core` tests already present.

**Step 2: Run test to verify it fails**

Run: `pnpm -C game-core test`
Expected: PASS (no regression). Manual run of dev server will likely fail due to UI shape mismatch (expected).

**Step 3: Write minimal implementation**

In `placeSettlement` and `placeRoad`:
- Replace direct mutation of `G.nodes` / `G.edges` with calls into core:
  - `applyPlaceSettlement(G.core, G.coreTopology, nodeId, playerID, { initialPlacement: ctx.phase === "placement" })`
  - `applyPlaceRoad(G.core, G.coreTopology, edgeId, playerID, { initialPlacement: ctx.phase === "placement" })`
- If result is not ok, return early.
- For placement phase, handle `pendingRoadFromNodeIdByPlayer` from core state instead of local logic.

**Step 4: Run game-core tests**

Run: `pnpm -C game-core test`
Expected: PASS

**Step 5: Commit**

```bash
git add app/catana/Moves.js
git commit -m "feat: route placement moves through core state"
```

### Task 3: Expose buildability helpers for UI refactor

**Files:**
- Modify: `app/catana/Moves.js` or `app/catana/utils/game.js`

**Step 1: Write the failing test**

Add a small helper function (e.g. `getBuildableNodesCore`) and test in `game-core` is already present; UI tests deferred to slice 2.

**Step 2: Implement helper**

Provide wrappers that call `buildableNodes` / `buildableEdges` from `game-core`:
- `getBuildableNodesCore(G, playerId, ctx)`
- `getBuildableEdgesCore(G, playerId, ctx, fromNodeId?)`

These will be used in slice 2 when UI is refactored.

**Step 3: Commit**

```bash
git add app/catana/Moves.js app/catana/utils/game.js
git commit -m "feat: add core buildability helpers"
```

### Task 4: Update agent docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/FEATURES.json`

**Step 1: Update PROGRESS**

Add a bullet noting `G` now uses core state for placement moves and UI is pending refactor.

**Step 2: Update FEATURES**

Update `core-extraction` acceptance to mention `G` migration in progress; add a note that UI refactor is next slice.

**Step 3: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/FEATURES.json
git commit -m "docs: update progress for G state migration"
```
