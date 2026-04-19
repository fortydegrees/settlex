# Left Meta Rail Attachment Band Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `top|middle|bottom` desktop attachment modes for the left meta rail so the tab can reconnect into the panel at different vertical bands without moving the restored panel baseline.

**Architecture:** Keep the current bottom-anchored desktop wrapper and the current panel/button rectangles fixed. Add attachment-band outputs to the ribbon layout helper and teach the unified SVG shell path to use those panel-side join coordinates, while leaving row spacing based on the existing panel footprint. `Game Log` will use `top`; `Chat` will use `bottom`.

**Tech Stack:** React, GSAP, Vitest, Chrome DevTools, Tailwind utility classes, SVG path geometry

---

### Task 1: Lock the Attachment-Band Contract in Tests

**Files:**
- Modify: `app/catana/__tests__/LeftMetaRail.test.js`
- Verify: `app/catana/components/LeftMetaRail.js`

- [ ] **Step 1: Write the failing regression test**

Add assertions that:
- `getSideTabLayoutMetrics({ panelHeight, attachment: "top" | "middle" | "bottom" })` preserves the same `panelTop`, `panelBottom`, `lowerJoinY`, and `shellHeight`
- `top`, `middle`, and `bottom` produce different panel-side attachment outputs
- `buildMetaPanels` defaults still render `Game Log -> top` and `Chat -> bottom`

- [ ] **Step 2: Run the targeted test to confirm it fails**

Run: `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js`

Expected: FAIL because the current helper ignores attachment modes and still returns only the top attachment behavior.

### Task 2: Implement Attachment Bands Without Moving the Baseline

**Files:**
- Modify: `app/catana/components/LeftMetaRail.js`
- Verify: `app/catana/__tests__/LeftMetaRail.test.js`

- [ ] **Step 1: Add fixed attachment mode metadata to desktop panel definitions**

Update `buildMetaPanels()` so:
- `log` uses `attachment: "top"`
- `chat` uses `attachment: "bottom"`

- [ ] **Step 2: Extend the layout helper with attachment-band outputs**

Update `getSideTabLayoutMetrics()` to:
- accept `attachment = "top" | "middle" | "bottom"`
- preserve the current fixed panel geometry
- compute a panel-side attachment band such as `panelAttachTopY` / `panelAttachBottomY`
- clamp `middle` and `bottom` away from panel corner radii

- [ ] **Step 3: Update the shell path to use the attachment band**

Modify `buildSideTabUnifiedShellPath()` so the left tab remains full-height, but the panel-side join reconnects at the attachment band instead of always using the header seam.

- [ ] **Step 4: Pass attachment metadata through the desktop row renderer**

Update `DesktopSideTabRow` and its next-layout computation so the path renderer uses the new attachment-aware layout, while `getSideTabRowHeight()` still reserves space from the unchanged panel footprint.

- [ ] **Step 5: Run the targeted test to confirm the implementation passes**

Run: `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js`

Expected: PASS with attachment outputs varying by mode while wrapper baseline assertions stay green.

### Task 3: Browser-Check the Visual Result and Record It

**Files:**
- Modify: `docs/agent/NOTES.md`
- Modify: `docs/agent/PROGRESS.md`
- Verify: `/catana/dev/sandbox` in the running dev server

- [ ] **Step 1: Reload the sandbox and capture the both-open desktop baseline**

Use Chrome DevTools on `http://127.0.0.1:3000/catana/dev/sandbox` and verify:
- chat panel bottom still aligns with the nearby avatar baseline
- chat tab remains full-height
- chat panel attaches just above the composer band

- [ ] **Step 2: Stress chat-only and both-open states**

Confirm:
- `Game Log` still reads like the current top-attached shell
- `Chat` now matches the bottom-attachment mockup more closely
- no overlap or baseline drift returns

- [ ] **Step 3: Update agent notes and progress**

Record:
- the attachment-band approach replaced the abandoned panel-anchor experiment
- current desktop defaults are `log=top` and `chat=bottom`
- the bottom baseline remained fixed while only the attachment band moved

- [ ] **Step 4: Run the full verification set**

Run:
- `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/ChatPanel.test.js`
- `pnpm exec eslint app/catana/components/LeftMetaRail.js app/catana/components/GameLogPanel.js app/catana/components/ChatPanel.js app/catana/__tests__/LeftMetaRail.test.js`
- `git diff --check -- app/catana/components/LeftMetaRail.js app/catana/__tests__/LeftMetaRail.test.js docs/agent/NOTES.md docs/agent/PROGRESS.md docs/superpowers/plans/2026-04-16-left-meta-rail-attachment-band-plan.md`

Expected:
- all 3 Vitest files pass
- eslint exits 0
- `git diff --check` reports no whitespace errors
