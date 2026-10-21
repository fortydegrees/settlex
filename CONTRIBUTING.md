# Contributing

Start with the [local setup](README.md#run-locally) and
[architecture guide](docs/architecture/overview.md). The repository's project
license is still being resolved; consult [third-party notices](THIRD_PARTY_NOTICES.md)
before redistributing code or assets. Contribution licensing terms must be settled
before a public contribution programme is announced.

## Make a focused change

Describe the problem and the observable result you want. Keep rules in
`game-core`, transport/match lifecycle in their existing server or adapter owner,
and rendering/audio in the client. Prefer a small coherent change over a new
framework or a broad folder move. Read the repository's `AGENTS.md` and
[testing policy](docs/agent/TESTING.md).

Use pnpm and preserve the lockfile. Do not add dependencies or change build
tooling as an incidental part of a refactor. Use TypeScript for new engine
code; existing UI JavaScript is supported. Use `.jsx` for authored JSX trees.
Avoid time or unseeded randomness in the rules engine.

Comments should explain a constraint or edge case. Share policy when it has a
real common owner; do not hide unrelated behavior behind generic helpers just
to eliminate a few similar lines.

## Verify the behavior you changed

- Rules and legal actions: `pnpm test:logic` and focused deterministic fixtures.
- Server/auth/lifecycle: relevant suites from `pnpm test:server`, with real
  handlers and controlled external boundaries.
- UI state and interactions: focused app tests and existing Storybook stories.
- Visual, sound or timing changes: the real sandbox/effects preview at the
  relevant viewport, with mute, cleanup and reduced-motion checks where affected.
- Broader changes: `pnpm verify` and `pnpm build` after the targeted checks.

Replace brittle source-spelling assertions with equivalent behavioral protection,
not merely updated strings. Keep configuration inspection when the configuration
itself is the contract. A syntax refactor should preserve accessible output,
keys, refs and callbacks. Close test browsers and stop only the processes you
started when verification finishes.

### Database tests

Use a separate, disposable PostgreSQL database. These tests write data; never
point them at production or a valuable development database. Provision the test
database first. If you are using the README's local Compose service, this creates
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

## Include a reviewable result

Explain what changed, why, the checks you ran, and any unverified behavior. For
UI changes include the relevant states and viewport evidence. Do not claim a
production deployment, performance improvement or complete ruleset from a local
preview alone.

Keep `.env` files, credentials, model weights, training output and personal
absolute paths out of commits. Existing research and historical material is
being curated separately; do not remove it casually or copy private artifacts
into a change. New sound, art and font assets need a recorded origin and
redistribution terms. See the [customization guide](docs/customization/themes-and-sounds.md).
