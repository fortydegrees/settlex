# Robber Placement UX Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a playful robber-placement mode that shows a single cursor-following robber preview with magnetic stickiness over valid targets, while preserving the current minimal placement behavior as a fallback path.

**Architecture:** Keep robber legality and click behavior in the existing `Board` / `Tile` path. Add a small pure utility to resolve `minimal` vs `playful`, a single portal-based preview component for the playful overlay, and lightweight board/tile wiring that reports hovered target centers without moving robber rules into the client animation layer.

**Tech Stack:** React, GSAP, existing Catana board UI, Vitest, existing agent docs

---

### Task 1: Add a testable robber motion-mode seam

**Files:**
- Reference: `docs/superpowers/specs/2026-03-31-robber-placement-ux-design.md`
- Reference: `docs/agent/skills/catana-brand/SKILL.md`
- Create: `app/catana/utils/robberPlacementMotion.js`
- Create: `app/catana/__tests__/robberPlacementMotion.test.js`
- Modify: `app/catana/GameScreen.js`

- [ ] **Step 1: Write the failing utility test**

Create `app/catana/__tests__/robberPlacementMotion.test.js` with assertions for:

```js
import {
  DEFAULT_ROBBER_PLACEMENT_MOTION_MODE,
  resolveRobberPlacementMotionMode
} from "../utils/robberPlacementMotion";

describe("robber placement motion mode", () => {
  it("defaults to playful when no fallback condition applies", () => {
    expect(DEFAULT_ROBBER_PLACEMENT_MOTION_MODE).toBe("playful");
    expect(
      resolveRobberPlacementMotionMode({
        requestedMode: "playful",
        prefersReducedMotion: false,
        hasCoarsePointer: false
      })
    ).toBe("playful");
  });

  it("falls back to minimal for reduced-motion users", () => {
    expect(
      resolveRobberPlacementMotionMode({
        requestedMode: "playful",
        prefersReducedMotion: true,
        hasCoarsePointer: false
      })
    ).toBe("minimal");
  });

  it("falls back to minimal for coarse pointers", () => {
    expect(
      resolveRobberPlacementMotionMode({
        requestedMode: "playful",
        prefersReducedMotion: false,
        hasCoarsePointer: true
      })
    ).toBe("minimal");
  });
});
```

Before moving past this step, re-read `docs/agent/skills/catana-brand/SKILL.md` so the playful motion layer still fits Catana’s existing visual language instead of feeling like a disconnected cursor gimmick.

- [ ] **Step 2: Run the targeted test to confirm it fails**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/robberPlacementMotion.test.js
```

Expected:
- FAIL because `app/catana/utils/robberPlacementMotion.js` does not exist yet.

- [ ] **Step 3: Write the minimal motion-mode utility**

Create `app/catana/utils/robberPlacementMotion.js` with a tiny pure API:

```js
export const DEFAULT_ROBBER_PLACEMENT_MOTION_MODE = "playful";

export function resolveRobberPlacementMotionMode({
  requestedMode = DEFAULT_ROBBER_PLACEMENT_MOTION_MODE,
  prefersReducedMotion = false,
  hasCoarsePointer = false
} = {}) {
  if (prefersReducedMotion || hasCoarsePointer) {
    return "minimal";
  }
  return requestedMode === "minimal" ? "minimal" : "playful";
}
```

- [ ] **Step 4: Add the future settings seam in `GameScreen`**

Modify `app/catana/GameScreen.js` so the screen owns the requested mode, even though it is still a constant for now:

```js
import {
  DEFAULT_ROBBER_PLACEMENT_MOTION_MODE
} from "./utils/robberPlacementMotion";

const robberPlacementMotionMode = DEFAULT_ROBBER_PLACEMENT_MOTION_MODE;
```

Pass that mode into `CatanBoard` as a prop so a future settings UI has a clean handoff point.

- [ ] **Step 5: Run the targeted test again**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/robberPlacementMotion.test.js
```

Expected:
- PASS

- [ ] **Step 6: Commit the seam**

Run:

```bash
git add app/catana/utils/robberPlacementMotion.js \
  app/catana/__tests__/robberPlacementMotion.test.js \
  app/catana/GameScreen.js
git commit -m "feat: add robber placement motion mode seam"
```

If the worktree is already dirty, stage only these files and do not include unrelated changes.

### Task 2: Add the playful robber preview overlay component

**Files:**
- Create: `app/catana/RobberPlacementPreview.js`
- Create: `app/catana/__tests__/RobberPlacementPreview.test.js`

- [ ] **Step 1: Write the failing preview wiring test**

Create `app/catana/__tests__/RobberPlacementPreview.test.js` as a source-level guard:

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const previewPath = path.resolve(__dirname, "..", "RobberPlacementPreview.js");

describe("RobberPlacementPreview", () => {
  it("uses a portal-based GSAP pointer follower", () => {
    const contents = fs.readFileSync(previewPath, "utf8");
    expect(contents).toContain("ReactDOM.createPortal");
    expect(contents).toContain("gsap.quickTo");
    expect(contents).toContain("pointermove");
    expect(contents).toContain("pointerEvents: \"none\"");
  });

  it("supports magnetic snapping to a hovered robber target", () => {
    const contents = fs.readFileSync(previewPath, "utf8");
    expect(contents).toContain("hoveredTarget");
    expect(contents).toContain("centerX");
    expect(contents).toContain("centerY");
  });
});
```

- [ ] **Step 2: Run the targeted test to confirm it fails**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/RobberPlacementPreview.test.js
```

Expected:
- FAIL because `app/catana/RobberPlacementPreview.js` does not exist yet.

- [ ] **Step 3: Implement the minimal preview component**

Create `app/catana/RobberPlacementPreview.js` as a single-responsibility component:
- uses `ReactDOM.createPortal(..., document.body)`,
- renders one fixed-position robber image with `pointer-events: none`,
- listens for `pointermove` only while active,
- uses `gsap.quickTo()` setters for free-follow movement,
- snaps to `hoveredTarget.centerX` / `hoveredTarget.centerY` when present,
- cleans up listeners and tweens on unmount,
- starts hidden until it has a valid position so the first frame does not jump from `(0,0)`.

Implementation sketch:

```js
const xTo = gsap.quickTo(node, "x", { duration: 0.28, ease: "power3.out" });
const yTo = gsap.quickTo(node, "y", { duration: 0.28, ease: "power3.out" });

if (hoveredTarget) {
  xTo(hoveredTarget.centerX);
  yTo(hoveredTarget.centerY);
  gsap.to(node, { scale: 1.06, duration: 0.16, yoyo: true, repeat: 1 });
} else {
  xTo(pointerX);
  yTo(pointerY);
}
```

Keep the implementation narrowly scoped:
- no 3D tilt,
- no effect-bus integration,
- no click handling inside the preview itself.

- [ ] **Step 4: Re-run the preview test**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/RobberPlacementPreview.test.js
```

Expected:
- PASS

- [ ] **Step 5: Commit the overlay component**

Run:

```bash
git add app/catana/RobberPlacementPreview.js \
  app/catana/__tests__/RobberPlacementPreview.test.js
git commit -m "feat: add robber placement preview overlay"
```

Again, stage only the task files if the worktree contains unrelated changes.

### Task 3: Wire `GameScreen`, `Board`, and `Tile` for minimal vs playful robber placement

**Files:**
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/Board.js`
- Modify: `app/catana/Tile.js`
- Create: `app/catana/__tests__/Board.robberPlacementUx.test.js`
- Create: `app/catana/__tests__/Tile.robberPlacementUx.test.js`

- [ ] **Step 1: Write the failing board/tile wiring tests**

Create `app/catana/__tests__/Board.robberPlacementUx.test.js`:

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const boardPath = path.resolve(__dirname, "..", "Board.js");

describe("Board robber placement UX", () => {
  it("renders the playful preview component", () => {
    const contents = fs.readFileSync(boardPath, "utf8");
    expect(contents).toContain("RobberPlacementPreview");
    expect(contents).toContain("robberPlacementMotionMode");
    expect(contents).toContain("hoveredRobberTarget");
  });

  it("forwards robber target hover metadata from tile action targets", () => {
    const contents = fs.readFileSync(boardPath, "utf8");
    expect(contents).toContain("setHoveredRobberTarget");
    expect(contents).toContain("getBoundingClientRect");
  });
});
```

Create `app/catana/__tests__/Tile.robberPlacementUx.test.js`:

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tilePath = path.resolve(__dirname, "..", "Tile.js");

describe("Tile robber placement UX", () => {
  it("keeps the clickable robber action target in place", () => {
    const contents = fs.readFileSync(tilePath, "utf8");
    expect(contents).toContain("moves.moveRobber(id)");
    expect(contents).toContain("canPlaceRobber");
  });

  it("lets Board decide whether the tile-local ghost is shown", () => {
    const contents = fs.readFileSync(tilePath, "utf8");
    expect(contents).toContain("showRobberHoverGhost");
    expect(contents).toContain("onRobberTargetHoverChange");
  });
});
```

- [ ] **Step 2: Run the new tests to confirm they fail**

Run:

```bash
pnpm exec vitest run \
  app/catana/__tests__/Board.robberPlacementUx.test.js \
  app/catana/__tests__/Tile.robberPlacementUx.test.js
```

Expected:
- FAIL because the wiring props and preview usage are not in place yet.

- [ ] **Step 3: Wire the motion mode through `GameScreen` and `Board`**

In `app/catana/GameScreen.js`:
- pass `robberPlacementMotionMode={robberPlacementMotionMode}` into `CatanBoard`.

In `app/catana/Board.js`:
- detect `prefersReducedMotion` with the same `window.matchMedia?.("(prefers-reduced-motion: reduce)")` pattern already used in `app/catana/components/GameLogPanel.js`,
- detect coarse-pointer environments with `window.matchMedia?.("(pointer: coarse)")`,
- accept the new prop,
- resolve the final mode with `resolveRobberPlacementMotionMode(...)`,
- track `hoveredRobberTarget` state,
- clear that state when robber placement ends,
- render `<RobberPlacementPreview />` only when the resolved mode is `playful` and the viewer is actively placing the robber.

Board-side state shape:

```js
const [hoveredRobberTarget, setHoveredRobberTarget] = useState(null);
// { tileId, centerX, centerY }
```

Example mode resolution:

```js
const resolvedRobberPlacementMotionMode = resolveRobberPlacementMotionMode({
  requestedMode: robberPlacementMotionMode,
  prefersReducedMotion,
  hasCoarsePointer
});
```

- [ ] **Step 4: Wire `Tile` hover metadata without changing the click contract**

Modify `app/catana/Tile.js` so the robber action target:
- still calls `moves.moveRobber(id)` on click,
- still shows the pulsing target circle,
- reports hover enter/leave through a callback passed from `Board`,
- shows the tile-local robber ghost only when `showRobberHoverGhost` is true.

Minimal shape:

```js
onMouseEnter={(event) => {
  setIsHovered(true);
  onRobberTargetHoverChange?.({
    tileId: id,
    element: event.currentTarget
  });
}}
onMouseLeave={() => {
  setIsHovered(false);
  onRobberTargetHoverChange?.(null);
}}
```

`Board` should convert `element.getBoundingClientRect()` into the stored target center.
If `getBoundingClientRect()` is unavailable or returns invalid numbers, `Board` should clear the hovered target and let the resolved mode behave like `minimal` for that frame instead of rendering a broken preview jump.

- [ ] **Step 5: Re-run the targeted wiring tests**

Run:

```bash
pnpm exec vitest run \
  app/catana/__tests__/robberPlacementMotion.test.js \
  app/catana/__tests__/RobberPlacementPreview.test.js \
  app/catana/__tests__/Board.robberPlacementUx.test.js \
  app/catana/__tests__/Tile.robberPlacementUx.test.js
```

Expected:
- PASS

- [ ] **Step 6: Commit the wiring**

Run:

```bash
git add app/catana/GameScreen.js \
  app/catana/Board.js \
  app/catana/Tile.js \
  app/catana/__tests__/Board.robberPlacementUx.test.js \
  app/catana/__tests__/Tile.robberPlacementUx.test.js
git commit -m "feat: add playful robber placement UX"
```

Stage only these files if there are unrelated local edits elsewhere.

### Task 4: Verify behavior end-to-end and record the new seam

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 1: Run the focused test suite**

Run:

```bash
pnpm exec vitest run \
  app/catana/__tests__/robberPlacementMotion.test.js \
  app/catana/__tests__/RobberPlacementPreview.test.js \
  app/catana/__tests__/Board.robberPlacementUx.test.js \
  app/catana/__tests__/Tile.robberPlacementUx.test.js \
  app/catana/__tests__/Moves.robber.test.js \
  app/catana/__tests__/Board.activePlayers.test.js \
  app/catana/__tests__/Board.layering.test.js
```

Expected:
- PASS
- no robber rules regressions,
- no board layering regressions from the new preview wiring.

- [ ] **Step 2: Run project verification**

Run:

```bash
pnpm verify
```

Expected:
- PASS

If `pnpm verify` fails for unrelated pre-existing worktree reasons, capture that clearly and do not claim a clean verification.

- [ ] **Step 3: Perform a manual browser check**

Run:

```bash
pnpm dev
```

Then manually verify in a local Catana match while the active player is in robber placement:
- the pulsing target circles still appear,
- the robber preview follows the pointer in `playful`,
- hovering a valid target makes the preview stick toward that center,
- clicking still places the robber through the existing target,
- reduced-motion or coarse-pointer fallback still leaves a usable minimal path.

- [ ] **Step 4: Update the agent docs**

Record the implementation in:
- `docs/agent/PROGRESS.md`
- `docs/agent/NOTES.md`

Include:
- the new `minimal` / `playful` seam,
- `playful` as the new desktop default,
- reduced-motion and coarse-pointer fallback behavior,
- the deliberate choice to leave settings UI for a future pass.

These files are already frequently edited in this repo, so merge with any existing local changes instead of overwriting them.

- [ ] **Step 5: Commit docs and verification notes**

Run:

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record robber placement UX defaults"
```

If those files contain unrelated local edits, stage only the new robber-placement notes.
