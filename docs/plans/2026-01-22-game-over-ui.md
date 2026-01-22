# Game Over UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Surface game-over state in the UI with winner messaging, a log entry, and postgame entry-point actions.

**Architecture:** Detect game-over via `G.core.gameOver`/`ctx.gameover` in `GameScreen`, render a modal + overlay, and append a single `game:over` entry server-side via move helper. Keep log panel above the dim layer.

**Tech Stack:** React (Next), Tailwind CSS, boardgame.io, vitest (file-content tests).

---

### Task 1: Add game-over log formatting

**Files:**
- Modify: `app/catana/utils/gameText.js`
- Test: `app/catana/__tests__/gameText.test.js`

**Step 1: Write the failing test**
```js
it("formats game over entries", () => {
  const tokens = formatLogEntry({
    type: "game:over",
    actorId: "1",
    data: { winnerId: "1" }
  }, { "1": "Ada" });
  expect(tokens.map((t) => t.kind)).toContain("player");
  expect(tokens.some((t) => t.kind === "text" && t.text.includes("won"))).toBe(true);
});
```

**Step 2: Run test to verify it fails**
Run: `pnpm vitest app/catana/__tests__/gameText.test.js`
Expected: FAIL with missing formatting for `game:over`.

**Step 3: Write minimal implementation**
```js
case "game:over": {
  const winnerId = data.winnerId ?? actorId;
  if (winnerId != null && winnerId !== actorId) {
    tokens.push(playerToken(String(winnerId), nameMap));
  }
  tokens.push(textToken(" won the game"));
  break;
}
```

**Step 4: Run test to verify it passes**
Run: `pnpm vitest app/catana/__tests__/gameText.test.js`
Expected: PASS.

**Step 5: Commit**
```bash
git add app/catana/utils/gameText.js app/catana/__tests__/gameText.test.js
git commit -m "test: cover game over log formatting"
```

---

### Task 2: Append a single game-over log entry in moves

**Files:**
- Modify: `app/catana/Moves.js`
- Test: `app/catana/__tests__/Moves.gameLog.test.js`

**Step 1: Write the failing test**
```js
import { maybeLogGameOver } from "../Moves";

it("logs game over once", () => {
  const context = makeContext();
  context.G.core.gameOver = { winnerId: "0", reason: "victoryPoints" };
  maybeLogGameOver(context.G, context.ctx);
  expect(context.G.gameLog).toHaveLength(1);
  maybeLogGameOver(context.G, context.ctx);
  expect(context.G.gameLog).toHaveLength(1);
});
```

**Step 2: Run test to verify it fails**
Run: `pnpm vitest app/catana/__tests__/Moves.gameLog.test.js`
Expected: FAIL because helper does not exist.

**Step 3: Write minimal implementation**
```js
export const maybeLogGameOver = (G, ctx) => {
  if (!G?.core?.gameOver || G.gameOverLogged) return;
  const { winnerId, reason } = G.core.gameOver;
  appendGameLog(G, ctx, {
    type: "game:over",
    actorId: winnerId ?? "system",
    data: { winnerId, reason }
  });
  G.gameOverLogged = true;
};
```

Call `maybeLogGameOver(G, ctx)` at the end of moves that can end the game:
- `placeSettlement`, `placeRoad`, `placeCity`
- `buyDevCard`, `playDevCardStart` (knight path)
- `placeRoadFromDevCard`

**Step 4: Run test to verify it passes**
Run: `pnpm vitest app/catana/__tests__/Moves.gameLog.test.js`
Expected: PASS.

**Step 5: Commit**
```bash
git add app/catana/Moves.js app/catana/__tests__/Moves.gameLog.test.js
git commit -m "feat: log game over once" 
```

---

### Task 3: Add game-over UI components (modal + postgame overlay)

**Files:**
- Create: `app/catana/components/GameOverModal.js`
- Create: `app/catana/components/PostgameOverlay.js`
- Create: `app/catana/components/GameOverOverlay.js`
- Test: `app/catana/__tests__/GameOverModal.test.js`

**Step 1: Write the failing test**
```js
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const componentPath = path.resolve(__dirname, "..", "components", "GameOverModal.js");

describe("GameOverModal", () => {
  it("includes core CTA labels", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("View Postgame");
    expect(contents).toContain("Return to Lobby");
  });
});
```

**Step 2: Run test to verify it fails**
Run: `pnpm vitest app/catana/__tests__/GameOverModal.test.js`
Expected: FAIL because file does not exist.

**Step 3: Write minimal implementation**
Create a modal with winner text, VP summary, a scoreboard list, and buttons.
```js
export function GameOverModal({ title, subtitle, scoreboard, onViewPostgame, onRematch, onLobby, onClose }) {
  return (
    <div className="w-full max-w-xl rounded-2xl bg-white/90 p-6 shadow-2xl ring-1 ring-white/60 backdrop-blur-md">
      <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Game Over</div>
      <div className="mt-2 text-3xl font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-600">{subtitle}</div>
      <div className="mt-4 rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-200">
        {scoreboard.map((row) => (
          <div key={row.id} className="flex items-center justify-between text-sm text-slate-700">
            <span className="font-medium">{row.name}</span>
            <span className="tabular-nums">{row.vp} VP</span>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={onViewPostgame}>View Postgame</button>
        <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700" onClick={onRematch} disabled>Rematch</button>
        <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700" onClick={onLobby}>Return to Lobby</button>
        <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**
Run: `pnpm vitest app/catana/__tests__/GameOverModal.test.js`
Expected: PASS.

**Step 5: Commit**
```bash
git add app/catana/components/GameOverModal.js app/catana/components/GameOverOverlay.js app/catana/components/PostgameOverlay.js app/catana/__tests__/GameOverModal.test.js
git commit -m "feat: add game over modal components"
```

---

### Task 4: Wire game-over UI into GameScreen and effects

**Files:**
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/effects/GameEffects.js`
- Modify: `app/catana/effects/soundThemes.js`
- Test: `app/catana/__tests__/GameScreen.gameOver.test.js`

**Step 1: Write the failing test**
```js
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const screenPath = path.resolve(__dirname, "..", "GameScreen.js");

describe("GameScreen game over", () => {
  it("checks for game over state", () => {
    const contents = fs.readFileSync(screenPath, "utf8");
    expect(contents).toContain("core.gameOver");
    expect(contents).toContain("GameOver");
  });
});
```

**Step 2: Run test to verify it fails**
Run: `pnpm vitest app/catana/__tests__/GameScreen.gameOver.test.js`
Expected: FAIL because GameOver wiring is missing.

**Step 3: Write minimal implementation**
- Compute `const gameOverState = bgioProps.ctx?.gameover ?? core?.gameOver;`
- Track `showGameOverModal` and `showPostgame` in local state; open modal on first transition.
- Disable roll/end, keyboard shortcuts, and other modals when gameOver.
- Render `<GameOverOverlay>` with `GameOverModal` and optional `PostgameOverlay`.
- Pass `gameOverState` and `isWinner` to `<GameEffects>` to emit `game:win`/`game:lose` cue.
- Add optional cues to `soundThemes` (can reuse existing audio or leave as placeholders).

**Step 4: Run test to verify it passes**
Run: `pnpm vitest app/catana/__tests__/GameScreen.gameOver.test.js`
Expected: PASS.

**Step 5: Commit**
```bash
git add app/catana/GameScreen.js app/catana/effects/GameEffects.js app/catana/effects/soundThemes.js app/catana/__tests__/GameScreen.gameOver.test.js
git commit -m "feat: show game over modal and cues"
```

---

### Task 5: Guard `ctx.activePlayers` access in Board

**Files:**
- Modify: `app/catana/Board.js`
- Test: `app/catana/__tests__/Board.activePlayers.test.js`

**Step 1: Write the failing test**
```js
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const boardPath = path.resolve(__dirname, "..", "Board.js");

describe("Board activePlayers guards", () => {
  it("guards activePlayers before Object.entries", () => {
    const contents = fs.readFileSync(boardPath, "utf8");
    expect(contents).toMatch(/Object\.entries\(ctx\.activePlayers \?\? \{\}\)/);
  });
});
```

**Step 2: Run test to verify it fails**
Run: `pnpm vitest app/catana/__tests__/Board.activePlayers.test.js`
Expected: FAIL before guard is added.

**Step 3: Write minimal implementation**
```js
if (Object.entries(ctx.activePlayers ?? {}).flat().includes("settlement")) {
  // existing logic
}
```

**Step 4: Run test to verify it passes**
Run: `pnpm vitest app/catana/__tests__/Board.activePlayers.test.js`
Expected: PASS.

**Step 5: Commit**
```bash
git add app/catana/Board.js app/catana/__tests__/Board.activePlayers.test.js
git commit -m "fix: guard activePlayers in board"
```

---

### Task 6: Update agent docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Add entry**
- PROGRESS: note game-over modal/log/cue wiring added.
- NOTES: record follow-ups (postgame stats/replay, audio assets, winner animations).

**Step 2: Commit**
```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: update agent notes for game over ui"
```

---

### Final verification
Run: `pnpm vitest app/catana/__tests__/gameText.test.js app/catana/__tests__/Moves.gameLog.test.js app/catana/__tests__/GameOverModal.test.js app/catana/__tests__/GameScreen.gameOver.test.js app/catana/__tests__/Board.activePlayers.test.js`
Expected: PASS.

