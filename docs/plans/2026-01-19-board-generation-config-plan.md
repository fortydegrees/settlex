# Board Generation Config + Official Spiral Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace board presets with a single BoardConfig input (spec + generation + reveal) and implement the official spiral number placement strategy.

**Architecture:** Introduce a BoardSpec registry (geometry/counts) and a BoardConfig registry (defaults). Build a generation pipeline that applies terrain, numbers, and ports strategies, with “official” using the spiral order and “balanced” delegating to the existing BalancedBoard generator.

**Tech Stack:** TypeScript (game-core), Vitest, boardgame.io RNG

---

### Task 1: BoardSpec + BoardConfig registries

**Files:**
- Create: `game-core/src/board/boardSpecs.ts`
- Create: `game-core/src/board/boardConfigs.ts`
- Modify: `game-core/src/spec.ts`
- Modify: `game-core/src/index.ts`
- Test: `game-core/src/board/boardConfigs.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { resolveBoardConfig } from "./boardConfigs";
import { resolveBoardSpec } from "./boardSpecs";

describe("board config registry", () => {
  it("resolves standard official config and spec", () => {
    const config = resolveBoardConfig("standard-official");
    const spec = resolveBoardSpec(config.specId);

    expect(config.specId).toBe("standard-4p");
    expect(config.generation.numbers).toBe("official");
    expect(spec.rollNumbers().length).toBe(18);
    expect(spec.officialNumbers?.length).toBe(18);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C game-core test -- src/board/boardConfigs.test.ts`

Expected: FAIL with module not found for `boardConfigs`/`boardSpecs`.

**Step 3: Write minimal implementation**

- `game-core/src/spec.ts`: add `id: "standard-4p"` and `officialNumbers` array in official order.
  ```ts
  officialNumbers: [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11]
  ```
- `game-core/src/board/boardSpecs.ts`:
  ```ts
  import { spec as standard4pSpec } from "../spec";
  export type BoardSpec = typeof standard4pSpec;
  export type BoardSpecId = "standard-4p";
  export const BOARD_SPECS: Record<BoardSpecId, BoardSpec> = {
    "standard-4p": standard4pSpec
  };
  export function resolveBoardSpec(id: BoardSpecId): BoardSpec {
    return BOARD_SPECS[id];
  }
  ```
- `game-core/src/board/boardConfigs.ts`:
  ```ts
  import type { BoardSpecId } from "./boardSpecs";

  export type BoardGenerationConfig = {
    terrain: "random" | "balanced" | "official";
    numbers: "random" | "balanced" | "official";
    ports: "random";
    options?: { official?: { startCorner?: "random" | "fixed" } };
  };

  export type BoardRevealConfig = {
    tiles?: "start" | "turn1" | "end";
    numbers?: "start" | "turn1" | "end";
  };

  export type BoardConfig = {
    specId: BoardSpecId;
    generation: BoardGenerationConfig;
    reveal?: BoardRevealConfig;
  };

  export type BoardConfigId = "standard-official" | "standard-random" | "standard-balanced";

  export const BOARD_CONFIGS: Record<BoardConfigId, BoardConfig> = {
    "standard-official": {
      specId: "standard-4p",
      generation: { terrain: "random", numbers: "official", ports: "random", options: { official: { startCorner: "random" } } }
    },
    "standard-random": {
      specId: "standard-4p",
      generation: { terrain: "random", numbers: "random", ports: "random" }
    },
    "standard-balanced": {
      specId: "standard-4p",
      generation: { terrain: "balanced", numbers: "balanced", ports: "random" }
    }
  };

  export function resolveBoardConfig(id: BoardConfigId): BoardConfig {
    return BOARD_CONFIGS[id];
  }
  ```
- `game-core/src/index.ts`: export `boardSpecs` + `boardConfigs` (and types).

**Step 4: Run test to verify it passes**

Run: `pnpm -C game-core test -- src/board/boardConfigs.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add game-core/src/spec.ts game-core/src/board/boardSpecs.ts game-core/src/board/boardConfigs.ts game-core/src/index.ts game-core/src/board/boardConfigs.test.ts
git commit -m "feat(game-core): add board spec/config registries"
```

---

### Task 2: Official spiral utilities

**Files:**
- Create: `game-core/src/board/officialSpiral.ts`
- Test: `game-core/src/board/officialSpiral.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { buildSpiralOrder } from "./officialSpiral";

const toKey = (c: [number, number, number]) => c.join(",");

describe("official spiral order", () => {
  it("returns correct counts for radius 2", () => {
    const spiral = buildSpiralOrder(2, 0);
    expect(spiral.length).toBe(19);
    const unique = new Set(spiral.map(toKey));
    expect(unique.size).toBe(19);
    expect(spiral[0]).toEqual([2, -2, 0]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C game-core test -- src/board/officialSpiral.test.ts`

Expected: FAIL with module not found for `officialSpiral`.

**Step 3: Write minimal implementation**

`game-core/src/board/officialSpiral.ts`:

```ts
import type { HexCoordinate } from "./boardUtils";

const DIRS_CCW: HexCoordinate[] = [
  [0, 1, -1],
  [-1, 1, 0],
  [-1, 0, 1],
  [0, -1, 1],
  [1, -1, 0],
  [1, 0, -1]
];

const CORNERS: HexCoordinate[] = [
  [1, -1, 0],
  [0, -1, 1],
  [-1, 0, 1],
  [-1, 1, 0],
  [0, 1, -1],
  [1, 0, -1]
];

const add = (a: HexCoordinate, b: HexCoordinate): HexCoordinate => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2]
];

export function buildRing(radius: number, cornerIndex: number): HexCoordinate[] {
  const startCorner = CORNERS[cornerIndex];
  let pos: HexCoordinate = [startCorner[0] * radius, startCorner[1] * radius, startCorner[2] * radius];
  const ring: HexCoordinate[] = [];
  for (let side = 0; side < 6; side++) {
    for (let step = 0; step < radius; step++) {
      ring.push(pos);
      pos = add(pos, DIRS_CCW[side]);
    }
  }
  return ring;
}

export function buildSpiralOrder(radius: number, cornerIndex: number): HexCoordinate[] {
  const order: HexCoordinate[] = [];
  for (let r = radius; r >= 1; r--) {
    order.push(...buildRing(r, cornerIndex));
  }
  order.push([0, 0, 0]);
  return order;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C game-core test -- src/board/officialSpiral.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add game-core/src/board/officialSpiral.ts game-core/src/board/officialSpiral.test.ts
git commit -m "feat(game-core): add official spiral utilities"
```

---

### Task 3: Generation pipeline + official numbers

**Files:**
- Modify: `game-core/src/board/generateBoard.ts`
- Modify: `game-core/src/board/boardInvariants.test.ts`
- Modify: `game-core/src/board/boardUtils.ts` (if helper needed)
- Modify: `game-core/src/index.ts`

**Step 1: Write the failing test** (extend board invariants)

```ts
import { resolveBoardConfig } from "./boardConfigs";
import { resolveBoardSpec } from "./boardSpecs";
import { buildSpiralOrder } from "./officialSpiral";

it("places official numbers in spiral order", () => {
  const rng = makeDeterministicRng(42);
  const config = resolveBoardConfig("standard-official");
  const spec = resolveBoardSpec(config.specId);
  const tiles = generateBoard(config, rng);

  const spiral = buildSpiralOrder(spec.radius, 0);
  const byCoord = new Map(tiles.map((t) => [t.coordinate.join(","), t]));
  const placed: number[] = [];

  for (const coord of spiral) {
    const tile = byCoord.get(coord.join(","));
    if (!tile || tile.tile.resource === ResourceType.DESERT) continue;
    placed.push(tile.tile.number);
  }

  expect(placed).toEqual(spec.officialNumbers);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C game-core test -- src/board/boardInvariants.test.ts`

Expected: FAIL because `generateBoard` doesn’t accept BoardConfig and official placement not implemented.

**Step 3: Write minimal implementation**

- Refactor `generateBoard` to accept `BoardConfig` instead of `spec`:
  - Resolve spec via `resolveBoardSpec`.
  - If `generation.terrain === "balanced"` and `generation.numbers === "balanced"`, call `new BalancedBoard(defaultOptions, rng).generateBoard(spec)` and return its board tiles.
  - Otherwise:
    - Build base tiles (hexes + nodes/edges) without resources/numbers.
    - Apply terrain strategy:
      - `random`/`official`: use existing random resource assignment.
    - Apply numbers strategy:
      - `random`: random roll numbers (skip desert).
      - `official`: use `buildSpiralOrder` with `cornerIndex` set to RNG choice (or fixed if options specify), assign numbers in `spec.officialNumbers` order skipping desert.
    - Apply ports: shuffle port resources across spec port slots.

- Add helper functions inside `generateBoard.ts` for:
  - `assignRandomTerrain`
  - `assignRandomNumbers`
  - `assignOfficialNumbers`
  - `assignPorts`

- Ensure errors for missing `officialNumbers` or mismatched counts.

**Step 4: Run tests to verify it passes**

Run: `pnpm -C game-core test -- src/board/boardInvariants.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add game-core/src/board/generateBoard.ts game-core/src/board/boardInvariants.test.ts game-core/src/index.ts

git commit -m "feat(game-core): add board config generation pipeline"
```

---

### Task 4: Update call sites + tests

**Files:**
- Modify: `app/catana/Game.js`
- Modify: `game-core/src/board/boardPresets.test.ts`
- Modify: `game-core/src/rules/buildability.test.ts`
- Modify: `game-core/src/rules/victory.test.ts`
- Modify: `game-core/src/board/boardInvariants.test.ts`
- Modify: `game-core/src/board/boardPresets.ts` (replace with configs or deprecate)
- Modify: `game-core/src/index.ts`

**Step 1: Write the failing test**

Update `boardPresets.test.ts` to `boardConfigs.test.ts` if needed and ensure it imports `resolveBoardConfig` (test should already exist from Task 1). Then run a focused test that hits a call site:

Run: `pnpm -C game-core test -- src/rules/buildability.test.ts`

Expected: FAIL due to `generateBoard` signature change.

**Step 2: Implement updates**

- `app/catana/Game.js`:
  - Replace `boardPresetId` with `boardConfigId`.
  - Use `resolveBoardConfig(boardConfigId)` and pass the config to `generateBoard`.
- Update tests using `spec` directly to build a `BoardConfig` with `specId: "standard-4p"` and `generation: { terrain: "random", numbers: "random", ports: "random" }`.
- Remove or deprecate `boardPresets.ts`; replace with `boardConfigs.ts` usage.
- Update exports in `game-core/src/index.ts` accordingly.

**Step 3: Run tests to verify it passes**

Run: `pnpm -C game-core test`

Expected: PASS.

**Step 4: Commit**

```bash
git add app/catana/Game.js game-core/src/board/boardPresets.ts game-core/src/board/boardPresets.test.ts game-core/src/rules/buildability.test.ts game-core/src/rules/victory.test.ts game-core/src/board/boardInvariants.test.ts game-core/src/index.ts

git commit -m "refactor: wire board config generation into setup/tests"
```

---

### Task 5: Update agent notes

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Note the changes**
- Add a short status entry for the board config + official generator work.
- Add a note pointing to the new config registry and official spiral utilities.

**Step 2: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: log board config generation updates"
```

---

Plan complete and saved to `docs/plans/2026-01-19-board-generation-config-plan.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?
