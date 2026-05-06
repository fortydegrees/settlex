# Catana Mobile Game Shell Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a functional mobile portrait Catana game shell modeled on the approved Image 3 direction: board-first, compact opponent info, floating log/chat, local player cockpit, turn context strip, and one primary contextual action.

**Architecture:** Keep the authoritative game screen and board rendering intact. Add mobile-specific HUD markup for the bottom cockpit and narrow-screen shell, while extracting reusable action/state derivation from the current desktop `PlayerActionContainer` so desktop and mobile share the same rule checks and move handlers.

**Tech Stack:** Next.js App Router, React, Tailwind, existing Catana JS components, boardgame.io, `@settlex/game-core`, Vitest/source tests, `/catana/dev/sandbox`, `/catana/dev/viewports`.

---

## File Structure

- Create `app/catana/components/useLocalPlayerDockModel.js`
  - Shared hook/model for local resources, build/trade/dev actions, dev-card visibility, timer formatting, and turn-control mode.
- Modify `app/catana/components/PlayerActionContainer.js`
  - Replace duplicated local action derivation with `useLocalPlayerDockModel`.
  - Preserve desktop markup and behavior.
- Create `app/catana/components/MobileTurnContextStrip.js`
  - Thin strip showing timer, stage copy, and last roll/dice result.
- Create `app/catana/components/MobilePrimaryTurnButton.js`
  - Large bottom CTA for `Roll Dice`, `End Turn`, and later contextual actions.
- Create `app/catana/components/MobilePlayerCockpit.js`
  - Mobile bottom cockpit: local avatar/resources, embedded Trade/Build/Dev actions, turn context strip, primary CTA.
- Optionally create `app/catana/components/MobileGameTopBar.js`
  - Compact top utility/status row if the existing utility cluster cannot be tuned cleanly.
- Modify `app/catana/components/LeftMetaRail.js`
  - Reposition mobile Log/Chat buttons above the cockpit on phone.
- Modify `app/catana/GameScreen.js`
  - Detect phone layout, swap desktop local HUD for mobile cockpit, and avoid rendering desktop opponent/local HUD collisions.
- Add tests:
  - `app/catana/__tests__/MobileTurnContextStrip.test.js`
  - `app/catana/__tests__/MobilePlayerCockpit.source.test.js`
  - Focused updates to existing `PlayerActionContainer` / `TurnControlCluster` tests if extraction affects source expectations.
- Update docs:
  - `docs/agent/PROGRESS.md`
  - `docs/agent/NOTES.md`

---

## Task 0: Baseline Cleanup And Worktree

**Files:**
- No feature files yet.
- Current dirty files must be reviewed outside this plan before implementation starts.

- [ ] **Step 1: Inspect current dirty state**

Run:

```bash
git status --short
```

Expected: Existing dirty HUD/effects/doc changes are visible. Decide whether they are the desired baseline for the mobile work.

- [ ] **Step 2: Preserve desired current work**

If the current dirty changes are the intended baseline, commit or otherwise preserve them before creating the mobile worktree.

Run after staging the intended baseline:

```bash
git status --short
git diff --cached --stat
```

Expected: Only intended baseline changes are staged.

- [ ] **Step 3: Create isolated worktree**

Use `superpowers:using-git-worktrees`.

Preferred branch:

```bash
codex/mobile-game-shell
```

Expected: A clean worktree exists and implementation happens there.

- [ ] **Step 4: Verify baseline route**

Run the existing dev server or start one:

```bash
pnpm dev
```

Open:

```text
http://localhost:3000/catana/dev/viewports
```

Expected: The viewport wall renders and `390x844` shows the current broken/desktop-like mobile state as the visual baseline.

---

## Task 1: Extract Shared Local Dock Model

**Files:**
- Create: `app/catana/components/useLocalPlayerDockModel.js`
- Modify: `app/catana/components/PlayerActionContainer.js`
- Test: existing focused PlayerActionContainer tests

- [ ] **Step 1: Move timer formatting and low-timer helpers**

Move these helpers out of `PlayerActionContainer.js` into `useLocalPlayerDockModel.js`:

```js
const LOW_TIMER_THRESHOLD_SECONDS = 5;
const LOW_TIMER_ALERT_SUPPRESSED_STATUS_KINDS = new Set([
  "waiting_for_roll",
  "waiting_for_roll_other"
]);
const LOW_TIMER_ALERT_SUPPRESSED_STATUS_TYPES = new Set(["rolling"]);

export const getTimerSeconds = (ms) => {
  if (ms == null) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor(ms / 1000));
};

export const formatTimer = (ms) => {
  if (ms == null) return null;
  const total = getTimerSeconds(ms);
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};
```

- [ ] **Step 2: Extract action/resource derivation into a hook**

Create `useLocalPlayerDockModel(...)` that returns:

```js
{
  resourceCounts,
  totalResources,
  isOverLimit,
  visibleDevCards,
  showDevCardBay,
  devPlayableCountsByType,
  dynamicActions,
  canTradeNow,
  canQuickTradeResource,
  handleResourceClick,
  timerText,
  showStatusTimer,
  isLowTimerAlertActive,
  turnControlMode
}
```

Keep callbacks supplied by callers rather than moving DOM-specific launch rect logic into the hook.

- [ ] **Step 3: Refactor desktop component to use hook**

Update `PlayerActionContainer.js` so desktop markup consumes the hook output and preserves the existing DOM ids:

```text
p{playerId}-{resource}
p{playerId}-resources
p{playerId}-devcards
p{playerId}-longest-road
p{playerId}-largest-army
```

- [ ] **Step 4: Run focused regression tests**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/PlayerActionBadges.test.js app/catana/__tests__/PlayerActionContainer.hitbox.test.js app/catana/__tests__/Dock.buildPickupUx.test.js --reporter=dot
pnpm exec eslint app/catana/components/PlayerActionContainer.js app/catana/components/useLocalPlayerDockModel.js
```

Expected: Existing desktop behavior still passes.

---

## Task 2: Mobile Turn Context Strip

**Files:**
- Create: `app/catana/components/MobileTurnContextStrip.js`
- Test: `app/catana/__tests__/MobileTurnContextStrip.test.js`

- [ ] **Step 1: Write tests for displayed context**

Test these states:

```js
it("shows pre-roll timer and roll instruction", () => {});
it("shows rolled dice result after roll", () => {});
it("shows opponent turn, roll result, and timer while waiting", () => {});
it("omits timer when showTimer is false", () => {});
```

- [ ] **Step 2: Implement `MobileTurnContextStrip`**

Props:

```js
{
  mode,
  statusText,
  timerText,
  showTimer,
  isTimerLow,
  diceRoll,
  activePlayerName,
  isViewerTurn
}
```

Rendering rules:

- Pre-roll viewer turn: `01:25 / Roll to start turn`
- Post-roll viewer turn: `01:08 / Rolled 8 / dice icons`
- Opponent turn: `Visitor 3 / Rolled 8 / 01:08`
- Waiting pre-roll opponent: `Visitor 3 to roll / 01:08`

- [ ] **Step 3: Run tests**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/MobileTurnContextStrip.test.js --reporter=dot
pnpm exec eslint app/catana/components/MobileTurnContextStrip.js app/catana/__tests__/MobileTurnContextStrip.test.js
```

Expected: Tests pass.

---

## Task 3: Mobile Primary Turn Button

**Files:**
- Create: `app/catana/components/MobilePrimaryTurnButton.js`
- Test: covered by source/render tests in Task 4 unless behavior becomes complex.

- [ ] **Step 1: Implement state-based CTA**

Props:

```js
{
  mode,
  canRoll,
  canEnd,
  onRoll,
  onEndTurn,
  isBusy
}
```

Rules:

- `mode === "roll"`: render yellow `Roll Dice`, call `onRoll`.
- `mode === "endTurn"`: render lime `End Turn`, call `onEndTurn`.
- `mode === "inactive"`: render no large CTA for MVP, or a subdued non-interactive `Waiting` strip only if visual balance requires it.

- [ ] **Step 2: Add accidental-end-turn guard points**

Do not add routine confirm. Leave normal `End Turn` single tap. Confirm only later for incomplete/destructive states:

```text
active build pickup
pending trade offer
discard selection
robber/steal selection
unsaved modal state
```

- [ ] **Step 3: Run lint**

Run:

```bash
pnpm exec eslint app/catana/components/MobilePrimaryTurnButton.js
```

Expected: Passes.

---

## Task 4: Mobile Player Cockpit

**Files:**
- Create: `app/catana/components/MobilePlayerCockpit.js`
- Test: `app/catana/__tests__/MobilePlayerCockpit.source.test.js`

- [ ] **Step 1: Add source/render guard test**

Assert the component imports and composes:

```js
expect(source).toContain("MobileTurnContextStrip");
expect(source).toContain("MobilePrimaryTurnButton");
expect(source).toContain("useLocalPlayerDockModel");
expect(source).toContain("PlayerAvatarStats");
```

- [ ] **Step 2: Implement mobile cockpit layout**

Structure:

```text
fixed bottom safe-area container
  cockpit glass panel
    avatar + VP
    compact resource rail
    Trade / Build / Dev Cards embedded actions
  MobileTurnContextStrip
  MobilePrimaryTurnButton
```

Use existing `PlayerAvatarStats` for local identity if it fits; otherwise render a small local-only avatar tile using the same color/VP logic in a follow-up.

- [ ] **Step 3: Dev card MVP behavior**

For MVP, show one compact `Dev Cards` chip/stack with count. Tap should use existing dev-card flow where possible. If full play selection needs more UI, defer a dedicated bottom sheet and open the current dev-card interaction path.

- [ ] **Step 4: Run checks**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/MobilePlayerCockpit.source.test.js --reporter=dot
pnpm exec eslint app/catana/components/MobilePlayerCockpit.js app/catana/components/MobilePrimaryTurnButton.js app/catana/components/MobileTurnContextStrip.js
```

Expected: Passes.

---

## Task 5: Wire Mobile HUD Into GameScreen

**Files:**
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/components/PlayerActionContainer.js` only if prop shape needs final adjustment.
- Test: source guard or focused existing GameScreen tests.

- [ ] **Step 1: Add phone layout flag**

Near `useWindowSize()`:

```js
const isPhoneLayout = width > 0 && width < 640;
```

- [ ] **Step 2: Hide desktop local action HUD on phone**

Render:

```jsx
{isPhoneLayout ? (
  <MobilePlayerCockpit ... />
) : (
  <PlayerActionContainer ... />
)}
```

Use the same handlers currently passed to `PlayerActionContainer`.

- [ ] **Step 3: Keep 1v1 opponent info simple**

For MVP, continue using the existing opponent avatar/stat/card treatment where practical. If it visually collides, wrap/scale it for phone rather than building a full opponent carousel.

- [ ] **Step 4: Run focused checks**

Run:

```bash
pnpm exec eslint app/catana/GameScreen.js app/catana/components/MobilePlayerCockpit.js
pnpm exec vitest run app/catana/__tests__/GameScreen.statusPresentation.test.js app/catana/__tests__/GameScreen.gameOver.test.js --reporter=dot
```

Expected: No regressions.

---

## Task 6: Reposition Mobile Log/Chat

**Files:**
- Modify: `app/catana/components/LeftMetaRail.js`
- Test: existing `LeftMetaRail.test.js` if source expectations apply.

- [ ] **Step 1: Move mobile rail above cockpit**

Update mobile rail positioning from bottom-anchored desktop leftovers to a phone cockpit-aware stack:

```text
left: 0.75rem
bottom: cockpit height + 0.75rem
```

Keep both buttons stacked on the left for MVP.

- [ ] **Step 2: Ensure opened drawer clears cockpit**

Mobile drawer should open above or beside the buttons without covering the primary CTA unless intentionally modal.

- [ ] **Step 3: Run checks**

Run:

```bash
pnpm exec eslint app/catana/components/LeftMetaRail.js
pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js --reporter=dot
```

Expected: Passes or source tests are updated to reflect the new phone position.

---

## Task 7: Board Fit And Visual Tuning

**Files:**
- Modify: `app/catana/GameScreen.js`
- Possibly modify: `app/catana/utils/boardLayout.js` if an existing board layout helper already owns initial scale/offset.

- [ ] **Step 1: Keep board overlay model for MVP**

Do not rewrite the board into a reserved CSS layout. Keep zoom/pan/pinch. The MVP target is a better initial fit, not a perfect safe-area board layout.

- [ ] **Step 2: Tune initial phone board fit**

In phone layout, ensure the initial board is not hidden behind the cockpit at `390x844`. If needed, adjust initial transform/default scale through the existing board/transform path.

- [ ] **Step 3: Verify viewport wall**

Open:

```text
http://localhost:3000/catana/dev/viewports
```

Check:

```text
390x844 phone portrait
844x390 phone landscape
1440x900 laptop sanity
```

Expected:

- phone portrait has usable cockpit and readable board
- log/chat buttons are accessible
- desktop layout unchanged

---

## Task 8: Final Verification And Docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 1: Run focused automated checks**

Run:

```bash
pnpm exec eslint app/catana/GameScreen.js app/catana/components/PlayerActionContainer.js app/catana/components/useLocalPlayerDockModel.js app/catana/components/MobilePlayerCockpit.js app/catana/components/MobilePrimaryTurnButton.js app/catana/components/MobileTurnContextStrip.js app/catana/components/LeftMetaRail.js
pnpm exec vitest run app/catana/__tests__/MobileTurnContextStrip.test.js app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/PlayerActionBadges.test.js app/catana/__tests__/PlayerActionContainer.hitbox.test.js app/catana/__tests__/LeftMetaRail.test.js --reporter=dot
git diff --check
```

Expected: Passes.

- [ ] **Step 2: Visual check**

Use `/catana/dev/viewports`.

Capture a screenshot of `390x844` and optionally full viewport wall:

```bash
mkdir -p output/playwright
```

Expected: Image 3-style mobile shell is functional enough to play a turn.

- [ ] **Step 3: Update docs**

Add notes:

- mobile shell direction
- bottom cockpit owns timer/action context
- log/chat float above cockpit
- opponent info for MVP remains simple/1v1
- board remains pan/zoom overlay for MVP

- [ ] **Step 4: Commit**

After review:

```bash
git add app/catana docs/agent
git commit -m "feat: add Catana mobile game shell"
```

Expected: One focused feature commit on `codex/mobile-game-shell`.
