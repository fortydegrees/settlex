# Game Log + UI Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a public, server-authoritative game log with structured entries, a left-side scrollable log panel, and shared text templates for status + log formatting.

**Architecture:** Moves append public-safe log entries into `G.gameLog` via a small helper. UI renders entries with tokenized templates from a single `gameText.js` file, using resource SVG icons and display names from `matchData`.

**Tech Stack:** boardgame.io, React (Next), Tailwind classes, Vitest.

---

### Task 1: Add log helper + tests

**Files:**
- Create: `app/catana/utils/gameLog.js`
- Test: `app/catana/__tests__/gameLog.test.js`

**Step 1: Write the failing test**

```js
import { describe, expect, it } from "vitest";
import { appendGameLog } from "../utils/gameLog";

describe("appendGameLog", () => {
  it("stamps id/turn/phase and appends", () => {
    const G = { gameLog: [], gameLogSeq: 0 };
    const ctx = { turn: 3, phase: "main" };
    appendGameLog(G, ctx, { type: "roll", actorId: "0", data: { total: 7 } });
    expect(G.gameLog).toHaveLength(1);
    expect(G.gameLog[0]).toMatchObject({
      id: 1,
      turn: 3,
      phase: "main",
      type: "roll",
      actorId: "0",
      data: { total: 7 }
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- --run app/catana/__tests__/gameLog.test.js`
Expected: FAIL (appendGameLog missing)

**Step 3: Write minimal implementation**

```js
export function appendGameLog(G, ctx, entry) {
  if (!G.gameLog) G.gameLog = [];
  const nextId = (G.gameLogSeq ?? 0) + 1;
  G.gameLogSeq = nextId;
  G.gameLog.push({
    id: nextId,
    turn: ctx?.turn ?? null,
    phase: ctx?.phase ?? null,
    ...entry
  });
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- --run app/catana/__tests__/gameLog.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add app/catana/utils/gameLog.js app/catana/__tests__/gameLog.test.js
git commit -m "feat: add game log helper"
```

---

### Task 2: Add shared text templates + formatter tokens

**Files:**
- Create: `app/catana/utils/gameText.js`
- Modify: `app/catana/utils/gameStatus.js`
- Test: `app/catana/__tests__/gameText.test.js`

**Step 1: Write the failing test**

```js
import { describe, expect, it } from "vitest";
import { formatLogEntry, STATUS_TEXT } from "../utils/gameText";

describe("formatLogEntry", () => {
  it("returns player + resource tokens", () => {
    const entry = { type: "discard", actorId: "1", data: { resources: { Ore: 2, Wheat: 1 } } };
    const tokens = formatLogEntry(entry, { "1": "Bren" });
    expect(tokens[0]).toMatchObject({ kind: "player", id: "1", name: "Bren" });
    expect(tokens.some((t) => t.kind === "resource" && t.resource === "Ore" && t.count === 2)).toBe(true);
  });
});

describe("STATUS_TEXT", () => {
  it("contains Roll Dice copy", () => {
    expect(STATUS_TEXT.ROLLING).toBe("Roll Dice");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- --run app/catana/__tests__/gameText.test.js`
Expected: FAIL (module missing)

**Step 3: Write minimal implementation**

Create `gameText.js` with:
- `STATUS_TEXT` map
- `formatLogEntry(entry, nameMap)` returning token arrays
- helpers to build `player` + `resource` tokens
- add a `divider` token for `type === "turn:end"` or when `data.divider` is true

Update `gameStatus.js` to use `STATUS_TEXT` values instead of hard-coded strings.

**Step 4: Run test to verify it passes**

Run: `pnpm test -- --run app/catana/__tests__/gameText.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add app/catana/utils/gameText.js app/catana/utils/gameStatus.js app/catana/__tests__/gameText.test.js
git commit -m "feat: centralize status/log text templates"
```

---

### Task 3: Initialize log in setup

**Files:**
- Modify: `app/catana/Game.js`
- Test: `app/catana/__tests__/Game.logInit.test.js`

**Step 1: Write the failing test**

```js
import { describe, expect, it } from "vitest";
import { Catan } from "../Game";

describe("Catan setup", () => {
  it("initializes gameLog and gameLogSeq", () => {
    const G = Catan.setup({ ctx: { numPlayers: 2, phase: "placement" }, random: { Number: () => 0.5, Shuffle: (a) => a } });
    expect(G.gameLog).toEqual([]);
    expect(G.gameLogSeq).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- --run app/catana/__tests__/Game.logInit.test.js`
Expected: FAIL

**Step 3: Implement**

Add `gameLog: []` and `gameLogSeq: 0` to the `setup` return in `app/catana/Game.js`.

**Step 4: Run test**

Run: `pnpm test -- --run app/catana/__tests__/Game.logInit.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add app/catana/Game.js app/catana/__tests__/Game.logInit.test.js
git commit -m "feat: init game log state"
```

---

### Task 4: Add log entries to Moves (core events + auto timeouts)

**Files:**
- Modify: `app/catana/Moves.js`
- Test: `app/catana/__tests__/Moves.gameLog.test.js`

**Step 1: Write failing tests**

Cover at least:
- dev buy is redacted (no dev type)
- autoDiscard emits forced system entry + discard entry

```js
import { describe, expect, it } from "vitest";
import { buyDevCard, autoDiscard } from "../Moves";

const makeContext = () => ({
  G: { gameLog: [], gameLogSeq: 0, core: { /* minimal */ } },
  ctx: { turn: 1, phase: "main", currentPlayer: "0" },
  playerID: "0",
  random: { Shuffle: (a) => a, Number: () => 0.5 },
  events: { endStage: () => {}, setActivePlayers: () => {} },
  log: { setMetadata: () => {} }
});

describe("game log moves", () => {
  it("redacts dev card buy", () => {
    const context = makeContext();
    buyDevCard.move(context);
    const entry = context.G.gameLog[0];
    expect(entry.type).toBe("dev:buy");
    expect(entry.data?.cardType).toBeUndefined();
  });

  it("autoDiscard prepends forced entry", () => {
    const context = makeContext();
    // set up player resources so discard happens
    autoDiscard.move(context);
    expect(context.G.gameLog[0].type).toBe("forced:discardSelection");
    expect(context.G.gameLog[1].type).toBe("discard");
    expect(context.G.gameLog[1].forced).toBe(true);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test -- --run app/catana/__tests__/Moves.gameLog.test.js`
Expected: FAIL

**Step 3: Implement logging**

- Import `appendGameLog`.
- After successful `apply*` results, append log entries with public-safe data.
- Add forced/system entries in `auto*` moves.
- Add resource distribution entries (public OK) for roll results.
- Ensure dev card buys, robber steals, and other secrets are redacted.

**Step 4: Run tests**

Run: `pnpm test -- --run app/catana/__tests__/Moves.gameLog.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add app/catana/Moves.js app/catana/__tests__/Moves.gameLog.test.js
git commit -m "feat: append game log entries in moves"
```

---

### Task 5: Add log panel component + rendering tokens

**Files:**
- Create: `app/catana/components/GameLogPanel.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/game/types.js` (if needed for SVG exports)
- Test: `app/catana/__tests__/GameLogPanel.test.js`

**Step 1: Write failing test**

```js
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GameLogPanel } from "../components/GameLogPanel";

it("renders a log entry with player name", () => {
  const entries = [{ id: 1, type: "roll", actorId: "0", data: { total: 7 } }];
  render(<GameLogPanel entries={entries} nameMap={{ "0": "Bren" }} />);
  expect(screen.getByText(/Bren/)).toBeTruthy();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- --run app/catana/__tests__/GameLogPanel.test.js`
Expected: FAIL

**Step 3: Implement**

- `GameLogPanel` renders a fixed left panel with scrollable content.
- Uses `formatLogEntry` to get tokens and renders:
  - player token → name
  - resource token → use `RESOURCE_ICON_SVGS` + count
  - divider token → `<hr>`
- Add `data-allow-interaction="true"` and `select-text` so it can scroll/copy.
- In `GameScreen`, build `nameMap` from `bgioProps.matchData` (fallback `Player {id}`), and pass `G.gameLog`.

**Step 4: Run test**

Run: `pnpm test -- --run app/catana/__tests__/GameLogPanel.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add app/catana/components/GameLogPanel.js app/catana/GameScreen.js app/catana/__tests__/GameLogPanel.test.js
git commit -m "feat: add game log UI panel"
```

---

### Task 6: Full verify

**Step 1: Run**

Run: `pnpm verify`
Expected: PASS (lint warnings OK as baseline)

**Step 2: Commit cleanup (if any)**

```bash
git status -sb
```

---

Plan complete and saved to `docs/plans/2026-01-19-game-log-implementation-plan.md`.

Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session in worktree with executing-plans, batch execution with checkpoints

Which approach?
