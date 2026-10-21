# Shared game runtime

`Game.js` exports `createCatanGame` and the default `Catan` definition used by
boardgame.io. The live server, browser, sandbox and archive reconstruction import
this owner directly. Deterministic rules and notation remain in `game-core/`.

| Owner | Responsibility |
| --- | --- |
| `Game.js` | Phases, stages, move registration, player views and effects-plugin configuration |
| `setup/` | Seeded board/product setup, development scenarios and recipient state/effect filtering |
| `moves/` | Authoritative adapters that validate/apply core actions, construct logs and emit semantic effect payloads |
| `log/` | Log construction and recipient filtering shared with replay presentation |
| `Moves.js` | Existing aggregate move exports used by compatibility and sandbox consumers |

The factory retains three independent options: `includeDebugMoves` (defaulting
to the existing environment check), `includeEffects` (default `true`) and
`includeServerMoves` (default `false`). `server/serverGame.js` creates separate
privileged and socket-facing definitions. Archive reconstruction in
`lib/server/replays/buildReplayFrames.js` disables effects. Those choices govern
behavior; callers should keep their existing options when changing imports.

Board setup consumes boardgame.io's injected random API. The runtime imports
only the rules package, boardgame.io/effects plugins and the neutral mode/timing
owners in `lib/shared/`. Visual tuning, effect runners, React, browser utilities,
assets and audio remain under their existing presentation owners.

These files follow the repository's existing `lib/` JavaScript ESM convention.
Use the documented Node 20.19+ environment. Node may emit a typeless-package
warning while detecting ESM syntax; this relocation adds no package boundary or
loader configuration.

Existing runtime behavioral tests retain their names under
`app/catana/__tests__/`; server/archive and replay tests remain with their
consumers. See the [architecture reading path](../../docs/architecture/overview.md)
and [testing policy](../../docs/agent/TESTING.md).
