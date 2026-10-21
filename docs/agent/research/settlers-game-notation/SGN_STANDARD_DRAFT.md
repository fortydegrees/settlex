# Settlers Game Notation Draft Standard

Date: 2026-04-17

Status: working draft

Working name: **SGN**. The name may need to change later because an earlier open-source Settlers Game Notation project already exists.

## Purpose

SGN is a portable notation for recording games of Catan-like island colonization games.

It is designed to answer one practical question:

> Can a rules-aware engine reconstruct and validate this game from the record?

SGN is not a database schema, a UI event stream, a full state ledger, or an anti-tamper audit protocol. It is a game record.

The core format is JSON. A compact human text notation can be generated later, but JSON is the canonical interchange format.

## Design Philosophy

SGN follows the same broad idea that makes chess PGN useful:

- record the important moves,
- let the rules engine derive legal consequences,
- keep the reduced export small,
- allow optional annotations without making them part of the core record.

Catan needs more information than chess because the game has randomized setup, dice, hidden hands, hidden development cards, robber steals, discards, trades, and variant rules.

The goal is still not to log everything.

The core rule is:

> Reduced SGN records the non-derivable facts of the game. A declared ruleset and validator derive the rest.

## Non-Goals

Reduced SGN does not try to:

- prove a game was not tampered with,
- record every resource/card movement as a flow ledger,
- store a snapshot after every event,
- force a particular random-number generator,
- force a pre-shuffled development deck implementation,
- replay trade negotiation UX,
- preserve live chat,
- describe every possible expansion in the base vocabulary.

Those can be optional profiles or separate companion records.

## Document Shape

A reduced SGN document has this shape:

```json
{
  "format": "sgn",
  "version": 1,
  "rules": {},
  "players": [],
  "setup": {},
  "randomSources": {},
  "events": [],
  "result": {}
}
```

Strict reduced export should use stable top-level field order:

1. `format`
2. `version`
3. `rules`
4. `players`
5. `setup`
6. `randomSources`
7. `events`
8. `result`

`randomSources` may be omitted when unused.

`result` may be omitted or marked incomplete for unfinished games.

## Required Top-Level Fields

### `format`

Must be `"sgn"` for this draft.

```json
"format": "sgn"
```

### `version`

The SGN major version.

```json
"version": 1
```

Major versions may break compatibility. Minor/extension behavior should be expressed through `rules.modules` or optional annotations.

### `rules`

Declares the rules the validator must use.

```json
{
  "base": "catan.base.v1"
}
```

With modules:

```json
{
  "base": "catan.base.v1",
  "modules": ["seafarers.v1"]
}
```

With custom overrides:

```json
{
  "base": "catan.base.v1",
  "overrides": {
    "costs": {
      "road": "B2L2"
    }
  }
}
```

Rules, not events, define deterministic consequences such as build costs, starting resources, production, award rules, hand limits, and victory conditions.

### `players`

Declares seat order.

The minimal form is an array:

```json
"players": ["p1", "p2", "p3", "p4"]
```

The richer form is an array of objects:

```json
[
  { "id": "p1", "name": "Alice" },
  { "id": "p2", "name": "Bob" },
  { "id": "p3", "kind": "bot", "name": "Puffer" },
  { "id": "p4", "name": "Dana" }
]
```

Reduced validators only need stable player ids and order. Names, account ids, bot ids, and site metadata are annotations.

### `setup`

Declares the initial board and any non-standard initial state.

The final board setup is canonical. Seeds and generator names are optional provenance.

```json
{
  "board": {
    "hexes": [
      { "at": "h:0,0", "terrain": "desert" },
      { "at": "h:1,0", "terrain": "mountains", "number": 8 },
      { "at": "h:0,1", "terrain": "forest", "number": 6 }
    ],
    "ports": [
      { "at": "e:0,2:w", "type": "generic", "ratio": 3 },
      { "at": "e:2,0:nw", "type": "ore", "ratio": 2 }
    ],
    "robber": "h:0,0"
  }
}
```

Optional generator provenance:

```json
{
  "generation": {
    "algorithm": "settlex-balanced-v2",
    "seed": "abc123"
  }
}
```

A validator must use the explicit board. It must not require the generator seed to recreate the board.

### `events`

An ordered array of resolved game events.

Array order is canonical. Reduced SGN does not require sequence numbers.

```json
[
  { "type": "roll", "p": "p1", "dice": [3, 5] },
  { "type": "build.road", "p": "p1", "at": "e:0,1:w" }
]
```

Optional sequence numbers may appear in annotated/import forms, but strict reduced export should omit them unless the standard later decides otherwise.

### `result`

Declares the game result.

```json
{
  "winner": "p1",
  "reason": "victoryPoints"
}
```

Optional:

```json
{
  "winner": "p1",
  "reason": "victoryPoints",
  "vp": {
    "p1": 10,
    "p2": 7,
    "p3": 8,
    "p4": 5
  }
}
```

A validator can derive final VP under the ruleset. If `vp` is present, it is checkable metadata.

## Notation Primitives

### Player Ids

Examples use `p1`, `p2`, `p3`, `p4`.

Any stable string id is allowed if it is listed in `players`.

### Resource Codes

Base game resource codes:

| Code | Resource |
| ---- | -------- |
| `B` | brick |
| `G` | grain |
| `L` | lumber |
| `O` | ore |
| `W` | wool |

Resource formulas use resource codes followed by optional positive counts. Count `1` is omitted.

Canonical order is:

```text
B G L O W
```

Examples:

```text
L
O2W
B2GLO
```

### Development Card Codes

Base game development card codes:

| Code | Card |
| ---- | ---- |
| `KN` | knight |
| `MO` | monopoly |
| `RB` | road building |
| `VP` | victory point |
| `YP` | year of plenty |

Modules may define additional card namespaces.

### Coordinates

The exact coordinate grammar should be its own sub-spec. This draft uses a provisional axial coordinate family:

```text
h:q,r        hex
v:q,r:n      north vertex of hex q,r
v:q,r:s      south vertex of hex q,r
e:q,r:ne     northeast edge of hex q,r
e:q,r:nw     northwest edge of hex q,r
e:q,r:w      west edge of hex q,r
```

Examples:

```text
h:0,0
v:0,0:n
e:0,0:w
```

Why only `ne`, `nw`, and `w` edges?

Each physical edge can be represented by one of those directions from one of its adjacent hexes. A canonical exporter should choose the normalized representation.

Open item:

- vertex normalization needs the same level of precision as edge normalization.
- Hexil's coordinate notation is a serious candidate for the final coordinate sub-spec.

## Validation Model

An SGN validator is a rules-aware replay engine.

It should:

1. Parse the document.
2. Validate the top-level shape.
3. Load the declared `rules`.
4. Build initial state from `setup`.
5. Initialize declared `randomSources`.
6. Iterate through `events` in array order.
7. For each event:
   - verify the event is legal in the current state,
   - apply the event,
   - derive deterministic consequences,
   - consume or verify random/hidden outcomes.
8. Verify `result` if present.

This is the key design boundary:

- SGN records replay facts.
- The validator enforces rules.

## What Core SGN Records

Core SGN records facts a validator cannot safely derive:

- board setup,
- player order,
- dice rolls,
- settlement/road/city placement choices,
- trade choices,
- development-card buys when the draw outcome is not otherwise declared,
- development-card plays and chosen parameters,
- discard choices,
- robber movement choices,
- robber steal outcomes,
- resignations/forfeits,
- final result.

## What Core SGN Does Not Record

Core SGN does not record deterministic consequences:

- resource production after ordinary rolls,
- resource spending for normal builds/buys,
- bank inventory after every event,
- hand counts after every event,
- visible VP after every event,
- Longest Road recalculation after every road/build,
- Largest Army recalculation after every knight,
- ordinary end turns when implied by the next player's turn.

These can be derived from setup, rules, and event history.

## Randomness

SGN supports two ways to represent hidden/random outcomes:

1. Source-based randomness.
2. Outcome-based randomness.

The standard should support both so engines are not forced into one internal model.

### Source-Based Randomness

The record declares a random source, then events consume it.

```json
{
  "randomSources": {
    "devCards": {
      "type": "drawSequence",
      "items": ["KN", "VP", "MO", "KN"]
    }
  },
  "events": [
    { "type": "dev.buy", "p": "p1" },
    { "type": "dev.buy", "p": "p2" }
  ]
}
```

The validator gives `KN` to `p1` and `VP` to `p2`.

This is clean for engines that pre-shuffle a development deck. It is also useful for audit-grade exports.

### Outcome-Based Randomness

The event records the resolved outcome.

```json
{ "type": "dev.buy", "p": "p1", "draw": "KN" }
```

This is clean for engines that randomly choose from remaining cards at buy time.

Validator rule:

- if `draw` is present, apply that draw,
- if a draw sequence is also present, verify consistency,
- if neither `draw` nor a usable source is present, the record is incomplete for full replay.

### Dice

Dice are recorded as outcomes:

```json
{ "type": "roll", "p": "p1", "dice": [3, 5] }
```

This does not force an RNG implementation.

### Robber Steals

Robber steals should record the resolved stolen resource:

```json
{
  "type": "robber.steal",
  "p": "p1",
  "from": "p3",
  "card": "O"
}
```

Reason:

- the stolen card comes from hidden runtime state,
- reconstructing it from setup alone would require much heavier hand-order/random-source machinery,
- recording the resolved card is lean and portable.

## Event Vocabulary

This is the draft base vocabulary. Modules may add event types.

### Setup Placements

Initial placement can use the same build events as normal play.

```json
{ "type": "build.settlement", "p": "p1", "at": "v:0,0:n" }
{ "type": "build.road", "p": "p1", "at": "e:0,0:w" }
```

The validator knows these are setup placements because the game has not entered normal turn flow yet.

If an importer cannot infer phase cleanly, it may include:

```json
{ "type": "build.settlement", "p": "p1", "at": "v:0,0:n", "phase": "setup" }
```

Strict reduced export should omit `phase` when the validator can derive it.

### Roll

```json
{ "type": "roll", "p": "p2", "dice": [3, 4] }
```

The validator derives:

- production,
- whether the robber/discard flow starts,
- whether the game waits for robber movement.

### Discard

```json
{ "type": "discard", "p": "p3", "cards": "O2W" }
```

The validator checks:

- a discard is currently required,
- `p3` is one of the players who must discard,
- the count is correct,
- `p3` has those cards.

Discard groups are not required in reduced SGN. Event order and validator state are enough:

```json
[
  { "type": "roll", "p": "p2", "dice": [3, 4] },
  { "type": "discard", "p": "p3", "cards": "O2W" },
  { "type": "discard", "p": "p4", "cards": "BGL" },
  { "type": "robber.move", "p": "p2", "to": "h:1,0" }
]
```

### Robber Move

```json
{ "type": "robber.move", "p": "p2", "to": "h:1,0" }
```

The validator checks that robber movement is currently legal and that the destination is valid.

### Robber Steal

```json
{ "type": "robber.steal", "p": "p2", "from": "p3", "card": "O" }
```

The validator checks:

- `p3` is a legal victim,
- `p3` has an ore,
- the current robber flow allows a steal.

If there is no legal victim, omit `robber.steal`.

### Build

```json
{ "type": "build.road", "p": "p1", "at": "e:0,0:w" }
{ "type": "build.settlement", "p": "p1", "at": "v:0,0:n" }
{ "type": "build.city", "p": "p1", "at": "v:0,0:n" }
```

The validator derives:

- cost,
- piece availability,
- legal placement,
- Longest Road effects,
- victory point changes.

### Bank Or Port Trade

```json
{ "type": "trade.bank", "p": "p1", "give": "O4", "receive": "B" }
```

The validator derives whether this is a 4:1 bank trade, a 3:1 generic port trade, or a 2:1 resource port trade from:

- player port access,
- declared rules,
- resources given.

An annotated import may include `ratio` or `port`, but reduced export should omit them if derivable.

Example annotation:

```json
{
  "type": "trade.bank",
  "p": "p1",
  "give": "O2",
  "receive": "B",
  "annotations": {
    "ratio": 2,
    "port": "ore"
  }
}
```

### Player Trade

```json
{
  "type": "trade.player",
  "p": "p1",
  "with": "p2",
  "give": "LW",
  "receive": "O"
}
```

The event records the completed trade, not every negotiation message.

Offer, reject, counteroffer, and accept events may exist in an annotated UX profile, but they are not required for reduced game replay.

### Development Card Buy

Outcome-based:

```json
{ "type": "dev.buy", "p": "p1", "draw": "KN" }
```

Source-based:

```json
{
  "randomSources": {
    "devCards": {
      "type": "drawSequence",
      "items": ["KN", "VP"]
    }
  },
  "events": [
    { "type": "dev.buy", "p": "p1" }
  ]
}
```

The validator checks:

- player can afford a dev card,
- deck/source has a card or `draw` is present,
- bought card cannot be played this turn unless rules allow it.

### Development Card Play

Knight:

```json
{ "type": "dev.play", "p": "p1", "card": "KN" }
{ "type": "robber.move", "p": "p1", "to": "h:1,0" }
{ "type": "robber.steal", "p": "p1", "from": "p3", "card": "O" }
```

Year of Plenty:

```json
{ "type": "dev.play", "p": "p1", "card": "YP", "take": "OW" }
```

Monopoly:

```json
{ "type": "dev.play", "p": "p1", "card": "MO", "resource": "O" }
```

Road Building:

```json
{ "type": "dev.play", "p": "p1", "card": "RB" }
{ "type": "build.road", "p": "p1", "at": "e:0,0:w" }
{ "type": "build.road", "p": "p1", "at": "e:1,0:nw" }
```

Victory point cards are usually not played in base Catan. They are scored by the validator from hidden hand state.

### Resign Or Forfeit

```json
{ "type": "game.resign", "p": "p4" }
```

```json
{ "type": "game.forfeit", "p": "p4", "reason": "timeout" }
```

These are explicit because they are not implied by the ordinary rules of turn progression.

### End Turn

Reduced SGN should usually omit end turns.

The next player's turn action implies the previous turn ended.

Explicit end-turn-like events are only needed when the ending itself is meaningful:

```json
{ "type": "turn.skip", "p": "p2", "reason": "timeout" }
```

## Annotations

Annotations are optional, non-canonical helper data.

```json
{
  "type": "roll",
  "p": "p1",
  "dice": [3, 5],
  "annotations": {
    "production": [
      { "p": "p2", "cards": "O2" },
      { "p": "p4", "cards": "L" }
    ]
  }
}
```

Validators may:

- ignore annotations,
- preserve annotations,
- verify annotations against derived state.

Reduced strict export should omit derived annotations.

Annotations are appropriate for:

- UI timing,
- commentary,
- site metadata,
- derived production,
- ratio/port details for bank trades,
- state hashes,
- snapshots,
- flow ledgers,
- chat links,
- engine-specific ids.

Annotations must not be required to reconstruct a reduced SGN game unless the document declares a non-reduced profile.

## Profiles

Profiles describe how much data a document carries.

### Reduced SGN

The default public interchange format.

Contains:

- setup,
- rules,
- players,
- ordered non-derivable events,
- result.

Omits:

- derived production,
- ordinary costs,
- ordinary end turns,
- snapshots,
- hashes,
- flow ledgers,
- UI negotiation history.

### Annotated SGN

Reduced SGN plus optional helper fields.

Useful for:

- debugging,
- rich replay,
- UI presentation,
- import from noisy server logs.

### Audit SGN

Reduced or annotated SGN plus optional integrity data.

May include:

- random source definitions,
- state checkpoints,
- state hashes,
- exporter signatures,
- full flow ledgers.

Audit SGN must not make those features mandatory for reduced consumers.

## Worked Examples

### Example 1: Development Card Buy

Outcome-based reduced SGN:

```json
{
  "format": "sgn",
  "version": 1,
  "rules": { "base": "catan.base.v1" },
  "players": ["p1", "p2", "p3", "p4"],
  "setup": { "board": { "hexes": [], "ports": [], "robber": "h:0,0" } },
  "events": [
    { "type": "dev.buy", "p": "p1", "draw": "KN" }
  ],
  "result": { "status": "incomplete" }
}
```

Why `draw` is recorded:

- without a declared dev-card source, the validator cannot know what hidden card was bought.

Source-based equivalent:

```json
{
  "format": "sgn",
  "version": 1,
  "rules": { "base": "catan.base.v1" },
  "players": ["p1", "p2", "p3", "p4"],
  "setup": { "board": { "hexes": [], "ports": [], "robber": "h:0,0" } },
  "randomSources": {
    "devCards": {
      "type": "drawSequence",
      "items": ["KN", "VP", "MO"]
    }
  },
  "events": [
    { "type": "dev.buy", "p": "p1" }
  ],
  "result": { "status": "incomplete" }
}
```

Why both forms exist:

- SGN records the game, not the engine's internal deck implementation.

### Example 2: Roll Seven, Discards, Robber

```json
[
  { "type": "roll", "p": "p2", "dice": [3, 4] },
  { "type": "discard", "p": "p3", "cards": "O2W" },
  { "type": "discard", "p": "p4", "cards": "BGL" },
  { "type": "robber.move", "p": "p2", "to": "h:1,0" },
  { "type": "robber.steal", "p": "p2", "from": "p3", "card": "O" }
]
```

Why there is no discard group:

- the validator knows a 7 creates a pending discard/robber flow,
- the following discard events satisfy that pending flow,
- grouping is useful for async logs but not required for reduced export.

Why the stolen card is recorded:

- it is a hidden resolved outcome that is not easily derived from setup.

### Example 3: Build With Custom Cost

Rules:

```json
{
  "base": "catan.base.v1",
  "overrides": {
    "costs": {
      "road": "B2L2"
    }
  }
}
```

Event:

```json
{ "type": "build.road", "p": "p1", "at": "e:0,0:w" }
```

Why cost is not on the event:

- cost is a rule,
- the event is the player's placement choice,
- the validator applies the declared rule.

### Example 4: Roll With Optional Production Annotation

Reduced event:

```json
{ "type": "roll", "p": "p1", "dice": [3, 5] }
```

Annotated import:

```json
{
  "type": "roll",
  "p": "p1",
  "dice": [3, 5],
  "annotations": {
    "production": [
      { "p": "p2", "cards": "O2" },
      { "p": "p4", "cards": "L" }
    ]
  }
}
```

Why production is optional:

- the validator derives production from the board and pieces,
- annotations help UIs and debugging,
- reduced SGN stays lean.

### Example 5: Road Building Card

```json
[
  { "type": "dev.play", "p": "p1", "card": "RB" },
  { "type": "build.road", "p": "p1", "at": "e:0,0:w" },
  { "type": "build.road", "p": "p1", "at": "e:1,0:nw" }
]
```

Why the roads are ordinary `build.road` events:

- the validator is in the pending Road Building state after `dev.play RB`,
- it knows the next legal road placements are free,
- no `source` or `free` field is needed in reduced export.

### Example 6: Incomplete Public-Live Export

A live public export might redact hidden information:

```json
{ "type": "dev.buy", "p": "p1", "draw": "?" }
```

This is useful for spectators, but it is not a complete validation record unless a random source can later resolve the card.

Full SGN should include:

```json
{ "type": "dev.buy", "p": "p1", "draw": "KN" }
```

or a declared `randomSources.devCards` sequence.

## Minimal Full Example

This example omits most board hexes for readability.

```json
{
  "format": "sgn",
  "version": 1,
  "rules": {
    "base": "catan.base.v1"
  },
  "players": ["p1", "p2", "p3", "p4"],
  "setup": {
    "board": {
      "hexes": [
        { "at": "h:0,0", "terrain": "desert" },
        { "at": "h:1,0", "terrain": "mountains", "number": 8 },
        { "at": "h:0,1", "terrain": "forest", "number": 6 }
      ],
      "ports": [],
      "robber": "h:0,0"
    }
  },
  "events": [
    { "type": "build.settlement", "p": "p1", "at": "v:0,1:n" },
    { "type": "build.road", "p": "p1", "at": "e:0,1:w" },
    { "type": "build.settlement", "p": "p2", "at": "v:1,0:s" },
    { "type": "build.road", "p": "p2", "at": "e:1,0:nw" },
    { "type": "roll", "p": "p1", "dice": [3, 5] },
    { "type": "build.road", "p": "p1", "at": "e:0,0:w" },
    { "type": "dev.buy", "p": "p1", "draw": "KN" },
    { "type": "roll", "p": "p2", "dice": [3, 4] },
    { "type": "discard", "p": "p1", "cards": "OW" },
    { "type": "robber.move", "p": "p2", "to": "h:0,1" },
    { "type": "robber.steal", "p": "p2", "from": "p1", "card": "O" }
  ],
  "result": {
    "winner": "p2",
    "reason": "victoryPoints"
  }
}
```

## Why This Standard Looks This Way

### Why Not State Snapshots?

State snapshots can say what the game looked like. They do not naturally say why it changed.

Stats and replay often care about causality:

- who stole from whom,
- who discarded because of a 7,
- which dev card was drawn,
- which trade completed.

Those are events.

### Why Not Production Events?

Production after a roll is deterministic under the ruleset. Recording it duplicates the validator's work and creates contradiction risk.

If an engine wants to show production in a UI, it can annotate the roll. The reduced record stays clean.

### Why Not Build Costs?

Build costs are rules. If a variant changes them, declare the variant or override in `rules`.

The event should describe the player's choice: build a road here.

### Why Record Discards?

The validator can know a player must discard and how many cards they must discard. It cannot know which cards they chose.

So discards are essential events.

### Why Record Dev Draws Sometimes?

The validator needs to know hidden dev-card state.

If the record declares a dev-card draw sequence, `dev.buy` can omit `draw`.

If it does not declare a draw sequence, `dev.buy` must include `draw`.

This avoids forcing engines to use a pre-shuffled deck internally.

### Why Record Robber Steal Card?

The stolen card is a hidden resolved outcome from runtime hand state. Reconstructing it portably would require a heavier hand-order/random-selection model than SGN should require.

Recording the stolen resource is the lean practical choice.

### Why Omit End Turns?

Turn endings are usually implied by the next turn's first event. Explicit end-turn spam makes records longer without adding useful replay information.

Record explicit turn-ending events only when the ending itself matters, such as timeout or skip.

## Implementation Guide

An engine implementing SGN should start with a validator.

Suggested implementation order:

1. Parse resource formulas.
2. Parse player ids and basic document shape.
3. Parse board setup.
4. Implement base Catan state.
5. Implement setup placement validation.
6. Implement `roll`.
7. Derive resource production internally.
8. Implement `discard`, `robber.move`, and `robber.steal`.
9. Implement builds and costs.
10. Implement trades.
11. Implement development-card buy/play.
12. Verify final result.

An exporter should:

1. Write explicit board setup, not only a seed.
2. Write the declared ruleset.
3. Write only reduced events by default.
4. Include hidden/random outcomes or random source definitions.
5. Put UI/debug/state data under `annotations` or an optional profile.

## Open Items

This draft is not final. The main open items are:

1. Final coordinate grammar and normalization.
2. Exact event field names for every base game action.
3. Whether strict export should include event sequence numbers.
4. Whether the file should be one JSON object or newline-delimited JSON messages.
5. Mandatory metadata roster for public archives.
6. Naming: SGN versus another neutral name.
7. Incomplete/abandoned game representation.
8. Expansion module contracts for Seafarers and Cities and Knights.

## One-Sentence Summary

SGN records the choices, setup, randomness, and hidden resolutions that a Catan validator cannot infer, then lets the declared ruleset derive everything else.

