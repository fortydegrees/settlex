# PreGame Start + Timer Alignment Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a pre-game start phase with ready-up + auto-start, align timers with dice animations, and fix illegal auto-robber placements.

**Architecture:** Introduce a `preGame` phase (stage `waiting`) that ends when all players are ready or after 15s via a server-driven timeout. TimerManager delays post-roll timers by a fixed animation buffer and supports `activePlayers.all` stage keys. Client sends `readyUp()` immediately and hides the timer during preGame.

**Tech Stack:** Node/Boardgame.io server, React client, Vitest tests.

---

### Task 1: Add failing TimerManager tests for preGame + roll buffer

**Files:**
- Modify: `server/__tests__/TimerManager.test.js`
- Test: `server/__tests__/TimerManager.test.js`

**Step 1: Write the failing tests**

Add tests near the existing ones:

```js
it("auto-starts preGame after timeout", () => {
  const dispatch = vi.fn();
  const manager = new TimerManager({ dispatch });

  manager.onState("match-1", {
    G: { core: {} },
    ctx: {
      phase: "preGame",
      currentPlayer: "0",
      activePlayers: { all: "waiting" },
      turn: 1
    }
  });

  vi.advanceTimersByTime(15000);

  expect(dispatch).toHaveBeenCalledWith({
    matchID: "match-1",
    move: "autoStartGame",
    playerID: "0"
  });
});

it("delays postRoll turn timer after a roll animation", () => {
  const dispatch = vi.fn();
  const manager = new TimerManager({ dispatch });

  manager.onState(
    "match-1",
    baseState({
      ctx: {
        phase: "main",
        currentPlayer: "0",
        activePlayers: { "0": "postRoll" },
        turn: 1
      }
    }),
    [{ action: { type: "MAKE_MOVE", payload: { type: "rollDice" } } }]
  );

  vi.advanceTimersByTime(45000 + 3500 - 1);
  expect(dispatch).not.toHaveBeenCalled();

  vi.advanceTimersByTime(1);
  expect(dispatch).toHaveBeenCalledWith({
    matchID: "match-1",
    move: "autoEndTurn",
    playerID: "0"
  });
});

it("delays moveRobber stage timer after a roll animation", () => {
  const dispatch = vi.fn();
  const manager = new TimerManager({ dispatch });

  manager.onState(
    "match-1",
    baseState({
      ctx: {
        phase: "main",
        currentPlayer: "0",
        activePlayers: { "0": "moveRobber" },
        turn: 1
      }
    }),
    [{ action: { type: "MAKE_MOVE", payload: { type: "autoRoll" } } }]
  );

  vi.advanceTimersByTime(20000 + 3500 - 1);
  expect(dispatch).not.toHaveBeenCalled();

  vi.advanceTimersByTime(1);
  expect(dispatch).toHaveBeenCalledWith({
    matchID: "match-1",
    move: "autoMoveRobber",
    playerID: "0"
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest server/__tests__/TimerManager.test.js`

Expected: FAIL (autoStartGame not defined; timers not delayed).

---

### Task 2: Add failing autoMoveRobber legality test

**Files:**
- Modify: `app/catana/__tests__/Moves.robber.test.js`
- Test: `app/catana/__tests__/Moves.robber.test.js`

**Step 1: Write the failing test**

```js
import { autoMoveRobber } from "../Moves";

it("autoMoveRobber skips illegal robber tiles", () => {
  const state = createEmptyState(["0", "1"]);
  state.ruleset.friendlyRobber = { enabled: true, vpThreshold: 2 };
  state.robberTileId = 99;

  const tiles = [
    {
      coordinate: [0, 0, 0],
      type: TileTypes.LAND,
      tile: { id: 1, resource: "Wood", nodes: { a: 10 } }
    },
    {
      coordinate: [1, 0, -1],
      type: TileTypes.LAND,
      tile: { id: 2, resource: "Brick", nodes: {} }
    }
  ];
  const coreTopology = buildTopology(tiles);

  // Place a low-VP building on tile 1 to make it illegal under friendly-robber rules
  state.buildingsByNodeId[10] = { ownerId: "0", type: "settlement" };

  const context = {
    G: { core: state, coreTopology, tiles },
    ctx: { currentPlayer: "1", activePlayers: { "1": "moveRobber" } },
    random: { Number: () => 0, Shuffle: (arr) => arr },
    events: { setStage: vi.fn() },
    log: { setMetadata: vi.fn() }
  };

  autoMoveRobber.move(context);

  expect(state.robberTileId).toBe(2);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest app/catana/__tests__/Moves.robber.test.js`

Expected: FAIL (robberTileId still 99).

---

### Task 3: Add failing preGame status test

**Files:**
- Modify: `app/catana/__tests__/gameStatus.test.js`
- Test: `app/catana/__tests__/gameStatus.test.js`

**Step 1: Write the failing test**

```js
it("returns waiting status during preGame", () => {
  const core = {
    phase: "normal",
    turn: { phase: "preRoll", currentPlayerId: "0", pendingDiscards: [] },
    players: ["0", "1"]
  };
  const ctx = {
    phase: "preGame",
    currentPlayer: "0",
    activePlayers: { all: "waiting" }
  };
  const status = getGameStatus(core, ctx);
  expect(status.statusType).toBe(STATUS_TYPES.THINKING);
  expect(status.text).toBe("Waiting to start");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest app/catana/__tests__/gameStatus.test.js`

Expected: FAIL (status text/type unchanged).

---

### Task 4: Implement preGame phase + readyUp moves

**Files:**
- Modify: `app/catana/Game.js`
- Modify: `app/catana/Moves.js`

**Step 1: Implement readyUp + autoStartGame moves**

Add to `Moves.js`:

```js
export const readyUp = {
  move: (context) => {
    const { G, ctx, playerID, events } = context;
    if (!playerID) return;
    if (!G.preGame) {
      G.preGame = { readyByPlayerId: {} };
    }
    G.preGame.readyByPlayerId[playerID] = true;

    const allPlayers = G.core?.players ?? ctx.playOrder ?? [];
    if (allPlayers.length === 0) return;
    const allReady = allPlayers.every((id) => G.preGame.readyByPlayerId?.[id]);
    if (allReady) {
      events.endPhase();
    }
  }
};

export const autoStartGame = {
  move: (context) => {
    const { events } = context;
    events.endPhase();
  }
};
```

**Step 2: Wire preGame phase**

In `Game.js`:
- Import `readyUp` and `autoStartGame`.
- Add a `preGame` phase **before** `placement`:
  - `start: true`
  - `next: "placement"`
  - `turn.activePlayers: { all: "waiting" }`
  - `stages.waiting.moves: { readyUp, autoStartGame, ...DEBUG_MOVES }`
- Set `placement.start = false`.
- In `placement.turn.onBegin`, set `G.core.phase = "placement"` before `updateValids`.
- In `setup`, initialize `preGame: { readyByPlayerId: {} }` in `G`.

**Step 3: Verify preGame tests now pass**

Run: `pnpm vitest app/catana/__tests__/gameStatus.test.js`

Expected: PASS (after Task 7 status change).

---

### Task 5: Fix autoMoveRobber legality

**Files:**
- Modify: `app/catana/Moves.js`

**Step 1: Implement canPlaceRobber filtering**

In `autoMoveRobber`, replace the candidate filter with:

```js
const candidates = tiles
  .filter((tile) => tile.type === TileTypes.LAND)
  .map((tile) => tile.tile.id)
  .filter((tileId) => tileId !== G.core?.robberTileId)
  .filter((tileId) => canPlaceRobber(G.core, G.coreTopology, tileId));
```

**Step 2: Run test to verify it passes**

Run: `pnpm vitest app/catana/__tests__/Moves.robber.test.js`

Expected: PASS.

---

### Task 6: TimerManager preGame stage + roll buffer

**Files:**
- Modify: `server/timers/TimerManager.js`

**Step 1: Add stage config**

- Add `"preGame:waiting": 15000` to `DEFAULT_STAGE_TIMERS_MS`.
- Add `"preGame:waiting": "autoStartGame"` to `STAGE_TIMEOUT_MOVES`.

**Step 2: Handle activePlayers.all stage keys**

In `getStageKey`, use:

```js
const active = ctx.activePlayers?.[ctx.currentPlayer] ?? ctx.activePlayers?.all ?? "";
```

**Step 3: Add roll animation buffer**

- Add `ROLL_ANIMATION_BUFFER_MS = 3500`.
- Add `ROLL_DELAY_STAGES = new Set(["main:postRoll", "main:robberDiscard", "main:moveRobber"])`.
- Add `ROLL_DELAY_MOVES = new Set(["rollDice", "autoRoll"])` and a helper to detect roll moves in deltalog.
- When scheduling stage or turn timers, apply `delayMs` if the deltalog indicates a roll and stage is in `ROLL_DELAY_STAGES`.
- Set `stageStartedAtMs` / `turnStartedAtMs` to `Date.now() + delayMs` and schedule timeouts for `delayMs + duration`.

**Step 4: Handle future-start timers**

Update:
- `getStageRemainingMs` to return full duration if `Date.now() < stageStartedAtMs`.
- `getTurnRemainingMs` to return full remaining if `Date.now() < turnStartedAtMs`.
- `pauseTurnTimer` to avoid subtracting negative elapsed when start is in the future.

**Step 5: Run TimerManager tests**

Run: `pnpm vitest server/__tests__/TimerManager.test.js`

Expected: PASS.

---

### Task 7: Client readyUp + hide timer in preGame + floor seconds

**Files:**
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/components/PlayerActionContainer.js`
- Modify: `app/catana/utils/gameStatus.js`

**Step 1: Send readyUp ASAP**

In `GameScreen`:
- Add `readySent` state, reset on `matchID` change.
- Add effect: when `ctx.phase === "preGame"` and `playerID` and `!readySent`, call `moves.readyUp()` and set `readySent`.

**Step 2: Hide timer during preGame**

After computing `timerSnapshot`, set:

```js
const hideTimer = timerSnapshot?.stageKey?.startsWith("preGame:");
const visibleTimerMs = hideTimer ? null : timerMs;
```

Pass `visibleTimerMs` to `PlayerActionContainer`.

**Step 3: Floor seconds**

In `PlayerActionContainer`, change timer formatting to use `Math.floor` instead of `Math.ceil`.

**Step 4: preGame status text**

In `getGameStatus`, add an early check for `ctx.phase === "preGame"` returning `{ text: "Waiting to start", statusType: THINKING }`.

**Step 5: Run UI tests**

Run:
- `pnpm vitest app/catana/__tests__/gameStatus.test.js`

Expected: PASS.

---

### Task 8: Docs updates

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

Add brief notes covering:
- preGame phase + readyUp + autoStart timeout
- roll animation buffer for timers
- autoMoveRobber legality fix

---

### Task 9: Verification

Run the focused test set:

```bash
pnpm vitest server/__tests__/TimerManager.test.js \
  app/catana/__tests__/Moves.robber.test.js \
  app/catana/__tests__/gameStatus.test.js
```

Expected: PASS.

---

**Notes/Constraints**
- preGame timer starts when the server first observes match state (first update/sync or `/timer` seed). This is the closest available hook to “match creation” without deeper lobby integration.
- Client should send `readyUp()` immediately; preGame timer still guarantees auto‑start after 15s.

