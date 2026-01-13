# Card Stack Width Cap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Cap all card stacks at a max width so stacks tighten spacing when counts exceed the cap, while still showing the true count badge.

**Architecture:** Extend the shared `getCardStackLayout` helper to compute a capped width and effective offset, then update `CardStack` and `DevCardDisplay` to use the new layout data and shared default cap.

**Tech Stack:** Next.js (React), Tailwind CSS, Vitest.

---

### Task 1: Add failing tests for max stack width cap

**Files:**
- Modify: `app/catana/__tests__/CardStackLayout.test.js`

**Step 1: Write the failing test**

Add tests for capped width/offset:

```js
it("caps width and tightens offset when ideal width exceeds the cap", () => {
  const layout = getCardStackLayout({
    count: 4,
    cardWidth: 52,
    stackOffset: 16,
    maxStackWidth: 90,
  });

  expect(layout.width).toBe(90);
  expect(layout.offset).toBeCloseTo((90 - 52) / 3, 4);
});

it("never shrinks below a single card width", () => {
  const layout = getCardStackLayout({
    count: 3,
    cardWidth: 52,
    stackOffset: 16,
    maxStackWidth: 40,
  });

  expect(layout.width).toBe(52);
  expect(layout.offset).toBe(0);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest app/catana/__tests__/CardStackLayout.test.js --run`
Expected: FAIL (layout lacks `offset`/cap logic).

**Step 3: Commit**

```bash
git add app/catana/__tests__/CardStackLayout.test.js
git commit -m "test: cover card stack width cap"
```

---

### Task 2: Implement capped layout + use effective offset in CardStack

**Files:**
- Modify: `app/catana/components/CardStackLayout.js`
- Modify: `app/catana/components/CardStack.js`

**Step 1: Write minimal implementation**

Update `getCardStackLayout` to:
- return `offset`
- accept `maxStackWidth`
- export `DEFAULT_STACK_MAX_WIDTH = 90`
- compute `width`/`offset` using the cap rules

Update `CardStack` to:
- default `maxStackWidth` to `DEFAULT_STACK_MAX_WIDTH`
- use `layout.offset` for positioning

**Step 2: Run test to verify it passes**

Run: `pnpm vitest app/catana/__tests__/CardStackLayout.test.js --run`
Expected: PASS

**Step 3: Commit**

```bash
git add app/catana/components/CardStackLayout.js app/catana/components/CardStack.js
git commit -m "feat: cap card stack width"
```

---

### Task 3: Apply default cap in DevCardDisplay layout sizing

**Files:**
- Modify: `app/catana/components/DevCardDisplay.js`

**Step 1: Update layout calculation**

Import `DEFAULT_STACK_MAX_WIDTH` and pass `maxStackWidth` into `getCardStackLayout` for VP width computation.

**Step 2: Run verify**

Run: `pnpm verify`
Expected: PASS (known lint warnings already present).

**Step 3: Commit**

```bash
git add app/catana/components/DevCardDisplay.js
git commit -m "refactor: align dev-card stack width cap"
```

---

### Task 4: Update docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`
- Add: `docs/plans/2026-01-13-card-stack-width-cap-design.md`
- Add: `docs/plans/2026-01-13-card-stack-width-cap-plan.md`

**Step 1: Update docs**

Add brief notes about the stack width cap and new layout behavior.

**Step 2: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md docs/plans/2026-01-13-card-stack-width-cap-design.md docs/plans/2026-01-13-card-stack-width-cap-plan.md
git commit -m "docs: note card stack width cap"
```
