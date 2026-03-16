# Catana Port Marker MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current literal port SVG composition with an embedded abstract port marker that reuses existing resource icons, shows a bottom `2:1` / `3:1` badge, and renders two explicit shoreline connectors to the eligible coastal nodes.

**Architecture:** Keep the change entirely in `app/catana`. Extract the direction-based connector/badge geometry into a pure helper, then refactor `Port.js` to render the harbor marker, reused resource icon, badge, and connectors directly with HTML/CSS instead of relying on the old `port_*.svg` plus `port_pier.svg` asset stack.

**Tech Stack:** React, existing Catana board math (`tilePixelVector` / `SQRT3`), CSS, existing themed resource icons from `theme/themes.js`, Vitest server-render tests, manual in-browser QA.

---

### Task 1: Add failing tests for port layout geometry and rendered marker structure

**Files:**
- Create: `app/catana/__tests__/utils/portLayout.test.js`
- Create: `app/catana/__tests__/Port.render.test.js`

**Step 1: Write the failing pure-layout test**

```js
import { describe, expect, it } from "vitest";
import { getPortRenderModel } from "../../utils/portLayout";

describe("port layout model", () => {
  it("returns two connectors and a bottom badge anchor for each port direction", () => {
    const model = getPortRenderModel({
      coordinate: [0, 0, 0],
      size: 100,
      boardCenter: [500, 400],
      direction: "SOUTHEAST",
    });

    expect(model.connectors).toHaveLength(2);
    expect(model.badge.anchor).toBe("bottom");
    expect(model.marker.left).toBeTypeOf("number");
  });
});
```

**Step 2: Write the failing render test for a specific-resource port**

```js
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Port } from "../Port";

describe("Port rendering", () => {
  it("renders a specific-resource port with two connectors and a 2:1 badge", () => {
    const markup = renderToStaticMarkup(
      <Port
        coordinate={[0, 0, 0]}
        size={100}
        boardCenter={[500, 400]}
        tile={{ id: 19, direction: "EAST", resource: "Ore" }}
        themeId="emoji"
      />
    );

    expect(markup).toContain('data-testid="port-marker"');
    expect(markup).toContain('data-testid="port-badge"');
    expect(markup).toContain(">2:1<");
    expect(markup.match(/data-testid="port-connector"/g)).toHaveLength(2);
  });
});
```

**Step 3: Extend the render test for a generic port**

```js
it("renders a generic port with a 3:1 badge", () => {
  const markup = renderToStaticMarkup(
    <Port
      coordinate={[0, 0, 0]}
      size={100}
      boardCenter={[500, 400]}
      tile={{ id: 20, direction: "WEST", resource: "Any" }}
      themeId="emoji"
    />
  );

  expect(markup).toContain(">3:1<");
});
```

**Step 4: Run tests to verify they fail**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/utils/portLayout.test.js app/catana/__tests__/Port.render.test.js
```

Expected: FAIL because `portLayout` does not exist and `Port.js` does not yet render the new marker structure.

**Step 5: Commit**

```bash
git add app/catana/__tests__/utils/portLayout.test.js app/catana/__tests__/Port.render.test.js
git commit -m "test: cover mvp port marker layout and rendering"
```

### Task 2: Implement a pure port layout helper from existing board coordinate math

**Files:**
- Create: `app/catana/utils/portLayout.js`
- Test: `app/catana/__tests__/utils/portLayout.test.js`

**Step 1: Extract current center and direction math into one helper**

```js
import { SQRT3, tilePixelVector } from "./coordinates";

export function getPortRenderModel({ coordinate, size, boardCenter, direction }) {
  const w = SQRT3 * size;
  const h = 2 * size;
  const [centerX, centerY] = boardCenter;
  const [x, y] = tilePixelVector(coordinate, size, centerX, centerY);

  return {
    marker: {
      left: x - size * 0.48,
      top: y - size * 0.52,
      width: size * 0.96,
      height: size * 0.96,
    },
    badge: {
      anchor: "bottom",
      left: x - size * 0.28,
      top: y + size * 0.2,
      width: size * 0.56,
      height: size * 0.24,
    },
    connectors: CONNECTOR_LAYOUT_BY_DIRECTION[direction].map((spec) => ({
      left: spec.left(x, w),
      top: spec.top(y, h),
      width: size * 0.16,
      height: size * 0.72,
      transform: spec.transform,
    })),
  };
}
```

**Step 2: Keep the direction table small and explicit**

```js
const CONNECTOR_LAYOUT_BY_DIRECTION = {
  EAST: [/* northwest-facing connector */, /* southwest-facing connector */],
  NORTHEAST: [/* south */, /* southwest */],
  NORTHWEST: [/* south */, /* southeast */],
  WEST: [/* northeast */, /* southeast */],
  SOUTHWEST: [/* north */, /* northeast */],
  SOUTHEAST: [/* north */, /* northwest */],
};
```

**Step 3: Run the pure-layout test**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/utils/portLayout.test.js
```

Expected: PASS.

**Step 4: Commit**

```bash
git add app/catana/utils/portLayout.js app/catana/__tests__/utils/portLayout.test.js
git commit -m "feat: add pure port layout helper"
```

### Task 3: Replace the old port SVG stack with a runtime-composed marker

**Files:**
- Modify: `app/catana/Port.js`
- Create: `app/catana/Port.css`
- Test: `app/catana/__tests__/Port.render.test.js`

**Step 1: Stop using `port_*.svg` and `port_pier.svg` as the main runtime rendering path**

Replace the old `backgroundImage: getBackgroundImageWithFallback(themeId, \`port_${tile.resource}.svg\`)` plus duplicated pier divs with one composed structure:

```js
import "./Port.css";
import {
  getClassicResourceIconPath,
  getResourceIconPath,
  handleThemeImageError,
} from "./theme/themes";
import { getPortRenderModel } from "./utils/portLayout";
```

**Step 2: Render the harbor marker, icon, badge, and connectors as separate layers**

```jsx
const rateLabel = tile.resource === "Any" ? "3:1" : "2:1";
const iconSrc = tile.resource === "Any" ? null : getResourceIconPath(themeId, tile.resource);
const iconFallbackSrc =
  tile.resource === "Any" ? null : getClassicResourceIconPath(tile.resource);
const model = getPortRenderModel({
  coordinate,
  size,
  boardCenter,
  direction: tile.direction,
});

return (
  <>
    {model.connectors.map((connector, index) => (
      <div
        key={`connector-${index}`}
        data-testid="port-connector"
        className="portConnector"
        style={connector}
      />
    ))}
    <div
      data-testid="port-marker"
      className="portMarker"
      style={model.marker}
    >
      <div className="portMarkerWater" />
      <div className="portMarkerInner" />
      {iconSrc ? (
        <img
          className="portMarkerIcon"
          src={iconSrc}
          alt=""
          draggable={false}
          onError={(event) => handleThemeImageError(event, iconFallbackSrc)}
        />
      ) : (
        <div className="portMarkerGenericGlyph" aria-hidden="true" />
      )}
      <div
        data-testid="port-badge"
        className="portBadge"
        style={model.badge}
      >
        {rateLabel}
      </div>
    </div>
  </>
);
```

**Step 3: Keep the CSS deliberately simple and launch-scoped**

```css
.portMarker {
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
}

.portMarkerWater {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255,255,255,0.82), rgba(103,216,255,0.9));
}

.portMarkerInner {
  position: absolute;
  inset: 12%;
  border-radius: inherit;
  background: linear-gradient(180deg, #fff6c7, #f1d86b);
}

.portBadge {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  color: #1f2937;
  font-weight: 700;
}
```

The point is not to handcraft perfect art in CSS. The point is to land the approved structure cleanly and keep the styling flat, bright, and readable.

**Step 4: Run the render tests**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/Port.render.test.js
```

Expected: PASS.

**Step 5: Commit**

```bash
git add app/catana/Port.js app/catana/Port.css app/catana/__tests__/Port.render.test.js
git commit -m "feat: render mvp embedded port markers"
```

### Task 4: Verify board integration and document the new port direction

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Run focused verification**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/utils/portLayout.test.js app/catana/__tests__/Port.render.test.js app/catana/__tests__/Board.layering.test.js app/catana/__tests__/themeAssets.test.js
```

Expected: PASS.

**Step 2: Run lint**

Run:

```bash
pnpm lint
```

Expected: PASS, or only existing unrelated warnings already present in the repo.

**Step 3: Perform manual QA in the Catana board**

Run:

```bash
pnpm dev
```

Then check:
- each port clearly shows a centered marker,
- specific ports show the correct resource icon and `2:1` badge,
- generic ports show `3:1`,
- the two connectors clearly indicate which coastal nodes have access,
- the marker still reads cleanly in the `emoji` theme.

**Step 4: Update the agent docs**

Add a short status entry to `docs/agent/PROGRESS.md` and note these rules in `docs/agent/NOTES.md`:
- ports are now runtime-composed markers rather than old literal SVG stacks,
- the approved MVP structure is `embedded marker + center icon + bottom badge + two connectors`,
- the marker intentionally reuses themed resource icons instead of a second port-art asset family.

**Step 5: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record mvp port marker direction"
```

Plan complete and saved to `docs/plans/2026-03-09-port-marker-mvp-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
