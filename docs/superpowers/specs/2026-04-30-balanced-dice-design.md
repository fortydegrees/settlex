# Balanced Dice Design

Date: 2026-04-30
Scope: Catana dice policy for duel mode and future custom game setup
Status: Approved for implementation

## Goal

Add a ruleset-level dice mode so duel games can use balanced dice while standard games keep normal random dice.

The initial public config surface should stay small:

```ts
diceMode: "random" | "balanced"
```

The balanced algorithm owns its tuning constants internally:

```ts
minimumCardsBeforeReshuffling = 13
recentRollMemory = 5
recentRollPenalty = 0.34
sevenBalancing = true
sevenStreakPenalty = 0.4
```

## Behavior

Random mode keeps the current `random.D6(2)` behavior.

Balanced mode uses a server-authoritative 36-card dice deck of exact dice pairs. Each draw:

1. Reshuffles the deck when fewer than 13 cards remain.
2. Computes base weights from remaining pair counts by total.
3. Reduces weights for totals in recent roll memory.
4. Adjusts the 7 weight based on per-player 7 imbalance and current 7 streaks.
5. Draws a total by weight, then draws one exact pair from that total.
6. Mutates serialized match dice state so the next roll sees the updated deck, recent totals, and 7 history.

Duel uses balanced dice by default. Standard 3p/4p stays random by default.

## State And Privacy

Balanced dice needs private serialized state in `G` because boardgame.io must persist it across turns. The state includes remaining deck pairs, recent totals, per-player 7 counts, and seven-streak tracking.

`playerView` should mask that internal state. Clients may see that balanced dice is enabled, but not the remaining deck or exact balancing counters. Players can still track public rolls manually; the mask is to avoid exposing a perfect internal snapshot or freezing implementation details as public API.

## Integration

- `game-core/src/ruleset.ts` adds `diceMode`.
- `game-core/src/rules/balancedDice.ts` owns the algorithm and constants.
- `app/catana/Game.js` initializes `G.diceState` for balanced rulesets.
- `app/catana/Moves.js` branches in `rollDice`: balanced helper or `random.D6(2)`.
- Match creation continues to stamp `modeId`, `rulesetId`, and `boardConfigId`; custom game setup can later expose the single dice-mode choice.

## Testing

Focused tests should cover:

- duel ruleset defaults to balanced dice and standard defaults to random,
- balanced helper draws from and mutates the deck deterministically,
- recent-roll penalty can suppress repeated totals,
- 7 balancing suppresses the player already ahead on 7s and boosts the other player,
- duel setup initializes private dice state,
- `playerView` masks private dice state,
- `rollDice` uses balanced state when the ruleset asks for it.
