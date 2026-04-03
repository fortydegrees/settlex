# Passive Build Hover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add desktop-only hover-to-build affordances for roads, settlements, and city upgrades during normal `postRoll` turns, while leaving explicit dock build behavior unchanged.

**Architecture:** Keep legality and move authority in the existing `@settlex/game-core` helpers and `moves.*` calls. Add one small pure utility for passive-mode gating, then wire `Board`, `Edge`, and `ActionNode` so passive affordances exist only when no explicit build action is armed and only reveal visuals on hover.

**Tech Stack:** React, boardgame.io client moves, `@settlex/game-core`, Vitest, existing Catana board UI docs

---

## File Map

- `docs/superpowers/specs/2026-04-03-passive-build-hover-design.md`
  - approved spec for scope, guardrails, and UX boundaries
- `docs/agent/skills/catana-brand/SKILL.md`
  - reference before touching hover visuals so the board stays visually restrained
- `app/catana/utils/passiveBuildMode.js`
  - new pure helper that answers whether passive build hover is allowed for the current local player and turn state
- `app/catana/__tests__/passiveBuildMode.test.js`
  - unit tests for passive-mode gating rules
- `app/catana/Board.js`
  - derives passive road/settlement/city target sets and renders hover-only hit areas when passive mode is allowed
- `app/catana/Edge.js`
  - reuses the existing hoverable-edge branch for passive road preview/click without disturbing explicit road placement
- `app/catana/ActionNode.js`
  - adds a hover-only visual mode for passive settlement/city targets while keeping explicit action-circle behavior intact
- `app/catana/__tests__/Board.passiveBuildHover.test.js`
  - source-level regression checks for board wiring and passive-vs-explicit gating
- `app/catana/__tests__/ActionNode.passiveHover.test.js`
  - source-level regression checks for hover-only `ActionNode` rendering support
- `docs/agent/PROGRESS.md`
  - record the shipped passive build hover behavior
- `docs/agent/NOTES.md`
  - capture architecture notes about passive gating and city-hover suppression reuse

### Task 1: Add a pure passive-mode gate

**Files:**
- Reference: `docs/superpowers/specs/2026-04-03-passive-build-hover-design.md`
- Reference: `docs/agent/skills/catana-brand/SKILL.md`
- Create: `app/catana/utils/passiveBuildMode.js`
- Create: `app/catana/__tests__/passiveBuildMode.test.js`

- [ ] **Step 1: Write the failing utility test**

Create `app/catana/__tests__/passiveBuildMode.test.js` with:

```js
import { describe, expect, it } from "vitest";
import { isPassiveBuildEnabled } from "../utils/passiveBuildMode";

const baseCtx = {
  phase: "main",
  currentPlayer: "0",
  activePlayers: { "0": "postRoll" }
};

describe("isPassiveBuildEnabled", () => {
  it("enables passive hover only for the local postRoll player with no explicit action", () => {
    expect(
      isPassiveBuildEnabled({
        playerAction: null,
        playerID: "0",
        ctx: baseCtx,
        corePhase: "normal",
        devCardPlay: null
      })
    ).toBe(true);
  });

  it("disables passive hover when an explicit build action is armed", () => {
    expect(
      isPassiveBuildEnabled({
        playerAction: "placeSettlement",
        playerID: "0",
        ctx: baseCtx,
        corePhase: "normal",
        devCardPlay: null
      })
    ).toBe(false);
  });

  it("disables passive hover while road-building placement is armed", () => {
    expect(
      isPassiveBuildEnabled({
        playerAction: "roadBuilding",
        playerID: "0",
        ctx: baseCtx,
        corePhase: "normal",
        devCardPlay: null
      })
    ).toBe(false);
  });

  it("disables passive hover outside normal postRoll turns", () => {
    expect(
      isPassiveBuildEnabled({
        playerAction: null,
        playerID: "0",
        ctx: { phase: "placement", currentPlayer: "0", activePlayers: { "0": "settlement" } },
        corePhase: "placement",
        devCardPlay: null
      })
    ).toBe(false);

    expect(
      isPassiveBuildEnabled({
        playerAction: null,
        playerID: "0",
        ctx: { phase: "main", currentPlayer: "0", activePlayers: { "0": "moveRobber" } },
        corePhase: "normal",
        devCardPlay: null
      })
    ).toBe(false);
  });

  it("disables passive hover during road-building dev-card resolution", () => {
    expect(
      isPassiveBuildEnabled({
        playerAction: null,
        playerID: "0",
        ctx: baseCtx,
        corePhase: "normal",
        devCardPlay: { type: "roadBuilding", playerId: "0" }
      })
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the targeted test to confirm it fails**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/passiveBuildMode.test.js
```

Expected:
- FAIL because `app/catana/utils/passiveBuildMode.js` does not exist yet.

- [ ] **Step 3: Write the minimal passive-mode utility**

Create `app/catana/utils/passiveBuildMode.js`:

```js
const EXPLICIT_BUILD_ACTIONS = new Set([
  "placeRoad",
  "placeSettlement",
  "placeCity"
]);

export function isPassiveBuildEnabled({
  playerAction,
  playerID,
  ctx,
  corePhase,
  devCardPlay
}) {
  if (!playerID || !ctx) return false;
  if (EXPLICIT_BUILD_ACTIONS.has(playerAction)) return false;
  if (playerAction === "roadBuilding") return false;
  if (ctx.phase !== "main" || corePhase !== "normal") return false;
  if (String(ctx.currentPlayer) !== String(playerID)) return false;
  if (ctx.activePlayers?.[String(playerID)] !== "postRoll") return false;
  if (devCardPlay?.type === "roadBuilding" && devCardPlay.playerId === playerID) {
    return false;
  }
  return true;
}
```

Keep this helper pure. Do not move legality calculations into it yet; it is only the gate.

- [ ] **Step 4: Re-run the targeted utility test**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/passiveBuildMode.test.js
```

Expected:
- PASS

- [ ] **Step 5: Commit the passive-mode seam**

Run:

```bash
git add app/catana/utils/passiveBuildMode.js \
  app/catana/__tests__/passiveBuildMode.test.js
git commit -m "feat: add passive build mode guard"
```

### Task 2: Wire passive road hover using the existing hoverable edge path

**Files:**
- Reference: `docs/superpowers/specs/2026-04-03-passive-build-hover-design.md`
- Modify: `app/catana/Board.js`
- Modify: `app/catana/Edge.js`
- Create: `app/catana/__tests__/Board.passiveBuildHover.test.js`

- [ ] **Step 1: Write the failing board wiring test for passive roads**

Create `app/catana/__tests__/Board.passiveBuildHover.test.js` with:

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const boardPath = path.resolve(__dirname, "..", "Board.js");

describe("Board passive build hover wiring", () => {
  it("imports the passive build mode gate and derives passive road targets", () => {
    const source = fs.readFileSync(boardPath, "utf8");
    expect(source).toContain('from "./utils/passiveBuildMode"');
    expect(source).toContain("const passiveBuildEnabled =");
    expect(source).toContain("const passiveBuildableEdges = useMemo");
  });

  it("renders hoverable edges only when passive mode is enabled", () => {
    const source = fs.readFileSync(boardPath, "utf8");
    expect(source).toContain("passiveBuildEnabled &&");
    expect(source).toContain('key={`passive-road-${edgeId}`}');
    expect(source).toContain("hoverable");
  });
});
```

- [ ] **Step 2: Run the targeted road-wiring test to confirm it fails**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/Board.passiveBuildHover.test.js
```

Expected:
- FAIL because `Board.js` does not yet derive `passiveBuildEnabled` or render passive road edges.

- [ ] **Step 3: Re-read the current `Edge` hover path before editing**

Open `app/catana/Edge.js` and confirm the existing `hoverable` branch is the path to reuse. Do not add a second passive-road preview system if the current branch can be finished with small changes.

- [ ] **Step 4: Implement passive road gating in `Board.js`**

Modify `app/catana/Board.js` to:
- import `canBuildRoad` from `@settlex/game-core` instead of the current inline resource check
- import `isPassiveBuildEnabled` from `./utils/passiveBuildMode`
- derive `passiveBuildEnabled` from `playerAction`, `playerID`, `ctx`, `G.core?.phase`, and `G.devCardPlay`
- keep explicit road placement behavior unchanged
- derive `passiveBuildableEdges` only when passive mode is enabled
- render passive roads with `hoverable` instead of `placing`

Implementation sketch:

```js
const passiveBuildEnabled = isPassiveBuildEnabled({
  playerAction,
  playerID,
  ctx,
  corePhase: G.core?.phase,
  devCardPlay: G.devCardPlay
});

const passiveBuildableEdges = useMemo(() => {
  if (!passiveBuildEnabled || !playerID || !G.core || !G.coreTopology) return [];
  if (!canBuildRoad(G.core, playerID).ok) return [];
  return getBuildableEdges(playerID, G, ctx);
}, [passiveBuildEnabled, playerID, G, ctx]);
```

Render branch:

```jsx
if (!suppressBuildHighlights && passiveBuildEnabled) {
  passiveBuildableEdges.forEach((edgeId) => {
    actions.push(
      <Edge
        key={`passive-road-${edgeId}`}
        hoverable
        ...
      />
    );
  });
}
```

- [ ] **Step 5: Keep `Edge.js` narrowly focused**

Only adjust `app/catana/Edge.js` if needed to make the passive branch match the plan:
- `hoverable` should continue to call `moves.placeRoad(edgeId)`
- it should clear hover after click
- it should notify `onPlaceCommitted?.()` so suppression still works
- it should not reset `playerAction`, because passive mode only runs when `playerAction` is already `null`

- [ ] **Step 6: Re-run the targeted passive-road wiring test**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/Board.passiveBuildHover.test.js
```

Expected:
- PASS

- [ ] **Step 7: Commit passive road hover**

Run:

```bash
git add app/catana/Board.js \
  app/catana/Edge.js \
  app/catana/__tests__/Board.passiveBuildHover.test.js
git commit -m "feat: add passive road hover build"
```

### Task 3: Add passive settlement and city hover without changing explicit node mode

**Files:**
- Modify: `app/catana/Board.js`
- Modify: `app/catana/ActionNode.js`
- Create: `app/catana/__tests__/ActionNode.passiveHover.test.js`
- Modify: `app/catana/__tests__/Board.passiveBuildHover.test.js`

- [ ] **Step 1: Write the failing hover-only node test**

Create `app/catana/__tests__/ActionNode.passiveHover.test.js` with:

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const actionNodePath = path.resolve(__dirname, "..", "ActionNode.js");

describe("ActionNode passive hover mode", () => {
  it("supports hiding the idle action circle until hover", () => {
    const source = fs.readFileSync(actionNodePath, "utf8");
    expect(source).toContain("showIdleCircle");
    expect(source).toContain("showIdleCircle = true");
  });
});
```

Extend `app/catana/__tests__/Board.passiveBuildHover.test.js` with:

```js
it("derives passive settlement and city node targets when passive mode is enabled", () => {
  const source = fs.readFileSync(boardPath, "utf8");
  expect(source).toContain("const passiveSettlementNodes = useMemo");
  expect(source).toContain("const passiveCityNodes = useMemo");
  expect(source).toContain("showIdleCircle={false}");
});

it("reuses city-hover suppression for passive city upgrades", () => {
  const source = fs.readFileSync(boardPath, "utf8");
  expect(source).toContain("passiveCityNodeSet");
  expect(source).toContain("passiveCityNodeSet.has(hoveredNode)");
});
```

- [ ] **Step 2: Run the targeted passive-node tests to confirm they fail**

Run:

```bash
pnpm exec vitest run \
  app/catana/__tests__/ActionNode.passiveHover.test.js \
  app/catana/__tests__/Board.passiveBuildHover.test.js
```

Expected:
- FAIL because `ActionNode.js` does not yet expose a hover-only idle-circle prop and `Board.js` does not derive passive settlement/city target sets.

- [ ] **Step 3: Add hover-only `ActionNode` support**

Modify `app/catana/ActionNode.js` to accept a new prop:

```js
showIdleCircle = true
```

Use it so the hit area still exists, but the idle radial circle stays invisible until hover in passive mode. Keep these behaviors unchanged:
- explicit node placement still shows the current idle action circle
- hovered passive nodes still show the existing settlement/city preview
- `data-action-circle="true"` remains on the hit area so the existing capture logic still treats passive targets as board interaction

Implementation sketch:

```js
const showCircleVisual = showIdleCircle || isHovered;
const circleOpacity = showCircleVisual
  ? hoveredNode ? (isHovered ? 1 : 0.4) : 0.8
  : 0;
```

- [ ] **Step 4: Add passive settlement and city node derivation in `Board.js`**

Modify `app/catana/Board.js` so passive mode derives:
- `passiveSettlementNodes` from `canBuildSettlement(...)` plus `buildableNodes(...)`
- `passiveCityNodes` from `canBuildCity(...)` plus the current player’s owned settlement ids
- `passiveCityNodeSet` as a `Set` for hover-suppression checks

Use those sets only when `passiveBuildEnabled` is true, and import `canBuildSettlement` / `canBuildCity` from `@settlex/game-core` rather than duplicating affordability logic in `Board.js`.

- [ ] **Step 5: Render passive settlement and city targets with hover-only visuals**

Add a passive-node rendering branch in `Board.js` that runs only when:
- `!suppressBuildHighlights`
- `passiveBuildEnabled`
- `playerAction == null`

Render `ActionNode` entries for passive settlements and passive cities with:

```jsx
showIdleCircle={false}
```

For clicks:

```js
handleBuildCommit();
moves.placeSettlement(nodeId);
setHoveredNode(null);
setHoveredTiles([]);
```

and

```js
handleBuildCommit();
setLocalPendingCityNodeId(nodeId);
moves.placeCity(nodeId);
setHoveredNode(null);
setHoveredTiles([]);
```

Do not call `setPlayerAction(null)` in this passive branch.

- [ ] **Step 6: Reuse city-hover suppression for passive upgrades**

Update the building render suppression in `Board.js` so the underlying settlement hides when either:
- explicit city mode is hovering the node, or
- passive city mode is hovering a node in `passiveCityNodeSet`

This should preserve the existing no-double-ghosting behavior during hover and placement animation.

- [ ] **Step 7: Re-run the passive-node tests**

Run:

```bash
pnpm exec vitest run \
  app/catana/__tests__/ActionNode.passiveHover.test.js \
  app/catana/__tests__/Board.passiveBuildHover.test.js
```

Expected:
- PASS

- [ ] **Step 8: Commit passive settlement and city hover**

Run:

```bash
git add app/catana/Board.js \
  app/catana/ActionNode.js \
  app/catana/__tests__/ActionNode.passiveHover.test.js \
  app/catana/__tests__/Board.passiveBuildHover.test.js
git commit -m "feat: add passive settlement and city hover builds"
```

### Task 4: Close regressions, update docs, and verify the whole feature

**Files:**
- Modify: `app/catana/__tests__/Board.passiveBuildHover.test.js`
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 1: Add the explicit-vs-passive regression checks**

Extend `app/catana/__tests__/Board.passiveBuildHover.test.js` with assertions that the board source still contains the current explicit-mode branches:

```js
it("keeps explicit dock build rendering as the higher-priority branch", () => {
  const source = fs.readFileSync(boardPath, "utf8");
  expect(source).toContain('playerAction === "placeSettlement" || playerAction === "placeCity"');
  expect(source).toContain('playerAction === "placeRoad" || playerAction === "roadBuilding"');
});
```

This is a guard against accidentally replacing dock behavior instead of layering passive hover on top.

- [ ] **Step 2: Run all passive-hover targeted tests**

Run:

```bash
pnpm exec vitest run \
  app/catana/__tests__/passiveBuildMode.test.js \
  app/catana/__tests__/Board.passiveBuildHover.test.js \
  app/catana/__tests__/ActionNode.passiveHover.test.js \
  app/catana/__tests__/Board.buildActionSuppression.test.js \
  app/catana/__tests__/ActionNode.test.js \
  app/catana/__tests__/cancelBuildAction.test.js \
  app/catana/__tests__/GameScreen.cancelBuildAction.test.js
```

Expected:
- PASS

- [ ] **Step 3: Update agent docs**

Add short entries to:
- `docs/agent/PROGRESS.md`
- `docs/agent/NOTES.md`

Capture:
- passive hover-to-build is desktop-only and gated to `postRoll`
- dock mode still overrides passive mode
- passive city hover reuses settlement-hiding suppression

- [ ] **Step 4: Run full repo verification**

Run:

```bash
pnpm verify
```

Expected:
- PASS
- Existing lint warnings may still print, but there should be no new test or build failures.

- [ ] **Step 5: Commit the finished feature**

Run:

```bash
git add app/catana/utils/passiveBuildMode.js \
  app/catana/Board.js \
  app/catana/Edge.js \
  app/catana/ActionNode.js \
  app/catana/__tests__/passiveBuildMode.test.js \
  app/catana/__tests__/Board.passiveBuildHover.test.js \
  app/catana/__tests__/ActionNode.passiveHover.test.js \
  docs/agent/PROGRESS.md \
  docs/agent/NOTES.md
git commit -m "feat: add passive build hover interactions"
```

Before running `git add`, double-check `git status --short` and stage only the files listed above.
