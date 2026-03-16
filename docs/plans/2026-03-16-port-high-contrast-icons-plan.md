# Catana Port High-Contrast Icons Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give port markers their own higher-contrast Fluent icon set while leaving tile emoji icons unchanged, and replace the generic `3:1` three-dot glyph with a question-mark asset.

**Architecture:** Add a dedicated `getPortIconPath(...)` helper in the theme asset layer so ports can resolve a separate asset family from tile resource icons. Update `Port.js` to always render an image-based icon, using official Fluent `High Contrast` resource variants for emoji-theme ports and a local question-mark SVG for the generic `3:1` port. Keep classic and non-emoji behavior stable by falling back to the existing icon files when no dedicated port override exists.

**Tech Stack:** React, existing theme asset helpers, local SVG assets under `public/svgs/palette-themes/emoji/`, Vitest render and asset-resolution tests.

---

### Task 1: Add failing tests for dedicated port icon routing

**Files:**
- Modify: `app/catana/__tests__/themeAssets.test.js`
- Modify: `app/catana/__tests__/Port.render.test.js`

**Step 1: Extend theme asset tests**

Add expectations that:
- `getPortIconPath("emoji", "Ore")` resolves to a dedicated port asset path, not `icon_ore.svg`.
- `getPortIconPath("emoji", "Any")` resolves to a dedicated generic question-mark asset path.
- `getPortIconPath("classic", "Ore")` still resolves to the existing classic ore icon path.

**Step 2: Extend port render tests**

Add expectations that:
- specific-resource ports render an `<img>` using the dedicated port icon asset,
- generic ports render an `<img>` instead of the current `GenericPortGlyph`,
- the generic port markup contains the expected `port_icon_any.svg` path.

**Step 3: Run focused tests to verify RED**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/Port.render.test.js
```

Expected: failures because `getPortIconPath(...)` does not exist yet and generic ports still render the dot glyph.

### Task 2: Implement dedicated port icon assets and routing

**Files:**
- Modify: `app/catana/theme/themes.js`
- Modify: `app/catana/Port.js`
- Create: `public/svgs/palette-themes/emoji/port_icon_wood.svg`
- Create: `public/svgs/palette-themes/emoji/port_icon_brick.svg`
- Create: `public/svgs/palette-themes/emoji/port_icon_sheep.svg`
- Create: `public/svgs/palette-themes/emoji/port_icon_wheat.svg`
- Create: `public/svgs/palette-themes/emoji/port_icon_ore.svg`
- Create: `public/svgs/palette-themes/emoji/port_icon_any.svg`

**Step 1: Add theme helper**

Implement `getPortIconPath(themeId, resource)` in `themes.js`.
- For `emoji`, resolve to `port_icon_<resource>.svg` and `port_icon_any.svg`.
- For other themes, fall back to the existing resource icon files.

**Step 2: Update port rendering**

In `Port.js`:
- remove `GenericPortGlyph`,
- resolve the port icon source through `getPortIconPath(...)`,
- keep classic fallback behavior for image errors.

**Step 3: Add the SVG assets**

Use official Fluent `High Contrast` variants for:
- wood
- brick
- sheep/ewe
- wheat/sheaf of rice
- ore/rock

Use the provided question-mark SVG for `port_icon_any.svg`.

**Step 4: Run focused tests to verify GREEN**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/Port.render.test.js
```

Expected: both test files pass.

### Task 3: Document and verify

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Record the dedicated port-icon asset pipeline**

Document that:
- tile emoji icons remain Fluent `Flat`,
- emoji-theme port icons now use Fluent `High Contrast`,
- the generic `3:1` port now uses a dedicated question-mark SVG.

**Step 2: Run broader verification**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/themeAssets.test.js app/catana/__tests__/Port.render.test.js app/catana/__tests__/Board.layering.test.js app/catana/__tests__/BoardPortChannels.render.test.js app/catana/__tests__/utils/portLayout.test.js app/catana/__tests__/themeAssets.test.js
pnpm lint
```

Expected: tests pass; lint exits `0` aside from existing unrelated warnings.
