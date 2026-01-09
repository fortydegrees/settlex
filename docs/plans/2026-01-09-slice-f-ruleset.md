# Slice F (Ruleset Config + Validation) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add canonical ruleset specs (standard + duel), a `createRuleset` factory, minimal validation, and `createEmptyState` enforcement.

**Architecture:** Keep rulesets as static TS objects in `ruleset.ts`, provide `createRuleset(spec)` to deep copy, and `validateRuleset` for invariant checks. `createEmptyState` accepts optional ruleset and throws on validation errors.

**Tech Stack:** TypeScript, Vitest, `game-core`.

---

### Task 1: Ruleset specs + factory tests

**Files:**
- Modify: `game-core/src/ruleset.ts`
- Create: `game-core/src/ruleset.test.ts`

**Step 1: Write the failing test**

Create `game-core/src/ruleset.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createRuleset, STANDARD_RULESET, DUEL_RULESET } from "./ruleset";

describe("ruleset factory", () => {
  it("creates a deep copy of the standard ruleset", () => {
    const ruleset = createRuleset(STANDARD_RULESET);
    ruleset.bank.resourceCounts.Wood = 0;
    expect(STANDARD_RULESET.bank.resourceCounts.Wood).toBe(19);
  });

  it("creates a duel ruleset with expected defaults", () => {
    const duel = createRuleset(DUEL_RULESET);
    expect(duel.victoryPointsToWin).toBe(15);
    expect(duel.discardLimit).toBe(9);
    expect(duel.friendlyRobber.enabled).toBe(true);
    expect(duel.allowPlayerTrades).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm -C game-core test -- src/ruleset.test.ts
```
Expected: FAIL (missing exports).

**Step 3: Write minimal implementation**

In `game-core/src/ruleset.ts`:
- Export `STANDARD_RULESET` (contents from current `createStandardRuleset`).
- Add `DUEL_RULESET` (VP 15, discard 9, friendly robber enabled threshold 2, player trades false, boardGen balanced).
- Implement `createRuleset(spec: Ruleset)` to deep-copy the input (prefer `structuredClone`, fallback to JSON copy).
- Update `createStandardRuleset()` to return `createRuleset(STANDARD_RULESET)` to keep behavior consistent.

**Step 4: Run test to verify it passes**

```bash
pnpm -C game-core test -- src/ruleset.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add game-core/src/ruleset.ts game-core/src/ruleset.test.ts
git commit -m "feat(core): add ruleset specs and factory"
```

---

### Task 2: Minimal validation + createEmptyState enforcement

**Files:**
- Modify: `game-core/src/ruleset.ts`
- Modify: `game-core/src/core/state.ts`
- Modify: `game-core/src/ruleset.test.ts`

**Step 1: Write the failing tests**

Append to `ruleset.test.ts`:

```ts
import { validateRuleset } from "./ruleset";
import { createEmptyState } from "./core/state";

it("reports invalid rulesets with negative values", () => {
  const broken = createRuleset(STANDARD_RULESET);
  broken.bank.resourceCounts.Wood = -1;
  const result = validateRuleset(broken);
  expect(result.ok).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
});

it("throws when createEmptyState receives invalid ruleset", () => {
  const broken = createRuleset(STANDARD_RULESET);
  broken.victoryPointsToWin = 0;
  expect(() => createEmptyState(["0"], broken)).toThrow();
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm -C game-core test -- src/ruleset.test.ts
```
Expected: FAIL (missing validateRuleset, createEmptyState behavior).

**Step 3: Write minimal implementation**

In `ruleset.ts`:
- Add `validateRuleset(ruleset): { ok: boolean; errors: string[] }`
- Check:
  - required keys in `bank.resourceCounts` for standard resources + specials
  - devCardCounts keys present
  - counts/limits/tradeRates finite and non-negative
  - `victoryPointsToWin`, `longestRoadMinLength`, `largestArmyMinKnights` >= 1

In `core/state.ts`:
- Allow `createEmptyState(players, ruleset?)`
- If ruleset provided, validate it and throw `Error` with newline-joined errors.

**Step 4: Run test to verify it passes**

```bash
pnpm -C game-core test -- src/ruleset.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add game-core/src/ruleset.ts game-core/src/core/state.ts game-core/src/ruleset.test.ts
git commit -m "feat(core): add ruleset validation"
```

---

### Task 3: Export updates + docs

**Files:**
- Modify: `game-core/src/index.ts`
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Update exports**

Ensure `ruleset.ts` exports are re-exported in `game-core/src/index.ts`.

**Step 2: Update agent docs**

Add bullets noting ruleset specs/factory/validation and createEmptyState enforcement.

**Step 3: Commit**

```bash
git add game-core/src/index.ts docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs(agent): update ruleset config notes"
```
