# Catana Pointer Frame Batching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Batch placement-preview target measurements and development-card hover updates to one execution per browser frame without changing their visual behaviour.

**Architecture:** Each affected component keeps its latest pointer coordinate in an existing or new ref and owns one separate pending request-animation-frame ref. Raw pointer events only replace the latest coordinate and schedule the frame when none is pending; the frame clears its pending marker before running the component's existing synchronization logic. Board geometry remains live and the placement spring loops remain unchanged.

**Tech Stack:** React 18, JavaScript, requestAnimationFrame, GSAP, Vitest source regressions, ESLint, Catana 2D dev sandbox.

## Global Constraints

- Preserve placement motion, magnetic snapping, road rotation, robber lean, development-card magnification, focus handling, and animation timing.
- Keep live getBoundingClientRect measurements; do not permanently cache target rectangles.
- Do not change the existing placement spring loops or add idle sleep/wake behaviour.
- Add no shared scheduling abstraction, dependency, build-tool change, or broad component refactor.
- Cancel pending batching frames on component cleanup and, for the development-card dock, on mouse leave.
- Work only in `/Users/david/coding/settlex/.worktrees/animation-quick-wins` on `codex/animation-quick-wins`.

---

### Task 1: Batch placement-preview pointer synchronization

**Files:**
- Create: `app/catana/__tests__/PointerFrameBatching.source.test.js`
- Modify: `app/catana/BuildPlacementPreview.js`
- Modify: `app/catana/RobberPlacementPreview.js`

**Interfaces:**
- Consumes: each preview's existing `pointerRef` and `syncDesiredPosition()` callback.
- Produces: a component-local `pointerSyncFrameRef` and `flushPointerSync()` callback in each preview; no exported API.

- [ ] **Step 1: Write the failing placement batching regression**

Create `app/catana/__tests__/PointerFrameBatching.source.test.js`:

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const readCatanaSource = (fileName) =>
  fs.readFileSync(path.resolve(__dirname, "..", fileName), "utf8");

const expectPlacementPointerBatching = (source) => {
  expect(source).toContain("const pointerSyncFrameRef = useRef(null);");
  expect(source).toContain("const flushPointerSync = () => {");
  expect(source).toMatch(
    /pointerSyncFrameRef\.current = null;\s+syncDesiredPosition\(\);/
  );
  expect(source).toContain(
    "pointerSyncFrameRef.current = requestAnimationFrame(flushPointerSync);"
  );
  expect(source).toMatch(
    /if \(pointerSyncFrameRef\.current == null\) \{\s+pointerSyncFrameRef\.current = requestAnimationFrame\(flushPointerSync\);/
  );
  expect(source).toContain(
    "cancelAnimationFrame(pointerSyncFrameRef.current);"
  );
};

describe("pointer frame batching", () => {
  it("batches build placement target synchronization", () => {
    expectPlacementPointerBatching(readCatanaSource("BuildPlacementPreview.js"));
  });

  it("batches robber placement target synchronization", () => {
    expectPlacementPointerBatching(readCatanaSource("RobberPlacementPreview.js"));
  });
});
```

- [ ] **Step 2: Run the placement batching regression and verify RED**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/PointerFrameBatching.source.test.js --exclude '.worktrees/**' --reporter=dot
```

Expected: two failures because neither preview declares `pointerSyncFrameRef`.

- [ ] **Step 3: Batch build placement pointer synchronization**

In `BuildPlacementPreview`, declare a batching ref beside the existing spring frame ref:

```js
const animationFrameRef = useRef(null);
const pointerSyncFrameRef = useRef(null);
```

Inside the active preview effect, replace the direct pointer synchronization with a frame callback. Keep the existing reduced-motion block inside `flushPointerSync`, immediately after `syncDesiredPosition()`, without changing its body:

```js
const flushPointerSync = () => {
  pointerSyncFrameRef.current = null;
  syncDesiredPosition();

  if (reduceMotion) {
    if (!launchReadyRef.current) {
      return;
    }
    const nextPosition = desiredPositionRef.current;
    if (Number.isFinite(nextPosition.x) && Number.isFinite(nextPosition.y)) {
      currentPositionRef.current = nextPosition;
      const boardShadowVisible = isPointOverRobberBoardLand({
        pointX: nextPosition.x,
        pointY:
          nextPosition.y +
          previewSize * PREVIEW_SHADOW_GROUND_OFFSET_FACTOR,
        landTileCenters,
        tileSize: boardTileSize
      });
      gsap.set(previewNode, nextPosition);
      gsap.set(graphicNode, {
        rotation: desiredRotationRef.current
      });
      gsap.set(shadowNode, {
        opacity: boardShadowVisible ? 0.44 : 0,
        scaleX: boardShadowVisible ? 1 : 0.85,
        scaleY: boardShadowVisible ? 0.92 : 0.7
      });
      gsap.to(previewNode, {
        opacity: 1,
        scale: 1,
        duration: 0.08,
        ease: "power2.out",
        overwrite: "auto"
      });
    }
  }
};

const updateDesiredFromPointer = (event) => {
  pointerRef.current = { x: event.clientX, y: event.clientY };
  if (pointerSyncFrameRef.current == null) {
    pointerSyncFrameRef.current = requestAnimationFrame(flushPointerSync);
  }
};
```

Add pointer-frame cancellation before spring-frame cancellation in the effect cleanup:

```js
if (pointerSyncFrameRef.current != null) {
  cancelAnimationFrame(pointerSyncFrameRef.current);
}
pointerSyncFrameRef.current = null;
```

- [ ] **Step 4: Batch robber placement pointer synchronization**

In `RobberPlacementPreview`, declare the same separate batching ref:

```js
const animationFrameRef = useRef(null);
const pointerSyncFrameRef = useRef(null);
```

Replace the direct pointer synchronization inside its active effect:

```js
const flushPointerSync = () => {
  pointerSyncFrameRef.current = null;
  syncDesiredPosition();
};

const handlePointerMove = (event) => {
  pointerRef.current = { x: event.clientX, y: event.clientY };
  if (pointerSyncFrameRef.current == null) {
    pointerSyncFrameRef.current = requestAnimationFrame(flushPointerSync);
  }
};
```

Add the same pending pointer-frame cancellation to the effect cleanup before cancelling `animationFrameRef`.

- [ ] **Step 5: Run the placement-preview tests and verify GREEN**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/PointerFrameBatching.source.test.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js app/catana/__tests__/RobberPlacementPreview.springMotion.test.js app/catana/__tests__/RobberPlacementPreview.test.js --exclude '.worktrees/**' --reporter=dot
```

Expected: all tests pass.

- [ ] **Step 6: Lint and commit the placement batching change**

Run:

```bash
pnpm exec eslint app/catana/BuildPlacementPreview.js app/catana/RobberPlacementPreview.js app/catana/__tests__/PointerFrameBatching.source.test.js
git diff --check
```

Expected: both commands exit 0.

Commit:

```bash
git add app/catana/BuildPlacementPreview.js app/catana/RobberPlacementPreview.js app/catana/__tests__/PointerFrameBatching.source.test.js
git commit -m "perf: batch Catana placement pointer work"
```

---

### Task 2: Batch development-card hover updates

**Files:**
- Modify: `app/catana/components/DevCardDisplay.js`
- Modify: `app/catana/__tests__/PointerFrameBatching.source.test.js`

**Interfaces:**
- Consumes: `dockRef`, React's `useEffect`, `useCallback`, `useRef`, and the existing `pointerX`/`focusedIndex` state setters.
- Produces: component-local `pointerUpdateFrameRef`, `latestPointerClientXRef`, `cancelPointerUpdate()`, `flushPointerUpdate()`, and `handlePointerLeave()`; no exported API.

- [ ] **Step 1: Extend the regression with failing dev-card assertions**

Add the component source path and a third test to `PointerFrameBatching.source.test.js`:

```js
const devCardSource = fs.readFileSync(
  path.resolve(__dirname, "..", "components", "DevCardDisplay.js"),
  "utf8"
);
```

```js
it("batches and cleans up development-card pointer updates", () => {
  expect(devCardSource).toContain("const pointerUpdateFrameRef = useRef(null);");
  expect(devCardSource).toContain("const latestPointerClientXRef = useRef(null);");
  expect(devCardSource).toContain(
    "pointerUpdateFrameRef.current = requestAnimationFrame(flushPointerUpdate);"
  );
  expect(devCardSource).toMatch(
    /if \(pointerUpdateFrameRef\.current == null\) \{\s+pointerUpdateFrameRef\.current = requestAnimationFrame\(flushPointerUpdate\);/
  );
  expect(devCardSource).toContain(
    "cancelAnimationFrame(pointerUpdateFrameRef.current);"
  );
  expect(devCardSource).toContain("useEffect(() => cancelPointerUpdate");
  expect(devCardSource).toContain("onMouseLeave={handlePointerLeave}");
});
```

- [ ] **Step 2: Run the dev-card regression and verify RED**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/PointerFrameBatching.source.test.js --exclude '.worktrees/**' --reporter=dot
```

Expected: the two placement tests pass and the dev-card test fails because `pointerUpdateFrameRef` is absent.

- [ ] **Step 3: Implement latest-pointer frame batching in DevCardDisplay**

Add `useEffect` to the React import:

```js
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
```

Declare the refs after `dockRef`:

```js
const dockRef = useRef(null);
const pointerUpdateFrameRef = useRef(null);
const latestPointerClientXRef = useRef(null);
```

Replace the direct `handlePointerMove` implementation with these callbacks and cleanup effect:

```js
const cancelPointerUpdate = useCallback(() => {
  if (pointerUpdateFrameRef.current != null) {
    cancelAnimationFrame(pointerUpdateFrameRef.current);
  }
  pointerUpdateFrameRef.current = null;
}, []);

const flushPointerUpdate = useCallback(() => {
  pointerUpdateFrameRef.current = null;
  const clientX = latestPointerClientXRef.current;
  const rect = dockRef.current?.getBoundingClientRect?.();
  if (!Number.isFinite(clientX) || !rect) return;
  setPointerX(clientX - rect.left);
}, []);

const handlePointerMove = useCallback(
  (event) => {
    latestPointerClientXRef.current = event.clientX;
    if (pointerUpdateFrameRef.current == null) {
      pointerUpdateFrameRef.current = requestAnimationFrame(flushPointerUpdate);
    }
  },
  [flushPointerUpdate]
);

const handlePointerLeave = useCallback(() => {
  cancelPointerUpdate();
  latestPointerClientXRef.current = null;
  setPointerX(null);
  setFocusedIndex(null);
}, [cancelPointerUpdate]);

useEffect(() => cancelPointerUpdate, [cancelPointerUpdate]);
```

Replace the inline leave handler with:

```jsx
onMouseLeave={handlePointerLeave}
```

- [ ] **Step 4: Run dev-card and batching tests and verify GREEN**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/PointerFrameBatching.source.test.js app/catana/__tests__/DevCardDisplayLayout.source.test.js app/catana/__tests__/PlayerActionBadges.test.js --exclude '.worktrees/**' --reporter=dot
```

Expected: all tests pass.

- [ ] **Step 5: Lint and commit the dev-card batching change**

Run:

```bash
pnpm exec eslint app/catana/components/DevCardDisplay.js app/catana/__tests__/PointerFrameBatching.source.test.js
git diff --check
```

Expected: both commands exit 0.

Commit:

```bash
git add app/catana/components/DevCardDisplay.js app/catana/__tests__/PointerFrameBatching.source.test.js
git commit -m "perf: batch Catana dev-card pointer updates"
```

---

### Task 3: Record and verify the batching slice

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Interfaces:**
- Consumes: the two independently passing batching changes from Tasks 1 and 2.
- Produces: durable project notes and final verification evidence; no runtime interface.

- [ ] **Step 1: Add the progress entry**

Append to `docs/agent/PROGRESS.md`:

```markdown
## Status (2026-07-14, Catana pointer-frame batching)
- Coalesced build and robber placement-preview pointer synchronization to one live target-geometry pass per browser frame while preserving the existing spring loops and magnetic selection.
- Coalesced development-card dock hover measurement and React pointer state to one update per browser frame, with pending work cancelled on leave and unmount.
- Kept board geometry live rather than caching target rectangles, so pan, zoom, and responsive movement cannot leave stale snapping coordinates.
- Verification:
  - `pnpm exec vitest run app/catana/__tests__/PointerFrameBatching.source.test.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js app/catana/__tests__/RobberPlacementPreview.springMotion.test.js app/catana/__tests__/RobberPlacementPreview.test.js app/catana/__tests__/DevCardDisplayLayout.source.test.js app/catana/__tests__/PlayerActionBadges.test.js --exclude '.worktrees/**' --reporter=dot`
  - `pnpm exec eslint app/catana/BuildPlacementPreview.js app/catana/RobberPlacementPreview.js app/catana/components/DevCardDisplay.js app/catana/__tests__/PointerFrameBatching.source.test.js`
  - `pnpm verify`
```

- [ ] **Step 2: Add the implementation boundary note**

Append to `docs/agent/NOTES.md`:

```markdown
- Catana pointer-frame batching note:
  - Keep placement target geometry live, but coalesce raw pointer events so build and robber previews measure magnetic targets at most once per browser frame.
  - Keep each pointer batching frame separate from the preview's continuous spring animation frame and cancel both independently during cleanup.
  - Keep development-card hover measurement and pointer state batched to one frame; cancel pending work on mouse leave and unmount so stale hover state cannot arrive afterward.
  - This is intentionally not a target-rectangle cache, idle spring-loop rewrite, shared scheduler abstraction, or visual timing change.
```

- [ ] **Step 3: Run the combined focused tests**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/PointerFrameBatching.source.test.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js app/catana/__tests__/RobberPlacementPreview.springMotion.test.js app/catana/__tests__/RobberPlacementPreview.test.js app/catana/__tests__/DevCardDisplayLayout.source.test.js app/catana/__tests__/PlayerActionBadges.test.js --exclude '.worktrees/**' --reporter=dot
```

Expected: all tests pass.

- [ ] **Step 4: Run lint and full repository verification**

Run:

```bash
pnpm exec eslint app/catana/BuildPlacementPreview.js app/catana/RobberPlacementPreview.js app/catana/components/DevCardDisplay.js app/catana/__tests__/PointerFrameBatching.source.test.js
pnpm verify
git diff --check
```

Expected: lint, the full game-core/server/app verification suite, and whitespace checks all exit 0.

- [ ] **Step 5: Manually verify unchanged interactions when the sandbox scenario is available**

In `/catana/dev/sandbox` at `1440x900`, verify:

1. Move a settlement/city/road pickup rapidly across multiple targets; snapping and road rotation remain responsive.
2. Move the robber rapidly across land tiles; snapping, lean, shadow, and lock pulse remain responsive.
3. Sweep rapidly across the development-card dock, leave it while moving, and keyboard-focus a card; magnification resets on leave and focus behaviour remains intact.

Expected: no perceptible change to motion, snapping, magnification, timing, or focus behaviour. If a deterministic scenario is unavailable, record that limitation rather than claiming visual verification.

- [ ] **Step 6: Commit documentation and verification evidence**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record Catana pointer batching checks"
```
