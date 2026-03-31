# Dev Card Icon Tuning Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved live tuning to `public/svgs/icon_devcard.svg` so the icon fills the actions dock better and uses a lighter, smoother Catana-aligned blue base without losing the existing hammer-disc concept.

**Architecture:** Keep the current dev-card icon geometry and split-disc composition. Tune only the SVG viewBox and the approved blue / handle paint stops so the icon scales up optically in the dock and the disabled state keeps clearer hammer contrast. Record the live asset change in the agent docs and verify the SVG parses and renders at dock-relevant sizes.

**Tech Stack:** SVG, Catana asset palette references, `xmllint`, `rsvg-convert`, agent docs

---

### Task 1: Reconfirm the approved live direction

**Files:**
- Reference: `public/svgs/icon_devcard.svg`
- Reference: `public/svgs/settlement_red.svg`
- Reference: `app/catana/components/ActionsDock/dockStyles.css`
- Reference: `docs/agent/skills/catana-brand/SKILL.md`

- [ ] **Step 1: Reconfirm the scope**

Keep the existing medallion + hammer icon concept and avoid redesigning the symbol family.

- [ ] **Step 2: Reconfirm the visual goals**

Apply the approved `C3` direction:
- tighter square crop for better dock occupancy,
- lighter blue base with most of the lift concentrated in the darkest stop,
- warmer hammer handle for better disabled-state separation.

- [ ] **Step 3: Reconfirm the acceptance bar**

Judge the final asset mainly in the actions dock context where the icon is dimmed in disabled state and rendered at a compact size.

### Task 2: Patch the live SVG

**Files:**
- Modify: `public/svgs/icon_devcard.svg`

- [ ] **Step 1: Add the approved crop**

Add the tighter `viewBox` so the existing artwork occupies more of the dock card without changing runtime CSS.

- [ ] **Step 2: Tune the blue gradients**

Lift the bottom blue stop the most, nudge the mid blue up slightly, and keep the light/high stop close to the current icon so the lower half reads lighter without becoming washed out.

- [ ] **Step 3: Tune the hammer handle**

Warm the handle fill and its shadow ramps enough to keep the diagonal hammer legible over the cool half, especially after the dock's disabled brightness filter is applied.

### Task 3: Update project docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 1: Record the live asset change**

Note that `public/svgs/icon_devcard.svg` now uses the approved crop and tuned blue / handle palette.

- [ ] **Step 2: Record the design read**

Document that the current goal is:
- better dock occupancy,
- smoother Catana-blue base,
- clearer hammer read in disabled state.

- [ ] **Step 3: Record verification**

Capture the XML validation and raster render commands used to confirm the tuned SVG still parses and renders cleanly.

### Task 4: Verify the tuned asset

**Files:**
- Verify: `public/svgs/icon_devcard.svg`

- [ ] **Step 1: Validate the SVG syntax**

Run:
```bash
xmllint --noout public/svgs/icon_devcard.svg
```

- [ ] **Step 2: Render dock-scale previews**

Run:
```bash
rsvg-convert -w 96 -h 96 public/svgs/icon_devcard.svg > /tmp/devcard-icon-96.png
rsvg-convert -w 64 -h 64 public/svgs/icon_devcard.svg > /tmp/devcard-icon-64.png
```

- [ ] **Step 3: Reconfirm the output files exist**

Verify both preview PNGs were produced and no renderer errors were emitted.
