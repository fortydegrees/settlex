# Sidebar Connection Overlap And Lift Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the tiny both-open panel overlap in `/catana/dev/sidebar-connection` and lift the open side-tab shell slightly higher while keeping the dock button fixed.

**Architecture:** Keep the current side-tab ribbon structure in `SidebarConnectionClient.js`. Fix the bug by separating visual lift from row-spacing reservation: a small constant tweak raises the shell, while `getSideTabRowHeight()` reserves the full occupied open footprint instead of subtracting the negative lifted top offset. Keep verification focused on the existing source guard plus the dev-only route behavior.

**Tech Stack:** React, GSAP, Vitest, ESLint

---

### Task 1: Lock The Intended Geometry In Tests

**Files:**
- Modify: `app/catana/__tests__/SidebarConnectionStudy.source.test.js`
- Test: `app/catana/__tests__/SidebarConnectionStudy.source.test.js`

- [ ] **Step 1: Write the failing test**

Add or update a source guard that expects:
- a slightly larger `SIDE_TAB_PANEL_OPEN_LIFT`,
- both-open row spacing to reserve `panel.height + SIDE_TAB_OPEN_PANEL_GAP`,
- the fixed button-top behavior to remain unchanged.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run app/catana/__tests__/SidebarConnectionStudy.source.test.js`
Expected: FAIL because the current source still uses the older lift constant and the under-reserved row-height expression.

- [ ] **Step 3: Write minimal implementation**

Update only the side-tab constants and row-height calculation in `app/catana/dev/sidebar-connection/SidebarConnectionClient.js`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run app/catana/__tests__/SidebarConnectionStudy.source.test.js`
Expected: PASS

- [ ] **Step 5: Run focused lint verification**

Run: `pnpm exec eslint app/catana/dev/sidebar-connection/page.js app/catana/dev/sidebar-connection/SidebarConnectionClient.js app/catana/__tests__/SidebarConnectionStudy.source.test.js`
Expected: PASS

### Task 2: Record Completion Notes

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 1: Update progress log**

Record:
- the overlap root cause,
- the chosen lift adjustment,
- the verification commands and manual route check.

- [ ] **Step 2: Update durable notes**

Record the final geometry rule:
- shell can lift independently,
- both-open row reservation must use full occupied panel height,
- keep the fixed button stack model.

- [ ] **Step 3: Re-run focused verification if docs edits touched command lists**

Run: `pnpm exec vitest run app/catana/__tests__/SidebarConnectionStudy.source.test.js`
Expected: PASS

- [ ] **Step 4: Final cleanliness check**

Run: `git diff --check`
Expected: no whitespace or merge-marker issues in touched files.
