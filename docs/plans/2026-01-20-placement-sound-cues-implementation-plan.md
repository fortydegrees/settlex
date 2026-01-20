# Placement Sound Cues Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Emit distinct placement audio cues for settlement and road, mapped to `/sounds/settle.mp3` and `/sounds/road.mp3`, while keeping placement visuals unchanged.

**Architecture:** Placement continues to emit the `build:place` bus event for visuals. Audio cues are emitted per piece type (`build:settlement`, `build:road`). `soundThemes.js` maps the new cues to files in `public/sounds/`. Effects Lab placement entry lists both cues for the override UI.

**Tech Stack:** Next.js app (`app/`), Howler-based AudioManager, Vitest for app tests, static assets served from `public/`.

---

### Task 1: Add failing tests for new placement cues

**Files:**
- Modify: `app/catana/__tests__/effects/placePieceWiring.test.js`
- Modify: `app/catana/__tests__/effects/EffectsLabAudioOverride.test.js`

**Step 1: Write the failing tests**

Add a new test in `placePieceWiring.test.js`:

```js
it("emits piece-specific placement audio cues", () => {
  const source = read("../../effects/placePiece.js");
  expect(source).toContain("build:settlement");
  expect(source).toContain("build:road");
});
```

Update `EffectsLabAudioOverride.test.js` to expect the new cues:

```js
expect(source).toContain("build:settlement");
expect(source).toContain("build:road");
```

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm vitest run app/catana/__tests__/effects/placePieceWiring.test.js app/catana/__tests__/effects/EffectsLabAudioOverride.test.js
```

Expected: FAIL because code still references `build:place` and lab registry only lists that cue.

---

### Task 2: Implement new cues + asset paths

**Files:**
- Modify: `app/catana/effects/placePiece.js`
- Modify: `app/catana/effects/soundThemes.js`
- Modify: `app/catana/dev/effects/registry.js`
- Modify: `app/catana/__tests__/effects/AudioManager.test.js`
- Move: `sounds/settle.mp3` → `public/sounds/settle.mp3`
- Move: `sounds/road.mp3` → `public/sounds/road.mp3`

**Step 1: Emit piece-specific cues**

In `app/catana/effects/placePiece.js`, replace settlement/city cue emission with:

```js
emitCue?.("build:settlement");
```

and road placement cue emission with:

```js
emitCue?.("build:road");
```

**Step 2: Map new cues in the theme**

In `app/catana/effects/soundThemes.js`, add:

```js
"build:settlement": { src: "/sounds/settle.mp3", volume: 0.6 },
"build:road": { src: "/sounds/road.mp3", volume: 0.6 },
```

Keep `"build:place"` mapping as a compatibility fallback.

**Step 3: Update lab cue list**

In `app/catana/dev/effects/registry.js`, update the placement lab entry:

```js
cues: ["build:settlement", "build:road"]
```

**Step 4: Update AudioManager test to use new cue**

In `app/catana/__tests__/effects/AudioManager.test.js`, change the cue name from `build:place` to `build:settlement` in the format override test.

**Step 5: Move audio assets**

Run:

```bash
mv sounds/settle.mp3 public/sounds/settle.mp3
mv sounds/road.mp3 public/sounds/road.mp3
```

**Step 6: Run tests to verify they pass**

Run:

```bash
pnpm vitest run app/catana/__tests__/effects/placePieceWiring.test.js app/catana/__tests__/effects/EffectsLabAudioOverride.test.js app/catana/__tests__/effects/AudioManager.test.js
```

Expected: PASS.

**Step 7: Commit**

```bash
git add app/catana/effects/placePiece.js app/catana/effects/soundThemes.js app/catana/dev/effects/registry.js app/catana/__tests__/effects/placePieceWiring.test.js app/catana/__tests__/effects/EffectsLabAudioOverride.test.js app/catana/__tests__/effects/AudioManager.test.js public/sounds/settle.mp3 public/sounds/road.mp3
git commit -m "feat: add settlement and road placement cues"
```

---

### Task 3: Update agent docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Record changes**

Add a short entry describing the new placement cues and sound assets.

**Step 2: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: update agent notes for placement cues"
```
