# Bottom-Right Turn Control Refinement Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine Catana's bottom-right turn controls so the status/timer becomes a single translucent glass strip, the existing dice treatment remains visually separate from `End turn`, and the `End turn` CTA feels softer and more native to the rest of the HUD.

**Architecture:** Keep the current `TurnControlCluster` integration and state model intact. Limit this slice to presentation changes inside the cluster: merge timer + status into one row, preserve the existing roll/end/inactive modes, restore roll dice as a standalone affordance above the lower rail, and restyle the CTA shell/core so it no longer relies on a loud always-on border or chunky bottom shadow.

**Tech Stack:** React (JavaScript), Tailwind utility classes, inline style objects for custom glass surfaces, Vitest, pnpm, Catana sandbox

---

## File Structure

### Turn-control presentation

- Modify: `app/catana/components/TurnControlCluster.js`
  - Replace the stacked timer/status chips with one integrated glass strip.
  - Keep the roll content path sourced from `PlayerActionContainer`, but render it as standalone dice above the lower rail instead of inside the `End turn` CTA slot.
  - Soften the end-turn CTA shell/core and mute inactive states.

### Turn-control regression coverage

- Modify: `app/catana/__tests__/TurnControlCluster.test.js`
  - Lock the new integrated strip structure and the three button-mode variants.
- Modify: `app/catana/__tests__/PlayerActionContainer.hitbox.test.js`
  - Update source expectations that still assume the old stacked timer/status chip layout.

### Docs

- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`
  - Record the refined glass-strip decision and future-agent guidance about the timer layout / CTA treatment.

## Assumptions To Keep During Implementation

- Do not change the authoritative state flow, timer logic, or button-mode resolution.
- Keep numeric timer text and existing `gameStatus.title` copy pipeline intact.
- Keep roll dice content sourced from `PlayerActionContainer`; do not invent a second dice display path here.
- Keep `End turn` as its own lower CTA. Roll mode should show standalone dice above the rail and a neutral unavailable lower button.
- The integrated strip should stay readable when inactive or during forced-response states.
- Avoid hard always-on borders and heavy inset/drop shadows on the CTA.

## Execution Notes

- Use `@test-driven-development` for the render/source guards before editing the component.
- Use `/catana/dev/sandbox` on the feature-branch dev server for visual verification.
- Before any completion claim, use `@verification-before-completion`.

### Task 1: Lock the refined strip structure in tests

**Files:**
- Modify: `app/catana/__tests__/TurnControlCluster.test.js`
- Modify: `app/catana/__tests__/PlayerActionContainer.hitbox.test.js`

- [x] **Step 1: Update the render/source expectations to the new integrated strip**
- [x] **Step 2: Run the focused tests and verify they fail against the current stacked-chip implementation**
- [x] **Step 3: Confirm the failures are about the old layout/state markers, not a broken test harness**

### Task 2: Implement the refined turn-control presentation

**Files:**
- Modify: `app/catana/components/TurnControlCluster.js`

- [x] **Step 4: Replace the stacked timer/status layout with a single strip containing an optional timer segment**
- [x] **Step 5: Restore roll-mode dice as a standalone affordance while keeping the lower CTA reserved for end-turn**
- [x] **Step 6: Restyle the end-turn CTA to the approved softer glass + lime treatment**
- [x] **Step 7: Mute inactive presentation without collapsing the footprint**

### Task 3: Verify and document the refinement

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [x] **Step 8: Run the focused Vitest suite and confirm green**
- [x] **Step 9: Check the sandbox visually on the feature-branch dev server**
- [x] **Step 10: Record the refinement outcome and future-agent guidance in the agent docs**
