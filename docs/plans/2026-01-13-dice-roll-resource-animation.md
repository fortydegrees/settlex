# Dice Roll Resource Animation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Animate resource cards flying from tiles to player containers after dice rolls, with visual feedback for robber-blocked tiles.

**Architecture:** Modify game-core to return distribution data alongside state mutations. UI triggers existing animation system with this data. Add red flash + robber pulse for blocked tiles.

**Tech Stack:** TypeScript (game-core), React + @react-spring/web (UI), bgio-effects plugin

---

## Task 1: Return distributions from applyResourceDistribution

### Files:
- Modify: `game-core/src/rules/turnFlow.ts:60-130`
- Test: `game-core/src/rules/turnFlow.test.ts`

### Step 1: Write the failing test

Add to `game-core/src/rules/turnFlow.test.ts` after line 62:

```typescript
it("returns distributions array with tileId, playerId, resource", () => {
  const state = createEmptyState(["0"]);
  state.bank.resources = [ResourceType.WOOD, ResourceType.WOOD];
  state.robberTileId = null;
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };

  const result = applyResourceDistribution(state, board, 8);

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.distributions).toEqual([
      { tileId: 1, playerId: "0", resource: ResourceType.WOOD }
    ]);
  }
});
```

### Step 2: Run test to verify it fails

Run: `pnpm -C game-core test -- --run -t "returns distributions array"`

Expected: FAIL - `distributions` property doesn't exist on result

### Step 3: Update return type and implementation

In `game-core/src/rules/turnFlow.ts`, replace the function (lines 60-130):

```typescript
export type Distribution = {
  tileId: number;
  playerId: string;
  resource: Resource;
};

export type DistributionResult =
  | { ok: true; distributions: Distribution[]; blockedTiles: number[] }
  | { ok: false; error: string };

export function applyResourceDistribution(
  state: GameState,
  board: BoardTopology,
  rollTotal: number
): DistributionResult {
  if (rollTotal === 7) {
    return { ok: true, distributions: [], blockedTiles: [] };
  }

  const requiredByResource: Record<string, number> = {};
  const allocations: Record<string, Resource[]> = {};
  const distributions: Distribution[] = [];
  const blockedTiles: number[] = [];

  for (const playerId of state.players) {
    allocations[playerId] = [];
  }

  for (const tile of board.tiles) {
    if (tile.tile.number !== rollTotal) {
      continue;
    }

    // Check if robber blocks this tile
    if (state.robberTileId !== null && tile.tile.id === state.robberTileId) {
      // Track blocked tile only if it would have produced
      const nodes = tile.tile.nodes ?? {};
      const hasBuildings = Object.values(nodes).some(
        (nodeId) => state.buildingsByNodeId[nodeId]
      );
      if (hasBuildings && tile.tile.resource) {
        blockedTiles.push(tile.tile.id);
      }
      continue;
    }

    if (!tile.tile.resource) {
      continue;
    }

    const resource = tile.tile.resource as Resource;
    const nodes = tile.tile.nodes ?? {};
    for (const nodeId of Object.values(nodes)) {
      const building = state.buildingsByNodeId[nodeId];
      if (!building) {
        continue;
      }
      const owner = building.ownerId;
      const amount = building.type === "city" ? 2 : 1;
      for (let i = 0; i < amount; i += 1) {
        allocations[owner].push(resource);
        distributions.push({
          tileId: tile.tile.id,
          playerId: owner,
          resource,
        });
      }
      requiredByResource[resource] = (requiredByResource[resource] ?? 0) + amount;
    }
  }

  if (state.ruleset.bank.finite) {
    for (const [resource, required] of Object.entries(requiredByResource)) {
      const available = state.bank.resources.filter((r) => r === resource).length;
      if (required > available) {
        // Remove from allocations
        for (const playerId of Object.keys(allocations)) {
          allocations[playerId] = allocations[playerId].filter(
            (r) => r !== resource
          );
        }
        // Remove from distributions
        const resTyped = resource as Resource;
        const toRemove = distributions.filter((d) => d.resource === resTyped);
        for (const d of toRemove) {
          const idx = distributions.indexOf(d);
          if (idx !== -1) distributions.splice(idx, 1);
        }
      }
    }
  }

  for (const [playerId, resources] of Object.entries(allocations)) {
    const player = state.playerStateById[playerId];
    if (!player) {
      continue;
    }
    for (const resource of resources) {
      player.resources.push(resource);
      if (state.ruleset.bank.finite) {
        removeCardOnce(state.bank.resources, resource);
      }
    }
  }

  return { ok: true, distributions, blockedTiles };
}
```

### Step 4: Run test to verify it passes

Run: `pnpm -C game-core test -- --run -t "returns distributions array"`

Expected: PASS

### Step 5: Commit

```bash
git add game-core/src/rules/turnFlow.ts game-core/src/rules/turnFlow.test.ts
git commit -m "feat(game-core): return distributions from applyResourceDistribution"
```

---

## Task 2: Add test for city producing 2 distributions

### Files:
- Test: `game-core/src/rules/turnFlow.test.ts`

### Step 1: Write the test

Add after the previous test:

```typescript
it("returns 2 distributions for a city", () => {
  const state = createEmptyState(["0"]);
  state.bank.resources = Array(5).fill(ResourceType.WOOD);
  state.robberTileId = null;
  state.buildingsByNodeId[1] = { ownerId: "0", type: "city" };

  const result = applyResourceDistribution(state, board, 8);

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.distributions).toHaveLength(2);
    expect(result.distributions).toEqual([
      { tileId: 1, playerId: "0", resource: ResourceType.WOOD },
      { tileId: 1, playerId: "0", resource: ResourceType.WOOD },
    ]);
  }
});
```

### Step 2: Run test to verify it passes

Run: `pnpm -C game-core test -- --run -t "returns 2 distributions for a city"`

Expected: PASS (implementation already handles this)

### Step 3: Commit

```bash
git add game-core/src/rules/turnFlow.test.ts
git commit -m "test(game-core): verify city produces 2 distributions"
```

---

## Task 3: Add test for robber-blocked tiles

### Files:
- Test: `game-core/src/rules/turnFlow.test.ts`

### Step 1: Write the test

```typescript
it("returns blocked tile when robber prevents distribution", () => {
  const state = createEmptyState(["0"]);
  state.bank.resources = Array(5).fill(ResourceType.WOOD);
  state.robberTileId = 1; // Robber on the wood tile
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };

  const result = applyResourceDistribution(state, board, 8);

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.distributions).toEqual([]);
    expect(result.blockedTiles).toEqual([1]);
  }
});
```

### Step 2: Run test to verify it passes

Run: `pnpm -C game-core test -- --run -t "returns blocked tile"`

Expected: PASS

### Step 3: Commit

```bash
git add game-core/src/rules/turnFlow.test.ts
git commit -m "test(game-core): verify blocked tiles returned"
```

---

## Task 4: Update applyRollDice to pass through distributions

### Files:
- Modify: `game-core/src/rules/turnFlow.ts:260-278`
- Test: `game-core/src/rules/turnFlow.test.ts`

### Step 1: Write the failing test

```typescript
import { applyRollDice } from "./turnFlow";

it("applyRollDice returns distributions from applyResourceDistribution", () => {
  const state = createEmptyState(["0"]);
  state.phase = "normal";
  state.turn.phase = "preRoll";
  state.bank.resources = Array(5).fill(ResourceType.WOOD);
  state.robberTileId = null;
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };

  const result = applyRollDice(state, board, 8);

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.distributions).toEqual([
      { tileId: 1, playerId: "0", resource: ResourceType.WOOD }
    ]);
  }
});
```

### Step 2: Run test to verify it fails

Run: `pnpm -C game-core test -- --run -t "applyRollDice returns distributions"`

Expected: FAIL - `distributions` doesn't exist on result

### Step 3: Update applyRollDice

In `game-core/src/rules/turnFlow.ts`, update the function:

```typescript
export type RollResult =
  | { ok: true; distributions: Distribution[]; blockedTiles: number[] }
  | { ok: false; error: string };

export function applyRollDice(
  state: GameState,
  board: BoardTopology,
  rollTotal: number
): RollResult {
  state.turn.hasRolled = true;
  state.turn.lastRollTotal = rollTotal;

  if (rollTotal === 7) {
    const pending = playersNeedingDiscard(state);
    state.turn.pendingDiscards = pending;
    state.turn.phase = pending.length > 0 ? "robberDiscard" : "robberMove";
    return { ok: true, distributions: [], blockedTiles: [] };
  }

  const distResult = applyResourceDistribution(state, board, rollTotal);
  if (!distResult.ok) {
    return distResult;
  }

  state.turn.phase = "postRoll";
  return { ok: true, distributions: distResult.distributions, blockedTiles: distResult.blockedTiles };
}
```

### Step 4: Run test to verify it passes

Run: `pnpm -C game-core test -- --run -t "applyRollDice returns distributions"`

Expected: PASS

### Step 5: Run all tests

Run: `pnpm -C game-core test`

Expected: All tests pass

### Step 6: Commit

```bash
git add game-core/src/rules/turnFlow.ts game-core/src/rules/turnFlow.test.ts
git commit -m "feat(game-core): applyRollDice returns distributions and blockedTiles"
```

---

## Task 5: Export new types from game-core

### Files:
- Modify: `game-core/src/index.ts`

### Step 1: Check current exports

Run: `grep -n "export" game-core/src/index.ts | head -20`

### Step 2: Add exports for new types

Add to exports:

```typescript
export type { Distribution, DistributionResult, RollResult } from "./rules/turnFlow";
```

### Step 3: Build game-core

Run: `pnpm -C game-core build`

Expected: Build succeeds

### Step 4: Commit

```bash
git add game-core/src/index.ts
git commit -m "feat(game-core): export Distribution types"
```

---

## Task 6: Register robberBlocked effect

### Files:
- Modify: `app/catana/Game.js:40-51`

### Step 1: Add the new effect

Update the effects config:

```javascript
const configuredEffectsPlugin = EffectsPlugin({
  effects: {
    distributeCardsFromTile: {
      create: (value) => value,
      duration: 2,
    },
    roll: {
      create: (value) => value,
      duration: 1.5
    },
    robberBlocked: {
      create: (value) => value,
      duration: 1.5
    }
  },
});
```

### Step 2: Commit

```bash
git add app/catana/Game.js
git commit -m "feat(ui): register robberBlocked effect"
```

---

## Task 7: Trigger animations in rollDice move

### Files:
- Modify: `app/catana/Moves.js:284-329`

### Step 1: Update rollDice move

Update the move to trigger effects after successful roll:

```javascript
export const rollDice = {
  canDo: () => console.log("hi roll dive"),
  move: (context) => {
    const { G, random, effects, events } = context;
    const roll = random.D6(2);
    G.diceRoll = roll;
    effects.roll([roll[0], roll[1]]);

    const diceScore = roll[0] + roll[1];
    const result = applyRollDice(G.core, G.coreTopology, diceScore);
    if (!result.ok) {
      console.log("Invalid dice roll");
      return;
    }

    // Trigger resource distribution animations
    if (result.distributions?.length > 0) {
      const cardAnims = result.distributions.map(d => ({
        tile: G.tiles.find(t => t.tile.id === d.tileId),
        playerID: d.playerId,
        resource: d.resource,
      }));
      effects.distributeCardsFromTile(cardAnims);
    }

    // Trigger robber-blocked feedback
    if (result.blockedTiles?.length > 0) {
      effects.robberBlocked(result.blockedTiles);
    }

    if (G.core.turn.phase.startsWith("robber")) {
      if (G.core.turn.phase === "robberDiscard") {
        const pendingPlayers = G.core.turn.pendingDiscards;
        const activePlayersConfig = {};

        pendingPlayers.forEach(pid => {
          activePlayersConfig[pid] = "robberDiscard";
        });

        events.setActivePlayers({
          value: activePlayersConfig,
        });

      } else {
        events.setStage("moveRobber");
      }
      return;
    }

    events.setStage("postRoll");
  },
};
```

### Step 2: Commit

```bash
git add app/catana/Moves.js
git commit -m "feat(ui): trigger distribution and blocked animations on dice roll"
```

---

## Task 8: Update distributeCardsFromTile listener to use card.resource

### Files:
- Modify: `app/catana/Board.js:202-256`

### Step 1: Update the effect listener

Change line 232 from:
```javascript
const cardResource = tile.tile.resource;
```

To:
```javascript
const cardResource = card.resource || tile.tile.resource;
```

This falls back to tile resource for backwards compatibility with initial settlement animation.

### Step 2: Commit

```bash
git add app/catana/Board.js
git commit -m "feat(ui): use card.resource in distribution animation"
```

---

## Task 9: Add isBlockedFlashing prop to Tile component

### Files:
- Modify: `app/catana/Tile.js:79-173`

### Step 1: Add prop and red flash variant

Update the Tile function signature to add the prop:

```javascript
export function Tile({
  id,
  coordinate,
  type,
  resource,
  size = 50,
  absolute,
  boardCenter,
  draggable,
  droppable,
  number,
  hoveredTiles,
  isFlashing,
  isBlockedFlashing,
  hasRobber,
  canPlaceRobber,
  moves,
}) {
```

Then update the flash div (around line 155-173) to handle both states:

```javascript
{(isFlashing || isBlockedFlashing) && (
  <div
    style={{
      content: "",
      display: "block",
      position: "absolute",
      background: isBlockedFlashing
        ? "rgba(200, 50, 50, 0.5)"
        : "rgba(255, 255, 255, 0.5)",
      width: "60px",
      height: "100%",
      top: "0",
      left: "-50%",
      opacity: 1,
      filter: "blur(30px)",
      willChange: "transform",
      animation: "flash 1s 1",
    }}
  />
)}
```

### Step 2: Commit

```bash
git add app/catana/Tile.js
git commit -m "feat(ui): add red flash variant for robber-blocked tiles"
```

---

## Task 10: Add robberBlocked effect listener in Board

### Files:
- Modify: `app/catana/Board.js`

### Step 1: Add state for blocked tiles

Near line 109 where `flashingTiles` is defined, add:

```javascript
const [blockedFlashingTiles, setBlockedFlashingTiles] = useState([]);
```

### Step 2: Add effect listener

After the `distributeCardsFromTile` listener (around line 256), add:

```javascript
useEffectListener(
  "robberBlocked",
  (blockedTileIds) => {
    setBlockedFlashingTiles(blockedTileIds);
    setTimeout(() => {
      setBlockedFlashingTiles([]);
    }, 1500);
  },
  []
);
```

### Step 3: Pass prop to Tile component

Around line 323 where `isFlashing` is passed, add:

```javascript
isFlashing={flashingTiles.includes(tile.id)}
isBlockedFlashing={blockedFlashingTiles.includes(tile.id)}
```

### Step 4: Commit

```bash
git add app/catana/Board.js
git commit -m "feat(ui): handle robberBlocked effect with red tile flash"
```

---

## Task 11: Add robber pulse animation

### Files:
- Modify: `app/catana/Tile.js`
- Create: `app/catana/Tile.css` (add keyframes if not exists)

### Step 1: Add CSS keyframes for robber pulse

In `app/catana/Board.css` (where flash keyframes exist), add:

```css
@keyframes robberPulse {
  0% { transform: translateX(-60%) scale(1); }
  50% { transform: translateX(-60%) scale(1.3); }
  100% { transform: translateX(-60%) scale(1); }
}
```

### Step 2: Update robber Image in Tile.js

Update the robber Image (around line 175-182):

```javascript
{hasRobber && (
  <Image
    src={robberIcon}
    alt="Robber"
    style={{
      position: 'absolute',
      transform: `translateX(-60%)`,
      animation: isBlockedFlashing ? 'robberPulse 0.5s ease-in-out 2' : 'none'
    }}
    width={size / 1.5}
    height={size / 1.5}
  />
)}
```

### Step 3: Commit

```bash
git add app/catana/Tile.js app/catana/Board.css
git commit -m "feat(ui): add robber pulse animation on blocked tiles"
```

---

## Task 12: Manual testing

### Step 1: Start dev server

Run: `pnpm dev`

### Step 2: Test scenarios

1. **Normal distribution:** Roll dice that matches tiles with settlements - cards should animate from tiles to player containers
2. **City distribution:** Roll for a city - should see 2 cards animate from the tile
3. **Multiple players:** Roll that gives resources to both players - both should receive animated cards
4. **Robber blocked:** Place robber on a tile, roll its number - tile should flash red, robber should pulse, no cards animate
5. **No production:** Roll a number with no settlements - no animations

### Step 3: Fix any issues found

If issues found, address them before final commit.

### Step 4: Final commit

```bash
git add -A
git commit -m "feat: dice roll resource distribution animation

- game-core returns distributions and blockedTiles from applyRollDice
- UI triggers card animations for all receiving players
- Robber-blocked tiles flash red with robber pulse animation"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Return distributions from applyResourceDistribution | turnFlow.ts, test |
| 2 | Test city produces 2 distributions | test |
| 3 | Test robber-blocked tiles | test |
| 4 | Update applyRollDice to pass through | turnFlow.ts, test |
| 5 | Export new types | index.ts |
| 6 | Register robberBlocked effect | Game.js |
| 7 | Trigger animations in rollDice move | Moves.js |
| 8 | Use card.resource in listener | Board.js |
| 9 | Add isBlockedFlashing prop | Tile.js |
| 10 | Add robberBlocked listener | Board.js |
| 11 | Add robber pulse animation | Tile.js, Board.css |
| 12 | Manual testing | - |
