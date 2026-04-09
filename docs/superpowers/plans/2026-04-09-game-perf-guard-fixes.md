# Game Perf Guard Fixes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the board underlay discoverable on initial paint and stop timer-driven rerenders from needlessly re-rendering the heavy board subtree.

**Architecture:** Seed Catana viewport sizing with a shared fallback size so the board underlay can render in the initial HTML, and mark the underlay image as high priority. Memo-wrap the heavy board component and route `GameScreen` through the memoized export so `nowMs` ticker updates do not drag the board through rerenders.

**Tech Stack:** Next.js app router, React 18, Vitest source/unit tests

---

### Task 1: Add failing perf guards

**Files:**
- Modify: `app/catana/__tests__/renderPerfGuards.test.js`
- Create: `app/catana/__tests__/useWindowSize.test.js`
- Create: `app/catana/__tests__/BoardUnderlay.render.test.js`

- [ ] Add a failing source guard for memoized board rendering and removal of the debug render log.
- [ ] Add a failing unit test for the initial viewport-size helper.
- [ ] Add a failing render test for board underlay fetch priority.
- [ ] Run targeted Vitest commands and confirm the new checks fail for the expected reasons.

### Task 2: Implement the minimal production changes

**Files:**
- Modify: `app/catana/utils/useWindowSize.js`
- Modify: `app/catana/BoardUnderlay.js`
- Modify: `app/catana/Board.js`
- Modify: `app/catana/GameScreen.js`

- [ ] Add a shared default viewport size helper and initialize `useWindowSize` from it.
- [ ] Mark the underlay image as high-priority.
- [ ] Memo-wrap the heavy board component and remove the debug `board render` log.
- [ ] Update `GameScreen` to render the memoized board export.

### Task 3: Verify and document

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] Run the targeted Vitest suite and confirm it passes.
- [ ] Update agent progress and notes with the perf fix details and the `8000`/`8080` dev-routing gotcha observed during profiling.
