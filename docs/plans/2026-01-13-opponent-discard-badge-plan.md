# Opponent Over-Discard Badge Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the opponent resource badge red when their resource count exceeds the discard limit.

**Architecture:** Add a small style helper for CardStack badges (`default` vs `danger`), plus a pure helper to compute the opponent resource badge tone from counts and discard limit. Wire `OpponentPlayerBox` to pass the danger tone only for resource stacks.

**Tech Stack:** Next.js (React), Vitest.

---

### Task 1: Add failing tests for badge tone helpers

**Files:**
- Create: `app/catana/__tests__/CardStackStyles.test.js`
- Create: `app/catana/__tests__/OpponentPlayerBoxUtils.test.js`

**Step 1: Write failing tests**

```js
import { describe, it, expect } from "vitest";
import { getBadgeClasses } from "../components/CardStackStyles";

describe("getBadgeClasses", () => {
  it("returns danger styles when tone is danger", () => {
    expect(getBadgeClasses("danger")).toContain("bg-rose-500");
  });

  it("returns default styles when tone is default", () => {
    expect(getBadgeClasses("default")).toContain("bg-blue-50");
  });
});
```

```js
import { describe, it, expect } from "vitest";
import { getOpponentResourceBadgeTone } from "../components/OpponentPlayerBoxUtils";

describe("getOpponentResourceBadgeTone", () => {
  it("returns danger when resources exceed discard limit", () => {
    expect(getOpponentResourceBadgeTone({ resourceCount: 8, discardLimit: 7 }))
      .toBe("danger");
  });

  it("returns default when resources are at or below the limit", () => {
    expect(getOpponentResourceBadgeTone({ resourceCount: 7, discardLimit: 7 }))
      .toBe("default");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest app/catana/__tests__/CardStackStyles.test.js app/catana/__tests__/OpponentPlayerBoxUtils.test.js --run`
Expected: FAIL (helpers missing).

**Step 3: Commit**

```bash
git add app/catana/__tests__/CardStackStyles.test.js app/catana/__tests__/OpponentPlayerBoxUtils.test.js
git commit -m "test: cover opponent discard badge helpers"
```

---

### Task 2: Implement badge tone helpers + wire OpponentPlayerBox

**Files:**
- Create: `app/catana/components/CardStackStyles.js`
- Create: `app/catana/components/OpponentPlayerBoxUtils.js`
- Modify: `app/catana/components/CardStack.js`
- Modify: `app/catana/components/OpponentPlayerBox.js`

**Step 1: Implement helpers**

- `getBadgeClasses(tone)` returns default or danger badge class strings.
- `getOpponentResourceBadgeTone({ resourceCount, discardLimit })` returns `danger` if `resourceCount > discardLimit`, else `default`.

**Step 2: Wire components**

- `CardStack` accepts optional `badgeTone` (default `default`) and applies `getBadgeClasses` when rendering the badge.
- `OpponentPlayerBox` computes `discardLimit` from `core?.ruleset?.discardLimit ?? 7` and passes `badgeTone` to the resource stack only.

**Step 3: Run tests to verify they pass**

Run: `pnpm vitest app/catana/__tests__/CardStackStyles.test.js app/catana/__tests__/OpponentPlayerBoxUtils.test.js --run`
Expected: PASS

**Step 4: Commit**

```bash
git add app/catana/components/CardStackStyles.js app/catana/components/OpponentPlayerBoxUtils.js app/catana/components/CardStack.js app/catana/components/OpponentPlayerBox.js
git commit -m "feat: highlight opponent discard badge"
```

---

### Task 3: Update docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`
- Add: `docs/plans/2026-01-13-opponent-discard-badge-plan.md`

**Step 1: Update docs**

Add a brief note about red opponent resource badge over discard limit.

**Step 2: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md docs/plans/2026-01-13-opponent-discard-badge-plan.md
git commit -m "docs: note opponent discard badge"
```
