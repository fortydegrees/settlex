# Designing SGN For Catan Is Not Just Chess PGN With Hexes

Chess PGN works because chess is unusually friendly to notation.

The board is standard. The game is deterministic. Both players see all pieces. If a PGN says `Nf3`, a chess program can usually reconstruct what happened from the starting position and the legal move rules. Metadata goes in tag pairs, moves go in movetext, and the result closes the record.

Catan is different.

The board is randomized. Dice create random outcomes. Development cards are hidden. Hands are hidden. The robber creates random steals. A 7 can force multiple players to discard outside the active player's normal flow. Trades can involve private offers and public outcomes. Bots, disconnects, timers, forced actions, and house rules all matter if the record is supposed to explain the game later.

So the right first step is not a beautiful text notation. The right first step is a durable match record.

## The Useful Split

The clean mental model is:

1. The command: what a player tried to do.
2. The fact: what the server says actually happened.
3. The projection: what we compute from those facts.

For example, `buyDevCard` is a command. The fact is that player 0 bought a `victoryPoint` card from the top of the development deck. During live play that card type is visible only to player 0. After the game, public stats may reveal it.

That is not a UI log problem. It is not a browser-state problem. It is an archive problem.

## Why Counters Are The Wrong Foundation

The tempting approach is to increment counters inside gameplay functions:

- `rollDice` increments dice totals,
- `buyDevCard` increments dev-card counts,
- `discardResources` increments discard stats.

That works until we invent a new stat next month.

If the old game only stored counters, we cannot ask new questions of it. If the old game stored facts, we can re-run a new `buildMatchStats()` projection over the same record.

This is why the stats layer should look less like hand-written counters and more like a read model built from a canonical history.

## What Existing Notations Teach Us

The old Settlers Game Notation project already chose JSON and tried to capture "what happened" as newline-separated messages. That is the right instinct for computers.

HSGN and Hexil show the opposite side: humans benefit from compact codes like `BD?`, `R(3+4)`, `S?1`, and resource formulas such as `(B2OW)`.

PGN shows how valuable a metadata-plus-moves structure can be. SGF shows how useful extensible game-tree properties can be.

Catanatron has the most directly useful engineering pattern: it distinguishes an action from an action record, and the record carries nondeterministic results like dice, discarded cards, stolen cards, and bought development cards.

The Settlex design should borrow from all of these, but it should not copy any of them directly.

## The Proposed Shape

The durable format should be called Settlex Match Record.

At the top level it contains:

- headers,
- actors,
- ruleset,
- setup,
- entries,
- result,
- integrity data,
- extensions.

Each entry groups a submitted command with server-resolved facts:

```json
{
  "seq": 42,
  "turn": 11,
  "actorId": "0",
  "source": "player",
  "command": { "move": "rollDice", "args": [] },
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

Hidden facts use the same shape:

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

That one field, `visibility`, is what keeps the architecture honest. It means we are not pretending hidden facts do not exist during live play. We are preserving them and choosing the correct view for the current audience.

There is one important rule: never create separate hidden and public facts for the same outcome. A Monopoly play should not produce one full private fact and one public summary fact that stats might accidentally count twice. Store one authoritative fact, then generate any live redacted copy as a presentation view.

## Coordinates Should Be Boring

A notation can use clever resource letters or compact hex labels. The archive should not.

The archive should store stable board topology:

- tile ids,
- axial coordinates,
- node ids,
- edge ids,
- optional human notation labels.

A tile's resource belongs in tile metadata:

```json
{
  "id": "tile:0",
  "coord": { "q": 0, "r": 0 },
  "kind": "forest",
  "produces": "lumber",
  "number": 8
}
```

That keeps the format flexible if variants add resources, tiles, ports, or different maps.

## What Stats Become Easy

Once facts are recorded, the first stats are straightforward:

- dice roll graph,
- exact dice pair counts,
- resources produced by player and resource,
- resources lost to shortages,
- builds by type,
- development cards bought by type,
- development cards played,
- robber moves,
- robber steals by thief and victim,
- times each player discarded because of a 7,
- resources discarded because of a 7,
- maritime and player trade totals,
- final VP breakdown.

More advanced stats can come later:

- expected production versus actual production,
- robber damage,
- trade efficiency,
- longest road timeline,
- hidden VP reveal timeline,
- resource flow graphs.

The important part is that old games can be reprocessed when those ideas arrive.

## How This Fits Settlex Today

Settlex already archives finished matches to Postgres. It stores initial state, final state, and the boardgame.io log. That should stay because it powers replay.

The missing piece is a canonical fact record stored beside the replay payload.

The clean long-term storage is a new `archived_match_records` table with:

- schema version,
- record JSON,
- stats schema version,
- stats JSON.

During live play, Settlex can append private facts on authoritative server state. `playerView` redacts those facts for live clients. When the match ends, archival writes the full record and runs `buildMatchStats(record)`.

Public postgame pages read the stored stats. If the stats model changes, a background job can rebuild stats from the same record.

## The Final Principle

Do not make the notation carry the architecture.

Make the archive correct first. Make stats a projection. Make public logs a view. Make human notation an export.

That gives Settlex the PGN-like feeling people want, without inheriting PGN's assumptions about a game Catan simply is not.
