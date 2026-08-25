# SettleGraph V2 Product Integration Implementation Plan

> Design: `docs/superpowers/specs/2026-08-25-settlegraph-v2-product-integration-design.md`

**Goal:** Make the sealed CTNN-v2 policy selectable and playable in a local two-player target-15 Catana game while preserving the existing Puffer lane and keeping training, sealed artifacts, the Champion registry, and production untouched.

**Architecture:** A pinned Rust NDJSON worker receives full authoritative Boardgame.io state, performs the exact native topology/state/observation/legality/inference/action contract, and returns reducer move plans. A composite Node bot manager routes by seat `botKey`, with disabled-by-default configuration and Puffer fallback.

**Stack:** Rust 2021, pinned `catan-core`/SettleGraph modules, `serde`, `serde_json`, Node ESM, Vitest, Boardgame.io, Next 13.

## Task 1: Pin the native runtime and prove provenance

**Files:**

- Add `native/settlegraph-v2/PROVENANCE.md`
- Add `native/settlegraph-v2/Cargo.toml`
- Add `native/settlegraph-v2/vendor/catan-core/**`
- Add `native/settlegraph-v2/vendor/catan-env-contract/**`
- Add `native/settlegraph-v2/src/lib.rs`
- Add `native/settlegraph-v2/src/main.rs`
- Add `native/settlegraph-v2/tests/contract.rs`

1. Write a failing Rust contract test for codec version 1, observation version 2, dimension 1,445, action count 299, contract SHA, CTNN artifact SHA, and the CTNN embedded probe.
2. Mechanically import the exact `catan-core` source and the required `codec`, `obs`, `obs_v2`, `settlegraph_contract`, and `settlegraph_net` modules from commit `a1fdc96a008a6f0e0b6bd23df8c4cf869da051ec` without editing the research worktree.
3. Add a minimal library/binary crate and provenance record with source commit and file hashes.
4. Run `cargo test --manifest-path native/settlegraph-v2/Cargo.toml contract` and confirm green.
5. Commit only the pinned runtime and contract test.

## Task 2: Build and test exact topology translation

**Files:**

- Add `native/settlegraph-v2/src/protocol.rs`
- Add `native/settlegraph-v2/src/topology.rs`
- Add `native/settlegraph-v2/tests/topology.rs`
- Add `server/__tests__/fixtures/settlegraphV2States.js`

1. Add a failing topology test using a real deterministic Catana duel snapshot fixture.
2. Derive native tile IDs from website cube coordinates using the standard pointy-hex basis; derive vertex IDs by named corner incidence and edge IDs by mapped endpoints.
3. Prove the standard website port pattern cannot preserve the native port incidence and record the required V2-only board-source boundary.
4. Reject nonstandard, incomplete, ambiguous, or non-bijective land topologies.
5. Prove all 19 tiles, 54 vertices, 72 edges, tile rings, adjacency, and edge endpoints are preserved.
6. Run the topology test and commit.

## Task 3: Import authoritative state and reproduce native legality/observation

**Files:**

- Add `native/settlegraph-v2/src/snapshot.rs`
- Add `native/settlegraph-v2/tests/snapshot.rs`
- Add/update the duel snapshot fixture generator under `server/__tests__/fixtures/`

1. Add failing tests for setup settlement/road, pre-roll, post-roll, robber discard/move, Road Building, resources/bank, dev hands, bought/played cards, awards, and game-over states.
2. Deserialize the raw server state without masking.
3. Validate the exact two-player target-15 duel rules.
4. Build the native board/deck and translate resources/dev cards/roads/buildings/awards/turn state.
5. Rebuild native occupied, road, port, longest-road, piece-count, and dice caches.
6. Reconstruct public roll/dev history from the durable game log; derive normal-turn count from non-placement `turn:end` events.
7. Encode observation-v2 and fill the native legal mask entirely in Rust.
8. Assert representative observation offsets, actor identity, legal action IDs, and cache invariants, then commit.

## Task 4: Implement inference and exact action plans

**Files:**

- Add `native/settlegraph-v2/src/decision.rs`
- Complete `native/settlegraph-v2/src/main.rs`
- Add `native/settlegraph-v2/tests/action_plans.rs`
- Add `native/settlegraph-v2/tests/worker.rs`

1. Add failing tests for every supported action family and deterministic highest-legal-logit selection.
2. Load and preflight the sealed CTNN once at worker startup; verify the exact external SHA before parsing.
3. For each request, import the snapshot, encode observation-v2, fill legality, run `forward_raw`, and select deterministic legal argmax.
4. Map native locations back to website IDs in Rust.
5. Translate setup/build/roll/end/buy/knight/robber/bank-trade actions to existing reducer moves.
6. Translate Monopoly and Year of Plenty to sequential start/confirm plans.
7. For discard, repeatedly infer and execute native one-card discard actions on the imported state, then return one exact website discard payload.
8. Return structured NDJSON success/error responses with contract metadata and decision diagnostics.
9. Test model hash mismatch, malformed snapshots, no legal actions, invalid protocol, and deterministic repeated requests; then commit.

## Task 5: Add the Node worker client and bot router

**Files:**

- Add `server/bots/SettleGraphV2Client.js`
- Add `server/bots/settleGraphV2Manager.js`
- Add `server/bots/BotManager.js`
- Add `server/__tests__/SettleGraphV2Client.test.js`
- Add `server/__tests__/settleGraphV2Manager.test.js`
- Add `server/__tests__/BotManager.test.js`
- Modify `server/server.js`

1. Add failing client tests for start, request correlation, timeout, malformed response, worker exit, lazy restart, and close.
2. Implement a long-lived spawned worker client with one request timeout and no observation semantics in JavaScript.
3. Add failing router tests proving `puffer` remains on Puffer, `settlegraph-v2` uses V2, and V2 errors produce a structured warning plus a Puffer decision for the current turn.
4. Implement match-metadata bot-key routing while preserving the existing manager interface used by timers, presence, and dispatch.
5. Wire environment configuration in `server/server.js` and close the worker on process shutdown.
6. Run targeted server tests and commit.

## Task 6: Make match creation and UI selection reversible

**Required design routing before edits:** read `.agents/skills/catana-design/SKILL.md`, `docs/agent/UI_CONTEXT.md`, `docs/agent/skills/catana-brand/SKILL.md`, and inspect `docs/agent/UI_CATALOG.md` plus the owning `HomeTitleChrome` story.

**Files:**

- Modify `lib/server/matches/botMatch.js`
- Modify `lib/server/matches/createMatchForAccount.js`
- Modify `lib/shared/catanaGameModes.js`
- Modify `app/catana/gameSetup/boardSources.js`
- Modify `app/api/matches/create/handler.js`
- Modify `app/catana/lobby/useLobbyHomeActions.js`
- Modify `app/catana/home/HomeTableClient.js`
- Modify `app/catana/home/HomeTitleChrome.js`
- Modify `app/catana/home/HomeTitleChrome.stories.jsx`
- Modify behavior tests in `lib/server/__tests__/` and `app/__tests__/api/matchRoutes.test.js`
- Add focused component/model tests only where behavior cannot be covered through the route/action seam

1. Add failing match tests for allowlisted bot keys, V2 metadata/display name, default Puffer compatibility, and disabled V2 rejection.
2. Add failing lobby/UI behavior tests for the feature-gated action and `botKey` request payload.
3. Add a tested SettleGraph V2 board source that preserves the chosen duel land board and port-resource multiset while projecting ports onto the exact native-contract boundary edges.
4. Centralize bot descriptors, V2 board-source selection, and feature-flag resolution in `botMatch.js`.
5. Thread `botKey` through bot-match creation and preserve existing cleanup behavior.
6. Add the existing-style **Play SettleGraph V2** action only when `NEXT_PUBLIC_SETTLEX_SETTLEGRAPH_V2=1` and send `botKey: "settlegraph-v2"`.
7. Preserve all unrelated dirty matchmaking edits and verify the owning story on desktop and phone widths.
8. Run targeted app/server tests and commit only integration changes.

## Task 7: Schedule forced discard and validate reducer execution

**Files:**

- Modify `server/stagePolicy.js`
- Modify `server/timers/TimerManager.js`
- Modify `server/dispatch/dispatchMatchUpdate.js` only if structured decision metadata requires it
- Modify `server/__tests__/stagePolicy.test.js`
- Modify `server/__tests__/TimerManager.test.js`
- Modify `server/__tests__/dispatchMatchUpdate.test.js`

1. Add failing tests that schedule `autoBot` for every bot in `main:robberDiscard`, including when the turn owner is human.
2. Add `main:robberDiscard` to bot-action stages and schedule from `getStagePlayers` rather than only `ctx.currentPlayer` for that stage.
3. Add reducer-plan tests covering sequential YOP/Monopoly and rejecting an illegal worker step before later steps execute.
4. Confirm Puffer's existing auto-discard fallback still works.
5. Run targeted tests and commit.

## Task 8: End-to-end local playable smoke

**Files:**

- Add `server/__tests__/settleGraphV2.e2e.test.js`
- Add `scripts/settlegraph-v2-smoke.mjs` only if the in-process test cannot drive the real server seam cleanly
- Modify `package.json` with native build/test convenience scripts

1. Add a failing smoke that creates a real duel bot match, joins V2 seat metadata, readies the bot, advances legal opening placement, accepts a human action, and applies a real V2 response through `Master`.
2. Build the worker and run the smoke against the sealed CTNN path.
3. Start local Next/game servers with both feature flags; use the browser to create a V2 game and complete at least the opening interaction plus one normal V2 decision.
4. Capture exact evidence: selected bot metadata, worker contract log, accepted reducer moves, and final state progression.

## Task 9: Final verification and handoff

**Files:**

- Modify `docs/agent/PROGRESS.md`
- Modify `docs/agent/NOTES.md`
- Add `native/settlegraph-v2/README.md`

1. Document exact build, environment, test, server, browser-smoke, and shutdown commands.
2. Document external read-only model location/hash and all disabled-by-default flags.
3. Document the remaining production model mount, Rust build/image, configuration, release-check, approval, and thorough-deploy boundary.
4. Run Rust formatting/clippy/tests, targeted server/app tests, the E2E smoke, `git diff --check`, and the smallest relevant repo-wide verification.
5. Audit every explicit goal requirement against current files and runtime evidence.
6. Do not push or deploy.
