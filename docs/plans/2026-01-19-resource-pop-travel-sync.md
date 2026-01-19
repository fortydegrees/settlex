# Resource Pop-Then-Travel Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make all resource cards finish popping before any travel begins, then travel together with a small 0.02 stagger and a single travel sound.

**Architecture:** Keep per-card GSAP timelines but compute global timing so travel starts after the last pop settles. Emit `resource:pop:start` per card and a single `resource:travel:start` cue at the global travel start, mapped to `/sounds/card_woosh.mp3`.

**Tech Stack:** React, GSAP, Howler, Vitest, Next.js (public assets)

### Task 1: Add timing helper + tests (RED → GREEN)

**Files:**
- Modify: `app/catana/__tests__/effects/resourceDistribution.test.js`
- Modify: `app/catana/effects/resourceDistribution.js`

**Step 1: Write the failing test**

```js
import { getDistributionTimings } from "../../effects/resourceDistribution";

it("schedules travel after the final pop settles", () => {
  const timings = getDistributionTimings({
    index: 2,
    count: 4,
    baseDelay: 1,
    popStagger: 0.1,
    travelStagger: 0.02,
    popDuration: 0.3
  });

  expect(timings.travelStart).toBeCloseTo(1 + 0.1 * (4 - 1) + 0.3, 5);
  expect(timings.travelStartForCard).toBeCloseTo(timings.travelStart + 0.02 * 2, 5);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run app/catana/__tests__/effects/resourceDistribution.test.js`
Expected: FAIL because `getDistributionTimings` does not exist.

**Step 3: Minimal implementation**

Add `getDistributionTimings` in `app/catana/effects/resourceDistribution.js` and export it. Use the provided parameters to compute:
- `travelStart = baseDelay + popStagger * (count - 1) + popDuration`
- `travelStartForCard = travelStart + travelStagger * index`
- `popStart = baseDelay + popStagger * index`

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run app/catana/__tests__/effects/resourceDistribution.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add app/catana/__tests__/effects/resourceDistribution.test.js app/catana/effects/resourceDistribution.js
git commit -m "feat: add resource distribution timing helper"
```

### Task 2: Apply global travel timing + single travel cue (RED → GREEN)

**Files:**
- Modify: `app/catana/effects/resourceDistribution.js`

**Step 1: Write the failing test**

Add a test in `resourceDistribution.test.js` that asserts travel start for any card is after the final pop (using the helper), or expand the timing test to ensure `travelStart` uses `count - 1`.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run app/catana/__tests__/effects/resourceDistribution.test.js`
Expected: FAIL until the runner uses the helper’s global timing.

**Step 3: Minimal implementation**

Update the runner to:
- Compute `popDuration = POP_DURATIONS.pop + POP_DURATIONS.settle`.
- Use `getDistributionTimings` to get `popStart`, `travelStart`, and `travelStartForCard`.
- Schedule pop/settle at `popStart`, travel at `travelStartForCard`.
- Emit `resource:travel:start` once (index 0) at `travelStart`.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run app/catana/__tests__/effects/resourceDistribution.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add app/catana/effects/resourceDistribution.js app/catana/__tests__/effects/resourceDistribution.test.js
git commit -m "feat: sync resource travel to after all pops"
```

### Task 3: Map travel sound + add asset (RED → GREEN)

**Files:**
- Modify: `app/catana/effects/soundThemes.js`
- Add: `public/sounds/card_woosh.mp3`

**Step 1: Write the failing test**

No new test needed; theme mapping is config. Ensure existing audio tests still pass.

**Step 2: Run tests to verify current state**

Run: `pnpm vitest run app/catana/__tests__/effects/AudioManager.test.js`
Expected: PASS (pre-change).

**Step 3: Minimal implementation**

- Add `resource:travel:start` mapping to `/sounds/card_woosh.mp3` in `soundThemes.js`.
- Copy the asset: `cp sounds/card_woosh.mp3 public/sounds/card_woosh.mp3`.

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run app/catana/__tests__/effects/AudioManager.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add app/catana/effects/soundThemes.js public/sounds/card_woosh.mp3
git commit -m "feat: add travel sound for resource distribution"
```

### Task 4: Update agent docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Update notes**

Add bullets noting: travel waits for all pops, travel uses a single cue, and `resource:travel:start` maps to `card_woosh.mp3`.

**Step 2: Update progress**

Add a status note for the sequencing + sound change.

**Step 3: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: note resource travel sequencing and cue"
```
