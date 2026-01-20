# Piece Placement Effects Lab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dev-only Effects Lab entry with full tuning controls for the piece placement animation, using runner overrides.

**Architecture:** Extend the placement runner to accept optional tuning overrides, then add a new lab component that calls the runner with selected piece payload + tuning values. Register the lab in the Effects Lab registry.

**Tech Stack:** React, GSAP, boardgame-core board utils.

---

### Task 1: Add tuning overrides to placement runner (TDD-light)

**Files:**
- Modify: `app/catana/effects/placePiece.js`

**Step 1: Add tuning defaults + merge logic**

Add a `DEFAULT_TUNING` object and merge with user overrides:

```js
const DEFAULT_TUNING = {
  dropDistance: 0.7,
  dropDuration: 0.22,
  squishDuration: 0.08,
  settleDuration: 0.18,
  dustDuration: 0.24,
  dustScaleFrom: 0.2,
  dustScaleTo: 1.15,
  dustOpacity: 0.5,
  easeDrop: "power2.in",
  easeSquish: "power2.out",
  easeSettle: "back.out(1.6)"
};

const tuning = { ...DEFAULT_TUNING, ...payload?.tuning };
```

Replace hardcoded constants with `tuning.*` values.

**Step 2: Manual sanity check**

No automated test; spot-check by running the Effects Lab after wiring.

**Step 3: Commit**

```bash
git add app/catana/effects/placePiece.js
git commit -m "feat: add placement tuning overrides"
```

---

### Task 2: Create PiecePlacementLab component

**Files:**
- Create: `app/catana/dev/effects/PiecePlacementLab.jsx`

**Step 1: Implement lab UI + runner call**

- Use `getBoardLayout` + `useWindowSize` to compute board surface.
- Build tiles via `generateBoard(resolveBoardConfig("standard-random"), rng, true)` (seeded RNG).
- Derive `nodeIds` and `edgeIds` from `buildRenderMaps`.
- Controls: piece type, player color, target index, and full tuning sliders + easing inputs.
- On Play, call `createPiecePlacementRunner` with `getLayerEl`, `getLayout`, `getBoardRect`, `getTiles`, `getPlayerColor`, `emitCue`.
- Pass `payload = { pieceType, id, playerId, tuning }` to runner.

**Step 2: Manual verification**

Run `pnpm dev`, go to `/catana/dev/effects`, select “Piece Placement,” adjust sliders, click Play; verify animation + audio.

**Step 3: Commit**

```bash
git add app/catana/dev/effects/PiecePlacementLab.jsx
git commit -m "feat: add piece placement effects lab"
```

---

### Task 3: Register lab in Effects Lab registry

**Files:**
- Modify: `app/catana/dev/effects/registry.js`

**Step 1: Register component**

Add:

```js
import { PiecePlacementLab } from "./PiecePlacementLab.jsx";

{
  id: "piece-placement",
  label: "Piece Placement",
  component: PiecePlacementLab,
  supportsAudio: true
}
```

**Step 2: Commit**

```bash
git add app/catana/dev/effects/registry.js
git commit -m "feat: register piece placement lab"
```

---

### Task 4: Update agent docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Add progress + notes**

Note the new Effects Lab entry and the tuning override capability.

**Step 2: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: note placement lab"
```
