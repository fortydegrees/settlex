# Working on SettleHex

## Code ownership

- `game-core/`: deterministic TypeScript rules and game state.
- `lib/game-runtime/`: boardgame.io registration, setup, moves and privacy.
- `server/`: live games, timers, bots and archives.
- `app/`: website and game UI; board rendering lives in `app/_features/game/board/`.
- `lib/server/` and `app/api/`: accounts, database access and website APIs.

See [architecture](docs/architecture/overview.md) and
[contributing](CONTRIBUTING.md) for setup and a source reading path.

## Changes and verification

- Keep changes focused; preserve unrelated work.
- Use pnpm. Do not create or update `package-lock.json`.
- Ask before adding dependencies or changing build tooling.
- New engine code should be TypeScript. Rules remain server-authoritative and
  deterministic: no wall-clock or `Math.random()` behavior in the engine.
- Follow [the testing guide](docs/agent/TESTING.md). Test behavior and contracts,
  not source-text implementation details. Use focused manual checks for visual
  or sound tuning, and regression tests for shared logic or state-flow changes.
- For UI work, start with [UI context](docs/agent/UI_CONTEXT.md) and the existing
  [component catalog](docs/agent/UI_CATALOG.md). Reuse existing components and
  verify their meaningful states in Storybook or the game dev surfaces.
- Record significant architectural decisions in
  [the project record](docs/agent/PROJECT_RECORD.md).

## Production

Never deploy without explicit approval. Before a deployment, run
`pnpm release:status`, follow its required checks, and obtain approval for any
new public release-note copy. Use the deployment runbooks in `docs/deploy/`.
Local verification, pushing source and deploying the website are separate actions.
