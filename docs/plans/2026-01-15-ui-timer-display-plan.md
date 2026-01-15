# UI Timer Display Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Display a server-synchronized countdown (mm:ss) in the bottom-right UI, prioritizing stage timers over turn timers.

**Architecture:** Add a TimerManager snapshot helper and an HTTP timer endpoint on the server. The client polls the endpoint, keeps a local countdown based on the received snapshot, and renders a timer pill next to the status text.

**Tech Stack:** Node.js, boardgame.io server, React (Next.js), Vitest

### Task 1: Add failing tests for TimerManager snapshot

**Files:**
- Modify: `server/__tests__/TimerManager.test.js`

**Step 1: Write failing test for stage snapshot**

```js
it("returns stage timer snapshot when stage timer is active", () => {
  const dispatch = vi.fn();
  const manager = new TimerManager({ dispatch });

  manager.onState("match-1", baseState({
    ctx: {
      phase: "placement",
      currentPlayer: "0",
      activePlayers: { "0": "settlement" },
      turn: 1
    }
  }));

  const snapshot = manager.getTimerSnapshot("match-1");
  expect(snapshot?.kind).toBe("stage");
  expect(snapshot?.remainingMs).toBeGreaterThan(0);
});
```

**Step 2: Write failing test for turn snapshot**

```js
it("returns turn timer snapshot when no stage timer is active", () => {
  const dispatch = vi.fn();
  const manager = new TimerManager({ dispatch });

  manager.onState("match-1", baseState({
    ctx: {
      phase: "main",
      currentPlayer: "0",
      activePlayers: { "0": "postRoll" },
      turn: 1
    }
  }));

  const snapshot = manager.getTimerSnapshot("match-1");
  expect(snapshot?.kind).toBe("turn");
  expect(snapshot?.remainingMs).toBeGreaterThan(0);
});
```

**Step 3: Run tests to confirm failures**

Run: `pnpm vitest server/__tests__/TimerManager.test.js`
Expected: FAIL (getTimerSnapshot missing)

**Step 4: Commit tests**

```bash
git add server/__tests__/TimerManager.test.js
git commit -m "test: add timer snapshot coverage"
```

### Task 2: Implement TimerManager snapshot support

**Files:**
- Modify: `server/timers/TimerManager.js`

**Step 1: Track stage timer start/duration**

```js
if (prev.stageTimeoutId) {
  clearTimeout(prev.stageTimeoutId);
  prev.stageTimeoutId = undefined;
  prev.stageStartedAtMs = undefined;
  prev.stageDurationMs = undefined;
}
```

When scheduling a stage timer:
```js
prev.stageStartedAtMs = Date.now();
prev.stageDurationMs = stageTimeoutMs;
```

When no stage timeout:
```js
prev.stageStartedAtMs = undefined;
prev.stageDurationMs = undefined;
```

**Step 2: Add snapshot helpers**

```js
getStageRemainingMs(record) {
  if (!record.stageStartedAtMs || !record.stageDurationMs) return null;
  const elapsed = Date.now() - record.stageStartedAtMs;
  return Math.max(0, record.stageDurationMs - elapsed);
}

getTurnRemainingMs(record) {
  if (record.turnRemainingMs == null) return null;
  if (!record.turnTimeoutId || !record.turnStartedAtMs) return record.turnRemainingMs;
  const elapsed = Date.now() - record.turnStartedAtMs;
  return Math.max(0, record.turnRemainingMs - elapsed);
}

getTimerSnapshot(matchID, state) {
  let record = this.matches.get(matchID);
  if (!record && state) {
    this.onState(matchID, state);
    record = this.matches.get(matchID);
  }
  if (!record) return null;
  const stageRemainingMs = this.getStageRemainingMs(record);
  if (stageRemainingMs != null) {
    return {
      kind: "stage",
      remainingMs: stageRemainingMs,
      totalMs: record.stageDurationMs,
      stageKey: record.stageKey
    };
  }
  const turnRemainingMs = this.getTurnRemainingMs(record);
  if (turnRemainingMs != null) {
    return {
      kind: "turn",
      remainingMs: turnRemainingMs,
      totalMs: record.turnRemainingMs,
      stageKey: record.stageKey
    };
  }
  return null;
}
```

**Step 3: Run tests to confirm pass**

Run: `pnpm vitest server/__tests__/TimerManager.test.js`
Expected: PASS

**Step 4: Commit**

```bash
git add server/timers/TimerManager.js
git commit -m "feat: add timer snapshots"
```

### Task 3: Add server timer endpoint

**Files:**
- Modify: `server/server.js`

**Step 1: Add Koa route**

```js
server.router.get('/timer/:matchID', async (ctx) => {
  const matchID = ctx.params.matchID;
  const { state } = await serverInstance.db.fetch(matchID, { state: true });
  if (!state) {
    ctx.status = 404;
    ctx.body = { error: 'match not found' };
    return;
  }
  const timer = timerManager.getTimerSnapshot(matchID, state);
  ctx.body = { matchID, timer, serverTimeMs: Date.now() };
});
```

**Step 2: Commit**

```bash
git add server/server.js
git commit -m "feat: add timer endpoint"
```

### Task 4: Add client polling + display

**Files:**
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/components/PlayerActionContainer.js`

**Step 1: Add timer polling in GameScreen**

```js
const [timerSnapshot, setTimerSnapshot] = useState(null);
const [nowMs, setNowMs] = useState(Date.now());
const matchID = bgioProps.matchID ?? "default";

useEffect(() => {
  const tick = setInterval(() => setNowMs(Date.now()), 250);
  return () => clearInterval(tick);
}, []);

useEffect(() => {
  if (!matchID || typeof window === "undefined") return;
  const baseUrl = `${window.location.protocol}//${window.location.hostname}:8000`;
  const url = `${baseUrl}/timer/${matchID}`;
  let cancelled = false;

  const fetchTimer = async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (cancelled) return;
      if (!data?.timer) {
        setTimerSnapshot(null);
        return;
      }
      setTimerSnapshot({
        ...data.timer,
        receivedAtMs: Date.now()
      });
    } catch (err) {
      // ignore errors
    }
  };

  fetchTimer();
  const interval = setInterval(fetchTimer, 2000);
  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}, [matchID]);

const timerMs = timerSnapshot
  ? Math.max(0, timerSnapshot.remainingMs - (nowMs - timerSnapshot.receivedAtMs))
  : null;
```

Pass `timerMs` to `PlayerActionContainer`.

**Step 2: Render timer in PlayerActionContainer**

Add a `timerMs` prop and helper formatter:
```js
const formatTimer = (ms) => {
  if (ms == null) return null;
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};
```

Render to the right of status text:
```js
const timerText = formatTimer(timerMs);
...
{SHOW_STATUS_TEXT && gameStatus && (
  <div className="mt-2 flex items-center justify-center gap-2">
    <div className="text-white text-sm font-medium drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
      {gameStatus.text}
    </div>
    {timerText && (
      <div className="rounded-md px-2 py-1 text-xs font-semibold text-slate-800 bg-blue-200/70 ring-1 ring-slate-300">
        {timerText}
      </div>
    )}
  </div>
)}
```

**Step 3: Run tests (optional UI)**

Run: `pnpm vitest server/__tests__/TimerManager.test.js`
Expected: PASS

**Step 4: Commit UI changes**

```bash
git add app/catana/GameScreen.js app/catana/components/PlayerActionContainer.js
git commit -m "feat: show server-synced timer"
```

### Task 5: Update agent docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Progress entry**
- `Added server timer endpoint and UI countdown pill in bottom-right.`

**Step 2: Notes entry**
- `Timer UI polls /timer/:matchID (2s) and displays stage timer when active, else turn timer.`

**Step 3: Commit docs**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: note timer UI"
```
