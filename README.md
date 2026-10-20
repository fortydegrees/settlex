# SettleHex

SettleHex is a browser-based hex-board strategy game, with server-authoritative
rules, animated play, match recovery and replay support. The current product
focuses on two-player duels. It combines a TypeScript rules engine with a
boardgame.io server and a Next.js/React interface.

[Play SettleHex](https://settlehex.com) ·
[Documentation](docs/README.md) ·
[Architecture and source reading path](docs/architecture/overview.md) ·
[Customize sounds and board art](docs/customization/themes-and-sounds.md)

This branch is being prepared for public sharing. The live site may differ from
this checkout. Project licensing and some asset origins remain unresolved; see
[third-party notices](THIRD_PARTY_NOTICES.md). There is no blanket license grant
for the repository yet.

## Run locally

Use Node.js 20.19 or newer within the Node 20 line and pnpm 9.13.2 (the version
recorded in `package.json`). PostgreSQL 16 is required for accounts and full
matchmaking. Docker Compose is one way to run the local database.

```sh
pnpm install --frozen-lockfile --config.node-linker=hoisted
cp .env.example .env.local
```

The install command explicitly selects the hoisted dependency layout used in the
contributor walkthrough, rather than inheriting a machine's pnpm linker setting.
If the required packages are already cached, `--offline` avoids downloads; an
empty cache still needs registry access.

Edit `.env.local`: replace both `change-me` secret values with distinct random
values. You can generate each value with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Keep the default localhost URLs together: the website uses port 3000, browser
game connections use 8000, and the website's internal lobby client uses 8080.
Native bot flags stay disabled; private model weights are not needed for human
play or the board preview. Email, social-provider and push-notification setup
are outside this quick start.

Start the database and apply migrations:

```sh
docker compose -f infra/docker-compose.local.yml up -d --wait postgres
set -a
. ./.env.local
set +a
pnpm db:migrate
pnpm -C game-core build
```

The Compose file creates a persistent local database volume and exposes port
55432. Use it on your development machine, with no production data or secrets.
If you already have PostgreSQL, set `DATABASE_URL` instead of starting Compose.

In one terminal, load the same environment and start the game server:

```sh
set -a
. ./.env.local
set +a
pnpm serve
```

In another terminal:

```sh
pnpm dev
```

Next.js reads `.env.local`; the standalone game server and migration command
need exported variables, hence the explicit shell step. Source only the local
file you created and reviewed. Open [localhost:3000](http://localhost:3000).
For two local players, use separate browser profiles or a private window so each
has its own account/session. Create a local identity in each and join public
matchmaking to reach the same duel.

To stop the database while keeping its data:

```sh
docker compose -f infra/docker-compose.local.yml stop postgres
```

### Use other local ports

If the defaults are occupied, keep the browser URLs, auth origin and standalone
server ports aligned. For example, edit these values in your `.env.local`:

```dotenv
PUBLIC_APP_URL=http://localhost:3029
BETTER_AUTH_URL=http://localhost:3029
NEXT_PUBLIC_GAME_SERVER_ORIGIN=http://localhost:8029
GAME_SERVER_INTERNAL_URL=http://localhost:8129
SETTLEX_GAME_SERVER_PORT=8029
SETTLEX_LOBBY_API_PORT=8129
```

Reload the environment in the game-server terminal before `pnpm serve`, and run
`pnpm dev --hostname 127.0.0.1 --port 3029` for the website. Open
[localhost:3029](http://localhost:3029). Set `DATABASE_URL` independently if your
database uses another port. Public Next.js values must be set before building a
production bundle; changing them only at `pnpm start` does not rebuild the client.

### Work on the interface without a match

With `pnpm dev` running, open `/catana/dev/sandbox` for the real board with
controlled scenarios or `/catana/dev/effects` for isolated animation/audio
previews. These routes are development-only. Some account/notification requests
can fail when no account or database is available; a board preview is not a
full-stack check.

`pnpm storybook` serves component and interaction stories on port 6006. The
customization guide explains which preview to use for sound, board art and
provider behavior.

## Find the code

| Area | Purpose |
| --- | --- |
| `game-core/` | Deterministic TypeScript state, rules, legal actions and experimental notation |
| `lib/game-runtime/` | Shared boardgame.io factory, setup, move adapters and authoritative log/privacy helpers |
| `server/` | Live matches, timers, presence, bots and archival lifecycle |
| `lib/server/`, `app/api/` | Accounts, database access and website API boundaries |
| `app/catana/` | Game-screen composition, HUD, lobby and feature owners |
| `app/catana/board/` | Board drawing, geometry, placement previews and colocated tests |
| `app/catana/effects/`, `public/sounds/` | Presentation runners, audio cue routing and served clips |
| `scripts/`, `infra/`, `release/` | Maintained commands, local/deployment infrastructure and release records |
| `public/`, `design/`, `sounds/` | Served assets, design sources and sound creation tools; source and rights review still applies |
| `native/`, `ai/pufferlib/` | Optional bot serving and research-related source; not needed for human play |
| `docs/README.md` | Maintained guide index, with separate routes to history and internal records |

The server, browser and archive replay share `lib/game-runtime/Game.js`. It uses
the rules in `game-core/`; presentation and effect runners remain under
`app/catana/`. One repository keeps these consumers and tests together. See the
architecture guide for the boundaries and a short reading path.

The [experimental notation guide](docs/notation/README.md) covers durable records
and replay; native archival remains the fallback. Early root notes now live in
[development history](docs/history/early-development/README.md), where their
status and original filenames are recorded. They are not the current roadmap.
Tool discovery directories such as `.agents/`, `.codex/`, `.storybook/` and the
optional `.design-sync/` bridge retain their current paths; the
[documentation index](docs/README.md) explains their owners.

## Checks and contribution

```sh
pnpm test:logic
pnpm test:server
pnpm test:app
pnpm lint
```

`pnpm verify` runs the combined policy, engine, server, app and lint checks.
Database-dependent tests require a disposable test database; native/opt-in tests
have separate requirements. A green run with skips is not full integration
coverage. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and test selection, and
[SECURITY.md](SECURITY.md) for reporting guidance.

Current work prioritizes readable ownership, private-state filtering, reliable
match recovery and practical customization. Expansions, a board editor workflow,
tournaments, social features and a universal game notation are not promises of
this release.
