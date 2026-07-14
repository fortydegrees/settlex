# Archived Replay V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a discoverable archived replay analysis mode on the existing Catana game screen, with event/turn playback, a synchronized game log, and an interactive victory-point chart.

**Architecture:** Keep archived action reduction as the authoritative state source, then derive one pure `ReplayTimeline` that maps meaningful log events to raw frames, turn boundaries, visible log entries, and VP samples. `ReplayPageClient` owns playback position and passes controlled replay state into the existing `GameScreen`; a Catana-owned console and Recharts chart consume the same timeline. Explicit replay URLs prefer the archive and use a bounded preparation state when the archive write is still finishing.

**Tech Stack:** Next.js 13 app router, React 18, JavaScript UI, Vitest, Tailwind CSS, Vaul, Heroicons, `@settlex/game-core`, Recharts `3.9.2`, and `react-is` `^18.2.0`.

## Global Constraints

- Preserve the existing full Catana game board as the dominant replay surface.
- Navigate by meaningful game-log events; raw boardgame.io actions are only the legacy fallback.
- Playback speeds are exactly `1x`, `2x`, and `4x`; there is no `0.5x` option.
- Base cadence is 1000 ms per event at `1x`, 500 ms at `2x`, and 250 ms at `4x`.
- Replay state changes are immediate: no replay audio, GSAP effect playback, or changed-piece highlight.
- Desktop uses a right console; phone portrait uses a compact bottom dock and expandable Vaul sheet.
- Recharts is a rendering dependency only. Do not add shadcn or import another visual system.
- Rematch behavior and the full postgame Stats screen are outside this plan.
- Keep live-game logging, controls, effects, and keyboard behavior unchanged when `isReplay !== true`.
- Use JavaScript for new app UI files; do not convert adjacent Catana files to TypeScript.
- Preserve all pre-existing dirty-worktree changes. Never use `git add -A`, `git checkout --`, or a destructive reset.
- For commit steps, stage new files directly and use `git add -p` for files that were already dirty. If an implementation hunk cannot be separated from an existing user hunk, leave it unstaged and report that boundary instead of committing someone else's work.
- Do not deploy. Production release requires a separate explicit approval.

---

### Task 1: Build the meaningful replay timeline and shared event text

**Files:**
- Create: `app/replays/replayTimeline.js`
- Modify: `app/replays/replayClientState.js`
- Modify: `app/catana/utils/gameText.js`
- Modify: `app/catana/__tests__/gameText.test.js`
- Modify: `app/__tests__/replayPageClient.test.js`

**Interfaces:**
- Produces: `formatLogEntryText(entry, playerMap) -> string`
- Produces: `getGameLogEntryKey(entry, index) -> string`
- Produces: `buildReplayTimeline({ frames, participants, getVictoryPointsForState? }) -> ReplayTimeline`
- Produces: `clampReplayEventIndex(index, eventCount) -> number`
- Produces: `getPreviousTurnEventIndex(timeline, currentIndex) -> number`
- Produces: `getNextTurnEventIndex(timeline, currentIndex) -> number`
- `ReplayTimeline` is `{ events, turnStarts, logEventIndexByKey, players, scoreSeries }`.
- Each event is `{ index, frameIndex, turn, label, logEntryKey, visibleLogEntries }`.
- Each score sample is `{ eventIndex, turn, scoresByPlayerId }`.

- [ ] **Step 1: Write failing text-format tests**

Add imports and assertions to `app/catana/__tests__/gameText.test.js`:

```js
import {
  formatChatEntry,
  formatLogEntry,
  formatLogEntryText,
  getGameLogEntryKey,
  STATUS_TEXT,
} from "../utils/gameText";

it("formats a replay-safe plain sentence from the same log tokens", () => {
  expect(
    formatLogEntryText(
      { id: 7, type: "roll", actorId: "1", data: { dice: [3, 4] } },
      { "1": { name: "Bren" } }
    )
  ).toBe("Bren rolled 7");
  expect(formatLogEntryText({ type: "turn:end" })).toBe("");
});

it("builds stable log keys with an index fallback", () => {
  expect(getGameLogEntryKey({ id: 7, type: "roll" }, 2)).toBe("7");
  expect(getGameLogEntryKey({ type: "roll" }, 2)).toBe("replay-log-2-roll");
});
```

- [ ] **Step 2: Write failing replay-timeline tests**

Extend `app/__tests__/replayPageClient.test.js` with a deterministic fixture:

```js
it("projects raw frames into meaningful log events, turns, and VP samples", async () => {
  const { buildReplayTimeline } = await import("../replays/replayTimeline.js");
  const participants = [
    { seatId: "0", usernameSnapshot: "Ada", avatarColorSnapshot: "gold" },
    { seatId: "1", usernameSnapshot: "Bren", avatarColorSnapshot: "blue" },
  ];
  const makeState = (gameLog, turn, scores) => ({
    G: { gameLog, core: { turn }, scores },
    ctx: {},
  });
  const roll = {
    id: 1,
    turn: 1,
    type: "roll",
    actorId: "0",
    data: { dice: [3, 4] },
  };
  const gain = {
    id: 2,
    turn: 1,
    type: "resource:gain",
    actorId: "0",
    data: { resources: { Wood: 1 } },
  };
  const divider = { id: 3, turn: 1, type: "turn:end", data: { divider: true } };
  const settlement = {
    id: 4,
    turn: 2,
    type: "build:settlement",
    actorId: "1",
    data: {},
  };
  const frames = [
    { index: 0, state: makeState([], 1, { "0": 0, "1": 0 }), logEntry: null },
    {
      index: 1,
      state: makeState([roll, gain], 1, { "0": 0, "1": 0 }),
      logEntry: { action: { type: "MAKE_MOVE", payload: { type: "rollDice" } } },
    },
    {
      index: 2,
      state: makeState([roll, gain, divider, settlement], 2, { "0": 0, "1": 1 }),
      logEntry: { action: { type: "MAKE_MOVE", payload: { type: "placeSettlement" } } },
    },
  ];

  const timeline = buildReplayTimeline({
    frames,
    participants,
    getVictoryPointsForState: (state, playerId) => state.G.scores[playerId],
  });

  expect(timeline.events.map((event) => event.label)).toEqual([
    "Initial setup",
    "Ada rolled 7",
    "Ada received Wood",
    "Bren placed a settlement",
  ]);
  expect(timeline.events[1].frameIndex).toBe(1);
  expect(timeline.events[1].visibleLogEntries).toEqual([roll]);
  expect(timeline.events[2].visibleLogEntries).toEqual([roll, gain]);
  expect(timeline.events[3].visibleLogEntries).toEqual([
    roll,
    gain,
    divider,
    settlement,
  ]);
  expect(timeline.logEventIndexByKey["4"]).toBe(3);
  expect(timeline.logEventIndexByKey["3"]).toBe(3);
  expect(timeline.turnStarts).toEqual([
    { turn: 1, eventIndex: 0 },
    { turn: 2, eventIndex: 3 },
  ]);
  expect(timeline.scoreSeries[3]).toEqual({
    eventIndex: 3,
    turn: 2,
    scoresByPlayerId: { "0": 0, "1": 1 },
  });
});

it("falls back to raw action frames when structured game-log events are absent", async () => {
  const { buildReplayTimeline } = await import("../replays/replayTimeline.js");
  const frames = [
    { index: 0, state: { G: { core: { turn: 1 } }, ctx: {} }, logEntry: null },
    {
      index: 1,
      state: { G: { core: { turn: 1 } }, ctx: {} },
      logEntry: { action: { type: "MAKE_MOVE", payload: { type: "rollDice" } } },
    },
    {
      index: 2,
      state: { G: { core: { turn: 1 } }, ctx: {} },
      logEntry: { action: { type: "PLUGIN" } },
    },
  ];
  const timeline = buildReplayTimeline({ frames, participants: [] });
  expect(timeline.events.map((event) => event.label)).toEqual([
    "Initial setup",
    "Rolled dice",
    "Game updated",
  ]);
});
```

- [ ] **Step 3: Run the focused tests and verify the red state**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/gameText.test.js app/__tests__/replayPageClient.test.js --reporter=dot
```

Expected: FAIL because `formatLogEntryText`, `getGameLogEntryKey`, and
`buildReplayTimeline` do not exist.

- [ ] **Step 4: Add the shared plain-text adapter**

Append the following exports to `app/catana/utils/gameText.js`:

```js
export const getGameLogEntryKey = (entry, index) =>
  String(entry?.id ?? `replay-log-${index}-${entry?.type ?? "entry"}`);

export const formatLogTokensToText = (tokens = []) => {
  const diceTotal = tokens
    .filter((token) => token?.kind === "die")
    .reduce((total, token) => total + (Number(token.value) || 0), 0);

  return tokens
    .map((token, index) => {
      if (token?.kind === "text") return String(token.text ?? "");
      if (token?.kind === "player") return String(token.name ?? `Player ${token.id}`);
      if (token?.kind === "die") {
        return tokens.slice(0, index).some((item) => item?.kind === "die")
          ? ""
          : String(diceTotal);
      }
      if (token?.kind === "resource") {
        const separator = tokens[index - 1]?.kind === "resource" ? " " : "";
        return `${separator}${String(token.resource ?? "")}`;
      }
      if (token?.kind === "label") return `${String(token.text ?? "")} `;
      return "";
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
};

export const formatLogEntryText = (entry, playerMap = {}) =>
  formatLogTokensToText(formatLogEntry(entry, playerMap));
```

- [ ] **Step 5: Add the pure timeline implementation**

Create `app/replays/replayTimeline.js` with this public shape and algorithms:

```js
import { getVictoryPoints } from "@settlex/game-core";
import {
  formatLogEntryText,
  getGameLogEntryKey,
} from "../catana/utils/gameText";

const RAW_ACTION_LABELS = Object.freeze({
  rollDice: "Rolled dice",
  autoRoll: "Rolled dice",
  placeRoad: "Placed a road",
  placeRoadFromDevCard: "Placed a road",
  placeSettlement: "Placed a settlement",
  placeCity: "Placed a city",
  buyDevCard: "Bought a development card",
  playDevCardStart: "Played a development card",
  maritimeTrade: "Made a maritime trade",
  discardResources: "Discarded resources",
  moveRobber: "Moved the robber",
  endTurn: "Ended the turn",
  resign: "Resigned",
});

const normalizeTurn = (value, fallback = 1) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const buildPlayers = (participants = []) =>
  participants
    .map((participant) => ({
      id: String(participant.seatId),
      name: participant.usernameSnapshot || `Player ${participant.seatId}`,
      color: participant.avatarColorSnapshot ?? null,
    }))
    .sort((left, right) => Number(left.id) - Number(right.id));

const buildPlayerMap = (players) =>
  Object.fromEntries(
    players.map((player) => [
      player.id,
      { name: player.name, color: player.color },
    ])
  );

const readScores = ({ state, players, getVictoryPointsForState }) =>
  Object.fromEntries(
    players.map((player) => {
      try {
        return [player.id, getVictoryPointsForState(state, player.id)];
      } catch (error) {
        return [player.id, null];
      }
    })
  );

const getRawFrameLabel = (frame) => {
  const moveType = frame?.logEntry?.action?.payload?.type;
  return RAW_ACTION_LABELS[moveType] ?? "Game updated";
};

export const clampReplayEventIndex = (eventIndex, eventCount) =>
  Math.min(Math.max(Number(eventIndex) || 0, 0), Math.max(eventCount - 1, 0));

export const buildReplayTimeline = ({
  frames = [],
  participants = [],
  getVictoryPointsForState = (state, playerId) =>
    getVictoryPoints(state?.G?.core, playerId),
} = {}) => {
  const players = buildPlayers(participants);
  const playerMap = buildPlayerMap(players);
  const firstFrame = frames[0] ?? { index: 0, state: null, logEntry: null };
  const initialTurn = normalizeTurn(firstFrame?.state?.G?.core?.turn, 1);
  const events = [
    {
      index: 0,
      frameIndex: 0,
      turn: initialTurn,
      label: "Initial setup",
      logEntryKey: null,
      visibleLogEntries: [],
    },
  ];
  const logEventIndexByKey = {};
  const pendingDisplayLogKeys = [];
  let seenLogCount = 0;

  frames.forEach((frame, frameIndex) => {
    const entries = Array.isArray(frame?.state?.G?.gameLog)
      ? frame.state.G.gameLog
      : [];
    for (let logIndex = seenLogCount; logIndex < entries.length; logIndex += 1) {
      const entry = entries[logIndex];
      const logEntryKey = getGameLogEntryKey(entry, logIndex);
      const label = formatLogEntryText(entry, playerMap);
      if (!label) {
        pendingDisplayLogKeys.push(logEntryKey);
        continue;
      }
      const event = {
        index: events.length,
        frameIndex,
        turn: normalizeTurn(entry?.turn, frame?.state?.G?.core?.turn ?? initialTurn),
        label,
        logEntryKey,
        visibleLogEntries: entries.slice(0, logIndex + 1),
      };
      [...pendingDisplayLogKeys.splice(0), logEntryKey].forEach((key) => {
        logEventIndexByKey[key] = event.index;
      });
      events.push(event);
    }
    seenLogCount = Math.max(seenLogCount, entries.length);
  });

  if (events.length === 1) {
    frames.slice(1).forEach((frame, offset) => {
      events.push({
        index: events.length,
        frameIndex: offset + 1,
        turn: normalizeTurn(frame?.state?.G?.core?.turn, initialTurn),
        label: getRawFrameLabel(frame),
        logEntryKey: null,
        visibleLogEntries: [],
      });
    });
  }

  pendingDisplayLogKeys.forEach((key) => {
    logEventIndexByKey[key] = Math.max(events.length - 1, 0);
  });

  const turnStarts = [];
  events.forEach((event) => {
    if (turnStarts.at(-1)?.turn !== event.turn) {
      turnStarts.push({ turn: event.turn, eventIndex: event.index });
    }
  });
  const scoreSeries = events.map((event) => ({
    eventIndex: event.index,
    turn: event.turn,
    scoresByPlayerId: readScores({
      state: frames[event.frameIndex]?.state,
      players,
      getVictoryPointsForState,
    }),
  }));

  return { events, turnStarts, logEventIndexByKey, players, scoreSeries };
};

export const getPreviousTurnEventIndex = (timeline, currentIndex) => {
  const starts = timeline?.turnStarts ?? [];
  const current = clampReplayEventIndex(currentIndex, timeline?.events?.length ?? 0);
  const currentStart = [...starts].reverse().find((item) => item.eventIndex <= current);
  if (!currentStart) return 0;
  if (current > currentStart.eventIndex) return currentStart.eventIndex;
  return [...starts].reverse().find((item) => item.eventIndex < current)?.eventIndex ?? 0;
};

export const getNextTurnEventIndex = (timeline, currentIndex) => {
  const current = clampReplayEventIndex(currentIndex, timeline?.events?.length ?? 0);
  return (
    (timeline?.turnStarts ?? []).find((item) => item.eventIndex > current)?.eventIndex ??
    Math.max((timeline?.events?.length ?? 1) - 1, 0)
  );
};
```

Keep `buildReplayChatMessages` in `replayClientState.js`, but replace
frame-named index helpers with a compatibility re-export:

```js
export { clampReplayEventIndex as clampReplayFrameIndex } from "./replayTimeline";
```

- [ ] **Step 6: Run timeline and text tests**

Run the command from Step 3.

Expected: PASS.

- [ ] **Step 7: Commit only the timeline slice**

```bash
git add -- app/replays/replayTimeline.js
git add -p -- app/replays/replayClientState.js app/catana/utils/gameText.js app/catana/__tests__/gameText.test.js app/__tests__/replayPageClient.test.js
git diff --cached --check
git commit -m "feat: derive meaningful replay timeline"
```

Expected: the commit contains only replay timeline/text changes.

---

### Task 2: Add deterministic playback state and autoplay

**Files:**
- Create: `app/replays/useReplayPlayback.js`
- Create: `app/__tests__/replayPlayback.test.js`

**Interfaces:**
- Consumes: `clampReplayEventIndex(eventIndex, eventCount)` from Task 1.
- Produces: `REPLAY_SPEEDS = [1, 2, 4]`.
- Produces: `getReplayDelayMs(speed) -> number`.
- Produces: `replayPlaybackReducer(state, action) -> state`.
- Produces: `useReplayPlayback({ eventCount, initialEventIndex })` with `{ eventIndex, isPlaying, speed, seek, previous, next, togglePlaying, setSpeed }`.

- [ ] **Step 1: Write reducer tests first**

Create `app/__tests__/replayPlayback.test.js`:

```js
import { describe, expect, it } from "vitest";
import {
  getReplayDelayMs,
  replayPlaybackReducer,
} from "../replays/useReplayPlayback";

describe("replay playback", () => {
  it("uses the approved speed cadence", () => {
    expect(getReplayDelayMs(1)).toBe(1000);
    expect(getReplayDelayMs(2)).toBe(500);
    expect(getReplayDelayMs(4)).toBe(250);
  });

  it("pauses on manual seek and stops after reaching the end", () => {
    const playing = { eventIndex: 1, eventCount: 3, isPlaying: true, speed: 1 };
    expect(replayPlaybackReducer(playing, { type: "seek", eventIndex: 0 })).toEqual({
      eventIndex: 0,
      eventCount: 3,
      isPlaying: false,
      speed: 1,
    });
    expect(replayPlaybackReducer(playing, { type: "tick" })).toMatchObject({
      eventIndex: 2,
      isPlaying: false,
    });
  });

  it("restarts from the beginning when play is pressed at the end", () => {
    expect(
      replayPlaybackReducer(
        { eventIndex: 4, eventCount: 5, isPlaying: false, speed: 2 },
        { type: "toggle" }
      )
    ).toEqual({ eventIndex: 0, eventCount: 5, isPlaying: true, speed: 2 });
  });
});
```

- [ ] **Step 2: Run the playback test and verify failure**

```bash
pnpm exec vitest run app/__tests__/replayPlayback.test.js --reporter=dot
```

Expected: FAIL because the playback module does not exist.

- [ ] **Step 3: Implement the reducer and timer hook**

Create `app/replays/useReplayPlayback.js`:

```js
"use client";

import { useCallback, useEffect, useReducer } from "react";
import { clampReplayEventIndex } from "./replayTimeline";

export const REPLAY_SPEEDS = Object.freeze([1, 2, 4]);
export const getReplayDelayMs = (speed) => 1000 / (REPLAY_SPEEDS.includes(speed) ? speed : 1);

export const replayPlaybackReducer = (state, action) => {
  const maxIndex = Math.max(state.eventCount - 1, 0);
  switch (action.type) {
    case "syncCount":
      return {
        ...state,
        eventCount: action.eventCount,
        eventIndex: clampReplayEventIndex(state.eventIndex, action.eventCount),
      };
    case "seek":
      return {
        ...state,
        eventIndex: clampReplayEventIndex(action.eventIndex, state.eventCount),
        isPlaying: false,
      };
    case "previous":
      return { ...state, eventIndex: Math.max(state.eventIndex - 1, 0), isPlaying: false };
    case "next":
      return { ...state, eventIndex: Math.min(state.eventIndex + 1, maxIndex), isPlaying: false };
    case "toggle":
      if (state.isPlaying) return { ...state, isPlaying: false };
      return {
        ...state,
        eventIndex: state.eventIndex >= maxIndex ? 0 : state.eventIndex,
        isPlaying: state.eventCount > 1,
      };
    case "setSpeed":
      return REPLAY_SPEEDS.includes(action.speed) ? { ...state, speed: action.speed } : state;
    case "tick": {
      if (!state.isPlaying) return state;
      const nextIndex = Math.min(state.eventIndex + 1, maxIndex);
      return { ...state, eventIndex: nextIndex, isPlaying: nextIndex < maxIndex };
    }
    default:
      return state;
  }
};

export function useReplayPlayback({ eventCount, initialEventIndex = 0 }) {
  const [state, dispatch] = useReducer(replayPlaybackReducer, {
    eventIndex: clampReplayEventIndex(initialEventIndex, eventCount),
    eventCount,
    isPlaying: false,
    speed: 1,
  });

  useEffect(() => {
    dispatch({ type: "syncCount", eventCount });
  }, [eventCount]);

  useEffect(() => {
    if (!state.isPlaying) return undefined;
    const timeoutId = window.setTimeout(
      () => dispatch({ type: "tick" }),
      getReplayDelayMs(state.speed)
    );
    return () => window.clearTimeout(timeoutId);
  }, [state.eventIndex, state.isPlaying, state.speed]);

  return {
    ...state,
    seek: useCallback((eventIndex) => dispatch({ type: "seek", eventIndex }), []),
    previous: useCallback(() => dispatch({ type: "previous" }), []),
    next: useCallback(() => dispatch({ type: "next" }), []),
    togglePlaying: useCallback(() => dispatch({ type: "toggle" }), []),
    setSpeed: useCallback((speed) => dispatch({ type: "setSpeed", speed }), []),
  };
}
```

- [ ] **Step 4: Run the playback test**

Run the command from Step 2.

Expected: PASS.

- [ ] **Step 5: Commit the isolated playback module**

```bash
git add -- app/replays/useReplayPlayback.js app/__tests__/replayPlayback.test.js
git diff --cached --check
git commit -m "feat: add replay playback state"
```

---

### Task 3: Make the existing game log controllable by replay position

**Files:**
- Modify: `app/catana/components/FeedPanelScrollState.js`
- Modify: `app/catana/components/FeedPanel.js`
- Modify: `app/catana/components/GameLogPanel.js`
- Modify: `app/catana/components/LeftMetaRail.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/__tests__/FeedPanel.test.js`
- Modify: `app/catana/__tests__/GameLogPanel.test.js`
- Modify: `app/catana/__tests__/LeftMetaRail.test.js`
- Modify: `app/catana/__tests__/GameScreen.logPresentation.test.js`

**Interfaces:**
- Consumes: `getGameLogEntryKey(entry, index)` from Task 1.
- `GameScreen` consumes replay-only props `replayLogEntries`, `replayActiveLogEntryKey`, and `onReplayLogEntrySelect`.
- `LeftMetaRail` and `GameLogPanel` pass `activeEntryKey` and `onEntrySelect` through unchanged.
- `FeedPanel` consumes `activeRowKey` and scrolls that row into view with `behavior: "auto"`.

- [ ] **Step 1: Add failing controlled-log source and rendering tests**

Add focused assertions to the existing tests:

```js
// GameLogPanel.test.js
it("supports replay selection and active-row styling", () => {
  const contents = fs.readFileSync(componentPath, "utf8");
  expect(contents).toContain("activeEntryKey");
  expect(contents).toContain("onEntrySelect");
  expect(contents).toContain("aria-current");
});

// LeftMetaRail.test.js
it("passes replay log selection through desktop and mobile panels", () => {
  const contents = fs.readFileSync(leftMetaRailPath, "utf8");
  expect(contents).toContain("activeEntryKey");
  expect(contents).toContain("onEntrySelect");
});

// GameScreen.logPresentation.test.js
it("uses controlled replay entries without changing live presentation", () => {
  const source = fs.readFileSync(screenPath, "utf8");
  expect(source).toContain("bgioProps.replayLogEntries");
  expect(source).toContain("replayActiveLogEntryKey");
  expect(source).toContain("onReplayLogEntrySelect");
  expect(source).toMatch(/if \(isReplay\) return;/);
});
```

Add an SSR assertion to `FeedPanel.test.js`:

```js
it("marks the active row for replay scrolling", () => {
  const markup = renderToStaticMarkup(
    React.createElement(FeedPanel, {
      rows: [{ key: "row-1", label: "Hello" }],
      activeRowKey: "row-1",
      renderRow: (row) => React.createElement("span", null, row.label),
    })
  );
  expect(markup).toContain('data-feed-row-active="true"');
});
```

- [ ] **Step 2: Run the focused Catana tests and verify failure**

```bash
pnpm exec vitest run app/catana/__tests__/FeedPanel.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/GameScreen.logPresentation.test.js --reporter=dot
```

Expected: FAIL on the new replay-control assertions.

- [ ] **Step 3: Add active-row scrolling to the shared feed shell**

Export this helper from `FeedPanelScrollState.js`:

```js
export const scrollFeedPanelRowIntoView = (rowElement) => {
  if (!rowElement || typeof rowElement.scrollIntoView !== "function") return false;
  rowElement.scrollIntoView({ block: "nearest", behavior: "auto" });
  return true;
};
```

In `FeedPanel.js`, import `scrollFeedPanelRowIntoView`, add `activeRowKey`, a
`rowRefs` map, and the following effect:

```js
const rowRefs = useRef(new Map());

useEffect(() => {
  if (activeRowKey == null) return;
  scrollFeedPanelRowIntoView(rowRefs.current.get(String(activeRowKey)));
}, [activeRowKey]);
```

Attach each mapped row using:

```js
const rowKey = String(row?.key ?? row?.id ?? index);
return React.createElement(
  "div",
  {
    key: rowKey,
    ref: (node) => {
      if (node) rowRefs.current.set(rowKey, node);
      else rowRefs.current.delete(rowKey);
    },
    className: entryClassName,
    "data-feed-row-active": String(activeRowKey) === rowKey ? "true" : undefined,
  },
  renderRow ? renderRow(row, index) : row
);
```

- [ ] **Step 4: Add replay interaction to `GameLogPanel` and `LeftMetaRail`**

In `GameLogPanel.js`, import `getGameLogEntryKey`, retain each original entry,
and render selectable rows only when `onEntrySelect` exists:

```jsx
const key = getGameLogEntryKey(entry, entryIndex);
return {
  key,
  entry,
  tokens,
  isActive: String(activeEntryKey) === key,
  isServerEntry: typeof entry?.type === "string" && entry.type.startsWith("server:"),
};
```

Pass `activeRowKey={activeEntryKey}` to `FeedPanel`. The row wrapper becomes:

```jsx
<div
  className={`game-log-entry break-words rounded-lg px-1.5 py-0.5 text-sm leading-5 ${
    entry.isActive ? "bg-amber-100/75 ring-1 ring-amber-300/70" : ""
  } ${entry.isServerEntry ? "italic text-slate-600" : "text-slate-800"}`}
  role={onEntrySelect ? "button" : undefined}
  tabIndex={onEntrySelect ? 0 : undefined}
  aria-current={entry.isActive ? "step" : undefined}
  onClick={onEntrySelect ? () => onEntrySelect(entry.key) : undefined}
  onKeyDown={
    onEntrySelect
      ? (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          onEntrySelect(entry.key);
        }
      : undefined
  }
>
  {entry.tokens.map((token, tokenIndex) => (
    <FeedTokenRow key={`${entry.key}-${tokenIndex}`} token={token} themeId={themeId} />
  ))}
</div>
```

Include `activeEntryKey` in the formatted-entry memo dependencies so the
highlight cannot become stale:

```js
}, [entries, playerMap, activeEntryKey]);
```

Add `activeEntryKey` and `onEntrySelect` to `buildMetaPanels`,
`DesktopMetaDockComponent`, and `MobileMetaRailComponent`, then pass both props
to the desktop and mobile `GameLogPanel` instances.

- [ ] **Step 5: Select replay entries directly in `GameScreen`**

Keep the existing live presentation state. Change only the derived visible
entries and replay effect guard:

```js
const replayLogEntries = Array.isArray(bgioProps.replayLogEntries)
  ? bgioProps.replayLogEntries
  : canonicalGameLogEntries;

const visibleLogEntries = useMemo(
  () =>
    isReplay
      ? replayLogEntries
      : mergeVisibleLogEntries(presentedGameLogEntries, [
          ...(disconnectPresence?.events ?? []),
          ...(idlePresence?.events ?? []),
        ]),
  [
    isReplay,
    replayLogEntries,
    presentedGameLogEntries,
    disconnectPresence,
    idlePresence,
  ]
);
```

At the beginning of the incoming-log classification effect, add:

```js
if (isReplay) return undefined;
```

Include `isReplay` in that effect's dependency list. Pass the replay props to
`LeftMetaRail`:

```jsx
activeEntryKey={isReplay ? bgioProps.replayActiveLogEntryKey : null}
onEntrySelect={isReplay ? bgioProps.onReplayLogEntrySelect : null}
```

- [ ] **Step 6: Run the controlled-log tests**

Run the command from Step 2.

Expected: PASS, with existing live log assertions unchanged.

- [ ] **Step 7: Commit only controlled-log hunks**

```bash
git add -p -- app/catana/components/FeedPanelScrollState.js app/catana/components/FeedPanel.js app/catana/components/GameLogPanel.js app/catana/components/LeftMetaRail.js app/catana/GameScreen.js app/catana/__tests__/FeedPanel.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/GameScreen.logPresentation.test.js
git diff --cached --check
git commit -m "feat: synchronize replay game log"
```

---

### Task 4: Add Recharts and the Catana victory-point chart

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `app/replays/components/ReplayScoreChart.jsx`
- Create: `app/__tests__/replayScoreChart.source.test.js`

**Interfaces:**
- Consumes: `players`, `scoreSeries`, and `turnStarts` from `ReplayTimeline`.
- Produces: `ReplayScoreChart({ players, scoreSeries, turnStarts, currentEventIndex, victoryTarget, onSeek })`.

- [ ] **Step 1: Write the chart contract test**

Create `app/__tests__/replayScoreChart.source.test.js`:

```js
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.resolve(process.cwd(), "app/replays/components/ReplayScoreChart.jsx"),
  "utf8"
);

describe("ReplayScoreChart", () => {
  it("uses Recharts as a Catana-owned stepped VP chart", () => {
    expect(source).toContain('from "recharts"');
    expect(source).toContain("ResponsiveContainer");
    expect(source).toContain("ReferenceLine");
    expect(source).toContain('type="stepAfter"');
    expect(source).toContain("accessibilityLayer");
    expect(source).toContain("onSeek");
    expect(source).not.toContain("Tooltip");
  });
});
```

- [ ] **Step 2: Run the chart test and verify failure**

```bash
pnpm exec vitest run app/__tests__/replayScoreChart.source.test.js --reporter=dot
```

Expected: FAIL because the chart file does not exist.

- [ ] **Step 3: Install the approved chart dependencies**

```bash
pnpm add recharts@3.9.2 react-is@^18.2.0
```

Expected: `package.json` gains both runtime dependencies and `pnpm-lock.yaml`
resolves Recharts against React 18. Preserve the existing uncommitted R3F and
Three.js dependency changes.

- [ ] **Step 4: Implement the score chart**

Create `ReplayScoreChart.jsx` using the following implementation shape:

```jsx
"use client";

import React, { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { getPlayerNameHex } from "../../catana/theme/playerColors";

const FALLBACK_COLORS = ["#f59e0b", "#3b82f6", "#22c55e", "#a855f7"];

export function ReplayScoreChart({
  players = [],
  scoreSeries = [],
  turnStarts = [],
  currentEventIndex = 0,
  victoryTarget = 10,
  onSeek,
}) {
  const currentScores = scoreSeries[currentEventIndex]?.scoresByPlayerId ?? {};
  const turnByEventIndex = useMemo(
    () => Object.fromEntries(turnStarts.map((item) => [item.eventIndex, item.turn])),
    [turnStarts]
  );
  const numericScores = scoreSeries.flatMap((sample) =>
    Object.values(sample.scoresByPlayerId).filter(Number.isFinite)
  );
  const maxScore = Math.max(victoryTarget, ...numericScores);
  const handleChartClick = (chartState) => {
    const nextIndex = Number(chartState?.activeLabel);
    if (Number.isFinite(nextIndex)) onSeek?.(nextIndex);
  };

  if (players.length === 0 || scoreSeries.length === 0 || numericScores.length === 0) return null;

  return (
    <section aria-label="Victory points over the replay" className="mt-4">
      <div className="h-44 w-full" data-replay-score-chart="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={scoreSeries}
            margin={{ top: 8, right: 8, bottom: 4, left: -20 }}
            onClick={handleChartClick}
            accessibilityLayer
          >
            <CartesianGrid stroke="rgba(100,116,139,0.2)" vertical={false} />
            <XAxis
              type="number"
              dataKey="eventIndex"
              domain={[0, Math.max(scoreSeries.length - 1, 0)]}
              ticks={turnStarts.map((item) => item.eventIndex)}
              tickFormatter={(eventIndex) => `T${turnByEventIndex[eventIndex] ?? ""}`}
              tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              domain={[0, maxScore]}
              tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <ReferenceLine x={currentEventIndex} stroke="#f59e0b" strokeWidth={2} />
            {players.map((player, playerIndex) => (
              <Line
                key={player.id}
                type="stepAfter"
                dataKey={(sample) => sample.scoresByPlayerId[player.id]}
                name={player.name}
                stroke={getPlayerNameHex(player.color) ?? FALLBACK_COLORS[playerIndex]}
                strokeWidth={3}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs font-semibold text-slate-700">
        {players.map((player, playerIndex) => (
          <li key={player.id} className="flex min-w-0 items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: getPlayerNameHex(player.color) ?? FALLBACK_COLORS[playerIndex] }}
              aria-hidden="true"
            />
            <span className="truncate">{player.name}</span>
            <span className="ml-auto tabular-nums">{currentScores[player.id] ?? "—"} VP</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 5: Run chart and dependency verification**

```bash
pnpm exec vitest run app/__tests__/replayScoreChart.source.test.js --reporter=dot
pnpm list recharts react-is --depth 0
```

Expected: test PASS; dependency list includes `recharts 3.9.2` and React-18-
compatible `react-is`.

- [ ] **Step 6: Commit only Recharts and chart hunks**

```bash
git add -- app/replays/components/ReplayScoreChart.jsx app/__tests__/replayScoreChart.source.test.js
git add -p -- package.json pnpm-lock.yaml
git diff --cached --check
git commit -m "feat: add replay victory point chart"
```

Before committing, verify the staged package diff does not include the existing
R3F, Three.js, or deployment-script changes.

---

### Task 5: Build the responsive replay console

**Files:**
- Create: `app/replays/components/ReplayTransportControls.jsx`
- Create: `app/replays/components/ReplayConsole.jsx`
- Create: `app/__tests__/replayConsole.source.test.js`
- Delete after integration: `app/replays/components/ReplayControls.js`

**Interfaces:**
- Consumes: `ReplayTimeline`, playback state/actions from Task 2, and `ReplayScoreChart` from Task 4.
- Produces: `ReplayConsole({ timeline, currentEvent, currentEventIndex, isPlaying, speed, victoryTarget, mobileOpen, onMobileOpenChange, onPreviousEvent, onNextEvent, onPreviousTurn, onNextTurn, onTogglePlaying, onSeek, onSpeedChange })`.
- `ReplayTransportControls` renders event, turn, scrubber, and speed controls for both desktop and mobile shells.

- [ ] **Step 1: Write the console source contract**

Create `app/__tests__/replayConsole.source.test.js`:

```js
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (name) =>
  fs.readFileSync(path.resolve(process.cwd(), `app/replays/components/${name}`), "utf8");

describe("ReplayConsole", () => {
  it("ships desktop, collapsed, and mobile replay controls", () => {
    const consoleSource = read("ReplayConsole.jsx");
    const transportSource = read("ReplayTransportControls.jsx");
    expect(consoleSource).toContain('import { Drawer } from "vaul"');
    expect(consoleSource).toContain("ReplayScoreChart");
    expect(consoleSource).toContain("data-replay-console");
    expect(consoleSource).toContain("data-replay-mobile-dock");
    expect(transportSource).toContain("Previous event");
    expect(transportSource).toContain("Next event");
    expect(transportSource).toContain("Previous turn");
    expect(transportSource).toContain("Next turn");
    expect(transportSource).toContain("turnStarts");
    expect(transportSource).toContain("data-replay-turn-marker");
    expect(transportSource).toContain("REPLAY_SPEEDS");
    expect(transportSource).not.toContain("0.5");
  });
});
```

- [ ] **Step 2: Run the console test and verify failure**

```bash
pnpm exec vitest run app/__tests__/replayConsole.source.test.js --reporter=dot
```

Expected: FAIL because the console files do not exist.

- [ ] **Step 3: Implement shared transport controls**

Create `ReplayTransportControls.jsx`. Use existing `Button`/`IconButton` and
Heroicons, with these exact behaviors:

```jsx
"use client";

import React from "react";
import {
  BackwardIcon,
  ForwardIcon,
  PauseIcon,
  PlayIcon,
} from "@heroicons/react/24/solid";
import { Button } from "../../ui/Button";
import { IconButton } from "../../ui/IconButton";
import { REPLAY_SPEEDS } from "../useReplayPlayback";

export function ReplayTransportControls({
  currentEvent,
  currentEventIndex,
  eventCount,
  turnStarts = [],
  isPlaying,
  speed,
  onPreviousEvent,
  onNextEvent,
  onPreviousTurn,
  onNextTurn,
  onTogglePlaying,
  onSeek,
  onSpeedChange,
  compact = false,
  rail = false,
}) {
  const atStart = currentEventIndex <= 0;
  const atEnd = currentEventIndex >= Math.max(eventCount - 1, 0);
  return (
    <div className="space-y-3" data-replay-transport="true">
      {!compact ? (
        <div>
          <div className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-slate-500">
            Turn {currentEvent?.turn ?? "—"}
          </div>
          <div className="mt-1 min-h-10 text-sm font-bold leading-5 text-slate-900" aria-live="polite">
            {currentEvent?.label ?? "Initial setup"}
          </div>
        </div>
      ) : null}
      <div className={`flex items-center justify-center gap-2 ${rail ? "flex-col" : "flex-row"}`}>
        <IconButton size="sm" variant="secondary" aria-label="Previous event" onClick={onPreviousEvent} disabled={atStart}>
          <BackwardIcon className="h-4 w-4" />
        </IconButton>
        <IconButton size="md" variant="primary" aria-label={isPlaying ? "Pause replay" : "Play replay"} onClick={onTogglePlaying} disabled={eventCount <= 1}>
          {isPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
        </IconButton>
        <IconButton size="sm" variant="secondary" aria-label="Next event" onClick={onNextEvent} disabled={atEnd}>
          <ForwardIcon className="h-4 w-4" />
        </IconButton>
      </div>
      {!compact ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="subtle" onClick={onPreviousTurn}>Previous turn</Button>
            <Button size="sm" variant="subtle" onClick={onNextTurn}>Next turn</Button>
          </div>
          <label className="block text-xs font-semibold text-slate-600">
            <span className="flex justify-between"><span>Timeline</span><span>{currentEventIndex + 1}/{Math.max(eventCount, 1)}</span></span>
            <div className="relative mt-2">
              <input className="relative z-10 w-full accent-lime-500" type="range" min="0" max={Math.max(eventCount - 1, 0)} value={currentEventIndex} onChange={(event) => onSeek(Number(event.target.value))} />
              <div className="pointer-events-none absolute inset-x-2 top-1/2 h-2 -translate-y-1/2" aria-hidden="true">
                {turnStarts.slice(1).map((item) => (
                  <span key={`${item.turn}-${item.eventIndex}`} data-replay-turn-marker="true" className="absolute top-0 h-2 w-px bg-slate-500/45" style={{ left: `${(item.eventIndex / Math.max(eventCount - 1, 1)) * 100}%` }} />
                ))}
              </div>
            </div>
          </label>
          <div className="flex items-center justify-between gap-2" aria-label="Replay speed">
            {REPLAY_SPEEDS.map((option) => (
              <button key={option} type="button" onClick={() => onSpeedChange(option)} aria-pressed={speed === option} className={`min-h-9 flex-1 rounded-xl text-xs font-extrabold ${speed === option ? "bg-amber-400 text-slate-900" : "bg-white/45 text-slate-700"}`}>
                {option}x
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Implement desktop and mobile shells**

Create `ReplayConsole.jsx`. Local UI state owns desktop collapse; the parent
controls mobile sheet openness so it can coordinate with the existing mobile
Log/Chat drawer. Use the existing viewport hook so only the visible chart is
mounted.

```jsx
"use client";

import React, { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { Drawer } from "vaul";
import useWindowSize from "../../catana/utils/useWindowSize";
import { ReplayScoreChart } from "./ReplayScoreChart";
import { ReplayTransportControls } from "./ReplayTransportControls";

export function ReplayConsole(props) {
  const [collapsed, setCollapsed] = useState(false);
  const { width, isMeasured } = useWindowSize();
  const isPhoneLayout = isMeasured && width < 640;
  const transportProps = {
    currentEvent: props.currentEvent,
    currentEventIndex: props.currentEventIndex,
    eventCount: props.timeline.events.length,
    turnStarts: props.timeline.turnStarts,
    isPlaying: props.isPlaying,
    speed: props.speed,
    onPreviousEvent: props.onPreviousEvent,
    onNextEvent: props.onNextEvent,
    onPreviousTurn: props.onPreviousTurn,
    onNextTurn: props.onNextTurn,
    onTogglePlaying: props.onTogglePlaying,
    onSeek: props.onSeek,
    onSpeedChange: props.onSpeedChange,
  };
  const renderChart = () => (
    <ReplayScoreChart
      players={props.timeline.players}
      scoreSeries={props.timeline.scoreSeries}
      turnStarts={props.timeline.turnStarts}
      currentEventIndex={props.currentEventIndex}
      victoryTarget={props.victoryTarget}
      onSeek={props.onSeek}
    />
  );

  if (!isMeasured) return null;

  return (
    <>
      {!isPhoneLayout ? <aside className={`fixed bottom-4 right-4 top-4 z-[55] ${collapsed ? "w-16" : "w-[22rem]"}`} data-replay-console="desktop" data-allow-interaction="true">
        <div className="flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-white/55 bg-blue-100/82 p-3 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.72)] ring-1 ring-white/40 backdrop-blur-2xl">
          <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
            {!collapsed ? <div><p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-slate-500">Archived replay</p><h1 className="text-lg font-extrabold text-slate-900">Match analysis</h1></div> : null}
            <button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-white/55 text-slate-700" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand replay console" : "Collapse replay console"}>
              {collapsed ? <ChevronLeftIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
            </button>
          </div>
          <div className={collapsed ? "mt-4" : "mt-5 min-h-0 flex-1 overflow-y-auto px-1 pb-2"}>
            <ReplayTransportControls {...transportProps} compact={collapsed} rail={collapsed} />
            {!collapsed ? renderChart() : null}
          </div>
        </div>
      </aside> : null}

      {isPhoneLayout ? <><div className="fixed inset-x-3 bottom-3 z-[55]" data-replay-mobile-dock="true" data-allow-interaction="true">
        <div className="rounded-[1.25rem] border border-white/55 bg-blue-100/88 p-2 shadow-[0_20px_55px_-28px_rgba(15,23,42,0.75)] ring-1 ring-white/40 backdrop-blur-2xl">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 px-2"><div className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-slate-500">Turn {props.currentEvent?.turn ?? "—"}</div><div className="truncate text-xs font-bold text-slate-900">{props.currentEvent?.label}</div></div>
            <ReplayTransportControls {...transportProps} compact />
            <button type="button" className="min-h-10 rounded-xl bg-white/55 px-3 text-xs font-extrabold text-slate-800" onClick={() => props.onMobileOpenChange(true)}>Details</button>
          </div>
        </div>
      </div>

      <Drawer.Root open={props.mobileOpen} onOpenChange={props.onMobileOpenChange} direction="bottom" dismissible modal={false} noBodyStyles>
        <Drawer.Portal>
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[70] mx-auto flex h-[min(68vh,34rem)] w-full max-w-[30rem] flex-col overflow-hidden rounded-t-[1.55rem] border border-white/55 bg-blue-100/95 p-4 shadow-[0_-28px_70px_-38px_rgba(15,23,42,0.72)] backdrop-blur-2xl" data-allow-interaction="true">
            <Drawer.Handle className="!mx-auto !mb-3 !mt-0 !h-1.5 !w-14 !rounded-full !bg-slate-500/36" />
            <Drawer.Title className="text-lg font-extrabold text-slate-900">Archived replay</Drawer.Title>
            <Drawer.Description className="sr-only">Replay navigation and victory point history.</Drawer.Description>
            <div className="mt-3 min-h-0 flex-1 overflow-y-auto"><ReplayTransportControls {...transportProps} />{renderChart()}</div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root></> : null}
    </>
  );
}
```

- [ ] **Step 5: Run the console source test**

Run the command from Step 2.

Expected: PASS.

- [ ] **Step 6: Commit the console components**

```bash
git add -- app/replays/components/ReplayTransportControls.jsx app/replays/components/ReplayConsole.jsx app/__tests__/replayConsole.source.test.js
git diff --cached --check
git commit -m "feat: add responsive replay console"
```

Do not delete `ReplayControls.js` until Task 6 no longer imports it.

---

### Task 6: Integrate timeline, playback, console, graph, keyboard, and log

**Files:**
- Modify: `app/replays/[replayId]/ReplayPageClient.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/__tests__/GameScreen.logPresentation.test.js`
- Delete: `app/replays/components/ReplayControls.js`
- Modify: `app/__tests__/replayPage.test.js`
- Create: `app/__tests__/replayPageClient.source.test.js`

**Interfaces:**
- Consumes all Task 1–5 interfaces.
- Produces a replay client where one `eventIndex` controls board state, event label, log visibility, chart cursor, scrubber, and turn navigation.

- [ ] **Step 1: Replace the old controls test with the integration contract**

Remove the old SSR test that imports `ReplayControls`. Add this source test in
`app/__tests__/replayPageClient.source.test.js`:

```js
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.resolve(process.cwd(), "app/replays/[replayId]/ReplayPageClient.js"),
  "utf8"
);

describe("ReplayPageClient", () => {
  it("drives board, log, chart, transport, and keyboard from one event index", () => {
    expect(source).toContain("buildReplayTimeline");
    expect(source).toContain("useReplayPlayback");
    expect(source).toContain("ReplayConsole");
    expect(source).toContain("replayLogEntries");
    expect(source).toContain("replayActiveLogEntryKey");
    expect(source).toContain("onReplayLogEntrySelect");
    expect(source).toContain("replayConsoleMobileOpen");
    expect(source).toContain("onReplayMobileMetaPanelOpen");
    expect(source).toContain('event.key === "ArrowLeft"');
    expect(source).toContain('event.key === "ArrowRight"');
    expect(source).toContain('event.key === " "');
    expect(source).not.toContain("ReplayControls");
  });
});
```

- [ ] **Step 2: Run replay page tests and verify failure**

```bash
pnpm exec vitest run app/__tests__/replayPage.test.js app/__tests__/replayPageClient.source.test.js --reporter=dot
```

Expected: FAIL because `ReplayPageClient` still uses raw frame controls.

- [ ] **Step 3: Rebuild `ReplayPageClient` around event index**

Keep `buildReplayMatchData` and archived chat mapping. Replace frame state with:

```js
const safeFrames = useMemo(
  () =>
    frames.length > 0
      ? frames
      : [{ index: 0, state: replay.initialState, logEntry: null }],
  [frames, replay.initialState]
);
const timeline = useMemo(
  () => buildReplayTimeline({ frames: safeFrames, participants: replay.participants ?? [] }),
  [safeFrames, replay.participants]
);
const playback = useReplayPlayback({
  eventCount: timeline.events.length,
  initialEventIndex: initialFrameIndex > 0 ? timeline.events.length - 1 : 0,
});
const currentEvent = timeline.events[playback.eventIndex] ?? timeline.events[0];
const currentFrame = safeFrames[currentEvent?.frameIndex ?? 0] ?? safeFrames[0];
const currentState = currentFrame?.state ?? replay.initialState;
const [mobileReplayOpen, setMobileReplayOpen] = useState(false);
```

Pass these replay-only props to `GameScreen`:

```js
replayLogEntries: currentEvent?.visibleLogEntries ?? [],
replayActiveLogEntryKey: currentEvent?.logEntryKey ?? null,
onReplayLogEntrySelect: (entryKey) => {
  const nextIndex = timeline.logEventIndexByKey[String(entryKey)];
  if (Number.isInteger(nextIndex)) playback.seek(nextIndex);
},
replayConsoleMobileOpen: mobileReplayOpen,
onReplayMobileMetaPanelOpen: () => setMobileReplayOpen(false),
```

Render `ReplayConsole` after `GameScreen` with the timeline and playback props.
Turn callbacks use the Task 1 helpers:

```js
onPreviousTurn={() =>
  playback.seek(getPreviousTurnEventIndex(timeline, playback.eventIndex))
}
onNextTurn={() =>
  playback.seek(getNextTurnEventIndex(timeline, playback.eventIndex))
}
```

Read the victory target from:

```js
const victoryTarget = currentState?.G?.core?.ruleset?.victoryPointsToWin ?? 10;
```

Pass `mobileOpen={mobileReplayOpen}` and
`onMobileOpenChange={setMobileReplayOpen}` to `ReplayConsole`.

In `GameScreen`, close Log/Chat when replay details open, and close replay
details when a mobile feed opens:

```js
useEffect(() => {
  if (!isReplay || !bgioProps.replayConsoleMobileOpen) return;
  setMobileMetaPanel(null);
}, [isReplay, bgioProps.replayConsoleMobileOpen]);

const handleMobileMetaPanelChange = useCallback(
  (panelId) => {
    setMobileMetaPanel(panelId);
    if (isReplay && panelId) {
      bgioProps.onReplayMobileMetaPanelOpen?.();
    }
  },
  [isReplay, bgioProps.onReplayMobileMetaPanelOpen]
);
```

Pass `handleMobileMetaPanelChange` to `LeftMetaRail` instead of the raw state
setter. Add source assertions for both replay mobile props to
`GameScreen.logPresentation.test.js`.

```js
expect(source).toContain("replayConsoleMobileOpen");
expect(source).toContain("onReplayMobileMetaPanelOpen");
expect(source).toContain("!isReplay && isGameOver");
```

Keep live postgame overlays out of replay mode. Define:

```js
const showResultsButton =
  !isReplay && isGameOver && !showGameOverModal && !showPostgame;
```

At the start of the game-over presentation effect, add:

```js
if (isReplay) {
  gameOverSeenRef.current = isGameOver;
  setShowGameOverModal(false);
  setShowPostgame(false);
  return;
}
```

Include `isReplay` in that effect's dependencies and guard the two postgame
render blocks with `!isReplay`. This prevents the final replay event from
covering the analysis board with live-results UI.

- [ ] **Step 4: Add replay keyboard navigation**

Add a `useEffect` that ignores editable targets and owns replay keys:

```js
const replayEventIndex = playback.eventIndex;
const seekReplayEvent = playback.seek;
const toggleReplayPlaying = playback.togglePlaying;

useEffect(() => {
  const handleKeyDown = (event) => {
    const target = event.target;
    if (
      target?.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target?.tagName)
    ) {
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      seekReplayEvent(
        event.shiftKey
          ? getPreviousTurnEventIndex(timeline, replayEventIndex)
          : replayEventIndex - 1
      );
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      seekReplayEvent(
        event.shiftKey
          ? getNextTurnEventIndex(timeline, replayEventIndex)
          : replayEventIndex + 1
      );
    }
    if (event.key === " ") {
      event.preventDefault();
      toggleReplayPlaying();
    }
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [replayEventIndex, seekReplayEvent, timeline, toggleReplayPlaying]);
```

- [ ] **Step 5: Remove obsolete top banner and old controls**

Remove `getFrameLabel`, the fixed top archived banner, the `ReplayControls`
import/render, and `app/replays/components/ReplayControls.js`. Match metadata is
available inside the replay console; the board should regain the full game-
screen composition.

- [ ] **Step 6: Run replay integration tests**

Run the command from Step 2 plus:

```bash
pnpm exec vitest run app/__tests__/replayPlayback.test.js app/__tests__/replayPageClient.test.js app/catana/__tests__/GameScreen.logPresentation.test.js --reporter=dot
```

Expected: PASS.

- [ ] **Step 7: Commit replay client integration**

```bash
git add -- app/__tests__/replayPageClient.source.test.js
git add -p -- app/replays/[replayId]/ReplayPageClient.js app/catana/GameScreen.js app/catana/__tests__/GameScreen.logPresentation.test.js app/__tests__/replayPage.test.js
git rm -- app/replays/components/ReplayControls.js
git diff --cached --check
git commit -m "feat: integrate archived replay analysis"
```

---

### Task 7: Prefer archives for explicit replay URLs and handle preparation

**Files:**
- Modify: `lib/server/matches/getMatchPageData.js`
- Modify: `lib/server/__tests__/getMatchPageData.test.js`
- Modify: `app/g/[matchID]/page-content.js`
- Modify: `app/__tests__/gMatchPage.test.js`
- Modify: `app/replays/[replayId]/page-content.js`
- Modify: `app/__tests__/replayPage.test.js`
- Create: `app/replays/components/ReplayStatusPage.jsx`
- Create: `app/__tests__/replayStatusPage.source.test.js`

**Interfaces:**
- `getMatchPageData(matchID, { preferArchived?: boolean, ...deps })` preserves live-first lookup by default and performs archive-first lookup when requested.
- `ReplayStatusPage({ matchID, status })`, where `status` is `"preparing"`, `"active"`, or `"invalid"`.
- `GMatchPage` treats `searchParams.view === "replay"` as explicit replay intent.

- [ ] **Step 1: Write archive-first server tests**

Add to `getMatchPageData.test.js`:

```js
it("prefers an archived match when replay intent is explicit", async () => {
  const getMatchPageData = await loadGetMatchPageData();
  const fetchImpl = vi.fn();
  const archivedMatch = { match: { replayId: "r1" }, participants: [], log: [] };
  const getArchivedMatchByMatchId = vi.fn().mockResolvedValue(archivedMatch);
  const result = await getMatchPageData("m1", {
    preferArchived: true,
    fetchImpl,
    getArchivedMatchByMatchId,
  });
  expect(result).toEqual({ kind: "archived", matchID: "m1", archivedMatch });
  expect(fetchImpl).not.toHaveBeenCalled();
});

it("returns the live match while an explicitly requested archive is still absent", async () => {
  const getMatchPageData = await loadGetMatchPageData();
  const getArchivedMatchByMatchId = vi.fn().mockResolvedValue(null);
  const fetchImpl = vi.fn().mockResolvedValue(okJson({ matchID: "m1", gameover: true }));
  const result = await getMatchPageData("m1", {
    preferArchived: true,
    fetchImpl,
    baseUrl: "http://game:8000",
    getArchivedMatchByMatchId,
  });
  expect(result).toMatchObject({ kind: "live", liveMatch: { gameover: true } });
});

it("rechecks the archive if the live copy disappears during replay lookup", async () => {
  const getMatchPageData = await loadGetMatchPageData();
  const archivedMatch = { match: { replayId: "r1" }, participants: [], log: [] };
  const getArchivedMatchByMatchId = vi
    .fn()
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce(archivedMatch);
  const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 });
  const result = await getMatchPageData("m1", {
    preferArchived: true,
    fetchImpl,
    baseUrl: "http://game:8000",
    getArchivedMatchByMatchId,
  });
  expect(result).toEqual({ kind: "archived", matchID: "m1", archivedMatch });
  expect(getArchivedMatchByMatchId).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 2: Write route-state tests**

Add cases to `gMatchPage.test.js` that assert:

```js
expect(getMatchPageData).toHaveBeenCalledWith("m1", { preferArchived: true });
expect(html).toContain("Replay status preparing for m1");
```

for `{ kind: "live", liveMatch: { gameover: true } }`, and:

```js
expect(html).toContain("Replay status active for m1");
```

for `{ kind: "live", liveMatch: { gameover: false } }`. Inject a test double:

```js
const ReplayStatusPage = ({ matchID, status }) =>
  h("div", null, `Replay status ${status} for ${matchID}`);
```

Add an explicit archive case expecting `initialFrameIndex` to be `0`, while
retaining the ordinary archived fallback assertion that starts at the final
frame.

- [ ] **Step 3: Run route tests and verify failure**

```bash
pnpm exec vitest run lib/server/__tests__/getMatchPageData.test.js app/__tests__/gMatchPage.test.js app/__tests__/replayPage.test.js --reporter=dot
```

Expected: FAIL because replay intent is not recognized.

- [ ] **Step 4: Implement archive-first lookup without regressing live-first lookup**

Refactor `getMatchPageData.js` around one archive helper and one live helper:

```js
const readArchived = async (matchID, getArchivedMatchByMatchIdImpl) => {
  const archivedMatch = await getArchivedMatchByMatchIdImpl(matchID);
  return archivedMatch ? { kind: "archived", matchID, archivedMatch } : null;
};

export const getMatchPageData = async (
  matchID,
  {
    fetchImpl = fetch,
    baseUrl,
    preferArchived = false,
    getArchivedMatchByMatchId: getArchivedMatchByMatchIdImpl = getArchivedMatchByMatchId,
  } = {}
) => {
  if (!matchID) return { kind: "missing", matchID: matchID ?? null };
  if (preferArchived) {
    const archived = await readArchived(matchID, getArchivedMatchByMatchIdImpl);
    if (archived) return archived;
  }
  try {
    const response = await fetchImpl(`${getGameServerBaseUrl(baseUrl)}/games/${GAME_NAME}/${matchID}`, {
      method: "GET",
      cache: "no-store",
    });
    if (response?.ok) {
      return { kind: "live", matchID, liveMatch: (await readJson(response)) ?? null };
    }
  } catch (error) {
    // Archive fallback below.
  }
  const archived = await readArchived(matchID, getArchivedMatchByMatchIdImpl);
  if (archived) return archived;
  return { kind: "missing", matchID };
};
```

- [ ] **Step 5: Add the bounded replay status client**

Create `app/replays/components/ReplayStatusPage.jsx`:

```jsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../ui/Button";
import { CATANA_TABLE_BACKGROUND } from "../../catana/theme/backgrounds";

const COPY = {
  preparing: ["Preparing replay…", "The finished match is being archived."],
  active: ["Replay available after the match", "This match is still in progress."],
  invalid: ["Replay unavailable", "The archived match could not be reconstructed."],
};

export function ReplayStatusPage({ matchID, status }) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const canPoll = status === "preparing" && attempt < 10;
  useEffect(() => {
    if (!canPoll) return undefined;
    const timeoutId = window.setTimeout(() => {
      setAttempt((value) => value + 1);
      router.refresh();
    }, 1000);
    return () => window.clearTimeout(timeoutId);
  }, [attempt, canPoll, router]);
  const [title, description] = COPY[status] ?? COPY.invalid;
  return (
    <main className="grid min-h-screen place-items-center p-6" style={{ background: CATANA_TABLE_BACKGROUND }}>
      <section className="w-full max-w-md rounded-[1.4rem] border border-white/60 bg-blue-100/90 p-6 text-center shadow-2xl ring-1 ring-white/40 backdrop-blur-2xl">
        <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">{description}</p>
        {status === "preparing" ? <p className="mt-3 text-xs font-bold text-slate-500">{canPoll ? `Checking… ${attempt + 1}/10` : "Automatic checks finished."}</p> : null}
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {status !== "active" ? <Button variant="primary" onClick={() => { setAttempt(0); router.refresh(); }}>Retry</Button> : null}
          <Button variant="secondary" onClick={() => router.push(`/g/${encodeURIComponent(matchID)}`)}>Return to game</Button>
        </div>
      </section>
    </main>
  );
}
```

Create `app/__tests__/replayStatusPage.source.test.js`:

```js
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("ReplayStatusPage", () => {
  it("bounds archive polling and provides active/invalid copy", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "app/replays/components/ReplayStatusPage.jsx"),
      "utf8"
    );
    expect(source).toContain("attempt < 10");
    expect(source).toContain("}, 1000)");
    expect(source).toContain("router.refresh()");
    expect(source).toContain("Preparing replay…");
    expect(source).toContain("Replay available after the match");
    expect(source).toContain("Replay unavailable");
  });
});
```

- [ ] **Step 6: Route explicit replay intent**

In `createGMatchPage`, add an injectable `ReplayStatusPage` and resolve intent:

```js
const replayRequested = searchParams?.view === "replay";
const pageData = await getMatchPageDataImpl(
  params.matchID,
  replayRequested ? { preferArchived: true } : undefined
);

if (replayRequested && pageData?.kind === "live") {
  const ReplayStatusPageResolved =
    ReplayStatusPageImpl ??
    (await import("../../replays/components/ReplayStatusPage.jsx")).ReplayStatusPage;
  return h(ReplayStatusPageResolved, {
    matchID: params.matchID,
    status: pageData.liveMatch?.gameover ? "preparing" : "active",
  });
}
```

For an archive, set:

```js
initialFrameIndex: replayRequested ? 0 : Math.max(frames.length - 1, 0)
```

Wrap frame reconstruction in `try/catch` inside the archived branch:

```js
let frames;
try {
  frames = buildReplayFramesImpl({
    initialState: archivedMatch.initialState,
    log: archivedMatch.log,
  });
  if (frames.length === 0) throw new Error("Replay has no valid frames");
} catch (error) {
  const ReplayStatusPageResolved =
    ReplayStatusPageImpl ??
    (await import("../../replays/components/ReplayStatusPage.jsx")).ReplayStatusPage;
  return h(ReplayStatusPageResolved, {
    matchID: params.matchID,
    status: "invalid",
  });
}
```

Apply the same reconstruction guard in
`app/replays/[replayId]/page-content.js`, injecting `ReplayStatusPage` in its
factory. Its failure return is:

```js
return h(ReplayStatusPageResolved, {
  matchID: replay.match.bgioMatchId ?? replay.match.replayId,
  status: "invalid",
});
```

- [ ] **Step 7: Run route and status tests**

```bash
pnpm exec vitest run lib/server/__tests__/getMatchPageData.test.js app/__tests__/gMatchPage.test.js app/__tests__/replayPage.test.js app/__tests__/replayStatusPage.source.test.js --reporter=dot
```

Expected: PASS, including existing normal live-first and archived-final-state
cases.

- [ ] **Step 8: Commit route readiness changes**

```bash
git add -- app/replays/components/ReplayStatusPage.jsx app/__tests__/replayStatusPage.source.test.js
git add -p -- lib/server/matches/getMatchPageData.js lib/server/__tests__/getMatchPageData.test.js app/g/[matchID]/page-content.js app/__tests__/gMatchPage.test.js app/replays/[replayId]/page-content.js app/__tests__/replayPage.test.js
git diff --cached --check
git commit -m "feat: route finished matches into replay"
```

---

### Task 8: Connect postgame results and account history

**Files:**
- Modify: `app/catana/components/GameOverModal.js`
- Modify: `app/catana/components/PostgameOverlay.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/home/HomeTableClient.js`
- Modify: `app/catana/lobby/useLobbyHomeActions.js`
- Modify: `app/catana/__tests__/GameOverModal.test.js`
- Modify: `app/catana/__tests__/PostgameOverlay.test.js`
- Modify: `app/catana/__tests__/GameScreen.gameOver.test.js`
- Create: `app/catana/__tests__/HomeTableClient.history.source.test.js`

**Interfaces:**
- `GameOverModal` consumes `onWatchReplay` and `onViewSummary`; it no longer consumes `onRematch`.
- `PostgameOverlay` consumes `onWatchReplay` and `onClose`; it has no tabs.
- `useLobbyHomeActions.actions.goToMyGames()` pushes the encoded current username route.

- [ ] **Step 1: Write postgame and history tests first**

Update `GameOverModal.test.js`:

```js
expect(contents).toContain("Watch replay");
expect(contents).toContain("Match summary");
expect(contents).not.toContain("Rematch");
```

Update `PostgameOverlay.test.js`:

```js
expect(contents).toContain("Watch replay");
expect(contents).not.toContain("TABS");
expect(contents).not.toContain("More stats coming soon");
```

Update `GameScreen.gameOver.test.js`:

```js
expect(contents).toContain("?view=replay");
expect(contents).toContain("onWatchReplay");
expect(contents).not.toContain("onRematch={() => {}}");
```

Create `HomeTableClient.history.source.test.js`:

```js
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("home account history", () => {
  it("offers My games and routes through the current username", () => {
    const home = fs.readFileSync(path.resolve(process.cwd(), "app/catana/home/HomeTableClient.js"), "utf8");
    const actions = fs.readFileSync(path.resolve(process.cwd(), "app/catana/lobby/useLobbyHomeActions.js"), "utf8");
    expect(home).toContain('label: "My games"');
    expect(home).toContain('action: "myGames"');
    expect(home).toContain("onOpenMyGames");
    expect(actions).toContain("goToMyGames");
    expect(actions).toContain("encodeURIComponent");
  });
});
```

- [ ] **Step 2: Run postgame tests and verify failure**

```bash
pnpm exec vitest run app/catana/__tests__/GameOverModal.test.js app/catana/__tests__/PostgameOverlay.test.js app/catana/__tests__/GameScreen.gameOver.test.js app/catana/__tests__/HomeTableClient.history.source.test.js --reporter=dot
```

Expected: FAIL on the new copy and routing requirements.

- [ ] **Step 3: Simplify the game-over and summary components**

In `GameOverModal`, replace `onViewPostgame`/`onRematch` with
`onWatchReplay`/`onViewSummary`. Render four enabled actions:

```jsx
<button className="rounded-lg bg-lime-500 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-lime-600" onClick={onWatchReplay}>
  Watch replay
</button>
<button className="rounded-lg bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-white/85" onClick={onViewSummary}>
  Match summary
</button>
<button className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700" onClick={onLobby}>
  Return to Lobby
</button>
<button className="rounded-lg bg-white/45 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white/60" onClick={onClose}>
  Close
</button>
```

In `PostgameOverlay`, remove `useState`, `TABS`, the tab row, and inactive-tab
copy. Keep the current scoreboard/summary content and add:

```jsx
<button type="button" className="rounded-lg bg-lime-500 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-lime-600" onClick={onWatchReplay}>
  Watch replay
</button>
```

- [ ] **Step 4: Wire the canonical replay URL from `GameScreen`**

Add one handler:

```js
const handleWatchReplay = useCallback(() => {
  window.location.assign(`/g/${encodeURIComponent(matchID)}?view=replay`);
}, [matchID]);
```

Pass `onWatchReplay={handleWatchReplay}` to both postgame surfaces. Rename the
existing summary callback to `onViewSummary`, and remove the empty rematch
callback.

- [ ] **Step 5: Add My games for claimed and guest identities**

Import `ListBulletIcon` in `HomeTableClient.js`. Add this item after Profile or
Edit profile in both account-menu arrays:

```js
{
  label: "My games",
  icon: ListBulletIcon,
  action: "myGames",
}
```

Pass `onOpenMyGames` through `SystemTopChrome` to `SystemAccountMenu`, and add
this action branch:

```js
if (action === "myGames") {
  onOpenMyGames();
  return;
}
```

In `useLobbyHomeActions`, expose:

```js
goToMyGames: () => {
  const username = currentAccount?.currentUsername?.trim();
  if (!username) return;
  router.push(`/u/${encodeURIComponent(username)}`);
},
```

Pass `actions.goToMyGames` into the account menu from the home scene.

- [ ] **Step 6: Run postgame/history tests**

Run the command from Step 2.

Expected: PASS.

- [ ] **Step 7: Commit only postgame/history hunks**

```bash
git add -- app/catana/__tests__/HomeTableClient.history.source.test.js
git add -p -- app/catana/components/GameOverModal.js app/catana/components/PostgameOverlay.js app/catana/GameScreen.js app/catana/home/HomeTableClient.js app/catana/lobby/useLobbyHomeActions.js app/catana/__tests__/GameOverModal.test.js app/catana/__tests__/PostgameOverlay.test.js app/catana/__tests__/GameScreen.gameOver.test.js
git diff --cached --check
git commit -m "feat: connect postgame replay entry points"
```

---

### Task 9: Document, visually verify, and run release-level checks

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`
- Verify all files changed by Tasks 1–8.

**Interfaces:**
- Produces no new runtime API.
- Records final replay architecture, verification evidence, known exclusions, and dirty-worktree boundaries.

- [ ] **Step 1: Run the complete focused replay suite**

```bash
pnpm exec vitest run \
  app/__tests__/replayPageClient.test.js \
  app/__tests__/replayPlayback.test.js \
  app/__tests__/replayScoreChart.source.test.js \
  app/__tests__/replayConsole.source.test.js \
  app/__tests__/replayPageClient.source.test.js \
  app/__tests__/replayPage.test.js \
  app/__tests__/gMatchPage.test.js \
  app/__tests__/replayStatusPage.source.test.js \
  lib/server/__tests__/getMatchPageData.test.js \
  app/catana/__tests__/gameText.test.js \
  app/catana/__tests__/FeedPanel.test.js \
  app/catana/__tests__/GameLogPanel.test.js \
  app/catana/__tests__/LeftMetaRail.test.js \
  app/catana/__tests__/GameScreen.logPresentation.test.js \
  app/catana/__tests__/GameScreen.gameOver.test.js \
  app/catana/__tests__/GameOverModal.test.js \
  app/catana/__tests__/PostgameOverlay.test.js \
  app/catana/__tests__/HomeTableClient.history.source.test.js \
  --reporter=dot
```

Expected: all focused tests PASS.

- [ ] **Step 2: Start the real app and verify desktop replay**

```bash
pnpm dev:log
```

At `1440x900`, open a real `/replays/:replayId` or archived fixture and verify:

1. the full board remains visible and the right console does not collide with
   the left feed or opponent HUD;
2. previous/next event, previous/next turn, scrubber, and keyboard navigation
   all select the same event;
3. play/pause runs at `1x`, `2x`, and `4x`, pauses on manual seek, restarts from
   the beginning when Play is pressed at the end, and stops on the final event;
4. moving backwards removes future log rows, highlights the current row, and
   scrolls it into view;
5. clicking a log row or VP chart location seeks board, cursor, copy, and log
   together;
6. collapsing the console leaves useful event controls and restores cleanly;
7. there is no replay game audio, GSAP sequence, or changed-piece glow.

Capture one desktop screenshot for the handoff.

- [ ] **Step 3: Verify mobile portrait**

At `390x844`, verify:

1. the compact bottom dock does not permanently narrow the board;
2. Details opens the Vaul sheet and the sheet can be dismissed;
3. all controls meet comfortable touch sizing and the chart remains legible;
4. the left Log/Chat drawer and replay drawer do not leave each other in an
   unusable stacked state;
5. board gestures remain usable when the replay sheet is closed.

Capture one mobile screenshot for the handoff.

- [ ] **Step 4: Verify postgame routing and archive race**

Finish a local match and verify:

1. game-over results show Watch replay, Match summary, Return to Lobby, and
   Close, with no disabled Rematch;
2. Match summary has no disabled tabs and includes Watch replay;
3. Watch replay opens `/g/:matchID?view=replay`;
4. if the archive is ready, playback starts at Initial setup;
5. if archive creation is still in flight, Preparing replay checks once per
   second, stops after ten checks, and offers Retry;
6. a normal `/g/:matchID` still prefers the live match and later falls back to
   the archived final state;
7. My games opens `/u/:username` and its replay links still work.

- [ ] **Step 5: Run broad verification**

```bash
pnpm verify
pnpm build
git diff --check
```

Expected: all commands PASS. If a broad command fails in an unrelated existing
dirty area, preserve its exact output, prove the focused replay suite still
passes, and report the unrelated boundary without modifying that area.

- [ ] **Step 6: Update agent progress and notes**

Append a concise dated entry to `docs/agent/PROGRESS.md` containing:

- meaningful-event replay projection;
- synchronized console/log/VP graph;
- archive-preferred postgame routing;
- My games and postgame cleanup;
- focused, desktop, mobile, and broad verification results.

Append durable architecture notes to `docs/agent/NOTES.md`:

- `ReplayTimeline` is the single replay-position model;
- log entries may share a raw frame but keep separate event indexes;
- Recharts owns rendering only;
- archived chat is intentionally not replay-time synchronized;
- normal game URLs and explicit replay URLs have different initial-position
  semantics;
- rematches and full Stats remain separate work.

- [ ] **Step 7: Commit only replay documentation hunks**

```bash
git add -p -- docs/agent/PROGRESS.md docs/agent/NOTES.md
git diff --cached --check
git commit -m "docs: record archived replay v1"
```

- [ ] **Step 8: Review final scope and working tree**

```bash
git status --short
git log --oneline -10
git diff --stat
```

Expected: replay work is accounted for, pre-existing unrelated dirty changes
remain preserved, no deployment has run, and the final handoff names any replay
hunks that could not safely be committed separately.
