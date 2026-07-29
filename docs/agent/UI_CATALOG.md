# SettleHex Standard UI Catalog

This is the implementation checklist for the production-faithful Storybook
catalog. Storybook is the living visual/state reference; this file records
ownership, scope, and coverage only.

| Domain | Surface | Production owner | Appears in | Valid visible states | Copy owner | Motion/interaction | Viewports | Story | Boundary work |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Foundations | Brand foundations | `app/globals.css` | Product-wide | Default; reduced motion | CSS tokens | Token samples | Desktop; mobile | Covered | None |
| Components | Button | `app/ui/Button.js` | Product-wide | Variants; sizes; disabled; sheen | Component children | Hover; press; focus | Both | Covered | None |
| Components | Icon button | `app/ui/IconButton.js` | Product-wide | Variants; sizes; disabled | `aria-label` at call site | Hover; press; tooltip composition | Both | Covered | None |
| Components | Fields and selectors | `app/ui/Input.js`, `Select.js`, `SwatchPicker.js` | Account and setup forms | Empty; populated; disabled; selected | Call site | Focus; selection | Both | Covered | None |
| Components | Feedback | `app/ui/Banner.js`, `Panel.js` | Status and content surfaces | Neutral; danger; title/body/actions | Props | Entry at composition | Both | Covered | None |
| Components | Overlays | `app/ui/Dialog.js`, `AlertDialog.js`, `Popover.js`, `MetaDisclosure.js`, `Tooltip.js` | Product-wide | Open; closed; confirm; destructive | Props | Open; close; dismiss; focus | Both | Covered | None |
| Account & Identity | Account entry | `app/catana/lobby/AccountEntryModal.js` | Homepage/account entry | Sign in; save guest profile; pending; error | Component | Dialog transition | Both | Planned | None |
| Account & Identity | Identity editor | `app/catana/lobby/IdentityModal.js` | Homepage/lobby | New guest; edit guest; edit saved; validation | Component and identity helpers | Dialog; picker selection | Both | Planned | None |
| Account & Identity | Account menu | `app/catana/home/HomeTableClient.js` | Homepage top chrome | Signed out; guest; claimed; alert states; pending; error | Component and match-alert helper | Popover open/close | Both | Planned | Extract |
| Account & Identity | Account/profile page | `app/account/AccountPageClient.js` | `/account` | No profile; guest; claimed; sign-in; sign-up; pending; error | Component | Form state | Both | Planned | Extract view |
| Account & Identity | Public profile | `app/u/[username]/page-content.js` | `/u/[username]` | Empty recent matches; populated match history | Server page view | Replay link navigation | Both | Planned | Extract view model |
| Lobby & Matchmaking | Homepage title chrome and game-mode dock | `app/catana/home/HomeTableClient.js` | Homepage | Brand/status metadata; signed-out or identified top chrome; idle; finding; creating; starting | `HomeTableClient` constants and release info | Link hover; account popover; mode selection; pending feedback | Both | Planned | Extract `SystemTopChrome` and mode-dock leaves |
| Lobby & Matchmaking | Search/rescue modal | `app/catana/home/HomeTableClient.js` | Homepage matchmaking | Waiting; alert rescue; Puffer rescue; found; Puffer starting | Component and rescue helper | Overlay/state change | Both | Planned | Extract |
| Lobby & Matchmaking | Friend invite | `app/catana/lobby/[matchID]/MatchPageClient.js` | Pending challenge route | Inviter; invitee; expired; pending; error | Component and challenge helpers | Copy; join; cancel | Both | Planned | Extract |
| Lobby & Matchmaking | Open match room | `app/catana/lobby/[matchID]/MatchPageClient.js` | Non-challenge lobby route | Open seats; full/spectating; loading; join pending; bot fill pending; error | Component and match helpers | Join; refresh; spectate; fill seats | Both | Planned | Extract |
| Alerts & Recovery | Match-alert control | `app/catana/home/HomeTableClient.js` | Account menu/search rescue | Off; active; paused; blocked; unsupported; install required; pending; error | `matchAlertState.js` | Action feedback | Both | Planned | Extract |
| Alerts & Recovery | Match-alert dialog | `app/catana/matchAlerts/MatchAlertDialog.js` | Alert deep link | Checking; confirm; Puffer handoff; stale; error | Component | Dialog/action transition | Both | Planned | None |
| Alerts & Recovery | Recovery surfaces | `StatusBanner`, `GlobalReconnectBanner`, `IdlePromptModal`, `ResignConfirmDialog` | Match lifecycle | Reconnecting; idle; confirm; error | Production components/helpers | Banner/dialog | Both | Planned | Compose provider-free leaves |
| Alerts & Recovery | Match availability and interrupted-duel recovery | `app/g/[matchID]/UnavailableMatchPage.jsx`, `app/catana/lobby/[matchID]/MatchPageClient.js` | Unavailable game and interrupted duel routes | Generic unavailable game (combined cancelled/expired/removed copy); interrupted duel; recovery pending; recovery error | Route-local components and match helpers | Return; retry/look again; pending feedback | Both | Planned | Extract interrupted-duel view |
| Postgame & Replay | Game over | `app/catana/components/GameOverModal.js` | Completed match | Winner; loser; archived/replay actions | Display model/component | Dialog/actions | Both | Planned | None |
| Postgame & Replay | Postgame summary | `app/catana/components/PostgameOverlay.js` | Completed match | Ranked scoreboard; summary rows; final scores unavailable | Component | Replay; close | Both | Planned | None |
| Postgame & Replay | Replay controls | `app/replays/components/ReplayStepControls.jsx` | Replay | Start; middle; end; compact mobile state | Component | Button, range, and keyboard interaction | Both | Planned | None |
| Postgame & Replay | Replay status | `app/replays/components/ReplayStatusPage.jsx` | Replay loading/error | Preparing/polling; invalid | Component | Polling; retry; return to game/lobby | Both | Planned | None |
| Postgame & Replay | Replay score chart | `app/replays/components/ReplayScoreChart.jsx` | Replay panel | Multi-player; selected event; keyboard seek | Timeline helpers/component | Hover; click; keyboard seek | Both | Planned | None |
| Postgame & Replay | Replay panel | `app/replays/components/ReplayPanel.jsx` | Replay | Desktop open; desktop collapsed; mobile closed; mobile open | Component | Rail/drawer transition | Both | Planned | None |
