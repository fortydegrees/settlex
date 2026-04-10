# Catana Dev Sandbox Board Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dev-only Catana sandbox route that opens directly onto the real board screen, runs entirely locally without the live server, and exposes a small collapsible panel for presets, viewer-seat switching, reset, and quick resource/dev-card nudges.

**Architecture:** Build the sandbox as a new dev-only route and a new local client stack only. Reuse the real Catana screen by importing `GameScreenWithEffects`, but adapt the props it receives through a sandbox board shell so timer / disconnect / idle / match-network concerns are suppressed from the outside. Because the installed `boardgame.io/react` client locks `numPlayers` at factory creation time and does not accept `setupData` as a render prop, the sandbox must create a preset-specific local game definition via `createCatanGame()` and remount the generated client when the preset changes or the user resets.

**Tech Stack:** Next.js app routes, React, boardgame.io/react local client mode, existing Catana UI components, Vitest, pnpm

---

## File Structure

### Route entry

- Create: `app/catana/dev/sandbox/page.js`
  - Development-only route entry matching the existing `effects` and `palette-preview` gating pattern.

### Local sandbox client wiring

- Create: `app/catana/dev/sandbox/SandboxClient.js`
  - Own selected preset, selected viewer seat, collapse state, and remount/reset key.
  - Memoize a preset-specific local boardgame.io client component.
- Create: `app/catana/dev/sandbox/createSandboxGame.js`
  - Wrap `createCatanGame()` so each preset can inject a legal boot state without modifying `app/catana/Game.js`.

### Sandbox state and metadata helpers

- Create: `app/catana/dev/sandbox/presets.js`
  - Export fixed v1 preset definitions plus helper functions for:
    - resolving a preset by id,
    - coercing viewer seats,
    - building stable local match metadata for the real screen.

### Real-screen adapter and dev controls

- Create: `app/catana/dev/sandbox/SandboxBoardShell.js`
  - Receive local boardgame.io props, inject sandbox-safe match/timer/presence props, render the real `GameScreenWithEffects`, and host the panel overlay.
- Create: `app/catana/dev/sandbox/SandboxPanel.js`
  - Small collapsible dev-only control surface for preset selection, viewer seat, reset, and quick nudges.

### Tests

- Create: `app/catana/__tests__/DevSandboxRoute.source.test.js`
  - Source guard for the new dev-only route entry.
- Create: `app/catana/__tests__/DevSandboxPresets.test.js`
  - Unit coverage for fixed preset ids and viewer-seat coercion helpers.
- Create: `app/catana/__tests__/DevSandboxClient.source.test.js`
  - Source guard for local non-networked client wiring and preset-driven remount behavior.
- Create: `app/catana/__tests__/DevSandboxBoardShell.source.test.js`
  - Source guard that the shell renders the real game screen and injects sandbox-safe props.
- Create: `app/catana/__tests__/DevSandboxPanel.source.test.js`
  - Source guard for the approved panel controls and quick debug-move buttons.

### Docs

- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

## Assumptions To Keep During Implementation

- Do not modify `app/catana/GameScreen.js`, `app/catana/Game.js`, or live match route files unless a hard blocker appears and the user approves crossing that boundary.
- Reuse Catana UI by import; do not build a duplicate board shell.
- Presets should boot legal or near-legal local game states through a wrapped local game setup, not by mutating random React state after render.
- Quick nudges may use existing debug moves because those are already dev-only and cheaper than inventing a second fake rules layer.
- The worktree may already be dirty. Never revert unrelated edits. If `docs/agent/PROGRESS.md` or `docs/agent/NOTES.md` still contain unrelated pending work when documenting this slice, append notes carefully and avoid staging unrelated hunks.

## Execution Notes

- Use `@test-driven-development` on each code slice.
- If the local sandbox client does not enter the expected Catana stage for a preset, stop and use `@systematic-debugging` before adding ad-hoc prop hacks.
- Before claiming the sandbox is done, use `@verification-before-completion`.

### Task 1: Lock the route and local-client seams with source tests

**Files:**
- Create: `app/catana/__tests__/DevSandboxRoute.source.test.js`
- Create: `app/catana/__tests__/DevSandboxClient.source.test.js`
- Create: `app/catana/dev/sandbox/page.js`
- Create: `app/catana/dev/sandbox/SandboxClient.js`
- Create: `app/catana/dev/sandbox/SandboxBoardShell.js`
- Create: `app/catana/dev/sandbox/createSandboxGame.js`
- Reference: `app/catana/dev/effects/page.js`
- Reference: `app/catana/lobby/[matchID]/MatchPageClient.js`

- [ ] **Step 1: Write the failing route source test**

Create `app/catana/__tests__/DevSandboxRoute.source.test.js` with expectations like:

```js
expect(source).toContain('process.env.NODE_ENV !== "development"');
expect(source).toContain("notFound()");
expect(source).toContain("SandboxClient");
```

- [ ] **Step 2: Write the failing local-client source test**

Create `app/catana/__tests__/DevSandboxClient.source.test.js` with expectations like:

```js
expect(source).toContain("Client({");
expect(source).toContain("createSandboxGame");
expect(source).toContain("SandboxBoardShell");
expect(source).toContain("debug: false");
expect(source).not.toContain("SocketIO");
```

- [ ] **Step 3: Run the new source tests to verify RED**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/DevSandboxRoute.source.test.js app/catana/__tests__/DevSandboxClient.source.test.js
```

Expected: FAIL because the sandbox route and client files do not exist yet.

- [ ] **Step 4: Create the minimal route and client scaffolding**

Implement:

- `app/catana/dev/sandbox/page.js` with the same development-only gate used by the existing dev labs.
- `app/catana/dev/sandbox/SandboxClient.js` as a `"use client"` file that:
  - imports `Client` from `boardgame.io/react`,
  - imports `createSandboxGame`,
  - imports `SandboxBoardShell`,
  - creates a memoized local client component with `debug: false`.
- `app/catana/dev/sandbox/SandboxBoardShell.js` as a temporary passthrough placeholder so the client compiles.
- `app/catana/dev/sandbox/createSandboxGame.js` as a temporary stub so the client import graph is valid before the real preset-driven setup lands in Task 2.

- [ ] **Step 5: Re-run the route and client source tests to verify GREEN**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/DevSandboxRoute.source.test.js app/catana/__tests__/DevSandboxClient.source.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit the route/client scaffold**

```bash
git add app/catana/dev/sandbox/page.js app/catana/dev/sandbox/SandboxClient.js app/catana/dev/sandbox/SandboxBoardShell.js app/catana/dev/sandbox/createSandboxGame.js app/catana/__tests__/DevSandboxRoute.source.test.js app/catana/__tests__/DevSandboxClient.source.test.js
git commit -m "feat: scaffold catana dev sandbox route"
```

### Task 2: Define fixed presets and the preset-specific local game factory

**Files:**
- Create: `app/catana/dev/sandbox/presets.js`
- Create: `app/catana/dev/sandbox/createSandboxGame.js`
- Create: `app/catana/__tests__/DevSandboxPresets.test.js`
- Reference: `app/catana/Game.js`
- Reference: `app/catana/Moves.js`
- Reference: `app/catana/scenarios/*.json`

- [ ] **Step 7: Write the failing preset/helper tests**

Create `app/catana/__tests__/DevSandboxPresets.test.js` as a pure unit test for helpers such as:

```js
it("exports the approved v1 preset ids", () => {
  expect(SANDBOX_PRESETS.map((preset) => preset.id)).toEqual([
    "default",
    "pre-roll",
    "post-roll",
    "settlement-placement",
    "road-placement",
    "robber-move",
    "trade-ready",
    "dev-card-ready",
    "game-over",
  ]);
});

it("coerces an invalid viewer seat to the first legal seat", () => {
  expect(coerceViewerSeat({ playerIds: ["0", "1"] }, "9")).toBe("0");
});
```

- [ ] **Step 8: Run the preset tests to verify RED**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/DevSandboxPresets.test.js
```

Expected: FAIL because the helpers do not exist yet.

- [ ] **Step 9: Implement `presets.js` with a small fixed preset list**

Export:

- `SANDBOX_PRESETS`
- `getSandboxPreset(id)`
- `coerceViewerSeat(preset, viewerSeat)`
- `buildSandboxMatchMetadata(preset)`

Keep the preset definitions code-driven and small. Each preset should include:

- `id`
- `label`
- `numPlayers`
- enough scenario-state or scenario-builder data to boot the intended Catana stage

Do not add saved-scenario loading yet.

- [ ] **Step 10: Implement `createSandboxGame.js` with a wrapped Catana setup**

Because the installed `boardgame.io/react` client does not take `setupData` per render, create a helper like:

```js
import { createCatanGame } from "../../Game";

export function createSandboxGame(preset) {
  const baseGame = createCatanGame();

  return {
    ...baseGame,
    setup: (ctxBundle) =>
      baseGame.setup(ctxBundle, {
        devScenarioState: preset.devScenarioState,
      }),
  };
}
```

Adjust the exact shape as needed so:

- `numPlayers` stays aligned with the preset,
- each preset boots directly into the right stage,
- no live-match code needs to change.

- [ ] **Step 11: Re-run the preset tests to verify GREEN**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/DevSandboxPresets.test.js
```

Expected: PASS.

- [ ] **Step 12: Commit the preset and game-factory slice**

```bash
git add app/catana/dev/sandbox/presets.js app/catana/dev/sandbox/createSandboxGame.js app/catana/__tests__/DevSandboxPresets.test.js
git commit -m "feat: add catana sandbox presets"
```

### Task 3: Adapt the real game screen through a sandbox board shell

**Files:**
- Modify: `app/catana/dev/sandbox/SandboxClient.js`
- Modify: `app/catana/dev/sandbox/SandboxBoardShell.js`
- Modify: `app/catana/__tests__/DevSandboxClient.source.test.js`
- Create: `app/catana/__tests__/DevSandboxBoardShell.source.test.js`
- Reference: `app/catana/GameScreen.js`
- Reference: `app/catana/Game.js`

- [ ] **Step 13: Write the failing board-shell source test**

Create `app/catana/__tests__/DevSandboxBoardShell.source.test.js` with expectations like:

```js
expect(source).toContain("GameScreenWithEffects");
expect(source).toContain('matchID="dev-sandbox"');
expect(source).toContain("isConnected={true}");
expect(source).toContain("isMultiplayer={false}");
expect(source).toContain("timerSnapshot={null}");
expect(source).toContain("disconnectPresence={null}");
expect(source).toContain("idlePresence={null}");
expect(source).toContain("matchData={matchMetadata}");
expect(source).toContain("matchMetadata={matchMetadata}");
```

- [ ] **Step 14: Run the board-shell source test to verify RED**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/DevSandboxBoardShell.source.test.js
```

Expected: FAIL because the shell still does not adapt the real screen props.

- [ ] **Step 15: Implement `SandboxBoardShell.js` as a real adapter**

Render the real `GameScreenWithEffects` and inject:

- fake stable `matchID`, for example `dev-sandbox`
- `isConnected: true`
- `isMultiplayer: false`
- `timerSnapshot: null`
- `disconnectPresence: null`
- `idlePresence: null`
- stable local seat metadata from `buildSandboxMatchMetadata(...)`
- current viewer `playerID`

Also pass through the real local boardgame.io state, moves, events, and effects props unchanged.

- [ ] **Step 16: Update `SandboxClient.js` to recreate the local client per preset**

First extend `app/catana/__tests__/DevSandboxClient.source.test.js` to guard the reset/remount seam with expectations like:

```js
expect(source).toContain("resetVersion");
expect(source).toContain("numPlayers: preset.numPlayers");
expect(source).toContain("key={`${preset.id}:${resetVersion}`}");
```

Then memoize a preset-specific client component similar to:

```js
const SandboxMatch = useMemo(
  () =>
    Client({
      game: createSandboxGame(preset),
      numPlayers: preset.numPlayers,
      board: SandboxBoardShell,
      debug: false,
    }),
  [preset]
);
```

Use a `key` that changes on reset so the local state reboots cleanly.

- [ ] **Step 17: Re-run the client and board-shell source tests to verify GREEN**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/DevSandboxClient.source.test.js app/catana/__tests__/DevSandboxBoardShell.source.test.js
```

Expected: PASS.

- [ ] **Step 18: Commit the adapter slice**

```bash
git add app/catana/dev/sandbox/SandboxClient.js app/catana/dev/sandbox/SandboxBoardShell.js app/catana/__tests__/DevSandboxClient.source.test.js app/catana/__tests__/DevSandboxBoardShell.source.test.js
git commit -m "feat: wire catana sandbox through real game screen"
```

### Task 4: Add the collapsible sandbox panel and quick debug nudges

**Files:**
- Create: `app/catana/dev/sandbox/SandboxPanel.js`
- Modify: `app/catana/dev/sandbox/SandboxClient.js`
- Modify: `app/catana/dev/sandbox/SandboxBoardShell.js`
- Create: `app/catana/__tests__/DevSandboxPanel.source.test.js`
- Reference: `app/catana/components/DebugPanel.js`

- [ ] **Step 19: Write the failing panel source test**

Create `app/catana/__tests__/DevSandboxPanel.source.test.js` with expectations like:

```js
expect(source).toContain("Dev Sandbox");
expect(source).toContain("Preset");
expect(source).toContain("Viewer seat");
expect(source).toContain("Reset");
expect(source).toContain("Quick resources");
expect(source).toContain("Quick dev cards");
expect(source).toContain("Collapse");
```

Also guard the quick-nudge wiring in the shell:

```js
expect(shellSource).toContain("moves.DEBUG_takeCardsFromBank");
expect(shellSource).toContain("moves.DEBUG_takeDevCards");
```

- [ ] **Step 20: Run the panel source test to verify RED**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/DevSandboxPanel.source.test.js
```

Expected: FAIL because the panel and debug-nudge wiring do not exist yet.

- [ ] **Step 21: Implement `SandboxPanel.js`**

Build a small collapsible overlay that exposes only:

- preset select
- viewer-seat select
- reset button
- quick resource buttons
- quick dev-card buttons
- collapse / expand affordance

Keep the styling utilitarian. This is a dev harness, not product UI.

- [ ] **Step 22: Wire panel state and quick debug actions**

In `SandboxClient.js` and `SandboxBoardShell.js`:

- keep selected preset and viewer seat in client state,
- coerce the viewer seat whenever the preset changes,
- increment the reset key on reset,
- pass panel callbacks into the shell,
- call `moves.DEBUG_takeCardsFromBank(viewerSeat, [resource])`,
- call `moves.DEBUG_takeDevCards(viewerSeat, [cardType])`.

- [ ] **Step 23: Re-run the panel and shell source tests to verify GREEN**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/DevSandboxPanel.source.test.js app/catana/__tests__/DevSandboxBoardShell.source.test.js
```

Expected: PASS.

- [ ] **Step 24: Commit the sandbox panel slice**

```bash
git add app/catana/dev/sandbox/SandboxPanel.js app/catana/dev/sandbox/SandboxClient.js app/catana/dev/sandbox/SandboxBoardShell.js app/catana/__tests__/DevSandboxPanel.source.test.js app/catana/__tests__/DevSandboxBoardShell.source.test.js
git commit -m "feat: add catana sandbox controls"
```

### Task 5: Verify the route end to end and document the new workflow

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] **Step 25: Run the focused sandbox test suite**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/DevSandboxRoute.source.test.js app/catana/__tests__/DevSandboxClient.source.test.js app/catana/__tests__/DevSandboxPresets.test.js app/catana/__tests__/DevSandboxBoardShell.source.test.js app/catana/__tests__/DevSandboxPanel.source.test.js
```

Expected: PASS.

- [ ] **Step 26: Run the adjacent guard tests**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/DebugUiVisibility.test.js app/catana/__tests__/LobbyPageClient.scenarios.test.js
```

Expected: PASS, confirming the new sandbox route does not regress existing dev-only surfaces.

- [ ] **Step 27: Manual smoke-check the sandbox route**

Run:

```bash
pnpm dev
```

Then verify manually in the browser:

- `/catana/dev/sandbox` loads without starting `pnpm serve`
- the board appears immediately
- each preset swaps the board into the expected local state
- roll / end-turn works in a compatible preset
- quick resources and quick dev cards visibly affect the viewed player
- the panel collapses and expands cleanly
- at least one sound/effect path still fires through the normal Catana screen

- [ ] **Step 28: Record the new route in agent docs**

Append concise notes describing:

- the new dev-only sandbox route,
- the fact that it reuses the real game screen locally without the live server,
- the rule that preset booting happens through sandbox-only wrappers rather than live-route changes.

- [ ] **Step 29: Commit verification and docs**

Run:

```bash
git diff -- docs/agent/PROGRESS.md docs/agent/NOTES.md
```

If those files contain only the intended sandbox notes, stage and commit them:

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record catana sandbox workflow"
```

If unrelated edits are still mixed into those files, stop and ask the user before staging them together.
