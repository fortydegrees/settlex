# Implementing a game recorder or replay viewer

CGN's goal is a portable game history that different engines and viewers can
exchange. You should be able to write a recorder in one language and a reader
in another, without adopting Settlex's UI, database or live engine.

**This guide targets the current experimental contract:** `han-prototype`,
version 1. CGN is the proposed name, not a new wire identifier. Start with the
[format contract](FORMAT.md) for exact rules and token meanings. Hexil supplies
the action-language foundation; the whole-game envelope and rules profiles
documented here are Settlex's experimental agreement around it.

## Choose what you are building

| Component | Responsibility |
|---|---|
| Recorder / source importer | Map the starting board, seats and resolved gameplay facts into the record. |
| Replay reader | Validate the declared profile, apply legal actions, and derive positions and consequences. |
| Board renderer | Draw a supplied board and position. It does not decide costs, production or legality. |
| Game log | Describe actions and derived consequences at the selected position. |
| Replay controls | Select a position and update the board, log and optional perspective together. |

The file contract is portable. `replayHANTrace`, `projectHANLog` and their
JavaScript return types are reference-library conveniences, not mandatory CGN
APIs. `@settlex/game-core` is currently a **private workspace package**, not a
published standalone SDK. The examples run from this repository with its
dependencies already installed. No server or database is needed.

## Try a complete record

From the repository root:

```sh
pnpm -C game-core build
node docs/notation/examples/inspect-record.mjs
node docs/notation/examples/inspect-record.mjs docs/notation/examples/settlex-complete.han.json 1
```

The [runnable example](examples/inspect-record.mjs) prints one selected position,
its board model, and its latest log rows. With no position argument it selects
the end: winner `1`, points `10–2–2`. Position `0` is the empty initial board;
position `1` is after the first setup settlement. It never writes to the input.
The [complete fixture](examples/settlex-complete.han.json) is an actual valid
record, with the entire starting board and game, rather than an abbreviated
JSON sketch.

For this fixture, expect 2,542 tokens, 2,541 logical actions, 2,542 positions
(including the initial position), and 3,785 projected log rows. The two-action
prefix is `PVe6s`, `PRd7ne`: a free settlement and touching road, returning to
the next player's `setupSettlement` phase. Log-row counts describe the current
reference projector, not a required output of every conforming reader.

## Record a game from your engine

1. Choose a supported rules profile whose **semantics actually match** your
   game. A familiar mode name is not sufficient. An unsupported variant needs
   an agreed new profile; do not silently call it base or duel.
2. At game start, map seats to ordered string IDs `1` through `N` and map the
   board to canonical addresses. Save terrain, number tokens, explicit
   tile/vertex/edge incidence, port privileges and initial robber location.
   Use those mappings consistently for the whole game. Account IDs, avatars
   and your engine's internal node numbers are not portable identities.
3. Record each **accepted, resolved** action in order. Include actual die faces,
   the purchased development card, and the resource actually stolen. Record
   accepted trades as atomic exchanges. Rejected commands and negotiations
   are not state-changing actions.
4. Encode free setup and Road Building placements in their phase. Ordinary
   paid construction uses the adjacent buy/place pair. Record explicit end
   turns. Do not add payments, production or scores just because your engine
   emits them as separate notifications: the reader derives them.
5. Use `coverage: "complete"` and the winner only when the history runs from
   setup to a supported derived victory. A fully known history from setup
   that stops early is a `prefix` with `result: null`. A prefix is **not** a
   representation of missing information or a midgame starting snapshot.
6. Replay your output and compare it against your engine at matching logical
   checkpoints: board ownership, hands, bank, cards, phase/pending obligations,
   awards, points and winner. Comparing just the final score misses errors
   that cancel out later.

Use the [logical-action mapping table](FORMAT.md#logical-action-mapping) to
encode tokens. For example, `R(2+3)` records the two faces; `BDk` records a
purchased Knight; `SO2` records stealing ore from seat `2`. These are isolated
token examples, not a legal three-action game. They require the corresponding
prior state. A random seed or prearranged deck is never needed for replay.

Resource codes are `B` brick, `G` grain, `L` lumber, `O` ore and `W` wool.
Development cards are `k` Knight, `m` Monopoly, `r` Road Building, `v` Victory
Point and `y` Year of Plenty. Your UI may use different display names.

The existing `exportSettlexNotationArchive` API adapts Settlex controller
history; it is not a generic exporter for another engine. Another source needs
its own mapper. Preserve source evidence separately so you can diagnose a
mapping error without making the portable file depend on it.

## Implement a reader in another language

The [format contract](FORMAT.md) supplies the rules; the reference library is
optional. A reader initializes empty-board setup from the declared profile,
then parses tokens into logical actions (combining adjacent paid buy/place
pairs). For each action it checks the phase, actor, location, inventory and
pending obligations, applies the decision and explicit chance outcome,
derives consequences and awards, and checks victory. Keep enough state for
fresh versus playable development cards, setup order and unfinished
discard/robber/free-road sequences as well as the visible board and hands.

At EOF, check the declared coverage and result. Syntax acceptance alone is
not replay validation: a correctly spelled road can still be unaffordable or
illegally placed. Another implementation can expose an iterator or reducer
instead of this library's array of checkpoints; its derived game must agree.

## Build replay controls

```js
import { replayHANTrace, projectHANLog } from '@settlex/game-core';

// `record` is the parsed JSON file.
const trace = replayHANTrace(record); // validates gameplay, not just grammar
const positions = [trace.initial, ...trace.steps.map(step => step.after)];
const rows = projectHANLog(record);

function seek(positionIndex) {
  if (!Number.isInteger(positionIndex) || positionIndex < 0 ||
      positionIndex >= positions.length) throw new Error('Invalid position');
  return {
    state: positions[positionIndex],
    log: rows.filter(row => row.actionIndex < positionIndex),
  };
}

const initial = seek(0);
const finished = seek(positions.length - 1);
```

A slider ranges from `0` to `trace.steps.length`. Next/previous changes that
position by one. Clicking a log row seeks to `row.actionIndex + 1`.

**Positions, actions and tokens are different counts.** A paid buy/place pair
is one logical action using two tokens. Trace steps carry `actionIndex` and
the zero-based, end-exclusive token range `[tokenStart, tokenEnd)`. One action
may generate several log rows. All consequences of a roll share its resulting
position; don't fabricate intermediate positions for individual payouts.

The reference trace keeps all positions in memory; this is a simple starting
point, not a requirement for every implementation. Keep one shared board and
log list. Do not serialize every state's growing log prefix into the saved
record. Larger viewers can use workers, checkpoints or lazy replay; those
caches are derived implementation details.

## Build a game log box

The reference `projectHANLog(record)` returns semantic rows such as `roll`,
`build:road`, `resource:gain`, `robber:steal` and award announcements. Rows carry
the action/token references above, an optional `actorId`, and type-specific
`data`. It runs replay itself; the simple example calls both APIs for clarity.
This row vocabulary is an experimental **presentation API**, not file syntax.

At each seek, show only rows with `actionIndex < positionIndex`. Format those
rows into your own language and resource icons. For a minimal log box, append
one DOM list item per row using `textContent` and plain text such as
`row.type + ' ' + JSON.stringify(row.data)`. A production formatter can say
“Player 1 rolled 5” and display the two faces, for example.

For an omniscient development-purchase label, read
`trace.steps[row.actionIndex].event.card` on a `dev:buy` row: the current
projector deliberately omits that identity from its presentation payload,
while the record and trace retain it. Use the explicit actor on a discard row;
the player discarding is not necessarily the current player.

Resource payouts, shortages and award changes come from the reconstructed
state, so engines need not record redundant prose or UI events. Multiple
independent shortage notices for the same roll may appear in your chosen
stable order. This does not change action order or game semantics.

Chat, unaccepted trade offers, timestamps and analysis are planned optional
additions. Their portable schemas are not implemented yet. Do not treat
`annotations` as a defined interoperable chat/clock format.

## Build a board renderer

The runnable example returns this renderer input for one position:

- Static `tiles`, `edges` and `ports` from `record.board`.
- Dynamic `buildings`, `roads` and `robber` from the selected state.

Join roads to the two vertices in `board.edges[edgeId]`; join buildings to
their vertex IDs. Draw the robber on its tile ID. Ports describe privileges
at vertices, not uniquely identified harbour sprites. A basic renderer can
label each affected vertex with its trade rate rather than guess port pairing.

For conventional pointy-top HAN geometry, decode a tile's letter column as
base 26 with `a=1`, `z=26`, `aa=27`; its numeric suffix is the row. One useful
drawing coordinate system is:

```text
tile(q, r) centre = (sqrt(3) * (2q + r), 3r)
vertex(q, r, n)   = (sqrt(3) * (2q + r), 3r - 2)
vertex(q, r, s)   = (sqrt(3) * (2q + r), 3r + 2)
```

Scale and translate those coordinates into your viewport. A vertex's anchor
tile need not be among the land tiles. Do not parse only one column letter.
The incidence graph remains authoritative: validate that the geometry agrees
with the supplied vertices/edges before drawing it. Syntax validation alone
does not prove that an arbitrary graph can be rendered as this hex tiling.

Renderer-independent pseudocode (the `draw` functions are your Canvas, SVG or
other graphics API):

```text
for tile in board.tiles:
    draw polygon from its six vertex positions, coloured by tile.resource
    draw tile.number at its centre (except desert)
for edgeId, owner in state.roads:
    draw line between board.edges[edgeId], coloured by owner
for vertexId, building in state.buildings:
    draw settlement/city marker at vertexId, coloured by building.owner
draw robber at the centre of state.robber
for vertexId, resource in board.ports:
    draw port label at vertexId (3:1 for any, otherwise 2:1 for resource)
```

This is a rendering recipe, not a second implemented renderer. For a working
integrated example, use the [existing local viewer](REPLAY-CONSUMER.md).
[`app/replays/notationReplay.js`](../../app/replays/notationReplay.js) contains
its stricter geometry/port checks and maps notation state into Settlex's board
UI. An independent renderer does not need that app-specific state shape.

## Information and import boundaries

Full-information post-game replay is the default. A viewer may hide hands and
private log details for a selected perspective using the state at that cursor.
Do not reveal a previously unknown card using a later action. UI masking does
not remove secrets from a downloaded omniscient file; live opponents need
server-filtered information rather than this archive payload.

For an external recording, first establish whether the captured evidence
contains all required facts and the entire history from setup. A bot's client
recording is not automatically an omniscient replay. Missing draws/steals,
capture gaps and unsupported rules must be reported rather than filled with
plausible values. An observation replay can remain a separate import/viewing
path while the complete-game contract stays small.

## Check your implementation and help stabilize the format

Start with the complete fixture and the short setup prefix produced in the
runnable example. Then compare intermediate states, not only the winner. The
current reference tests in [`game-core/src/notation`](../../game-core/src/notation)
exercise free/paid placement, development-card timing, trades, robbery,
finite-bank production and rejection cases. They are useful reference tests,
not yet a standalone, language-neutral conformance suite.

A reader should reject unknown format/version/profile IDs, missing random
outcomes, dangling paid builds, illegal actions and complete-result mismatches.
A prefix may stop with a pending obligation; EOF does not supply its missing
action. Current unsupported source cases include forfeits, no-destination
robber skips and empty-bank Year of Plenty; see [the contract](FORMAT.md).

The next standardization evidence should be a second source importer and an
independent reader agreeing on shared, small fixtures with expected checkpoint
data. Public adoption also needs a frozen compatibility policy and explicit
licensing/provenance decisions. This guide makes the present experiment usable;
it does not claim those publication steps are complete.
