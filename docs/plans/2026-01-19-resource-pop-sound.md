# Resource Pop Sound Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the resource distribution travel sound with a pop-out sound that plays once per card at the start of the pop animation.

**Architecture:** Emit a new cue (`resource:pop:start`) at the start of each resource card’s GSAP timeline (before travel), map that cue to `/sounds/ui-pop-resource-out.mp3`, and stop emitting the old travel cue for this animation. Update tests to reflect the new cue and label, and ensure the asset is available in `public/sounds/`.

**Tech Stack:** React, GSAP, Howler, Vitest, Next.js (public assets)

### Task 1: Update resourceDistribution cue test (RED → GREEN)

**Files:**
- Modify: `app/catana/__tests__/effects/resourceDistribution.test.js`

**Step 1: Write the failing test**

```js
it("registers pop-start cue", () => {
  const calls = [];
  const tl = {
    call: (_, __, label) => calls.push(label)
  };
  scheduleResourceCues(tl, () => {});
  expect(calls).toContain("pop");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run app/catana/__tests__/effects/resourceDistribution.test.js`
Expected: FAIL because the current label is `travel`, not `pop`.

**Step 3: Minimal implementation**

Update `scheduleResourceCues` in `app/catana/effects/resourceDistribution.js` to emit a cue at a `pop` label (add the label to the timeline at the start of the pop phase and schedule the cue there).

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run app/catana/__tests__/effects/resourceDistribution.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add app/catana/__tests__/effects/resourceDistribution.test.js app/catana/effects/resourceDistribution.js
git commit -m "feat: emit pop-start cue for resource distribution"
```

### Task 2: Update AudioManager cue tests (RED → GREEN)

**Files:**
- Modify: `app/catana/__tests__/effects/AudioManager.test.js`

**Step 1: Write the failing test**

```js
it("plays sound for cue mapping", () => {
  const bus = createEffectBus();
  const audio = createAudioManager({
    bus,
    theme: {
      "resource:pop:start": { src: "/sounds/ui-pop-resource-out.mp3", volume: 0.6 }
    },
    settings: { muted: false }
  });
  audio.unlock();
  bus.emit({ type: "cue", payload: { name: "resource:pop:start" } });
  expect(audio._debugLastPlay()).toBe("resource:pop:start");
});
```

Update the hidden-tab test to use `resource:pop:start` as the cue name.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run app/catana/__tests__/effects/AudioManager.test.js`
Expected: FAIL because the test expects a cue name not in the old tests.

**Step 3: Minimal implementation**

No production code needed here; the AudioManager should already work for any cue name. Fix tests accordingly.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run app/catana/__tests__/effects/AudioManager.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add app/catana/__tests__/effects/AudioManager.test.js
git commit -m "test: cover resource pop cue in audio manager"
```

### Task 3: Wire pop cue + sound mapping + asset (RED → GREEN)

**Files:**
- Modify: `app/catana/effects/resourceDistribution.js`
- Modify: `app/catana/effects/soundThemes.js`
- Add: `public/sounds/ui-pop-resource-out.mp3` (copy from `sounds/ui-pop-resource-out.mp3`)

**Step 1: Write the failing test**

Update the `resourceDistribution` cue test (Task 1) to require the new `resource:pop:start` emission by asserting the `pop` label; keep it as the contract for this behavior.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run app/catana/__tests__/effects/resourceDistribution.test.js`
Expected: FAIL until the cue is emitted at the `pop` label.

**Step 3: Minimal implementation**

- In `resourceDistribution.js`, add a `pop` label at the start of the timeline and emit `resource:pop:start` at that label (replace the old `resource:travel:start` emission).
- In `soundThemes.js`, map `resource:pop:start` to `"/sounds/ui-pop-resource-out.mp3"` and remove the `resource:travel:start` entry.
- Copy the asset: `cp sounds/ui-pop-resource-out.mp3 public/sounds/ui-pop-resource-out.mp3`.

**Step 4: Run tests to verify they pass**

Run:
- `pnpm vitest run app/catana/__tests__/effects/resourceDistribution.test.js`
- `pnpm vitest run app/catana/__tests__/effects/AudioManager.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add app/catana/effects/resourceDistribution.js app/catana/effects/soundThemes.js public/sounds/ui-pop-resource-out.mp3
git commit -m "feat: use pop-out sound for resource distribution"
```

### Task 4: Update agent docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Update notes**

Add a bullet noting `resource:pop:start` replaces `resource:travel:start` for the resource pop-out sound.

**Step 2: Update progress**

Add a status note for the sound swap.

**Step 3: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: note resource pop sound cue"
```
