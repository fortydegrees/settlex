# Player View Model (Future Plan)

## Goal
Keep UI thin and deterministic by deriving UI-facing data from core game state,
so alternate UIs (2D, 3D, replay viewers) can render consistently without
re-implementing rules.

## Problem
Some UI decisions depend on turn state and rules (ex: dev card playability).
When the UI computes these ad hoc, it risks drift, duplicate logic, and
refresh/reconnect inconsistencies.

## Concept
Introduce a small "player view" layer in game-core that returns derived,
UI-safe data for a given playerId. It is a pure function of core state.

Example shape (illustrative):
```
type PlayerView = {
  id: string;
  resources: Resource[];
  devCards: DevCardType[];
  devCardPlayableCounts: Record<DevCardType, number>;
  can: {
    buyDevCard: boolean;
    buildRoad: boolean;
    buildSettlement: boolean;
    buildCity: boolean;
    trade: boolean;
  };
};
```

## Incremental Path
1. Add small, focused selectors in core (ex: `getPlayableDevCardCounts`).
2. Optionally group selectors under `game-core/src/views/`.
3. Migrate UI pieces one at a time to the view data.
4. Consider wiring boardgame.io `playerView` to this derived model later.

## Non-goals (for now)
- No refactor of all UI immediately.
- No persistence changes (view is derived at render time).
- No new engine rules.

## Benefits
- One source of truth for derived rules.
- Refresh/reconnect correctness (view recomputed from state).
- Easier future UI clients (3D, mobile, replay tooling).
