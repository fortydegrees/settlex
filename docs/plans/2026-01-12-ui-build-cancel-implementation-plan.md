# UI Build-Action Cancel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let players cancel normal build actions (road/settlement/city) by clicking anywhere that is not an action circle, without affecting placement phase or dev-card flows.

**Architecture:** Add a small helper to decide when cancellation is allowed, wire a capture-phase click handler on the GameScreen root to call it, and tag action circles with a data attribute for hit-testing. Keep the change UI-only and deterministic.

**Tech Stack:** React (Next.js), boardgame.io client state, Vitest.

### Task 1: Add cancel decision helper + unit tests

**Files:**
- Create: `app/catana/utils/cancelBuildAction.js`
- Create: `app/catana/__tests__/cancelBuildAction.test.js`

**Step 1: Write the failing test**

```javascript
import { describe, expect, it } from "vitest";
import { shouldCancelBuildAction } from "../utils/cancelBuildAction";

describe("shouldCancelBuildAction", () => {
  it("cancels normal build actions when click is not on an action circle", () => {
    expect(
      shouldCancelBuildAction({
        playerAction: "placeRoad",
        phase: "main",
        targetIsActionCircle: false
      })
    ).toBe(true);
  });

  it("does not cancel when clicking an action circle", () => {
    expect(
      shouldCancelBuildAction({
        playerAction: "placeSettlement",
        phase: "main",
        targetIsActionCircle: true
      })
    ).toBe(false);
  });

  it("does not cancel during placement phase", () => {
    expect(
      shouldCancelBuildAction({
        playerAction: "placeCity",
        phase: "placement",
        targetIsActionCircle: false
      })
    ).toBe(false);
  });

  it("does not cancel dev-card actions", () => {
    expect(
      shouldCancelBuildAction({
        playerAction: "roadBuilding",
        phase: "main",
        targetIsActionCircle: false
      })
    ).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest app/catana/__tests__/cancelBuildAction.test.js`

Expected: FAIL with module-not-found for `cancelBuildAction`.

**Step 3: Write minimal implementation**

```javascript
const CANCELLABLE_ACTIONS = new Set(["placeRoad", "placeSettlement", "placeCity"]);

export const shouldCancelBuildAction = ({
  playerAction,
  phase,
  targetIsActionCircle
}) => {
  if (!CANCELLABLE_ACTIONS.has(playerAction)) return false;
  if (phase === "placement") return false;
  if (targetIsActionCircle) return false;
  return true;
};
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest app/catana/__tests__/cancelBuildAction.test.js`

Expected: PASS.

**Step 5: Commit**

```bash
git add app/catana/utils/cancelBuildAction.js app/catana/__tests__/cancelBuildAction.test.js
git commit -m "test: cover build-action cancel helper"
```

### Task 2: Tag action circles for hit-testing

**Files:**
- Modify: `app/catana/ActionNode.js`

**Step 1: Update ActionNode root element**

Add a `data-action-circle="true"` attribute on the clickable div so clicks can be detected via `closest()`.

**Step 2: Run unit tests**

Run: `pnpm vitest app/catana/__tests__/cancelBuildAction.test.js`

Expected: PASS.

**Step 3: Commit**

```bash
git add app/catana/ActionNode.js
git commit -m "feat: mark action circles for cancel detection"
```

### Task 3: Add capture-phase cancel handler on GameScreen

**Files:**
- Modify: `app/catana/GameScreen.js`

**Step 1: Wire handler with helper**

- Import `shouldCancelBuildAction`.
- Add an `onClickCapture` handler to the GameScreen root that:
  - Computes `targetIsActionCircle` via `event.target?.closest?.('[data-action-circle="true"]')`.
  - Calls `setPlayerAction(null)` only when helper returns `true`.

**Step 2: Run unit tests**

Run: `pnpm vitest app/catana/__tests__/cancelBuildAction.test.js`

Expected: PASS.

**Step 3: Manual verification**

- Main phase + `placeRoad|placeSettlement|placeCity`: clicking empty board cancels.
- Clicking Trade/End Turn/etc. cancels and still executes the button.
- Clicking an action circle places as usual (no cancel).
- Placement phase: clicking elsewhere does not cancel.
- Road Building dev card: clicking elsewhere does not cancel.

**Step 4: Commit**

```bash
git add app/catana/GameScreen.js
git commit -m "feat: cancel build action on outside click"
```

### Task 4: Update agent docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Update notes**

- Add a brief progress bullet about build-action cancel UX.
- Add a notes bullet pointing to the new helper/test if useful.

**Step 2: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: log build-action cancel UX"
```
