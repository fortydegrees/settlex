# Dice Roll Resource Animation Design

## Overview

Add animations for resource distribution after dice rolls, reusing the existing animation system (tile flash + card pop-out) from initial settlement placement.

## Decisions

- **Data source:** Game-core returns allocations (server-authoritative)
- **Timing:** All tiles flash simultaneously, cards animate in parallel
- **Multiple tiles:** Each tile spawns its own cards independently
- **Cities:** Animate 2 cards from the tile (not 1 card with "x2")
- **Robber-blocked:** Red flash on tile + robber icon pulses

## Game-Core Changes

### File: `game-core/src/rules/turnFlow.ts`

Modify `applyResourceDistribution` to return distributions:

```typescript
type DistributionResult = {
  ok: true;
  distributions: Array<{
    tileId: string;
    playerId: string;
    resource: Resource;
  }>;
  blockedTiles: Array<{ tileId: string }>;
} | { ok: false; error: string };
```

- Each entry = one card animated from one tile
- Cities produce two entries (same tileId, same resource)
- `blockedTiles` = tiles that would have produced but robber blocked them

`applyRollDice` passes through the distributions, or returns empty arrays for robber (7) rolls.

## UI Changes

### File: `app/catana/Moves.js`

After `applyRollDice`, trigger animation effects:

```javascript
const result = applyRollDice(G.core, G.coreTopology, diceScore);
if (!result.ok) return;

if (result.distributions?.length > 0) {
  const cardAnims = result.distributions.map(d => ({
    tile: G.tiles.find(t => t.tile.id === d.tileId),
    playerID: d.playerId,
    resource: d.resource,
  }));
  effects.distributeCardsFromTile(cardAnims);
}

if (result.blockedTiles?.length > 0) {
  effects.robberBlocked(result.blockedTiles);
}
```

### File: `app/catana/Board.js`

- Update `useEffectListener("distributeCardsFromTile", ...)` to use `card.resource` instead of `tile.tile.resource`
- Add `useEffectListener("robberBlocked", ...)` to handle blocked tile flashing

### File: `app/catana/Tile.js`

- Add `isBlockedFlashing` prop with red flash variant (`rgba(200, 50, 50, 0.5)`)

### File: `app/catana/Game.js`

Register new effect:

```javascript
robberBlocked: {
  create: (value) => value,
  duration: 1.5,
}
```

### Robber Component

Add CSS pulse animation when its tile is in the blocked list.

## Files Changed

| File | Change |
|------|--------|
| `game-core/src/rules/turnFlow.ts` | Return distributions and blockedTiles |
| `game-core/src/rules/turnFlow.test.ts` | Test returned distributions |
| `app/catana/Moves.js` | Trigger effects after dice roll |
| `app/catana/Board.js` | Handle new effect, use card.resource |
| `app/catana/Tile.js` | Add red flash variant |
| `app/catana/Game.js` | Register robberBlocked effect |
| Robber component | Add pulse animation |

## What Stays the Same

- `CardAnimContainer` component
- `PlayerActionContainer` / `CardIcon` target elements
- White flash CSS keyframes
- `bgio-effects` plugin setup

## Edge Cases

- **Robber (7):** Empty distributions, no animation
- **Robber-blocked tiles:** Red flash + robber pulse, no cards
- **Bank scarcity:** Engine handles allocation limits

## Testing

- Unit tests in game-core for distribution correctness
- Manual testing for animation timing and visual polish
