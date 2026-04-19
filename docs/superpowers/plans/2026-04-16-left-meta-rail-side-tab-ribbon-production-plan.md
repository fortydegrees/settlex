# Left Meta Rail Side-Tab Ribbon Production Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the approved side-tab ribbon desktop shell into the production Catana game screen by updating `LeftMetaRail` while keeping the existing log/chat content behavior intact.

**Architecture:** Keep `GameScreen -> LeftMetaRail` wiring and desktop open-state behavior unchanged, but replace the current desktop connector/button/panel shell with the side-tab ribbon geometry proven in the dev study. Reuse `GameLogPanel` and `ChatPanel` as content bodies with parent-driven styling overrides wherever possible, and leave `MobileMetaRail` untouched unless the desktop work naturally needs a tiny shared helper.

**Tech Stack:** React, SVG shell geometry, Vitest, ESLint, Chrome DevTools

---

### Task 1: Lock The Production Desktop Structure In Tests

**Files:**
- Modify: `app/catana/__tests__/LeftMetaRail.test.js`
- Test: `app/catana/__tests__/LeftMetaRail.test.js`

- [ ] **Step 1: Write the failing test**

Update the desktop source/render test to expect the new side-tab ribbon structure instead of the old connector shell, including:
- production desktop rows still open both panels by default,
- fixed-button side-tab data attributes or geometry constants that identify the ribbon structure,
- absence of the old connector-specific shape markup.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js`
Expected: FAIL because production `LeftMetaRail` still contains the old connector shell.

- [ ] **Step 3: Write minimal implementation**

Update `app/catana/components/LeftMetaRail.js` to render desktop rows through the side-tab ribbon shell while preserving the current panel state/data flow.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js`
Expected: PASS

### Task 2: Integrate The Ribbon Shell Into Production Desktop Layout

**Files:**
- Modify: `app/catana/components/LeftMetaRail.js`
- Modify: `app/catana/components/GameLogPanel.js`
- Modify: `app/catana/components/ChatPanel.js`
- Reference: `app/catana/dev/sidebar-connection/SidebarConnectionClient.js`

- [ ] **Step 1: Keep panel content parent-driven**

Preserve `GameLogPanel` and `ChatPanel` as content payloads. Only add or adjust props if the production ribbon shell exposes a real layout seam that cannot be solved from `LeftMetaRail`.

- [ ] **Step 2: Replace the desktop shell/chrome**

Port the approved side-tab ribbon behavior into production desktop:
- fixed button stack,
- lifted ribbon shell,
- both-open row spacing,
- clipped panel content,
- row-following layout.

- [ ] **Step 3: Keep mobile untouched**

Do not change `MobileMetaRail` unless a tiny helper extraction is genuinely needed to avoid duplication in state or panel metadata setup.

- [ ] **Step 4: Run focused production tests**

Run: `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/ChatPanel.test.js`
Expected: PASS

- [ ] **Step 5: Run focused lint verification**

Run: `pnpm exec eslint app/catana/components/LeftMetaRail.js app/catana/components/GameLogPanel.js app/catana/components/ChatPanel.js app/catana/__tests__/LeftMetaRail.test.js`
Expected: PASS

### Task 3: Match The Real Game Screen Against The Approved Dev Ribbon

**Files:**
- Modify if needed: `app/catana/components/LeftMetaRail.js`
- Verify: `app/catana/GameScreen.js` integration remains unchanged

- [ ] **Step 1: Start the local app and capture the baseline**

Run: `pnpm dev`
Expected: Next dev server starts and serves the real game screen plus `/catana/dev/sidebar-connection`.

- [ ] **Step 2: Check the real game screen desktop sidebar**

Use Chrome DevTools to verify on the real board view:
- both-open default desktop state,
- log-only state,
- chat-only state,
- fixed button stack feel,
- no clipping/overlap,
- chat composer still usable.

- [ ] **Step 3: Compare against the dev reference route**

Check `http://127.0.0.1:3000/catana/dev/sidebar-connection` and ensure the real desktop `LeftMetaRail` matches the approved side-tab ribbon closely enough in silhouette and spacing. Make one or two small visual adjustments only if the board context exposes a production-only mismatch.

- [ ] **Step 4: Re-run focused tests if visual adjustments changed source**

Run: `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/ChatPanel.test.js`
Expected: PASS

### Task 4: Record The Production Integration

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 1: Update progress log**

Record:
- the desktop production integration outcome,
- any panel-prop seam added,
- test/lint/browser verification.

- [ ] **Step 2: Update durable notes**

Capture the final production rule:
- desktop `LeftMetaRail` now uses the side-tab ribbon treatment,
- mobile remains unchanged,
- `GameLogPanel` and `ChatPanel` remain content bodies rather than owning the ribbon layout.

- [ ] **Step 3: Final cleanliness check**

Run: `git diff --check -- app/catana/components/LeftMetaRail.js app/catana/components/GameLogPanel.js app/catana/components/ChatPanel.js app/catana/__tests__/LeftMetaRail.test.js docs/agent/NOTES.md docs/agent/PROGRESS.md`
Expected: no whitespace or merge-marker issues in touched files.
