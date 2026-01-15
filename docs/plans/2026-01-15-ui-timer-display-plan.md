# UI Timer Snapshot Push Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Display a server-synchronized countdown (mm:ss) using timer snapshots attached to state updates, with a one-time seed fetch for initial sync.

**Architecture:** TimerManager provides a snapshot and server time. `timerPubSub` attaches `timerSnapshot` and `timerServerTimeMs` to update/patch payloads. The client listens for these props, seeds once via `/timer/:matchID` if missing, and counts down locally between updates.

**Tech Stack:** Node.js, boardgame.io server, React (Next.js), Vitest

### Task 1: Add failing timerPubSub tests for snapshot payloads

**Files:**
- Modify: `server/__tests__/timerPubSub.test.js`

**Step 1: Write failing test for update payload snapshot**

```js
it("attaches timer snapshot to update payloads", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-15T00:00:00Z"));

  const manager = {
    onState: vi.fn(),
    getTimerSnapshot: vi.fn().mockReturnValue({
      kind: "turn",
      remainingMs: 5000,
      totalMs: 60000,
      stageKey: "main:"
    })
  };

  const pubSub = createTimerPubSub(manager);
  const received = vi.fn();
  pubSub.subscribe("MATCH-1", received);

  const payload = {
    type: "update",
    args: [
      "1",
      { ctx: { phase: "main", currentPlayer: "0", activePlayers: { "0": "preRoll" } } }
    ]
  };

  pubSub.publish("MATCH-1", payload);

  expect(received).toHaveBeenCalledTimes(1);
  const forwarded = received.mock.calls[0][0];
  expect(forwarded.args[1].timerSnapshot).toEqual({
    kind: "turn",
    remainingMs: 5000,
    totalMs: 60000,
    stageKey: "main:"
  });
  expect(forwarded.args[1].timerServerTimeMs).toBe(Date.now());
  vi.useRealTimers();
});
```

**Step 2: Write failing test for patch payload snapshot**

```js
it("attaches timer snapshot to patch payloads", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-15T00:00:00Z"));

  const manager = {
    onState: vi.fn(),
    getTimerSnapshot: vi.fn().mockReturnValue({
      kind: "stage",
      remainingMs: 2000,
      totalMs: 10000,
      stageKey: "main:postRoll"
    })
  };

  const pubSub = createTimerPubSub(manager);
  const received = vi.fn();
  pubSub.subscribe("MATCH-1", received);

  const payload = {
    type: "patch",
    args: ["1", 10, { ctx: {} }, { ctx: { phase: "main" } }]
  };

  pubSub.publish("MATCH-1", payload);

  const forwarded = received.mock.calls[0][0];
  expect(forwarded.args[3].timerSnapshot).toEqual({
    kind: "stage",
    remainingMs: 2000,
    totalMs: 10000,
    stageKey: "main:postRoll"
  });
  expect(forwarded.args[3].timerServerTimeMs).toBe(Date.now());
  vi.useRealTimers();
});
```

**Step 3: Run tests to confirm failures**

Run: `pnpm vitest server/__tests__/timerPubSub.test.js`
Expected: FAIL (snapshot not attached yet)

**Step 4: Commit tests**

```bash
git add server/__tests__/timerPubSub.test.js
git commit -m "test: cover timer snapshot publish"
```

### Task 2: Attach timer snapshot to update/patch payloads

**Files:**
- Modify: `server/timers/timerPubSub.js`

**Step 1: Implement snapshot attachment**

```js
const attachTimerSnapshot = (payload, matchID, state) => {
  if (!state) return payload;
  const timerSnapshot = timerManager.getTimerSnapshot(matchID, state);
  const serverTimeMs = Date.now();

  if (payload?.type === "update") {
    const args = payload.args ?? [];
    const deltalog = args.length > 2 ? args[2] : undefined;
    const stateWithTimer = {
      ...state,
      timerSnapshot,
      timerServerTimeMs: serverTimeMs
    };
    return {
      ...payload,
      args: deltalog === undefined
        ? [matchID, stateWithTimer]
        : [matchID, stateWithTimer, deltalog]
    };
  }

  if (payload?.type === "patch") {
    const args = payload.args ?? [];
    const prevStateID = args[1];
    const prevState = args[2];
    const stateWithTimer = {
      ...state,
      timerSnapshot,
      timerServerTimeMs: serverTimeMs
    };
    return {
      ...payload,
      args: [matchID, prevStateID, prevState, stateWithTimer]
    };
  }

  return payload;
};
```

**Step 2: Run tests to confirm pass**

Run: `pnpm vitest server/__tests__/timerPubSub.test.js`
Expected: PASS

**Step 3: Commit**

```bash
git add server/timers/timerPubSub.js
git commit -m "feat: attach timer snapshots to updates"
```

### Task 3: Use server snapshot + one-time seed on the client

**Files:**
- Modify: `app/catana/GameScreen.js`

**Step 1: Sync snapshot from state updates**

```js
const [timerSnapshot, setTimerSnapshot] = useState(null);
const [nowMs, setNowMs] = useState(Date.now());

useEffect(() => {
  if (!bgioProps.timerSnapshot) {
    setTimerSnapshot(null);
    return;
  }
  const receivedAtMs = Date.now();
  const delayMs = bgioProps.timerServerTimeMs
    ? Math.max(0, receivedAtMs - bgioProps.timerServerTimeMs)
    : 0;
  setTimerSnapshot({
    ...bgioProps.timerSnapshot,
    receivedAtMs,
    serverDelayMs: delayMs
  });
}, [bgioProps.timerSnapshot, bgioProps.timerServerTimeMs]);
```

**Step 2: One-time seed fetch if snapshot missing**

```js
const [seeded, setSeeded] = useState(false);

useEffect(() => {
  if (!matchID || typeof window === "undefined") return;
  if (bgioProps.timerSnapshot || seeded) return;
  let cancelled = false;

  const fetchSeed = async () => {
    try {
      const baseUrl = `${window.location.protocol}//${window.location.hostname}:8000`;
      const url = `${baseUrl}/timer/${matchID}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (cancelled) return;
      if (!data?.timer) {
        setSeeded(true);
        return;
      }
      const receivedAtMs = Date.now();
      const delayMs = data.serverTimeMs
        ? Math.max(0, receivedAtMs - data.serverTimeMs)
        : 0;
      setTimerSnapshot({
        ...data.timer,
        receivedAtMs,
        serverDelayMs: delayMs
      });
      setSeeded(true);
    } catch (err) {
      // ignore errors
    }
  };

  fetchSeed();
  return () => {
    cancelled = true;
  };
}, [matchID, seeded, bgioProps.timerSnapshot]);
```

**Step 3: Compute displayed timer**

```js
const timerMs = timerSnapshot
  ? Math.max(
      0,
      timerSnapshot.remainingMs -
        (nowMs - timerSnapshot.receivedAtMs) -
        (timerSnapshot.serverDelayMs ?? 0)
    )
  : null;
```

**Step 4: Remove polling interval** (delete the `setInterval(fetchTimer, 2000)` and related effect).

**Step 5: Manual check**
- Launch UI, confirm timer displays and updates smoothly.
- Reload to verify seed fetch populates timer once before next server update.

**Step 6: Commit**

```bash
git add app/catana/GameScreen.js
git commit -m "feat: use timer snapshot updates"
```

### Task 4: Update agent docs for snapshot approach

**Files:**
- Modify: `docs/agent/NOTES.md`
- Modify: `docs/agent/PROGRESS.md`

**Step 1: Notes**
- Replace polling note with: `Timer UI uses timerSnapshot on state updates, with a one-time /timer/:matchID seed if needed.`

**Step 2: Progress**
- Keep `Added server timer snapshot endpoint and a bottom-right UI countdown pill.`

**Step 3: Commit**

```bash
git add docs/agent/NOTES.md docs/agent/PROGRESS.md
git commit -m "docs: update timer snapshot notes"
```

### Task 5: Verify

Run: `pnpm vitest server/__tests__/timerPubSub.test.js`
Expected: PASS

Optional: `pnpm vitest server/__tests__/TimerManager.test.js`
Expected: PASS
