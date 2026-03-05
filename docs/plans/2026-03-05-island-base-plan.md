# Island Base Board Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a flat SVG island underlay behind the Catana land tiles so the board reads as a single island without changing board geometry or interaction behavior.

**Architecture:** The island ships as one shared SVG asset resolved through the existing theme helper layer. `Board.js` renders a dedicated `BoardIslandBase` component before tiles, while a small pure helper converts the current board `size` and `center` into an absolute frame for that image. The feature stays presentation-only: no game-state changes, no topology changes, and no new interactive surface.

**Tech Stack:** React, Next.js client components, SVG assets, Vitest, existing Catana theme helpers.

---

### Task 1: Add island asset routing in the theme layer (TDD)

**Files:**
- Create: `public/svgs/board_island_base.svg`
- Modify: `app/catana/theme/themes.js`
- Test: `app/catana/__tests__/themeAssets.test.js`

**Step 1: Write the failing test**

Add a new test case in `app/catana/__tests__/themeAssets.test.js`:

```js
import { getBoardIslandBasePath } from "../theme/themes";

it("resolves the shared island base asset for all current themes", () => {
  expect(getBoardIslandBasePath("classic")).toBe("/svgs/board_island_base.svg");
  expect(getBoardIslandBasePath("palette-b")).toBe("/svgs/board_island_base.svg");
  expect(getBoardIslandBasePath("emoji")).toBe("/svgs/board_island_base.svg");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js`
Expected: FAIL because `getBoardIslandBasePath` does not exist yet.

**Step 3: Write minimal implementation**

In `app/catana/theme/themes.js` add:

```js
const BOARD_ISLAND_BASE_FILE = "board_island_base.svg";

export function getBoardIslandBasePath(themeId) {
  return getThemedSvgPath(themeId, BOARD_ISLAND_BASE_FILE);
}
```

Create `public/svgs/board_island_base.svg` with:
- a slightly scalloped island silhouette,
- a muted green interior,
- a sand rim,
- a soft outer shadow/glow,
- flat/vector-only treatment.

Do not add theme-specific variants in this pass.

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add public/svgs/board_island_base.svg app/catana/theme/themes.js app/catana/__tests__/themeAssets.test.js
git commit -m "feat: add board island base asset"
```

---

### Task 2: Extract testable island layout math (TDD)

**Files:**
- Create: `app/catana/utils/islandBaseLayout.js`
- Test: `app/catana/__tests__/utils/islandBaseLayout.test.js`

**Step 1: Write the failing test**

Create `app/catana/__tests__/utils/islandBaseLayout.test.js`:

```js
import { describe, expect, it } from "vitest";
import { getIslandBaseFrame } from "../../utils/islandBaseLayout";

describe("island base layout", () => {
  it("centers the island base around the board with a tuned overscan", () => {
    expect(getIslandBaseFrame({ center: [400, 300], size: 100 })).toEqual({
      width: 920,
      height: 880,
      left: -60,
      top: -140,
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run app/catana/__tests__/utils/islandBaseLayout.test.js`
Expected: FAIL because the helper file does not exist yet.

**Step 3: Write minimal implementation**

Create `app/catana/utils/islandBaseLayout.js`:

```js
const ISLAND_BASE_WIDTH_MULTIPLIER = 9.2;
const ISLAND_BASE_HEIGHT_MULTIPLIER = 8.8;

export function getIslandBaseFrame({ center, size }) {
  const [centerX, centerY] = center;
  const width = size * ISLAND_BASE_WIDTH_MULTIPLIER;
  const height = size * ISLAND_BASE_HEIGHT_MULTIPLIER;

  return {
    width,
    height,
    left: centerX - width / 2,
    top: centerY - height / 2,
  };
}
```

If visual QA later shows the silhouette needs a small nudge, adjust the multipliers here and update the test to match the final tuned values.

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run app/catana/__tests__/utils/islandBaseLayout.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add app/catana/utils/islandBaseLayout.js app/catana/__tests__/utils/islandBaseLayout.test.js
git commit -m "test: add island base layout helper"
```

---

### Task 3: Create the board underlay component (TDD)

**Files:**
- Create: `app/catana/BoardIslandBase.js`
- Test: `app/catana/__tests__/BoardIslandBase.test.js`

**Step 1: Write the failing test**

Create `app/catana/__tests__/BoardIslandBase.test.js`:

```js
import { describe, expect, it } from "vitest";
import { BoardIslandBase } from "../BoardIslandBase";

describe("BoardIslandBase", () => {
  it("renders a decorative non-interactive image underlay", () => {
    const element = BoardIslandBase({
      center: [400, 300],
      size: 100,
      themeId: "emoji",
    });

    expect(element.type).toBe("img");
    expect(element.props.src).toBe("/svgs/board_island_base.svg");
    expect(element.props.alt).toBe("");
    expect(element.props["aria-hidden"]).toBe(true);
    expect(element.props.draggable).toBe(false);
    expect(element.props.style.pointerEvents).toBe("none");
    expect(element.props.style.left).toBe(-60);
    expect(element.props.style.top).toBe(-140);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run app/catana/__tests__/BoardIslandBase.test.js`
Expected: FAIL because the component does not exist yet.

**Step 3: Write minimal implementation**

Create `app/catana/BoardIslandBase.js`:

```js
import React from "react";
import { getBoardIslandBasePath } from "./theme/themes";
import { getIslandBaseFrame } from "./utils/islandBaseLayout";

export function BoardIslandBase({ center, size, themeId }) {
  const frame = getIslandBaseFrame({ center, size });

  return (
    <img
      src={getBoardIslandBasePath(themeId)}
      alt=""
      aria-hidden={true}
      draggable={false}
      style={{
        position: "absolute",
        left: frame.left,
        top: frame.top,
        width: frame.width,
        height: frame.height,
        pointerEvents: "none",
        userSelect: "none",
      }}
    />
  );
}
```

Keep this component purely presentational. No refs, no event handlers, no game-state logic.

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run app/catana/__tests__/BoardIslandBase.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add app/catana/BoardIslandBase.js app/catana/__tests__/BoardIslandBase.test.js
git commit -m "feat: add board island underlay component"
```

---

### Task 4: Wire the island base into board layering (TDD)

**Files:**
- Modify: `app/catana/Board.js`
- Test: `app/catana/__tests__/Board.layering.test.js`

**Step 1: Write the failing test**

Create `app/catana/__tests__/Board.layering.test.js`:

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contents = fs.readFileSync(path.resolve(__dirname, "..", "Board.js"), "utf8");

describe("CatanBoard layering", () => {
  it("renders the island base before tiles", () => {
    const islandIndex = contents.indexOf("<BoardIslandBase");
    const tilesIndex = contents.indexOf("{tiles}");

    expect(islandIndex).toBeGreaterThan(-1);
    expect(tilesIndex).toBeGreaterThan(-1);
    expect(islandIndex).toBeLessThan(tilesIndex);
  });

  it("passes board layout props into the island base", () => {
    expect(contents).toContain("center={center}");
    expect(contents).toContain("size={size}");
    expect(contents).toContain("themeId={themeId}");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run app/catana/__tests__/Board.layering.test.js`
Expected: FAIL because `Board.js` does not render `BoardIslandBase` yet.

**Step 3: Write minimal implementation**

In `app/catana/Board.js`:
- import `BoardIslandBase`,
- render `<BoardIslandBase center={center} size={size} themeId={themeId} />` inside the `.relative h-screen w-screen` board container,
- place it before `{tiles}`,
- leave placement/effect/building layers after the tiles.

The target structure should be:

```jsx
<div className="relative h-screen w-screen">
  <BoardIslandBase center={center} size={size} themeId={themeId} />
  {tiles}
  ...
</div>
```

Do not change interaction refs or placement layer refs in this task.

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run app/catana/__tests__/Board.layering.test.js`
Expected: PASS

**Step 5: Run targeted regression tests**

Run:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js`
- `pnpm exec vitest run app/catana/__tests__/BoardIslandBase.test.js`
- `pnpm exec vitest run app/catana/__tests__/Board.layering.test.js`
- `pnpm exec vitest run app/catana/__tests__/uiNoDragImages.test.js`

Expected: PASS

**Step 6: Commit**

```bash
git add app/catana/Board.js app/catana/__tests__/Board.layering.test.js
git commit -m "feat: render island base behind board tiles"
```

---

### Task 5: Visual QA and agent docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Update agent docs**

Add a concise entry describing:
- the new board island SVG underlay,
- the `BoardIslandBase` component,
- the `getIslandBaseFrame(...)` layout helper,
- any final multiplier tweaks made during visual tuning.

**Step 2: Run visual QA**

Run: `pnpm dev`

Then use `@playwright-interactive` for QA with this inventory:
- Initial board view reads as one island, not floating tiles.
- Ports still sit clearly around the perimeter.
- Number tokens, roads, settlements, cities, robber, and effect overlays remain above the underlay.
- Initial viewport fit is still correct on desktop.
- Smaller mobile-style viewport still shows a coherent board footprint without awkward clipping.
- Exploratory check: place or inspect build affordances and robber placement to confirm nothing is blocked.

Capture at least:
- one desktop viewport screenshot,
- one smaller mobile-style viewport screenshot.

**Step 3: Run the targeted test bundle again**

Run:
- `pnpm exec vitest run app/catana/__tests__/themeAssets.test.js`
- `pnpm exec vitest run app/catana/__tests__/BoardIslandBase.test.js`
- `pnpm exec vitest run app/catana/__tests__/Board.layering.test.js`
- `pnpm exec vitest run app/catana/__tests__/utils/islandBaseLayout.test.js`

Expected: PASS

**Step 4: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record island base board work"
```
