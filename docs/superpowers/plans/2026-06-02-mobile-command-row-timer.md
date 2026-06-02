# Mobile Command Row Timer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an always-reserved timer slot to Catana's mobile bottom command row without stealing the primary action/status surface.

**Architecture:** Reuse the existing timer model from `useLocalPlayerDockModel` and render it as a third command-row column inside `MobilePlayerCockpit`. Keep the timer as presentation-only chrome: stale/pre-game/game-over timers remain hidden by existing status logic, while the bottom row keeps a stable three-column layout.

**Tech Stack:** React, JavaScript, Tailwind utility classes, Vitest source tests.

---

## File Structure

- Modify: `app/catana/__tests__/MobilePlayerCockpit.source.test.js`
  - Add source assertions that the cockpit consumes the dock timer model, renders a dedicated timer slot, uses a three-column command row, and keeps the slot stable when timer text is unavailable.
- Modify: `app/catana/__tests__/MobilePrimaryTurnButton.test.js`
  - Add source assertion for the SE-width compact button height class.
- Modify: `app/catana/components/MobilePlayerCockpit.js`
  - Destructure `timerText`, `showStatusTimer`, and `isLowTimerAlertActive` from `useLocalPlayerDockModel`.
  - Add a small local `MobileCommandTimerBox` presenter.
  - Change the command row from feed + primary/status to feed + primary/status + timer.
  - Apply SE-width compact height classes to feed/status/timer surfaces.
- Modify: `app/catana/components/MobilePrimaryTurnButton.js`
  - Apply the same SE-width compact height class to the Roll/End Turn button.
- Modify: `docs/agent/NOTES.md`
  - Record the bottom-right timer decision and the hidden-timer cases.
- Modify: `docs/agent/PROGRESS.md`
  - Record the implementation and verification commands.

## Tasks

### Task 1: Lock The Expected Command Row Shape

- [ ] **Step 1: Add failing cockpit source assertions**

Add expectations to `app/catana/__tests__/MobilePlayerCockpit.source.test.js` covering:

```js
expect(source).toContain("timerText");
expect(source).toContain("showStatusTimer");
expect(source).toContain("isLowTimerAlertActive");
expect(source).toContain("MobileCommandTimerBox");
expect(source).toContain('data-mobile-command-timer="true"');
expect(source).toContain("mobile-command-row__timer");
expect(source).toContain("grid-cols-[5.75rem_minmax(0,1fr)_4rem]");
expect(source).toContain("min-[400px]:grid-cols-[6.25rem_minmax(0,1fr)_4rem]");
expect(source).toContain('const displayTimerText = hasTimerText ? timerText : "--:--";');
expect(source).toContain("max-[380px]:h-[3.25rem]");
```

- [ ] **Step 2: Add failing primary button compact-height assertion**

Add to `app/catana/__tests__/MobilePrimaryTurnButton.test.js`:

```js
expect(source).toContain("max-[380px]:h-[3.25rem]");
```

- [ ] **Step 3: Run red verification**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/MobilePrimaryTurnButton.test.js --reporter=dot
```

Expected: FAIL because the timer presenter, three-column grid, and compact height classes are not implemented yet.

### Task 2: Render The Timer Slot

- [ ] **Step 1: Add `MobileCommandTimerBox`**

Add a local presenter in `app/catana/components/MobilePlayerCockpit.js` near `MobileMetaFeedTrigger`:

```jsx
const MobileCommandTimerBox = ({ timerText, showTimer, isLow }) => {
  const hasTimerText = showTimer && Boolean(timerText);
  const displayTimerText = hasTimerText ? timerText : "--:--";

  return (
    <div
      className={joinClassNames(
        "mobile-command-row__timer flex h-[3.85rem] min-w-0 items-center justify-center rounded-[1.15rem] border px-2 text-center text-[1rem] font-black leading-none tabular-nums shadow-[0_16px_34px_-24px_rgba(15,23,42,0.56),inset_0_1px_0_rgba(255,255,255,0.26)] backdrop-blur-xl max-[380px]:h-[3.25rem] max-[380px]:text-[0.9rem]",
        hasTimerText
          ? "border-white/[0.38] bg-white/[0.22] text-white"
          : "border-white/[0.22] bg-white/[0.1] text-white/55",
        hasTimerText && isLow
          ? "border-rose-200/75 bg-rose-400/[0.32] text-white ring-1 ring-rose-200/60"
          : null
      )}
      data-mobile-command-timer="true"
      data-mobile-command-timer-visible={hasTimerText ? "true" : "false"}
      aria-label={hasTimerText ? `Timer ${timerText}` : "Timer unavailable"}
    >
      {displayTimerText}
    </div>
  );
};
```

- [ ] **Step 2: Consume the existing timer model**

Destructure from `useLocalPlayerDockModel`:

```js
isLowTimerAlertActive,
showStatusTimer,
timerText,
```

- [ ] **Step 3: Convert the command row to three columns**

Change the row class in `MobilePlayerCockpit.js` to:

```jsx
className="grid grid-cols-[5.75rem_minmax(0,1fr)_4rem] gap-1.5 min-[400px]:grid-cols-[6.25rem_minmax(0,1fr)_4rem] min-[400px]:gap-2"
```

Render the timer after the primary/status cell:

```jsx
<MobileCommandTimerBox
  timerText={timerText}
  showTimer={showStatusTimer}
  isLow={isLowTimerAlertActive}
/>
```

### Task 3: Tune SE Row Height

- [ ] **Step 1: Compact feed/status/timer surfaces at SE width**

Add `max-[380px]:h-[3.25rem]` to the feed trigger and passive status surfaces in `MobilePlayerCockpit.js`. Keep their normal height unchanged for XR and wider screens.

- [ ] **Step 2: Compact the primary CTA at SE width**

Add `max-[380px]:h-[3.25rem]` to the base button class in `MobilePrimaryTurnButton.js`. Keep the default `h-[3.85rem]` so XR keeps the current row height.

- [ ] **Step 3: Run green verification**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/MobilePrimaryTurnButton.test.js --reporter=dot
```

Expected: PASS.

### Task 4: Update Agent Notes And Verify

- [ ] **Step 1: Update `docs/agent/NOTES.md`**

Record:

- Mobile bottom command row is now `[log/chat] [primary or passive status] [timer]`.
- The timer slot stays reserved even when the timer text is hidden.
- Hidden timer cases still come from `showStatusTimer`: pre-game, game-over, stale stage mismatch, and no current timer snapshot.

- [ ] **Step 2: Update `docs/agent/PROGRESS.md`**

Add a 2026-06-02 entry with the scoped implementation and verification commands.

- [ ] **Step 3: Run final verification**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/MobilePrimaryTurnButton.test.js --reporter=dot
pnpm exec eslint app/catana/components/MobilePlayerCockpit.js app/catana/components/MobilePrimaryTurnButton.js app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/MobilePrimaryTurnButton.test.js
git diff --check -- app/catana/components/MobilePlayerCockpit.js app/catana/components/MobilePrimaryTurnButton.js app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/MobilePrimaryTurnButton.test.js docs/agent/NOTES.md docs/agent/PROGRESS.md docs/superpowers/specs/2026-06-02-mobile-command-row-timer-design.md docs/superpowers/plans/2026-06-02-mobile-command-row-timer.md
git status --short --branch
```

Expected: tests and lint exit 0; diff check prints no whitespace errors; git status shows only expected pre-existing user changes plus this task's edits.
