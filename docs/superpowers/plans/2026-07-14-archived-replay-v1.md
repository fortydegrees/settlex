# Archived Replay V1 Revision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing archived replay into the normal, unspoiled finished-game experience: one canonical game URL, in-place live postgame entry, step-only navigation, native Catana panel chrome, and read-only player perspectives.

**Architecture:** Keep `buildReplayFrames` and the existing meaningful-event timeline as the authoritative replay source. Add a public postgame replay payload endpoint and one `PostgameGameBoard` wrapper that always renders the same `GameScreenWithEffects` instance, swapping only its props between live and archived state. A pure replay-session reducer owns cursor, Results reveal, panel state, and selected perspective; the replay panel, game log, graph, and HUD consume that one state.

**Tech Stack:** Next.js 13 app router, React 18, boardgame.io 0.50, JavaScript UI, Vitest, Tailwind CSS, Vaul, Heroicons, Recharts 3.9.2, and `@settlex/game-core`.

## Global Constraints

- `/g/:matchID` is the only newly generated game/replay URL.
- An archived match starts at replay event `0`, before placement, without revealing the winner or future scores.
- A live game opens Results immediately on game over and hydrates Replay in the background without navigation or replacing the board.
- `?view=replay` and `/replays/:replayId` remain backward-compatible only; neither keeps distinct behaviour.
- Results is manually available throughout Replay and automatically opens once when the cursor first reaches the terminal event.
- Closing an early Results reveal restores the prior event and player perspective.
- Replay navigation is step-only. Remove autoplay, play/pause, speed controls, timer cadence, and the Space shortcut.
- Left/Right Arrow steps events; Shift+Left/Right Arrow steps turns.
- The game log and VP graph reveal information only through the current event.
- The perspective switcher contains Board plus all participants. A continuing player defaults to their seat; other visitors default to Board.
- A selected player perspective shows the standard resource/dev-card/action HUD. Every gameplay affordance is inert.
- Desktop Replay retains the dice, replay status box, and disabled End Turn control. Mobile retains the selected player's normal cockpit but may omit the desktop turn cluster.
- Replay chrome must reuse the existing log/chat frame constants and interaction density; do not introduce another UI library or generic analytics shell.
- Rematch and full Stats remain outside this plan. Do not add disabled placeholders.
- Keep the existing validated frame reconstruction, meaningful-event timeline, synchronized log, and Recharts dependency.
- Use JavaScript for app UI. Do not convert adjacent files to TypeScript.
- Preserve unrelated dirty-worktree changes. Never use `git add -A`, destructive reset, or whole-tree stash.
- Stage new files explicitly and use `git add -p` for already-dirty files. If hunks overlap unrelated work, leave them unstaged and report the boundary.
- Do not deploy without separate explicit approval.

---

### Task 1: Replace playback with deliberate step navigation

**Files:**
- Create: `app/replays/useReplayNavigation.js`
- Create: `app/__tests__/replayNavigation.test.js`
- Delete: `app/replays/useReplayPlayback.js`
- Delete: `app/__tests__/replayPlayback.test.js`
- Modify: `app/replays/replayClientState.js`
- Modify: `app/replays/[replayId]/ReplayPageClient.js`
- Modify: `app/replays/components/ReplayTransportControls.jsx`
- Modify: `app/replays/components/ReplayConsole.jsx`
- Modify: `app/__tests__/replayPageClient.test.js`
- Modify: `app/__tests__/replayPageClient.source.test.js`

**Interfaces:**
- Consumes: `clampReplayEventIndex(index, eventCount)` from `app/replays/replayTimeline.js`.
- Produces: `useReplayNavigation({ eventCount, initialEventIndex }) -> { eventIndex, seek, previous, next }`.
- Produces: `getReplayKeyboardAction(event) -> "previousEvent" | "nextEvent" | "previousTurn" | "nextTurn" | null`.

- [ ] **Step 1: Write the failing navigation tests**

Create `app/__tests__/replayNavigation.test.js`:

```js
import { describe, expect, it } from "vitest";
import { replayNavigationReducer } from "../replays/useReplayNavigation";

describe("replay navigation", () => {
  it("clamps step and seek actions without playback state", () => {
    const start = { eventIndex: 0, eventCount: 3 };
    expect(replayNavigationReducer(start, { type: "previous" })).toEqual(start);
    expect(replayNavigationReducer(start, { type: "next" })).toEqual({
      eventIndex: 1,
      eventCount: 3,
    });
    expect(
      replayNavigationReducer(start, { type: "seek", eventIndex: 99 })
    ).toEqual({ eventIndex: 2, eventCount: 3 });
  });

  it("clamps the cursor when the event count changes", () => {
    expect(
      replayNavigationReducer(
        { eventIndex: 4, eventCount: 5 },
        { type: "syncCount", eventCount: 2 }
      )
    ).toEqual({ eventIndex: 1, eventCount: 2 });
  });
});
```

Extend `app/__tests__/replayPageClient.test.js`:

```js
it("maps only step-navigation keyboard shortcuts", async () => {
  const { getReplayKeyboardAction } = await loadReplayPageClientModule();
  expect(getReplayKeyboardAction({ key: "ArrowLeft" })).toBe("previousEvent");
  expect(getReplayKeyboardAction({ key: "ArrowRight", shiftKey: true })).toBe("nextTurn");
  expect(getReplayKeyboardAction({ key: " " })).toBeNull();
  expect(getReplayKeyboardAction({ key: "ArrowLeft", metaKey: true })).toBeNull();
});
```

- [ ] **Step 2: Run the tests and confirm the red state**

```bash
pnpm exec vitest run app/__tests__/replayNavigation.test.js app/__tests__/replayPageClient.test.js --reporter=dot
```

Expected: FAIL because `useReplayNavigation` does not exist and Space still toggles playback.

- [ ] **Step 3: Implement the navigation reducer and hook**

Create `app/replays/useReplayNavigation.js`:

```js
"use client";

import { useCallback, useEffect, useReducer } from "react";
import { clampReplayEventIndex } from "./replayTimeline";

export const replayNavigationReducer = (state, action) => {
  if (action.type === "syncCount") {
    return {
      eventCount: action.eventCount,
      eventIndex: clampReplayEventIndex(state.eventIndex, action.eventCount),
    };
  }
  if (action.type === "seek") {
    return {
      ...state,
      eventIndex: clampReplayEventIndex(action.eventIndex, state.eventCount),
    };
  }
  if (action.type === "previous") {
    return { ...state, eventIndex: Math.max(state.eventIndex - 1, 0) };
  }
  if (action.type === "next") {
    return {
      ...state,
      eventIndex: Math.min(state.eventIndex + 1, Math.max(state.eventCount - 1, 0)),
    };
  }
  return state;
};

export function useReplayNavigation({ eventCount, initialEventIndex = 0 }) {
  const [state, dispatch] = useReducer(replayNavigationReducer, {
    eventCount,
    eventIndex: clampReplayEventIndex(initialEventIndex, eventCount),
  });
  useEffect(() => dispatch({ type: "syncCount", eventCount }), [eventCount]);
  return {
    eventIndex: state.eventIndex,
    seek: useCallback((eventIndex) => dispatch({ type: "seek", eventIndex }), []),
    previous: useCallback(() => dispatch({ type: "previous" }), []),
    next: useCallback(() => dispatch({ type: "next" }), []),
  };
}
```

Replace `getReplayKeyboardAction` with:

```js
export const getReplayKeyboardAction = ({
  key,
  shiftKey = false,
  altKey = false,
  ctrlKey = false,
  metaKey = false,
} = {}) => {
  if (altKey || ctrlKey || metaKey) return null;
  if (key === "ArrowLeft") return shiftKey ? "previousTurn" : "previousEvent";
  if (key === "ArrowRight") return shiftKey ? "nextTurn" : "nextEvent";
  return null;
};
```

- [ ] **Step 4: Remove playback props and controls from the current replay client**

Use `useReplayNavigation` in `ReplayPageClient`, remove `isPlaying`, `speed`,
`toggleReplayPlaying`, `onTogglePlaying`, and `onSpeedChange`, and reduce the
transport control row to previous/next event plus previous/next turn. Delete
`useReplayPlayback.js` and its old test after imports are gone.

The keyboard branch becomes:

```js
const keyboardAction = getReplayKeyboardAction(event);
if (!keyboardAction) return;
event.preventDefault();
if (keyboardAction === "previousEvent") navigation.previous();
if (keyboardAction === "nextEvent") navigation.next();
if (keyboardAction === "previousTurn") seekPreviousTurn();
if (keyboardAction === "nextTurn") seekNextTurn();
```

- [ ] **Step 5: Run the navigation and source tests**

```bash
pnpm exec vitest run app/__tests__/replayNavigation.test.js app/__tests__/replayPageClient.test.js app/__tests__/replayPageClient.source.test.js app/__tests__/replayConsole.source.test.js --reporter=dot
```

Expected: PASS, and `rg -n "Play replay|Pause replay|Replay speed|REPLAY_SPEEDS|togglePlaying" app/replays` returns no matches.

- [ ] **Step 6: Commit the step-navigation slice**

```bash
git add -- app/replays/useReplayNavigation.js app/__tests__/replayNavigation.test.js app/replays/useReplayPlayback.js app/__tests__/replayPlayback.test.js app/replays/components/ReplayTransportControls.jsx app/replays/components/ReplayConsole.jsx
git add -p -- app/replays/replayClientState.js app/replays/[replayId]/ReplayPageClient.js app/__tests__/replayPageClient.test.js app/__tests__/replayPageClient.source.test.js
git diff --cached --check
git commit -m "refactor: make replay navigation step only"
```

---

### Task 2: Prevent the score graph from spoiling future events

**Files:**
- Modify: `app/replays/components/ReplayScoreChart.jsx`
- Modify: `app/__tests__/replayScoreChart.test.js`
- Modify: `app/__tests__/replayScoreChart.source.test.js`

**Interfaces:**
- Produces: `getVisibleReplayScoreData({ scoreSeries, turnStarts, currentEventIndex })`.
- `ReplayScoreChart` adds `eventCount`; the chart domain and click seeking use the full event count while rendered data stops at the current event.

- [ ] **Step 1: Add the failing spoiler-boundary test**

```js
import { getVisibleReplayScoreData } from "../replays/components/ReplayScoreChart";

it("hides future score samples and future turn labels", () => {
  const result = getVisibleReplayScoreData({
    scoreSeries: [0, 1, 2, 3].map((eventIndex) => ({ eventIndex })),
    turnStarts: [
      { turn: 1, eventIndex: 0 },
      { turn: 2, eventIndex: 2 },
      { turn: 3, eventIndex: 3 },
    ],
    currentEventIndex: 2,
  });
  expect(result.visibleScoreSeries.map((row) => row.eventIndex)).toEqual([0, 1, 2]);
  expect(result.visibleTurnStarts).toEqual([
    { turn: 1, eventIndex: 0 },
    { turn: 2, eventIndex: 2 },
  ]);
});
```

- [ ] **Step 2: Run the chart tests and verify failure**

```bash
pnpm exec vitest run app/__tests__/replayScoreChart.test.js app/__tests__/replayScoreChart.source.test.js --reporter=dot
```

Expected: FAIL because `getVisibleReplayScoreData` is missing.

- [ ] **Step 3: Add the visible-prefix projection**

```js
export const getVisibleReplayScoreData = ({
  scoreSeries = [],
  turnStarts = [],
  currentEventIndex = 0,
}) => ({
  visibleScoreSeries: scoreSeries.filter(
    (sample) => sample.eventIndex <= currentEventIndex
  ),
  visibleTurnStarts: turnStarts.filter(
    (marker) => marker.eventIndex <= currentEventIndex
  ),
});
```

Inside `ReplayScoreChart`, use those arrays for `LineChart.data`, score extrema,
current legend, X-axis ticks, and turn labels. Add `eventCount` and keep the
full seeking domain:

```jsx
<XAxis
  type="number"
  dataKey="eventIndex"
  domain={[0, Math.max(eventCount - 1, 0)]}
  ticks={visibleTurnStarts.map((item) => item.eventIndex)}
  allowDataOverflow
/>
```

Pass `eventCount` to `getReplayEventIndexAtChartX`; do not derive it from the
visible prefix.

- [ ] **Step 4: Run the chart tests**

Run the command from Step 2.

Expected: PASS and no final-score data appears in the chart at event `0`.

- [ ] **Step 5: Commit the spoiler-safe graph**

```bash
git add -- app/replays/components/ReplayScoreChart.jsx app/__tests__/replayScoreChart.test.js app/__tests__/replayScoreChart.source.test.js
git diff --cached --check
git commit -m "fix: hide future replay scores"
```

---

### Task 3: Make the game URL canonical and expose the archived replay payload

**Files:**
- Create: `lib/server/replays/getPostgameReplayPayload.js`
- Create: `app/api/matches/[matchID]/replay/handler.js`
- Create: `app/api/matches/[matchID]/replay/route.js`
- Create: `app/__tests__/api/postgameReplayRoute.test.js`
- Modify: `lib/server/matches/getMatchPageData.js`
- Modify: `lib/server/__tests__/getMatchPageData.test.js`
- Modify: `app/g/[matchID]/page-content.js`
- Modify: `app/__tests__/gMatchPage.test.js`
- Modify: `app/__tests__/api/routeModuleExports.source.test.js`

**Interfaces:**
- Produces: `getPostgameReplayPayload(matchID) -> { replay, frames } | null`.
- Produces: `GET /api/matches/:matchID/replay` with `200 ready`, `202 preparing`, `409 active`, `404 missing`, or `422 invalid`.
- `getMatchPageData` produces `kind: "postgame-preparing"` when a finished live record exists but its archive is not ready.
- Produces: `resolveArchivedPerspectivePlayerID({ matchID, participants, accountId, readSeatCredential }) -> playerID | null` so a returning participant keeps their seat without exposing one visitor's default to another.

- [ ] **Step 1: Write failing payload-route tests**

Create `app/__tests__/api/postgameReplayRoute.test.js` with injected dependencies:

```js
import { describe, expect, it, vi } from "vitest";
import { createPostgameReplayRoute } from "../../api/matches/[matchID]/replay/handler";

describe("postgame replay payload route", () => {
  it("returns a ready archived payload", async () => {
    const payload = { replay: { match: { bgioMatchId: "m1" } }, frames: [{ index: 0 }] };
    const response = await createPostgameReplayRoute({
      getPostgameReplayPayload: vi.fn().mockResolvedValue(payload),
      getLiveMatch: vi.fn(),
    })(new Request("http://local/api/matches/m1/replay"), { params: { matchID: "m1" } });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payload);
  });

  it("distinguishes preparing, active, and missing matches", async () => {
    const make = (liveMatch) => createPostgameReplayRoute({
      getPostgameReplayPayload: vi.fn().mockResolvedValue(null),
      getLiveMatch: vi.fn().mockResolvedValue(liveMatch),
    });
    expect((await make({ gameover: { winner: "0" } })(null, { params: { matchID: "m1" } })).status).toBe(202);
    expect((await make({ gameover: null })(null, { params: { matchID: "m1" } })).status).toBe(409);
    expect((await make(null)(null, { params: { matchID: "m1" } })).status).toBe(404);
  });
});
```

Add route expectations to `gMatchPage.test.js`: a normal archived request starts
at `0`, `?view=replay` has identical output, and `postgame-preparing` renders the
bounded status surface. Add one account-match case and one seat-cookie fallback
case for `initialPerspectivePlayerID`.

- [ ] **Step 2: Run route tests and verify failure**

```bash
pnpm exec vitest run app/__tests__/api/postgameReplayRoute.test.js app/__tests__/gMatchPage.test.js lib/server/__tests__/getMatchPageData.test.js --reporter=dot
```

Expected: FAIL because the payload route and canonical postgame state do not exist.

- [ ] **Step 3: Implement the shared server payload builder**

```js
import { getArchivedMatchByMatchId } from "../matches/getArchivedMatchByMatchId.js";
import { buildReplayFrames } from "./buildReplayFrames.js";

export const getPostgameReplayPayload = async (
  matchID,
  {
    getArchivedMatchByMatchId: readArchive = getArchivedMatchByMatchId,
    buildReplayFrames: buildFrames = buildReplayFrames,
  } = {}
) => {
  const replay = await readArchive(matchID);
  if (!replay) return null;
  const frames = buildFrames({
    initialState: replay.initialState,
    log: replay.log,
    finalState: replay.finalState,
  });
  if (frames.length === 0) throw new Error("Replay has no valid frames");
  return { replay, frames };
};
```

- [ ] **Step 4: Implement the API route**

`handler.js` returns JSON through `NextResponse`:

```js
export const createPostgameReplayRoute = ({
  getPostgameReplayPayload: loadPayload = getPostgameReplayPayload,
  getLiveMatch: loadLiveMatch = getLiveMatch,
} = {}) => async (_request, { params } = {}) => {
  const matchID = params?.matchID;
  if (!matchID) return NextResponse.json({ error: "matchID is required" }, { status: 400 });
  try {
    const payload = await loadPayload(matchID);
    if (payload) return NextResponse.json(payload);
    let liveMatch = null;
    try {
      liveMatch = await loadLiveMatch({ matchID });
    } catch (error) {
      if (error?.status !== 404) throw error;
    }
    if (liveMatch?.gameover) {
      return NextResponse.json({ status: "preparing" }, { status: 202 });
    }
    if (liveMatch) return NextResponse.json({ status: "active" }, { status: 409 });
    return NextResponse.json({ status: "missing" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ status: "invalid", error: error.message }, { status: 422 });
  }
};
```

`route.js` exports `dynamic = "force-dynamic"` and `GET` from the handler.

- [ ] **Step 5: Make finished route resolution archive-first without query intent**

In `getMatchPageData`, when the live metadata response is successful:

```js
const liveMatch = (await readJson(response)) ?? null;
if (!liveMatch?.gameover) return { kind: "live", matchID, liveMatch };
const archived = await readArchived(matchID, getArchivedMatchByMatchIdImpl);
return archived ?? { kind: "postgame-preparing", matchID, liveMatch };
```

In `GMatchPage`, remove `replayRequested`, `preferArchived`, and query-dependent
initial indexes. Render `ReplayStatusPage status="preparing"` for
`postgame-preparing`; every archived render passes `initialFrameIndex={0}`.

Resolve the archived default perspective before rendering:

```js
export const resolveArchivedPerspectivePlayerID = async ({
  matchID,
  participants = [],
  accountId = null,
  readSeatCredential,
}) => {
  const accountParticipant = participants.find(
    (participant) =>
      accountId != null && String(participant.accountId) === String(accountId)
  );
  if (accountParticipant?.seatId != null) return String(accountParticipant.seatId);
  for (const participant of participants) {
    const playerID = String(participant.seatId);
    if (await readSeatCredential({ matchID, playerID })) return playerID;
  }
  return null;
};
```

Read the current account through `getSessionAccount` and `next/headers`, both
injected into `createGMatchPage` for tests, then pass the resolved value as
`initialPerspectivePlayerID` to `ReplayPageClient`.

- [ ] **Step 6: Run routing tests**

Run the command from Step 2 plus:

```bash
pnpm exec vitest run app/__tests__/api/routeModuleExports.source.test.js --reporter=dot
```

Expected: PASS.

- [ ] **Step 7: Commit the canonical route and payload boundary**

```bash
git add -- lib/server/replays/getPostgameReplayPayload.js app/api/matches/[matchID]/replay/handler.js app/api/matches/[matchID]/replay/route.js app/__tests__/api/postgameReplayRoute.test.js
git add -p -- lib/server/matches/getMatchPageData.js lib/server/__tests__/getMatchPageData.test.js app/g/[matchID]/page-content.js app/__tests__/gMatchPage.test.js app/__tests__/api/routeModuleExports.source.test.js
git diff --cached --check
git commit -m "feat: expose canonical postgame replay payload"
```

---

### Task 4: Share one mounted board between live postgame and archived replay

**Files:**
- Create: `app/replays/replaySessionState.js`
- Create: `app/replays/replayGameScreenProps.js`
- Create: `app/replays/usePostgameReplayPayload.js`
- Create: `app/replays/PostgameGameBoard.js`
- Create: `app/__tests__/replaySessionState.test.js`
- Create: `app/__tests__/replayGameScreenProps.test.js`
- Create: `app/__tests__/postgameReplayPayload.test.js`
- Create: `app/__tests__/postgameGameBoard.source.test.js`
- Modify: `app/replays/[replayId]/ReplayPageClient.js`
- Modify: `app/catana/lobby/[matchID]/MatchPageClient.js`
- Modify: `app/catana/__tests__/MatchPageClient.friendChallenge.source.test.js`

**Interfaces:**
- Produces: `createReplaySessionState({ eventCount, perspectiveId })` and `replaySessionReducer(state, action)`.
- Produces: `buildReplayGameScreenProps({ event, perspectiveId, matchID, matchData, resultsOpen })`.
- Produces: `loadPostgameReplayPayload({ matchID, fetchImpl, wait, maxAttempts })`.
- Produces: `usePostgameReplayPayload({ matchID, enabled, initialPayload })` with `{ status, payload, error, retry }`.
- Produces: `PostgameGameBoard(bgioProps | { initialReplayPayload, initialPerspectivePlayerID })`.

- [ ] **Step 1: Write failing session-state tests**

```js
import { describe, expect, it } from "vitest";
import { createReplaySessionState, replaySessionReducer } from "../replays/replaySessionState";

describe("replay session state", () => {
  it("restores the cursor after an early Results reveal", () => {
    const start = { ...createReplaySessionState({ eventCount: 8, perspectiveId: "1" }), eventIndex: 3 };
    const open = replaySessionReducer(start, { type: "openResults" });
    expect(open).toMatchObject({ eventIndex: 7, resultsOpen: true, resultsReturnEventIndex: 3 });
    expect(replaySessionReducer(open, { type: "closeResults" })).toMatchObject({
      eventIndex: 3,
      perspectiveId: "1",
      resultsOpen: false,
    });
  });

  it("automatically opens Results once at the terminal event", () => {
    const start = createReplaySessionState({ eventCount: 3, perspectiveId: null });
    const terminal = replaySessionReducer(start, { type: "seek", eventIndex: 2 });
    expect(terminal).toMatchObject({ resultsOpen: true, terminalResultsSeen: true });
    const closed = replaySessionReducer(terminal, { type: "closeResults" });
    expect(replaySessionReducer(closed, { type: "seek", eventIndex: 2 }).resultsOpen).toBe(false);
  });
});
```

- [ ] **Step 2: Write failing bounded-hydration tests**

```js
it("retries preparing archives and returns the ready payload", async () => {
  const responses = [
    new Response(JSON.stringify({ status: "preparing" }), { status: 202 }),
    new Response(JSON.stringify({ replay: {}, frames: [{}] }), { status: 200 }),
  ];
  const wait = vi.fn().mockResolvedValue(undefined);
  const payload = await loadPostgameReplayPayload({
    matchID: "m1",
    fetchImpl: vi.fn().mockImplementation(() => Promise.resolve(responses.shift())),
    wait,
    maxAttempts: 2,
  });
  expect(payload.frames).toHaveLength(1);
  expect(wait).toHaveBeenCalledTimes(1);
});
```

Add a second test asserting that two `202` responses with `maxAttempts: 2`
reject with `Replay is still preparing`.

Create `app/__tests__/replayGameScreenProps.test.js`:

```js
import { expect, it } from "vitest";
import { buildReplayGameScreenProps } from "../replays/replayGameScreenProps";

it("projects the selected historical frame and player perspective", () => {
  const state = {
    G: { core: { playerStateById: { "1": { resources: ["Wood"], devCards: ["Knight"] } } } },
    ctx: { currentPlayer: "1" },
    plugins: {},
  };
  const props = buildReplayGameScreenProps({
    event: { state, visibleLogEntries: [], logEntryKey: null },
    perspectiveId: "1",
    matchID: "m1",
    matchData: [],
    resultsOpen: false,
  });
  expect(props.G).toBe(state.G);
  expect(props.playerID).toBe("1");
  expect(props.G.core.playerStateById["1"].devCards).toEqual(["Knight"]);
  expect(props.isReplay).toBe(true);
  expect(props.moves.rollDice()).toBeUndefined();
});
```

- [ ] **Step 3: Run the new tests and verify failure**

```bash
pnpm exec vitest run app/__tests__/replaySessionState.test.js app/__tests__/replayGameScreenProps.test.js app/__tests__/postgameReplayPayload.test.js --reporter=dot
```

Expected: FAIL because both modules are missing.

- [ ] **Step 4: Implement the pure replay-session reducer**

```js
import { clampReplayEventIndex } from "./replayTimeline";

export const createReplaySessionState = ({ eventCount, perspectiveId = null }) => ({
  eventCount,
  eventIndex: 0,
  perspectiveId,
  panelOpen: true,
  resultsOpen: false,
  resultsReturnEventIndex: null,
  terminalResultsSeen: false,
});

export const replaySessionReducer = (state, action) => {
  const finalEventIndex = Math.max(state.eventCount - 1, 0);
  if (action.type === "seek") {
    const eventIndex = clampReplayEventIndex(action.eventIndex, state.eventCount);
    const reachedTerminal = eventIndex === finalEventIndex && !state.terminalResultsSeen;
    return {
      ...state,
      eventIndex,
      resultsOpen: reachedTerminal ? true : state.resultsOpen,
      terminalResultsSeen: state.terminalResultsSeen || reachedTerminal,
    };
  }
  if (action.type === "openResults") {
    return {
      ...state,
      eventIndex: finalEventIndex,
      resultsOpen: true,
      resultsReturnEventIndex: state.eventIndex < finalEventIndex ? state.eventIndex : null,
      terminalResultsSeen: true,
    };
  }
  if (action.type === "closeResults") {
    return {
      ...state,
      eventIndex: state.resultsReturnEventIndex ?? state.eventIndex,
      resultsOpen: false,
      resultsReturnEventIndex: null,
    };
  }
  if (action.type === "setPerspective") return { ...state, perspectiveId: action.perspectiveId };
  if (action.type === "setPanelOpen") return { ...state, panelOpen: action.open };
  return state;
};
```

- [ ] **Step 5: Implement bounded background loading**

`loadPostgameReplayPayload` fetches
`/api/matches/${encodeURIComponent(matchID)}/replay`, retries only `202`, waits
`750` ms between attempts, and defaults to `10` attempts. `usePostgameReplayPayload`
returns `ready` immediately for `initialPayload`; otherwise it starts only when
`enabled` becomes true and exposes a retry counter rather than duplicating the
request loop.

The terminal error branch is:

```js
if (response.status !== 202) {
  const details = await response.json().catch(() => ({}));
  throw new Error(details.error ?? `Replay request failed (${response.status})`);
}
if (attempt === maxAttempts - 1) throw new Error("Replay is still preparing");
await wait(750);
```

- [ ] **Step 6: Implement `PostgameGameBoard` without remounting `GameScreen`**

`PostgameGameBoard` must always return one `GameScreenWithEffects` element plus
an optional panel sibling. Put the replay prop projection and no-op move map in
`replayGameScreenProps.js`, then build displayed props from either the live
board props or the selected replay event:

```js
const displayProps = replayActive
  ? {
      ...currentEvent.state,
      matchID,
      matchData,
      matchMetadata: matchData,
      playerID: session.perspectiveId,
      credentials: null,
      moves: READ_ONLY_REPLAY_MOVES,
      events: {},
      plugins: currentEvent.state?.plugins ?? {},
      isConnected: true,
      isMultiplayer: false,
      isReplay: true,
      replayResultsOpen: session.resultsOpen,
      onReplayResultsOpen: () => dispatch({ type: "openResults" }),
      onReplayResultsClose: () => dispatch({ type: "closeResults" }),
      replayLogEntries: currentEvent.visibleLogEntries,
      replayActiveLogEntryKey: currentEvent.logEntryKey,
    }
  : {
      ...bgioProps,
      postgameReplayStatus: replayPayload.status,
      onWatchReplay: handleOpenReplay,
    };

return h(
  Fragment,
  null,
  h(GameScreenWithEffects, displayProps),
  replayActive ? h(ReplayConsole, replayPanelProps) : null
);
```

Use the same unkeyed `GameScreenWithEffects` position in both branches. The
read-only move object provides a second safety boundary behind disabled
controls:

```js
const ignoreReplayMove = () => undefined;
export const READ_ONLY_REPLAY_MOVES = Object.freeze({
  autoStartGame: ignoreReplayMove,
  readyUp: ignoreReplayMove,
  rollDice: ignoreReplayMove,
  endTurn: ignoreReplayMove,
  discardResources: ignoreReplayMove,
  moveRobber: ignoreReplayMove,
  placeRoad: ignoreReplayMove,
  placeSettlement: ignoreReplayMove,
  placeCity: ignoreReplayMove,
  buyDevCard: ignoreReplayMove,
  playDevCardStart: ignoreReplayMove,
  cancelDevCardPlay: ignoreReplayMove,
  confirmDevCardPlay: ignoreReplayMove,
  placeRoadFromDevCard: ignoreReplayMove,
  maritimeTrade: ignoreReplayMove,
  resign: ignoreReplayMove,
});
```

Initialize the session perspective from `initialPerspectivePlayerID` for an
archived payload and from `bgioProps.playerID` for a live player entering
postgame. Keep `null` as Board perspective; never default a public visitor to
the winner or first seat.

Make `ReplayPageClient` a thin archived wrapper around `PostgameGameBoard` with
`initialReplayPayload={{ replay, frames }}`. Change `MatchPageClient`'s
boardgame.io `Client` configuration from `GameScreenWithEffects` to
`PostgameGameBoard`.

- [ ] **Step 7: Run session, hydration, and wrapper tests**

```bash
pnpm exec vitest run app/__tests__/replaySessionState.test.js app/__tests__/replayGameScreenProps.test.js app/__tests__/postgameReplayPayload.test.js app/__tests__/postgameGameBoard.source.test.js app/__tests__/replayPageClient.source.test.js app/catana/__tests__/MatchPageClient.friendChallenge.source.test.js --reporter=dot
```

Expected: PASS; the source test must find one `GameScreenWithEffects` render and
must not find `window.location.assign` or `?view=replay`.

- [ ] **Step 8: Commit the shared postgame board**

```bash
git add -- app/replays/replaySessionState.js app/replays/replayGameScreenProps.js app/replays/usePostgameReplayPayload.js app/replays/PostgameGameBoard.js app/__tests__/replaySessionState.test.js app/__tests__/replayGameScreenProps.test.js app/__tests__/postgameReplayPayload.test.js app/__tests__/postgameGameBoard.source.test.js
git add -p -- app/replays/[replayId]/ReplayPageClient.js app/catana/lobby/[matchID]/MatchPageClient.js app/catana/__tests__/MatchPageClient.friendChallenge.source.test.js
git diff --cached --check
git commit -m "feat: keep replay inside the postgame board"
```

---

### Task 5: Restore the read-only player HUD and Results behaviour

**Files:**
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/components/GameOverModal.js`
- Modify: `app/catana/components/PlayerActionContainer.js`
- Modify: `app/catana/components/MobilePlayerCockpit.js`
- Modify: `app/catana/components/useLocalPlayerDockModel.js`
- Modify: `app/catana/__tests__/GameScreen.gameOver.test.js`
- Modify: `app/catana/__tests__/GameScreen.mobileShell.source.test.js`
- Modify: `app/catana/__tests__/GameOverModal.test.js`
- Modify: `app/catana/__tests__/PlayerActionContainer.status.test.js`
- Modify: `app/catana/__tests__/MobilePlayerCockpit.source.test.js`
- Modify: `app/catana/__tests__/useLocalPlayerDockModel.test.js`

**Interfaces:**
- `GameScreen` consumes `onWatchReplay`, `postgameReplayStatus`, `replayResultsOpen`, `onReplayResultsOpen`, and `onReplayResultsClose`.
- `PlayerActionContainer` and `MobilePlayerCockpit` consume `readOnly`.
- `useLocalPlayerDockModel` consumes `readOnly` and guarantees every action, resource shortcut, dev-card play, roll, and End Turn path is disabled.

- [ ] **Step 1: Add failing replay-HUD and Results source tests**

Add assertions:

```js
// GameScreen.gameOver.test.js
expect(contents).toContain("bgioProps.onWatchReplay");
expect(contents).toContain("bgioProps.replayResultsOpen");
expect(contents).toContain("onReplayResultsClose");
expect(contents).not.toContain("?view=replay");
expect(contents).toContain("readOnly={isReplay}");

// PlayerActionContainer.status.test.js
expect(containerSource).toContain("replayStatusText");
expect(containerSource).toContain("readOnly={readOnly}");
expect(containerSource).toContain("mode={readOnly ? \"inactive\" : turnControlMode}");

// MobilePlayerCockpit.source.test.js
expect(source).toContain("readOnly");
expect(source).toContain("readOnly={readOnly}");
```

Add an exported pure helper test to `useLocalPlayerDockModel.test.js`:

```js
it("forces every dock capability off in replay", () => {
  expect(
    applyReadOnlyDockState({
      readOnly: true,
      dynamicActions: [{ name: "road", enabled: true }],
      rollEnabled: true,
      endTurnEnabled: true,
    })
  ).toEqual({
    dynamicActions: [{ name: "road", enabled: false }],
    rollEnabled: false,
    endTurnEnabled: false,
  });
});
```

- [ ] **Step 2: Run the focused HUD tests and verify failure**

```bash
pnpm exec vitest run app/catana/__tests__/GameScreen.gameOver.test.js app/catana/__tests__/GameOverModal.test.js app/catana/__tests__/PlayerActionContainer.status.test.js app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/useLocalPlayerDockModel.test.js --reporter=dot
```

Expected: FAIL on the new external Results and read-only contracts.

- [ ] **Step 3: Add the dock safety projection**

Export and apply:

```js
export const applyReadOnlyDockState = ({
  readOnly,
  dynamicActions,
  rollEnabled,
  endTurnEnabled,
}) => ({
  dynamicActions: readOnly
    ? dynamicActions.map((action) => action && { ...action, enabled: false })
    : dynamicActions,
  rollEnabled: readOnly ? false : rollEnabled,
  endTurnEnabled: readOnly ? false : endTurnEnabled,
});
```

Also include `!readOnly` in `canStartDev`, return false from
`canQuickTradeResource` when read-only, and pass no dev-card play callback from
desktop or mobile HUDs. This keeps familiar inventory/action silhouettes while
blocking every interaction before the no-op move boundary.

- [ ] **Step 4: Show replay dice/status/End Turn on desktop**

Pass `readOnly={isReplay}` to both HUD implementations. Desktop uses:

```jsx
showTurnControls={isReplay || !isGameOver}
replayStatusText={
  isReplay ? `Replay · Turn ${bgioProps.G?.core?.turn ?? "—"}` : null
}
```

Inside `PlayerActionContainer`, keep `rollContent` visible and render:

```jsx
<TurnControlCluster
  mode={readOnly ? "inactive" : turnControlMode}
  statusText={readOnly ? replayStatusText : gameStatus?.title}
  timerText={readOnly ? null : timerText}
  showTimer={readOnly ? false : showStatusTimer}
  isTimerLow={readOnly ? false : isLowTimerAlertActive}
  rollContent={rollContent}
  onRoll={!readOnly && rollEnabled ? () => moves.rollDice() : undefined}
  onEndTurn={!readOnly && endTurnEnabled ? handleEndTurn : undefined}
/>
```

Mobile keeps the selected player's cockpit/inventory but suppresses live
primary commands while `readOnly` is true.

- [ ] **Step 5: Make Results externally controllable in replay mode**

Replace navigation-based Watch Replay with `bgioProps.onWatchReplay`. The
Results button condition becomes:

```js
const showResultsButton = isReplay
  ? !bgioProps.replayResultsOpen
  : isGameOver && !showGameOverModal && !showPostgame;
```

Render `GameOverModal` when either the live local modal is open or
`isReplay && bgioProps.replayResultsOpen`. In replay mode, Close and Replay both
call `onReplayResultsClose`; Results uses the terminal replay frame selected by
the session reducer.

Pass `postgameReplayStatus` into `GameOverModal`. Its Replay button uses:

```jsx
<button
  disabled={replayStatus !== "ready"}
  onClick={onWatchReplay}
  className={replayStatus === "ready" ? replayReadyClassName : replayDisabledClassName}
>
  {replayStatus === "ready" ? "Replay" : "Preparing replay..."}
</button>
```

- [ ] **Step 6: Run the focused HUD/results suite**

Run the command from Step 2 plus:

```bash
pnpm exec vitest run app/catana/__tests__/GameScreen.mobileShell.source.test.js --reporter=dot
```

Expected: PASS.

- [ ] **Step 7: Commit the replay HUD and Results state**

```bash
git add -p -- app/catana/GameScreen.js app/catana/components/GameOverModal.js app/catana/components/PlayerActionContainer.js app/catana/components/MobilePlayerCockpit.js app/catana/components/useLocalPlayerDockModel.js app/catana/__tests__/GameScreen.gameOver.test.js app/catana/__tests__/GameScreen.mobileShell.source.test.js app/catana/__tests__/GameOverModal.test.js app/catana/__tests__/PlayerActionContainer.status.test.js app/catana/__tests__/MobilePlayerCockpit.source.test.js app/catana/__tests__/useLocalPlayerDockModel.test.js
git diff --cached --check
git commit -m "feat: show read-only player HUD in replay"
```

---

### Task 6: Replace the analytics console with native meta-panel chrome

**Files:**
- Create: `app/catana/components/metaPanelChrome.js`
- Create: `app/replays/components/ReplayPanel.jsx`
- Create: `app/replays/components/ReplayStepControls.jsx`
- Create: `app/__tests__/replayPanel.source.test.js`
- Delete: `app/replays/components/ReplayConsole.jsx`
- Delete: `app/replays/components/ReplayTransportControls.jsx`
- Delete: `app/__tests__/replayConsole.source.test.js`
- Modify: `app/catana/components/LeftMetaRail.js`
- Modify: `app/catana/__tests__/LeftMetaRail.test.js`
- Modify: `app/replays/PostgameGameBoard.js`
- Modify: `app/replays/components/ReplayScoreChart.jsx`

**Interfaces:**
- Produces shared Catana constants `META_PANEL_FRAME_CLASS_NAME`, `META_PANEL_GLASS_STYLE`, and `META_PANEL_HEADER_CLASS_NAME` without changing log/chat rendering.
- Produces `ReplayPanel({ timeline, currentEventIndex, perspectiveId, open, ...callbacks })`.
- Produces `ReplayStepControls({ currentEventIndex, eventCount, ...callbacks })`.

- [ ] **Step 1: Add failing panel-family source tests**

Create `app/__tests__/replayPanel.source.test.js`:

```js
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const replay = fs.readFileSync(path.resolve("app/replays/components/ReplayPanel.jsx"), "utf8");
const rail = fs.readFileSync(path.resolve("app/catana/components/LeftMetaRail.js"), "utf8");

describe("ReplayPanel", () => {
  it("shares native meta-panel chrome and contains no playback controls", () => {
    expect(replay).toContain("META_PANEL_FRAME_CLASS_NAME");
    expect(replay).toContain("META_PANEL_GLASS_STYLE");
    expect(rail).toContain("META_PANEL_FRAME_CLASS_NAME");
    expect(replay).toContain("Board");
    expect(replay).toContain("Results");
    expect(replay).toContain("Previous turn");
    expect(replay).not.toContain("Play replay");
    expect(replay).not.toContain("Replay speed");
    expect(replay).not.toContain("Match analysis");
  });
});
```

- [ ] **Step 2: Run the panel tests and verify failure**

```bash
pnpm exec vitest run app/__tests__/replayPanel.source.test.js app/catana/__tests__/LeftMetaRail.test.js --reporter=dot
```

Expected: FAIL because the new panel and shared chrome module do not exist.

- [ ] **Step 3: Extract the existing meta-panel constants without visual changes**

Move the current `desktopFeedFrameClassName` and
`desktopFeedGlassLayerStyle` values verbatim into `metaPanelChrome.js`:

```js
export const META_PANEL_FRAME_CLASS_NAME =
  "relative flex h-full flex-col overflow-hidden rounded-[1.15rem] border border-white/[0.38] shadow-[0_18px_42px_-28px_rgba(37,99,235,0.28),inset_0_1px_0_rgba(255,255,255,0.28)] ring-1 ring-white/35 select-none";

export const META_PANEL_GLASS_STYLE = {
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06)), linear-gradient(90deg, rgba(255,255,255,0.24), rgba(191,219,254,0.14), rgba(147,197,253,0.1))",
  backdropFilter: "blur(18px) saturate(1.1)",
  WebkitBackdropFilter: "blur(18px) saturate(1.1)",
};

export const META_PANEL_HEADER_CLASS_NAME =
  "relative z-10 flex h-11 shrink-0 items-center justify-between gap-2.5 border-b border-white/30 bg-white/25 px-3.5 text-slate-700";
```

Import them into `LeftMetaRail` and confirm its class output is otherwise
unchanged.

- [ ] **Step 4: Build the compact desktop Replay panel**

`ReplayPanel` uses a fixed right-side root bounded above the turn controls:

```jsx
<aside className="pointer-events-auto fixed right-4 top-4 z-[45] w-[min(22rem,calc(100vw-2rem))]" data-replay-panel="desktop">
  <section className={`${META_PANEL_FRAME_CLASS_NAME} max-h-[min(34rem,calc(100vh-9rem))]`}>
    <div className="pointer-events-none absolute inset-0 rounded-[inherit]" style={META_PANEL_GLASS_STYLE} />
    <header className={META_PANEL_HEADER_CLASS_NAME}>...</header>
    <div className="relative z-10 min-h-0 overflow-y-auto p-3">...</div>
  </section>
</aside>
```

Header actions are Results and minimize. A minimized panel becomes one native
glass **Replay** restore button, not a narrow transport rail.

Use the existing `Select` primitive for Board plus players:

```jsx
<Select value={perspectiveId ?? "board"} onChange={(event) => onPerspectiveChange(event.target.value === "board" ? null : event.target.value)}>
  <option value="board">Board</option>
  {timeline.players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
</Select>
```

`ReplayStepControls` contains event arrows, Previous turn, Next turn, and the
meaningful-event range input only. Pass `eventCount={timeline.events.length}`
to the chart so its hidden future domain remains seekable without drawing data.

- [ ] **Step 5: Keep the compact mobile dock/details sheet**

Use a small bottom dock for event arrows, current turn, and Details. The Vaul
sheet contains perspective, Results, turn jumps, scrubber, and graph. It must
coordinate its open state with `MobilePlayerCockpit` through the existing
`onReplayMobileMetaPanelOpen` hook so only one mobile sheet is open.

- [ ] **Step 6: Run panel and existing log/chat tests**

```bash
pnpm exec vitest run app/__tests__/replayPanel.source.test.js app/__tests__/replayScoreChart.test.js app/__tests__/replayScoreChart.source.test.js app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/FeedPanel.test.js app/catana/__tests__/GameLogPanel.test.js --reporter=dot
```

Expected: PASS.

- [ ] **Step 7: Commit the native panel replacement**

```bash
git add -- app/catana/components/metaPanelChrome.js app/replays/components/ReplayPanel.jsx app/replays/components/ReplayStepControls.jsx app/__tests__/replayPanel.source.test.js app/replays/components/ReplayConsole.jsx app/replays/components/ReplayTransportControls.jsx app/__tests__/replayConsole.source.test.js
git add -p -- app/catana/components/LeftMetaRail.js app/catana/__tests__/LeftMetaRail.test.js app/replays/PostgameGameBoard.js app/replays/components/ReplayScoreChart.jsx
git diff --cached --check
git commit -m "style: align replay with game meta panels"
```

---

### Task 7: Point discovery links at the canonical game URL and close out verification

**Files:**
- Modify: `lib/server/profiles/getPublicProfile.js`
- Modify: `lib/server/__tests__/publicProfile.test.js`
- Modify: `app/u/[username]/page-content.js`
- Modify: `app/__tests__/profilePage.test.js`
- Modify: `app/catana/components/PostgameOverlay.js`
- Modify: `app/catana/__tests__/PostgameOverlay.test.js`
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Interfaces:**
- Public profile recent matches add `bgioMatchId` and link to `/g/:bgioMatchId`.
- The legacy replay-id route remains readable but is no longer generated by current UI.

- [ ] **Step 1: Write failing canonical-link tests**

Update `publicProfile.test.js` to expect `bgioMatchId: "match_3"`. Update
`profilePage.test.js` fixture and assertions:

```js
expect(html).toContain('/g/match_3');
expect(html).not.toContain('/replays/rpl_3');
```

Update `PostgameOverlay.test.js` to assert its Replay action calls the supplied
callback and does not contain a URL.

- [ ] **Step 2: Run the discovery tests and verify failure**

```bash
pnpm exec vitest run lib/server/__tests__/publicProfile.test.js app/__tests__/profilePage.test.js app/catana/__tests__/PostgameOverlay.test.js --reporter=dot
```

Expected: FAIL because recent matches do not expose `bgioMatchId` and still link by replay ID.

- [ ] **Step 3: Add the canonical match ID to the profile read model**

Select `am.bgio_match_id` in `getPublicProfile` and map:

```js
recentMatches: recentMatchesResult.rows.map((row) => ({
  archivedMatchId: row.archived_match_id,
  replayId: row.replay_id,
  bgioMatchId: row.bgio_match_id,
  finishedAt: new Date(row.finished_at).toISOString(),
  gameName: row.game_name,
  playerCount: toInt(row.player_count),
  result: row.result,
}))
```

Change the profile href to:

```js
href: `/g/${encodeURIComponent(match.bgioMatchId)}`
```

- [ ] **Step 4: Run the complete focused replay suite**

```bash
pnpm exec vitest run \
  lib/server/__tests__/replayFrames.test.js \
  lib/server/__tests__/getMatchPageData.test.js \
  lib/server/__tests__/publicProfile.test.js \
  app/__tests__/api/postgameReplayRoute.test.js \
  app/__tests__/gMatchPage.test.js \
  app/__tests__/replayPage.test.js \
  app/__tests__/replayPageClient.test.js \
  app/__tests__/replayPageClient.source.test.js \
  app/__tests__/replayNavigation.test.js \
  app/__tests__/replaySessionState.test.js \
  app/__tests__/replayGameScreenProps.test.js \
  app/__tests__/postgameReplayPayload.test.js \
  app/__tests__/postgameGameBoard.source.test.js \
  app/__tests__/replayPanel.source.test.js \
  app/__tests__/replayScoreChart.test.js \
  app/__tests__/replayScoreChart.source.test.js \
  app/__tests__/profilePage.test.js \
  app/catana/__tests__/FeedPanel.test.js \
  app/catana/__tests__/GameLogPanel.test.js \
  app/catana/__tests__/GameOverModal.test.js \
  app/catana/__tests__/GameScreen.gameOver.test.js \
  app/catana/__tests__/GameScreen.logPresentation.test.js \
  app/catana/__tests__/GameScreen.mobileShell.source.test.js \
  app/catana/__tests__/LeftMetaRail.test.js \
  app/catana/__tests__/MobilePlayerCockpit.source.test.js \
  app/catana/__tests__/PlayerActionContainer.status.test.js \
  app/catana/__tests__/PostgameOverlay.test.js \
  app/catana/__tests__/useLocalPlayerDockModel.test.js \
  app/catana/__tests__/gameText.test.js \
  --reporter=dot
```

Expected: all listed test files pass.

- [ ] **Step 5: Run static and production checks**

```bash
pnpm lint
BETTER_AUTH_SECRET='local-replay-build-verification-secret-2026' BETTER_AUTH_URL='http://localhost:3000' DATABASE_URL='postgres://settlehex:settlehex@localhost:55432/settlehex' pnpm build
git diff --check
```

Expected: lint has no warnings/errors, the production build completes, and diff check is silent. Run `pnpm verify` as a broader diagnostic; if concurrent dirty work still breaks an unrelated source assertion, record the exact first failing file after confirming replay-focused checks remain green.

- [ ] **Step 6: Perform real-archive browser QA**

Start `pnpm dev`, then verify `/g/:matchID` with a real archive at `1440x900` and
`390x844`:

- initial pre-placement state and no visible final-score data;
- no `?view=replay` navigation;
- native log/chat-family Replay panel;
- event/turn buttons, arrows, log seek, scrubber, and graph seek;
- graph grows only through the current event;
- Board plus every player perspective;
- exact selected resources/dev cards at multiple events;
- disabled desktop action dock, dice, status, and End Turn;
- Results manual reveal, early-close cursor restoration, and automatic terminal reveal;
- mobile cockpit/panel coexistence;
- zero browser console errors.

Complete one local game and confirm Results appears immediately, Replay prepares
in place, and entering Replay does not navigate or blank/remount the board.

- [ ] **Step 7: Update durable agent documentation**

Add the implemented behaviour and exact verification evidence to
`docs/agent/PROGRESS.md`. Replace the superseded replay notes in
`docs/agent/NOTES.md` with the canonical URL, unspoiled entry, step-only
navigation, selected-player read-only HUD, spoiler-safe graph, and in-place
live postgame rules.

- [ ] **Step 8: Commit canonical discovery and closeout docs**

```bash
git add -p -- lib/server/profiles/getPublicProfile.js lib/server/__tests__/publicProfile.test.js app/u/[username]/page-content.js app/__tests__/profilePage.test.js app/catana/components/PostgameOverlay.js app/catana/__tests__/PostgameOverlay.test.js docs/agent/PROGRESS.md docs/agent/NOTES.md
git diff --cached --check
git commit -m "feat: finish integrated postgame replay"
```

Do not deploy. Report the branch, commits, focused tests, lint/build results,
browser evidence, and any unrelated broad-suite boundary for explicit release
approval.
