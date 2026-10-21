# Settlex Match Record V1 Proposal

Status: draft research proposal
Date: 2026-04-17

## Summary

Settlex should store a finished game as a versioned **Settlex Match Record** rather than as a PGN-like notation string.

The record is a canonical JSON document. It contains setup metadata, stable board references, player order, submitted commands, and authoritative server-resolved facts, including facts that were hidden during live play. Public logs, replay annotations, stats, and a compact human notation should be generated from that record.

This keeps the design extensible without blocking the first stats pass.

## Goals

- Support public postgame stats from a durable match link.
- Preserve hidden facts such as bought dev-card type and stolen resource.
- Keep live views redacted while allowing postgame reveal.
- Allow old games to be reprocessed when new stats are added.
- Avoid scattering stat counters through gameplay functions.
- Keep board replay compatible with the existing archived bgio log.
- Leave room for variants, bots, timeouts, forced moves, and disconnect outcomes.

## Non-Goals For V1

- A full text notation parser.
- Manual pen-and-paper notation as the primary archive.
- Replacing boardgame.io as the live game engine.
- Replacing the existing archived replay frame builder immediately.
- Query-optimized global leaderboards.

## Core Concepts

### Command

The move submitted to the game engine.

Example:

```json
{ "move": "buyDevCard", "args": [] }
```

Commands are good for replay, audit, and debugging, but not always enough for stats because the important result may be hidden or random.

### Fact

The server-authoritative outcome of a command.

Example:

```json
{
  "type": "dev.bought",
  "playerId": "0",
  "cardType": "victoryPoint",
  "visibility": { "live": "seat", "seats": ["0"], "postgame": "public" }
}
```

Facts are the primary input to stats projections.

### Projection

A derived read model built from the record.

Examples:

- dice histogram,
- resources produced,
- dev cards bought,
- robber steals,
- discards caused by 7s,
- VP timeline.

### Presentation Log

The public, readable feed shown during the game.

Settlex already has `G.gameLog`. It should remain a presentation surface, not the canonical archive for hidden stats.

## Recommended Top-Level Shape

```json
{
  "schema": "settlex.match-record.v1",
  "schemaVersion": 1,
  "recordId": "match_abc123",
  "headers": {
    "game": "catana",
    "matchId": "abc123",
    "startedAt": "2026-04-17T12:00:00.000Z",
    "finishedAt": "2026-04-17T13:10:00.000Z",
    "rulesetId": "standard",
    "boardConfigId": "standard-official",
    "engine": {
      "name": "settlex",
      "version": "unknown"
    }
  },
  "actors": [
    {
      "seatId": "0",
      "kind": "human",
      "usernameSnapshot": "Alice",
      "accountId": "acct_1"
    },
    {
      "seatId": "1",
      "kind": "bot",
      "botKey": "puffer"
    }
  ],
  "ruleset": {
    "victoryPoints": 10,
    "friendlyRobber": { "enabled": true, "vpThreshold": 2 },
    "extensions": {}
  },
  "setup": {
    "playerOrder": ["0", "1", "2", "3"],
    "board": {
      "coordinateSystem": "axial",
      "tiles": [],
      "nodes": [],
      "edges": [],
      "ports": []
    },
    "hidden": {
      "devDeck": ["knight", "victoryPoint", "monopoly"]
    }
  },
  "entries": [],
  "result": {
    "winnerSeatId": "0",
    "reason": "victoryPoints",
    "finalVictoryPoints": { "0": 10, "1": 7, "2": 8, "3": 5 }
  },
  "integrity": {
    "initialStateHash": null,
    "finalStateHash": null
  },
  "extensions": {}
}
```

## Board References

The canonical record should store stable topology, not just UI labels.

Recommended tile shape:

```json
{
  "id": "tile:0",
  "coord": { "q": 0, "r": 0 },
  "kind": "forest",
  "produces": "lumber",
  "number": 8
}
```

Recommended node shape:

```json
{
  "id": "node:12",
  "touches": ["tile:0", "tile:1", "tile:2"],
  "notation": "d4n"
}
```

Recommended edge shape:

```json
{
  "id": "edge:12-18",
  "nodes": ["node:12", "node:18"],
  "touches": ["tile:0", "tile:1"],
  "notation": "d4w"
}
```

Why store `notation` if ids are canonical?

- It gives a stable bridge to future human-readable exports.
- It makes records easier to inspect.
- It avoids requiring every consumer to reconstruct display coordinates.

The primary key remains `id`. Resource codes such as `B`, `G`, `L`, `O`, `W` are metadata, not identity.

## Entry Shape

An entry groups one submitted command with all server-resolved facts produced by that command.

```json
{
  "seq": 42,
  "turn": 11,
  "phase": "main",
  "actorId": "0",
  "source": "player",
  "command": {
    "move": "rollDice",
    "args": []
  },
  "facts": [
    {
      "type": "dice.rolled",
      "dice": [3, 4],
      "total": 7,
      "visibility": { "live": "public", "postgame": "public" }
    }
  ]
}
```

`source` values:

- `player`
- `bot`
- `timer`
- `system`
- `debug`

`visibility.live` values:

- `public`: visible to everyone during live play,
- `seat`: visible only to listed seats during live play,
- `none`: not visible to clients during live play.

`visibility.postgame` values:

- `public`: visible in public postgame/replay/stats,
- `none`: retained only for internal/admin/debug use.

Future readers should tolerate extra visibility keys. That leaves room for later roles such as `spectator`, `admin`, or tournament observer without breaking v1 records. Unknown live audiences should be treated as not visible by default.

Important rule:

- do not emit parallel hidden and public facts for the same gameplay outcome.

If a live client needs a redacted summary, generate that from the one canonical fact as a presentation view. The existing `G.gameLog` can still contain public-safe copy, but `buildMatchStats()` must consume only authoritative facts.

If a fact needs partial redaction, use one of these patterns:

- store the full fact with `visibility.live = "none"` and generate live public copy from `G.gameLog`,
- or store a single fact with an optional `views.livePublic` payload that is explicitly presentation-only.

Example:

```json
{
  "type": "dev.monopoly",
  "playerId": "0",
  "resource": "ore",
  "taken": [
    { "fromPlayerId": "1", "amount": 2 },
    { "fromPlayerId": "2", "amount": 1 }
  ],
  "visibility": { "live": "none", "postgame": "public" },
  "views": {
    "livePublic": {
      "playerId": "0",
      "resource": "ore",
      "totalTaken": 3
    }
  }
}
```

Projection rule:

- stats read `type`, `playerId`, `resource`, and `taken`,
- public live UI may read `views.livePublic`,
- no projection should count both.

## Initial Event Vocabulary

V1 should keep the vocabulary small but intentionally cover hidden-state stats.

### Match And Turn

- `match.started`
- `turn.started`
- `turn.ended`
- `match.ended`
- `player.resigned`
- `player.forfeited`
- `forced.action`

### Dice And Resource Movement

- `dice.rolled`
- `resource.produced`
- `resource.gained`
- `resource.spent`
- `resource.transferred`
- `resource.shortage`
- `resource.blocked_by_robber`

Example:

```json
{
  "type": "resource.produced",
  "playerId": "2",
  "tileId": "tile:6",
  "nodeId": "node:18",
  "resource": "ore",
  "amount": 2,
  "source": "dice",
  "visibility": { "live": "public", "postgame": "public" }
}
```

### Building

- `build.road`
- `build.settlement`
- `build.city`

Example:

```json
{
  "type": "build.road",
  "playerId": "0",
  "edgeId": "edge:12-18",
  "cost": { "brick": 1, "lumber": 1 },
  "free": false,
  "visibility": { "live": "public", "postgame": "public" }
}
```

### Development Cards

- `dev.bought`
- `dev.played`

Do not use separate fact types such as `dev.knight` or `dev.monopoly` for the act of playing the card. Use one `dev.played` fact with `cardType`, then emit ordinary downstream facts for the card's effect.

Examples:

- Knight emits `dev.played`, then `robber.moved`, then maybe `robber.stole`.
- Year of Plenty emits `dev.played`, then `resource.gained` with `source: "dev.yearOfPlenty"`.
- Monopoly emits `dev.played`, then `dev.monopoly` or `resource.transferred` facts with per-victim details.
- Road Building emits `dev.played`, then `build.road` facts with `free: true` and `source: "dev.roadBuilding"`.

Example:

```json
{
  "type": "dev.bought",
  "playerId": "0",
  "cardType": "monopoly",
  "deckIndex": 0,
  "visibility": { "live": "seat", "seats": ["0"], "postgame": "public" }
}
```

Example played fact:

```json
{
  "type": "dev.played",
  "playerId": "0",
  "cardType": "monopoly",
  "visibility": { "live": "public", "postgame": "public" }
}
```

Example Monopoly effect fact:

```json
{
  "type": "dev.monopoly",
  "playerId": "0",
  "resource": "ore",
  "taken": [
    { "fromPlayerId": "1", "amount": 2 },
    { "fromPlayerId": "2", "amount": 1 }
  ],
  "visibility": { "live": "public", "postgame": "public" }
}
```

If live play should not reveal per-victim Monopoly losses publicly, keep this one full fact as the source of truth, set `live` to `none`, and generate public copy from `views.livePublic` or `G.gameLog`. Do not emit a second public fact.

### Robber

- `robber.activated`
- `robber.discard_required`
- `robber.discarded`
- `robber.moved`
- `robber.stole`
- `robber.skipped`

Example roll-7 discard:

```json
{
  "type": "robber.discarded",
  "playerId": "2",
  "resources": { "ore": 2, "wool": 1 },
  "reason": "rolled_7",
  "visibility": { "live": "public", "postgame": "public" }
}
```

Example steal:

```json
{
  "type": "robber.stole",
  "thiefId": "0",
  "victimId": "2",
  "resource": "ore",
  "visibility": {
    "live": "seat",
    "seats": ["0", "2"],
    "postgame": "public"
  }
}
```

### Trades

- `trade.bank`
- `trade.domestic.proposed`
- `trade.domestic.accepted`
- `trade.domestic.rejected`
- `trade.domestic.cancelled`
- `trade.completed`

`trade.bank` covers default 4:1 bank trades, 3:1 generic-port trades, and 2:1 resource-port trades.

Example:

```json
{
  "type": "trade.bank",
  "playerId": "1",
  "give": { "ore": 2 },
  "receive": { "brick": 1 },
  "ratio": 2,
  "portId": "port:ore:0",
  "visibility": { "live": "public", "postgame": "public" }
}
```

For v1, if domestic trading is not fully implemented, record only the trade actions Settlex supports today.

### Awards And Scores

- `award.longest_road.changed`
- `award.largest_army.changed`
- `score.changed`
- `vp.hidden.changed`
- `vp.visible.changed`

These are useful for timeline stats, but some can be derived. They can be added after the core hidden-state facts.

Award ownership must support `null` because Longest Road can return to the bank/no-owner state if a settlement breaks an opponent road network and nobody else qualifies.

Example:

```json
{
  "type": "award.longest_road.changed",
  "previousOwnerId": "2",
  "newOwnerId": null,
  "visibility": { "live": "public", "postgame": "public" }
}
```

## Stats Projection Contract

Stats should be generated by a pure projection:

```ts
buildMatchStats(record: SettlexMatchRecord): MatchStats
```

The projection should consume `entries[].facts`, not UI logs.

Recommended first stats:

- dice roll counts by total,
- exact dice pair counts,
- total turns by player,
- resources produced by player/resource,
- resources gained by source,
- resources spent by sink,
- bank shortages by roll/resource/player,
- builds by player/type,
- dev cards bought by player/type,
- dev cards played by player/type,
- robber moves by player,
- robber steals by thief/victim/resource,
- times each player discarded because of a 7,
- resources discarded because of a 7,
- trades by player/type/resource,
- final VP breakdown.

`stats_json` can be archived for fast page rendering, but it must be rebuildable from the match record.

## Storage Recommendation

Do not overload `G.gameLog` or the existing public presentation log.

Preferred archive storage:

```sql
CREATE TABLE archived_match_records (
  archived_match_id UUID PRIMARY KEY REFERENCES archived_matches(id) ON DELETE CASCADE,
  schema_version TEXT NOT NULL,
  record_json JSONB NOT NULL,
  stats_schema_version TEXT NOT NULL,
  stats_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Why a new table?

- It avoids changing the semantics of `archived_match_replays`.
- It lets replay payload and analytical record evolve separately.
- It gives a clean place to reprocess `stats_json`.
- It can later gain indexes without touching replay reads.

Acceptable simpler first implementation:

- add `match_record_json`, `match_record_schema_version`, and `stats_json` to `archived_match_replays`.

The new table is cleaner if we expect this to grow.

## Live-State Recommendation

During live play, store the private fact stream on authoritative server state only:

```js
G.matchRecord = {
  schema: "settlex.match-record.live-v1",
  entries: []
};
```

Then update `playerView` to remove or redact it for live clients.

Important:

- `G.gameLog` remains public/presentation-oriented.
- `G.matchRecord` or `G.matchFacts` is private canonical data.
- After `ctx.gameover`, postgame pages can reveal postgame-public facts.

For boardgame.io compatibility, the first implementation may store only a minimal `G.matchFacts` array and assemble the final full record during archival.

## Why Not Frame Diffing?

Frame diffing is useful for backfill, tests, and debugging.

It should not be the main architecture because:

- hidden values may already be redacted in client views,
- intent can be ambiguous from state alone,
- simultaneous forced actions are hard to interpret,
- future engine changes could alter derived snapshots,
- stats would depend on fragile inference.

The server already knows the truth at move time. Capture that truth explicitly.

## Human-Readable Export

A later text export can look SGN-like:

```text
[Format "Settlex-Match-Record"]
[Ruleset "standard"]
[Board "standard-official"]
[Players "0=Alice,1=Bob,2=Chandra,3=Puffer"]
[Result "0"]

1. 0:R(3+4); 2:A(O2W); 0:M d4; 0:S(O)2.
2. 1:R(2+3); 1:B R d4w; 1:BDm.
```

This is an export, not the primary archive.

Unknown values can be represented in live/public notation:

```text
1. 1:BD?.
1. 0:S(?)2.
```

The canonical record still stores the postgame truth.

## Implementation Sketch For A Later Coding Pass

1. Add a small `appendMatchFact(G, ctx, entry)` helper.
2. Add tests that `playerView` redacts live match facts.
3. Emit facts from the easiest authoritative moves first:
   - `rollDice`,
   - `discardResources`,
   - `buyDevCard`,
   - the current bank/port trade move (`maritimeTrade` today),
   - builds.
4. Adjust core robber result to return `victimId` and `stolenResource` reliably.
5. Adjust Monopoly result to return per-victim amounts if we want per-victim stats.
6. Build `buildMatchRecord({ liveRecord, participants })` at archive time.
7. Build `buildMatchStats(record)`.
8. Store record and stats in Postgres during `archiveFinishedMatch`.
9. Render a small postgame stats panel from archived `stats_json`.

## Key Tradeoffs

### JSON Versus Text

JSON is less romantic than PGN, but it carries the data we actually need. Text can be generated later.

### Commands Versus Facts

Commands are necessary for replay. Facts are necessary for hidden outcomes and stats. Store both.

### Explicit Facts Versus Derived Facts

Explicit facts avoid fragile inference. The cost is adding fact emission near authoritative move resolution. Keep those emissions structured and helper-driven so this does not become ad hoc analytics.

### New Table Versus New Columns

A new table is cleaner and more extensible. New columns are faster for a small MVP. Since stats will grow, the table is the better long-term shape.

### Public Postgame Reveal

The user preference is that public stats may reveal hidden information after the game. The format should support that directly through visibility metadata instead of relying on special cases in the UI.

## Recommendation

Implement the first stats framework around Settlex Match Record v1:

- private authoritative facts during live play,
- full canonical record at archive time,
- pure stats projection from facts,
- stored stats for fast public postgame pages,
- optional human-readable notation later.

This gives us the basic stats now without boxing us into a shallow counter system.
