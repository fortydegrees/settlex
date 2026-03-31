# Robber Icon Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current detailed robber icon with a simplified faceless Catana robber piece that matches the existing road/settlement/city asset family.

**Architecture:** Keep the change asset-only. Redraw `public/svgs/icon_robber.svg` as a neutral gray pawn-stack blocker piece with restrained directional gradients, while preserving the existing runtime path and sizing in `app/catana/Tile.js`. Verify the new silhouette through local raster renders at both review size and approximate board usage size.

**Tech Stack:** SVG, existing Catana asset conventions, `rsvg-convert`, ImageMagick, agent docs

---

### Task 1: Lock the runtime and style constraints

**Files:**
- Reference: `docs/superpowers/specs/2026-03-22-robber-icon-design.md`
- Reference: `app/catana/Tile.js`
- Reference: `public/svgs/icon_robber copy.svg`
- Reference: `public/svgs/road_red.svg`
- Reference: `public/svgs/settlement_red.svg`
- Reference: `public/svgs/city_red.svg`

- [ ] **Step 1: Re-read the approved spec**

Confirm the non-negotiables:
- faceless pawn-stack silhouette,
- neutral gray piece,
- restrained directional gradients,
- no ninja/character cues,
- board-piece family match rather than flat tile-icon styling.

- [ ] **Step 2: Reconfirm the runtime usage**

Check `app/catana/Tile.js` and note:
- the robber asset path remains `icon_robber.svg`,
- the runtime sizes the icon to `size / 1.5`,
- no runtime code changes are required unless the new asset exposes a rendering problem that cannot be solved in SVG.

- [ ] **Step 3: Reconfirm the visual reference family**

Inspect:
- `public/svgs/icon_robber copy.svg`
- `public/svgs/road_red.svg`
- `public/svgs/settlement_red.svg`
- `public/svgs/city_red.svg`

Expected result:
- clear understanding of the shared lighting, outline, and simplification language before editing.

### Task 2: Redraw the robber asset

**Files:**
- Modify: `public/svgs/icon_robber.svg`

- [ ] **Step 1: Remove the character-art geometry**

Replace the current detailed robber illustration with a compact pawn-stack silhouette:
- small rounded head,
- larger rounded middle body,
- stable lower base,
- no face or accessories.

- [ ] **Step 2: Apply the Catana piece rendering language**

Author the new SVG with:
- neutral gray main fill,
- medium gray shadow plane,
- dark warm-gray outline,
- restrained directional gradients matching the current piece family.

- [ ] **Step 3: Keep the asset runtime-compatible**

Preserve:
- transparent background,
- the same filename and import path,
- a clean viewBox and stable rendering without requiring any `Tile.js` changes.

### Task 3: Verify the robber at board scale

**Files:**
- Verify: `public/svgs/icon_robber.svg`

- [ ] **Step 1: Render a review-size preview**

Run:

```bash
rsvg-convert -w 96 -h 96 public/svgs/icon_robber.svg > /tmp/icon_robber_verify_96.png
```

Expected:
- the pawn-stack silhouette reads clearly,
- the shading stays broad and not glossy.

- [ ] **Step 2: Render an approximate in-game size preview**

Run:

```bash
rsvg-convert -w 64 -h 64 public/svgs/icon_robber.svg > /tmp/icon_robber_verify_64.png
```

Expected:
- the robber still reads as a blocking piece when scaled down toward tile usage.

- [ ] **Step 3: Compare against the existing piece family**

Run:

```bash
magick montage \
  /tmp/icon_robber_verify_96.png \
  /tmp/settlement_red.png \
  /tmp/city_red.png \
  /tmp/road_red.png \
  -tile 2x2 -geometry 128x128+18+18 -background white \
  /tmp/robber_piece_family_compare.png
```

Expected:
- the robber looks like it belongs with the current board-piece assets,
- it is visibly simpler than the old character art.

### Task 4: Update project docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 1: Record the robber icon implementation**

Add a new top-level entry describing:
- the new faceless pawn-stack direction,
- the use of restrained gradients,
- the fact that the change stayed asset-only.

- [ ] **Step 2: Record the verification method**

Document that verification was visual/manual using local raster renders and side-by-side comparison, with no automated tests required unless runtime code changes.

- [ ] **Step 3: Record any runtime caveats**

If the final implementation requires any runtime adjustment in `app/catana/Tile.js`, note it explicitly. Otherwise, record that the existing robber path and sizing remained unchanged.
