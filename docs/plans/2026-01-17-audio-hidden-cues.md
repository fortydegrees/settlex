# Audio Hidden Cue Policy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow specific audio cues (dice roll, turn start) to play when the tab is hidden while keeping animation-tied cues muted in hidden tabs.

**Architecture:** Add a per-cue `allowWhenHidden` policy in the sound theme and enforce it in `AudioManager` using the existing `isDocumentHidden` helper. Emit new cues from `GameEffects` (roll + turn start) and map them to placeholder sounds in the theme. Keep all sound triggers centralized in the effect bus.

**Tech Stack:** React, bgio-effects, Howler, GSAP, Vitest.

### Task 1: AudioManager hidden policy (tests first)

**Files:**
- Modify: `app/catana/__tests__/effects/AudioManager.test.js`
- Modify: `app/catana/effects/AudioManager.js`

**Step 1: Write the failing tests**

Add two tests:

```js
it("skips cues when document is hidden unless allowed", () => {
  global.document = { hidden: true };
  const bus = createEffectBus();
  const audio = createAudioManager({
    bus,
    theme: {
      "resource:travel:start": { src: "/sounds/woosh-card.mp3", volume: 0.6 }
    },
    settings: { muted: false }
  });
  audio.unlock();
  bus.emit({ type: "cue", payload: { name: "resource:travel:start" } });
  expect(audio._debugLastPlay()).toBe(null);
});

it("plays cues that are allowed when document is hidden", () => {
  global.document = { hidden: true };
  const bus = createEffectBus();
  const audio = createAudioManager({
    bus,
    theme: {
      "turn:start": { src: "/sounds/shimmer.mp3", volume: 0.5, allowWhenHidden: true }
    },
    settings: { muted: false }
  });
  audio.unlock();
  bus.emit({ type: "cue", payload: { name: "turn:start" } });
  expect(audio._debugLastPlay()).toBe("turn:start");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run app/catana/__tests__/effects/AudioManager.test.js`  
Expected: FAIL because AudioManager doesn’t check `document.hidden` or `allowWhenHidden`.

**Step 3: Write minimal implementation**

Update `createAudioManager` to:
- Import `isDocumentHidden` from `app/catana/utils/visibility.js`
- If `document.hidden` and theme entry lacks `allowWhenHidden`, skip `play`.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run app/catana/__tests__/effects/AudioManager.test.js`  
Expected: PASS

**Step 5: Commit**

```bash
git add app/catana/effects/AudioManager.js app/catana/__tests__/effects/AudioManager.test.js
git commit -m "feat: gate audio cues when tab is hidden"
```

### Task 2: Add roll + turn-start cues

**Files:**
- Modify: `app/catana/effects/soundThemes.js`
- Modify: `app/catana/effects/GameEffects.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/__tests__/effects/GameEffects.test.js`

**Step 1: Write the failing test**

Update the static test to assert the new cue wiring exists:

```js
expect(source).toContain("roll");
expect(source).toContain("dice:roll");
expect(source).toContain("turn:start");
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run app/catana/__tests__/effects/GameEffects.test.js`  
Expected: FAIL because strings aren’t present yet.

**Step 3: Write minimal implementation**

- `soundThemes.js`: add `dice:roll` and `turn:start` entries, both with `allowWhenHidden: true`, mapped to existing sounds for now.
- `GameEffects.js`:
  - add `useEffectListener("roll", ...)` to emit `cue` with name `dice:roll`
  - add a `useEffect` that tracks `currentPlayerId` changes and emits `turn:start` when it becomes the local player, skipping initial mount and `preGame`.
- `GameScreen.js`: pass `currentPlayerId`, `playerID`, and `ctx.phase` into `GameEffects`.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run app/catana/__tests__/effects/GameEffects.test.js`  
Expected: PASS

**Step 5: Commit**

```bash
git add app/catana/effects/soundThemes.js app/catana/effects/GameEffects.js app/catana/GameScreen.js app/catana/__tests__/effects/GameEffects.test.js
git commit -m "feat: emit roll and turn-start audio cues"
```

### Task 3: Docs + agent notes

**Files:**
- Modify: `docs/plans/2026-01-16-effects-audio-design.md`
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Update design doc**

Add a bullet under Sound Themes + Settings describing `allowWhenHidden`.

**Step 2: Update agent docs**

Add a brief entry noting:
- hidden-tab audio policy
- new `dice:roll` / `turn:start` cues

**Step 3: Commit**

```bash
git add docs/plans/2026-01-16-effects-audio-design.md docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: note hidden audio policy and new cues"
```

### Task 4: Verify

**Step 1: Run targeted tests**

Run:
```bash
pnpm vitest run app/catana/__tests__/effects/AudioManager.test.js
pnpm vitest run app/catana/__tests__/effects/GameEffects.test.js
```

**Step 2: (Optional) smoke**

If desired: `pnpm dev` and manually confirm roll + turn sounds.

