# Slice G (Board Generation: Random) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a minimal board preset resolver and switch the UI to use the random board generator (`generateBoard`) with deterministic RNG. Store `boardPresetId` alongside generated tiles in game state.

**Architecture:** Keep board presets separate from rulesets. Presets resolve to the existing `spec` for now. Generated tiles are stored in `G.tiles`, and a `boardPresetId` string is stored for replay metadata.

**Tech Stack:** TypeScript, Vitest, `game-core`, Next.js app shell.

---

### Task 1: Board preset resolver + tests

**Files:**
- Create: `game-core/src/board/boardPresets.ts`
- Create: `game-core/src/board/boardPresets.test.ts`
- Modify: `game-core/src/index.ts`

**Step 1: Write the failing test**

Create `game-core/src/board/boardPresets.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { resolveBoardPreset } from "./boardPresets";

describe("board presets", () => {
  it("resolves the standard-random preset", () => {
    const preset = resolveBoardPreset("standard-random");
    expect(preset.map).toBe("hexagon");
    expect(preset.radius).toBe(2);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm -C game-core test -- src/board/boardPresets.test.ts
```
Expected: FAIL (missing module/exports).

**Step 3: Write minimal implementation**

Create `game-core/src/board/boardPresets.ts`:
- Export `BoardPresetId = "standard-random"`.
- Export `resolveBoardPreset(id)` returning `spec`.
- Export `BOARD_PRESETS` map for future extension.

Update `game-core/src/index.ts` to export the new module.

**Step 4: Run test to verify it passes**

```bash
pnpm -C game-core test -- src/board/boardPresets.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add game-core/src/board/boardPresets.ts game-core/src/board/boardPresets.test.ts game-core/src/index.ts
git commit -m "feat(core): add board preset resolver"
```

---

### Task 2: Use random generator in UI setup

**Files:**
- Modify: `app/catana/Game.js`

**Step 1: Update setup to use random generator**

- Replace `BalancedBoard` usage with `generateBoard`.
- Resolve preset via `resolveBoardPreset("standard-random")`.
- Derive `robberTileId` from the desert tile.
- Store `boardPresetId` in returned `G` state for replay metadata.

**Step 2: Manual verification**

Run dev server and confirm `/catana` renders without errors.

**Step 3: Commit**

```bash
git add app/catana/Game.js
git commit -m "feat(ui): use random board generator"
```

---

### Task 3: Agent docs update

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Update notes**
- Record the new board preset resolver and random generator usage.

**Step 2: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs(agent): note board preset resolver"
```

