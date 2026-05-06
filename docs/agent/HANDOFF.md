# HANDOFF — Settlex (Catan clone)

This file brings a new coding agent up to speed on the repo, architecture, and current status.

## High-level goal
Build a playable online Catan MVP with a **thin UI** and a **deterministic game engine**. The engine lives in `game-core/` and is shared between UI and server. The UI should be easy to swap later (e.g., 3D).

## Key decisions
- **Engine extracted to `game-core/`** (TypeScript). UI stays JS for now.
- **Thin UI**: UI renders from `G.core` only, calls core rules for all state changes.
- **Determinism**: no `Math.random` in engine; boardgen uses boardgame.io `random.Number()` from `setup`.
- **Ruleset-driven**: `ruleset` in core defines build costs, piece limits, trade rates, bank, etc.
- **Board presets**: `standard-random` is used now; full “official” layout not implemented yet.
- **TDD for engine changes**: add tests first in `game-core/src/**.test.ts`.

## Current architecture (important files)
### Engine (TypeScript)
- `game-core/src/core/state.ts`  
  Holds `GameState` and `createEmptyState()`. State has:
  - `phase`: `"placement" | "normal"`
  - `players`, `playerStateById`, `bank`, `devDeck`
  - `buildingsByNodeId`, `roadsByEdgeId`
  - `turn`: `{ phase, hasRolled, lastRollTotal, pendingDiscards, currentPlayerId }`
  - `ruleset`, `awards`, `caches`, `robberTileId`
- `game-core/src/core/topology.ts`  
  `buildTopology()` builds node/edge lookup and ports.
- `game-core/src/rules/`  
  - `buildability.ts` (legal nodes/edges)
  - `apply.ts` (placement actions)
  - `buildActions.ts` (road/settlement/city costs + apply)
  - `turnFlow.ts` (roll dice, robber, end turn)
  - `trading.ts`, `devCards.ts`, `victory.ts`
- `game-core/src/ruleset.ts`  
  `createRuleset`, `createStandardRuleset`, `validateRuleset`
- `game-core/src/board/`  
  `boardPresets.ts`, `generateBoard.ts`, `generateBalancedBoard.ts` (random boardgen)

### UI (Next + boardgame.io)
- `app/catana/Game.js`  
  Boardgame.io game config. `setup()` creates board via `generateBoard()` and `createEmptyState()`.
- `app/catana/Moves.js`  
  UI moves call core rules (`applyPlaceSettlement`, `applyBuildRoad`, `applyRollDice`, `applyEndTurn`, etc).
- `app/catana/Board.js`  
  Renders from `G.core` state; action overlays use `buildableNodes/Edges`.
- `app/catana/utils/playerView.js`  
  Maps core player state to UI colors/resources.

### UI context and dev surfaces
- `docs/agent/UI_CONTEXT.md`: fast routing guide for Catana UI work. Read this before UI, HUD, animation, audio, copy, or timing changes.
- `docs/agent/skills/catana-brand/SKILL.md`: Catana visual language and component guidance. Read before styling or building UI.
- `app/catana/dev/sandbox/`: real board sandbox for HUD, board, viewer-perspective, and anchor-dependent effect checks.
- `app/catana/dev/effects/`: isolated deterministic effect/audio replay surface.
- `app/catana/components/README.md`: local component context and common UI guardrails.

## Current status (Jan 9, 2026)
Working minimal loop:
- Initial placement (settlement + road) uses core rules.
- Roll dice distributes resources via core.
- Building roads/settlements uses core costs/rules.
- End turn wired via core `applyEndTurn`.
- Robber flow: rolling 7 routes to `moveRobber` stage; placing robber returns to `postRoll`.

What is **not** implemented in UI yet:
- Discard UI when a 7 is rolled and a player must discard.
- Robber steal UI (choose victim + transfer resource).
- Dev card UI, trading UI, city building UI.

## Tests
- Engine tests: `pnpm -C game-core test`
- App tests: `pnpm vitest run app/catana/__tests__/*.test.js`
- Root vitest alias: `vitest.config.ts` maps `@settlex/game-core` to `game-core/src/index.ts`

## How to run
- `pnpm dev` (Next UI)
- `pnpm -C game-core test` (engine)
- `pnpm lint` (UI lint)

## Known gaps / next steps
1) **Discard/robber flow UI** so 7s with pending discards don’t stall.
2) **Robber steal UI** (choose victim + random resource transfer).
3) **Trading UI** (bank/port; player trades later).
4) **Dev cards UI** and actions.
5) **Victory handling** (trigger end game when VP threshold reached).
6) Cleanup legacy folders: `app/catana/game`, `spec/`, `strategy/`, `utils/`.

## End-turn behavior (core)
`applyEndTurn` enforces:
- `state.phase === "normal"`
- `turn.hasRolled === true`
- `turn.phase === "postRoll"`
- `pendingDiscards.length === 0`
Then advances `currentPlayerId`, resets turn fields, and clears per-turn dev card counters.

## Robber behavior (core)
- `applyRollDice`: on 7 sets `turn.phase` to `robberDiscard` or `robberMove`.
- `applyMoveRobber`: validates friendly-robber rule and sets `robberTileId`.
- `getRobberVictims`: returns eligible victims by tile.

UI currently skips discard/steal; it only handles robber placement.

## Ruleset / variants
Ruleset is part of `GameState`. Default is `createStandardRuleset()`:
- Base game rules (VP to win, resource counts, build costs, trade rates, awards).
Variants can be added by creating new ruleset objects.

## TDD guidance for new features
- Write a failing test in `game-core/src/rules/*.test.ts` first.
- Run `pnpm -C game-core test -- path/to/test`.
- Implement minimal change.
- Re-run tests.

## Pointers for agents
- Don’t mutate UI-only state that duplicates core state.
- Engine is authoritative; UI should call core apply functions and render from `G.core`.
- Keep changes small and test-driven for core logic.
- For UI work, start at `docs/agent/UI_CONTEXT.md` and use the closest dev surface rather than relying on static source inspection alone.
