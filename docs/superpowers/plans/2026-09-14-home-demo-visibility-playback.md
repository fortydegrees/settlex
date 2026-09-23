# Homepage Demo Visibility Playback Implementation Plan

> **For agentic workers:** Follow the plan checklist. Use superpowers:executing-plans for inline execution. Use superpowers:subagent-driven-development when explicitly requested or when substantial independent tasks justify separate implementers and reviews. Preserve any project-required review and approval gates. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the homepage ambient board animation at normal pacing when the browser tab is hidden and shown again, without changing the scene-generation or visual-design model.

**Architecture:** Add a small event-driven, pausable timeout scheduler for the homepage demo. `HomeDemoEffectBridge` will pause scheduled starts/commits/resets on `visibilitychange`, preserve remaining visible-time delays, and resume without replaying hidden time. The shared placement runner will expose scoped cleanup for transient GSAP effects so the homepage can settle active presentation into committed React state when hidden or unmounted.

**Tech Stack:** React hooks, browser `visibilitychange`, `setTimeout`, GSAP, Vitest, Playwright/browser verification.

## Global Constraints

- Preserve the existing curated scenes, seeded procedural event generation, board-state reducer, and shared placement visuals.
- Keep the change homepage-scoped; do not change live-game timing or globally pause GSAP.
- Use pnpm; do not modify `package-lock.json`.
- Preserve unrelated dirty work in the current checkout; do not reset, merge, push, deploy, or commit it.
- Keep hidden-tab playback paused in logical visible time; do not catch up missed ambient events in a burst.
- Preserve reduced-motion behavior and clean up timers, visibility listeners, and transient placement elements.

---

### Task 1: Add the pausable homepage scheduler

**Files:**
- Create: `app/catana/homeDemo/homeDemoPlayback.js`
- Test: `app/catana/__tests__/homeDemoPlayback.test.js`

**Interfaces:**
- Produces `createPausableTimeoutScheduler({ setTimeoutImpl, clearTimeoutImpl, nowImpl, initiallyPaused })` with `schedule(callback, delayMs)`, `pause()`, `resume()`, and `clear()` methods.
- A scheduled callback stores its remaining visible-time delay; `pause()` cancels native timers and subtracts only elapsed foreground time; `resume()` arms each callback with its remaining delay.

**Verification shape:** Behavioral TDD with deterministic injected clock/timer functions.

- [x] **Step 1: Write the failing scheduler tests.** Cover two callbacks preserving their relative delays across a long hidden interval, scheduling while initially paused, and cleanup preventing callbacks after `clear()`.
- [x] **Step 2: Verify the tests fail for the missing scheduler.**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/homeDemoPlayback.test.js --reporter=dot
```

Expected: FAIL because `homeDemoPlayback.js` does not yet export the scheduler.

- [x] **Step 3: Implement the minimal injected scheduler.** Keep it event-driven; do not add a frame loop, scene knowledge, React state, or GSAP dependency.
- [x] **Step 4: Verify the focused scheduler tests pass.**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/homeDemoPlayback.test.js --reporter=dot
```

Expected: PASS with all scheduler cases green.

### Task 2: Give placement effects scoped cleanup ownership

**Files:**
- Modify: `app/catana/effects/placePiece.js:330-660`
- Create: `app/catana/__tests__/effects/placePieceCleanup.test.js`

**Interfaces:**
- `createPiecePlacementRunner(...)` continues to be callable as `runner(payload)` for live-game callers and additionally exposes `runner.cancelAll()` for the owning homepage bridge.
- `runner.cancelAll()` kills only timelines created by that runner and removes their temporary elements; it does not affect other GSAP timelines or static React pieces.

**Verification shape:** Focused runner cleanup behavior coverage plus ESLint.

- [x] **Step 1: Add a regression test for runner-owned cancellation.** Exercise two placement runners and verify that cancelling one kills/removes only its own effect.
- [x] **Step 2: Verify the new expectation fails against the current runner.**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/effects/placePieceCleanup.test.js --reporter=dot
```

Expected: FAIL because the current runner has no scoped cleanup API.

- [x] **Step 3: Implement runner-local timeline tracking.** Route settlement, city, and road temporary elements through the tracker; remove them on normal completion and on `cancelAll()`.
- [x] **Step 4: Verify the focused cleanup tests and lint pass.**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/effects/placePieceCleanup.test.js --reporter=dot
pnpm exec eslint app/catana/effects/placePiece.js app/catana/__tests__/effects/placePieceWiring.test.js
```

Expected: both commands exit 0.

### Task 3: Integrate visibility-aware playback into the homepage bridge

**Files:**
- Modify: `app/catana/homeDemo/HomeDemoEffectBridge.js:1-225`

**Interfaces:**
- The bridge keeps the current scene and piece state, pauses all scheduled callbacks while `document.hidden` is true, and resumes them with remaining visible-time delays.
- When hidden, started-but-not-committed demo events are committed immediately and active transient placement effects are cancelled, so returning never reveals a partial or accelerated effect.

**Verification shape:** Focused scheduler/cleanup behavior coverage plus manual real-route hidden-tab check.

- [x] **Step 1: Replace bridge-local timer bookkeeping with the scheduler.** Keep scene event order, setup timing, commit lead, reset hold, reduced-motion state, and current placement payloads unchanged.
- [x] **Step 2: Wire visibility interruption and cleanup.** Pause before hidden callbacks can accumulate, commit any started event that was not yet committed, cancel only homepage placement effects, and resume pending callbacks on visibility return.
- [x] **Step 3: Verify the focused bridge/effect tests and lint pass.**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/homeDemoPlayback.test.js app/catana/__tests__/effects/placePieceCleanup.test.js app/catana/__tests__/effects/placePieceWiring.test.js app/catana/__tests__/HomeDemoBoard.source.test.js --reporter=dot
pnpm exec eslint app/catana/homeDemo/HomeDemoEffectBridge.js app/catana/homeDemo/homeDemoPlayback.js app/catana/effects/placePiece.js app/catana/__tests__/homeDemoPlayback.test.js app/catana/__tests__/effects/placePieceCleanup.test.js app/catana/__tests__/effects/placePieceWiring.test.js app/catana/__tests__/HomeDemoBoard.source.test.js
```

Expected: all focused tests pass and ESLint exits 0.

### Task 4: Verify the real homepage behavior and record the change

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Interfaces:**
- No new public product API; the verification target is the real homepage route and the existing Catana ambient-board presentation.

**Verification shape:** Browser/manual lifecycle verification plus focused repository checks.

- [x] **Step 1: Start or reuse the local homepage server and open `/` at `1440x900`.** Confirm the measured board and ambient placements render. The unauthenticated local page reports only its existing `401 /api/match-alerts` request.
- [x] **Step 2: Capture the baseline event cadence.** Observe a placement, pause the page's visibility state for at least 5 seconds, return, and confirm no burst/catch-up sequence occurs.
- [x] **Step 3: Repeat the hidden-tab check during an in-flight placement.** Confirm the board returns to coherent static state and future placements retain normal spacing.
- [x] **Step 4: Check unmount cleanup where practical.** Confirm the runner cleanup contract and scheduler cleanup tests pass; reduced-motion code paths are unchanged.
- [x] **Step 5: Run the final focused verification and inspect the diff.**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/homeDemoPlayback.test.js app/catana/__tests__/effects/placePieceWiring.test.js app/catana/__tests__/HomeDemoBoard.source.test.js --reporter=dot
pnpm exec eslint app/catana/homeDemo/HomeDemoEffectBridge.js app/catana/homeDemo/homeDemoPlayback.js app/catana/effects/placePiece.js app/catana/__tests__/homeDemoPlayback.test.js app/catana/__tests__/effects/placePieceWiring.test.js app/catana/__tests__/HomeDemoBoard.source.test.js
git diff --check -- app/catana/homeDemo/HomeDemoEffectBridge.js app/catana/homeDemo/homeDemoPlayback.js app/catana/effects/placePiece.js app/catana/__tests__/homeDemoPlayback.test.js app/catana/__tests__/effects/placePieceWiring.test.js app/catana/__tests__/HomeDemoBoard.source.test.js docs/agent/PROGRESS.md docs/agent/NOTES.md
```

Expected: all focused tests/lint pass, diff check is clean, and unrelated dirty files remain unchanged.
