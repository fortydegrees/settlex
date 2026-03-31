# Longest Road Icon Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder longest-road stat icon with a native Catana icon that reads clearly at avatar-stat size.

**Architecture:** Keep the implementation asset-only. Redraw `public/svgs/icon_longest_road.svg` from the existing Catana road-piece language, then verify the silhouette at small size and update the agent-facing changelog docs.

**Tech Stack:** SVG, existing Catana asset conventions, manual visual verification

---

### Task 1: Lock the approved icon direction

**Files:**
- Create: `docs/superpowers/specs/2026-03-20-longest-road-icon-design.md`
- Create: `docs/superpowers/plans/2026-03-20-longest-road-icon-plan.md`

- [ ] **Step 1: Write the approved design note**

Capture the final constraints:
- status glyph, not trophy badge,
- two connected road pieces,
- Catana-native road-piece language,
- optimized for roughly `28px`.

- [ ] **Step 2: Confirm the implementation target**

Use:
- `app/catana/components/PlayerAvatarStats.js`
- `public/svgs/road_red.svg`
- `public/svgs/icon_longest_road.svg`

Expected result:
- the icon can be redrawn without changing runtime code.

### Task 2: Redraw the SVG

**Files:**
- Modify: `public/svgs/icon_longest_road.svg`

- [ ] **Step 1: Replace the copied placeholder geometry**

Create a new compact SVG that:
- uses two chunky connected road pieces,
- keeps the silhouette readable on a `32 x 32` artboard,
- uses a neutral palette and restrained shading,
- avoids thin decorative detail.

- [ ] **Step 2: Keep the asset runtime-compatible**

Do not change imports or component code unless the new SVG exposes a rendering problem that cannot be solved in the asset itself.

### Task 3: Verify and document

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 1: Render-check the icon at small size**

Run a local rasterization or equivalent preview to confirm the silhouette still reads at approximately `28px`.

- [ ] **Step 2: Update agent docs**

Record:
- the new status-icon direction,
- the file changed,
- the fact that verification was visual/manual rather than test-driven.

- [ ] **Step 3: Record verification outcome**

Expected result:
- asset updated,
- manual visual check completed,
- no automated tests required for this asset-only change.
