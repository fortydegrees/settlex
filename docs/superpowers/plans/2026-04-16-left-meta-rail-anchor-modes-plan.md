# Left Meta Rail Anchor Modes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add anchor-aware desktop ribbon geometry to `LeftMetaRail` so `Game Log` can be middle-anchored and `Chat` can keep the old bottom baseline while using a lifted lower connector seam.

**Architecture:** Keep the existing desktop ribbon shell and production panel content, but move row layout onto a small anchor-aware geometry model. Use pure helper functions to compute panel top, panel bottom, upper seam, lower seam, and row spacing from `top|middle|bottom` so the layout is testable without relying on browser-only measurement. For the corrected `bottom` anchor, the chat panel body returns to the old bottom baseline while the lower connector seam lifts independently above the composer band.

**Tech Stack:** React, SVG shell geometry, Vitest, ESLint, Chrome DevTools

---

### Task 1: Lock Anchor Defaults And Geometry In Tests

**Files:**
- Modify: `app/catana/__tests__/LeftMetaRail.test.js`
- Test: `app/catana/__tests__/LeftMetaRail.test.js`

- [ ] **Step 1: Write the failing test**

Add focused assertions for the new desktop anchor behavior:
- source or render output includes support for `top`, `middle`, and `bottom`,
- desktop default rows render `log` as `middle` and `chat` as `bottom`,
- exported helper output proves the bottom anchor panel body aligns back to the button baseline,
- exported helper output preserves an upper join inset for `middle` and `bottom` instead of snapping to the button top.
- exported helper output keeps the bottom lower seam above the baseline so the connector sits above the composer band.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js`
Expected: FAIL because `LeftMetaRail` does not yet expose anchor-aware layout behavior.

- [ ] **Step 3: Write minimal implementation**

Update `app/catana/components/LeftMetaRail.js` to export or surface the minimal anchor-aware layout details needed by the test.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js`
Expected: PASS

### Task 2: Implement Anchor-Aware Desktop Geometry

**Files:**
- Modify: `app/catana/components/LeftMetaRail.js`

- [ ] **Step 1: Add a pure desktop layout helper**

Introduce a helper that accepts panel height and anchor mode and returns:
- `panelTop`
- `panelBottom`
- `shellHeight`
- `topJoinY`
- `lowerJoinY`

- [ ] **Step 2: Update panel definitions**

Assign desktop anchor defaults:
- `log -> middle`
- `chat -> bottom`

- [ ] **Step 3: Route existing shell rendering through the helper**

Use the helper output for:
- SVG shell path geometry,
- panel positioning,
- rounded upper join placement for `middle` and `bottom`,
- lifted lower join placement for `bottom` while keeping the panel body baseline-aligned,
- row-height reservation between open rows.

- [ ] **Step 4: Keep mobile behavior untouched**

Do not change the mobile rail.

- [ ] **Step 5: Run focused tests**

Run: `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js`
Expected: PASS

### Task 3: Verify In The Real Board Context

**Files:**
- Modify if needed: `app/catana/components/LeftMetaRail.js`

- [ ] **Step 1: Start or reuse the local app**

Run: `pnpm dev`
Expected: local routes are available.

- [ ] **Step 2: Check the desktop sandbox or real game screen**

Verify:
- both-open desktop state,
- `Chat` stays within the viewport,
- `Chat` bottom aligns with the old desktop baseline near the avatar/HUD box,
- `Game Log` button join reads as middle-anchored,
- the upper connector remains smoothly rounded for `middle` and `bottom`,
- the `bottom` lower connector seam sits above the message/composer band without lifting the whole panel too high,
- toggle behavior still works.

- [ ] **Step 3: Re-run tests and lint if visual tuning changed source**

Run: `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js`
Expected: PASS

Run: `pnpm exec eslint app/catana/components/LeftMetaRail.js app/catana/__tests__/LeftMetaRail.test.js`
Expected: PASS

### Task 4: Record The Change

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 1: Update notes**

Record the new desktop rule that rows can choose `top|middle|bottom` anchors and that current defaults are `log=middle`, `chat=bottom`.

- [ ] **Step 2: Update progress**

Record the implementation and the verification commands run.

- [ ] **Step 3: Final cleanliness check**

Run: `git diff --check -- app/catana/components/LeftMetaRail.js app/catana/__tests__/LeftMetaRail.test.js docs/agent/NOTES.md docs/agent/PROGRESS.md docs/superpowers/specs/2026-04-16-left-meta-rail-anchor-modes-design.md docs/superpowers/plans/2026-04-16-left-meta-rail-anchor-modes-plan.md`
Expected: no whitespace or merge-marker issues in touched files.
