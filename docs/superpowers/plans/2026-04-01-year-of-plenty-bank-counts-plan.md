# Year of Plenty Bank Counts Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide Year of Plenty bank counts by default behind a match-scoped game flag without changing availability enforcement.

**Architecture:** Add `gameSettings.showYearOfPlentyBankCounts` to the Catana game setup state with a default of `false`, then gate the Year of Plenty badge rendering in the shared modal against that flag. Keep the existing finite-bank logic unchanged so selection caps still come from authoritative bank state.

**Tech Stack:** Next.js, React, boardgame.io, Vitest

---

### Task 1: Lock the desired behavior with tests

**Files:**
- Modify: `app/catana/__tests__/Game.boardConfig.test.js`
- Create: `app/catana/__tests__/TradeDiscardModal.test.js`

- [ ] **Step 1: Write the failing tests**

Add:
- a setup test asserting `G.gameSettings.showYearOfPlentyBankCounts === false` by default
- a setup test asserting `setupData.gameSettings.showYearOfPlentyBankCounts === true` is preserved
- a modal render test asserting the YoP count badge markup is hidden by default
- a modal render test asserting the badge markup appears when the flag is enabled

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run app/catana/__tests__/Game.boardConfig.test.js app/catana/__tests__/TradeDiscardModal.test.js`

Expected:
- setup tests fail because `gameSettings` does not exist yet
- modal default-hidden test fails because the current modal still renders YoP bank count badges

### Task 2: Add the minimal implementation

**Files:**
- Modify: `app/catana/Game.js`
- Modify: `app/catana/components/TradeDiscardModal.js`

- [ ] **Step 3: Add the game-level flag**

Initialize `G.gameSettings.showYearOfPlentyBankCounts` in game setup, defaulting to `false`, with support for `setupData.gameSettings.showYearOfPlentyBankCounts`.

- [ ] **Step 4: Gate the badge rendering**

Only render the Year of Plenty bank count badges when the new flag is `true`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run app/catana/__tests__/Game.boardConfig.test.js app/catana/__tests__/TradeDiscardModal.test.js`

Expected: PASS

### Task 3: Update repo notes

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 6: Record the change**

Add a short note describing the new default-hidden YoP bank count behavior and the new match-scoped flag.
