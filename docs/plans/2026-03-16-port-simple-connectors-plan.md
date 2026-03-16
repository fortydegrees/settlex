# Catana Simple Port Connectors Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current heavier board-channel port treatment with two short, separate sandy connector bars per port while keeping the circular port token, badge, and correct access-node targeting.

**Architecture:** Keep the existing `BoardPortChannels` layer slot in `Board.js`, but simplify its rendering to two quiet connector bars that are anchored near the real coastal node circles and point toward the port token. Extend `getPortRenderModel(...)` so each connector exposes its `nodeDirection`, then let `BoardPortChannels` project those directions into short bar geometry using the same `getNodeDelta(...)` math the board already uses for node hit targets and placed settlements. Leave `Port.js` focused on the marker and badge only. Update tests first so the change is driven by the new node-anchored geometry.

**Tech Stack:** React, existing Catana board coordinate helpers, SVG or absolute-positioned div primitives, Vitest render/layout tests, manual browser QA.

---

### Task 1: Rewrite the tests around the node-anchored connector treatment

**Files:**
- Modify: `app/catana/__tests__/BoardPortChannels.render.test.js`
- Modify: `app/catana/__tests__/Port.render.test.js`
- Modify: `app/catana/__tests__/Board.layering.test.js`
- Test: `app/catana/__tests__/utils/portLayout.test.js`

**Step 1: Write the failing test for connector metadata in the layout model**

Update `app/catana/__tests__/utils/portLayout.test.js` so each expected connector includes the `nodeDirection` that drove its placement. This preserves the fixed port-direction mapping while giving the render layer enough information to place bars directly from the correct coastal vertices.

Concrete expectation shape:

```js
expect(model.connectors).toEqual([
  {
    nodeDirection: "NORTHWEST",
    left: ...,
    top: ...,
    width: ...,
    height: ...,
    transform: ...,
  },
  ...
]);
```

**Step 2: Write the failing render test for node-anchored bars**

Update `app/catana/__tests__/BoardPortChannels.render.test.js` so it expects:
- one `board-port-channels` layer,
- one `board-port-channel` group per port,
- two connector primitives per port such as `board-port-connector`,
- sandy connector styling rather than the merged outer/inner channel pair,
- connector metadata for the actual `nodeDirection`,
- bar styles derived from node-anchor geometry instead of centered `translate(-50%, -50%)` shells.

Concrete expectation shape:

```js
expect(markup.match(/data-testid="board-port-channel"/g) ?? []).toHaveLength(2);
expect(markup.match(/data-testid="board-port-connector"/g) ?? []).toHaveLength(4);
expect(markup).toContain('background: #E5D08A');
expect(markup).toContain('data-node-direction="NORTHWEST"');
expect(markup).not.toContain("translate(-50%, -50%)");
```

**Step 2: Keep the port render contract focused**

Leave `app/catana/__tests__/Port.render.test.js` asserting that `Port` renders:
- one `port-layer`,
- one `port-marker`,
- one `port-badge`,
- zero old `port-connector` divs.

**Step 3: Run the focused test set to verify RED**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/BoardPortChannels.render.test.js app/catana/__tests__/Board.layering.test.js app/catana/__tests__/Port.render.test.js app/catana/__tests__/utils/portLayout.test.js
```

Expected:
- `portLayout.test.js` fails first because the current model does not expose `nodeDirection`.
- `BoardPortChannels.render.test.js` fails because the current implementation still centers tiny bars inside the old connector shells.

**Step 4: Defer commit**

Do not commit in this workspace because it already contains ongoing uncommitted user/session changes.

### Task 2: Simplify the board connector layer

**Files:**
- Modify: `app/catana/BoardPortChannels.js`
- Reuse: `app/catana/utils/portLayout.js`

**Step 1: Extend the layout model with node directions**

In `app/catana/utils/portLayout.js`, keep the fixed connector mapping but include `nodeDirection` on each returned connector record.

Example:

```js
return {
  nodeDirection,
  left: Math.round(style.left),
  top: Math.round(style.top),
  width: Math.round(w),
  height: Math.round(h),
  transform: style.transform,
};
```

**Step 2: Reuse the proven connector targeting**

In `BoardPortChannels.js`, derive the per-port connectors from:

```js
const { connectors } = getPortRenderModel({
  coordinate,
  size,
  boardCenter: center,
  direction: tile.direction,
});
```

This preserves the recent progress on correct port-to-node directional targeting.

**Step 3: Render two node-anchored sandy bars instead of centered shell bars**

Replace the current centered-shell output with two node-anchored connector primitives per port. Keep them:
- sandy,
- short,
- slightly rounded,
- visually quiet,
- stopping short of both the token and the node.

Compute each bar from:
- the port tile center,
- `getNodeDelta(nodeDirection, w, h)` for the true coastal vertex,
- the port marker center from `model.marker`,
- a short fixed or clamped length,
- a small gap outside the node circle.

One valid implementation shape is:

```js
React.createElement("div", {
  "data-testid": "board-port-connector",
  "data-node-direction": connector.nodeDirection,
  style: {
    position: "absolute",
    left: bar.left,
    top: bar.top,
    width: bar.width,
    height: bar.height,
    transform: `rotate(${bar.rotation}deg)`,
    transformOrigin: "center center",
    borderRadius: 999,
    background: "#E5D08A",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)",
  },
});
```

The exact dimensions may differ, but the key is:
- the bars live near the node circles,
- both bars are clearly directional toward the token,
- they no longer float in the middle zone between node and token.

**Step 4: Keep the layer slot unchanged**

Do not move the layer. `BoardPortChannels` should still render between `BoardUnderlay` and `{tiles}` in `app/catana/Board.js`.

**Step 5: Run the focused test set to verify GREEN**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/BoardPortChannels.render.test.js app/catana/__tests__/Board.layering.test.js app/catana/__tests__/Port.render.test.js app/catana/__tests__/utils/portLayout.test.js
```

Expected: all listed tests pass.

**Step 6: Defer commit**

Do not commit in this workspace because it already contains ongoing uncommitted user/session changes.

### Task 3: Verify visually and document the simplification

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Run live board QA**

Use Playwright against the local app and inspect a standard board. Confirm:
- the connectors feel lighter than the channel treatment,
- each port still visibly indicates the two valid access nodes,
- roads/settlements/cities remain visually above the connectors.

**Step 2: Run broader verification**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/BoardPortChannels.render.test.js app/catana/__tests__/Board.layering.test.js app/catana/__tests__/Port.render.test.js app/catana/__tests__/utils/portLayout.test.js app/catana/__tests__/themeAssets.test.js
pnpm lint
```

Expected:
- Vitest exits `0` with all targeted tests passing.
- `pnpm lint` exits `0` with only the repo’s existing unrelated warnings.

**Step 3: Record the new direction**

Update `docs/agent/PROGRESS.md` and `docs/agent/NOTES.md` to note:
- the channel experiment was simplified to two separate sandy connector bars,
- the board-layer slot was retained,
- connector targeting still comes from the correct port-direction geometry work,
- the bars are now anchored near the real coastal node circles rather than centered in the old connector shell boxes.
