# Puffer Bot Adapter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow a human to play against a trained Puffer policy in existing Settlex matches without changing `game-core`.

**Architecture:** Add a server-side bot loop that watches match state, converts current `G/ctx` into the RL observation/action-mask format, asks a lightweight Python inference worker for an action, then dispatches the mapped boardgame move. Keep existing timeout auto-moves as fallback.

**Tech Stack:** `boardgame.io` server, Node child-process JSONL bridge, Python/Torch policy inference, existing `ai/pufferlib/js/settlexEnv.cjs` action schema.

### Task 1: Add failing tests for server dispatch/timers bot plumbing

**Files:**
- Modify: `server/__tests__/dispatchUtils.test.js`
- Modify: `server/__tests__/TimerManager.test.js`
- Modify: `server/timers/dispatchUtils.js`

**Step 1: Write failing tests**
- Assert `buildAutoMoveAction` preserves `args` when provided.
- Assert timer manager schedules fast bot dispatch (`autoBot`) for a bot-controlled active stage.
- Assert bot scheduling can trigger again for a new `state._stateID` even if stage/turn is unchanged.

**Step 2: Run tests to verify RED**
- Run: `pnpm exec vitest run server/__tests__/dispatchUtils.test.js server/__tests__/TimerManager.test.js`
- Expected: failures for missing args and missing bot scheduling behavior.

**Step 3: Minimal implementation**
- Extend `buildAutoMoveAction` to accept optional `args`.
- Extend `TimerManager` with optional bot detection callback and bot delay scheduling.

**Step 4: Run tests to verify GREEN**
- Re-run targeted tests and ensure pass.

### Task 2: Add state/action adapter from match state to RL action space

**Files:**
- Create: `server/bots/pufferStateAdapter.js`
- Create: `server/__tests__/pufferStateAdapter.test.js`

**Step 1: Write failing tests**
- Build a minimal generated state and assert adapter outputs observation + mask.
- Assert mapped actions convert to expected boardgame moves (`placeSettlement`, `placeRoadFromDevCard`, `confirmDevCardPlay`, etc.).

**Step 2: Run tests to verify RED**
- Run: `pnpm exec vitest run server/__tests__/pufferStateAdapter.test.js`
- Expected: module/functions missing.

**Step 3: Minimal implementation**
- Hydrate a `SettlexSelfPlayEnv` from live match `G/ctx`.
- Reuse env internals for legal mask and action decode.
- Map decoded actions to boardgame move payloads.

**Step 4: Run tests to verify GREEN**
- Re-run targeted adapter test.

### Task 3: Add Python inference worker + Node client

**Files:**
- Create: `ai/pufferlib/python/settlex_puffer/infer_server.py`
- Create: `server/bots/PufferPolicyClient.js`
- Modify: `ai/pufferlib/python/pyproject.toml`

**Step 1: Write failing tests**
- Add unit tests for Node client protocol parsing and request/response correlation using a mocked child process.

**Step 2: Run tests to verify RED**
- Run targeted tests; expected failures before client implementation.

**Step 3: Minimal implementation**
- Python worker: load checkpoint once, read JSONL observations, return action id.
- Node client: spawn worker, send requests, parse JSONL responses, surface errors.

**Step 4: Run tests to verify GREEN**
- Re-run targeted tests.

### Task 4: Integrate bot dispatch into server runtime

**Files:**
- Modify: `server/server.js`
- Create: `server/bots/pufferBotManager.js`

**Step 1: Write failing test(s)**
- Add focused tests for bot-seat detection and fallback behavior in manager helpers.

**Step 2: Run tests to verify RED**
- Run targeted tests and capture failures.

**Step 3: Minimal implementation**
- In dispatch path, if target seat is bot and stage is bot-controllable, request policy action and dispatch mapped moves.
- Fallback to existing timer auto-move if inference unavailable/error.

**Step 4: Run tests to verify GREEN**
- Re-run server tests.

### Task 5: Add simple UI control to fill open seats with bots

**Files:**
- Modify: `app/catana/lobby/[matchID]/MatchPageClient.js`
- Add/modify tests only if existing coverage pattern is lightweight.

**Step 1: Write failing test or static source assertion**
- Verify a “Fill with Bots” control exists.

**Step 2: Run test to verify RED**
- Run targeted test.

**Step 3: Minimal implementation**
- Add button that joins open seats with `data.bot = "puffer"` and bot names.

**Step 4: Run tests to verify GREEN**
- Re-run targeted UI test(s).

### Task 6: Verify + document

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`
- Modify: `ai/pufferlib/README.md`

**Step 1: Run verification commands**
- `pnpm exec vitest run server/__tests__/dispatchUtils.test.js server/__tests__/TimerManager.test.js server/__tests__/pufferStateAdapter.test.js`
- `pnpm exec vitest run ai/pufferlib/js/__tests__/settlexEnv.test.js ai/pufferlib/js/__tests__/engineHost.test.js ai/pufferlib/js/__tests__/settlexEnv.devCards.test.js`

**Step 2: Document outcomes**
- Update progress + notes with bot adapter details, env vars, and known limitations.

