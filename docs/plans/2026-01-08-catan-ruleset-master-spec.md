# Catan Ruleset Master Spec

**Goal:** Define a complete, testable ruleset spec for base Catan with a configurable 1v1 variant, designed for engine implementation and future expansion.

**Scope:** Base game only (no expansions), but with extensible ruleset parameters.

---

## 1) Ruleset Model (Resolved, Stored in `G`)

We will store a **fully resolved** ruleset object in game state (`G.ruleset`). It is immutable after setup to keep replays and reconnects deterministic.

**Schema (example):**
```ts
Ruleset = {
  id: "standard" | "duel" | "custom",
  maxPlayers: number,
  victoryPointsToWin: number,
  discardLimit: number,
  friendlyRobber: { enabled: boolean; vpThreshold: number },
  allowPlayerTrades: boolean,
  boardGeneration: "official-random" | "balanced" | "random" | "custom",
  bank: {
    finite: boolean,
    resourceCounts: Record<Resource, number>,
    devCardCounts: Record<DevCardType, number>
  },
  pieceLimits: { roads: number; settlements: number; cities: number },
  buildCosts: { road: Cost; settlement: Cost; city: Cost; devCard: Cost },
  portsEnabled: boolean,
  devCardsEnabled: boolean
}
```

**Default base ruleset** (standard):
- 4 players, VP=10, discard=7
- Friendly robber: off
- Player trades: allowed
- Board gen: official random
- Bank: finite classic counts
- Piece limits: classic counts

**Duel ruleset** (1v1):
- 2 players, VP=15, discard=9
- Friendly robber: enabled, threshold=2 (robber cannot be **placed** onto tiles touching any player with **≤ 2 VPs**)
- Player trades: disallowed
- Board gen: balanced

Ruleset validation happens at setup (reject invalid combinations).

---

## 2) Turn Flow & Phases

Core manages an explicit phase machine, enforced server‑side. UI derives legal actions from phase.

**Setup / Placement**
- Snake order.
- Each placement turn: `placeSettlement` → `placeRoad`.
- On the **second** settlement, grant resources for adjacent tiles (excluding desert), using standard bank rules.

**Main Turn**
- **Pre‑roll window:** Player may play **at most one** dev card (VP cards excluded). Dev cards **cannot** be played the same turn they were bought.
- `rollDice` is required once per turn.
- If roll ≠ 7: distribute resources → trade/build.
- If roll = 7: enter **Robber sequence**:
  1) `discard` subphase for players over `discardLimit`.
  2) `moveRobber` subphase (respect friendly‑robber placement rule if enabled).
  3) `stealCard` subphase if an eligible target exists.
- **Trade/Build phase:** player may trade and build in any order.
- **End turn:** explicit `endTurn` action once roll + robber subphases (if any) are complete.

---

## 3) Board Generation & Topology

Board generation is a ruleset option. All generators yield a resolved tiles array; core builds a shared topology from tiles.

**Board representation**
- Tiles stored with axial/cube coordinates.
- Tile types: `Land`, `Port`, `Water`, `Empty`.
- Land tiles have `resource` and `number` (desert has `number=null`).
- Ports are explicit tiles, with resource type (or `Any`) and node attachments.

**Generators**
- `official-random`:
  1) Shuffle resources based on spec counts.
  2) Shuffle numbers (2–12 excluding 7) and assign to land tiles.
  3) Enforce **no 6/8 adjacent** (retry/backtracking until valid).
- `balanced`: use current BalancedBoard generator.
- `random`: fully shuffle resources/numbers without adjacency constraints.
- `custom`: accept a fully specified tile list (future).

---

## 4) Resources, Bank, Distribution

**Bank (default finite)**
- Classic counts: 19 of each resource; standard dev deck counts.
- Ruleset may override counts or set `finite=false`.

**Distribution**
- For each matching number tile (not blocked by robber):
  - Settlement: +1 resource
  - City: +2 resources
- **If bank lacks enough of a resource to satisfy all eligible players, distribute none of that resource** (classic rule).

**Initial placement resources**
- On second placement settlement, grant adjacent resources (excluding desert) using bank rules.

**Robber & discard**
- On 7 roll: players with > `discardLimit` discard half (rounded down).
- Robber blocks resource production on its tile.
- Friendly robber: only affects **placement**, not existing robber location.

---

## 5) Build Costs & Placement Rules

Core enforces **resource costs** and **piece limits**. UI only calls moves.

**Classic costs**
- Road: 1 Brick + 1 Wood
- Settlement: 1 Brick + 1 Wood + 1 Sheep + 1 Wheat
- City: 2 Wheat + 3 Ore
- Dev card: 1 Sheep + 1 Wheat + 1 Ore

**Piece limits (default)**
- Roads: 15
- Settlements: 5
- Cities: 4

**Placement rules**
- Settlement: empty node, distance rule (no adjacent buildings), connected to player network (except initial placement).
- City: must upgrade player’s own settlement.
- Road: connects to player’s road or building; initial placement road must connect to just‑placed settlement.

**Errors** should be explicit: `illegal-settlement`, `illegal-road`, `insufficient-resources`, `no-pieces-left`.

---

## 6) Development Cards

**Deck composition (standard)**
- 14 Knight
- 5 Victory Point
- 2 Road Building
- 2 Year of Plenty
- 2 Monopoly

**Rules**
- Buy only if you can pay; deck must not be empty.
- Play **at most one** dev card per turn (VP excluded).
- Cannot play a dev card on the same turn it was purchased.
- Dev cards may be played **before or after** rolling dice.

**Effects**
- Knight: move robber + steal (if possible); track for Largest Army.
- Road Building: place two free roads (still must be legal placements).
- Year of Plenty: take any two resources from bank (if bank lacks, take none).
- Monopoly: choose resource, take all of that resource from other players.
- Victory Point: adds hidden VP; can be revealed anytime.

---

## 7) Trading & Ports

**Maritime trades**
- 4:1 bank (any resource)
- 3:1 generic port (if player has a settlement/city on a 3:1 port)
- 2:1 specific port (if player has a settlement/city on matching resource port)

**Player trades**
- Standard: allowed
- Duel: disallowed (bank/port only)

**Timing**
- Trades only in trade/build phase.
- **No trading pre‑roll**, even during dev‑card window.
- No trading during placement or robber discard subphases.

---

## 8) Victory Conditions

Victory occurs when total VPs ≥ `ruleset.victoryPointsToWin` at the end of a player action.

**VP sources**
- Settlements: 1
- Cities: 2
- Victory Point dev cards: 1 (hidden)
- Largest Army: 2 (transferable)
- Longest Road: 2 (transferable)

Awards update immediately after relevant actions:
- Road build → recompute Longest Road
- Knight played → recompute Largest Army

---

## Implementation Slices (next step)

A) Turn flow + dice + resource distribution + robber
B) Build costs & placement enforcement (incl. piece limits)
C) Dev cards
D) Trading & ports
E) Victory conditions + awards
F) Ruleset config + validation (standard + duel)
G) Board generation variants (official random with 6/8 separation)

Each slice should be implemented test‑first in `game-core` and wired into UI incrementally.
