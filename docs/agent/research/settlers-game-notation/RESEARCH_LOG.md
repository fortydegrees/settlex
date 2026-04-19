# Settlers Game Notation Research Log

Date: 2026-04-17

## Prompt

Design a Catan-like match format for Settlex that can support public postgame replay and stats. The format should handle hidden information such as development-card purchases, robber steals, discards, random setup, bots, disconnects, forced actions, and future variants.

The user explicitly wants the record to be durable and shareable from a public match link, not browser state.

## Working Thesis

Do not start with a cute PGN-like text notation.

Start with a versioned machine-readable match record that preserves:

- the initial setup,
- player order and ruleset,
- the authoritative command stream,
- the resolved hidden outcomes,
- enough semantic facts to build stats without replaying UI state,
- visibility rules for live redaction versus postgame reveal.

Then generate human-readable notation, public logs, replay frames, and stats from that canonical record.

## Existing Settlex Context

Settlex already has most of the durability boundary needed for a first pass:

- `server/archive/archiveFinishedMatch.js` archives live bgio metadata, initial state, final state, and the bgio action log into Postgres.
- `lib/server/replays/buildReplayFrames.js` rebuilds replay frames by replaying the archived bgio log through the reducer.
- `app/catana/Game.js` uses `playerView` to hide `core.devDeck`, opponent resources, opponent dev cards, and opponent current-turn dev-card purchases during live play.
- `app/catana/Moves.js` appends public-safe `G.gameLog` entries, but those entries intentionally omit hidden details.
- `app/catana/Moves.js` already has access to many authoritative outcomes at move time:
  - dice rolls,
  - resource distributions,
  - shortages,
  - exact discard selections,
  - bought dev card type,
  - monopoly claimed resource and amount,
  - build locations,
  - trade payloads.

The current archive is good enough for board replay, but it is not yet a deliberate long-term analytical record. It also depends on keeping a reducer-compatible game implementation around forever.

## Prior Settlex Plans

The April 7 accounts/profiles/replay design explicitly deferred deep analytics and advanced per-resource stats. It did establish the important boundary:

- finished games are public,
- finished games are archived forever,
- replay pages read from Postgres, not live bgio state,
- live bgio state can be disposable after archival.

The April 8 match-lifecycle design makes `/g/:matchID` the long-term match permalink and says archived mode should render read-only postgame/replay after live cleanup.

This stats/notation work should build on that direction rather than create a parallel storage path.

## Source Notes

### Settlers Game Notation, dnmfarrell

Source: https://github.com/dnmfarrell/Settlers-Game-Notation

SGN is the closest prior art. It is JSON, not prose notation. The README says the goal is to capture "what happened" while allowing some actions to be implied. A valid document is newline-separated JSON messages.

Message shape:

```json
["1", "RD", { "result": 4 }]
```

The v1 schema uses:

- `DM` define map,
- `RD` roll dice,
- `MR` move robber,
- `ST` steal,
- `TR` trade,
- `BS` build settlement,
- `BC` build city,
- `BR` build road,
- `BD` buy development card,
- `PD` play development card.

Useful lessons:

- JSON was chosen because game servers and clients need a common data language.
- Map definition is part of the game log, because Catan has randomized setup.
- Resource deltas in trades are balanced explicitly.
- The format is intentionally lean, but it sometimes relies on inference.

Risk for Settlex:

- For stats and long-lived archive quality, too much inference is dangerous. We should avoid needing to replay old engine code just to know what hidden card was drawn, which resource was stolen, or which player discarded what.

### SGN Issue #5, Tile Identifiers

Source: https://github.com/dnmfarrell/Settlers-Game-Notation/issues/5

The proposal was to identify resource-producing tiles with the resource code they produce, for example `B` for hills/brick and `O` for mountains/ore. The motivation was simpler consumers and one-character codes.

The maintainer response is the important part:

- this is simpler,
- but it reduces flexibility for future tile/resource additions,
- and the spec should probably include what resource a tile produces in the map definition instead.

Settlex takeaway:

- Use stable tile identity plus explicit tile metadata.
- Do not make the primary coordinate/id depend on current resource semantics.
- Human display notation may use resource letters as a convenience, but the canonical record should not.

### HSGN, Stef Gijsberts

Source: https://gist.github.com/Stef-Gijsberts/434b8a281ae157a187748933c7c921fd

HSGN is explicitly for humans, especially live pen-and-paper annotation. It contrasts itself with SGN by saying SGN is for computers and HSGN is for people.

Useful ideas:

- compact resource formulas like `B2O3W5`,
- compact action codes like `MRb`, `BD`, `PK`, `PM(O)`,
- turn notation such as `p1: 8, BRmn.`,
- crossroad and edge coordinates based on touching hexes.

Risk for Settlex:

- It is easy to write, but it intentionally omits detail. For example, a dev card buy is just `BD`, and robber steal records a victim but not necessarily the stolen resource. That is not enough for public postgame stats that reveal hidden information.

### Hexil Action Notation And State Notation

Sources:

- https://github.com/hexil-org/hexer/blob/main/docs/hexil_action_notation.md
- https://github.com/hexil-org/hexer/blob/main/docs/hexil_state_notation.md

Hexil formalizes a human/computer action notation. It keeps the compact action idea, but adds more rigorous grammar:

- rolls can include individual dice, for example `R(2+3)`,
- unknown values can be marked with `?`,
- bought development card can be `BD?` or `BDm`,
- stealing can be `S?1` or include the stolen resource,
- coordinates use axial coordinates rendered in spreadsheet style, with vertex and edge suffixes.

Hexil State Notation separately records:

- map,
- placements,
- distribution,
- turn number,
- turn flags.

Settlex takeaway:

- Separating action notation from state notation is useful.
- Unknown-value syntax is useful for live/public logs, but the archive should preserve the real value with a visibility rule.
- A compact notation can be generated from the canonical JSON later.

### PGN

Source: https://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm

PGN works because chess has a standard board, deterministic legal moves, perfect information, and a compact mature move notation. Its file has:

- tag pairs for metadata,
- movetext for legal moves,
- a termination marker that matches the result tag.

The spec distinguishes import/export and encourages simple scanning. It also supports optional annotations and recursive variations.

Settlex takeaway:

- The metadata plus movetext split is a good product model.
- PGN itself is not a good storage model for Catan, because Catan needs randomized setup, hidden hands, random outcomes, simultaneous forced actions, and variants.
- The closest analogue is not one notation layer, but `headers + setup + event/fact stream + result`.

### SGF

Source: https://www.red-bean.com/sgf/ff1_3/ff3.html

SGF stores game trees as nodes with properties. It is extensible: unknown private properties can be skipped, and game-specific properties can be defined.

Useful ideas:

- root properties identify game and setup,
- nodes hold move properties and comments,
- variations are explicit tree branches,
- private extensions are allowed.

Settlex takeaway:

- Extensibility and skip-unknown behavior are worth copying.
- Tree variations are less important for Settlex v1, because we need records of actual games more than analysis branches.

### Catanatron

Sources:

- https://catanatron.readthedocs.io/en/latest/catanatron.html
- https://catanatron.readthedocs.io/en/latest/catanatron.models.html
- https://github.com/bcollazo/catanatron

Catanatron has a very relevant split:

- `Action` represents intent,
- `ActionRecord` stores the action plus a `result`,
- the result carries nondeterministic outcomes such as dice, discarded resources, stolen card, or bought development card,
- accumulators can consume actions and compute aggregate statistics.

This is the strongest external confirmation for the Settlex direction.

Settlex takeaway:

- Treat the player command as intent.
- Treat the server's resolved result as canonical fact.
- Let stats be projections/accumulators over those facts, not counters sprinkled through random gameplay functions.

## Design Decisions So Far

### 1. Canonical Record First, Human Notation Later

The durable format should be JSON. A human notation can be generated from it later.

Reason:

- JSON can carry hidden outcomes, board setup, variants, actor metadata, and visibility rules.
- A compact text notation is useful for blog posts, sharing, and maybe manual review, but it is too lossy as the primary archive.

### 2. Use Commands Plus Facts

The record should store both:

- command/intention: what move was submitted,
- facts/results: what the server actually resolved.

This avoids a false choice:

- command logs are compact and replayable,
- fact logs are stable and stats-friendly.

Facts should be the primary input to `buildMatchStats(record)`.

### 3. Hidden Information Is A First-Class Field

Do not bolt hidden-state reveal onto stats later.

Each fact should carry visibility metadata, for example:

```json
{
  "type": "dev.bought",
  "playerId": "0",
  "cardType": "victoryPoint",
  "visibility": {
    "live": "seat",
    "seats": ["0"],
    "postgame": "public"
  }
}
```

This lets live clients see redacted/public projections while public postgame pages can reveal truth.

### 4. Coordinates Should Be Stable, Not Clever

The canonical record should use stable board topology:

- tile ids,
- axial tile coordinates,
- node ids plus node coordinates,
- edge ids plus edge coordinates.

Resource letters can be used in human notation, but not as canonical identity.

### 5. Stats Are Projections

Stats should be built by a pure function, probably shaped like:

```ts
buildMatchStats(matchRecord): MatchStats
```

The resulting stats can be stored in Postgres for fast page loads, but they should be rebuildable from the match record when the stat model changes.

### 6. Existing Replay Still Matters

The bgio `initialState + log` archive remains useful for frame-by-frame board playback.

The new match record should complement it, then eventually become the portable long-term record. For v1, it can be stored alongside the existing replay payload instead of replacing it immediately.

## Open Questions

- Should the first implementation store `match_record_json` and `stats_json` as new columns on `archived_match_replays`, or create a new `archived_match_records` table?
- Do we want every semantic action to emit resource ledger facts, or should resource ledgers be derived only in `buildMatchStats`?
- Should public postgame reveal all hidden facts by default, or should some facts remain private/admin-only forever?
- Should a compact text export be called SGN, SMR text, or something else to avoid confusion with the existing Settlers-Game-Notation project?

## Current Recommendation

Call the durable format **Settlex Match Record**.

Use it as the canonical event/fact archive:

- `headers`
- `ruleset`
- `actors`
- `setup`
- `entries`
- `result`
- `integrity`
- `extensions`

Then build these derived products from it:

- public live log,
- private/reconnect state,
- postgame stats,
- replay annotations,
- optional SGN-like human notation.

## Red-Team Critique Pass

After drafting the first version, I ran an independent Gemini critique pass through PAL. The useful findings were:

- Do not emit separate public and hidden facts for the same outcome. That can desynchronize projections. Keep one authoritative fact and generate redacted views from it.
- Use one `dev.played` fact with `cardType`, then model the card's effects as normal facts. This avoids ambiguity between "played a card" and "the card changed resources/robber/builds".
- Model bank/port trades with `ratio` and optional `portId`, not just generic maritime trade.
- Award changes must allow `newOwnerId: null`, especially for Longest Road returning to no owner.
- The live visibility model should leave room for future audience roles such as spectator/admin without breaking old parsers.

I folded these into the schema proposal.
