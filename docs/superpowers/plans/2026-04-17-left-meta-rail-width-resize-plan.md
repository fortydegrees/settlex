# Left Meta Rail Width Resize Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add desktop-only shared-width resizing for the left meta rail, with persisted width and persisted desktop open/closed state.

**Architecture:** Keep the current desktop side-tab shell and row behavior intact, but replace the fixed panel width with a shared persisted `panelWidth` preference owned by `DesktopMetaDock`. Add a local-storage-backed preferences helper for width/open state normalization and an invisible right-edge resize hit area on open panels. Reserve `panelHeights` in the stored preferences shape for a later height-resize pass, but do not implement height dragging now.

**Tech Stack:** React, GSAP, Vitest, Chrome DevTools, localStorage, SVG path geometry, Tailwind utility classes

---

### Task 1: Lock the Persistence and Width Contract in Tests

**Files:**
- Create: `app/catana/__tests__/leftMetaRailPreferences.test.js`
- Modify: `app/catana/__tests__/LeftMetaRail.test.js`
- Verify: `app/catana/utils/leftMetaRailPreferences.js`
- Verify: `app/catana/components/LeftMetaRail.js`

- [ ] **Step 1: Write the failing preferences tests**

Cover:
- default desktop prefs use both open panels and the default width
- width clamps to the min and max bounds
- invalid storage falls back safely
- persisted prefs reserve `panelHeights`

- [ ] **Step 2: Run the targeted preferences test to confirm it fails**

Run: `pnpm exec vitest run app/catana/__tests__/leftMetaRailPreferences.test.js`

Expected: FAIL because the preferences helper does not exist yet.

- [ ] **Step 3: Write the failing desktop rail source/runtime guard**

Update `LeftMetaRail.test.js` so it expects:
- persisted desktop prefs wiring instead of ephemeral-only `openPanels`
- a live width default around `350px`
- shared desktop resize wiring rather than a fixed `448px` panel width constant

- [ ] **Step 4: Run the targeted rail test to confirm it fails**

Run: `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js`

Expected: FAIL because the rail still uses a fixed panel width and no persisted prefs helper.

### Task 2: Add the Desktop Preferences Helper

**Files:**
- Create: `app/catana/utils/leftMetaRailPreferences.js`
- Test: `app/catana/__tests__/leftMetaRailPreferences.test.js`

- [ ] **Step 1: Implement width-bound helpers and normalized defaults**

Add:
- storage key constant
- min/default/max width constants
- width clamp helper
- prefs normalization helper

- [ ] **Step 2: Implement local-storage read/write helpers**

Add:
- safe read helper
- safe write helper
- reserved `panelHeights` shape
- open-panel normalization

- [ ] **Step 3: Run the targeted preferences test to confirm it passes**

Run: `pnpm exec vitest run app/catana/__tests__/leftMetaRailPreferences.test.js`

Expected: PASS

### Task 3: Replace the Fixed Width in LeftMetaRail

**Files:**
- Modify: `app/catana/components/LeftMetaRail.js`
- Verify: `app/catana/__tests__/LeftMetaRail.test.js`

- [ ] **Step 1: Thread a live panel width through the desktop shell**

Replace the fixed width constant usage with a live `panelWidth` value for:
- shell SVG width
- shell SVG viewBox
- shell path right edge
- panel body width

- [ ] **Step 2: Make `DesktopMetaDock` own persisted desktop prefs**

Read normalized prefs on mount and store:
- `openPanels`
- `panelWidth`

Persist updates for open/closed state and width.

- [ ] **Step 3: Keep current vertical behavior unchanged**

Ensure:
- row height logic is untouched
- button geometry is untouched
- mobile rail remains unchanged

- [ ] **Step 4: Run the rail test to confirm the width contract passes**

Run: `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js`

Expected: PASS

### Task 4: Add the Desktop Resize Interaction

**Files:**
- Modify: `app/catana/components/LeftMetaRail.js`
- Verify: `app/catana/__tests__/LeftMetaRail.test.js`

- [ ] **Step 1: Add an invisible right-edge resize hit area for open panels**

The hit area should:
- only render when the panel chrome is open
- use `cursor: ew-resize`
- not add any permanent visible UI

- [ ] **Step 2: Implement pointer-based drag-resize**

Use pointer events to:
- capture the pointer on drag start
- update the shared width live on move
- clamp every width update
- end resize cleanly on pointer up/cancel

- [ ] **Step 3: Keep persistence coherent during resize**

Ensure:
- width stays responsive while dragging
- persisted width reflects the final clamped value
- reload restores the resized width

- [ ] **Step 4: Run the focused rail tests again**

Run: `pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/leftMetaRailPreferences.test.js`

Expected: PASS

### Task 5: Verify in the Sandbox and Record the Change

**Files:**
- Modify: `docs/agent/NOTES.md`
- Modify: `docs/agent/PROGRESS.md`
- Verify: `http://127.0.0.1:3000/catana/dev/sandbox`

- [ ] **Step 1: Browser-check narrow/default/wide widths**

Verify in `/catana/dev/sandbox`:
- default width around `350px`
- drag stops at min and max
- connector curve stays intact

- [ ] **Step 2: Browser-check persistence**

Verify:
- open/closed state survives reload
- resized width survives reload

- [ ] **Step 3: Update notes and progress**

Record:
- storage key and prefs shape
- default/min/max width behavior
- width-only implementation with future height slot reserved

- [ ] **Step 4: Run the full verification set**

Run:
- `pnpm exec vitest run app/catana/__tests__/leftMetaRailPreferences.test.js app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/renderPerfGuards.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/ChatPanel.test.js`
- `pnpm exec eslint app/catana/components/LeftMetaRail.js app/catana/utils/leftMetaRailPreferences.js app/catana/__tests__/leftMetaRailPreferences.test.js app/catana/__tests__/LeftMetaRail.test.js app/catana/components/GameLogPanel.js app/catana/components/ChatPanel.js app/catana/components/FeedPanel.js app/catana/components/FeedPanelScrollState.js app/catana/__tests__/renderPerfGuards.test.js`
- `git diff --check -- app/catana/components/LeftMetaRail.js app/catana/utils/leftMetaRailPreferences.js app/catana/__tests__/leftMetaRailPreferences.test.js app/catana/__tests__/LeftMetaRail.test.js docs/agent/NOTES.md docs/agent/PROGRESS.md docs/superpowers/specs/2026-04-17-left-meta-rail-width-resize-design.md docs/superpowers/plans/2026-04-17-left-meta-rail-width-resize-plan.md`

Expected:
- all targeted Vitest files pass
- eslint exits 0
- `git diff --check` reports no whitespace errors
