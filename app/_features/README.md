# App feature owners

Next route files load these implementations. `_features` is private to the app;
its directory names do not define URLs. Existing `/catana/dev/*` routes remain
thin development-only adapters, and `/catana` still redirects to `/`.

| Change | Owner |
| --- | --- |
| Homepage, account chrome, attract board | `home/`, `home/demo/` |
| Account entry, identity dialogs and account view | `account/` |
| Public profile view | `profile/` |
| Create/resume/invite actions | `matches/lobby/` |
| Live match client, waiting room, friend challenge | `matches/room/` |
| Public search and uncertain cancellation recovery | `matches/matchmaking/` |
| Site-wide notifications and reconnect state | `matches/alerts/`, `matches/session/` |
| UI clock, idle and disconnect snapshots | `matches/presence/` |
| Board geometry, pieces and placement previews | `game/board/` |
| Player controls, mobile cockpit and dice | `game/hud/` |
| Resource/development-card and hand rendering | `game/cards/` |
| Log, chat, meta rail and drawer | `game/feed/` |
| Trade, resign, info and terminal overlays | `game/dialogs/` |
| Screen display and command decisions | `game/model/` |
| Semantic effects, audio, haptics and purchase reveal | `game/effects/` |
| Replay navigation, controls and live-to-postgame wrapper | `replay/` |
| Shared palette, artwork paths and glass styles | `theme/` |
| Sandbox, effects lab, preview clients and story fixtures | `dev/` |

`game/GameScreen.js` remains the presentation composition root. Shared product
primitives remain in `app/ui/`. Browser helpers live in `lib/client/`; pure
record adapters shared by server and browser live in `lib/replays/` and use
`lib/shared/` text/identity helpers. Rules, notation and authoritative privacy
remain in `game-core/` and `lib/game-runtime/`.

Keep component stories/styles and focused tests with their owner. Route/API
contracts stay under `app/__tests__/`; authoritative runtime tests live under
`lib/game-runtime/__tests__/` and run in the server/lib test lane. Preserve lazy
imports, client entry boundaries and persisted/CSS/network names when moving code.
