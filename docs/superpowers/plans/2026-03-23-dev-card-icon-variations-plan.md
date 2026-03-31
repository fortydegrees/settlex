# Development Card Icon Variations Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create four Catana-native development-card icon SVG candidates derived from the recreated split-medallion symbol, then render them for side-by-side review without changing the live icon yet.

**Architecture:** Keep this pass asset-only and exploratory. Author four standalone SVG candidates in a temporary review folder, all sharing the same core medallion footprint and a simplified hammer cue, then raster them at real dock scale and at zoom-review scale so the user can choose a direction before `public/svgs/icon_devcard.svg` is replaced.

**Tech Stack:** SVG, existing Catana icon conventions, `rsvg-convert`, ImageMagick, agent docs

---

### Task 1: Lock runtime and style constraints

**Files:**
- Reference: `docs/superpowers/specs/2026-03-23-dev-card-icon-variations-design.md`
- Reference: `app/catana/components/PlayerActionContainer.js`
- Reference: `app/catana/components/ActionsDock/dockStyles.css`
- Reference: `public/svgs/icon_devcard.svg`
- Reference: `public/svgs/card_devcardback.svg`

- [ ] **Step 1: Re-read the approved spec**

Confirm the non-negotiables:
- medallion-derived symbol,
- simplified hammer cue,
- Catana-shifted colors,
- no direct clone,
- no live icon replacement in this pass.

- [ ] **Step 2: Reconfirm the runtime size**

Check the dock action usage and note:
- `icon_devcard.svg` is used by `PlayerActionContainer.js`,
- the dock card starts at `48px`,
- the icon image renders at roughly `80%` of that width,
- therefore readability at about `38px` is the main acceptance bar.

- [ ] **Step 3: Reconfirm the current baseline**

Inspect the current borrowed `icon_devcard.svg` and the full card-back art so the new variants improve on the baseline instead of repeating it at smaller scale.

### Task 2: Author the four candidate SVGs

**Files:**
- Create: `tmp/devcard-icon-variants/forge-stamp.svg`
- Create: `tmp/devcard-icon-variants/makers-mark.svg`
- Create: `tmp/devcard-icon-variants/struck-seal.svg`
- Create: `tmp/devcard-icon-variants/guild-token.svg`

- [ ] **Step 1: Build the shared medallion base**

For each candidate:
- use a square icon viewBox,
- keep the split top/bottom token read,
- use Catana-shifted coral / gold / blue / gray tones,
- preserve transparent background.

- [ ] **Step 2: Add the hammer cue**

Redraw a chunky hammer glyph per candidate with variation in:
- angle,
- center treatment,
- ring integration,
- emphasis on stamp versus active tool read.

- [ ] **Step 3: Keep the live asset untouched**

Do not modify `public/svgs/icon_devcard.svg` in this exploration pass. Candidate files should live only in the temp review folder.

### Task 3: Render and compare the candidates

**Files:**
- Verify: `tmp/devcard-icon-variants/forge-stamp.svg`
- Verify: `tmp/devcard-icon-variants/makers-mark.svg`
- Verify: `tmp/devcard-icon-variants/struck-seal.svg`
- Verify: `tmp/devcard-icon-variants/guild-token.svg`

- [ ] **Step 1: Render zoom-review PNGs**

Run:

```bash
rsvg-convert -w 160 -h 160 tmp/devcard-icon-variants/forge-stamp.svg > /tmp/devcard-forge-stamp-160.png
rsvg-convert -w 160 -h 160 tmp/devcard-icon-variants/makers-mark.svg > /tmp/devcard-makers-mark-160.png
rsvg-convert -w 160 -h 160 tmp/devcard-icon-variants/struck-seal.svg > /tmp/devcard-struck-seal-160.png
rsvg-convert -w 160 -h 160 tmp/devcard-icon-variants/guild-token.svg > /tmp/devcard-guild-token-160.png
```

Expected:
- the hammer treatment remains clean,
- the medallion split stays readable,
- no candidate collapses into noisy detail.

- [ ] **Step 2: Render dock-scale previews**

Run:

```bash
rsvg-convert -w 38 -h 38 tmp/devcard-icon-variants/forge-stamp.svg > /tmp/devcard-forge-stamp-38.png
rsvg-convert -w 38 -h 38 tmp/devcard-icon-variants/makers-mark.svg > /tmp/devcard-makers-mark-38.png
rsvg-convert -w 38 -h 38 tmp/devcard-icon-variants/struck-seal.svg > /tmp/devcard-struck-seal-38.png
rsvg-convert -w 38 -h 38 tmp/devcard-icon-variants/guild-token.svg > /tmp/devcard-guild-token-38.png
```

Expected:
- each candidate still reads at actual dock scale,
- any design that only works when zoomed becomes obvious.

- [ ] **Step 3: Assemble a comparison sheet**

Create a review sheet that shows all four candidates together for quick selection.

Expected:
- the user can compare silhouette, hammer treatment, and badge remixes side by side without opening each asset individually.

### Task 4: Update project docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 1: Record the dev-card exploration pass**

Add a new top-level note describing:
- the approved medallion-plus-hammer direction,
- the four candidate names,
- the fact that the live icon stayed untouched.

- [ ] **Step 2: Record the review artifacts**

Document:
- the temp SVG folder,
- the rendered comparison sheet,
- the dock-scale acceptance bar.

- [ ] **Step 3: Record the current recommendation**

If one or two variants stand out after rendering, note that as the likely next iteration path. Otherwise record that the set is ready for user review before replacement.
