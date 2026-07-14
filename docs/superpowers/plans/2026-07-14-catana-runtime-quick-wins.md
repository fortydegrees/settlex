# Catana Runtime Quick Wins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Stop normal turn-timer ticks from rerunning GameScreen and remove redundant per-edge viewport listeners without changing timer presentation or 2D board geometry.

**Architecture:** A shared useLiveTurnTimer hook will own the 250ms regular-turn clock, but it will be called only by the small desktop and mobile timer leaves. GameScreen will retain its clock solely for disconnect/idle presence. Separately, Board will pass its already measured viewport width through every Edge path.

**Tech Stack:** React, JavaScript, Vitest, React server rendering, Playwright CLI, Catana 2D dev sandbox.

## Global Constraints

- Preserve normalized server snapshots, server-delay correction, the 250ms cadence, M:SS formatting, the five-second urgency threshold, and roll-status suppression.
- Preserve the desktop timer segment, mobile --:-- fallback, and existing low-time classes/styles.
- Keep disconnect and idle countdown behaviour in GameScreen for this slice.
- Preserve road coordinates, transforms, resize response, placement, passive-hover, and build-pickup interactions.
- Do not perform a broad GameScreen refactor or modify server, engine, network, rail, award, dice, counter, or log code.
- Add no dependencies and do not modify the unrelated replay/3D workspace.
- Work in /Users/david/coding/settlex/.worktrees/animation-quick-wins on codex/animation-quick-wins.

---

### Task 1: Create the isolated live-turn-timer clock

**Files:**
- Create: app/catana/components/LiveTurnTimer.js
- Create: app/catana/__tests__/LiveTurnTimer.test.js
- Delete: app/catana/__tests__/useLocalPlayerDockModel.test.js

**Interfaces:**
- Consumes: getTimerRemainingMs(timerSnapshot, nowMs) from app/catana/utils/timerSnapshot.js.
- Produces: LIVE_TURN_TIMER_INTERVAL_MS, formatTimer, getTimerSeconds, getLiveTurnTimerPresentation, startLiveTurnTimerTicker, and useLiveTurnTimer.

- [ ] **Step 1: Write the failing timer-clock tests**

Create app/catana/__tests__/LiveTurnTimer.test.js:

~~~js
import { describe, expect, it, vi } from "vitest";
import {
  LIVE_TURN_TIMER_INTERVAL_MS,
  formatTimer,
  getLiveTurnTimerPresentation,
  getTimerSeconds,
  startLiveTurnTimerTicker,
} from "../components/LiveTurnTimer";

const timerSnapshot = {
  kind: "turn",
  remainingMs: 6_000,
  receivedAtMs: 1_000,
  serverDelayMs: 0,
};

describe("LiveTurnTimer", () => {
  it("preserves HUD timer formatting", () => {
    expect(formatTimer(null)).toBeNull();
    expect(formatTimer(85_900)).toBe("1:25");
    expect(formatTimer(5_000)).toBe("0:05");
    expect(formatTimer(-500)).toBe("0:00");
    expect(getTimerSeconds(null)).toBe(Number.POSITIVE_INFINITY);
    expect(getTimerSeconds(5_999)).toBe(5);
    expect(getTimerSeconds(-1)).toBe(0);
  });

  it("derives visible low-time presentation", () => {
    expect(
      getLiveTurnTimerPresentation({
        timerSnapshot,
        nowMs: 1_100,
        enabled: true,
        statusType: "playing",
        statusKind: "your_turn",
      })
    ).toEqual({
      timerMs: 5_900,
      timerText: "0:05",
      showStatusTimer: true,
      isLowTimerAlertActive: true,
    });
  });

  it("preserves suppression and hidden behaviour", () => {
    expect(
      getLiveTurnTimerPresentation({
        timerSnapshot,
        nowMs: 1_100,
        enabled: true,
        statusType: "rolling",
        statusKind: "your_turn",
      }).isLowTimerAlertActive
    ).toBe(false);
    expect(
      getLiveTurnTimerPresentation({
        timerSnapshot,
        nowMs: 1_100,
        enabled: true,
        statusType: "playing",
        statusKind: "waiting_for_roll",
      }).isLowTimerAlertActive
    ).toBe(false);
    expect(
      getLiveTurnTimerPresentation({
        timerSnapshot,
        nowMs: 1_100,
        enabled: false,
        statusType: "playing",
        statusKind: "your_turn",
      })
    ).toEqual({
      timerMs: null,
      timerText: null,
      showStatusTimer: false,
      isLowTimerAlertActive: false,
    });
  });

  it("starts one 250ms ticker and cleans it up", () => {
    const onTick = vi.fn();
    const setIntervalFn = vi.fn(() => 41);
    const clearIntervalFn = vi.fn();
    const nowFn = vi.fn().mockReturnValueOnce(1_000).mockReturnValueOnce(1_250);

    const cleanup = startLiveTurnTimerTicker({
      enabled: true,
      onTick,
      nowFn,
      setIntervalFn,
      clearIntervalFn,
    });

    expect(onTick).toHaveBeenCalledWith(1_000);
    expect(setIntervalFn).toHaveBeenCalledWith(
      expect.any(Function),
      LIVE_TURN_TIMER_INTERVAL_MS
    );
    setIntervalFn.mock.calls[0][0]();
    expect(onTick).toHaveBeenLastCalledWith(1_250);
    cleanup();
    expect(clearIntervalFn).toHaveBeenCalledWith(41);
  });

  it("does not tick while disabled", () => {
    const onTick = vi.fn();
    const setIntervalFn = vi.fn();
    const clearIntervalFn = vi.fn();
    const cleanup = startLiveTurnTimerTicker({
      enabled: false,
      onTick,
      setIntervalFn,
      clearIntervalFn,
    });

    expect(onTick).not.toHaveBeenCalled();
    expect(setIntervalFn).not.toHaveBeenCalled();
    cleanup();
    expect(clearIntervalFn).not.toHaveBeenCalled();
  });
});
~~~

Delete app/catana/__tests__/useLocalPlayerDockModel.test.js; its four tests cover only timer helpers moving to the new test.

- [ ] **Step 2: Run the new test and verify RED**

Run:

~~~bash
pnpm exec vitest run app/catana/__tests__/LiveTurnTimer.test.js --exclude '.worktrees/**' --reporter=dot
~~~

Expected: FAIL because LiveTurnTimer.js does not exist.

- [ ] **Step 3: Implement the shared clock and pure presentation helpers**

Create app/catana/components/LiveTurnTimer.js:

~~~js
import { useEffect, useState } from "react";
import { getTimerRemainingMs } from "../utils/timerSnapshot";

export const LIVE_TURN_TIMER_INTERVAL_MS = 250;
export const LOW_TIMER_THRESHOLD_SECONDS = 5;

const LOW_TIMER_ALERT_SUPPRESSED_STATUS_KINDS = new Set([
  "waiting_for_roll",
  "waiting_for_roll_other",
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
  return minutes + ":" + seconds;
};

export const getLiveTurnTimerPresentation = ({
  timerSnapshot,
  nowMs,
  enabled,
  statusType,
  statusKind,
}) => {
  const timerMs = enabled
    ? getTimerRemainingMs(timerSnapshot, nowMs)
    : null;
  const timerText = formatTimer(timerMs);
  const showStatusTimer = enabled && Boolean(timerText);
  const isLowTimerAlertSuppressed =
    LOW_TIMER_ALERT_SUPPRESSED_STATUS_TYPES.has(statusType) ||
    LOW_TIMER_ALERT_SUPPRESSED_STATUS_KINDS.has(statusKind);

  return {
    timerMs,
    timerText,
    showStatusTimer,
    isLowTimerAlertActive:
      showStatusTimer &&
      !isLowTimerAlertSuppressed &&
      getTimerSeconds(timerMs) <= LOW_TIMER_THRESHOLD_SECONDS,
  };
};

export const startLiveTurnTimerTicker = ({
  enabled,
  onTick,
  nowFn = Date.now,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
}) => {
  if (!enabled) return () => {};

  onTick(nowFn());
  const intervalId = setIntervalFn(
    () => onTick(nowFn()),
    LIVE_TURN_TIMER_INTERVAL_MS
  );
  return () => clearIntervalFn(intervalId);
};

export function useLiveTurnTimer({
  timerSnapshot,
  enabled,
  statusType,
  statusKind,
}) {
  const [nowMs, setNowMs] = useState(Date.now);
  const tickerEnabled = enabled && Boolean(timerSnapshot);

  useEffect(
    () =>
      startLiveTurnTimerTicker({
        enabled: tickerEnabled,
        onTick: setNowMs,
      }),
    [tickerEnabled, timerSnapshot]
  );

  return getLiveTurnTimerPresentation({
    timerSnapshot,
    nowMs,
    enabled: tickerEnabled,
    statusType,
    statusKind,
  });
}
~~~

- [ ] **Step 4: Run tests and verify GREEN**

~~~bash
pnpm exec vitest run app/catana/__tests__/LiveTurnTimer.test.js app/catana/__tests__/timerSnapshot.test.js --exclude '.worktrees/**' --reporter=dot
~~~

Expected: 2 files pass, 9 tests pass.

- [ ] **Step 5: Lint and commit**

~~~bash
pnpm exec eslint app/catana/components/LiveTurnTimer.js app/catana/__tests__/LiveTurnTimer.test.js
git diff --check
git add app/catana/components/LiveTurnTimer.js app/catana/__tests__/LiveTurnTimer.test.js app/catana/__tests__/useLocalPlayerDockModel.test.js
git commit -m "perf: add isolated Catana turn timer clock"
~~~

Expected: checks exit 0 and the commit succeeds.

---

### Task 2: Move regular timer ticks below the player HUD boundary

**Files:**
- Modify: app/catana/GameScreen.js:45-51,732-760,1642-1705
- Modify: app/catana/components/useLocalPlayerDockModel.js:21-80,286-323
- Modify: app/catana/components/PlayerActionContainer.js:83-107,158-192,417-426
- Modify: app/catana/components/MobilePlayerCockpit.js:106-126,218-327,612-616
- Modify: app/catana/components/TurnControlCluster.js:89-260
- Modify: app/catana/__tests__/renderPerfGuards.test.js:44-51
- Modify: app/catana/__tests__/PlayerActionContainer.status.test.js:23-55
- Modify: app/catana/__tests__/MobilePlayerCockpit.source.test.js:24-67
- Modify: app/catana/__tests__/TurnControlCluster.test.js:1-142

**Interfaces:**
- Consumes: useLiveTurnTimer from Task 1.
- Produces: timerSnapshot props on both HUDs and a presence-only GameScreen clock.

- [ ] **Step 1: Write failing ownership guards**

Replace the timer test in renderPerfGuards.test.js:

~~~js
  it("keeps the regular timer clock below GameScreen", () => {
    const screenContents = readCatanaFile("GameScreen.js");
    const desktopContents = readCatanaFile("components/TurnControlCluster.js");
    const mobileContents = readCatanaFile("components/MobilePlayerCockpit.js");

    expect(screenContents).toContain(
      "if (!hasDisconnectCountdown && !hasIdleCountdown) return;"
    );
    expect(screenContents).not.toContain(
      "[timerSnapshot, hideTimer, hasDisconnectCountdown, hasIdleCountdown]"
    );
    expect(screenContents).not.toContain("const timerMs = getTimerRemainingMs");
    expect(screenContents).toContain("timerSnapshot={visibleTimerSnapshot}");
    expect(desktopContents).toContain("useLiveTurnTimer");
    expect(mobileContents).toContain("useLiveTurnTimer");
  });
~~~

Replace the timer test in PlayerActionContainer.status.test.js:

~~~js
  it("delegates live countdown work to the timer leaf", () => {
    const source = fs.readFileSync(containerPath, "utf8");
    const localDockSource = fs.readFileSync(localDockModelPath, "utf8");

    expect(source).toContain("timerSnapshot");
    expect(source).toContain("timerStatusType={statusType}");
    expect(source).toContain("timerStatusKind={gameStatus?.kind}");
    expect(source).not.toContain("timerText={timerText}");
    expect(source).not.toContain("isTimerLow={isLowTimerAlertActive}");
    expect(localDockSource).not.toContain("formatTimer");
    expect(localDockSource).not.toContain("LOW_TIMER_THRESHOLD_SECONDS");
    expect(localDockSource).toContain("getTurnControlMode");
  });
~~~

In MobilePlayerCockpit.source.test.js, replace the old timer assertions with:

~~~js
    expect(source).toContain("useLiveTurnTimer");
    expect(source).toContain("timerSnapshot");
    expect(source).toContain("statusKind={gameStatus?.kind}");
    expect(source).toContain(
      'const displayTimerText = hasTimerText ? timerText : "--:--";'
    );
    expect(source).not.toContain("showStatusTimer");
    expect(source).not.toContain("timerMs,");
~~~

In TurnControlCluster.test.js, import beforeEach, afterEach, and vi. Add:

~~~js
const timerSnapshot = {
  kind: "turn",
  remainingMs: 38_000,
  receivedAtMs: 1_000,
  serverDelayMs: 0,
};

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(1_000);
});

afterEach(() => {
  vi.restoreAllMocks();
});
~~~

Replace each default timerText prop with:

~~~js
timerSnapshot,
showTimer: true,
timerStatusType: "playing",
timerStatusKind: "your_turn",
~~~

Use timerSnapshot: null in the hidden test and a 5_000ms snapshot in the low-time test.

- [ ] **Step 2: Run the guards and verify RED**

~~~bash
pnpm exec vitest run app/catana/__tests__/renderPerfGuards.test.js app/catana/__tests__/PlayerActionContainer.status.test.js app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/TurnControlCluster.test.js --exclude '.worktrees/**' --reporter=dot
~~~

Expected: failures show the regular clock remains in GameScreen and HUDs still consume timerMs.

- [ ] **Step 3: Rewire GameScreen**

Remove getTimerRemainingMs from the timerSnapshot import. Replace the timer section with:

~~~js
  const hideTimer =
    isGameOver ||
    !shouldShowGameStatusTimer(rawGameStatus, timerSnapshot);
  const visibleTimerSnapshot = hideTimer ? null : timerSnapshot;
  const gameStatus = isGameOver
    ? {
        ...rawGameStatus,
        kind: "game_over",
        title: "Game Over",
        text: "Game Over",
        activePlayerId: null,
        showTimer: false
      }
    : {
        ...rawGameStatus,
        showTimer: !hideTimer
      };
  const hasDisconnectCountdown =
    Object.keys(disconnectStateByPlayerId).length > 0;
  const hasIdleCountdown = Boolean(activeIdlePlayerId);

  useEffect(() => {
    if (!hasDisconnectCountdown && !hasIdleCountdown) return;
    const interval = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(interval);
  }, [hasDisconnectCountdown, hasIdleCountdown]);
~~~

Replace both timerMs={visibleTimerMs} props with:

~~~jsx
timerSnapshot={visibleTimerSnapshot}
~~~

- [ ] **Step 4: Remove timer calculations from HUD parents**

In useLocalPlayerDockModel.js, delete the timer constants and helper exports. Remove timerMs, statusType, and gameStatus from the hook parameters. Delete the timer derivation and remove timerText, showStatusTimer, and isLowTimerAlertActive from the returned object.

In PlayerActionContainer.js, rename the timerMs prop to timerSnapshot, remove the three timer fields from the dock-model destructure/call, and pass:

~~~jsx
<TurnControlCluster
  mode={turnControlMode}
  statusText={gameStatus ? gameStatus.title : null}
  timerSnapshot={timerSnapshot}
  showTimer={gameStatus?.showTimer !== false}
  timerStatusType={statusType}
  timerStatusKind={gameStatus?.kind}
  rollContent={rollContent}
  onRoll={rollEnabled ? () => moves.rollDice() : undefined}
  onEndTurn={
    endTurnEnabled
      ? () => {
          setPlayerAction(null);
          setBuildPickup(null);
          moves.endTurn();
        }
      : undefined
  }
/>
~~~

In MobilePlayerCockpit.js, rename timerMs to timerSnapshot, remove the three timer fields from the dock-model destructure/call, and pass:

~~~jsx
<MobileCommandTimerBox
  timerSnapshot={timerSnapshot}
  showTimer={gameStatus?.showTimer !== false}
  statusType={statusType}
  statusKind={gameStatus?.kind}
/>
~~~

- [ ] **Step 5: Put the hook in the timer leaves**

Import useLiveTurnTimer into TurnControlCluster.js. Add:

~~~js
function TurnTimerSegment({
  timerSnapshot,
  statusType,
  statusKind,
  stripTextStyle,
}) {
  const { timerText, isLowTimerAlertActive } = useLiveTurnTimer({
    timerSnapshot,
    enabled: true,
    statusType,
    statusKind,
  });
  const showLowTimer = Boolean(timerText) && isLowTimerAlertActive;

  return React.createElement(
    "div",
    {
      className: joinClassNames(
        "turn-control-strip__timer flex min-w-[4.9rem] items-center justify-center px-3 text-[0.95rem] font-semibold tracking-[0.01em] tabular-nums",
        showLowTimer &&
          "turn-control-strip__timer--low turn-control-timer-low-pulse"
      ),
      style: {
        ...(showLowTimer ? TIMER_SEGMENT_LOW_STYLE : TIMER_SEGMENT_STYLE),
        ...stripTextStyle,
        ...(showLowTimer ? LOW_TIMER_TEXT_STYLE : null),
      },
    },
    timerText
  );
}
~~~

Change TurnControlCluster and TurnStatusStrip to accept timerSnapshot, showTimer, timerStatusType, and timerStatusKind. Use:

~~~js
const showTimerChip = showTimer && Boolean(timerSnapshot);
~~~

Render the timer child with:

~~~js
React.createElement(TurnTimerSegment, {
  timerSnapshot,
  statusType: timerStatusType,
  statusKind: timerStatusKind,
  stripTextStyle,
})
~~~

Import useLiveTurnTimer into MobilePlayerCockpit.js. At the top of MobileCommandTimerBox, replace its derived inputs with:

~~~js
  const { timerText, isLowTimerAlertActive } = useLiveTurnTimer({
    timerSnapshot,
    enabled: showTimer,
    statusType,
    statusKind,
  });
  const hasTimerText = showTimer && Boolean(timerText);
  const displayTimerText = hasTimerText ? timerText : "--:--";
~~~

Rename its isLow usage to isLowTimerAlertActive and otherwise preserve the current JSX and classes exactly.

- [ ] **Step 6: Verify GREEN and lint**

~~~bash
pnpm exec vitest run app/catana/__tests__/LiveTurnTimer.test.js app/catana/__tests__/timerSnapshot.test.js app/catana/__tests__/renderPerfGuards.test.js app/catana/__tests__/PlayerActionContainer.status.test.js app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/TurnControlCluster.test.js --exclude '.worktrees/**' --reporter=dot
pnpm exec eslint app/catana/GameScreen.js app/catana/components/LiveTurnTimer.js app/catana/components/useLocalPlayerDockModel.js app/catana/components/PlayerActionContainer.js app/catana/components/MobilePlayerCockpit.js app/catana/components/TurnControlCluster.js app/catana/__tests__/LiveTurnTimer.test.js app/catana/__tests__/renderPerfGuards.test.js app/catana/__tests__/PlayerActionContainer.status.test.js app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/TurnControlCluster.test.js
git diff --check
~~~

Expected: all six test files pass and static checks exit 0.

- [ ] **Step 7: Profile and commit**

Record three seconds of a timed 2D match with React DevTools Profiler at desktop and mobile sizes. Expected: timer-leaf commits continue, while GameScreen and the full player HUD do not commit solely because displayed time changed. If they still commit at timer cadence, stop and trace the remaining state source.

~~~bash
git add app/catana/GameScreen.js app/catana/components/LiveTurnTimer.js app/catana/components/useLocalPlayerDockModel.js app/catana/components/PlayerActionContainer.js app/catana/components/MobilePlayerCockpit.js app/catana/components/TurnControlCluster.js app/catana/__tests__/LiveTurnTimer.test.js app/catana/__tests__/renderPerfGuards.test.js app/catana/__tests__/PlayerActionContainer.status.test.js app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/TurnControlCluster.test.js
git commit -m "perf: isolate Catana turn timer renders"
~~~

---

### Task 3: Remove per-edge viewport subscriptions

**Files:**
- Modify: app/catana/Board.js:722-740,813-872,944-975
- Modify: app/catana/Edge.js:1-260
- Modify: app/catana/__tests__/renderPerfGuards.test.js
- Test: app/catana/__tests__/Edge.passiveHover.test.js
- Test: app/catana/__tests__/BuildPickupHoverGhost.source.test.js

**Interfaces:**
- Consumes: width from Board's existing useWindowSize call.
- Produces: viewportWidth on Edge, PlaceableEdge, and HoverableEdge.

- [ ] **Step 1: Add the failing fan-out guard**

Add to renderPerfGuards.test.js:

~~~js
  it("passes Board viewport width through every Edge", () => {
    const boardContents = readCatanaFile("Board.js");
    const edgeContents = readCatanaFile("Edge.js");
    const edgeRenderCount = (boardContents.match(/<Edge\b/g) ?? []).length;
    const viewportPropCount = (
      boardContents.match(/viewportWidth=\{width\}/g) ?? []
    ).length;

    expect(edgeRenderCount).toBeGreaterThan(0);
    expect(viewportPropCount).toBe(edgeRenderCount);
    expect(edgeContents).not.toContain("useWindowSize");
    expect(edgeContents).toContain("viewportWidth");
    expect(edgeContents).toContain(
      "getEdgeTransform(direction, size, viewportWidth)"
    );
  });
~~~

- [ ] **Step 2: Verify RED**

~~~bash
pnpm exec vitest run app/catana/__tests__/renderPerfGuards.test.js --exclude '.worktrees/**' --reporter=dot
~~~

Expected: FAIL because Edge still owns viewport subscriptions.

- [ ] **Step 3: Pass the existing Board width**

Add this prop to every Edge call in Board.js:

~~~jsx
viewportWidth={width}
~~~

Remove the useWindowSize import and all three hook calls from Edge.js. Add viewportWidth to Edge, PlaceableEdge, and HoverableEdge parameters. Change every transform calculation to:

~~~js
const transform = getEdgeTransform(direction, size, viewportWidth);
~~~

Forward the prop from Edge to both specialized edge components:

~~~jsx
viewportWidth={viewportWidth}
~~~

- [ ] **Step 4: Verify GREEN, lint, and commit**

~~~bash
pnpm exec vitest run app/catana/__tests__/renderPerfGuards.test.js app/catana/__tests__/Edge.passiveHover.test.js app/catana/__tests__/BuildPickupHoverGhost.source.test.js app/catana/__tests__/Board.passiveBuildHover.test.js app/catana/__tests__/Board.buildActionSuppression.test.js app/catana/__tests__/useWindowSize.test.js --exclude '.worktrees/**' --reporter=dot
pnpm exec eslint app/catana/Board.js app/catana/Edge.js app/catana/__tests__/renderPerfGuards.test.js
git diff --check
git add app/catana/Board.js app/catana/Edge.js app/catana/__tests__/renderPerfGuards.test.js
git commit -m "perf: reuse board viewport width for Catana edges"
~~~

Expected: all six test files pass and the commit succeeds.

---

### Task 4: Verify the combined runtime slice and record evidence

**Files:**
- Modify: docs/agent/PROGRESS.md
- Modify: docs/agent/NOTES.md

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces: durable verification and ownership notes.

- [ ] **Step 1: Run the combined regression set**

~~~bash
pnpm exec vitest run app/catana/__tests__/HudMotionPerformance.source.test.js app/catana/__tests__/LiveTurnTimer.test.js app/catana/__tests__/timerSnapshot.test.js app/catana/__tests__/renderPerfGuards.test.js app/catana/__tests__/PlayerActionContainer.status.test.js app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/TurnControlCluster.test.js app/catana/__tests__/Edge.passiveHover.test.js app/catana/__tests__/BuildPickupHoverGhost.source.test.js app/catana/__tests__/Board.passiveBuildHover.test.js app/catana/__tests__/Board.buildActionSuppression.test.js app/catana/__tests__/useWindowSize.test.js --exclude '.worktrees/**' --reporter=dot
~~~

Expected: all 12 test files pass.

- [ ] **Step 2: Verify timer presentation**

Use a real timed 2D match, or temporarily pass a turn timer snapshot through SandboxBoardShell without staging that edit. Check 1440x900 and 390x844.

Confirm desktop/mobile countdown text and cadence, timer hiding, mobile --:-- fallback, five-second urgency, roll-status suppression, and interval cleanup are unchanged. Remove any temporary sandbox edit before continuing.

- [ ] **Step 3: Verify every road mode after resize**

Use /catana/dev/sandbox at 1440x900 and 390x844. Exercise placed, placement, passive-hover, and dock-launched build-pickup roads. Confirm art, hit targets, hover previews, and placement previews remain aligned before and after resize.

- [ ] **Step 4: Update project notes**

Append to docs/agent/PROGRESS.md:

~~~markdown
## Status (2026-07-14, Catana runtime quick wins)
- Moved the normal 250ms turn-timer clock below GameScreen into the mounted desktop/mobile timer leaf while preserving server-delay correction, formatting, visibility, and low-time behaviour.
- Kept the root GameScreen clock only for active disconnect/idle presence countdowns.
- Removed edge-local useWindowSize subscriptions and passed Board's measured viewport width through every road path.
- React profiling confirmed normal timer ticks commit the timer leaf without recurring GameScreen or full player-HUD commits.
- Desktop 1440x900 and mobile 390x844 checks confirmed unchanged timer presentation and aligned road geometry after resize.
~~~

Append to docs/agent/NOTES.md:

~~~markdown
- Catana timer/edge runtime ownership note:
- Keep the regular turn timer's 250ms clock inside the smallest mounted timer leaf. Do not move nowMs back into GameScreen or the full HUD.
- GameScreen retains a presence-only clock for active disconnect/idle countdowns; future presence extraction is a separate measured slice.
- Board owns viewport width for road transforms. Every Edge path should receive viewportWidth rather than subscribing through useWindowSize.
~~~

- [ ] **Step 5: Final checks and evidence commit**

~~~bash
pnpm exec eslint app/catana/GameScreen.js app/catana/Board.js app/catana/Edge.js app/catana/components/LiveTurnTimer.js app/catana/components/useLocalPlayerDockModel.js app/catana/components/PlayerActionContainer.js app/catana/components/MobilePlayerCockpit.js app/catana/components/TurnControlCluster.js app/catana/__tests__/LiveTurnTimer.test.js app/catana/__tests__/renderPerfGuards.test.js app/catana/__tests__/PlayerActionContainer.status.test.js app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/TurnControlCluster.test.js
git diff --check
git status --short
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record Catana runtime performance checks"
~~~

Expected: checks exit 0, only the two documentation files enter the evidence commit, and the worktree is clean.

## Completion Boundary

Stop when this runtime quick-wins branch is clean and verified. Do not begin production performance certification, visual-effect changes, long-session soak work, network measurement, or broad GameScreen refactoring in this plan.
