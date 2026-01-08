# Core Board Invariants Tests Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a first slice of deterministic game-core tests that validate board-generation invariants.

**Architecture:** Tests live in `game-core/src/**` and use a tiny deterministic RNG helper so board generation is repeatable. We assert invariants against `spec` + `generateBoard` (resource counts, roll numbers, ports, desert, and node/edge connectivity) without touching UI code. This creates a safe foundation before extracting gameplay rules.

**Tech Stack:** TypeScript, Vitest, game-core.

### Task 1: Add deterministic RNG helper for tests

**Files:**
- Create: `game-core/src/testUtils.ts`
- Modify: `game-core/src/index.ts`
- Test: `game-core/src/board/boardInvariants.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { spec } from "../spec";
import { generateBoard } from "./generateBoard";
import { makeDeterministicRng } from "../testUtils";

describe("board generation invariants", () => {
  it("is deterministic for a fixed seed", () => {
    const rng = makeDeterministicRng(123);
    const a = generateBoard(spec, rng);
    const b = generateBoard(spec, makeDeterministicRng(123));
    expect(a).toEqual(b);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C game-core test -- src/board/boardInvariants.test.ts`
Expected: FAIL with "Cannot find module '../testUtils'" or similar.

**Step 3: Write minimal implementation**

```ts
export function makeDeterministicRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C game-core test -- src/board/boardInvariants.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add game-core/src/testUtils.ts game-core/src/index.ts game-core/src/board/boardInvariants.test.ts
git commit -m "test: add deterministic rng helper"
```

### Task 2: Resource and roll-number counts match spec

**Files:**
- Modify: `game-core/src/board/boardInvariants.test.ts`

**Step 1: Write the failing test**

```ts
it("matches resource counts and roll numbers from spec", () => {
  const tiles = generateBoard(spec, makeDeterministicRng(1));
  const land = tiles.filter((t) => t.type === "Land");
  const resources = land.map((t) => t.tile.resource);
  const rollNumbers = land
    .filter((t) => t.tile.resource !== "Desert")
    .map((t) => t.tile.number);

  expect(resources.filter((r) => r === "Desert")).toHaveLength(1);
  expect(resources.filter((r) => r === "Brick")).toHaveLength(3);
  expect(resources.filter((r) => r === "Ore")).toHaveLength(3);
  expect(resources.filter((r) => r === "Sheep")).toHaveLength(4);
  expect(resources.filter((r) => r === "Wood")).toHaveLength(4);
  expect(resources.filter((r) => r === "Wheat")).toHaveLength(4);
  expect(rollNumbers.sort()).toEqual(spec.rollNumbers().slice().sort());
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C game-core test -- src/board/boardInvariants.test.ts`
Expected: FAIL (count/roll mismatch or string/type mismatch).

**Step 3: Write minimal implementation**

No implementation changes should be needed; adjust test to match existing data shape only if necessary (e.g., resource constants).

**Step 4: Run test to verify it passes**

Run: `pnpm -C game-core test -- src/board/boardInvariants.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add game-core/src/board/boardInvariants.test.ts
git commit -m "test: assert spec resource and roll counts"
```

### Task 3: Port tiles and coordinate coverage

**Files:**
- Modify: `game-core/src/board/boardInvariants.test.ts`

**Step 1: Write the failing test**

```ts
it("creates the expected number of ports and preserves port coordinates", () => {
  const tiles = generateBoard(spec, makeDeterministicRng(2));
  const ports = tiles.filter((t) => t.type === "Port");
  expect(ports).toHaveLength(spec.ports.length);
  for (const port of spec.ports) {
    const match = ports.find(
      (t) => JSON.stringify(t.coordinate) === JSON.stringify(port.coordinate)
    );
    expect(match).toBeTruthy();
  }
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C game-core test -- src/board/boardInvariants.test.ts`
Expected: FAIL if a coordinate or count mismatch exists.

**Step 3: Write minimal implementation**

No code changes expected; adjust test only if data shape differs.

**Step 4: Run test to verify it passes**

Run: `pnpm -C game-core test -- src/board/boardInvariants.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add game-core/src/board/boardInvariants.test.ts
git commit -m "test: assert port tiles and coordinates"
```

### Task 4: Node and edge connectivity invariants

**Files:**
- Modify: `game-core/src/board/boardInvariants.test.ts`

**Step 1: Write the failing test**

```ts
it("assigns 6 node ids and 6 edge node pairs per land tile", () => {
  const tiles = generateBoard(spec, makeDeterministicRng(3));
  const land = tiles.filter((t) => t.type === "Land");
  for (const tile of land) {
    const nodes = Object.values(tile.tile.nodes ?? {});
    const edges = Object.values(tile.tile.edges ?? {});
    expect(nodes).toHaveLength(6);
    expect(edges).toHaveLength(6);
    for (const edge of edges) {
      expect(edge).toHaveLength(2);
      expect(edge[0]).not.toBeNull();
      expect(edge[1]).not.toBeNull();
    }
  }
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C game-core test -- src/board/boardInvariants.test.ts`
Expected: FAIL if some edges/nodes missing.

**Step 3: Write minimal implementation**

No code changes expected; if failures indicate actual bug, fix in `game-core/src/board/generateBoard.ts`.

**Step 4: Run test to verify it passes**

Run: `pnpm -C game-core test -- src/board/boardInvariants.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add game-core/src/board/boardInvariants.test.ts game-core/src/board/generateBoard.ts
git commit -m "test: assert node/edge connectivity"
```

### Task 5: Update agent docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/FEATURES.json`

**Step 1: Update PROGRESS**

Add a bullet noting board invariants tests added for game-core and deterministic rng helper.

**Step 2: Update FEATURES**

Set `core-tests` status to `in_progress` and add acceptance item: "Board generation invariants tested".

**Step 3: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/FEATURES.json
git commit -m "docs: update progress for core tests"
```
