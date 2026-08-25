# SettleGraph V2 product worker

This crate is the product-owned runtime boundary for the sealed SettleGraph
CTNN-v2 bot. It pins the proven native game, observation-v2, 299-action codec,
model loader, state importer, legality mask, and action translation. The
website sends complete authoritative Boardgame.io snapshots over NDJSON; no
observation or action semantics are approximated in JavaScript.

The accepted model remains external and read-only:

```text
/Users/david/Documents/ChatGPT/settlex-v2-production-2026-08-25/accepted/accepted-v2.ctnn
SHA-256 072906d17077f1ed3fa4e9254999a8920ec243bdda3ab42575258492b58465c8
```

## Build and verify

```bash
cargo build --release --manifest-path native/settlegraph-v2/Cargo.toml
cargo fmt --manifest-path native/settlegraph-v2/Cargo.toml -- --check
cargo clippy --manifest-path native/settlegraph-v2/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path native/settlegraph-v2/Cargo.toml
SETTLEX_SETTLEGRAPH_V2_MODEL=/Users/david/Documents/ChatGPT/settlex-v2-production-2026-08-25/accepted/accepted-v2.ctnn \
cargo test --manifest-path native/settlegraph-v2/Cargo.toml -- --ignored --nocapture
```

The ignored checks load the external sealed artifact and verify its hash,
embedded probe, deterministic decision, worker health response, and runtime
contract.

Run the real Boardgame.io-to-model smoke with:

```bash
SETTLEX_RUN_SETTLEGRAPH_V2_E2E=1 \
SETTLEX_SETTLEGRAPH_V2_MODEL=/Users/david/Documents/ChatGPT/settlex-v2-production-2026-08-25/accepted/accepted-v2.ctnn \
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
SETTLEX_SETTLEGRAPH_V2_MODEL=/Users/david/Documents/ChatGPT/settlex-v2-production-2026-08-25/accepted/accepted-v2.ctnn \
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

No production packaging or deployment is included. A later approved release
must choose an immutable model mount, build the Rust release worker in the
game-server image, set both feature flags, run release checks, and use the
thorough infrastructure-sensitive deployment lane.
