# Game Over Results Pill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a persistent top-right “Results” pill so players can reopen the game-over modal after closing it.

**Architecture:** Introduce a small reusable glass-style pill button component and render it conditionally in `GameScreen` when the game is over and no overlays are open. Clicking it reopens the game-over modal.

**Tech Stack:** React, Next.js, TailwindCSS, Vitest.

---

### Task 1: Add failing test for the Results pill

**Files:**
- Modify: `app/catana/__tests__/GameScreen.gameOver.test.js`

**Step 1: Write the failing test**

```js
// app/catana/__tests__/GameScreen.gameOver.test.js
expect(contents).toContain("Results");
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest app/catana/__tests__/GameScreen.gameOver.test.js`
Expected: FAIL with “Results” not found in `GameScreen.js`.

**Step 3: Commit**

```bash
git add app/catana/__tests__/GameScreen.gameOver.test.js
git commit -m "test: require results pill in game over screen"
```

---

### Task 2: Add reusable glass pill button and render it in GameScreen

**Files:**
- Create: `app/catana/components/GlassPillButton.js`
- Modify: `app/catana/GameScreen.js`

**Step 1: Write minimal component**

```js
// app/catana/components/GlassPillButton.js
import React from "react";

export function GlassPillButton({ className = "", children, ...props }) {
  return (
    <button
      type="button"
      className={`flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg ring-1 ring-white/60 backdrop-blur-sm transition hover:bg-white/85 hover:scale-[1.02] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

**Step 2: Wire Results pill into GameScreen**

```js
// app/catana/GameScreen.js
import { GlassPillButton } from "./components/GlassPillButton";

const showResultsButton = isGameOver && !showGameOverModal && !showPostgame;

{showResultsButton && (
  <GlassPillButton
    className="fixed right-4 top-4 z-40"
    onClick={() => setShowGameOverModal(true)}
    aria-label="Open game results"
    data-allow-interaction="true"
  >
    <span aria-hidden="true">🏆</span>
    <span>Results</span>
  </GlassPillButton>
)}
```

**Step 3: Run test to verify it passes**

Run: `pnpm vitest app/catana/__tests__/GameScreen.gameOver.test.js`
Expected: PASS.

**Step 4: Commit**

```bash
git add app/catana/components/GlassPillButton.js app/catana/GameScreen.js
git commit -m "feat: add results pill to reopen game over modal"
```

---

### Task 3: Update agent docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Add brief status entries**

```md
- Added a reusable glass pill button and a top-right Results pill to reopen the game-over modal.
```

**Step 2: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: note results pill for game over"
```
```
