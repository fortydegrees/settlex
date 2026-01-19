# Effects Lab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dev-only “Effects Lab” page to replay animations instantly, with deterministic replays via a seeded RNG and a simple control panel (no new dependencies).

**Architecture:** Create a dev-only Next app route that renders a client component with an `EffectLayer`, a fake board container, and fake HUD targets. The lab calls `createResourceDistributionRunner` directly with a seeded RNG and generated demo payloads. The runner accepts an injected `random` function so lab replays are deterministic.

**Tech Stack:** Next.js App Router, React, GSAP, Vitest.

### Task 1: Seeded RNG utility (TDD)

**Files:**
- Create: `app/catana/utils/seededRandom.js`
- Test: `app/catana/__tests__/utils/seededRandom.test.js`

**Step 1: Write the failing test**

```js
import { describe, expect, it } from "vitest";
import { createSeededRandom } from "../../utils/seededRandom";

describe("createSeededRandom", () => {
  it("produces deterministic sequences per seed", () => {
    const randA = createSeededRandom(123);
    const randB = createSeededRandom(123);
    const randC = createSeededRandom(456);

    const seqA = [randA(), randA(), randA()];
    const seqB = [randB(), randB(), randB()];
    const seqC = [randC(), randC(), randC()];

    expect(seqA).toEqual(seqB);
    expect(seqA).not.toEqual(seqC);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run app/catana/__tests__/utils/seededRandom.test.js`
Expected: FAIL because `createSeededRandom` doesn’t exist.

**Step 3: Write minimal implementation**

```js
export function createSeededRandom(seed) {
  let t = seed >>> 0;
  return function random() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run app/catana/__tests__/utils/seededRandom.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add app/catana/utils/seededRandom.js app/catana/__tests__/utils/seededRandom.test.js
git commit -m "feat: add seeded random utility"
```

### Task 2: Inject deterministic randomness into resource distribution (TDD)

**Files:**
- Modify: `app/catana/__tests__/effects/resourceDistribution.test.js`
- Modify: `app/catana/effects/resourceDistribution.js`

**Step 1: Write the failing test**

```js
import { getRandomizedOffsets } from "../../effects/resourceDistribution";

it("computes jitter offsets from provided random", () => {
  const rand = () => 1; // max
  const offsets = getRandomizedOffsets(rand);
  expect(offsets.jitterX).toBeGreaterThan(0);
  expect(offsets.jitterY).toBeGreaterThan(0);
  expect(offsets.rotate).toBeGreaterThan(0);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run app/catana/__tests__/effects/resourceDistribution.test.js`
Expected: FAIL because `getRandomizedOffsets` doesn’t exist.

**Step 3: Write minimal implementation**

- Add `getRandomizedOffsets(random = Math.random)` to `resourceDistribution.js`.
- Update `createResourceDistributionRunner` to accept `random = Math.random` and use it when computing jitter/rotation.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run app/catana/__tests__/effects/resourceDistribution.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add app/catana/effects/resourceDistribution.js app/catana/__tests__/effects/resourceDistribution.test.js
git commit -m "feat: allow deterministic jitter for resource distribution"
```

### Task 3: Effects Lab route + demo payload builder (TDD + dev UI)

**Files:**
- Create: `app/catana/dev/effects/page.js`
- Create: `app/catana/dev/effects/EffectsLabClient.js`
- Create: `app/catana/dev/effects/resourceDistributionLabUtils.js`
- Test: `app/catana/__tests__/effects/resourceDistributionLabUtils.test.js`

**Step 1: Write the failing test**

```js
import { describe, expect, it } from "vitest";
import { buildResourceDistributionDemo } from "../../dev/effects/resourceDistributionLabUtils";
import { createSeededRandom } from "../../utils/seededRandom";

it("builds deterministic demo cards", () => {
  const random = createSeededRandom(1);
  const cards = buildResourceDistributionDemo({ count: 3, random });
  expect(cards).toHaveLength(3);
  expect(cards[0]).toHaveProperty("coordinate");
  expect(cards[0]).toHaveProperty("playerID");
  expect(cards[0]).toHaveProperty("resource");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run app/catana/__tests__/effects/resourceDistributionLabUtils.test.js`
Expected: FAIL because the util doesn’t exist.

**Step 3: Write minimal implementation**

- Implement `buildResourceDistributionDemo({ count, random })` that selects from a small fixed list of coordinates/resources/players.
- `page.js` should 404 in production:
  ```js
  import { notFound } from "next/navigation";
  import { EffectsLabClient } from "./EffectsLabClient";

  export default function Page() {
    if (process.env.NODE_ENV !== "development") {
      notFound();
    }
    return <EffectsLabClient />;
  }
  ```
- `EffectsLabClient.js` (client component) should:
  - Render a faux board container with `ref`.
  - Render fake target elements with IDs `p0-resources` and `p1-resources`.
  - Render `EffectLayer`.
  - Provide controls: seed input, card count, timeScale slider, replay button.
  - On replay: `const random = createSeededRandom(seed); const runner = createResourceDistributionRunner({ ..., random }); runner({ cards });`
  - Apply `gsap.globalTimeline.timeScale(timeScale)` in an effect (reset to 1 on unmount).

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run app/catana/__tests__/effects/resourceDistributionLabUtils.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add app/catana/dev/effects/page.js app/catana/dev/effects/EffectsLabClient.js app/catana/dev/effects/resourceDistributionLabUtils.js app/catana/__tests__/effects/resourceDistributionLabUtils.test.js
git commit -m "feat: add dev effects lab for resource distribution"
```

### Task 4: Docs + agent notes

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Update PROGRESS**

Add a 2026-01-19 entry noting the dev-only Effects Lab and deterministic replays.

**Step 2: Update NOTES**

Add a note pointing to `/catana/dev/effects` and the seeded RNG + demo payload helper.

**Step 3: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: note effects lab workflow"
```

### Task 5: Verify

**Step 1: Run targeted tests**

Run:
```bash
pnpm vitest run app/catana/__tests__/utils/seededRandom.test.js
pnpm vitest run app/catana/__tests__/effects/resourceDistribution.test.js
pnpm vitest run app/catana/__tests__/effects/resourceDistributionLabUtils.test.js
```

**Step 2: Manual smoke**

Run `pnpm dev` and visit `http://localhost:3000/catana/dev/effects`.
Click Replay and confirm cards animate. Adjust seed/timeScale to confirm deterministic differences.
