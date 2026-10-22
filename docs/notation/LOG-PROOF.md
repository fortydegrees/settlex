# Saved-record post-game log proof

This proof tests the next CGN adoption step: regenerate Settlex's post-game gameplay log using only the saved game record. It does not replace the live log. The [local replay consumer](REPLAY-CONSUMER.md) now uses this projection for its post-game log and board.

## Contract

`projectHANLog(record)` validates and replays the record, then projects actions and derived consequences into semantic log rows. It receives no native snapshots, source log, RNG seed, player account data or UI state. Each row carries a zero-based logical `actionIndex` and a zero-based, end-exclusive token range. An adjacent paid buy/place pair is one logical action. Row IDs are newly assigned presentation IDs, not archived controller IDs.

`replayHANTrace(record)` exposes the same validated replay used by `replayHAN`, with actions and before/after states. Consecutive steps share their boundary snapshot; consumers should treat snapshots as read-only. The existing `replayHAN` checkpoint API and current wire identity are unchanged. Both new APIs are experimental implementation tools, not the final CGN wire schema.

The projection includes setup turn boundaries, starting resources, rolled production, bank shortages, build actions, development-card actions, robber movement/steals, discards, trades, awards and victory. Free roads carry their derived development-card context. It follows the current Settlex presentation convention of displaying a development purchase without naming the drawn card; the omniscient record and trace still contain that card.

The log uses record seat IDs, canonical board coordinates and HAN resource codes. A UI adapter translates resource codes and supplies names/themes. Costs are applied by replay, not inserted into the stored record or presented as extra log rows.

## Run it

From the repository root:

```sh
pnpm -C game-core build
node --input-type=module <<'JS'
import { readFile } from 'node:fs/promises';
import { projectHANLog } from '@settlex/game-core';
const record = JSON.parse(await readFile('docs/notation/examples/settlex-complete.han.json', 'utf8'));
for (const row of projectHANLog(record)) console.log(JSON.stringify(row));
JS
```

Reproduce the independent native-log comparison (about a minute locally):

```sh
pnpm exec vitest run scripts/notation/log-comparison.test.js scripts/notation/log-proof.test.js
```

To retain evidence, set `CGN_LOG_PROOF_OUT` to a **new directory whose parent already exists**. The proof refuses to overwrite an existing directory. It writes `receipt.json`, `projected-log.jsonl` and a readable `comparison.md`; it does not retain the large native snapshot archive.

The proof first projects the saved file. Separately, it runs the actual Settlex controller with the existing bounded, deterministic local driver, exports that game and requires equality with the saved record. The export compares all source checkpoints. The native final log is then independently normalized and compared row-for-row. It never supplies input to the projector.

## What equality means

Gameplay actions and their causal order must match. Independent resource-shortage notices from the **same roll** may appear in a different order: the comparison sorts only the contiguous shortage batch following that roll and its production rows. It does not move notices across actions or turns. All other rows retain their order. Unknown event types, unmapped identifiers and unknown top-level fields fail the proof. Every native `data` field is retained after translating seat IDs, board addresses and resource names. Changed amounts, extra or missing rows, and duplicates remain mismatches. Canonical semantic hashes sort object keys and those same-roll shortage batches.

This is comparison normalization, not a change to game rules or CGN. The renderer may choose a stable resource display order without creating a resource allocation priority. The record stores the roll; the engine derives its consequences. Tests accept the same-roll permutation and reject changed quantities, missing/duplicate notices, reordered actions and notices moved to another roll.

Excluded source metadata is explicitly listed in the receipt: controller `id`, `turn`, `phase` and automatic-action `forced`. These are not the same as the derived setup/end-turn log rows, which **are** compared. The retained game has no `forced: true` rows. A future forced-action example needs an explicit session-context comparison, not silent filtering. Chat, offers and clocks are not present in this proof's input.

The comparison also renders both normalized logs through the existing `formatLogEntry` text formatter, translating resources and choosing a consistent resource-icon order. This checks textual presentation after normalization, not pixel layout or the original order of interchangeable resource icons. It does not bypass the stronger comparison of fields that the UI does not currently show.

## Result

See [the semantic-comparison receipt](examples/cgn-log-proof/receipt-semantic.json) and [its side-by-side excerpt](examples/cgn-log-proof/comparison-semantic.md). The [original strictly ordered receipt](examples/cgn-log-proof/receipt.json) and [original excerpt](examples/cgn-log-proof/comparison.md) remain historical evidence. The full projected log can be regenerated with the command above; only compact evidence is checked in.

The full-game comparison covers the saved 2,437-move game and all 2,438 source checkpoints. **All 3,785 gameplay rows match in order, with zero semantic mismatches and zero normalized text differences.** The canonical semantic hashes also match. The first run exposed four missing free-road provenance fields; the generator now derives them from the Road Building phase, with a regression test.

## Limits and next step

One complete game is evidence for these exercised paths, not universal log conformance. It includes 25 development purchases, Knight and Road Building plays, a paid city, setup, discards, steals, maritime trades, bank shortages and Largest Army. It does not exercise paid roads/settlements, player trades, Monopoly, Year of Plenty, Longest Road claims/transfers, automatic actions or non-victory endings. Constructed legal alternate draw histories separately test Monopoly and Year of Plenty projection; they are not native-game parity evidence. Unsupported core histories still fail through the existing reader/exporter.

The opt-in [post-game replay consumer](REPLAY-CONSUMER.md) now opens compact records directly in the local replay library, using this projection and shared rendering. Broader branch coverage is still needed before making it the production archive default. Live opponent feeds and optional chat/negotiation/clock schemas remain separate work. Do not remove native archival history on the strength of this one proof.

A constructed legal roll producing simultaneous ore and brick shortages previously exposed a presentation-order difference. Quantities were correct; treating that as a notation defect was too strict. The comparison now accepts this equivalence without requiring the projection to imitate native board-encounter order. The retained complete game itself has no such permutation, so its original strictly ordered result still stands.
