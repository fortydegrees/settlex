# Colonist Headless SettleGraph Adapter Design

**Date:** 2026-08-27

## Objective

Run the sealed SettleGraph/CTNN-v2 bot as an ephemeral guest in a user-created,
private Colonist Base 1v1 room without keeping a browser open.

The user reports written permission from Colonist for limited, non-disruptive
headless testing, subject to sensible rate limits, avoiding disruption, and
sharing a short summary of the approach and findings. The adapter will encode
those limits rather than treating the permission as approval for matchmaking,
room discovery, load testing, or broad automation.

## V1 scope

V1 is one local CLI process with these inputs:

- a private Colonist room code;
- the sealed SettleGraph V2 model path;
- the existing SettleGraph V2 worker path, with repository defaults where
  available.

It creates a fresh guest identity for the run, joins only the supplied room,
plays one seat until the game ends or an invariant fails, then exits. It stores
no browser cookies, account credentials, guest identity, or reconnect token on
disk.

V1 supports only the Colonist game contract that matches the sealed model:

- private Base 1v1;
- 15 victory points;
- balanced dice;
- discard limit 9;
- friendly robber;
- standard 15-road, 5-settlement, 4-city piece limits;
- development cards enabled.

The adapter does not use matchmaking, public room discovery, chat, player
trading, automatic rematches, search mode, or the SettleX UI.

## Observed Colonist protocol

The protocol evidence was captured on 2026-08-27 from an authorized private
Safari-hosted game with a Chrome guest. It is a versioned external contract and
must be treated as drift-prone.

### Connection and framing

- Guest clients open `wss://socket.svr.colonist.io/?version=2`.
- The server first sends JSON `Connected` and `SessionEstablished` messages.
- Subsequent messages use MessagePack binary payloads.
- Incoming application messages are MessagePack objects with `id` and `data`.
- Outgoing binary messages use a small envelope: route byte, subtype byte,
  recipient-name length byte, UTF-8 recipient name, then MessagePack body.
- Observed subtype IDs include game action `1`, lobby action `2`, socket echo
  `8`, room command `10`, and shuffle action `11`.

Joining a supplied room uses the lobby route with the room code and current
client version. Game actions are sent directly to the game server ID with an
action number, payload, and monotonically increasing client action sequence.
At startup the adapter makes one ordinary `GET https://colonist.io/` and parses
the public `socketServerWSS` and `versionNumber` bootstrap variables. It rejects
a missing or malformed bootstrap rather than assuming the captured endpoint or
client version is permanent.

### State stream

The game stream is an ordered sequence under application message ID `130`.
The reconnect path provided:

1. a first-game-state message containing game/server IDs and an in-memory
   reconnect token;
2. a full build-game snapshot;
3. small sequenced state-diff messages.

The full Base snapshot contains:

- 19 tiles, 54 corners, 72 edges, and 9 ports;
- bank, dice, robber, buildings, roads, settlements, cities, and development
  card state;
- per-player private/public state from the guest seat's perspective;
- current turn and action state, play order, timers, settings, game logs, and
  user/seat metadata.

Any sequence gap invalidates the local state. The client requests or obtains a
fresh full state before another decision; it never guesses a missing diff.

### Commands needed by V1

The client bundle and live trace identify the Base actions required by the bot:

- roll dice and end turn;
- select initial placement;
- buy and place a road, settlement, or city;
- buy and play development cards, including their follow-up selections;
- select robber tile and victim;
- select discard resources;
- make bank/port trades.

Only commands exercised by the sealed 299-action contract will be implemented.
Unsupported Colonist prompts fail closed.

## Chosen architecture

Use a standalone Node adapter beside the existing product-owned Rust worker:

`Colonist socket -> state tracker -> native worker -> command guard -> Colonist socket`

### `ColonistClient`

Own the guest WebSocket lifecycle, MessagePack codec, routing envelope,
heartbeat, room join, reconnect, and game-action sequence. It exposes current
state updates and accepts semantic Colonist actions. It contains no bot logic.

This is the only deliberate seam for the future thin-client idea: a later
SettleX UI could consume the same state/action boundary. V1 will not add a
generic backend plugin system or any SettleX UI integration.

### `ColonistStateTracker`

Apply the full snapshot and ordered diffs into one immutable current state.
Track the server sequence, current guest seat, current actor, server ID, legal
selection prompts, and the in-memory reconnect token. Expose one normalized
Colonist snapshot to the worker.

### Native Colonist import

Add a dedicated `colonist-decide` request mode to
`native/settlegraph-v2`. Do not translate Colonist into a fabricated SettleX
website snapshot and do not construct observation-v2 or the legal mask in
JavaScript.

The Rust importer will:

1. validate the V1 rules and two-seat visibility contract;
2. derive and prove the Colonist tile/corner/edge/port mapping from board
   coordinates and incidence;
3. import board, inventories, bank, development cards, history, phase, and
   pending-choice state into the pinned native game representation;
4. construct the exact 1,445-float observation and 299-action legal mask;
5. run one CTNN forward pass and select the highest-scoring legal action;
6. return a semantic Colonist action rather than a SettleX website move.

The sealed model, contract hash, and direct-inference behavior remain
unchanged. Search is outside V1.

### `ColonistBotRunner` and command guard

React only when the latest complete state says the guest seat must act. Send a
decision request with the current server sequence, then re-check that sequence,
actor, action state, and legal server prompt before sending.

Send one command and wait for the corresponding server state advance before
considering another. Multi-step actions are explicit small state machines; the
runner never fires a precomputed command batch through changing server states.

## Safety and recovery

- One socket and one private room per process.
- Match the official client's one-second heartbeat; no faster polling loop.
- At most one gameplay command awaiting a state acknowledgement.
- Bounded exponential reconnect with no busy retry.
- Redact reconnect tokens and user/session IDs from logs.
- Stop on an unknown protocol message, state-sequence gap that cannot be
  resynchronized, incompatible settings, unsupported action state, topology
  mismatch, stale decision, illegal target, or rejected command.
- Never fall back to a random action or a different bot while claiming the
  move came from SettleGraph.

The CLI writes a concise, shareable run summary: protocol/client version,
model and contract hashes, room settings, move counts, reconnect count,
fail-closed reason if any, and game result. It excludes credentials, tokens,
private card contents, and reusable identifiers.

## Minimal verification

V1 needs only three durable checks:

1. A captured, redacted full-state plus diff fixture proves MessagePack
   decoding, ordered state reconstruction, and sequence-gap rejection.
2. A native topology/action test proves all 19 tiles, 54 corners, 72 edges,
   and 9 ports map bijectively in both directions. This is required because a
   legal action on the wrong physical vertex or edge is not a working adapter.
3. A dry-run smoke feeds a captured Colonist state to the real sealed model
   and proves the returned command is inside Colonist's current legal target
   set without sending it to the server.

No broad browser E2E suite, UI tests, fuzzing, load tests, generic adapter
framework, or search-strength evaluation is included.

After those checks pass, the authorized private room is the manual end-to-end
proof. Start with opening placement and a few normal turns before attempting a
complete game.

## Alternatives rejected

### Fabricate a SettleX website snapshot

This looks fast but creates two lossy translations: Colonist to SettleX and
SettleX website moves back to Colonist. It risks repeating the previously
observed topology and port-incidence failure and hides protocol-specific stages
behind the wrong product model.

### Put the entire client in Rust

A single binary is attractive but would duplicate straightforward WebSocket,
MessagePack, reconnect, CLI, and logging work. Node is the smaller transport
layer; Rust remains the authority for game semantics, observation, legality,
and inference.

## Delivery boundary

The first delivery is local and guest-only. It does not modify the hosted
SettleX product, deploy anything, push a branch, provision a Colonist account,
or automate games outside the explicitly supplied private test room.
