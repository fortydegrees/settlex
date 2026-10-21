# Slice E (Victory + Awards) Design

## Goal
Implement victory point calculation, Longest Road, and Largest Army awards with immediate win checks, using ruleset-configurable thresholds and standard tie behavior (current holder retains on ties).

## Architecture
Add a `rules/victory.ts` module that computes:
- Longest Road owner and length (per player)
- Largest Army owner (based on knights played)
- Victory points for a player
- Win check (VP >= ruleset.victoryPointsToWin)

Awards are stored in `GameState` and recomputed after actions that can change them. Victory points are derived on demand from board + awards + dev cards to avoid drift.

## Data Model
Extend `Ruleset`:
- `victoryPointsToWin: number` (default 10)
- `longestRoadMinLength: number` (default 5)
- `largestArmyMinKnights: number` (default 3)

Extend `GameState`:
- `awards: { longestRoadOwnerId: string | null; largestArmyOwnerId: string | null }`

## Longest Road Algorithm
Recommended approach: recompute via DFS for each player using only their roads.

Inputs:
- `state.roadsByEdgeId` + `board.edgeNodes` for graph
- `state.buildingsByNodeId` to block traversal at opponent settlements/cities

Rules:
- A path cannot reuse edges (edge-simple).
- Opponent buildings block traversal through that node (but paths may end there).
- Own buildings do not block traversal.
- Longest Road is awarded only if max length >= `ruleset.longestRoadMinLength`.
- If tied at max length:
  - Current holder keeps it if among tied.
  - Otherwise no one holds it.

## Largest Army
Based on `player.knightsPlayed` (already tracked).
- Award if highest knights >= `ruleset.largestArmyMinKnights`.
- Tie rule: current holder keeps it if among tied, else no owner.

## Victory Points
Derived per player:
- Settlements: 1 each
- Cities: 2 each
- VP dev cards: +1 each (from `player.devCards`)
- Awards: +2 each if owned

Win check is immediate after actions (via helper `checkWin`).

## Integration Points
Recompute awards after:
- Road placement (build road + Road Building dev card)
- Settlement/City placement (can break longest road)
- Knight play (largest army)

Expose helpers via `game-core/src/index.ts`.

## Testing
Unit tests should cover:
- Longest Road threshold (not awarded at 4, awarded at 5)
- Transfer to longer road
- Road broken by opponent settlement
- Tie behavior (holder keeps if tied)
- Largest Army threshold and tie rule
- Victory point calculation with awards and dev cards
