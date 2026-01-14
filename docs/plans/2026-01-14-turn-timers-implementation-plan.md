# Turn Timers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add server-enforced turn/stage timers that trigger deterministic auto-moves (via boardgame.io RNG) without forking boardgame.io.

**Architecture:** Wrap SocketIO pubSub to observe match state updates, feed a TimerManager that schedules stage/turn timeouts, and dispatches synthetic move actions (auto-moves) through the server Master. Auto-moves live in `app/catana/Moves.js` and are wired into stage move lists.

**Tech Stack:** Node.js, boardgame.io server, Vitest, existing Catan moves + game-core helpers.

---

### Task 1: Add TimerManager unit test scaffold

**Files:**
- Create: `server/__tests__/TimerManager.test.js`
- Create: `server/timers/TimerManager.js`

**Step 1: Write the failing test**

```js
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TimerManager } from "../timers/TimerManager";

const baseState = (overrides = {}) => ({
  G: { core: {} },
  ctx: {
    phase: "main",
    currentPlayer: "0",
    activePlayers: { "0": "preRoll" },
    turn: 1
  },
  ...overrides
});

describe("TimerManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("schedules a stage timer and dispatches auto-roll on expiry", () => {
    const dispatch = vi.fn();
    const manager = new TimerManager({ dispatch });

    manager.onState("match-1", baseState());

    vi.advanceTimersByTime(5000);

    expect(dispatch).toHaveBeenCalledWith({
      matchID: "match-1",
      move: "autoRoll",
      playerID: "0"
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest server/__tests__/TimerManager.test.js`
Expected: FAIL (TimerManager missing).

**Step 3: Commit failing test**

```bash
git add server/__tests__/TimerManager.test.js

git commit -m "test: add TimerManager scheduling coverage"
```

---

### Task 2: Implement minimal TimerManager to pass the test

**Files:**
- Modify: `server/timers/TimerManager.js`

**Step 1: Implement minimal TimerManager**

```js
const DEFAULT_STAGE_TIMERS_MS = {
  "main:preRoll": 5000
};

export class TimerManager {
  constructor({ dispatch }) {
    this.dispatch = dispatch;
    this.matches = new Map();
  }

  onState(matchID, state) {
    const stageKey = this.getStageKey(state);
    const prev = this.matches.get(matchID);
    if (prev?.stageKey === stageKey) return;

    if (prev?.stageTimeoutId) {
      clearTimeout(prev.stageTimeoutId);
    }

    const timeoutMs = DEFAULT_STAGE_TIMERS_MS[stageKey];
    if (!timeoutMs) {
      this.matches.set(matchID, { stageKey });
      return;
    }

    const playerID = state.ctx.currentPlayer;
    const stageTimeoutId = setTimeout(() => {
      this.dispatch({ matchID, move: "autoRoll", playerID });
    }, timeoutMs);

    this.matches.set(matchID, { stageKey, stageTimeoutId });
  }

  getStageKey(state) {
    const { ctx } = state;
    const stage = ctx.activePlayers?.[ctx.currentPlayer] ?? "";
    return `${ctx.phase}:${stage}`;
  }
}
```

**Step 2: Run test to verify it passes**

Run: `pnpm vitest server/__tests__/TimerManager.test.js`
Expected: PASS.

**Step 3: Commit**

```bash
git add server/timers/TimerManager.js

git commit -m "feat: add minimal TimerManager scheduling"
```

---

### Task 3: Expand TimerManager behavior (stage vs turn timers)

**Files:**
- Modify: `server/__tests__/TimerManager.test.js`
- Modify: `server/timers/TimerManager.js`

**Step 1: Add failing test for pausing turn timer during stage timer**

```js
it("pauses turn timer while stage timer runs, then resumes", () => {
  const dispatch = vi.fn();
  const manager = new TimerManager({ dispatch });

  // Start in postRoll (turn timer = 45000)
  manager.onState("match-1", baseState({
    ctx: { phase: "main", currentPlayer: "0", activePlayers: { "0": "postRoll" }, turn: 1 }
  }));

  vi.advanceTimersByTime(20000);

  // Move to discard stage (stage timer = 20000) which should pause turn timer
  manager.onState("match-1", baseState({
    ctx: { phase: "main", currentPlayer: "0", activePlayers: { "0": "robberDiscard" }, turn: 1 }
  }));

  vi.advanceTimersByTime(20000);
  expect(dispatch).toHaveBeenCalledWith({
    matchID: "match-1",
    move: "autoDiscard",
    playerID: "0"
  });

  // Return to postRoll and ensure remaining turn time is 25000
  manager.onState("match-1", baseState({
    ctx: { phase: "main", currentPlayer: "0", activePlayers: { "0": "postRoll" }, turn: 1 }
  }));

  vi.advanceTimersByTime(25000);
  expect(dispatch).toHaveBeenCalledWith({
    matchID: "match-1",
    move: "autoEndTurn",
    playerID: "0"
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest server/__tests__/TimerManager.test.js`
Expected: FAIL (no turn timer logic).

**Step 3: Implement minimal stage/turn timers**

- Add timer constants for placement, robber, discard, postRoll.
- Track `turnRemainingMs` + `turnTimerId` per match.
- Pause the turn timer when stage timer is active; resume it when stage completes.
- Dispatch `autoEndTurn` when turn timer expires.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest server/__tests__/TimerManager.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add server/__tests__/TimerManager.test.js server/timers/TimerManager.js

git commit -m "feat: add stage and turn timer behavior"
```

---

### Task 4: Add pubSub wrapper to feed TimerManager

**Files:**
- Create: `server/timers/timerPubSub.js`
- Modify: `server/server.js`

**Step 1: Add failing test for pubSub wrapper**

Create `server/__tests__/timerPubSub.test.js`:

```js
import { describe, it, expect, vi } from "vitest";
import { createTimerPubSub } from "../timers/timerPubSub";

it("forwards publish payloads to TimerManager", () => {
  const manager = { onState: vi.fn() };
  const pubSub = createTimerPubSub(manager);
  const payload = { state: { ctx: { phase: "main", currentPlayer: "0", activePlayers: { "0": "preRoll" } } } };

  pubSub.publish("MATCH-1", payload);

  expect(manager.onState).toHaveBeenCalledWith("1", payload.state);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest server/__tests__/timerPubSub.test.js`
Expected: FAIL (module missing).

**Step 3: Implement timerPubSub**

```js
import { InMemoryPubSub } from "boardgame.io/server";

const MATCH_PREFIX = "MATCH-";

export function createTimerPubSub(timerManager) {
  const base = new InMemoryPubSub();
  return {
    publish(channelId, payload) {
      if (channelId.startsWith(MATCH_PREFIX) && payload?.state) {
        const matchID = channelId.slice(MATCH_PREFIX.length);
        timerManager.onState(matchID, payload.state, payload.deltalog);
      }
      base.publish(channelId, payload);
    },
    subscribe(channelId, callback) {
      base.subscribe(channelId, callback);
    },
    unsubscribeAll(channelId) {
      base.unsubscribeAll(channelId);
    }
  };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest server/__tests__/timerPubSub.test.js`
Expected: PASS.

**Step 5: Wire it into server**

Update `server/server.js` to create a TimerManager and pass `SocketIO({ pubSub })` into `Server({ transport })`.

**Step 6: Commit**

```bash
git add server/timers/timerPubSub.js server/server.js server/__tests__/timerPubSub.test.js

git commit -m "feat: hook TimerManager into server pubsub"
```

---

### Task 5: Add auto-move tests for placements + discard

**Files:**
- Create: `app/catana/__tests__/Moves.autoTimeouts.test.js`

**Step 1: Write failing tests**

```js
import { describe, it, expect, vi } from "vitest";
import { autoPlaceSettlement, autoPlaceRoad, autoDiscard } from "../Moves";
import { buildTopology, createEmptyState, generateBoard, resolveBoardPreset } from "@settlex/game-core";

const makeContext = (stateOverrides = {}) => {
  const boardPreset = resolveBoardPreset("standard-random");
  const tiles = generateBoard(boardPreset, () => 0.5);
  const coreTopology = buildTopology(tiles);
  const core = createEmptyState(["0", "1"]);

  return {
    G: { core, coreTopology, tiles, valids: { nodes: [], edges: [] } },
    ctx: { phase: "placement", currentPlayer: "0" },
    playerID: "0",
    random: { Number: () => 0.5, Shuffle: (arr) => arr },
    log: { setMetadata: vi.fn() },
    events: { endTurn: vi.fn(), setStage: vi.fn() },
    ...stateOverrides
  };
};

describe("auto-timeout moves", () => {
  it("autoPlaceSettlement chooses a valid node", () => {
    const context = makeContext();
    context.G.valids.nodes = [1, 2, 3];

    autoPlaceSettlement.move(context);

    expect(context.G.core.buildingsByNodeId[1] || context.G.core.buildingsByNodeId[2] || context.G.core.buildingsByNodeId[3]).toBeTruthy();
  });

  it("autoPlaceRoad chooses a valid edge", () => {
    const context = makeContext();
    context.G.valids.edges = ["1-2", "2-3"];

    autoPlaceRoad.move(context);

    expect(context.G.core.roads.length).toBeGreaterThan(0);
  });

  it("autoDiscard removes required cards", () => {
    const context = makeContext({ ctx: { phase: "main", currentPlayer: "0", activePlayers: { "0": "robberDiscard" } } });
    context.G.core.playerStateById["0"].resources = ["wood", "wood", "sheep", "wheat", "ore", "brick", "brick", "brick"];

    autoDiscard.move(context);

    expect(context.G.core.playerStateById["0"].resources.length).toBe(4);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest app/catana/__tests__/Moves.autoTimeouts.test.js`
Expected: FAIL (auto moves missing).

**Step 3: Commit failing tests**

```bash
git add app/catana/__tests__/Moves.autoTimeouts.test.js

git commit -m "test: add auto-timeout move coverage"
```

---

### Task 6: Implement auto-moves in Moves.js

**Files:**
- Modify: `app/catana/Moves.js`

**Step 1: Implement minimal auto-moves**

- Add `autoPlaceSettlement`, `autoPlaceRoad`, `autoDiscard`, `autoMoveRobber`, `autoChooseSteal`, `autoRoll`, `autoEndTurn`, `autoResolveDevCard`.
- Use `ctx.random` for deterministic random selection.
- Reuse existing helper logic (`applyPlaceSettlement`, `applyPlaceRoad`, `applyDiscard`, etc.).
- Log metadata for auto-actions (placement, discard, robber, steal, dev-card choice).

**Step 2: Run auto-move tests**

Run: `pnpm vitest app/catana/__tests__/Moves.autoTimeouts.test.js`
Expected: PASS.

**Step 3: Commit**

```bash
git add app/catana/Moves.js

git commit -m "feat: add auto-timeout moves"
```

---

### Task 7: Wire auto-moves into Game stages

**Files:**
- Modify: `app/catana/Game.js`

**Step 1: Add auto moves to stage move lists**

- placement.settlement: add `autoPlaceSettlement`
- placement.road: add `autoPlaceRoad`
- main.preRoll: add `autoRoll`
- main.robberDiscard: add `autoDiscard`
- main.moveRobber: add `autoMoveRobber`
- main.postRoll: add `autoEndTurn`
- add to dev-card choice stages once those stages exist

**Step 2: Run smoke tests**

Run: `pnpm vitest app/catana/__tests__/Moves.endTurn.test.js`
Expected: PASS.

**Step 3: Commit**

```bash
git add app/catana/Game.js

git commit -m "feat: expose auto-timeout moves in stages"
```

---

### Task 8: Extend TimerManager with action-based time bonuses

**Files:**
- Modify: `server/__tests__/TimerManager.test.js`
- Modify: `server/timers/TimerManager.js`

**Step 1: Add failing test for time bonuses**

```js
it("adds time for bonus actions up to cap", () => {
  const dispatch = vi.fn();
  const manager = new TimerManager({ dispatch });
  const state = baseState({ ctx: { phase: "main", currentPlayer: "0", activePlayers: { "0": "postRoll" }, turn: 1 } });

  manager.onState("match-1", state, [{ action: { type: "MAKE_MOVE", payload: { type: "maritimeTrade" } } }]);

  expect(manager.getTurnRemaining("match-1")).toBeGreaterThan(45000);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest server/__tests__/TimerManager.test.js`
Expected: FAIL (bonus logic missing).

**Step 3: Implement bonus logic**

- Parse `deltalog` for moves: `maritimeTrade`, `placeRoad`, `placeSettlement`, `placeCity`, `buyDevCard`, `playDevCardStart`.
- Add +10s to remaining turn time per action, capped (e.g. +30s max).

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest server/__tests__/TimerManager.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add server/__tests__/TimerManager.test.js server/timers/TimerManager.js

git commit -m "feat: add turn-time bonuses for actions"
```

---

### Task 9: Update agent docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Add brief update**

- PROGRESS: note timer manager + auto-move wiring.
- NOTES: add timer manager location and auto-move list.

**Step 2: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md

git commit -m "docs: log turn timer implementation"
```

---

## Verification

Run: `pnpm vitest server/__tests__/TimerManager.test.js app/catana/__tests__/Moves.autoTimeouts.test.js`
Expected: PASS.

