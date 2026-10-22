# Settlex game records

Settlex is adopting an omniscient, replayable game record built around Hexil Action Notation (HAN). The record contains the starting board, a named rules profile and the decisions and random outcomes that actually occurred. A reader derives costs, production, awards and scores. The intended end state is for this portable record to be Settlex’s **canonical saved game history**. The live engine continues to use its normal current-state representation; replay frames are derived views and may eventually become disposable seek caches.

The format is experimental. Its explicit `han-prototype` version 1 identity is retained while the contract is tested in real archives. This is a Settlex whole-game envelope using HAN actions, not an upstream Hexil file format or a published Catan standard.

The agreed next direction is **CGN**: a lean omniscient core with optional standardised session and analysis additions. See [CGN direction](CGN-DIRECTION.md); existing wire identifiers are unchanged.

## Start here

- [Implement a recorder or viewer](IMPLEMENTERS.md) explains engine integration, replay controls, game-log projection and board rendering, with a runnable example. The contract is portable; the reference package is currently workspace-only.
- [Open a saved record in the replay viewer](REPLAY-CONSUMER.md) reconstructs the board and gameplay log directly from compact notation.
- [Saved-record log proof](LOG-PROOF.md) documents independent reconstruction and comparison with the native log.
- [File format and supported rules](FORMAT.md) defines the complete-game contract.
- [Complete Settlex example](examples/settlex-complete.han.json) contains a real locally automated game: 2,437 controller moves, 2,542 HAN tokens, final score 10–2–2. All 2,438 source checkpoints were compared during export. Its game history can be replayed without the original snapshots or RNG seed.
- [Hexil Action Notation](https://github.com/hexil-org/hexer/blob/main/docs/hexil_action_notation.md) is the upstream reference for token spellings, resource formulas and coordinate notation. Credit for that action language belongs to Hexil.

Hexil's syntax is only part of the agreement needed to exchange a whole game. Our contract also defines the board envelope, named rules, phase transitions, complete/prefix meaning and treatment of unknown outcomes. Those are documented here so another implementation does not have to infer them from Settlex source code.

## Replay a record

Build the existing engine package, then use its compiled API. No TypeScript runtime loader is required.

```sh
pnpm -C game-core build
node --input-type=module <<'JS'
import { readFile } from 'node:fs/promises';
import { replayHAN } from '@settlex/game-core';
const record = JSON.parse(await readFile('docs/notation/examples/settlex-complete.han.json', 'utf8'));
const states = replayHAN(record);
console.log(states.at(-1).points); // { '1': 10, '2': 2, '3': 2 }
JS
```

`replayHAN(record)` returns the initial position and one position after each logical action. An adjacent paid buy/place pair produces one logical action; free placements are individual actions. The maintained implementation is under `game-core/src/notation/`. The independent research reader remains available for comparison, without becoming a production dependency.

## Finished-game adoption

When a terminal match is archived, the server attempts to export and verify the authoritative initial state, action log and final state. Reconstruction runs in a worker thread. One export runs at a time, at most eight wait, and a running export has a 30-second deadline. No SQL transaction is held during conversion.

The native archive and notation outcome are saved together in `archived_match_replays`:

| Status | Meaning |
|---|---|
| `ready` | `notation_json` contains a verified complete record. |
| `unavailable` | Conversion could not produce a supported complete record; `notation_error_code` explains the class of failure. The native archive remains available. |
| `not-recorded` | Historical row with no notation attempt. |

Unsupported or invalid history, worker failures, timeouts and a full export queue do not prevent native archiving. They produce `unavailable`, never a fabricated or incomplete complete-game record. This first integration does not automatically retry or backfill unavailable and historical rows.

The archive consumers now prefer a supported, complete stored record for the canonical game page, legacy replay links and post-game replay fetch. One shared selector reconstructs the board and gameplay log, preserving archived names, appearances, chat, results and account/seat perspectives. Missing, unavailable, invalid or unsupported records use the retained legacy controller history. If both sources fail, the existing invalid-replay state remains. This code change has not been deployed.

The integrated Storybook examples also open compact records directly; see [the replay consumer guide](REPLAY-CONSUMER.md). Archive pages retain their existing full-information post-game access policy. Supported records are sent compactly and reconstructed in the viewer; legacy fallback retains its existing frame transport. No live-game feed or new download endpoint is introduced. Viewer masking is presentation policy, not an access boundary.

## Export a stored game

With the application database configured for the intended environment:

```sh
node scripts/notation/export-archived.mjs --replay-id REPLAY_ID --out /tmp/game.han.json
```

The command reads a previously stored ready record. It does not convert historical games or modify the database. Output must be a new path. Full-information files reveal all recorded hands, draws and steals; downstream viewers must apply their own perspective policy.

## Rollout and next milestones

The repository includes additive migration `0009_archived_match_notation.sql`. Apply it before starting the updated archive server in an approved release. Adding code locally does not change the running service or existing database rows. No production migration or deployment is part of this implementation.

The record is now preferred by the archive consumer code. The next steps are broader archive coverage, explicit resolution of forfeits and other unsupported cases, and direct structured record emission from the authoritative engine. Then new supported games can stop storing duplicate legacy controller history, while historical fallbacks remain readable. “Native” describes the old storage implementation, not a competing long-term standard: the portable record is intended to become native to Settlex. Freezing a non-experimental interchange version remains a separate compatibility decision. Independent implementations, conformance examples and collaboration with Hexil would support standardization; local use alone does not establish it.
