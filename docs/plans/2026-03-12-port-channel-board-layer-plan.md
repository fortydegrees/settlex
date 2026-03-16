# Catana Port Channel Board Layer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the old per-port bridge visuals with a board-level port-channel layer that sits between the underlay and the tiles while keeping the new circular port markers and badges.

**Architecture:** Add a dedicated `BoardPortChannels` SVG overlay that uses the existing board coordinate math to draw one tapered channel per port tile. Keep `Port` focused on rendering the marker and badge only. Wire the new overlay into `Board` between `BoardUnderlay` and `{tiles}` so the channels read as part of the map.

**Tech Stack:** React, SVG, existing board coordinate helpers, Vitest render tests, manual browser QA.

---

### Task 1: Add failing tests for the new board layer

**Files:**
- Create: `app/catana/__tests__/BoardPortChannels.render.test.js`
- Modify: `app/catana/__tests__/Board.layering.test.js`
- Modify: `app/catana/__tests__/Port.render.test.js`

**Step 1: Write a failing render test for the new board channel layer**

Assert that `BoardPortChannels` renders one channel group for each port tile and no channels for land tiles.

**Step 2: Extend the board layering test**

Assert that `<BoardPortChannels` appears after `<BoardUnderlay` and before `{tiles}` in `Board.js`.

**Step 3: Update the port rendering test**

Assert that `Port` still renders the marker and badge, but no longer renders standalone connector divs.

**Step 4: Run the focused tests and confirm RED**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/BoardPortChannels.render.test.js app/catana/__tests__/Board.layering.test.js app/catana/__tests__/Port.render.test.js
```

### Task 2: Implement the board-level channel component

**Files:**
- Create: `app/catana/BoardPortChannels.js`

**Step 1: Build a pure render component**

Use `tilePixelVector`, `SQRT3`, and port `tile.direction` to derive:
- the board-facing edge anchor on the port tile
- the port marker center
- one outer sand channel path
- one inner pale-blue channel path

**Step 2: Keep the geometry simple**

Use one tapered quadrilateral or short path per port, not two old-style piers.

**Step 3: Expose test markers**

Add stable `data-testid` hooks for the layer and each port channel group.

### Task 3: Wire the new layer into the board and retire the old connectors

**Files:**
- Modify: `app/catana/Board.js`
- Modify: `app/catana/Port.js`

**Step 1: Render the new channel layer**

Insert `<BoardPortChannels ... />` directly after `<BoardUnderlay ... />`.

**Step 2: Stop rendering old connector divs in `Port`**

Keep the marker and badge intact.

**Step 3: Run focused tests and confirm GREEN**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/BoardPortChannels.render.test.js app/catana/__tests__/Board.layering.test.js app/catana/__tests__/Port.render.test.js
```

### Task 4: Verify in-browser and document the change

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Run visual QA**

Use Playwright on the standard board and inspect a few representative ports.

**Step 2: Run broader verification**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/BoardPortChannels.render.test.js app/catana/__tests__/Board.layering.test.js app/catana/__tests__/Port.render.test.js app/catana/__tests__/utils/portLayout.test.js app/catana/__tests__/themeAssets.test.js
pnpm lint
```

**Step 3: Record the change**

Add a short note to `docs/agent/PROGRESS.md` and `docs/agent/NOTES.md`.
