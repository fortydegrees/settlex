# Architecture and source reading path

SettleHex keeps the rules, live game service and website in one repository.
The boundaries are responsibilities inside that repository, not separate
published packages or a new universal protocol.

## Rules, match service and presentation

`game-core/` contains deterministic TypeScript rules and game state. It does not
own React components, audio or web accounts. The boardgame.io definition in
`app/catana/Game.js` registers phases, moves, plugins and player views; its move
adapters invoke core rules and translate accepted results into state, logs and
presentation effects. That location is historical. Server and replay consumers
still share the definition without a wholesale folder migration.

`server/` hosts live games and owns timers, disconnect/idle handling, bot dispatch
and archival lifecycle. `lib/server/` and Next API routes connect website accounts,
matchmaking and PostgreSQL persistence to that service. Account identity and
match-seat credentials are distinct; joining a game must establish the right seat
rather than trust a client-supplied player number.

The browser renders the state it is allowed to see and sends player intentions.
`GameScreen.js` composes the board and interface. Feature-local owners such as
`matchStatus/useMatchClockAndPresence.js` and `lobby/usePublicMatchmaking.js` keep
state and the requests/timers that govern it together. The screen still contains
substantial orchestration; this is an incremental cleanup, not a claim that every
responsibility has been extracted.

## Trace one road

1. `app/catana/Edge.js` handles the selected edge and invokes `moves.placeRoad`
   (or the separate development-card action).
2. `app/catana/Game.js` defines where that move is available. boardgame.io handles
   its match/turn context; the adapter in `moves/buildMoves.js` calls
   `applyPlaceRoad` during setup or `applyBuildRoad` during normal play.
3. `game-core/src/rules/buildActions.ts` validates normal-play builds; setup
   placement uses `game-core/src/rules/apply.ts`. These update core state. A rejected result becomes `INVALID_MOVE`; the adapter
   emits no successful placement effect on that branch.
4. On success, the adapter emits `placePiece`, appends the semantic `build:road`
   log, handles award/game-over changes and advances setup when appropriate.
5. `effects/GameEffects.js` receives the effect. The registry selects the placement
   runner; that runner decides visual timing and emits the `build:road` audio cue.
   `soundThemes.js` maps the cue to a clip and `AudioManager.js` plays it subject to
   mute/visibility policy.

This separation lets board art and audio change without changing a legal road's
cost or placement rules. Existing effect-duration sequencing is retained; shared
placement timing lives in `lib/shared/placementEffectTiming.js` rather than
importing visual defaults into the authoritative game definition.

## Hidden information and recovery

Private information must be filtered at every client-visible boundary, including
effects as well as game state. The cleanup's effects-plugin player-view filtering
protects purchased development-card types for opponents and spectators. A renderer
hiding a value would not provide that protection. State, logs, archives and replay
perspectives remain separate contracts worth testing.

Public matchmaking treats a lost HTTP response as uncertain, not proof that no
seat was created. `lobby/usePublicMatchmaking.js` retains mutation identity for
reconciliation. Request generations reject old responses; a separate search
lifetime guards the continuation from cancellation into bot creation. Sign-out,
unmount or a newer search invalidate obsolete work without clearing a newer seat.
See `PublicMatchmaking.stories.jsx` for real React race scenarios.

For board status, a pushed timer is authoritative. Missing timer input permits an
HTTP seed; explicit null clears it. `useMatchClockAndPresence.js` cancels stale
seed results and owns countdown interval cleanup. Reconnecting does not justify
replaying historical opening sounds: the opening-jingle marker belongs to a fresh
lobby-to-game transition.

## A short reading path

| Question | Start here |
| --- | --- |
| How is a move validated? | `game-core/src/rules/buildActions.ts`, then `app/catana/moves/buildMoves.js` |
| How does the game register turns and moves? | `app/catana/Game.js` |
| How are ambiguous requests recovered? | `app/catana/lobby/usePublicMatchmaking.js` and its React stories |
| How do server timers reach the board? | `server/timers/` and `app/catana/matchStatus/` |
| How does an event become animation/audio? | `app/catana/effects/GameEffects.js`, `registry.js`, `placePiece.js` |
| How can I replace art or one sound? | [Customization guide](../customization/themes-and-sounds.md) |
| What should a test prove? | [Testing policy](../agent/TESTING.md) |

The optional native bot worker and Python serving adapters have additional model
and runtime requirements. They are not prerequisites for human games or component
previews. Expansions, a standalone client SDK and a portable notation are separate
future decisions. No repository split is needed to understand or improve the
current engine/server/presentation boundaries.
