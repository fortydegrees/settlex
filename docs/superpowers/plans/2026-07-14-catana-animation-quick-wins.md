# Catana Animation Quick Wins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove two sources of unnecessary continuous HUD rendering work without changing the perceived active-player pulse or dock behaviour.

**Architecture:** Keep the active-player ring on its existing avatar element and move the glow onto a pseudo-element with a statically painted shadow. Animate only that layer's `transform` and `opacity`, and remove the dock's persistent content invalidation hint. Protect both decisions with a narrow source-level regression test.

**Tech Stack:** React, CSS, Vitest, Playwright CLI, Catana dev sandbox.

## Global Constraints

- Preserve the active-avatar white ring, two-second pulse rhythm, and reduced-motion behaviour.
- Do not modify the left meta rail, award, counter, dice, timer, mobile inventory, or board-transform paths.
- Add no dependencies and change no game rules or state flow.
- Keep the diff isolated from unrelated dirty-worktree changes.

---

### Task 1: Add failing HUD motion performance guards

**Files:**
- Create: `app/catana/__tests__/HudMotionPerformance.source.test.js`

**Interfaces:**
- Consumes: CSS source files under `app/catana/components/`.
- Produces: regression checks for compositor-only avatar keyframes and removal of `will-change: contents`.

- [ ] **Step 1: Write the failing source-level tests**

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readCatanaFile = (relativePath) =>
  fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");

const extractCssBlock = (contents, marker) => {
  const markerIndex = contents.indexOf(marker);
  if (markerIndex < 0) return "";

  const openingBraceIndex = contents.indexOf("{", markerIndex);
  if (openingBraceIndex < 0) return "";

  let depth = 0;
  for (let index = openingBraceIndex; index < contents.length; index += 1) {
    if (contents[index] === "{") depth += 1;
    if (contents[index] === "}") depth -= 1;
    if (depth === 0) return contents.slice(markerIndex, index + 1);
  }

  return "";
};

describe("Catana HUD motion performance", () => {
  it("keeps the active-avatar pulse on compositor-friendly properties", () => {
    const contents = readCatanaFile("components/PlayerAvatarStats.css");
    const keyframes = extractCssBlock(
      contents,
      "@keyframes avatar-active-glow-pulse"
    );
    const glowLayer = extractCssBlock(
      contents,
      ".avatar-active-glow::before"
    );

    expect(keyframes).not.toBe("");
    expect(keyframes).toContain("transform:");
    expect(keyframes).toContain("opacity:");
    expect(keyframes).not.toMatch(
      /(?:box-shadow|text-shadow|filter|width|height|top|left|margin|padding)\s*:/
    );
    expect(glowLayer).toContain("box-shadow:");
    expect(glowLayer).toContain("will-change: transform, opacity");
  });

  it("does not permanently invalidate the action dock contents", () => {
    const contents = readCatanaFile("components/ActionsDock/dockStyles.css");

    expect(contents).not.toContain("will-change: contents");
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/HudMotionPerformance.source.test.js --exclude '.worktrees/**'
```

Expected: two assertion failures because the new avatar keyframe/pseudo-element do not exist and the dock still contains `will-change: contents`.

---

### Task 2: Make the two continuous HUD paths cheaper

**Files:**
- Modify: `app/catana/components/PlayerAvatarStats.css:1-18,52-59`
- Modify: `app/catana/components/ActionsDock/dockStyles.css:1-20`
- Test: `app/catana/__tests__/HudMotionPerformance.source.test.js`

**Interfaces:**
- Consumes: the existing `.avatar-active-glow` class applied by `PlayerAvatarStats.js`.
- Produces: the same active-player cue with compositor-only keyframes and unchanged dock layout.

- [ ] **Step 1: Replace the animated avatar shadow with a static glow layer**

Replace the existing `pulse-glow` keyframes and `.avatar-active-glow` animation with:

```css
@keyframes avatar-active-glow-pulse {
  0%, 100% {
    opacity: 0.7;
    transform: scale(0.88);
  }

  50% {
    opacity: 1;
    transform: scale(1);
  }
}

.avatar-active-glow {
  box-shadow: 0 0 0 4px white;
}

.avatar-active-glow::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow: 0 0 20px 8px rgba(255, 255, 255, 0.85);
  opacity: 0.7;
  transform: scale(0.88);
  transform-origin: center;
  animation: avatar-active-glow-pulse 2s ease-in-out infinite;
  will-change: transform, opacity;
}
```

Change the reduced-motion rule to target `.avatar-active-glow::before`, disable its animation, and hide the glow layer so the static white ring remains the active-player cue.

- [ ] **Step 2: Remove the dock content invalidation hint**

Delete this declaration and make no other dock-style changes:

```css
will-change: contents;
```

- [ ] **Step 3: Run the focused test and verify GREEN**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/HudMotionPerformance.source.test.js --exclude '.worktrees/**'
```

Expected: 2 tests pass, 0 fail.

- [ ] **Step 4: Run focused static checks**

Run:

```bash
pnpm exec eslint app/catana/__tests__/HudMotionPerformance.source.test.js
git diff --check -- app/catana/components/PlayerAvatarStats.css app/catana/components/ActionsDock/dockStyles.css app/catana/__tests__/HudMotionPerformance.source.test.js
```

Expected: both commands exit 0.

---

### Task 3: Verify the real HUD and record the result

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Interfaces:**
- Consumes: `/catana/dev/sandbox` at the canonical desktop and mobile viewports.
- Produces: browser evidence that the visual cue and dock behaviour remain intact.

- [ ] **Step 1: Verify Playwright CLI prerequisites and open the sandbox**

Run:

```bash
command -v npx >/dev/null 2>&1
export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
export PWCLI="$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh"
"$PWCLI" --session catana-motion open 'http://127.0.0.1:3000/catana/dev/sandbox?viewportWall=1' --headed
"$PWCLI" --session catana-motion snapshot
```

If port 3000 is not serving the sandbox, start `pnpm dev:log`, wait for readiness, and repeat.

- [ ] **Step 2: Verify desktop at 1440x900**

Run:

```bash
"$PWCLI" --session catana-motion resize 1440 900
"$PWCLI" --session catana-motion screenshot
```

Inspect the screenshot and live page: active avatar ring/glow present, no clipping or content obstruction, dock layout intact, and hover/press motion unchanged.

- [ ] **Step 3: Verify mobile at 390x844**

Run:

```bash
"$PWCLI" --session catana-motion resize 390 844
"$PWCLI" --session catana-motion screenshot
```

Inspect the screenshot and live page: active player indication remains present and the mobile dock/inventory layout is intact.

- [ ] **Step 4: Verify runtime animation properties**

Run:

```bash
"$PWCLI" --session catana-motion eval "Array.from(document.querySelector('.avatar-active-glow')?.getAnimations({ subtree: true }) ?? []).map((animation) => animation.effect.getKeyframes().map((frame) => Object.keys(frame)))"
```

Expected: the active-avatar animation keyframes expose only `transform`, `opacity`, `offset`, `easing`, `computedOffset`, and `composite` metadata—never `boxShadow` or `filter`.

- [ ] **Step 5: Record the meaningful change**

Append concise entries to `docs/agent/PROGRESS.md` and `docs/agent/NOTES.md` describing the compositor-only avatar pulse, dock hint removal, focused test output, and desktop/mobile sandbox result. Preserve all existing dirty-file content.

- [ ] **Step 6: Run final verification**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/HudMotionPerformance.source.test.js --exclude '.worktrees/**'
pnpm exec eslint app/catana/__tests__/HudMotionPerformance.source.test.js
git diff --check
```

Expected: 2 tests pass, ESLint exits 0, and `git diff --check` exits 0.
