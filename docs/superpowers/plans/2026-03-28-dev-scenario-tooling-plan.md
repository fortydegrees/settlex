# Dev Scenario Tooling Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dev-only Catana scenario workflow that starts matches from saved scenarios and provides a small in-match debug panel for granting resources, granting dev cards, and saving new scenarios.

**Architecture:** Reuse the existing scenario API and dormant debug panel path, but remove the brittle mid-match full-state load behavior. Scenario files will be normalized for setup-time initialization, while the in-match panel will be limited to safe mutations through debug moves exposed only outside production.

**Tech Stack:** Next.js app routes, React, boardgame.io, existing Catana UI components, Vitest

---

### Task 1: Lock the scenario contract with tests

**Files:**
- Modify: `app/catana/__tests__/DebugUiVisibility.test.js`
- Create: `app/catana/__tests__/ScenarioApi.test.js`
- Reference: `app/api/scenarios/route.js`
- Reference: `app/catana/Game.js`

- [ ] **Step 1: Write a failing test for backward-compatible scenario normalization**

Cover both:
- legacy `{ G, ctx }` scenario files,
- normalized scenario payloads.

- [ ] **Step 2: Run the scenario API test to verify it fails**

Run: `pnpm exec vitest run app/catana/__tests__/ScenarioApi.test.js`

- [ ] **Step 3: Write a failing visibility test for the new dev-only start surface**

Extend `DebugUiVisibility.test.js` to assert:
- the in-game debug panel is still hidden in production,
- the lobby/main flow contains a dev-only scenario entry guarded by environment.

- [ ] **Step 4: Run the visibility test to verify it fails**

Run: `pnpm exec vitest run app/catana/__tests__/DebugUiVisibility.test.js`

### Task 2: Normalize scenario loading and saving

**Files:**
- Modify: `app/api/scenarios/route.js`
- Modify: `app/catana/Game.js`

- [ ] **Step 1: Normalize scenario API responses**

List scenarios as controlled payloads shaped for setup-time loading. Support older files by extracting `G` from `{ G, ctx }`.

- [ ] **Step 2: Save normalized scenario payloads**

When saving a scenario, write a minimal controlled shape rather than raw boardgame.io snapshot internals.

- [ ] **Step 3: Extend Catana setup to accept a dev scenario payload**

Allow non-production setup data to seed the match from a saved scenario payload while still preserving runtime defaults such as plugins and match shell data.

- [ ] **Step 4: Re-run the scenario API and visibility tests**

Run:
- `pnpm exec vitest run app/catana/__tests__/ScenarioApi.test.js`
- `pnpm exec vitest run app/catana/__tests__/DebugUiVisibility.test.js`

### Task 3: Add safe dev moves for in-match editing

**Files:**
- Modify: `app/catana/Moves.js`
- Modify: `app/catana/Game.js`
- Create: `app/catana/__tests__/Game.debugMoves.test.js` (extend if needed)

- [ ] **Step 1: Write a failing test for granting dev cards through debug moves**

Assert that a debug move can add selected dev cards to a chosen player outside production and remains hidden in production.

- [ ] **Step 2: Run the debug move test to verify it fails**

Run: `pnpm exec vitest run app/catana/__tests__/Game.debugMoves.test.js`

- [ ] **Step 3: Implement the minimal debug move**

Add a focused move for granting dev cards without changing normal game rules or server-authoritative production behavior.

- [ ] **Step 4: Re-run the debug move test**

Run: `pnpm exec vitest run app/catana/__tests__/Game.debugMoves.test.js`

### Task 4: Restore a cleaned-up dev panel and lobby entry

**Files:**
- Modify: `app/catana/components/DebugPanel.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/lobby/LobbyPageClient.js`
- Create: `app/catana/__tests__/LobbyPageClient.scenarios.test.js`

- [ ] **Step 1: Write a failing UI test for the dev-only scenario entry**

Assert the lobby can surface saved scenarios in non-production without exposing the feature in production.

- [ ] **Step 2: Run the lobby UI test to verify it fails**

Run: `pnpm exec vitest run app/catana/__tests__/LobbyPageClient.scenarios.test.js`

- [ ] **Step 3: Restore the debug panel as a compact left-side tool**

Keep only:
- player selection,
- resource grant controls,
- dev-card grant controls,
- save scenario controls,
- no mid-match load button.

- [ ] **Step 4: Add the lobby start-from-scenario control**

Wire saved-scenario selection into match creation/setup flow for non-production only.

- [ ] **Step 5: Re-run focused UI tests**

Run:
- `pnpm exec vitest run app/catana/__tests__/LobbyPageClient.scenarios.test.js`
- `pnpm exec vitest run app/catana/__tests__/DebugUiVisibility.test.js`

### Task 5: Verify and document

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 1: Run targeted feature verification**

Run:
- `pnpm exec vitest run app/catana/__tests__/ScenarioApi.test.js app/catana/__tests__/Game.debugMoves.test.js app/catana/__tests__/DebugUiVisibility.test.js app/catana/__tests__/LobbyPageClient.scenarios.test.js`

- [ ] **Step 2: Record the change in agent docs**

Add concise notes describing:
- the new setup-time scenario flow,
- the restored dev panel scope,
- the production guardrails.

- [ ] **Step 3: Run a broader regression pass if targeted tests are green**

Run: `pnpm exec vitest run app/catana/__tests__/GameScreen*.test.js`
