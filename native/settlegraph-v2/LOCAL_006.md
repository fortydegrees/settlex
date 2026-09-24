# Checkpoint 006 local integration

Research incumbent 006 is the exact B endpoint from the completed 32,768-game
direct RL seed. Both A and B qualified on the fixed 22,528-game confirmation.
A/B ranking remains unresolved, so the frozen default rule selected B.

The local worker and client accept this external file:

```text
/Users/david/Documents/ChatGPT/settlex-ai/reports/2026-09-23-incumbent-006-qualification/incumbent-006/model.ctnn
SHA256 299c23241e1ca32c4b9203206a9b2c17fc7f6246d4adff0f6d3a9ad6404b736b
```

The package contains the unchanged full training checkpoint, authenticated
terminal transcripts, paired qualification, and 256 saved reference probes.
Its raw value output and separate critic are not qualified for search.
This product worker remains ordinary greedy direct inference only.

## Reproduce local gameplay verification

Run from this isolated product checkout:

```bash
pnpm -C game-core build
cargo build --release --locked -j 2 --manifest-path native/settlegraph-v2/Cargo.toml
SETTLEX_RUN_SETTLEGRAPH_V2_E2E=1 \
SETTLEX_EXPECTED_MODEL_SHA256=299c23241e1ca32c4b9203206a9b2c17fc7f6246d4adff0f6d3a9ad6404b736b \
SETTLEX_SETTLEGRAPH_V2_MODEL=/Users/david/Documents/ChatGPT/settlex-ai/reports/2026-09-23-incumbent-006-qualification/incumbent-006/model.ctnn \
pnpm exec vitest run server/__tests__/settleGraphV2.e2e.test.js --maxWorkers=2 --minWorkers=1
```

This uses the actual release worker, JavaScript client, BotManager routing,
dispatchMatchUpdate, Boardgame.io Master and game reducer. It verifies both
initial settlement/road pairs and a completed main turn, exact model identity,
and absence of Puffer fallback. It is a headless local compatibility check, not
a full product-board strength evaluation or a browser review.

To use 006 with a local game server, configure the existing V2-compatible
environment names alongside your normal local database settings:

```bash
export SETTLEX_SETTLEGRAPH_V2_ENABLED=1
export SETTLEX_SETTLEGRAPH_V2_MODEL=/Users/david/Documents/ChatGPT/settlex-ai/reports/2026-09-23-incumbent-006-qualification/incumbent-006/model.ctnn
export SETTLEX_SETTLEGRAPH_V2_WORKER="$PWD/native/settlegraph-v2/target/release/settlegraph-v2-worker"
pnpm serve
```

The release's opt-in button is labelled **Play Bot 006**, and new matches name
the opponent **SettleGraph 006**. Production preflight requires the exact 006
hash in `release/bot-model.json`. The generic **Play vs Bot** action uses Puffer.
The initial isolated local integration did not change the public deployment;
the subsequent 006 product release is separately authorized.

## Rollback

Stop the local server, select the untouched 005 model, then restart:

```bash
export SETTLEX_SETTLEGRAPH_V2_MODEL=/Users/david/Documents/ChatGPT/settlex-ai/reports/2026-09-15-saved-policy-transfer/incumbent-005/model.ctnn
pnpm serve
```

The 005 SHA remains
`382a8708312d469efdbb7333891a3469bd204d46d85ec02e218e0c0b377437ca`.
Model identity is pinned for each client, including worker restarts; switching
models requires a new client/server. Original V2 and 005 acceptance remain.
No other model hashes are admitted.

For a production rollback, redeploy the complete known 005 release at `3cd24f5`
(also retained on `codex/settlegraph-005-production` with a docs-only follow-up).
That restores the 005 manifest, Compose mount path, client and UI together.
The external `/srv/settlex-models/incumbent-005/model.ctnn` is retained unchanged.
Changing only the model file would fail the exact-hash production preflight.

Qualification, product test logs, gameplay receipts and cleanup evidence are in
`/Users/david/.codex/worktrees/direct-rl-preparation/settlex-ai/reports/2026-09-23-incumbent-006-qualification/`.
The isolated integration starts at `3cd24f539e6589a2cd8455334bc11e3fd89f20ab`.
Its dependency link reuses the 005 checkout's installed node_modules;
the engine and release worker were built in that 006 checkout. The later product
release preserves this local preparation and adds the 006 manifest, mounted path
and UI selection. Dependencies, encoder and direct-inference semantics are unchanged.
