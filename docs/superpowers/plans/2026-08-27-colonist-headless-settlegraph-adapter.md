# Colonist Headless SettleGraph Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the sealed SettleGraph/CTNN-v2 worker as an ephemeral guest in one user-supplied private Colonist Base 1v1 room, using a headless Node WebSocket adapter and failing closed whenever protocol, state, topology, or legality invariants do not hold.

**Architecture:** A small Node CLI owns Colonist bootstrap discovery, MessagePack framing, WebSocket lifecycle, ordered state reconstruction, and command acknowledgement. The existing Rust worker gains a `colonist-decide` mode that imports Colonist state directly into the pinned native Catan contract and returns one semantic Colonist action. The Node runner revalidates the current server sequence and prompt before translating that semantic action into one Colonist command.

**Tech Stack:** Node.js ESM, `ws`, `@msgpack/msgpack`, Vitest, Rust 2021, Serde/serde_json, existing vendored `catan-core` and `catan-env-contract`.

## Global Constraints

- Execute in an isolated worktree/branch created from the current Settlex `HEAD`; the main checkout already contains unrelated user changes that must not be staged, reverted, or reformatted.
- Before installing packages, obtain the user's explicit approval for the two direct runtime dependencies: `ws@8.21.3` and `@msgpack/msgpack@3.1.3`.
- On the current Codex host, start each implementation terminal with `export PATH="/Users/david/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/david/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH"`; the ordinary shell does not currently expose Node/pnpm.
- Use only a user-supplied private room code. Do not discover rooms, enter matchmaking, send chat, automate rematches, or join public games.
- Keep the guest session ID and reconnect token in memory only. Redact them, player identifiers, and private card contents from fixtures, logs, errors, and summaries.
- Support only private Base 1v1 with target 15, balanced dice, discard limit 9, friendly robber, development cards enabled, and 15/5/4 road/settlement/city limits.
- Preserve the sealed model identity, 1,445 observation values, 299-action contract, and direct one-forward-pass/highest-legal inference behavior. Do not add search or a fallback bot.
- Send at most one gameplay command before observing the next server state sequence. A sequence gap forces a full-state request; an unresolved gap stops the process.
- Keep the future thin-client seam limited to `state event -> semantic action`. Do not add a generic provider framework or SettleX UI work in V1.
- Do not deploy or push. The delivery is a local branch plus an authorized private-room run.

---

## File and Interface Map

### Node adapter

- Modify: `package.json`
  - Add the two approved runtime dependencies.
  - Add `colonist:bot` script pointing to `scripts/colonist-bot/cli.mjs`.
- Modify: `pnpm-lock.yaml`
  - Record only the dependency additions produced by `pnpm add`.
- Create: `scripts/colonist-bot/protocol.mjs`
  - Colonist bootstrap parsing, constants, MessagePack encode/decode, and the three-byte-plus-recipient outgoing envelope.
- Create: `scripts/colonist-bot/state.mjs`
  - Ordered full-state/diff reconstruction and the fail-closed command guard.
- Create: `scripts/colonist-bot/client.mjs`
  - Guest WebSocket, room join, heartbeat, resync, bounded reconnect, and one outbound action sequence.
- Create: `scripts/colonist-bot/runner.mjs`
  - Worker requests, semantic-action-to-Colonist-command mapping, multi-step prompt handling, summary counters, and dry-run suppression.
- Create: `scripts/colonist-bot/cli.mjs`
  - Argument validation, lifecycle, signals, and concise summary output.
- Create: `scripts/colonist-bot/README.md`
  - Supported room settings, commands, safety boundary, and current protocol evidence date.
- Create: `scripts/colonist-bot/__tests__/protocol-state.test.js`
  - The single durable Node check for frame decoding, patch application, gap rejection, stale-command rejection, and no-send dry run.
- Create: `scripts/colonist-bot/__tests__/fixtures/private-base-1v1.json`
  - Redacted base64 MessagePack frames plus expected public assertions and a normalized raw state for the Rust tests.

The public Node interfaces are deliberately small:

```js
export async function fetchColonistBootstrap({ fetchImpl = fetch } = {}) {
  // -> { socketUrl, clientVersion, protocolVersion: "2" }
}

export function encodeEnvelope({ route, subtype, recipient, body }) {
  // -> Buffer
}

export function decodeServerFrame(data) {
  // -> { kind: "handshake", type, ... } |
  //    { kind: "application", id, data }
}

export class ColonistStateTracker {
  applyGameMessage(message) {}
  current() {}
  invalidate(reason) {}
}

export class ColonistCommandGuard {
  begin({ sequence, actor, prompt, action }) {}
  acknowledge(nextSequence) {}
  validateCurrent(snapshot) {}
}

export class ColonistClient extends EventEmitter {
  async connect({ roomCode }) {}
  sendGameAction({ action, payload, expectedServerSequence }) {}
  requestGameState() {}
  async close() {}
}

export class ColonistBotRunner {
  async start() {}
  async handleState(snapshot) {}
  async stop(reason) {}
}
```

### Native worker

- Modify: `native/settlegraph-v2/src/lib.rs`
  - Export the Colonist modules.
- Modify: `native/settlegraph-v2/src/protocol.rs`
  - Add the optional Colonist request fields without weakening the existing website request validation.
- Modify: `native/settlegraph-v2/src/decision.rs`
  - Factor the target-neutral native action selection from the existing website planner.
- Modify: `native/settlegraph-v2/src/main.rs`
  - Handle `colonist-decide` and return the correlated sequence plus semantic action.
- Create: `native/settlegraph-v2/src/colonist/mod.rs`
  - Re-export Colonist request/import/action types.
- Create: `native/settlegraph-v2/src/colonist/protocol.rs`
  - Serde view of the relevant Colonist state and semantic response enum.
- Create: `native/settlegraph-v2/src/colonist/topology.rs`
  - Bijective 19/54/72/9 mapping based on cube coordinates and incidence.
- Create: `native/settlegraph-v2/src/colonist/snapshot.rs`
  - Rules validation and direct import into `CatanGame`, observation-v2, and legal mask.
- Create: `native/settlegraph-v2/src/colonist/action.rs`
  - Native `Action` to semantic Colonist action/target conversion.
- Create: `native/settlegraph-v2/tests/colonist.rs`
  - Topology/action round trips and deterministic fixture import.
- Modify: `native/settlegraph-v2/tests/worker.rs`
  - Add an ignored real-model `colonist-decide` smoke check.
- Modify: `server/bots/SettleGraphV2Client.js`
  - Add a validated `decideColonist` request method while reusing the existing worker process and health checks.
- Modify: `server/__tests__/SettleGraphV2Client.test.js`
  - Cover sequence correlation and semantic-action validation.

The target native interfaces are:

```rust
pub struct ColonistImportedSnapshot {
    pub imported: ImportedSnapshot,
    pub topology: ColonistTopologyMap,
    pub legal_targets: ColonistLegalTargets,
    pub server_sequence: u64,
}

pub fn import_colonist_snapshot(
    snapshot: &ColonistSnapshot,
    player_color: u8,
    server_sequence: u64,
) -> Result<ColonistImportedSnapshot, String>;

pub struct NativeDecision {
    pub game: CatanGame,
    pub actions: Vec<Action>,
    pub action_ids: Vec<usize>,
    pub value: f32,
    pub legal_action_count: usize,
}

impl DecisionEngine {
    pub fn decide_native(
        &mut self,
        imported: ImportedSnapshot,
    ) -> Result<NativeDecision, String>;
}

#[derive(Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum ColonistSemanticAction {
    RollDice,
    EndTurn,
    PlaceInitialRoad { edge_index: usize },
    PlaceInitialSettlement { corner_index: usize },
    BuildRoad { edge_index: usize },
    BuildSettlement { corner_index: usize },
    BuildCity { corner_index: usize },
    MoveRobber { tile_index: usize },
    SelectPlayer { player_color: u8 },
    SelectCards { cards: Vec<u8> },
    BuyDevelopmentCard,
    PlayKnight,
    PlayRoadBuilding,
    PlayMonopoly { resource: u8 },
    PlayYearOfPlenty { resources: [u8; 2] },
    BankTrade { give: Vec<u8>, receive: Vec<u8> },
}
```

Numeric Colonist action IDs and raw payload objects stay in the Node command mapper; they never enter the native action contract.

---

### Task 1: Lock the captured wire/state contract into one redacted fixture

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `scripts/colonist-bot/protocol.mjs`
- Create: `scripts/colonist-bot/state.mjs`
- Create: `scripts/colonist-bot/__tests__/protocol-state.test.js`
- Create: `scripts/colonist-bot/__tests__/fixtures/private-base-1v1.json`

- [ ] **Step 1: Create an isolated worktree and confirm the dirty main checkout is untouched**

Use `superpowers:using-git-worktrees`, create branch `codex/colonist-headless-adapter` from the current `HEAD`, and record both worktree paths. Run `git status --short --branch` in each. The new worktree must contain the committed design spec and no unrelated dirty files.

- [ ] **Step 2: Obtain dependency approval, then install only the approved packages**

After the user approves `ws@8.21.3` and `@msgpack/msgpack@3.1.3`, run:

```bash
pnpm add --save-exact ws@8.21.3 @msgpack/msgpack@3.1.3
```

Inspect `git diff -- package.json pnpm-lock.yaml` and reject any unrelated lockfile rewrite before continuing.

- [ ] **Step 3: Add the failing protocol/state test and redacted fixture**

The fixture stores the captured `Connected`, `SessionEstablished`, FirstGameState, BuildGame, and contiguous GameStateUpdated frames through the first guest-actionable prompt as base64. If the current trace ends before the guest's turn, capture only that next authorized private-room state advance; do not synthesize an actionable state. Replace session/user/game IDs and reconnect tokens before encoding; keep board geometry, rules, state sequence, prompt state, and legal target collections intact. The test starts with:

```js
import fixture from "./fixtures/private-base-1v1.json" with { type: "json" };
import { decodeServerFrame, encodeEnvelope } from "../protocol.mjs";
import { ColonistCommandGuard, ColonistStateTracker } from "../state.mjs";

it("decodes and applies the redacted full state and ordered diff", () => {
  const tracker = new ColonistStateTracker();
  const full = decodeServerFrame(Buffer.from(fixture.frames.buildGame, "base64"));
  const diff = decodeServerFrame(Buffer.from(fixture.frames.gameStateUpdated, "base64"));
  tracker.applyGameMessage(full.data);
  tracker.applyGameMessage(diff.data);
  expect(tracker.current().sequence).toBe(fixture.expected.sequenceAfterDiff);
  expect(tracker.current().state.mapState.tileHexStates).toHaveLength(19);
});

it("invalidates on a sequence gap and refuses a stale command", () => {
  const tracker = new ColonistStateTracker();
  const full = decodeServerFrame(Buffer.from(fixture.frames.buildGame, "base64"));
  tracker.applyGameMessage(full.data);
  expect(() => tracker.applyGameMessage({
    type: 91,
    sequence: tracker.current().sequence + 2,
    data: {}
  })).toThrow(/sequence gap/i);

  const guard = new ColonistCommandGuard();
  guard.begin({ sequence: 7, actor: 1, prompt: "initialPlacement", action: {} });
  expect(() => guard.validateCurrent({ sequence: 8, actor: 1, prompt: "initialPlacement" }))
    .toThrow(/stale/i);
});
```

- [ ] **Step 4: Run the test to prove the missing implementation fails**

```bash
pnpm exec vitest run scripts/colonist-bot/__tests__/protocol-state.test.js --reporter=verbose
```

Expected: failure because `protocol.mjs` and `state.mjs` do not exist.

- [ ] **Step 5: Implement framing, bootstrap parsing, and exact patch semantics**

In `protocol.mjs`, define observed route/subtype/message constants, parse public bootstrap assignments with bounded regular expressions, decode text handshake frames as JSON, decode binary application frames with `@msgpack/msgpack`, and encode:

```js
Buffer.concat([
  Buffer.from([route, subtype, recipientBytes.length]),
  recipientBytes,
  Buffer.from(encode(body))
]);
```

Reject recipient names longer than 255 bytes, non-object MessagePack roots, missing `id`/`data`, malformed bootstrap values, and unknown handshake text.

In `state.mjs`, mirror the observed Colonist patch rules exactly: recurse into objects, replace arrays/scalars, and delete an object property when the diff value is `null`. A BuildGame message establishes the base state. A GameStateUpdated message must be exactly the next sequence. `current()` returns a structured clone so consumers cannot mutate the tracker.

- [ ] **Step 6: Run the focused test and inspect the fixture for secrets**

```bash
pnpm exec vitest run scripts/colonist-bot/__tests__/protocol-state.test.js --reporter=verbose
rg -n -i 'reconnect|session|token|email|cookie|authorization' scripts/colonist-bot/__tests__/fixtures/private-base-1v1.json
```

Expected: test passes; the scan finds only explicit redaction markers, never captured values.

- [ ] **Step 7: Commit the protocol/state slice**

```bash
git add package.json pnpm-lock.yaml scripts/colonist-bot/protocol.mjs scripts/colonist-bot/state.mjs scripts/colonist-bot/__tests__
git commit -m "feat: decode Colonist game state stream"
```

---

### Task 2: Prove the Colonist board topology before importing gameplay state

**Files:**

- Modify: `native/settlegraph-v2/src/lib.rs`
- Create: `native/settlegraph-v2/src/colonist/mod.rs`
- Create: `native/settlegraph-v2/src/colonist/protocol.rs`
- Create: `native/settlegraph-v2/src/colonist/topology.rs`
- Create: `native/settlegraph-v2/tests/colonist.rs`

- [ ] **Step 1: Add a failing 19/54/72/9 topology round-trip test**

Load `scripts/colonist-bot/__tests__/fixtures/private-base-1v1.json` with `include_str!`, deserialize its redacted `colonistState`, and assert:

```rust
let map = ColonistTopologyMap::from_snapshot(&snapshot)?;
assert_eq!(map.tile_count(), 19);
assert_eq!(map.corner_count(), 54);
assert_eq!(map.edge_count(), 72);
assert_eq!(map.port_count(), 9);

for native in 0..19 {
    let colonist = map.native_tile_to_colonist(native)?;
    assert_eq!(map.colonist_tile_to_native(colonist)?, native as u8);
}
for native in 0..54 {
    let colonist = map.native_corner_to_colonist(native)?;
    assert_eq!(map.colonist_corner_to_native(colonist)?, native as u8);
}
for native in 0..72 {
    let colonist = map.native_edge_to_colonist(native)?;
    assert_eq!(map.colonist_edge_to_native(colonist)?, native as u8);
}
for native in 0..9 {
    let colonist = map.native_port_to_colonist(native)?;
    assert_eq!(map.colonist_port_to_native(colonist)?, native as u8);
}
```

Also assert that a known legal opening settlement and road from the fixture map to the same physical corner/edge after a native-to-Colonist-to-native round trip.

- [ ] **Step 2: Run the Rust test to prove it fails**

```bash
cargo test --manifest-path native/settlegraph-v2/Cargo.toml --test colonist topology -- --nocapture
```

Expected: compilation failure because the Colonist modules do not exist.

- [ ] **Step 3: Add narrow Serde views for board geometry**

In `colonist/protocol.rs`, deserialize only fields required for V1. Preserve Colonist array indexes as their transport IDs:

```rust
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColonistSnapshot {
    pub game_settings: ColonistGameSettings,
    pub map_state: ColonistMapState,
    pub player_states: BTreeMap<u8, ColonistPlayerState>,
    pub current_state: ColonistCurrentState,
    pub bank_state: ColonistBankState,
    pub dice_state: ColonistDiceState,
}
```

Use `Option<T>` only for fields genuinely absent at different Base phases. Missing required geometry or rules fields must remain a deserialization/import error.

- [ ] **Step 4: Implement incidence-derived topology mapping**

In `colonist/topology.rs`, map tile centers from Colonist cube coordinates to the pinned native centers, derive corners from the six incident tile corners, derive edges from their endpoint corners, and derive ports from their coastal edge. Reject duplicates, missing indexes, non-Base counts, or incidence disagreement.

Do not use captured array order as the native order and do not maintain a handwritten lookup table.

- [ ] **Step 5: Run the topology test and the existing native topology tests**

```bash
cargo test --manifest-path native/settlegraph-v2/Cargo.toml --test colonist topology -- --nocapture
cargo test --manifest-path native/settlegraph-v2/Cargo.toml topology -- --nocapture
```

Expected: all tests pass and every mapping direction is total and bijective.

- [ ] **Step 6: Commit the topology proof**

```bash
git add native/settlegraph-v2/src/lib.rs native/settlegraph-v2/src/colonist native/settlegraph-v2/tests/colonist.rs
git commit -m "feat: map Colonist board topology"
```

---

### Task 3: Import Colonist Base 1v1 directly into the native contract

**Files:**

- Create: `native/settlegraph-v2/src/colonist/snapshot.rs`
- Modify: `native/settlegraph-v2/src/colonist/mod.rs`
- Modify: `native/settlegraph-v2/src/colonist/protocol.rs`
- Modify: `native/settlegraph-v2/tests/colonist.rs`

- [ ] **Step 1: Add failing settings, state, observation, and legality assertions**

Extend `tests/colonist.rs` so the captured opening state imports for the guest color and asserts:

```rust
let imported = import_colonist_snapshot(&snapshot, fixture.player_color, fixture.sequence)?;
assert_eq!(imported.server_sequence, fixture.sequence);
assert_eq!(imported.imported.actor, fixture.expected_actor);
assert_eq!(imported.imported.observation.len(), 1445);
assert_eq!(imported.imported.action_mask.len(), 299);
assert!(imported.imported.action_mask.iter().any(|legal| *legal));
assert_eq!(imported.legal_targets.initial_placements, fixture.legal_initial_placements);
```

Add table cases that mutate one supported setting at a time and require a clear error for 4-player mode, target 10, random dice, discard 7, disabled friendly robber, wrong piece limits, or non-Base map/mode. Add a separate state case that rejects an active player-trade prompt.

- [ ] **Step 2: Run the focused import test to prove it fails**

```bash
cargo test --manifest-path native/settlegraph-v2/Cargo.toml --test colonist import -- --nocapture
```

Expected: failure because `import_colonist_snapshot` is missing.

- [ ] **Step 3: Validate the V1 room and visibility contract first**

Implement `validate_colonist_contract` before any state conversion. Require two seats/colors, private room, Base mode/map, exact target/dice/discard/friendly-robber/piece/dev-card settings, and a guest-perspective player state with its own private inventory. Reject player-trade prompts even if the room otherwise matches.

- [ ] **Step 4: Import board and player state into `CatanGame`**

Populate the native game from the current reconstructed snapshot:

- tile resources, production numbers, robber tile, and port types through `ColonistTopologyMap`;
- corner buildings and edge roads by owner color;
- bank resources, development deck count, each player's public score, remaining pieces, played knights, and known/private card counts;
- current actor, setup/normal/robber/development-card phase, dice state, pending discards, and pending selections;
- longest-road and largest-army owners plus counters needed by the native engine.

Treat absent opponent private cards as counts/card backs, never as zero known cards. Fail if Colonist exposes less information than observation-v2 requires for a legal decision.

- [ ] **Step 5: Generate observation and mask only in Rust**

After the native state is complete, call the existing `encode_obs_v2` and `fill_action_mask`. Derive `ColonistLegalTargets` from the active Colonist prompt/highlight collections and cross-check that every legal native spatial action maps into that set. Reject a mismatch instead of shrinking the mask silently.

- [ ] **Step 6: Run import plus existing snapshot tests**

```bash
cargo test --manifest-path native/settlegraph-v2/Cargo.toml --test colonist -- --nocapture
cargo test --manifest-path native/settlegraph-v2/Cargo.toml snapshot -- --nocapture
```

Expected: all tests pass; unsupported settings fail with specific messages.

- [ ] **Step 7: Commit the native Colonist importer**

```bash
git add native/settlegraph-v2/src/colonist native/settlegraph-v2/tests/colonist.rs
git commit -m "feat: import Colonist state into SettleGraph"
```

---

### Task 4: Return one legal semantic Colonist action from the existing worker

**Files:**

- Modify: `native/settlegraph-v2/src/decision.rs`
- Create: `native/settlegraph-v2/src/colonist/action.rs`
- Modify: `native/settlegraph-v2/src/colonist/mod.rs`
- Modify: `native/settlegraph-v2/src/protocol.rs`
- Modify: `native/settlegraph-v2/src/main.rs`
- Modify: `native/settlegraph-v2/tests/colonist.rs`
- Modify: `native/settlegraph-v2/tests/worker.rs`
- Modify: `server/bots/SettleGraphV2Client.js`
- Modify: `server/__tests__/SettleGraphV2Client.test.js`

- [ ] **Step 1: Add failing target-neutral decision and worker-client tests**

Add a deterministic test using a stubbed legal mask/logit selection to prove that `decide_native` returns selected native `Action` values without planning a website move. Add a `SettleGraphV2Client` test that writes this correlated response:

```json
{
  "id": "1",
  "ok": true,
  "stateSequence": 42,
  "action": { "kind": "buildSettlement", "cornerIndex": 17 },
  "actionIds": [83],
  "value": 0.125,
  "legalActionCount": 4,
  "modelSha256": "072906d17077f1ed3fa4e9254999a8920ec243bdda3ab42575258492b58465c8"
}
```

Require `decideColonist` to reject the wrong sequence, an absent action, an unknown action kind, or an unexpected model identity.

- [ ] **Step 2: Run the targeted tests to prove they fail**

```bash
cargo test --manifest-path native/settlegraph-v2/Cargo.toml --test colonist action -- --nocapture
pnpm exec vitest run server/__tests__/SettleGraphV2Client.test.js --reporter=verbose
```

Expected: failure because `decide_native`, the semantic planner, and `decideColonist` do not exist.

- [ ] **Step 3: Factor native choice without changing website behavior**

Move inference and discard-sequence selection into `DecisionEngine::decide_native`. Keep the pre-decision game plus the selected native action sequence in `NativeDecision`; normal turns contain one action and a discard prompt can contain several discard actions. Keep `DecisionEngine::decide` as a thin website adapter that converts those native actions through the existing website planner. Run existing decision tests immediately after the refactor to prove the website contract remains byte-for-byte equivalent at the serialized response boundary.

- [ ] **Step 4: Implement semantic Colonist planning and legality recheck**

In `colonist/action.rs`, map the selected native action through `ColonistTopologyMap` into `ColonistSemanticAction`. For discards, retain the existing repeated native inference steps but return one `SelectCards` command. For robber/dev-card flows, return the next semantic choice required by the current Colonist prompt, not a future command batch.

Before returning, require the semantic target to be present in `ColonistLegalTargets`. Reject native player-trade actions; encode bank trades as `isBankTrade: true` semantic data only.

- [ ] **Step 5: Add `colonist-decide` to the JSON-lines worker**

Extend `WorkerRequest` with optional `playerColor`, `stateSequence`, and `colonistState`. In `main.rs`, require all three only for `colonist-decide`, run the direct importer and decision, and return:

```rust
json!({
    "id": request.id,
    "ok": true,
    "stateSequence": state_sequence,
    "action": action,
    "actionIds": decision.action_ids,
    "value": decision.value,
    "legalActionCount": decision.legal_action_count,
    "modelSha256": engine.model_sha256,
    "contract": engine.contract,
})
```

Existing `health` and website `decide` modes must retain their current request and response shapes.

- [ ] **Step 6: Add the real sealed-model dry-run smoke**

Extend `native/settlegraph-v2/tests/worker.rs` with an ignored test that starts the real worker, submits the redacted captured Colonist state, and asserts the returned semantic command belongs to the fixture's current legal target set. It must not open a socket or send a Colonist action.

Run it explicitly:

```bash
SETTLEX_SETTLEGRAPH_V2_MODEL=/Users/david/Documents/ChatGPT/settlex-v2-production-2026-08-25/accepted/accepted-v2.ctnn \
  cargo test --manifest-path native/settlegraph-v2/Cargo.toml --test worker colonist_decide -- --ignored --nocapture
```

Expected: one correlated legal semantic action, correct model/contract hashes, no network activity.

- [ ] **Step 7: Run all native and worker-client tests**

```bash
cargo test --manifest-path native/settlegraph-v2/Cargo.toml -- --nocapture
pnpm exec vitest run server/__tests__/SettleGraphV2Client.test.js --reporter=verbose
```

- [ ] **Step 8: Commit the worker contract**

```bash
git add native/settlegraph-v2/src native/settlegraph-v2/tests server/bots/SettleGraphV2Client.js server/__tests__/SettleGraphV2Client.test.js
git commit -m "feat: add Colonist decision mode"
```

---

### Task 5: Connect one ephemeral guest and maintain one ordered game stream

**Files:**

- Create: `scripts/colonist-bot/client.mjs`
- Modify: `scripts/colonist-bot/protocol.mjs`
- Modify: `scripts/colonist-bot/state.mjs`
- Modify: `scripts/colonist-bot/__tests__/protocol-state.test.js`

- [ ] **Step 1: Extend the Node test with a fake WebSocket transcript**

Use an injected `webSocketFactory` and fake clock. Assert this exact sequence:

1. one bootstrap `GET`;
2. connect to `${socketUrl}?version=2`;
3. consume `Connected`/`SessionEstablished`;
4. send lobby join route `2`, subtype `2`, recipient room code, action `5`, payload `{ gameId, clientVersion }`;
5. send route `4`/subtype `8` heartbeat no faster than once per second;
6. after FirstGameState, address gameplay to its server ID;
7. on a gap, send action `67` RequestGameState once and suppress gameplay;
8. after a socket drop, reconnect with bounded delays and memory-only reconnect data.

- [ ] **Step 2: Run the test to prove it fails**

```bash
pnpm exec vitest run scripts/colonist-bot/__tests__/protocol-state.test.js --reporter=verbose
```

Expected: failure because `ColonistClient` does not exist.

- [ ] **Step 3: Implement the guest WebSocket lifecycle**

`ColonistClient.connect` must fetch the bootstrap once, create exactly one guest socket, join exactly the supplied room, emit normalized state events from application ID `130`, and keep `serverId`, guest color, action-send sequence, and reconnect token private to the instance.

Use one-second heartbeat scheduling. Reconnect only on transport closure with delays `[1000, 2000, 4000, 8000]` ms, reset after a healthy full state, and stop after the fourth failed attempt. Do not retry protocol errors, incompatible settings, rejected commands, or unknown gameplay prompts.

- [ ] **Step 4: Enforce one gameplay command and one resync request at a time**

`sendGameAction` must require the caller's `expectedServerSequence` to equal the tracker's current sequence and the command guard to be idle. Increment Colonist's client action sequence once per send. The next contiguous server diff acknowledges the command and unlocks the guard. A gap invalidates the guard, issues one RequestGameState, and cannot trigger a bot decision until a new BuildGame arrives.

- [ ] **Step 5: Run the fake transcript test**

```bash
pnpm exec vitest run scripts/colonist-bot/__tests__/protocol-state.test.js --reporter=verbose
```

Expected: pass with no real network calls.

- [ ] **Step 6: Commit the headless client**

```bash
git add scripts/colonist-bot/client.mjs scripts/colonist-bot/protocol.mjs scripts/colonist-bot/state.mjs scripts/colonist-bot/__tests__/protocol-state.test.js
git commit -m "feat: connect Colonist guest headlessly"
```

---

### Task 6: Wire the runner, CLI, dry-run gate, and shareable summary

**Files:**

- Create: `scripts/colonist-bot/runner.mjs`
- Create: `scripts/colonist-bot/cli.mjs`
- Create: `scripts/colonist-bot/README.md`
- Modify: `scripts/colonist-bot/state.mjs`
- Modify: `scripts/colonist-bot/__tests__/protocol-state.test.js`
- Modify: `package.json`

- [ ] **Step 1: Add failing runner assertions using stub client and worker**

In the existing Node suite, prove:

- no worker call when it is not the guest's prompt;
- exactly one worker call for a new actionable sequence;
- a changed sequence/actor/prompt discards the worker response;
- a valid response resolves a corner/edge/tile index to the exact current Colonist state object;
- `--dry-run` records the command but calls no socket send;
- multi-step development-card/robber actions send only the next command, then wait for the required follow-up prompt.

- [ ] **Step 2: Run the Node test to prove it fails**

```bash
pnpm exec vitest run scripts/colonist-bot/__tests__/protocol-state.test.js --reporter=verbose
```

Expected: failure because the runner is missing.

- [ ] **Step 3: Implement the semantic command mapper**

Keep numeric Colonist IDs in one frozen table in `runner.mjs`:

```js
const GAME_ACTION = Object.freeze({
  rollDice: 2,
  selectedTile: 3,
  selectedPlayer: 5,
  endTurn: 6,
  selectedCards: 7,
  selectedCardsState: 8,
  buyDevelopmentCard: 9,
  wantRoad: 10,
  confirmRoad: 11,
  confirmRoadDirect: 12,
  wantSettlement: 14,
  confirmSettlement: 15,
  confirmSettlementDirect: 16,
  wantCity: 17,
  confirmCity: 18,
  confirmCityDirect: 19,
  clickedDevelopmentCard: 48,
  createTrade: 49
});
```

Resolve board target indexes against the latest snapshot and require them in the current highlight/selection collection. Use the client's observed direct-confirm commands (`12`, `16`, and `19`) for legal spatial placements, including the corresponding setup prompt, so the headless path does not emulate hover/preview UI. Encode bank trades as `{ creator, isBankTrade: true, offeredResources, wantedResources }`. Unknown action kinds or prompt/action combinations throw and stop the run.

- [ ] **Step 4: Implement the runner state machine**

For a direct prompt, revalidate sequence, guest actor, current action state, and legal targets, then send one command. Use direct-confirm placement commands only where the captured client contract exposes them; do not add a speculative `WantToBuild*` round trip. Development cards, robber victim selection, and discards follow the next-prompt-only rule: send one step, wait for the server's next prompt, then decide or continue.

Deduplicate decisions by server sequence and keep no speculative command queue.

- [ ] **Step 5: Implement CLI validation and summary output**

Support:

```text
pnpm colonist:bot -- --room <private-code> --model <accepted-v2.ctnn> [--worker <binary>] [--dry-run]
```

Default `--worker` to `native/settlegraph-v2/target/release/settlegraph-v2-worker` relative to the repository. Reject room values containing anything except the lobby code. Handle SIGINT/SIGTERM by closing the socket and worker cleanly.

Print one end summary containing only protocol/client version, verified model/contract hashes, validated settings, decisions, commands, reconnect count, result, and fail-closed reason. Do not print raw states, session data, reconnect data, guest suffixes, or private hands.

- [ ] **Step 6: Document exact build and run commands**

In `README.md`, include:

```bash
cargo build --release --manifest-path native/settlegraph-v2/Cargo.toml
pnpm colonist:bot -- \
  --room ROOMCODE \
  --model /Users/david/Documents/ChatGPT/settlex-v2-production-2026-08-25/accepted/accepted-v2.ctnn \
  --dry-run
```

State that the protocol was observed on 2026-08-27, is unofficial/drift-prone, and the tool is limited to Colonist-authorized private testing.

- [ ] **Step 7: Run all three durable checks**

```bash
pnpm exec vitest run scripts/colonist-bot/__tests__/protocol-state.test.js server/__tests__/SettleGraphV2Client.test.js --reporter=verbose
cargo test --manifest-path native/settlegraph-v2/Cargo.toml --test colonist -- --nocapture
SETTLEX_SETTLEGRAPH_V2_MODEL=/Users/david/Documents/ChatGPT/settlex-v2-production-2026-08-25/accepted/accepted-v2.ctnn \
  cargo test --manifest-path native/settlegraph-v2/Cargo.toml --test worker colonist_decide -- --ignored --nocapture
```

Expected: protocol/state/guard passes; all topology/action/import round trips pass; the real sealed model returns a legal current command without a socket.

- [ ] **Step 8: Build release worker and run an authorized connected dry run**

```bash
cargo build --release --manifest-path native/settlegraph-v2/Cargo.toml
pnpm colonist:bot -- \
  --room bank7527 \
  --model /Users/david/Documents/ChatGPT/settlex-v2-production-2026-08-25/accepted/accepted-v2.ctnn \
  --dry-run
```

If `bank7527` has expired, ask the user for one replacement private room code. Success means the guest joins headlessly, reconstructs a full current state, verifies the model and room contract, logs one legal redacted intended command, sends no gameplay action, and exits cleanly.

- [ ] **Step 9: Commit the runnable adapter**

```bash
git add package.json scripts/colonist-bot
git commit -m "feat: run SettleGraph in private Colonist rooms"
```

---

### Task 7: Perform the authorized staged private-room proof

**Files:**

- Modify only if protocol drift is found: `scripts/colonist-bot/protocol.mjs`, `scripts/colonist-bot/state.mjs`, `scripts/colonist-bot/runner.mjs`, redacted fixture/tests, or native Colonist modules.
- Create: `docs/agent/colonist-adapter-findings.md`

- [ ] **Step 1: Run opening placement and a few normal turns**

With the user hosting a fresh private Safari room, run the CLI without `--dry-run`. Stop after opening placement plus a few normal turns. Verify from server state—not visual assumption—that each command advanced exactly one expected sequence and landed on the intended corner/edge/tile.

- [ ] **Step 2: Fix only observed adapter mismatches test-first**

If a mismatch appears, stop the socket, add the smallest redacted frame/action case to one of the three durable checks, reproduce the failure locally, implement the narrow correction, and rerun the focused check. Do not add retries or random fallbacks around a semantic mismatch.

- [ ] **Step 3: Attempt one complete private game**

Restart with a fresh guest identity and play until game end or a fail-closed unsupported prompt. Record only aggregate move/reconnect/result counters. A fail-closed stop is acceptable evidence of a missing V1 command; it is not permission to guess or widen scope.

- [ ] **Step 4: Write the short Colonist-facing findings note**

`docs/agent/colonist-adapter-findings.md` should summarize the authorized setup, bootstrap/framing/state approach, rate controls, tested room settings, number of games/turns, reconnect behavior, result, and any protocol fragility. Exclude reverse-engineered source excerpts, tokens, reusable identifiers, private cards, and player-specific data.

- [ ] **Step 5: Run final focused verification and inspect the branch**

```bash
pnpm exec vitest run scripts/colonist-bot/__tests__/protocol-state.test.js server/__tests__/SettleGraphV2Client.test.js --reporter=verbose
cargo test --manifest-path native/settlegraph-v2/Cargo.toml -- --nocapture
git status --short --branch
git log --oneline --decorate -8
```

Expected: all non-ignored checks pass, the working tree contains no accidental captures/secrets, and commits contain only the adapter, native integration, tests, and findings note.

- [ ] **Step 6: Commit any proven protocol correction and findings**

```bash
git add docs/agent/colonist-adapter-findings.md scripts/colonist-bot native/settlegraph-v2 server/bots/SettleGraphV2Client.js server/__tests__/SettleGraphV2Client.test.js
git commit -m "docs: record Colonist adapter findings"
```

Do not stage a path that did not actually change, and inspect `git diff --cached --stat` before committing.
