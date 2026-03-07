# Generated Island Underlay Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current hand-made Catana island-base SVG with one checked-in underlay generated from the actual standard land-tile footprint, without changing `game-core`.

**Architecture:** Keep the change entirely in `app/catana`. Add a small pure geometry helper plus a one-off generator script that writes a static SVG asset for the standard board. At runtime, render only the checked-in asset with deterministic placement derived from existing board `size` and `center`.

**Tech Stack:** React, existing Catana board math (`tilePixelVector` / `SQRT3`), Node script, SVG, Vitest, Playwright/manual browser QA.

---

### Task 1: Add failing tests for generated underlay geometry and runtime asset wiring

**Files:**
- Create: `app/catana/__tests__/utils/boardUnderlayGeometry.test.js`
- Create: `app/catana/__tests__/utils/boardUnderlayLayout.test.js`
- Modify: `app/catana/__tests__/themeAssets.test.js`
- Modify: `app/catana/__tests__/Board.layering.test.js`

**Step 1: Write the failing geometry test**

```js
import {
  buildHexBoundaryEdges,
  orderBoundaryLoop,
  STANDARD_BOARD_LAND_COORDS,
} from "../../utils/boardUnderlayGeometry";

it("builds one ordered perimeter loop for the standard board", () => {
  const edges = buildHexBoundaryEdges(STANDARD_BOARD_LAND_COORDS);
  expect(edges).toHaveLength(18);

  const loop = orderBoundaryLoop(edges);
  expect(loop.closed).toBe(true);
  expect(loop.points).toHaveLength(18);
});
```

**Step 2: Write the failing layout test**

```js
import { getBoardUnderlayFrame } from "../../utils/boardUnderlayLayout";

it("scales the checked-in underlay from canonical asset bounds", () => {
  expect(
    getBoardUnderlayFrame({
      center: [500, 400],
      size: 100,
      viewBox: [-420, -395, 840, 790],
      designSize: 100,
    })
  ).toEqual({
    left: 80,
    top: 5,
    width: 840,
    height: 790,
  });
});
```

**Step 3: Update the asset-path and layering tests to the new runtime API**

```js
expect(getBoardUnderlayPath("classic")).toBe("/svgs/board_underlay_standard.svg");
expect(screen.getByTestId("board-underlay")).toBeInTheDocument();
```

**Step 4: Run tests to verify they fail**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/utils/boardUnderlayGeometry.test.js app/catana/__tests__/utils/boardUnderlayLayout.test.js app/catana/__tests__/themeAssets.test.js app/catana/__tests__/Board.layering.test.js
```

Expected: FAIL because the geometry/layout helpers and new underlay asset resolver do not exist yet.

**Step 5: Commit**

```bash
git add app/catana/__tests__/utils/boardUnderlayGeometry.test.js app/catana/__tests__/utils/boardUnderlayLayout.test.js app/catana/__tests__/themeAssets.test.js app/catana/__tests__/Board.layering.test.js
git commit -m "test: cover generated board underlay geometry and wiring"
```

### Task 2: Implement the pure board-underlay geometry and layout helpers

**Files:**
- Create: `app/catana/utils/boardUnderlayGeometry.js`
- Create: `app/catana/utils/boardUnderlayLayout.js`

**Step 1: Implement the boundary-edge helper**

```js
export const STANDARD_BOARD_LAND_COORDS = generateHexagonCoords(2);

export function buildHexBoundaryEdges(coords) {
  const edgeCounts = new Map();
  for (const coord of coords) {
    for (const edge of getHexEdges(coord)) {
      const key = canonicalEdgeKey(edge);
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
    }
  }
  return Array.from(edgeCounts.entries())
    .filter(([, count]) => count === 1)
    .map(([key]) => parseEdgeKey(key));
}
```

**Step 2: Implement perimeter ordering**

```js
export function orderBoundaryLoop(edges) {
  const byPoint = buildPointAdjacency(edges);
  const points = walkLoop(byPoint);
  return { closed: points.length > 2, points };
}
```

**Step 3: Implement frame/layout math from asset bounds**

```js
export function getBoardUnderlayFrame({ center, size, viewBox, designSize = 100 }) {
  const [minX, minY, vbWidth, vbHeight] = viewBox;
  const scale = size / designSize;
  return {
    left: Math.round(center[0] + minX * scale),
    top: Math.round(center[1] + minY * scale),
    width: Math.round(vbWidth * scale),
    height: Math.round(vbHeight * scale),
  };
}
```

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/utils/boardUnderlayGeometry.test.js app/catana/__tests__/utils/boardUnderlayLayout.test.js
```

Expected: PASS.

**Step 5: Commit**

```bash
git add app/catana/utils/boardUnderlayGeometry.js app/catana/utils/boardUnderlayLayout.js app/catana/__tests__/utils/boardUnderlayGeometry.test.js app/catana/__tests__/utils/boardUnderlayLayout.test.js
git commit -m "feat: add board underlay geometry helpers"
```

### Task 3: Add a reproducible SVG generator and check in the generated standard-board asset

**Files:**
- Create: `scripts/generate-board-underlay.mjs`
- Create: `public/svgs/board_underlay_standard.svg`

**Step 1: Implement the generator script**

```js
import { STANDARD_BOARD_LAND_COORDS, buildHexBoundaryEdges, orderBoundaryLoop } from "../app/catana/utils/boardUnderlayGeometry.js";

const DESIGN_SIZE = 100;
const loop = orderBoundaryLoop(buildHexBoundaryEdges(STANDARD_BOARD_LAND_COORDS));
const layers = buildLayeredPaths(loop, {
  outerBlue: 26,
  paleSurf: 18,
  sand: 10,
  innerTintInset: 14,
});

writeFileSync("public/svgs/board_underlay_standard.svg", buildSvg(layers));
```

**Step 2: Run the generator**

Run:

```bash
node scripts/generate-board-underlay.mjs
```

Expected: `public/svgs/board_underlay_standard.svg` is written or updated with one multi-layer SVG.

**Step 3: Spot-check the generated SVG**

- Confirm the `viewBox` matches the bounds used by `getBoardUnderlayFrame`.
- Confirm the SVG contains exactly the four visual layers agreed in design.

**Step 4: Commit**

```bash
git add scripts/generate-board-underlay.mjs public/svgs/board_underlay_standard.svg
git commit -m "feat: generate standard board underlay svg"
```

### Task 4: Replace the old island-base runtime plumbing with the new single underlay asset

**Files:**
- Create: `app/catana/BoardUnderlay.js`
- Modify: `app/catana/Board.js`
- Modify: `app/catana/theme/themes.js`
- Modify: `app/catana/__tests__/themeAssets.test.js`
- Modify: `app/catana/__tests__/Board.layering.test.js`
- Delete: `app/catana/BoardIslandBase.js`
- Delete: `app/catana/utils/islandBaseLayout.js`
- Delete: `app/catana/__tests__/BoardIslandBase.test.js`
- Delete: `app/catana/__tests__/utils/islandBaseLayout.test.js`
- Delete: `public/svgs/board_island_base_tight.svg`
- Delete: `public/svgs/board_island_base_medium.svg`
- Delete: `public/svgs/board_island_base_broad.svg`

**Step 1: Add the new single-asset theme helper**

```js
export function getBoardUnderlayPath(themeId) {
  return getThemedSvgPath(themeId, "board_underlay_standard.svg");
}
```

**Step 2: Implement the runtime underlay component**

```js
export function BoardUnderlay({ center, size, themeId }) {
  const frame = getBoardUnderlayFrame({
    center,
    size,
    viewBox: BOARD_UNDERLAY_VIEWBOX,
    designSize: 100,
  });

  return (
    <img
      data-testid="board-underlay"
      aria-hidden="true"
      src={getBoardUnderlayPath(themeId)}
      style={{ ...frame, position: "absolute", pointerEvents: "none" }}
    />
  );
}
```

**Step 3: Mount it before `{tiles}` in the board**

```js
<BoardUnderlay center={center} size={size} themeId={themeId} />
{tiles}
```

**Step 4: Run the focused tests**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/Board.layering.test.js
```

Expected: PASS.

**Step 5: Commit**

```bash
git add app/catana/BoardUnderlay.js app/catana/Board.js app/catana/theme/themes.js app/catana/__tests__/themeAssets.test.js app/catana/__tests__/Board.layering.test.js
git add -u app/catana/BoardIslandBase.js app/catana/utils/islandBaseLayout.js app/catana/__tests__/BoardIslandBase.test.js app/catana/__tests__/utils/islandBaseLayout.test.js public/svgs/board_island_base_tight.svg public/svgs/board_island_base_medium.svg public/svgs/board_island_base_broad.svg
git commit -m "feat: swap catana to generated board underlay"
```

### Task 5: Verify the live board composition and adjust only if the checked-in asset is mis-scaled

**Files:**
- Modify if needed: `scripts/generate-board-underlay.mjs`
- Modify if needed: `public/svgs/board_underlay_standard.svg`
- Modify if needed: `app/catana/utils/boardUnderlayLayout.js`

**Step 1: Run the app and inspect the live board**

Run:

```bash
pnpm dev
```

Use Playwright or a browser to verify:
- the underlay is clearly visible beyond the outer ring,
- it remains board-shaped rather than circular,
- tiles still dominate visually,
- ports, roads, settlements, cities, robber, and highlights all render above it,
- the underlay never intercepts pointer events.

**Step 2: Only if needed, make a small follow-up adjustment**

Allowed adjustment scope:
- generator layer offsets,
- corner smoothing strength,
- canonical `viewBox`,
- underlay frame math.

Not allowed in this task:
- new art direction,
- engine changes,
- edge-by-edge coast rendering.

**Step 3: Re-run the focused verification**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/utils/boardUnderlayGeometry.test.js app/catana/__tests__/utils/boardUnderlayLayout.test.js app/catana/__tests__/themeAssets.test.js app/catana/__tests__/Board.layering.test.js
```

Expected: PASS.

**Step 4: Commit**

```bash
git add scripts/generate-board-underlay.mjs public/svgs/board_underlay_standard.svg app/catana/utils/boardUnderlayLayout.js
git commit -m "fix: tune generated board underlay scale"
```

### Task 6: Update agent notes and run final verification

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Add brief entries**

- PROGRESS: record that the hand-made island variants were replaced by one generated checked-in underlay derived from standard board geometry.
- NOTES: document the generator script path, the single asset path, and the fact that launch uses a static generated asset rather than runtime geometry.

**Step 2: Run final verification**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/utils/boardUnderlayGeometry.test.js app/catana/__tests__/utils/boardUnderlayLayout.test.js app/catana/__tests__/themeAssets.test.js app/catana/__tests__/Board.layering.test.js
pnpm lint
```

Expected:
- targeted Vitest suite passes,
- `pnpm lint` shows no new failures beyond any known baseline warnings.

**Step 3: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record generated board underlay"
```
