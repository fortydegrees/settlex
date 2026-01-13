# Opponent Player Box Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the opponent resource bar with a dedicated opponent player box that shows avatar/public stats and a hand-size pill with stacked card backs.

**Architecture:** Extract shared UI pieces from the bottom player bar into reusable components, then compose them into a new `OpponentPlayerBox`. Reuse the dev-card stacking/badge behavior by extracting a shared `CardStack` helper/component.

**Tech Stack:** Next.js (React), Tailwind CSS, Vitest (node env) for unit tests.

---

### Task 1: Add a shared card stack layout helper with tests

**Files:**
- Create: `app/catana/components/CardStack.js`
- Create: `app/catana/__tests__/CardStackLayout.test.js`

**Step 1: Write the failing test**

```js
import { describe, it, expect } from "vitest";
import { getCardStackLayout } from "../components/CardStack";

describe("getCardStackLayout", () => {
  it("uses a placeholder card when count is 0", () => {
    const layout = getCardStackLayout({
      count: 0,
      cardWidth: 52,
      stackOffset: 16,
      maxVisible: 3,
    });

    expect(layout.visibleCount).toBe(1);
    expect(layout.width).toBe(52);
    expect(layout.isEmpty).toBe(true);
    expect(layout.showBadge).toBe(false);
  });

  it("clamps visible cards to maxVisible", () => {
    const layout = getCardStackLayout({
      count: 5,
      cardWidth: 52,
      stackOffset: 16,
      maxVisible: 3,
    });

    expect(layout.visibleCount).toBe(3);
    expect(layout.width).toBe(52 + 2 * 16);
    expect(layout.showBadge).toBe(true);
  });

  it("shows the full stack when maxVisible is omitted", () => {
    const layout = getCardStackLayout({
      count: 2,
      cardWidth: 52,
      stackOffset: 16,
    });

    expect(layout.visibleCount).toBe(2);
    expect(layout.width).toBe(52 + 16);
    expect(layout.showBadge).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest app/catana/__tests__/CardStackLayout.test.js`
Expected: FAIL with "getCardStackLayout is not defined" or module not found.

**Step 3: Write minimal implementation**

```js
import React from "react";
import Image from "next/image";

export const getCardStackLayout = ({
  count,
  cardWidth,
  stackOffset,
  maxVisible,
}) => {
  const safeCount = Math.max(0, count ?? 0);
  const isEmpty = safeCount === 0;
  const visibleCount = isEmpty
    ? 1
    : Math.min(safeCount, maxVisible ?? safeCount);
  const width = cardWidth + (visibleCount - 1) * stackOffset;
  const showBadge = safeCount > 2;

  return { visibleCount, width, isEmpty, showBadge };
};

export const CardStack = ({
  count = 0,
  src,
  alt,
  cardWidth = 52,
  cardHeight = 72,
  stackOffset = 16,
  maxVisible,
  className = "",
}) => {
  const layout = getCardStackLayout({
    count,
    cardWidth,
    stackOffset,
    maxVisible,
  });

  const cardClass = "object-contain drop-shadow-md";
  const outlineClass = layout.isEmpty
    ? "opacity-30 ring-1 ring-blue-100 ring-inset"
    : "";

  return (
    <div className={`relative h-[72px] ${className}`} style={{ width: `${layout.width}px` }}>
      {Array.from({ length: layout.visibleCount }).map((_, i) => (
        <div
          key={`stack-${i}`}
          className="absolute top-0"
          style={{ left: `${i * stackOffset}px`, zIndex: i }}
        >
          <Image
            src={src}
            alt={alt}
            width={cardWidth}
            height={cardHeight}
            className={`${cardClass} ${outlineClass}`}
          />
        </div>
      ))}
      {layout.showBadge && (
        <div className="absolute -top-2 -right-2 z-20 h-5 min-w-[1.25rem] rounded-full bg-blue-50 px-1 text-xs font-semibold text-slate-700 ring-2 ring-white flex items-center justify-center">
          {count}
        </div>
      )}
    </div>
  );
};
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest app/catana/__tests__/CardStackLayout.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add app/catana/components/CardStack.js app/catana/__tests__/CardStackLayout.test.js
git commit -m "test: add card stack layout helper"
```

---

### Task 2: Reuse CardStack in DevCardDisplay

**Files:**
- Modify: `app/catana/components/DevCardDisplay.js`

**Step 1: Write a failing test (behavioral snapshot)**

Add a new test in `app/catana/__tests__/CardStackLayout.test.js` to assert that `getCardStackLayout({ count: 3 })` returns `showBadge: true` (already covered in Task 1). This is a placeholder since the UI is not tested directly.

**Step 2: Run test to verify it still passes**

Run: `pnpm vitest app/catana/__tests__/CardStackLayout.test.js`
Expected: PASS

**Step 3: Refactor DevCardDisplay**

- Import `CardStack`.
- Replace the VP stack markup with `<CardStack count={nonPlayable.length} src={DEV_CARD_SVGS.victoryPoint} alt="Victory point" maxVisible={nonPlayable.length} />`.
- Keep spacing/grouping logic intact (use `vpStackWidth` from `CardStack` layout if needed; otherwise allow the component to size itself via inline width).

**Step 4: Run verify to ensure no regressions**

Run: `pnpm verify`
Expected: PASS (known lint warnings already present).

**Step 5: Commit**

```bash
git add app/catana/components/DevCardDisplay.js
git commit -m "refactor: reuse card stack in dev card display"
```

---

### Task 3: Extract shared PlayerAvatarStats component

**Files:**
- Create: `app/catana/components/PlayerAvatarStats.js`
- Modify: `app/catana/components/PlayerActionContainer.js`

**Step 1: Write a failing test (logic coverage for VP display)**

Create a new test `app/catana/__tests__/playerAvatarStats.test.js` that imports a pure helper (e.g. `getVpDisplay`) from `PlayerAvatarStats` to verify public vs hidden VP formatting.

```js
import { describe, it, expect } from "vitest";
import { getVpDisplay } from "../components/PlayerAvatarStats";

describe("getVpDisplay", () => {
  it("shows public points only for opponents", () => {
    expect(getVpDisplay({ publicPoints: 3, totalPoints: 5, isMe: false }))
      .toBe("3");
  });

  it("shows hidden points for local player", () => {
    expect(getVpDisplay({ publicPoints: 3, totalPoints: 5, isMe: true }))
      .toBe("3 (+2)");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest app/catana/__tests__/playerAvatarStats.test.js`
Expected: FAIL (module or helper missing).

**Step 3: Implement PlayerAvatarStats**

- Move avatar + stats markup from `PlayerActionContainer` into the new component.
- Export `getVpDisplay` helper for testability.
- Keep existing styling and highlight logic.

**Step 4: Update PlayerActionContainer to use PlayerAvatarStats**

- Replace the inline avatar/stats JSX with `<PlayerAvatarStats />`.
- Ensure props are wired: `player`, `core`, `coreTopology`, `isMe`.

**Step 5: Run test to verify it passes**

Run: `pnpm vitest app/catana/__tests__/playerAvatarStats.test.js`
Expected: PASS

**Step 6: Commit**

```bash
git add app/catana/components/PlayerAvatarStats.js app/catana/components/PlayerActionContainer.js app/catana/__tests__/playerAvatarStats.test.js
git commit -m "refactor: extract player avatar stats"
```

---

### Task 4: Add OpponentPlayerBox component with hand-size pill

**Files:**
- Create: `app/catana/components/OpponentPlayerBox.js`

**Step 1: Write a failing test (layout helper)**

Add a small assertion to `CardStackLayout.test.js` that uses `maxVisible: 3` for opponent piles, ensuring width matches expected stacking.

**Step 2: Run test to verify it passes**

Run: `pnpm vitest app/catana/__tests__/CardStackLayout.test.js`
Expected: PASS

**Step 3: Implement OpponentPlayerBox**

- Compose `PlayerAvatarStats` + a right-hand pill with two `CardStack`s.
- Use `card_rescardback.svg` and `card_devcardback.svg`.
- Provide `maxVisible={3}` for the opponent piles.
- Add a small horizontal gap between the two piles so they read as distinct.

**Step 4: Commit**

```bash
git add app/catana/components/OpponentPlayerBox.js
git commit -m "feat: add opponent player box"
```

---

### Task 5: Render opponent boxes in GameScreen

**Files:**
- Modify: `app/catana/GameScreen.js`

**Step 1: Update rendering**

- Replace the old opponent resource bar with a top-center container rendering `OpponentPlayerBox` for each opponent.
- Use a flex row with spacing (e.g., `gap-4`) and keep the `left-1/2` positioning.

**Step 2: Run verify**

Run: `pnpm verify`
Expected: PASS (known lint warnings already present).

**Step 3: Commit**

```bash
git add app/catana/GameScreen.js
git commit -m "feat: render opponent player boxes"
```

---

### Task 6: Update agent docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Update docs**

- Add a brief entry describing the opponent player box work and new shared components.

**Step 2: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: log opponent box UI work"
```
