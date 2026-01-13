# Interaction Guards Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Disable text selection and right-clicks on the main game UI while allowing explicit opt-in areas for future log/chat/status components.

**Architecture:** Add a root-level `select-none` class and a root `onContextMenu` guard in `GameScreen`, with an opt-in `data-allow-interaction="true"` selector for exceptions. Update agent docs to record the opt-in pattern.

**Tech Stack:** React (Next.js), Tailwind CSS, Vitest.

---

### Task 1: Add a failing test for interaction guards

**Files:**
- Create: `app/catana/__tests__/GameScreen.interactionGuards.test.js`

**Step 1: Write the failing test**

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenPath = path.resolve(__dirname, "..", "GameScreen.js");

describe("GameScreen interaction guards", () => {
  it("adds a select-none class to the root container", () => {
    const contents = fs.readFileSync(screenPath, "utf8");
    expect(contents).toMatch(/select-none/);
  });

  it("guards context menu unless opt-in attribute is present", () => {
    const contents = fs.readFileSync(screenPath, "utf8");
    expect(contents).toMatch(/data-allow-interaction/);
    expect(contents).toMatch(/onContextMenu/);
  });
});
```

**Step 2: Run the test to verify it fails**

Run: `pnpm vitest app/catana/__tests__/GameScreen.interactionGuards.test.js`
Expected: FAIL (no `select-none` and no context menu guard yet).

**Step 3: Commit**

```bash
git add app/catana/__tests__/GameScreen.interactionGuards.test.js
git commit -m "test: cover interaction guards"
```

---

### Task 2: Add root interaction guards in GameScreen

**Files:**
- Modify: `app/catana/GameScreen.js`

**Step 1: Implement selection guard**

- Add `select-none` to the root `div` className.

**Step 2: Implement context-menu guard**

Add a handler like:

```js
const allowInteractionSelector = '[data-allow-interaction="true"]';
const handleContextMenu = (event) => {
  if (event?.target?.closest?.(allowInteractionSelector)) return;
  event.preventDefault();
};
```

- Wire `onContextMenu={handleContextMenu}` on the root `div`.
- Add a short inline comment documenting the opt-in attribute for future log/chat/status components.

**Step 3: Run the test to verify it passes**

Run: `pnpm vitest app/catana/__tests__/GameScreen.interactionGuards.test.js`
Expected: PASS.

**Step 4: Commit**

```bash
git add app/catana/GameScreen.js
git commit -m "feat: add interaction guards"
```

---

### Task 3: Document the opt-in pattern

**Files:**
- Modify: `docs/agent/NOTES.md`
- Modify: `docs/agent/PROGRESS.md`
- Add: `docs/plans/2026-01-13-interaction-guards-design.md`

**Step 1: Update docs**

- Add a bullet to `docs/agent/NOTES.md` describing `data-allow-interaction="true"` + `select-text` for log/chat/status.
- Add a brief status note to `docs/agent/PROGRESS.md` describing the interaction guards.

**Step 2: Run a quick lint pass (optional)**

Run: `pnpm lint`
Expected: existing warnings only.

**Step 3: Commit**

```bash
git add docs/agent/NOTES.md docs/agent/PROGRESS.md docs/plans/2026-01-13-interaction-guards-design.md
git commit -m "docs: note interaction guard opt-in"
```
