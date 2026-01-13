# Card Stack Unlimited Visible Cards Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Render all card backs in a stack (no maxVisible limit) while still compressing within the max width cap.

**Architecture:** Remove the `maxVisible` limit for opponent piles so `CardStack` renders the full count and relies on the capped layout to tighten spacing as counts grow. Keep the `maxVisible` prop available for future use, but default to unlimited for opponent piles.

**Tech Stack:** Next.js (React), Vitest.

---

### Task 1: Add failing test for unlimited visible cards in opponent piles

**Files:**
- Modify: `app/catana/__tests__/CardStackLayout.test.js`

**Step 1: Write the failing test**

Add a test that asserts `getCardStackLayout` returns `visibleCount === count` when `maxVisible` is undefined:

```js
it("shows all cards when maxVisible is undefined", () => {
  const layout = getCardStackLayout({
    count: 8,
    cardWidth: 52,
    stackOffset: 16,
    maxStackWidth: 90,
  });

  expect(layout.visibleCount).toBe(8);
  expect(layout.width).toBe(90);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest app/catana/__tests__/CardStackLayout.test.js --run`
Expected: FAIL if any code still clamps visible count in opponent use.

**Step 3: Commit**

```bash
git add app/catana/__tests__/CardStackLayout.test.js
git commit -m "test: assert unlimited visible stack"
```

---

### Task 2: Remove maxVisible from opponent piles

**Files:**
- Modify: `app/catana/components/OpponentPlayerBox.js`

**Step 1: Update rendering**

Remove the `maxVisible={3}` props so opponent stacks render all cards.

**Step 2: Run test to verify it passes**

Run: `pnpm vitest app/catana/__tests__/CardStackLayout.test.js --run`
Expected: PASS

**Step 3: Commit**

```bash
git add app/catana/components/OpponentPlayerBox.js
git commit -m "feat: show all opponent card backs"
```

---

### Task 3: Update docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Update docs**

Add a note that opponent stacks now render all cards and rely on the width cap to compress spacing.

**Step 2: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: note unlimited opponent stacks"
```
