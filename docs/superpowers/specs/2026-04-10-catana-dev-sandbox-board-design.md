# Catana Dev Sandbox Board Design

Date: 2026-04-10
Scope: Dev-only local board sandbox for UI, animation, and audio iteration
Status: Approved for implementation

## Goal

Add a dev-only Catana route that shows the real in-game board screen without requiring:

- a live server,
- a second player or bot,
- a real match bootstrap flow,
- click-through setup before the board is visible.

The page should feel like the normal game screen and let UI work happen quickly:

- inspect the board and dock in a stable state,
- trigger common interaction states such as roll, trade, placement, and dev-card flows,
- replay sounds and animations through the normal UI where possible,
- reset quickly when a test state becomes messy.

## Non-goals

- No production route or user-facing feature.
- No redesign of the Catana game screen.
- No fake networking, lobby, or second-player automation.
- No attempt to build a general-purpose state editor.
- No separate duplicate board implementation.
- No required edits to the live match route or other existing game files for v1.

Important guardrail:

- the intended implementation shape is new sandbox files only, reusing existing Catana modules by import.
- if implementation reveals a hard blocker that would require changing live game files, stop and get approval before crossing that boundary.

## UX Summary

The sandbox should look like the real game screen first and a dev tool second.

That means:

- the board, dock, opponent boxes, log rail, modals, and effects should still come from the real Catana screen,
- the page should open directly onto a playable-looking board state,
- a small collapsible `Dev Sandbox` panel should provide the shortcuts that replace match setup friction,
- once collapsed, the screen should read almost exactly like the normal game board.

## Approaches Considered

### 1. Local single-client sandbox

Mount the existing Catana game locally with a non-networked `boardgame.io` client and drive it with local presets plus existing debug moves.

Pros:

- closest to the real board screen,
- minimal UI drift,
- reuses existing interactions, effects, and sound wiring,
- no live server dependency.

Cons:

- the engine still runs locally,
- fully illegal/freeform states still need presets or debug nudges.

### 2. Pure mock shell

Build a separate React-only page that recreates the board screen using mock data and fake local handlers.

Pros:

- complete freedom to trigger any visual state,
- no engine coupling.

Cons:

- much higher drift risk,
- more maintenance,
- duplicates composition that already exists in the real screen.

### 3. Effects-only lab

Extend the existing dev lab idea into a board-shaped screen that only triggers UI/effects/sounds.

Pros:

- smallest implementation.

Cons:

- too narrow for the stated workflow,
- does not replace the need to see and poke the real board screen.

## Recommended Approach

Use approach 1: a local single-client sandbox.

The sandbox should import the real `Catan` game definition and the real `GameScreenWithEffects`, but host them inside a new dev-only route that never connects to the live game server.

This provides the right trade-off:

- real screen,
- real local state where it is already cheap,
- no live match lifecycle,
- isolated implementation surface.

## Route And File Shape

Create a new dev-only route parallel to the existing Catana labs:

- `app/catana/dev/sandbox/page.js`
- `app/catana/dev/sandbox/SandboxClient.js`
- `app/catana/dev/sandbox/SandboxBoardShell.js`
- `app/catana/dev/sandbox/SandboxPanel.js`
- `app/catana/dev/sandbox/presets.js`

Optional later:

- `app/catana/dev/sandbox/scenarioLoader.js`

### Page entry

`page.js` should match the existing dev-lab gating pattern:

- render only in `development`,
- call `notFound()` otherwise.

### Sandbox client

`SandboxClient.js` should create a local `boardgame.io/react` client:

- `game: Catan`
- `board: SandboxBoardShell`
- no `multiplayer`
- `debug: false`

The sandbox client owns:

- selected preset,
- selected viewer seat,
- reset/remount key,
- optional scenario selection later.

### Board shell

`SandboxBoardShell.js` should sit between the local `boardgame.io` client and the real `GameScreen`.

Its job is not to fork the UI. Its job is to adapt local sandbox state into the props shape the real screen expects.

## Runtime Model

The sandbox should use the real Catana game engine locally, but suppress live-match concerns.

### Why this works

The current Catana setup already supports:

- booting a state from `setupData.devScenarioState`,
- dev-only debug moves such as:
  - `DEBUG_takeCardsFromBank`
  - `DEBUG_takeDevCards`
  - `DEBUG_captureScenarioState`
  - `DEBUG_clearCapturedScenarioState`

That means the sandbox does not need a second rules engine. It can boot useful local states and then let normal game interactions continue from there.

### Prop adaptation

`SandboxBoardShell` should render the real `GameScreenWithEffects` but inject sandbox-safe values for match-related props:

- stable fake `matchID`, for example `dev-sandbox`
- `isConnected: true`
- `isMultiplayer: false`
- `timerSnapshot: null`
- `disconnectPresence: null`
- `idlePresence: null`
- stable local `matchData` / `matchMetadata`
- local `playerID` based on the selected viewer seat

This is important because `GameScreen` currently performs live timer / idle bootstrap work when certain props are absent. The sandbox should satisfy that contract from the outside rather than modifying the live screen.

## Presets

V1 should ship with code-defined presets rather than a large state editor.

Recommended preset set:

- `Default`
- `Pre-roll`
- `Post-roll`
- `Settlement placement`
- `Road placement`
- `Robber move`
- `Trade ready`
- `Dev-card ready`
- `Game over`

### Preset behavior

Each preset should provide enough local state for the real screen to expose the desired interaction path.

Examples:

- `Pre-roll`
  - current player is the selected viewer,
  - roll button is available.
- `Post-roll`
  - turn is post-roll with resources already present,
  - end-turn and build/trade affordances are visible.
- `Settlement placement`
  - current player is already in a settlement placement stage with valid nodes.
- `Trade ready`
  - player has enough resources for maritime trade and the normal trade modal path can be opened.
- `Dev-card ready`
  - player has the right resources or cards to buy/play a dev card through the normal dock path.

Presets should prefer booting legal local states instead of directly mutating React-local UI state.

## Sandbox Panel

The panel should be small, obvious, and collapsible.

### V1 controls

- `Preset` picker
- `Reset` button
- `Viewer seat` picker
- `Quick resources`
  - give one or more resources to the viewed player
- `Quick dev cards`
  - give one or more dev cards to the viewed player
- `Collapse / expand`

### What the panel should not become

- no grid of every internal field,
- no manual editing of raw JSON,
- no attempt to expose all engine state,
- no permanent on-screen clutter when the user wants to inspect the board cleanly.

## Interaction Model

The sandbox should follow this rule:

- use real local game interactions when they already work cheaply,
- use presets or debug nudges to reach awkward states quickly,
- do not build a second fake interaction system just to bypass normal local rules.

Practical examples:

- rolling dice should use the normal roll path,
- ending a turn should use the normal end-turn path,
- settlement / road / robber placement should use normal board interactions once the preset exposes the correct stage,
- giving cards or dev cards can use existing debug moves because that is cheaper than manufacturing those inventories naturally every time.

## Scenario Reuse

The existing scenario infrastructure is a good fit for later extension, but it does not need to be mandatory for v1.

### V1

- ship a small fixed preset list in code,
- keep reset fast and predictable.

### Later

- optionally reuse `/api/scenarios` and `app/catana/scenarios/*.json` so the sandbox can load saved snapshots,
- optionally allow the sandbox to save the current local snapshot using the existing scenario capture path.

This should be treated as an extension, not part of the minimum slice.

## Error Handling

The sandbox should fail gently because it is a dev tool.

### Rules

- if a preset cannot be loaded, fall back to `Default`,
- if a selected viewer seat is invalid for the current preset, fall back to the first valid seat,
- if a debug nudge is unavailable, keep the rest of the sandbox usable,
- if later scenario loading is added and a scenario is malformed, show a lightweight inline error and keep the page running.

## Testing

This slice should use light verification rather than a large new test matrix.

### Automated coverage

- route test proving the sandbox page is gated to development
- source or render test proving the sandbox client creates a local non-multiplayer client
- source or render test proving `SandboxBoardShell` passes sandbox-safe match/timer/presence props into the real game screen
- optional source test proving the panel exposes the approved preset labels

### Manual smoke checks

- load the sandbox route directly without a running game server
- confirm the board renders immediately
- switch presets and confirm the UI enters the expected state
- roll dice / end turn in a preset where those actions are valid
- open trade / placement / dev-card flows from a relevant preset
- trigger at least one sound/effect path and confirm it still uses the normal Catana effect layer
- collapse the panel and confirm the screen still reads like the normal board

## Implementation Boundaries

For this slice, the implementation should stay inside these boundaries:

- new dev-only route and sandbox files only,
- reuse existing Catana modules by import,
- no live route behavior changes,
- no build-tool changes,
- no new dependencies,
- no fake server or bot orchestration.

If those boundaries hold, the sandbox stays cheap to maintain and safe to delete or expand later.
