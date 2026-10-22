# Open a saved record in the replay viewer

The replay viewer reconstructs a compact whole-game record directly. The browser reconstructs board positions and gameplay log entries with the maintained notation reader. It does not need a generated snapshot file or the original native archive.

## Try the complete example

From the repository root:

```sh
pnpm storybook
```

Open **Composed Surfaces → Postgame & Replay → Notation Archive**. The Complete,
Middle and Terminal stories use the actual archive page client and the retained
complete example. Setup Prefix uses the same post-game board with a legal
incomplete record. No database or external recording is needed.

The complete game reconstructs 2,542 positions, including the initial position,
and 3,785 gameplay log rows. Seek through the match, click a visible log entry to
visit its resulting position, or change the replay perspective. Logs contain
only the prefix through the selected action; all consequences of one action
share its resulting board position.

Finished archived games use the existing game and replay routes described below.
The private development recording library is not included in this repository;
compact records do not depend on that importer. To inspect another portable
record without the application, use the runnable [reference consumer](IMPLEMENTERS.md).

## What powers it

- `game-core/src/notation/`: maintained legality replay, state trace and semantic log projection.
- `app/replays/notationReplay.js`: translates canonical board addresses, resource names and derived states into the existing viewer's presentation shape.
- `app/replays/replayTimeline.js`: action positions, log-click seeking and score history.
- The existing post-game board, log formatter and perspective masking supply the UI. Gameplay controls and chat remain read-only.

An adjacent paid buy/place pair is one logical action. A roll and its production/shortage notices also share one resulting position. Independent shortage notices may be displayed in any stable order; no fictitious intermediate game positions or resource priorities are introduced.

The file is omniscient. Finished replays initially reveal all recorded hands. Turn off “Reveal all hands” to apply the selected seat’s perspective; “Board” then uses public information. Masking is presentation policy, not removal of information from the downloaded file. Unseen future development-card order is never invented. Known prefixes from setup are accepted as incomplete in the standalone adapter and story, with no terminal-results claim. Arbitrary mid-game captures and unknown hidden outcomes are not supported by this compact core.

## Evidence and adoption boundary

The retained complete example was opened in the actual local viewer: empty setup board, first placement, middle-game seeking, log-click rewind, player-perspective switching and terminal 10–2–2 results. Targeted tests cover timeline/log alignment, no future entries, steal masking, read-only controls, complete/prefix handling, malformed records and archive identity mapping. The independent native-log comparison remains documented in [LOG-PROOF.md](LOG-PROOF.md).

The finished-archive loaders now also use this reconstruction path; see below. No database migration, deployment or removal of legacy archives is included. Broader game-path coverage is still needed before removing the fallback.

The reader's supported rules remain defined in [FORMAT.md](FORMAT.md). The drawing adapter additionally requires the supported hex-board geometry and uniquely drawable coastal ports; it rejects geometry it cannot faithfully render. A valid core record is not a promise that every future board variant is drawable by this viewer.

## Finished-game archives

All three archive entry points share `lib/server/replays/buildArchivedReplayPayload.js`: `/g/:matchID`, legacy `/replays/:replayId` links and `/api/matches/:matchID/replay`. They prefer a stored `ready` complete record after replay validation and drawable-geometry checks. The selector also verifies archive participant count, seat mapping and winner identity. A valid portable record can work even if legacy reconstruction cannot.

Absent or unavailable records fall back to the retained controller history. Invalid, unsupported, incomplete, undrawable or identity-mismatched records do too. A diagnostic `replay.source` reports `notation` or `legacy`, with bounded fallback reason `not-recorded`, `unavailable` or `invalid`; this is application metadata, not part of CGN. If neither source reconstructs, the existing invalid-replay response applies.

Portable seats 1–N are translated back to archived seats 0–N−1 in the presentation adapter. The original participant/account metadata, names, avatar settings, winner and chat remain unchanged, so existing perspective resolution continues to use proven account/seat identity. Log actor/victim/trade/award references, shortage allocation maps, board ownership and state inventories are translated consistently.

These existing archive routes retain their full-information post-game access policy. They do not read a live game's notation. Perspective controls mask presentation after loading; they do not make an omniscient archive secret. The server validates the chosen record with the same shared reconstruction and identity adapter used by the viewer, then sends `{replay, record}`. Both page loading and the post-game fetch expand it in browser memory. Initial/final archive objects and the raw controller log are omitted from replay metadata. Legacy fallback still sends `{replay, frames}` using its existing representation. The notation-derived frames contain no RNG seed or future deck order.

The retained long example measures 21,324 bytes as compact JSON, compared with 712,731,494 bytes if all frame/log prefixes were serialized. A real route-response test verifies the selected record plus participant/chat metadata stays below 25 KB and then reconstructs it through the client loader. This is why compact transport is part of this integration rather than a later optimization.

Migration 0009 must be applied before releasing the updated archive readers. This integration has targeted getter, selector and route/page tests with controlled database adapters; those are not evidence of a production deployment or execution against real PostgreSQL. Existing archived rows default to `not-recorded`; no backfill occurs.
