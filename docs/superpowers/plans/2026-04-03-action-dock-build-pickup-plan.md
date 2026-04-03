# Action Dock Build Pickup Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Catana action dock’s magnify and looping bounce behaviors with a stable explicit-build pickup flow where `road`, `settlement`, and `city` launch from the clicked dock button into a live cursor-following placement preview.

**Architecture:** Keep `playerAction` as the existing explicit-build mode signal, and add one client-side `buildPickup` state object in `GameScreen` that stores the selected piece type plus the clicked dock button’s geometry. Clean up the dock components so build buttons only do a slight hover raise and a small press, then hand the piece off to a new `BuildPlacementPreview` component in `Board` that reuses the robber preview’s spring-follow, magnetic target locking, and reduced-motion fallback patterns against registered legal edge/node targets.

**Tech Stack:** Next.js, React, GSAP, existing Catana theme assets, boardgame.io client state, Vitest source tests

---

## File Structure

### Explicit build state + dock wiring

- Modify: `app/catana/utils/playerAction.js`
  - Export the explicit-build piece mapping so the dock, board, and reset paths all agree on which `playerAction` values create a pickup follower.
- Modify: `app/catana/GameScreen.js`
  - Own `buildPickup` state, centralize clear/reset helpers, thread pickup props into the dock and board, and make cancel/reset clear both `playerAction` and `buildPickup`.
- Modify: `app/catana/components/PlayerActionContainer.js`
  - Start explicit build pickup from the clicked build button, keep the selected build button subtly active while a piece is in hand, and leave trade/dev behavior unchanged for now.
- Modify: `app/catana/components/ActionsDock/Dock.js`
  - Remove the shared dock zoom/magnify behavior and keep only the plain dock shell layout.
- Modify: `app/catana/components/ActionsDock/DockCard.js`
  - Remove the legacy looping bounce, keep only slight hover/press feedback, and forward the clicked button rect to the action handler.

### Build pickup preview + board targeting

- Create: `app/catana/BuildPlacementPreview.js`
  - Render the road/settlement/city piece that launches from the dock button, transitions to the pointer, and then follows the cursor with target locking.
- Create: `app/catana/utils/buildPlacementPreviewMotion.js`
  - Hold the geometry and spring helpers specific to build pickup launch, cursor follow, and magnetic target selection.
- Modify: `app/catana/Board.js`
  - Register legal explicit-build targets, derive magnetic target lists for road/settlement/city, render `BuildPlacementPreview`, and clear pickup state on successful placement.
- Modify: `app/catana/Edge.js`
  - Pass build-preview target registration through the explicit road placement edge hit areas without affecting passive hover or placed-road rendering.
- Modify: `app/catana/ActionNode.js`
  - Allow legal node/edge action circles to register/unregister their DOM element so the new preview can snap to them.

### Tests

- Create: `app/catana/__tests__/Dock.buildPickupUx.test.js`
  - Source-level guard that dock magnify and looping bounce are removed and launch-origin pickup wiring exists.
- Modify: `app/catana/__tests__/playerAction.test.js`
  - Guard the explicit-build action to piece-type mapping.
- Modify: `app/catana/__tests__/GameScreen.cancelBuildAction.test.js`
  - Guard click-cancel and `Escape` cancel wiring for the new pickup state.
- Create: `app/catana/__tests__/BuildPlacementPreview.springMotion.test.js`
  - Source-level guard for launch origin, spring follow, magnetic targets, and reduced-motion handoff.
- Create: `app/catana/__tests__/Board.buildPickupPreview.test.js`
  - Source-level guard that `Board` renders the new preview only for explicit build pickup and wires target registration plus commit clearing.
- Modify: `app/catana/__tests__/ActionNode.test.js`
  - Guard the new target-registration hook on action circles.

### Docs

- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

## Assumptions To Keep During Implementation

- `trade`, `devCard`, and dedicated `roadBuilding` polish stay out of scope for this slice.
- Explicit build pickup is only for `placeRoad`, `placeSettlement`, and `placeCity`; placement-stage road/settlement UX stays as-is.
- Passive build hover remains unchanged and still has lower priority than explicit dock build mode.
- Cancel must stay visually quiet: no return-flight animation, no text labels, no extra badges.
- Reduced-motion or coarse-pointer environments should skip the theatrical launch and hand off almost immediately to the live follower.

### Task 1: Lock the explicit build pickup mapping

**Files:**
- Modify: `app/catana/utils/playerAction.js`
- Modify: `app/catana/__tests__/playerAction.test.js`

- [ ] **Step 1: Extend the player-action tests with explicit build pickup expectations**

Add failing expectations in `app/catana/__tests__/playerAction.test.js` for:

```js
expect(getBuildPickupPieceType("placeRoad")).toBe("road");
expect(getBuildPickupPieceType("placeSettlement")).toBe("settlement");
expect(getBuildPickupPieceType("placeCity")).toBe("city");
expect(getBuildPickupPieceType("moveRobber")).toBe(null);
expect(getBuildPickupPieceType(null)).toBe(null);
```

- [ ] **Step 2: Run the player-action test to verify it fails**

Run: `pnpm exec vitest run app/catana/__tests__/playerAction.test.js`

Expected:
- FAIL because `getBuildPickupPieceType` does not exist yet.

- [ ] **Step 3: Implement the explicit build pickup helper**

Update `app/catana/utils/playerAction.js` to export a shared mapping helper:

```js
const BUILD_PICKUP_PIECE_BY_ACTION = {
  placeRoad: "road",
  placeSettlement: "settlement",
  placeCity: "city"
};

export function getBuildPickupPieceType(playerAction) {
  return BUILD_PICKUP_PIECE_BY_ACTION[playerAction] ?? null;
}
```

Keep `shouldResetPlayerAction(...)` behavior unchanged.

- [ ] **Step 4: Re-run the player-action test**

Run: `pnpm exec vitest run app/catana/__tests__/playerAction.test.js`

Expected:
- PASS with the new explicit-build mapping covered.

- [ ] **Step 5: Commit the shared mapping helper**

```bash
git add app/catana/utils/playerAction.js app/catana/__tests__/playerAction.test.js
git commit -m "test: lock explicit build pickup action mapping"
```

### Task 2: Add build pickup state and cancel/reset wiring in `GameScreen`

**Files:**
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/__tests__/GameScreen.cancelBuildAction.test.js`

- [ ] **Step 6: Extend the `GameScreen` source test for pickup-state clearing**

Add failing expectations in `app/catana/__tests__/GameScreen.cancelBuildAction.test.js` that `GameScreen.js` now contains:

```js
const [buildPickup, setBuildPickup] = useState(null);
setBuildPickup(null);
event.code === "Escape";
```

Keep the existing `onClickCapture` / `shouldCancelBuildAction` assertions.

- [ ] **Step 7: Run the `GameScreen` cancel test to verify it fails**

Run: `pnpm exec vitest run app/catana/__tests__/GameScreen.cancelBuildAction.test.js`

Expected:
- FAIL because `buildPickup` state and `Escape`-cancel wiring do not exist yet.

- [ ] **Step 8: Implement `buildPickup` ownership and clear helpers in `GameScreen`**

Add a local state object shaped like:

```js
const [buildPickup, setBuildPickup] = useState(null);
// { pieceType: "road" | "settlement" | "city", originRect, startedAtMs }
```

Implementation rules:
- add one `clearBuildPickup()` helper that calls `setBuildPickup(null)`,
- call it everywhere explicit build mode is cleared: game over, `shouldResetPlayerAction(...)`, end turn, screen-click cancel, and `Escape`,
- keep `shouldCancelBuildAction(...)` as the click-cancel gate,
- pass `buildPickup` / `setBuildPickup` into `PlayerActionContainer` and `CatanBoard`.

- [ ] **Step 9: Re-run the `GameScreen` cancel test**

Run: `pnpm exec vitest run app/catana/__tests__/GameScreen.cancelBuildAction.test.js`

Expected:
- PASS with click-cancel and `Escape`-cancel source wiring covered.

- [ ] **Step 10: Commit the `GameScreen` pickup-state wiring**

```bash
git add app/catana/GameScreen.js app/catana/__tests__/GameScreen.cancelBuildAction.test.js
git commit -m "feat: add explicit build pickup state wiring"
```

### Task 3: Clean up the dock interaction and capture the launch origin

**Files:**
- Modify: `app/catana/components/ActionsDock/Dock.js`
- Modify: `app/catana/components/ActionsDock/DockCard.js`
- Modify: `app/catana/components/PlayerActionContainer.js`
- Create: `app/catana/__tests__/Dock.buildPickupUx.test.js`

- [ ] **Step 11: Write the failing dock cleanup source test**

Create `app/catana/__tests__/Dock.buildPickupUx.test.js` with expectations that:
- `Dock.js` no longer contains `DOCK_ZOOM_LIMIT` or `clamp`,
- `DockCard.js` no longer contains `loop:` or the `Math.cos`-based size magnify,
- `PlayerActionContainer.js` contains a build-pickup starter that calls into `setBuildPickup(...)`,
- the selected explicit build button is derived from the in-hand piece type rather than text labels.

Useful assertions:

```js
expect(dockSource).not.toContain("DOCK_ZOOM_LIMIT");
expect(cardSource).not.toContain("loop:");
expect(cardSource).not.toContain("Math.cos");
expect(containerSource).toContain("setBuildPickup");
expect(containerSource).toContain("getBuildPickupPieceType");
```

- [ ] **Step 12: Run the dock cleanup test to verify it fails**

Run: `pnpm exec vitest run app/catana/__tests__/Dock.buildPickupUx.test.js`

Expected:
- FAIL because the dock still magnifies and the build buttons do not start pickup state yet.

- [ ] **Step 13: Implement the dock cleanup and origin capture**

Update the dock files with these rules:

```js
// DockCard click contract
action.action?.({
  triggerRect: cardRef.current?.getBoundingClientRect?.() ?? null
});
```

Implementation rules:
- `Dock.js`: keep only the structural wrapper and remove shared zoom context/state,
- `DockCard.js`: replace magnify + looping bounce with a slight hover raise and a short press/release,
- `PlayerActionContainer.js`: on `road` / `settlement` / `city`, set `playerAction` and `buildPickup` together using the clicked button rect,
- keep trade/dev buttons on their existing behavior,
- keep the selected build button quietly active while `buildPickup?.pieceType` matches it.

- [ ] **Step 14: Re-run the dock cleanup test**

Run: `pnpm exec vitest run app/catana/__tests__/Dock.buildPickupUx.test.js`

Expected:
- PASS with no dock magnify, no looping bounce, and build-button origin capture covered.

- [ ] **Step 15: Commit the dock cleanup**

```bash
git add app/catana/components/ActionsDock/Dock.js app/catana/components/ActionsDock/DockCard.js app/catana/components/PlayerActionContainer.js app/catana/__tests__/Dock.buildPickupUx.test.js
git commit -m "feat: simplify dock build interactions"
```

### Task 4: Build the launch-to-cursor preview component

**Files:**
- Create: `app/catana/BuildPlacementPreview.js`
- Create: `app/catana/utils/buildPlacementPreviewMotion.js`
- Create: `app/catana/__tests__/BuildPlacementPreview.springMotion.test.js`

- [ ] **Step 16: Write the failing preview source test**

Create `app/catana/__tests__/BuildPlacementPreview.springMotion.test.js` with expectations that the new preview code includes:
- `originRect`,
- `magneticTargets`,
- `requestAnimationFrame`,
- `gsap`,
- reduced-motion / coarse-pointer fast handoff logic,
- separate handling for `road`, `settlement`, and `city`.

Example assertions:

```js
expect(contents).toContain("originRect");
expect(contents).toContain("magneticTargets");
expect(contents).toContain("requestAnimationFrame");
expect(contents).toContain("prefersReducedMotion");
expect(contents).toContain('pieceType === "road"');
```

- [ ] **Step 17: Run the preview source test to verify it fails**

Run: `pnpm exec vitest run app/catana/__tests__/BuildPlacementPreview.springMotion.test.js`

Expected:
- FAIL because the build pickup preview files do not exist yet.

- [ ] **Step 18: Implement `BuildPlacementPreview` and its motion helpers**

Use the robber preview as the reference shape, but keep this component specific to build pieces:

```js
<BuildPlacementPreview
  active={Boolean(buildPickup)}
  pieceType={buildPickup?.pieceType}
  originRect={buildPickup?.originRect}
  magneticTargets={magneticBuildTargets}
  boardViewportScale={boardViewportScale}
  themeId={themeId}
  pieceColor={currentPlayerView?.color ?? "red"}
  prefersReducedMotion={prefersReducedMotion}
  hasCoarsePointer={hasCoarsePointer}
/>
```

Implementation rules:
- launch from the clicked dock button rect,
- reach the cursor quickly (`~120-160ms`) and then stay as the live follower,
- reuse the spring/magnetic feel from robber placement,
- keep reduced-motion/coarse-pointer mode almost immediate,
- render the real themed piece asset for the selected build type and player color.

- [ ] **Step 19: Re-run the preview source test**

Run: `pnpm exec vitest run app/catana/__tests__/BuildPlacementPreview.springMotion.test.js`

Expected:
- PASS with the new preview component and motion helper covered.

- [ ] **Step 20: Commit the preview component**

```bash
git add app/catana/BuildPlacementPreview.js app/catana/utils/buildPlacementPreviewMotion.js app/catana/__tests__/BuildPlacementPreview.springMotion.test.js
git commit -m "feat: add build pickup preview motion"
```

### Task 5: Integrate build target registration and commit clearing in `Board`

**Files:**
- Modify: `app/catana/Board.js`
- Modify: `app/catana/Edge.js`
- Modify: `app/catana/ActionNode.js`
- Create: `app/catana/__tests__/Board.buildPickupPreview.test.js`
- Modify: `app/catana/__tests__/ActionNode.test.js`

- [ ] **Step 21: Write the failing board/target-registration source tests**

Create `app/catana/__tests__/Board.buildPickupPreview.test.js` and extend `app/catana/__tests__/ActionNode.test.js` to assert:
- `Board.js` imports `BuildPlacementPreview`,
- `Board.js` tracks registered build target elements and derives `magneticBuildTargets`,
- `Board.js` clears `setBuildPickup(null)` on explicit build commit,
- `ActionNode.js` exposes a registration hook or ref effect for action-circle elements.

Useful assertions:

```js
expect(boardSource).toContain("BuildPlacementPreview");
expect(boardSource).toContain("magneticBuildTargets");
expect(boardSource).toContain("setBuildPickup(null)");
expect(actionNodeSource).toContain("registerBuildTarget");
```

- [ ] **Step 22: Run the board source tests to verify they fail**

Run: `pnpm exec vitest run app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/ActionNode.test.js`

Expected:
- FAIL because the board does not register explicit build targets or render the build pickup preview yet.

- [ ] **Step 23: Implement board target registration and preview rendering**

Implementation rules:
- `ActionNode.js`: register/unregister the hit-area DOM node with an optional callback,
- `Edge.js`: pass that registration hook through explicit road placement hit areas only,
- `Board.js`: keep a map of legal explicit-build target elements keyed by node/edge id, derive `magneticBuildTargets`, and render `BuildPlacementPreview` only when:
  - `buildPickup` exists,
  - `playerAction` maps to the same build piece,
  - the player is in the explicit main-phase build flow,
- on explicit road/settlement/city commit, clear `buildPickup` immediately alongside the existing `setPlayerAction(null)`,
- do not change passive hover or placement-stage branches.

- [ ] **Step 24: Re-run the board source tests**

Run: `pnpm exec vitest run app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/ActionNode.test.js`

Expected:
- PASS with preview rendering, target registration, and commit clearing covered.

- [ ] **Step 25: Commit the board integration**

```bash
git add app/catana/Board.js app/catana/Edge.js app/catana/ActionNode.js app/catana/__tests__/Board.buildPickupPreview.test.js app/catana/__tests__/ActionNode.test.js
git commit -m "feat: wire board build pickup preview"
```

### Task 6: Run focused verification and record the change

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 26: Run the focused Catana test slice**

Run:

```bash
pnpm exec vitest run \
  app/catana/__tests__/playerAction.test.js \
  app/catana/__tests__/GameScreen.cancelBuildAction.test.js \
  app/catana/__tests__/Dock.buildPickupUx.test.js \
  app/catana/__tests__/BuildPlacementPreview.springMotion.test.js \
  app/catana/__tests__/Board.buildPickupPreview.test.js \
  app/catana/__tests__/ActionNode.test.js \
  app/catana/__tests__/Board.robberPlacementUx.test.js
```

Expected:
- PASS with no regressions in the robber-preview source coverage.

- [ ] **Step 27: Run a manual Catana browser verification**

Run:

```bash
pnpm dev
pnpm serve
```

Manual checks:
- click `road`, `settlement`, and `city` from the actual dock and confirm the piece launches from the button,
- confirm the in-hand piece follows the cursor and magnetically locks to legal targets,
- confirm the selected dock button stays subtly active while the piece is in hand,
- confirm click-away cancel and `Escape` clear the piece immediately,
- confirm reduced-motion or coarse-pointer fallback hands off almost immediately.

- [ ] **Step 28: Update the agent notes**

Record the implementation outcome and verification notes in:
- `docs/agent/PROGRESS.md`
- `docs/agent/NOTES.md`

- [ ] **Step 29: Re-run the focused test slice after the docs update**

Run the same Vitest command from Step 26.

Expected:
- PASS again, confirming the final tree still matches the verified state.

- [ ] **Step 30: Commit the verified feature and docs**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record action dock build pickup cleanup"
```
