# Playable UI (Minimal) Design

## Goal
Make the UI playable for base Catan without dev cards or trading UI: placement, roll (non‑7), build roads/settlements/cities, end turn. UI should be a thin projection of `G.core` + `G.coreTopology` to keep the engine authoritative and future 3D swaps easy.

## Architecture & Data Flow
`G.core` is the only source of truth for game state (players, bank, turn, robber). The UI renders board tiles from `G.tiles`, and ownership from `G.core.buildingsByNodeId` / `G.core.roadsByEdgeId`. Buildable highlights are derived via `buildableNodes` / `buildableEdges` and stored in `G.valids` as a UI helper. Moves become thin adapters: call core rules, update `G.core`, and then recompute `G.valids` and UI stage transitions.

To keep 3D UI swaps easy later, all view computation should be isolated to selectors/derivers (either in `game-core` or `app/catana/utils`). The UI should not encode rules or side effects beyond calling moves and rendering derived state.

## UI Behavior & Scope
**Included:** placement phase (snake order), roll dice (non‑7), build road/settlement/city, end turn, basic VP updates for win checks (core already computes awards/VPs).

**Excluded for now:** dev cards UI, trading UI, robber/discard UI. When a 7 is rolled, we will temporarily skip robber handling and advance to post‑roll so the game doesn’t stall (explicit TODO for next slice).

Moves will:
- Call `applyPlaceSettlement` / `applyPlaceRoad` for placement.
- Call `applyRollDice` with `ctx.random.D6(2)`; on non‑7, resources distribute via core and UI animation uses the resulting state.
- Call `applyBuildRoad` / `applyBuildSettlement` / `applyBuildCity` and recompute highlights.
- End turn via core turn‑flow helper (or minimal `turn` reset if needed).

## Error Handling & Testing
Core functions return `{ ok: false, error }` on illegal actions. The UI should log and no‑op on errors for now. Core tests already cover rules; UI validation is manual for this slice: run `pnpm dev`, place initial settlements/roads, roll dice, build, and end turn. Optional: later add a Playwright smoke test.

## Rollout
1) Move UI to read from `G.core` only (remove dependence on `G.players`, `G.bank`, `G.settings`).
2) Convert Moves to core calls only.
3) Keep `G.valids` as derived UI state; recompute on each action.
4) Add a clear TODO for the 7/robber flow to implement next.

