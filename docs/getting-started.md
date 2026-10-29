# Getting started

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
SETTLEHEX_GAME_SERVER_PORT=8029
SETTLEHEX_LOBBY_API_PORT=8129
```

Reload the environment in the game-server terminal before `pnpm serve`, and run
`pnpm dev --hostname 127.0.0.1 --port 3029` for the website. Open
[localhost:3029](http://localhost:3029). Set `DATABASE_URL` independently if your
database uses another port. Public Next.js values must be set before building a
production bundle; changing them only at `pnpm start` does not rebuild the client.

### Work on the interface without a match

With `pnpm dev` running, open `/dev/sandbox` for the real board with
controlled scenarios or `/dev/effects` for isolated animation/audio
previews. These routes are development-only. Some account/notification requests
can fail when no account or database is available; a board preview is not a
full-stack check.

`pnpm storybook` serves component and interaction stories on port 6006. The
customization guide explains which preview to use for sound, board art and
provider behavior.

## Checks

Use the [testing guide](agent/TESTING.md) to choose focused checks.
`pnpm verify` runs the combined checks; `pnpm build` builds the web app.

### Database tests

Use a separate, disposable PostgreSQL database. These tests write data; never
point them at production or a valuable development database. Provision the test
database first. If you are using the local Compose service above, this creates
the separate test database (once):

```sh
docker compose -f infra/docker-compose.local.yml exec postgres \
  createdb -U settlehex settlehex_test
```

Then select its URL, adjusting credentials/host/port for your own disposable
service:

```sh
DATABASE_URL=postgres://settlehex:settlehex@localhost:55432/settlehex_test \
  pnpm db:migrate:test
export MATCH_ALERT_POSTGRES_URL=postgres://settlehex:settlehex@localhost:55432/settlehex_test
env -u DATABASE_URL pnpm test:server
```

The default local Compose service creates `settlehex`, not `settlehex_test`;
the `createdb` step above creates the latter. If it already exists, use it only
when it is disposable and belongs to your test setup. Tests using
`MATCH_ALERT_POSTGRES_URL` skip when it is absent. Optional native bot tests
require additional inputs and do not become qualified merely by running the
ordinary suite. General tests also check default connection configuration, so
unset an inherited `DATABASE_URL` and use the dedicated test opt-in instead.
For the combined checks, run `env -u DATABASE_URL pnpm verify` with the same
`MATCH_ALERT_POSTGRES_URL` exported. The PR verification workflow provisions its own PostgreSQL
service and does not deploy or use production credentials.
