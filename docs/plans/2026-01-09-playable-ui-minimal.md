# Playable UI (Minimal) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the UI playable for base Catan using `G.core` as the only source of truth (placement, roll non‑7, build roads/settlements/cities, end turn).

**Architecture:** UI renders from `G.core` + `G.coreTopology` + `G.tiles`. All moves call core rule functions and update `G.core`; legacy state (`G.players`, `G.bank`, `G.nodes`, `G.edges`) is removed. UI derives player colors from core player order via a local color map.

**Tech Stack:** Next.js (app router), boardgame.io client, game-core (TypeScript).

---

### Task 1: Add UI player mapping helper

**Files:**
- Create: `app/catana/utils/playerView.js`
- Modify: `app/catana/Board.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/components/PlayerActionContainer.js`

**Step 1: Write the helper**

Create `app/catana/utils/playerView.js`:

```js
const UI_PLAYER_COLORS = ["red", "blue", "green", "orange"];

export function buildPlayerViewMap(core) {
  const map = {};
  if (!core?.players) return map;
  core.players.forEach((id, index) => {
    const state = core.playerStateById?.[id];
    map[id] = {
      id,
      color: UI_PLAYER_COLORS[index % UI_PLAYER_COLORS.length],
      resources: state?.resources ?? [],
      roadsRemaining: state?.roadsRemaining ?? 0,
      settlementsRemaining: state?.settlementsRemaining ?? 0,
      citiesRemaining: state?.citiesRemaining ?? 0
    };
  });
  return map;
}
```

**Step 2: Replace `G.players` lookups**

In `Board.js` / `GameScreen.js` / `PlayerActionContainer.js`, replace `G.players` references with `playerViewMap` or `playerViews` derived from `G.core`.

**Step 3: Manual check (no tests)**

Confirm there are no runtime errors when rendering the board screen.

**Step 4: Commit**

```bash
git add app/catana/utils/playerView.js app/catana/Board.js app/catana/GameScreen.js app/catana/components/PlayerActionContainer.js
git commit -m "refactor(ui): derive player views from core"
```

---

### Task 2: Refactor Moves.js to call core rules only

**Files:**
- Modify: `app/catana/Moves.js`

**Step 1: Update debug + bank helpers**

Update `DEBUG_takeCardsFromBank` and `takeCardsFromBank` to use:
`G.core.bank.resources` and `G.core.playerStateById[playerID].resources`.

**Step 2: Update placement + build moves**

In `placeSettlement` / `placeRoad`:
- If `initialPlacement`, call `applyPlaceSettlement` / `applyPlaceRoad`.
- If normal phase, call `applyBuildSettlement` / `applyBuildRoad`.
- Remove manual resource removal and `G.players` mutations.

Add `placeCity` move to call `applyBuildCity` (normal phase only).

**Step 3: Update rollDice**

Replace manual resource distribution with:

```js
const roll = random.D6(2);
const total = roll[0] + roll[1];
applyRollDice(G.core, G.coreTopology, total);
G.diceRoll = roll;
effects.roll(roll);
if (total === 7) {
  // temporary: skip robber UI and continue
  events.setStage("postRoll");
  return;
}
// optional: compute card animations for visual effect only
events.setStage("postRoll");
```

**Step 4: Update updateValids**

Use `buildableNodes` / `buildableEdges` based on `G.core` and placement flag.

**Step 5: Manual check (no tests)**

Ensure placement, roll (non‑7), and building work without errors.

**Step 6: Commit**

```bash
git add app/catana/Moves.js
git commit -m "refactor(ui): route moves through core rules"
```

---

### Task 3: Update Board rendering to core state

**Files:**
- Modify: `app/catana/Board.js`

**Step 1: Switch to `G.core`**

Replace:
- `G.robberTile` → `G.core.robberTileId`
- `G.players[ctx.currentPlayer].color` → `playerViewMap[ctx.currentPlayer].color`

Replace `playerById` map with `buildPlayerViewMap(G.core)`.

**Step 2: Handle action nodes for main-phase building**

Extend `playerAction` handling to show buildable nodes for settlement/city using
`buildableNodes(G.core, G.coreTopology, playerId, { initialPlacement: false })`.

**Step 3: Manual check**

Confirm placement highlights still work and buildable road overlays appear when selecting “road”.

**Step 4: Commit**

```bash
git add app/catana/Board.js
git commit -m "refactor(ui): render board from core state"
```

---

### Task 4: Update PlayerActionContainer for core state

**Files:**
- Modify: `app/catana/components/PlayerActionContainer.js`

**Step 1: Use core player data**

Replace `player.resourceCards` and piece counts with core equivalents:
- `player.resources`
- `roadsRemaining`, `settlementsRemaining`, `citiesRemaining`

**Step 2: Simplify actions**

Remove dev card action for now. Use:
- Road → `setPlayerAction("placeRoad")`
- Settlement → `setPlayerAction("placeSettlement")`
- City → `setPlayerAction("placeCity")`

**Step 3: Update action enable logic**

Use `player.resources` and core piece counts for gating. Keep turn‑phase checks based on `ctx.activePlayers[ctx.currentPlayer]`.

**Step 4: Manual check**

Verify action buttons enable/disable correctly after rolling dice.

**Step 5: Commit**

```bash
git add app/catana/components/PlayerActionContainer.js
git commit -m "refactor(ui): update action dock to core state"
```

---

### Task 5: Clean up Game.js setup

**Files:**
- Modify: `app/catana/Game.js`

**Step 1: Remove legacy state**

Remove `players`, `bank`, `settings` from setup return; keep:
`core`, `coreTopology`, `tiles`, `ports`, `diceRoll`, `robberTileId`.

Update placement end condition to:

```js
endIf: ({ G, ctx }) => ctx.turn > G.core.players.length * 2
```

**Step 2: Manual check**

Ensure game initializes and phases still run.

**Step 3: Commit**

```bash
git add app/catana/Game.js
git commit -m "refactor(ui): remove legacy setup state"
```

---

### Task 6: Verify and document

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Step 1: Manual verification**

Run:
```bash
pnpm dev
```

Verify:
- Initial placement works (settlement + road).
- Non‑7 roll distributes resources (core state updates).
- Build road/settlement/city works and consumes resources.
- End turn cycles.

**Step 2: Update agent docs**

Note the UI now consumes `G.core` only and legacy `G.players`/`G.bank` removed.

**Step 3: Commit**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs(agent): note playable ui migration"
```

