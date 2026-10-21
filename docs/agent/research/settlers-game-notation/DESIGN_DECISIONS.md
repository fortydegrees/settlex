# Universal SGN Design Decisions

Date: 2026-04-17

Status: working decision log

This document captures the reasoning trail from the SGN/Catan notation discussion. It is intentionally about decisions and rejected paths, not just the current schema.

Where this conflicts with the earlier Settlex-specific proposal in `SETTLEX_MATCH_RECORD_V1.md`, this document represents the newer first-principles direction for a universal open standard.

## Current Working Position

Universal SGN should be a lean, rules-aware, resolved event notation for Catan-like games.

It should follow the same broad philosophy that makes PGN practical:

- record what must be recorded,
- let a rules-aware validator derive deterministic consequences,
- keep a reduced/core export small enough that engines will actually implement it,
- allow annotations and richer profiles without making them mandatory.

For Catan, the hard part is that more things are non-derivable than in chess:

- randomized board setup,
- dice rolls,
- hidden development-card draws,
- hidden robber steals,
- discard choices,
- variant rules and setup modules.

The goal is not to log every state transition. The goal is to log the minimum facts needed for a validator to reconstruct the game under the declared ruleset.

## Validator Rule

The main design test is:

> If a conforming SGN validator can derive it from setup, rules, and prior events, it does not belong in reduced/core SGN.

This is the key principle that resolved the resource-production and build-cost question.

An SGN validator should:

1. Parse the SGN document.
2. Load the declared ruleset and modules.
3. Build initial state from setup.
4. Iterate events in order.
5. For each event:
   - check that the event is legal in the current state,
   - apply the event,
   - derive deterministic consequences,
   - consume or verify hidden/random outcomes where needed.
6. Compare the computed final state/result to the recorded result.

The notation provides replay data. The engine validates legality.

## Decision 1: Core SGN Is An Event Log, Not A State Log

Decision:

- Core SGN is ordered resolved events plus setup and result.
- It is not a full per-frame state log.

Rejected:

- making Hexil State Notation, or any state snapshot format, the canonical game record.

Why:

- State tells us what the board/hands look like.
- It does not naturally explain causality.
- Postgame stats ask questions about what happened: who stole from whom, who discarded because of a 7, which dev card was bought, which trade completed.
- Those are events, not just states.

Still useful:

- State notation is valuable as an optional snapshot/checkpoint/debug/export layer.
- A Hexil-like state representation could pair well with SGN, but should not replace the event log.

## Decision 2: Do Not Log Deterministic Consequences In Reduced SGN

Decision:

- Reduced/core SGN should not log resource production after a roll.
- Reduced/core SGN should not log resource loss from ordinary builds/buys.
- Reduced/core SGN should not log bank inventory, road counts, visible VP recalculations, Longest Road recalculations, or Largest Army recalculations by default.

Why:

- These are derived by a rules-aware validator.
- Logging them duplicates rules into the notation.
- Duplicated consequences can contradict the rules or each other.
- It makes the format less like PGN and more like a verbose audit ledger.

Example:

```json
{ "type": "roll", "p": "p1", "dice": [3, 5] }
```

The validator derives production from:

- board setup,
- pieces,
- robber/pirate state,
- dice,
- bank shortage rule.

Example:

```json
{ "type": "build.road", "p": "p1", "at": "e:a4:w" }
```

The validator derives the cost from the declared ruleset.

Optional annotations may include derived production/cost data for UI/debugging, but a conforming reduced SGN consumer must not depend on them.

## Decision 3: Custom Costs Belong In Rules, Not Events

Problem:

- A variant might make a road cost `B2L2` instead of `BL`.

Rejected:

```json
{ "type": "build.road", "p": "p1", "at": "e:a4:w", "cost": "B2L2" }
```

Why:

- The build event should express the player's choice.
- The ruleset should express what that choice costs.
- Repeating cost on every event creates contradiction risk.

Preferred:

```json
{
  "rules": {
    "base": "catan.base.v1",
    "overrides": {
      "costs": {
        "road": "B2L2"
      }
    }
  }
}
```

Then the event remains:

```json
{ "type": "build.road", "p": "p1", "at": "e:a4:w" }
```

The validator applies the declared cost.

## Decision 4: Do Not Require A Flow Ledger

Rejected:

- mandatory `flows` arrays that move every card from one zone to another.

Why:

- A flow ledger is useful for audit tools and engine interchange.
- It is too heavy for a PGN-like public interchange standard.
- It duplicates what the validator can derive for ordinary costs and production.

Current position:

- Flow ledgers can be an optional annotation/profile.
- They are not part of reduced/core SGN.

## Decision 5: Do Not Require Hashes Or Signatures

Rejected:

- transaction hashes,
- state hashes after every move,
- signatures,
- blockchain-like audit structure.

Why:

- Useful for tournament audit or anti-tamper workflows.
- Overkill for a practical open notation.
- Would scare off implementers.

Current position:

- Hashes/checkpoints/signatures can be optional advanced profiles.
- Reduced SGN should be readable and implementable without them.

## Decision 6: Randomness Should Be Source-Based Or Outcome-Based

Problem:

- Requiring an initial pre-shuffled dev deck forces one engine model.
- Some engines pre-shuffle a deck and pop from the top.
- Other engines may keep a bag/list of remaining dev cards and randomly choose at buy time.

Decision:

- SGN should not force the engine's internal random model.
- The record must provide enough information to reconstruct hidden/random outcomes, either by declaring the random source or by recording the resolved outcome.

Source-based example:

```json
{
  "randomSources": {
    "devCards": {
      "type": "drawSequence",
      "items": ["KN", "VP", "MO"]
    }
  },
  "events": [
    { "type": "dev.buy", "p": "p1" }
  ]
}
```

Outcome-based example:

```json
{ "type": "dev.buy", "p": "p1", "draw": "KN" }
```

Both describe the same abstract fact: player `p1` bought a development card and the resolved draw was `KN`.

The validator rule:

- if the event has `draw`, use it and optionally verify it against a declared source,
- otherwise, consume from the declared random source,
- if neither is present, the record is incomplete for full validation/replay.

## Decision 7: Dev Card Identity Is Not A Postgame Concept

Earlier wording:

- "dev card buys with postgame card identity"

Rejected wording:

- This makes hidden reveal sound like a special product/UI concern.

Correct framing:

- SGN needs enough information to reconstruct hidden state.
- That can be an initial draw sequence, an inline draw outcome, or another declared random source.
- Whether a UI reveals the card only after the game is a presentation/privacy decision, not the core notation concept.

Preferred event for a lean outcome-based record:

```json
{ "type": "dev.buy", "p": "p1", "draw": "KN" }
```

## Decision 8: Board Setup Should Be Explicit, Seeds Are Optional Provenance

Rejected:

```json
{ "seed": 12345 }
```

as the only board setup representation.

Why:

- A seed forces a generator algorithm.
- Different engines will not have the same board generator.
- Even the same engine may change generator versions.

Preferred:

```json
{
  "setup": {
    "board": {
      "hexes": [],
      "ports": []
    }
  }
}
```

Optional:

```json
{
  "generation": {
    "seed": 12345,
    "algorithm": "settlex-balanced-v2"
  }
}
```

The final board is canonical. The seed is provenance.

## Decision 9: Robber Steals Should Record The Resolved Stolen Resource

Decision:

```json
{
  "type": "robber.steal",
  "p": "p1",
  "from": "p3",
  "card": "O"
}
```

Why:

- The stolen card comes from hidden runtime state.
- Unlike a dev deck, it is awkward to reconstruct from setup alone unless the record also stores exact hand order/random selection mechanics.
- Recording the resolved stolen resource is leaner and more portable.

Rejected:

- forcing an internal "random index into victim hand" model,
- requiring a full hand-order ledger,
- omitting the stolen card entirely in a complete replay record.

## Decision 10: Discards Should Record The Chosen Cards

Decision:

```json
{ "type": "discard", "p": "p3", "cards": "O2W" }
```

Why:

- A discard is a player choice under a forced rule.
- The validator can determine who must discard and how many.
- It cannot infer which cards they chose.

This is essential, not an annotation.

## Decision 11: Discard Groups Are Not Required In Reduced SGN

Earlier idea:

```json
{ "type": "discard", "group": "g17", "p": "p2", "cards": "O2W" }
{ "type": "discard", "group": "g17", "p": "p4", "cards": "BGL" }
```

Current decision:

- In reduced/core SGN, event array order plus validator state is enough.

Example:

```json
[
  { "type": "roll", "p": "p2", "dice": [3, 4] },
  { "type": "discard", "p": "p3", "cards": "O2W" },
  { "type": "discard", "p": "p4", "cards": "BGL" },
  { "type": "robber.move", "p": "p2", "to": "h:b4" }
]
```

The validator knows the `discard` events belong to the pending 7 resolution.

Optional:

- `group` can be useful for async server logs, UI event streams, or imports where other records interleave.
- It should not be required in the reduced export.

## Decision 12: End Turn Should Usually Be Implied

Decision:

- Reduced SGN should not require `endTurn` after every turn.

Why:

- This follows SGN and PGN's lean philosophy.
- The next player's roll/action usually implies the previous turn ended.

When to record explicit turn-end-like events:

- timeout,
- forced skip,
- resignation,
- failed/no-op turn in a variant,
- clock-specific records,
- cases where no next action exists but the turn ending matters.

## Decision 13: Dice Should Record The Actual Dice, Not Just Total

Decision:

```json
{ "type": "roll", "p": "p1", "dice": [3, 5] }
```

Why:

- Base Catan mostly uses the total.
- Cities and Knights uses colored/event dice.
- Exact dice are useful for stats and UI.
- Recording exact dice does not force an RNG implementation.

Acceptable compact display can show total, but canonical reduced SGN should preserve the rolled dice.

## Decision 14: Trades Should Record Completed Game Effects, Not Negotiation By Default

Decision:

Core completed trade:

```json
{
  "type": "trade.player",
  "p": "p1",
  "with": "p2",
  "give": "LW",
  "receive": "O"
}
```

and bank/port trade:

```json
{
  "type": "trade.bank",
  "p": "p1",
  "give": "O4",
  "receive": "B"
}
```

Why:

- The completed trade changes game state.
- Offers, counteroffers, rejects, and chat are product/UX history.
- Negotiation replay is useful, but not required for a legal game replay.

Optional:

- trade offer/accept/reject events may exist in an annotated/profile layer.

## Decision 15: Visibility Is Not Core Legality

Earlier Settlex draft used detailed live/postgame visibility metadata.

Universal SGN correction:

- Visibility is important for product exports and live replay feeds.
- It should not be the core legality model.

Reduced SGN can be a complete historical game record. That means it may include hidden information that was not public during live play.

If a platform exports public-live SGN, it can redact hidden fields:

```json
{ "type": "dev.buy", "p": "p1", "draw": "?" }
```

But a full validation/replay record needs the resolved value or a random source.

## Decision 16: Rulesets And Modules Carry Variant Meaning

Decision:

- The record declares its ruleset/modules.
- Events stay small.
- The validator imports the correct rule definitions.

Example:

```json
{
  "rules": {
    "base": "catan.base.v1",
    "modules": ["seafarers.v1"]
  }
}
```

This is how extensions avoid bloating base SGN:

- Seafarers defines ships, pirate, gold, discovery, scenario setup.
- Cities and Knights defines commodities, progress cards, barbarians, knights, city improvements, metropolis.
- Custom rules define their own overrides.

## Decision 17: Coordinates Should Be Standard, Engine IDs Optional

Decision:

- A universal SGN needs canonical board coordinates.
- Engine-specific ids should not be primary references.

Still open:

- exact coordinate grammar.

Current leaning:

- use or adapt Hexil's axial coordinate approach,
- define canonical hex, vertex, and edge references,
- allow engines to include local ids as annotations if useful.

Why:

- A universal validator cannot depend on Settlex node ids or Colonist internal ids.
- Coordinates are the common interchange layer.

## Decision 18: Import Can Be Flexible, Export Should Be Strict

Borrowed from PGN:

- import format can tolerate optional fields, comments, whitespace, annotations, and older profiles,
- export format should be normalized and predictable.

For SGN, that likely means:

- reduced export has stable field order,
- events are in strict order,
- derived annotations are omitted,
- unknown optional annotations are ignored by reduced consumers,
- full validators can report whether annotations match derived state.

## Reduced SGN Sketch

This is not final schema. It is a shape that reflects the current decisions.

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
      "hexes": [],
      "ports": []
    }
  },
  "events": [
    { "type": "build.settlement", "p": "p1", "at": "v:a4:n", "phase": "setup" },
    { "type": "build.road", "p": "p1", "at": "e:a4:w", "phase": "setup" },
    { "type": "roll", "p": "p2", "dice": [3, 4] },
    { "type": "discard", "p": "p3", "cards": "O2W" },
    { "type": "robber.move", "p": "p2", "to": "h:b4" },
    { "type": "robber.steal", "p": "p2", "from": "p3", "card": "O" },
    { "type": "dev.buy", "p": "p1", "draw": "KN" },
    { "type": "dev.play", "p": "p1", "card": "KN" }
  ],
  "result": {
    "winner": "p1",
    "reason": "victoryPoints"
  }
}
```

## Optional Annotation Sketch

Annotations are allowed, but not canonical.

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

A validator may:

- ignore annotations,
- verify annotations,
- preserve annotations when round-tripping.

Reduced export should omit them.

## Rejected Path Summary

Rejected as core:

- full state snapshots as the main record,
- frame diffing as the stats foundation,
- mandatory resource/card flow ledger,
- mandatory transaction hashes,
- mandatory state hashes,
- forcing pre-shuffled deck implementation,
- logging resource production by default,
- logging ordinary build/buy costs by default,
- requiring discard group ids,
- requiring every end turn.

Kept:

- explicit board setup,
- explicit dice,
- explicit player choices,
- explicit hidden/random outcomes when not otherwise derivable,
- ruleset/module declaration,
- validator-first thinking,
- optional annotations/profiles.

## Open Questions

1. What is the exact canonical coordinate grammar?
2. Should the name be SGN, CGR, or something else given the existing SGN project?
3. Should the default file be JSON, newline-delimited JSON messages, or a PGN-like tag section plus JSON movetext?
4. What is the minimum mandatory metadata roster, analogous to PGN's Seven Tag Roster?
5. How should unknown/import-only fields be preserved or discarded on strict export?
6. How should incomplete games and abandoned games be represented?
7. What is the exact base Catan event vocabulary?
8. How should source-based randomness and outcome-based randomness be mixed in one file?
9. Which optional profile should Settlex implement first: reduced export, full validation, or annotated replay?

## Current One-Sentence Principle

Universal SGN should record the non-derivable facts of a Catan game, then let a declared ruleset and validator derive the rest.

