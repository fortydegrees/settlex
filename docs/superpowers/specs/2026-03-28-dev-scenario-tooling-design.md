# Dev Scenario Tooling Design

Date: 2026-03-28
Scope: dev-only scenario loading and lightweight in-match debug controls for Catana
Status: Approved for implementation

## Goal

Add a small dev-only scenario workflow so Catana can boot directly into saved test states and expose a simple in-match panel for granting resources and development cards without reviving the old brittle full-state hot-load behavior.

## Context

- Catana already has dormant debug pieces:
  - `app/catana/components/DebugPanel.js`
  - `app/api/scenarios/route.js`
  - `app/catana/scenarios/*.json`
  - `DEBUG_*` move gating in `app/catana/Game.js`
- The prior scenario flow saved raw `{ G, ctx }` snapshots and loaded them through `DEBUG_loadState`.
- Existing scenario files include boardgame.io `ctx` internals such as `phase`, `currentPlayer`, and `activePlayers`.
- `DEBUG_loadState` currently replaces `G` only, which means old snapshots are sensitive to boardgame.io turn/stage expectations and can behave inconsistently when loaded mid-match.

## Approved Direction

- Keep this feature dev-only and hidden in production.
- Reuse the existing scenario API and scenario file directory where practical.
- Do not restore mid-match full-state scenario loading.
- Allow scenario loading only at match start, where the game can begin from a known state instead of attempting to hot-swap boardgame.io runtime state.
- Keep the in-match tooling narrow and safe:
  - grant resources to a selected player,
  - grant dev cards to a selected player,
  - save the current state as a scenario file for later boot.

## Experience

### Lobby / main entry

- In non-production builds, expose a small "Start from scenario" control in the Catana lobby flow.
- The control lists saved scenarios from `app/catana/scenarios/`.
- Starting from a scenario should create a match whose initial game state is seeded from the selected scenario payload.

### In-match tooling

- In non-production builds, show a compact left-side debug panel above the existing game log.
- The panel should use Catana glass styling, but remain clearly secondary to gameplay UI.
- The panel should include:
  - a player selector,
  - resource grant controls,
  - dev-card grant controls,
  - a scenario name field and save action,
  - an informational note that full scenario loading happens before game start only.

## Data Contract

- Scenario files should no longer be treated as raw boardgame.io snapshots for live reload.
- The API should normalize scenario data to a controlled payload that contains the authoritative Catana game state used at setup time.
- Backward compatibility is acceptable for existing files by extracting the usable game payload from older `{ G, ctx }` files when listing or loading scenarios.

## Architecture

- Extend Catana setup to accept dev-only scenario setup data and initialize the match from that state.
- Keep boardgame.io runtime state creation in one place so setup can construct a valid match shell around a provided scenario payload.
- Extend debug moves with a safe "grant dev cards" move instead of requiring resource-only hacks for dev-card testing.
- Keep production protections intact:
  - no debug panel,
  - no scenario-start entry,
  - no debug move exposure.

## Acceptance Criteria

- In non-production, a developer can start a Catana match from a saved scenario using the lobby UI.
- In non-production, a developer can grant resources and dev cards from an in-match debug panel.
- In non-production, a developer can save the current game state as a named scenario for later reuse.
- Existing scenario files in `app/catana/scenarios/` still appear in the dev scenario list.
- Production clients do not render the debug panel or the start-from-scenario control.
- The implementation does not rely on mid-match `ctx` restoration or `DEBUG_loadState` hot-swapping.
