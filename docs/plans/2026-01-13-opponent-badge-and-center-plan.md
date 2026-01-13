# Opponent Badge + Centered Action Dock Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** (1) Turn opponent resource badge red when over discard limit, (2) nudge opponent bar down to avoid VP clipping, and (3) center the avatar+action dock pill while leaving the right dice/end-turn stack anchored.

**Architecture:** Add a small badge-style helper and a discard-limit helper for opponents, wire `OpponentPlayerBox` to apply danger styling only for the resource badge. Update layout classes in `GameScreen` and `PlayerActionContainer` to position the opponent bar slightly lower and center the avatar+action dock pill via an absolute centered wrapper.

**Tech Stack:** Next.js (React), Tailwind CSS, Vitest.

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

### Task 2: Implement badge helpers + wire OpponentPlayerBox

**Files:**
- Create: `app/catana/components/CardStackStyles.js`
- Create: `app/catana/components/OpponentPlayerBoxUtils.js`
- Modify: `app/catana/components/CardStack.js`
- Modify: `app/catana/components/OpponentPlayerBox.js`

**Step 1: Implement helpers**

- `getBadgeClasses(tone)` returns default or danger badge class strings.
- `getOpponentResourceBadgeTone({ resourceCount, discardLimit })` returns `danger` if `resourceCount > discardLimit`, else `default`.

**Step 2: Wire components**

- `CardStack` accepts optional `badgeTone` (default `default`) and uses `getBadgeClasses` when rendering the badge.
- `OpponentPlayerBox` computes `discardLimit` from `core?.ruleset?.discardLimit ?? 7` and passes `badgeTone` to the **resource** stack only.

**Step 3: Run tests to verify they pass**

Run: `pnpm vitest app/catana/__tests__/CardStackStyles.test.js app/catana/__tests__/OpponentPlayerBoxUtils.test.js --run`
Expected: PASS

**Step 4: Commit**

```bash
git add app/catana/components/CardStackStyles.js app/catana/components/OpponentPlayerBoxUtils.js app/catana/components/CardStack.js app/catana/components/OpponentPlayerBox.js
git commit -m "feat: highlight opponent discard badge"
```

---

### Task 3: Nudge opponent bar + center avatar/dock pill

**Files:**
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/components/PlayerActionContainer.js`

**Step 1: Update opponent bar position**

- Change opponent bar container from `top-4` to `top-6` to avoid VP bubble clipping.

**Step 2: Center the avatar+action dock pill**

- Wrap the avatar+action dock pill in an absolute centered container: `absolute left-1/2 -translate-x-1/2` inside the bottom bar.
- Keep the dice/end-turn stack in the right-aligned column so it remains anchored.
- Ensure the avatar box remains attached to the dock (same spacing as before).

**Step 3: Run verify**

Run: `pnpm verify`
Expected: PASS (known lint warnings already present).

**Step 4: Commit**

```bash
git add app/catana/GameScreen.js app/catana/components/PlayerActionContainer.js
git commit -m "ui: center action dock and nudge opponent bar"
```

---

### Task 4: Update docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`
- Add: `docs/plans/2026-01-13-opponent-badge-and-center-plan.md`

**Step 1: Update docs**

Add notes about the red opponent resource badge, the opponent bar nudge, and the centered action dock.

**Step 2: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md docs/plans/2026-01-13-opponent-badge-and-center-plan.md
git commit -m "docs: note opponent badge + dock centering"
```
