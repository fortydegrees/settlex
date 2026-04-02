# Chat Panel Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a presentational in-match chat panel beneath the existing game log, matching the log's styling and player highlighting while leaving real chat transport for a later slice.

**Architecture:** Introduce a shared feed-panel shell for Catana meta feeds, then make both the game log and the new chat panel thin adapters over that shell. Mount both feeds inside a single fixed left rail so the bottom-left layout is owned in one place, and move the dev-only debug panel into that same rail so its placement stays correct after the stack grows from one panel to two.

**Tech Stack:** Next.js, React, Tailwind utility classes, existing Catana theme helpers, Vitest, agent docs

---

## File Map

**Shared feed UI**
- Create: `app/catana/components/FeedPanel.js`
- Create: `app/catana/components/FeedTokenRow.js`
- Modify: `app/globals.css`

**Game log + chat**
- Create: `app/catana/components/ChatPanel.js`
- Create: `app/catana/utils/chatPreview.js`
- Modify: `app/catana/components/GameLogPanel.js`
- Modify: `app/catana/utils/gameText.js`

**Left rail integration**
- Create: `app/catana/components/LeftMetaRail.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/components/DebugPanel.js`

**Tests**
- Create: `app/catana/__tests__/FeedPanel.test.js`
- Create: `app/catana/__tests__/ChatPanel.test.js`
- Create: `app/catana/__tests__/chatPreview.test.js`
- Create: `app/catana/__tests__/LeftMetaRail.test.js`
- Modify: `app/catana/__tests__/GameLogPanel.test.js`
- Modify: `app/catana/__tests__/gameText.test.js`
- Modify: `app/catana/__tests__/DebugUiVisibility.test.js`
- Modify: `app/catana/__tests__/renderPerfGuards.test.js`
- Modify: `app/catana/__tests__/uiNoDragImages.test.js`

**Docs**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

## Assumptions To Keep During Implementation

- Follow `@superpowers:test-driven-development` task by task. Do not write runtime code before the relevant failing tests are in place.
- Keep Catana meta UI aligned with `@docs/agent/skills/catana-brand/SKILL.md`: light glass panels, uppercase slate headers, no dark-theme drift.
- This slice is still presentational only. Do not wire boardgame.io chat transport, persistence, unread state, or moderation behavior.
- Make the chat panel visibly non-live in this pass by disabling the composer and labeling the transcript as a preview or "coming soon" state.
- Keep the future minimize / resize seam clean by centralizing fixed-position layout in the new left rail rather than scattering more bottom-offset math across components.

### Task 1: Lock the shared feed-shell contract with tests

**Files:**
- Create: `app/catana/__tests__/FeedPanel.test.js`
- Modify: `app/catana/__tests__/uiNoDragImages.test.js`
- Modify: `app/catana/__tests__/renderPerfGuards.test.js`
- Modify: `app/globals.css`

- [ ] **Step 1: Write the failing shared-shell source tests**

Add `app/catana/__tests__/FeedPanel.test.js` assertions that the new shell:
- renders a header label,
- keeps `data-allow-interaction="true"`,
- uses generic feed classes such as `feed-panel-scroll`, `feed-panel-fade`, and `feed-panel-entry`,
- keeps the hover-pause + delayed auto-scroll resume logic.

- [ ] **Step 2: Update the image-drag regression to point at the shared token renderer**

Change `app/catana/__tests__/uiNoDragImages.test.js` so the feed-icon drag guard expects `draggable={false}` in `app/catana/components/FeedTokenRow.js` rather than in `GameLogPanel.js`.

- [ ] **Step 3: Add the new perf guard expectations**

Extend `app/catana/__tests__/renderPerfGuards.test.js` to assert:
- `FeedPanel.js` uses memoized/controlled scroll behavior rather than per-render recomputation,
- `ChatPanel.js` is wrapped in `React.memo`,
- `GameLogPanel.js` remains memoized and still formats entries through `useMemo`.

- [ ] **Step 4: Run the targeted tests to verify they fail**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/FeedPanel.test.js app/catana/__tests__/uiNoDragImages.test.js app/catana/__tests__/renderPerfGuards.test.js
```

Expected:
- `FeedPanel.test.js` fails because `FeedPanel.js` does not exist yet,
- `uiNoDragImages.test.js` fails because `FeedTokenRow.js` does not exist yet,
- the new perf guard fails because `ChatPanel.js` does not exist yet.

- [ ] **Step 5: Implement the shared feed shell**

Create `app/catana/components/FeedPanel.js` with:
- the current glass meta-panel chrome from `GameLogPanel`,
- a configurable title,
- a scroll area with the existing hover-aware auto-scroll behavior,
- a `rows` render path or `children` slot for feed content,
- the interaction opt-in attribute on the panel root.

Also create `app/catana/components/FeedTokenRow.js` with shared rendering for:
- `divider` tokens,
- `player` tokens using `getPlayerNameHex(...)`,
- `resource` tokens using the existing theme icon helpers,
- plain text tokens.

- [ ] **Step 6: Generalize the feed CSS hooks**

In `app/globals.css`:
- add generic `feed-panel-scroll`, `feed-panel-fade`, and `feed-panel-entry` rules,
- either keep the existing `game-log-*` selectors as aliases or update every dependent test/component in the same task,
- preserve reduced-motion behavior.

- [ ] **Step 7: Re-run the targeted tests to verify they pass**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/FeedPanel.test.js app/catana/__tests__/uiNoDragImages.test.js app/catana/__tests__/renderPerfGuards.test.js
```

Expected: PASS

- [ ] **Step 8: Commit the shared shell**

```bash
git add app/catana/components/FeedPanel.js app/catana/components/FeedTokenRow.js app/globals.css app/catana/__tests__/FeedPanel.test.js app/catana/__tests__/uiNoDragImages.test.js app/catana/__tests__/renderPerfGuards.test.js
git commit -m "feat: add shared Catana feed panel shell"
```

### Task 2: Move the game log onto the shared feed shell

**Files:**
- Modify: `app/catana/components/GameLogPanel.js`
- Modify: `app/catana/__tests__/GameLogPanel.test.js`

- [ ] **Step 9: Write the failing game-log adapter tests**

Update `app/catana/__tests__/GameLogPanel.test.js` so it asserts that `GameLogPanel.js`:
- imports or references `FeedPanel`,
- imports or references `FeedTokenRow`,
- still uses `formatLogEntry`,
- still memoizes `formattedEntries`,
- no longer owns the fixed bottom-left positioning itself.

- [ ] **Step 10: Run the focused game-log test to verify it fails**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/GameLogPanel.test.js
```

Expected: FAIL because `GameLogPanel.js` still contains the old fixed panel implementation.

- [ ] **Step 11: Implement the thin game-log adapter**

Refactor `app/catana/components/GameLogPanel.js` so it:
- keeps only game-log-specific formatting and memoization,
- passes the title `"Game Log"` plus formatted rows into `FeedPanel`,
- renders each row through `FeedTokenRow`,
- exports the component through `React.memo` as it does today.

- [ ] **Step 12: Re-run the focused game-log test to verify it passes**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/GameLogPanel.test.js
```

Expected: PASS

- [ ] **Step 13: Commit the game-log refactor**

```bash
git add app/catana/components/GameLogPanel.js app/catana/__tests__/GameLogPanel.test.js
git commit -m "refactor: move game log onto shared feed shell"
```

### Task 3: Add chat formatting, preview data, and the presentational chat panel

**Files:**
- Create: `app/catana/components/ChatPanel.js`
- Create: `app/catana/utils/chatPreview.js`
- Create: `app/catana/__tests__/ChatPanel.test.js`
- Create: `app/catana/__tests__/chatPreview.test.js`
- Modify: `app/catana/utils/gameText.js`
- Modify: `app/catana/__tests__/gameText.test.js`

- [ ] **Step 14: Write the failing chat formatter tests**

Extend `app/catana/__tests__/gameText.test.js` with checks that `formatChatEntry(...)`:
- returns a leading player token,
- preserves emoji/color metadata from the same `playerMap` shape used by the log,
- emits plain text tokens for the message body without resource-icon expansion.

Example expectation:
```js
const tokens = formatChatEntry(
  { id: "m1", actorId: "1", message: "ready when you are" },
  { "1": { name: "Ada", emoji: "🦊", color: "blue" } }
);
expect(tokens[0]).toMatchObject({ kind: "player", id: "1", name: "Ada" });
expect(tokens.some((token) => token.kind === "text" && token.text.includes("ready"))).toBe(true);
```

- [ ] **Step 15: Write the failing preview-data tests**

Create `app/catana/__tests__/chatPreview.test.js` covering a deterministic preview transcript helper that:
- uses current player + one opponent when available,
- falls back gracefully if only one seat/name exists,
- returns stable ids so React keys stay fixed across renders.

- [ ] **Step 16: Write the failing chat-panel source test**

Create `app/catana/__tests__/ChatPanel.test.js` asserting that `ChatPanel.js`:
- references `FeedPanel`,
- references `FeedTokenRow`,
- includes a `"Chat"` header,
- includes a presentational composer with disabled input/button state,
- includes preview-only / coming-soon copy so the fake transcript does not look live.

- [ ] **Step 17: Run the chat-focused tests to verify they fail**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/gameText.test.js app/catana/__tests__/chatPreview.test.js app/catana/__tests__/ChatPanel.test.js
```

Expected:
- formatter assertions fail because `formatChatEntry` does not exist,
- preview helper test fails because `chatPreview.js` does not exist,
- `ChatPanel.test.js` fails because `ChatPanel.js` does not exist.

- [ ] **Step 18: Implement chat formatting and preview transcript helpers**

In `app/catana/utils/gameText.js`, add `formatChatEntry(entry, playerMap)` that reuses the existing player-token model and returns a simple:
- player token,
- separator text like `": "`,
- message text token.

In `app/catana/utils/chatPreview.js`, add `buildChatPreviewEntries({ playerID, playerMap })` that returns a small deterministic transcript. Keep it local/UI-only and easy to delete when real chat wiring lands.

- [ ] **Step 19: Implement the presentational chat panel**

Create `app/catana/components/ChatPanel.js` so it:
- renders through `FeedPanel`,
- maps preview entries through `formatChatEntry(...)`,
- uses `FeedTokenRow` for message rows,
- includes a small preview label or helper copy,
- renders a disabled glass-styled input and send button matching Catana meta UI.

- [ ] **Step 20: Re-run the chat-focused tests to verify they pass**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/gameText.test.js app/catana/__tests__/chatPreview.test.js app/catana/__tests__/ChatPanel.test.js
```

Expected: PASS

- [ ] **Step 21: Commit the chat panel**

```bash
git add app/catana/components/ChatPanel.js app/catana/utils/chatPreview.js app/catana/utils/gameText.js app/catana/__tests__/ChatPanel.test.js app/catana/__tests__/chatPreview.test.js app/catana/__tests__/gameText.test.js
git commit -m "feat: add presentational Catana chat panel"
```

### Task 4: Mount the left rail and bring the debug panel into the same layout

**Files:**
- Create: `app/catana/components/LeftMetaRail.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/components/DebugPanel.js`
- Create: `app/catana/__tests__/LeftMetaRail.test.js`
- Modify: `app/catana/__tests__/DebugUiVisibility.test.js`

- [ ] **Step 22: Write the failing left-rail source tests**

Create `app/catana/__tests__/LeftMetaRail.test.js` asserting that the new rail:
- is fixed to `left-4 bottom-4`,
- uses a single width class family for the whole column,
- stacks `GameLogPanel` above `ChatPanel`,
- gives each feed the same height.

- [ ] **Step 23: Update the debug visibility regression before refactoring**

Modify `app/catana/__tests__/DebugUiVisibility.test.js` so it no longer depends on `GameScreen.js` directly importing `DebugPanel`. Instead, assert that the dev-only path still exists after the rail extraction, whether through `LeftMetaRail.js` or `GameScreen.js`.

- [ ] **Step 24: Run the rail / debug tests to verify they fail**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/DebugUiVisibility.test.js
```

Expected:
- `LeftMetaRail.test.js` fails because `LeftMetaRail.js` does not exist yet,
- updated debug visibility expectations fail until the new import path exists.

- [ ] **Step 25: Implement the fixed left rail**

Create `app/catana/components/LeftMetaRail.js` that:
- owns the fixed bottom-left positioning,
- owns the shared width class,
- stacks the game log and chat panels with a modest gap,
- keeps both feed panels at equal height,
- optionally renders the dev-only debug panel above them.

- [ ] **Step 26: Remove fixed positioning from `DebugPanel`**

Refactor `app/catana/components/DebugPanel.js` so it becomes a normal block-level panel instead of a separately fixed overlay. Preserve:
- the same visual treatment,
- the same controls,
- the same `data-allow-interaction="true"` behavior.

- [ ] **Step 27: Wire `GameScreen` onto the new rail**

Update `app/catana/GameScreen.js` so it:
- imports `LeftMetaRail` instead of mounting `GameLogPanel` directly,
- passes `bgioProps.G?.gameLog ?? []`, `logPlayerMap`, `themeId`, and `playerID`,
- removes the old standalone `GameLogPanel` mount,
- keeps right-click suppression opt-out working via the rail's interactive region.

- [ ] **Step 28: Re-run the rail / debug tests to verify they pass**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/DebugUiVisibility.test.js
```

Expected: PASS

- [ ] **Step 29: Commit the left-rail integration**

```bash
git add app/catana/components/LeftMetaRail.js app/catana/components/DebugPanel.js app/catana/GameScreen.js app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/DebugUiVisibility.test.js
git commit -m "feat: add Catana left meta rail"
```

### Task 5: Run the focused verification and update project docs

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 30: Update the agent progress log**

Record:
- the new shared feed shell,
- the new presentational chat panel,
- the new fixed left rail,
- that chat transport is still intentionally deferred.

- [ ] **Step 31: Update the agent notes**

Document:
- `FeedPanel.js` / `FeedTokenRow.js` as the shared meta-feed primitives,
- `LeftMetaRail.js` as the fixed left-side layout owner,
- that future minimize / resize work should extend the rail rather than reintroduce fixed offsets.

- [ ] **Step 32: Run the full focused UI verification slice**

Run:
```bash
pnpm exec vitest run app/catana/__tests__/FeedPanel.test.js app/catana/__tests__/ChatPanel.test.js app/catana/__tests__/chatPreview.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/gameText.test.js app/catana/__tests__/DebugUiVisibility.test.js app/catana/__tests__/renderPerfGuards.test.js app/catana/__tests__/uiNoDragImages.test.js app/catana/__tests__/GameScreen.interactionGuards.test.js
```

Expected: PASS

- [ ] **Step 33: Do one manual Catana smoke check**

Run the client and verify:
- log renders above chat,
- both feeds share width and height,
- sender highlighting matches the game log style,
- chat composer is visibly disabled / preview-only,
- dev tools still sit above the two feeds in development.

- [ ] **Step 34: Commit the docs + final verification state**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record Catana chat panel UI shell"
```
