# SettleGraph V2 Product Integration Design

**Date:** 2026-08-25

## Objective

Make the sealed SettleGraph CTNN-v2 policy selectable and playable as a two-player target-15 Catana opponent through the existing SettleX UI. Keep the training worktree, sealed artifacts, Champion registry, and production deployment unchanged.

## Authoritative contract

- Native source contract: `settlex-ai` commit `a1fdc96a008a6f0e0b6bd23df8c4cf869da051ec`
- Model kind: SettleGraph / CTNN-v2
- Observation: version 2, 1,445 floats, realistic visibility
- Actions: codec version 1, 299 logits
- Game: two-player target-15 duel
- CTNN artifact SHA-256: `072906d17077f1ed3fa4e9254999a8920ec243bdda3ab42575258492b58465c8`
- Candidate model SHA-256: `907e7b344b1a7e783e5e387f037bb01192b7d3034f1b6b1398bf0421d9f693e2`

The accepted CTNN file remains outside this repository and read-only. The integration must validate its exact hash and embedded contract before inference.

## Decisive boundary

The live Catana board and the native environment use different tile, vertex, and edge numbering. The website also represents edges as vertex-pair strings, while the native codec uses fixed ordinal edge IDs. Therefore JavaScript must not construct observation-v2 or legal masks, and the existing Puffer state adapter is not reusable for V2 semantics.

The land graph has an exact orientation-preserving permutation, but the standard website port-edge pattern is not graph-isomorphic to the native port-edge pattern: only three of nine port edges align under the direct orientation and no board symmetry aligns all nine. Mapping only current port ownership would make future settlement value, vertex port features, and bank-trade legality diverge from the sealed contract.

The product integration will pin the proven native codec, rules, observation, model loader, and game-state types in a small product-owned Rust crate. A Rust snapshot adapter will translate the complete authoritative server state into the native environment, including a fixed topology permutation proved by incidence tests.

## Architecture

### Product-owned native worker

Add an isolated `native/settlegraph-v2` Rust crate containing a provenance manifest and the minimal pinned native modules needed for:

1. two-player target-15 rules;
2. the 299-action codec;
3. observation-v2 construction;
4. CTNN-v2 loading and deterministic inference;
5. website snapshot import and action-plan export.

The crate may add only the small serialization dependencies needed for an NDJSON worker protocol (`serde` and `serde_json`) beyond the pinned native dependencies.

The long-lived worker loads the CTNN once. Each decision request contains a full authoritative Catana snapshot. The worker validates the ruleset and seat, imports the state, rebuilds native caches, constructs the exact observation and legal mask, applies deterministic legal argmax, and returns semantic move steps rather than raw website IDs.

The direct policy is the initial playable contract. Equal-search is deliberately excluded because it adds a separate search/runtime architecture and is not required to use the sealed eligible model.

### Topology and state translation

The adapter owns static bijections for website-to-native tiles, vertices, and edges. Contract tests prove that every tile ring, edge endpoint, and adjacency relation is preserved.

SettleGraph V2 matches use a dedicated board-source projection. It keeps the selected standard duel land tiles, numbers, provenance, and randomized port-resource multiset, but attaches the nine port tiles to the boundary edges corresponding exactly to the native topology's port slots. The projection is selected only in V2 match setup; ordinary duel, matchmaking, friend, and Puffer games retain their current board sources. The worker rejects a V2 snapshot whose port attachments do not match the native contract.

The imported snapshot covers:

- board resources, numbers, robber, ports, buildings, and roads;
- both player inventories, pieces, development cards, and public scores;
- bank and development-card supply;
- current player, phase, stage, dice state, and pending development-card state;
- public game-log events required by observation-v2 roll and development-card history;
- deterministic rules and balanced-dice state.

Snapshot import is preferred to a mirrored native game because it is stateless across worker restarts and does not depend on reconstructing hidden information from incomplete action logs.

### Action translation

The worker returns one or more semantic steps that the Node server maps to existing Boardgame.io moves. The existing reducer remains authoritative and rejects any invalid step.

Atomic native actions translate as follows:

- placement, roll, buy, end-turn, bank trade, robber, and steal: one existing move;
- Monopoly and Year of Plenty: start plus confirm plan;
- Road Building: start plus the native road selections supported by the live stage flow;
- forced discard: repeatedly query/simulate the native policy until the required count is reached, then emit one website `discardResources` move;
- duel robber steal: allow the live reducer's forced sole-opponent selection where applicable.

No native player-trade actions are legal in this duel contract.

### Server routing and lifecycle

Add a composite bot manager keyed by match metadata:

- `puffer` continues through the existing Puffer manager unchanged;
- `settlegraph-v2` uses the native worker client.

Match creation accepts only allowlisted bot keys, stores the selected key and display name, and rejects V2 creation when its feature flag is disabled. The public home action is also disabled by default and appears only when explicitly enabled.

The existing bot timer and sequential dispatch path remain in control of scheduling and reducer application. The bot-stage schedule will include forced discard so V2 does not wait for the generic human timeout after the opponent rolls a seven.

### Failure behavior

Worker startup and every response are contract-checked. A missing binary, wrong model hash, malformed snapshot, timeout, crash, illegal action, or reducer rejection produces a structured error with match and decision context.

- Before a V2 match is created: disabled configuration is rejected clearly.
- During a match: the current decision falls back through the existing Puffer path so the game cannot deadlock.
- The fallback is surfaced through the existing match alert/update mechanism and server logs; it does not silently claim to be a V2 decision.
- The worker client restarts lazily after a crash, and the next request repeats model preflight.

Feature flags and bot-key routing make removal reversible without changing Puffer or ordinary matches.

## UI scope

Add one existing-style system action, **Play SettleGraph V2**, alongside **Play vs Bot**. It calls the same bot-match creation flow with a different bot key. No new modal, shared primitive, or broader homepage redesign is included.

## Verification

Automated coverage will include:

1. artifact hash, CTNN header, dimensions, probe, and deterministic inference;
2. topology bijection and incidence preservation;
3. representative snapshot import and observation-v2 fields;
4. legal-mask/action mapping for setup, normal play, discard, robber, bank trade, and development cards;
5. reducer acceptance of returned plans and rejection/fallback for illegal results;
6. Puffer/V2 routing, feature flags, worker failures, and forced-discard scheduling;
7. an end-to-end server smoke that creates a V2 bot game, advances opening play, accepts a human action, and receives a legal V2 response;
8. a local browser smoke through the existing homepage and game UI.

## Deployment boundary

This lane stops at a verified local integration. It will not copy or mutate the sealed model, update the Champion registry, push, package production Docker images, or deploy.

A later explicitly approved deployment must decide the immutable production model location/mount, build the Rust worker for the server image, configure the public/server feature flags, and use the thorough release lane because Docker/runtime infrastructure is involved.
