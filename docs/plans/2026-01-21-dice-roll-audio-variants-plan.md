# Dice Roll Audio Variants Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the dice-roll cue with 5 shuffled variants plus subtle per-play volume/pitch jitter, and move the dice mp3s into `public/sounds/`.

**Architecture:** Extend `createAudioManager` to support per-cue variant playback via a shuffle-bag and optional `randomize` settings. Keep the existing cue bus + theme mapping intact and only update the `dice:roll` theme entry.

**Tech Stack:** React, Howler, Vitest, Next.js.

### Task 1: Add AudioManager tests for variant playback

**Files:**
- Modify: `app/catana/__tests__/effects/AudioManager.test.js`

**Step 1: Write the failing tests**

Add a deterministic Howler mock that exposes `play`, `rate`, and `volume`, and add two tests:

```js
const howlInstances = [];

vi.mock("howler", () => ({
  Howl: vi.fn((config) => {
    const instance = {
      config,
      play: vi.fn(() => 1),
      rate: vi.fn(),
      volume: vi.fn()
    };
    howlInstances.push(instance);
    return instance;
  })
}));
```

Test A: variant shuffle bag (no immediate repeat with deterministic random):

```js
it("plays through variants without immediate repeats", () => {
  vi.spyOn(Math, "random")
    .mockReturnValueOnce(0)   // shuffle bag 1 => reverse for 2 items
    .mockReturnValueOnce(0.9); // shuffle bag 2 => normal order

  const bus = createEffectBus();
  const audio = createAudioManager({
    bus,
    theme: {
      "dice:roll": {
        variants: ["/sounds/dice_roll1.mp3", "/sounds/dice_roll2.mp3"],
        shuffle: true
      }
    },
    settings: { muted: false }
  });

  audio.unlock();
  bus.emit({ type: "cue", payload: { name: "dice:roll" } });
  bus.emit({ type: "cue", payload: { name: "dice:roll" } });
  bus.emit({ type: "cue", payload: { name: "dice:roll" } });

  const [first, second] = howlInstances;
  expect(first.play).toHaveBeenCalledTimes(2);
  expect(second.play).toHaveBeenCalledTimes(1);
});
```

Test B: randomize applies rate + volume jitter per play:

```js
it("applies per-play rate and volume randomization", () => {
  vi.spyOn(Math, "random")
    .mockReturnValueOnce(0)    // shuffle
    .mockReturnValueOnce(0.5)  // rate jitter => midpoint
    .mockReturnValueOnce(0.5); // volume jitter => midpoint

  const bus = createEffectBus();
  const audio = createAudioManager({
    bus,
    theme: {
      "dice:roll": {
        variants: ["/sounds/dice_roll1.mp3"],
        shuffle: true,
        volume: 0.5,
        randomize: {
          rate: [0.98, 1.02],
          volume: [0.9, 1.0]
        }
      }
    },
    settings: { muted: false }
  });

  audio.unlock();
  bus.emit({ type: "cue", payload: { name: "dice:roll" } });

  const instance = howlInstances[0];
  expect(instance.rate).toHaveBeenCalledWith(1.0, 1);
  expect(instance.volume).toHaveBeenCalledWith(0.475, 1);
});
```

**Step 2: Run the test to verify failure**

Run: `pnpm test app/catana/__tests__/effects/AudioManager.test.js`

Expected: FAIL because variants/shuffle/randomize aren’t implemented yet.

**Step 3: Commit test changes**

```bash
git add app/catana/__tests__/effects/AudioManager.test.js
git commit -m "test: cover audio variant shuffle and jitter"
```

### Task 2: Implement variant playback in AudioManager

**Files:**
- Modify: `app/catana/effects/AudioManager.js`

**Step 1: Implement shuffle bag + randomize helpers**

Add helpers for:
- `shuffleIndices(indices, rng)` using Fisher-Yates.
- `drawVariantIndex(cueName, entry)` using a per-cue bag + last index, with swap to avoid immediate repeats.
- `applyRandomize(howl, id, entry)` that uses `randomize.rate` and `randomize.volume`.

Pseudo-code for the core selection:

```js
const variantState = new Map();

const drawVariantIndex = (cueName, entry) => {
  const variants = entry.variants || [];
  if (!variants.length) return null;

  let state = variantState.get(cueName);
  if (!state || state.bag.length === 0) {
    const bag = variants.map((_, idx) => idx);
    if (entry.shuffle) shuffleIndices(bag, Math.random);
    if (state?.lastIndex != null && bag.length > 1 && bag[0] === state.lastIndex) {
      [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    state = { bag, lastIndex: state?.lastIndex ?? null };
    variantState.set(cueName, state);
  }

  const nextIndex = state.bag.shift();
  state.lastIndex = nextIndex;
  return nextIndex;
};
```

**Step 2: Update `play` to use variants**

- If `entry.variants` is present, select a variant index, use its `src`, and cache a Howl by `src` instead of cue name.
- Call `howl.play()` and apply `rate`/`volume` jitter per sound id when `randomize` is present.
- Preserve existing mute + hidden-tab behavior and `lastPlay` tracking.

**Step 3: Run the test again**

Run: `pnpm test app/catana/__tests__/effects/AudioManager.test.js`

Expected: PASS.

**Step 4: Commit AudioManager changes**

```bash
git add app/catana/effects/AudioManager.js
git commit -m "feat: add shuffle-bag dice audio variants"
```

### Task 3: Update dice theme entry + move assets

**Files:**
- Modify: `app/catana/effects/soundThemes.js`
- Move: `sounds/dice_roll1.mp3` -> `public/sounds/dice_roll1.mp3`
- Move: `sounds/dice_roll2.mp3` -> `public/sounds/dice_roll2.mp3`
- Move: `sounds/dice_roll3.mp3` -> `public/sounds/dice_roll3.mp3`
- Move: `sounds/dice_roll4.mp3` -> `public/sounds/dice_roll4.mp3`
- Move: `sounds/dice_roll5.mp3` -> `public/sounds/dice_roll5.mp3`

**Step 1: Update `dice:roll` mapping**

```js
"dice:roll": {
  variants: [
    "/sounds/dice_roll1.mp3",
    "/sounds/dice_roll2.mp3",
    "/sounds/dice_roll3.mp3",
    "/sounds/dice_roll4.mp3",
    "/sounds/dice_roll5.mp3"
  ],
  volume: 0.5,
  allowWhenHidden: true,
  shuffle: true,
  randomize: { volume: [0.9, 1.0], rate: [0.98, 1.02] }
},
```

**Step 2: Move the mp3 assets**

```bash
mv sounds/dice_roll1.mp3 public/sounds/dice_roll1.mp3
mv sounds/dice_roll2.mp3 public/sounds/dice_roll2.mp3
mv sounds/dice_roll3.mp3 public/sounds/dice_roll3.mp3
mv sounds/dice_roll4.mp3 public/sounds/dice_roll4.mp3
mv sounds/dice_roll5.mp3 public/sounds/dice_roll5.mp3
```

**Step 3: Run lint + targeted tests**

Run: `pnpm test app/catana/__tests__/effects/AudioManager.test.js`

**Step 4: Commit theme + asset changes**

```bash
git add app/catana/effects/soundThemes.js public/sounds/dice_roll1.mp3 public/sounds/dice_roll2.mp3 public/sounds/dice_roll3.mp3 public/sounds/dice_roll4.mp3 public/sounds/dice_roll5.mp3
git commit -m "feat: map dice roll to shuffled audio variants"
```

### Task 4: Update agent docs + final verification

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Update agent docs**

Add a new 2026-01-21 status entry describing the dice roll audio changes and note that dice roll now uses variants + jitter.

**Step 2: Run full verify**

Run: `pnpm verify`

Expected: PASS (same lint warnings as baseline are acceptable).

**Step 3: Commit docs**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: note dice roll audio variants"
```
