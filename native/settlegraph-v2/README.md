# SettleGraph V2/V3 product worker

This crate is the product-owned runtime boundary for the sealed SettleGraph
bot. It preserves the original CTNN-v2 runtime and adds direct inference for
checkpoint 005's CTNN-v3 observation. Both models use the same proven native
game, 299-action codec, state importer, legality mask, and action translation.
The website sends complete authoritative Boardgame.io snapshots over NDJSON;
no observation or action semantics are approximated in JavaScript.

The accepted models remain external and read-only:

```text
Original V2: observation version 2 / 1,445 floats
SHA-256: 072906d17077f1ed3fa4e9254999a8920ec243bdda3ab42575258492b58465c8

Checkpoint 005: observation version 3 / 1,464 floats
SHA-256: 382a8708312d469efdbb7333891a3469bd204d46d85ec02e218e0c0b377437ca
```

V3 appends the 19 canonical public tile numbers to the immutable V2 prefix.
The loader binds each accepted file hash to its required observation version
and shape. Worker health and every decision return the selected model identity;
the JavaScript client pins that identity through later decisions and worker
restarts.

The worker remains direct inference only. Command-line search flags, unknown
request fields, and unsupported request modes fail closed. No Colonist or
research search code is included. The V3 encoder and versioned inference loader
are pinned to research commit
`2cee77fa789fc4af8665e0be57e199928a7e965c`; see `PROVENANCE.md`.

## Build and verify

```bash
cargo build --release --locked --manifest-path native/settlegraph-v2/Cargo.toml
cargo fmt --manifest-path native/settlegraph-v2/Cargo.toml -- --check
cargo clippy --manifest-path native/settlegraph-v2/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path native/settlegraph-v2/Cargo.toml
SETTLEX_SETTLEGRAPH_V2_MODEL=/absolute/path/to/accepted-v2.ctnn \
cargo test --manifest-path native/settlegraph-v2/Cargo.toml --test contract \
  sealed_ctnn_matches_hash_contract_and_embedded_probe -- --ignored --exact --nocapture
SETTLEX_INCUMBENT_005_MODEL=/absolute/path/to/incumbent-005/model.ctnn \
SETTLEX_005_REFERENCE_PROBES=/absolute/path/to/reference-probes.json \
cargo test --manifest-path native/settlegraph-v2/Cargo.toml --test incumbent_005 \
  -- --ignored --nocapture
```

The external-artifact checks verify the exact file hashes, versioned contracts,
embedded probes, and all 256 recorded 005 logits, values, and legal argmaxes.

Run the real Boardgame.io-to-model smoke with:

```bash
SETTLEX_RUN_SETTLEGRAPH_V2_E2E=1 \
SETTLEX_SETTLEGRAPH_V2_MODEL=/absolute/path/to/model.ctnn \
pnpm vitest run server/__tests__/settleGraphV2.e2e.test.js --reporter=verbose
```

## Play locally

Start the repo's local Postgres service and apply migrations:

```bash
docker compose -f infra/docker-compose.local.yml up -d postgres
DATABASE_URL=postgres://settlehex:settlehex@localhost:55432/settlehex pnpm db:migrate
```

Build the release worker, then run the game server:

```bash
SETTLEX_SETTLEGRAPH_V2_ENABLED=1 \
SETTLEX_SETTLEGRAPH_V2_MODEL=/absolute/path/to/model.ctnn \
DATABASE_URL=postgres://settlehex:settlehex@localhost:55432/settlehex \
pnpm serve
```

In a second terminal, run the web app with the server and public UI flags:

```bash
SETTLEX_SETTLEGRAPH_V2_ENABLED=1 \
NEXT_PUBLIC_SETTLEX_SETTLEGRAPH_V2=1 \
GAME_SERVER_INTERNAL_URL=http://localhost:8080 \
NEXT_PUBLIC_GAME_SERVER_ORIGIN=http://localhost:8000 \
DATABASE_URL=postgres://settlehex:settlehex@localhost:55432/settlehex \
SESSION_SECRET=local-settlegraph-v2-only-not-for-production \
BETTER_AUTH_SECRET=local-settlegraph-v2-only-not-for-production \
BETTER_AUTH_URL=http://localhost:3000 \
PUBLIC_APP_URL=http://localhost:3000 \
pnpm dev
```

Open `http://localhost:3000`, choose **Play V2 Bot**, and play normally. The
default worker path is
`native/settlegraph-v2/target/release/settlegraph-v2-worker`; override it with
`SETTLEX_SETTLEGRAPH_V2_WORKER`. The existing three-action homepage and all
ordinary matches remain unchanged when the flags are absent.

When finished, stop the two foreground processes and remove the disposable
container/network (the named local database volume remains):

```bash
docker compose -f infra/docker-compose.local.yml down
```

## Failure and deployment boundary

Disabled V2 creation fails with HTTP 503. Worker startup, hash, contract,
timeout, snapshot, and response failures are logged with match/seat context;
an already-created match uses Puffer for that decision so it cannot deadlock,
and the native client preflights again after a worker restart.

Model bytes are not tracked by Git. Release packaging is a separate concern:
it must provide an immutable read-only model mount and the release worker, then
run the release checks before any approved deployment.
