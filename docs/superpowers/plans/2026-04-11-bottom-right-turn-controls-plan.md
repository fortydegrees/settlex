# Bottom-Right Turn Controls Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Catana's current bottom-right dice/status/end-turn stack with a cohesive turn-control module built from a morphing primary button plus attached timer/status chips.

**Architecture:** Keep the existing authoritative state and viewer-aware copy model intact. Add one tiny pure helper to resolve the turn-control button mode from existing `canRoll` / `canEnd` inputs, render a focused `TurnControlCluster` component for the new UI shell, and keep `PlayerActionContainer` responsible for providing current timer/status/button props and existing dice-roll animation wiring.

**Tech Stack:** React (JavaScript), Tailwind utility classes, Heroicons, existing Catana `Die` component, Vitest, pnpm

---

## File Structure

### Pure turn-control state selection

- Create: `app/catana/utils/turnControlMode.js`
  - Resolve `roll` / `endTurn` / `inactive` from existing booleans.
  - Encode the approved precedence rule: `canRoll` wins if both are transiently true.
- Create: `app/catana/__tests__/turnControlMode.test.js`
  - Lock mode selection and the precedence rule.

### Turn-control presentation

- Create: `app/catana/components/TurnControlCluster.js`
  - Render the right-side rounded-square CTA plus left-side timer/status chips.
  - Accept already-derived props such as `mode`, `statusText`, `timerText`, `showTimer`, `onRoll`, `onEndTurn`, and `rollContent`.
- Create: `app/catana/__tests__/TurnControlCluster.test.js`
  - Server-render the component and assert the three-mode structure:
    - timer chip shown/hidden correctly,
    - status chip shifts up when timer is hidden,
    - roll mode renders the supplied roll content,
    - end-turn mode renders the forward icon shell,
    - inactive mode keeps a disabled button footprint.

### PlayerActionContainer integration

- Modify: `app/catana/components/PlayerActionContainer.js`
  - Replace the current bottom-right dice/status/end-turn markup with the new cluster.
  - Keep existing timer formatting, `showStatusTimer`, dice animation wiring, and action handlers.
  - Provide roll content from the existing two animated dice.
- Modify: `app/catana/GameScreen.js`
  - Pass an explicit visibility flag for the turn-control module so replay/game-over states can hide it without affecting the rest of the player-hand surface.
- Modify: `app/catana/__tests__/PlayerActionContainer.status.test.js`
  - Keep the existing `gameStatus.title` / timer-visibility contract guards.
  - Add source guards that `PlayerActionContainer` delegates to `TurnControlCluster`.
- Modify: `app/catana/__tests__/PlayerActionContainer.hitbox.test.js`
  - Update the right-hand control-area hitbox expectations to the new container shape instead of the old fixed `w-36` stack.
- Modify: `app/catana/__tests__/GameScreen.statusPresentation.test.js`
  - Add a source guard that replay/game-over visibility is passed down to the turn-control module.

### Docs

- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`
  - Record the approved implementation baseline and any useful future-agent guidance discovered during the refactor.

## Assumptions To Keep During Implementation

- Do not change how `GameScreen` decides status copy or timer visibility.
- Keep replay/game-over hiding as a presentation gate only; do not change match-state semantics.
- Do not introduce a second status model or extra turn-state machine beyond the small presentation helper.
- The timer remains numeric-only when shown.
- The CTA stays spatially stable across `roll`, `endTurn`, and `inactive`.
- When the timer is hidden, the status chip should occupy the top-left chip position rather than leaving an empty gap.
- Low-time urgency styling may be visually prepared, but no new timer-threshold logic or ticking audio is in scope for this slice.

## Execution Notes

- Use `@test-driven-development` for each code slice.
- Keep the diff focused on the bottom-right turn-control presentation.
- Before any completion claim, use `@verification-before-completion`.
- Manual UI verification should use `/catana/dev/sandbox`.

### Task 1: Add the pure turn-control mode helper

**Files:**
- Create: `app/catana/utils/turnControlMode.js`
- Create: `app/catana/__tests__/turnControlMode.test.js`

- [ ] **Step 1: Write the failing mode-selection tests**

Create `app/catana/__tests__/turnControlMode.test.js` with cases like:

```js
import { describe, expect, it } from "vitest";
import { getTurnControlMode } from "../utils/turnControlMode";

describe("getTurnControlMode", () => {
  it("returns roll when canRoll is true", () => {
    expect(getTurnControlMode({ canRoll: true, canEnd: false })).toBe("roll");
  });

  it("returns endTurn when only canEnd is true", () => {
    expect(getTurnControlMode({ canRoll: false, canEnd: true })).toBe("endTurn");
  });

  it("prefers roll when both canRoll and canEnd are true", () => {
    expect(getTurnControlMode({ canRoll: true, canEnd: true })).toBe("roll");
  });

  it("returns inactive when neither action is available", () => {
    expect(getTurnControlMode({ canRoll: false, canEnd: false })).toBe("inactive");
  });
});
```

- [ ] **Step 2: Run the helper tests to verify RED**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/turnControlMode.test.js
```

Expected: FAIL because `turnControlMode.js` does not exist yet.

- [ ] **Step 3: Implement the minimal helper**

Create `app/catana/utils/turnControlMode.js`:

```js
export function getTurnControlMode({ canRoll, canEnd }) {
  if (canRoll) return "roll";
  if (canEnd) return "endTurn";
  return "inactive";
}
```

- [ ] **Step 4: Run the helper tests to verify GREEN**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/turnControlMode.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit the helper baseline**

```bash
git add app/catana/utils/turnControlMode.js app/catana/__tests__/turnControlMode.test.js
git commit -m "test: add turn control mode helper"
```

### Task 2: Build the turn-control component shell

**Files:**
- Create: `app/catana/components/TurnControlCluster.js`
- Create: `app/catana/__tests__/TurnControlCluster.test.js`

- [ ] **Step 6: Write the failing component render tests**

Create `app/catana/__tests__/TurnControlCluster.test.js` using `renderToStaticMarkup` with expectations like:

```js
const html = renderToStaticMarkup(
  <TurnControlCluster
    mode="roll"
    statusText="Roll dice"
    timerText="0:38"
    showTimer
    rollContent={<span data-roll>dice</span>}
  />
);

expect(html).toContain("Roll dice");
expect(html).toContain("0:38");
expect(html).toContain("data-roll");
expect(html).toContain("tabular-nums");
```

Also cover:
- timer hidden => no timer text and the status chip carries the top-position class,
- `mode="endTurn"` => forward-icon button shell renders,
- `mode="inactive"` => button remains present and disabled.

- [ ] **Step 7: Run the component render tests to verify RED**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/TurnControlCluster.test.js
```

Expected: FAIL because `TurnControlCluster.js` does not exist yet.

- [ ] **Step 8: Implement the minimal component shell**

Create `app/catana/components/TurnControlCluster.js` with:
- a fixed two-column layout,
- left stack for timer/status chips,
- a rounded-square CTA on the right,
- a `mode` switch for:
  - `roll`: render `rollContent`,
  - `endTurn`: render the forward icon,
  - `inactive`: render the same button footprint in a disabled style.

Keep classes Catana-aligned:
- glass chips in white/slate,
- lime CTA,
- rounded corners and subtle ring/shadow,
- `tabular-nums` on the timer chip.

- [ ] **Step 9: Run the component render tests to verify GREEN**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/TurnControlCluster.test.js
```

Expected: PASS.

- [ ] **Step 10: Commit the component shell**

```bash
git add app/catana/components/TurnControlCluster.js app/catana/__tests__/TurnControlCluster.test.js
git commit -m "feat: add turn control cluster component"
```

### Task 3: Wire the new cluster into PlayerActionContainer

**Files:**
- Modify: `app/catana/components/PlayerActionContainer.js`
- Modify: `app/catana/__tests__/PlayerActionContainer.status.test.js`
- Modify: `app/catana/__tests__/PlayerActionContainer.hitbox.test.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/__tests__/GameScreen.statusPresentation.test.js`

- [ ] **Step 11: Write the failing integration/source tests**

Extend the existing source tests with expectations like:

```js
expect(source).toContain("TurnControlCluster");
expect(source).toContain("getTurnControlMode");
expect(source).toContain("rollContent=");
expect(source).toContain("showTurnControls");
expect(source).not.toContain("Status box - between dice and end turn");
expect(source).not.toContain("pointer-events-auto flex w-36 flex-col items-center");
```

Update the hitbox test to assert the new wrapper remains pointer-events-safe without hardcoding the old `w-36` stack.
Extend `app/catana/__tests__/GameScreen.statusPresentation.test.js` with a guard like:

```js
expect(source).toContain("showTurnControls={!isReplay && !isGameOver}");
```

- [ ] **Step 12: Run the focused integration/source tests to verify RED**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/PlayerActionContainer.status.test.js app/catana/__tests__/PlayerActionContainer.hitbox.test.js app/catana/__tests__/GameScreen.statusPresentation.test.js
```

Expected: FAIL because `PlayerActionContainer.js` still contains the old stack and does not delegate to the new component.

- [ ] **Step 13: Implement the minimal wiring**

In `app/catana/components/PlayerActionContainer.js`:
- import `TurnControlCluster` and `getTurnControlMode`,
- derive `turnControlMode` from existing `canRoll` / `canEnd`,
- keep `timerText` and `showStatusTimer`,
- build `rollContent` from the existing `Die` + `Die2` components,
- render the new cluster only when `showTurnControls` is true,
- replace the old bottom-right dice/status/end-turn markup with:

```jsx
<TurnControlCluster
  mode={turnControlMode}
  statusText={gameStatus?.title ?? null}
  timerText={timerText}
  showTimer={showStatusTimer}
  rollContent={...}
  onRoll={() => moves.rollDice()}
  onEndTurn={() => {
    setPlayerAction(null);
    setBuildPickup(null);
    moves.endTurn();
  }}
/>;
```

In `app/catana/GameScreen.js`:
- pass `showTurnControls={!isReplay && !isGameOver}` into `PlayerActionContainer`.

- [ ] **Step 14: Run the focused integration/source tests to verify GREEN**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/PlayerActionContainer.status.test.js app/catana/__tests__/PlayerActionContainer.hitbox.test.js app/catana/__tests__/PlayerActionBadges.test.js app/catana/__tests__/GameScreen.statusPresentation.test.js app/catana/__tests__/renderPerfGuards.test.js
```

Expected: PASS.

- [ ] **Step 15: Commit the PlayerActionContainer integration**

```bash
git add app/catana/components/PlayerActionContainer.js app/catana/GameScreen.js app/catana/__tests__/PlayerActionContainer.status.test.js app/catana/__tests__/PlayerActionContainer.hitbox.test.js app/catana/__tests__/GameScreen.statusPresentation.test.js
git commit -m "feat: redesign bottom-right turn controls"
```

### Task 4: Verify in the Catana sandbox and record the change

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 16: Run the full focused verification suite**

Run:
```bash
pnpm exec vitest run \
  app/catana/__tests__/turnControlMode.test.js \
  app/catana/__tests__/TurnControlCluster.test.js \
  app/catana/__tests__/PlayerActionContainer.status.test.js \
  app/catana/__tests__/PlayerActionContainer.hitbox.test.js \
  app/catana/__tests__/PlayerActionBadges.test.js \
  app/catana/__tests__/GameScreen.statusPresentation.test.js \
  app/catana/__tests__/GameScreen.themeSwitcher.test.js \
  app/catana/__tests__/renderPerfGuards.test.js
```

Expected: PASS.

- [ ] **Step 17: Manually verify in the sandbox**

Run:
```bash
pnpm dev
```

Check `/catana/dev/sandbox` for:
- pre-roll button shows dice affordance,
- post-roll button shows end-turn affordance,
- timer chip is numeric,
- status chip stays aligned when timer is hidden,
- forced-action states keep a muted button footprint,
- low-time styling still reads clean when the timer is near expiry,
- replay/game-over states hide the turn-control module,
- spectator/no-local-player state still hides the turn-control module.

- [ ] **Step 18: Update agent docs**

Append a concise entry to:
- `docs/agent/PROGRESS.md`
- `docs/agent/NOTES.md`

Cover:
- the new bottom-right turn-control structure,
- the fact that copy/timer still come from the existing status/timer model,
- any implementation caveat worth preserving for future UI passes.

- [ ] **Step 19: Commit docs**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record turn controls redesign"
```
