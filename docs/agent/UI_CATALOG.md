# SettleHex Standard UI Catalog

This is the implementation checklist for the production-faithful Storybook
catalog. Storybook is the living visual/state reference; this file records
ownership, scope, and coverage only.

| Domain | Surface | Production owner | Appears in | Valid visible states | Copy owner | Motion/interaction | Viewports | Story | Boundary work |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Foundations | Brand foundations | `app/globals.css` | Product-wide | Default; reduced motion | CSS tokens | Token samples | Desktop; mobile | Covered | None |
| Components | Button | `app/ui/Button.js` | Product-wide | Variants; sizes; disabled; sheen | Component children | Hover; press; focus; normal/reduced reviewed | Desktop; mobile reviewed | Covered | None |
| Components | Icon button | `app/ui/IconButton.js` | Product-wide | Variants; sizes; disabled | `aria-label` at call site | Hover; press; tooltip composition | Both | Covered | None |
| Components | Fields and selectors | `app/ui/Input.js`, `Select.js`, `SwatchPicker.js` | Account and setup forms | Empty; populated; disabled; selected | Call site | Focus; selection; normal/reduced reviewed | Desktop; mobile reviewed | Covered | None |
| Components | Feedback | `app/ui/Banner.js`, `Panel.js` | Status and content surfaces | Neutral; danger; title/body/actions | Props | Entry at composition | Both | Covered | None |
| Components | Overlays | `app/ui/Dialog.js`, `AlertDialog.js`, `Popover.js`, `MetaDisclosure.js`, `Tooltip.js` | Product-wide | Open; closed; confirm; destructive | Props | Dialog, AlertDialog, and Popover open/close/focus reviewed in normal and reduced motion | Both | Covered | None |
| Account & Identity | Account entry | `app/catana/lobby/AccountEntryModal.js` | Homepage/account entry | Sign in or guest; save guest profile; choose online identity; choose friend identity; missing credentials; email submitting | Component | Dialog transition; form validation; submit pending | Both | Covered | None |
| Account & Identity | Identity editor | `app/catana/lobby/IdentityModal.js` | Homepage/lobby | Suggested identity; existing identity; empty name; emoji browser; mobile | Component and identity helpers | Dialog; picker selection; input validation | Both | Covered | None |
| Account & Identity | Account menu | `app/catana/home/SystemAccountMenu.js` | Homepage top chrome | Signed out; guest; claimed; alert states; pending; error | Component and match-alert helper | Popover open/close; normal/reduced reviewed | 1440×900; 390×844 reviewed | Covered | None |
| Account & Identity | Account/profile page | `app/account/AccountPageView.js` | `/account` | No profile; guest; claimed; missing credentials; email submitting | `AccountPageView.js` and `getAccountProfileCopy` | Auth mode; form validation; submit pending | Both | Covered | `AccountPageClient.js` owns fetch, auth, provider redirects, and refresh |
| Account & Identity | Public profile | `app/u/[username]/PublicProfileView.js` | `/u/[username]` | Empty recent matches; populated match history; mobile | View component | Replay link navigation | Both | Covered | `page-content.js` retains profile lookup and `notFound` |
| Lobby & Matchmaking | Homepage title chrome and game-mode dock | `app/catana/home/HomeTitleChrome.js` | Homepage | Brand/status metadata; signed-out, guest, or claimed top chrome; idle; finding; creating; starting; release notes; mobile | Component constants and release info | Link hover; account popover; release disclosure; mode selection; pending feedback | Both | Covered | `HomeTableClient.js` retains board, auth, matchmaking, and navigation ownership |
| Lobby & Matchmaking | Search/rescue modal | `app/catana/home/SearchingModal.js` | Homepage matchmaking | Finding table; alert rescue available; Puffer rescue available; match found; starting Puffer | Component and `matchmakingRescue.js` | Local rescue disclosure; cancel; alert action; Puffer handoff; normal/reduced reviewed | 1440×900; 390×844 reviewed | Covered | `HomeTableClient.js` owns matchmaking actions and match-alert adapter |
| Lobby & Matchmaking | Friend invite | `app/catana/lobby/[matchID]/PendingFriendChallengeScreen.js` | Pending challenge route | Inviter; invitee; invitee joining; expired; challenge error | Component and challenge helpers | Copy; join; cancel; refresh; return | Both | Covered | `MatchPageClient.js` owns polling, credentials, accept/cancel requests, and navigation |
| Lobby & Matchmaking | Open match room | `app/catana/lobby/[matchID]/OpenMatchRoom.js` | Non-challenge lobby route | Open seats; loading; join pending; bot fill pending; error | Component and match helpers | Join; refresh; spectate; fill seats | Both | Covered | `MatchPageClient.js` retains requests, credentials, polling, navigation, and board mounting; full/spectating transitions directly to the excluded board client |
| Alerts & Recovery | Match-alert control | `app/catana/matchAlerts/MatchAlertControl.js` | Account menu/search rescue | Off; active; paused; blocked; unsupported; install required; pending; error | `matchAlertState.js` | Pending/error action feedback reviewed in normal and reduced motion | Both | Covered | None |
| Alerts & Recovery | Match-alert dialog | `app/catana/matchAlerts/MatchAlertDialog.js` | Alert deep link | Checking; confirm; Puffer handoff; stale; error | `getMatchAlertDialogCopy` | Dialog/action transition | Both | Covered | Provider resolves and joins through production lifecycle helpers; stories stay provider-free |
| Alerts & Recovery | Recovery surfaces | `StatusBanner`, `GlobalReconnectBanner`, `IdlePromptModal`, `ResignConfirmDialog` | Match lifecycle | Neutral and danger status; reconnect recipe; idle; resign confirm; unavailable match | Production components and `getReconnectStatusBannerProps` | Banner/dialog | Both | Covered | `GlobalReconnectBanner` retains storage/router ownership; `LiveMatchLoadingShell` remains in the board boundary |
| Alerts & Recovery | Match availability and interrupted-duel recovery | `app/g/[matchID]/UnavailableMatchPage.jsx`, `app/catana/lobby/[matchID]/InterruptedDuelRecovery.js` | Unavailable game and interrupted duel routes | Generic unavailable game (combined cancelled/expired/removed copy); interrupted duel; recovery pending; recovery error | Route-local components and match helpers | Return; retry/look again; pending feedback | Both | Covered | `MatchPageClient.js` retains eligibility, leave request, `MATCH_FOUND`, storage cleanup, and redirects |
| Postgame & Replay | Game over | `app/catana/components/GameOverModal.js` | Completed match | Winner; loser; finished human alert resume; archived/replay actions; pending; mobile | `gameScreenDisplayModel.js` and component | Dialog/actions | 390×844 mobile composition reviewed | Covered | Live and archived callers retain lifecycle ownership |
| Postgame & Replay | Postgame summary | `app/catana/components/PostgameOverlay.js` | Completed match | Ranked scoreboard; summary rows; final scores unavailable; mobile | `gameScreenDisplayModel.js` and component | Replay; close | Both | Covered | None |
| Postgame & Replay | Replay controls | `app/replays/components/ReplayStepControls.jsx` | Replay | Start; middle; end; compact mobile state | Component | Button, range, and keyboard interaction | Both | Covered | None |
| Postgame & Replay | Replay status | `app/replays/components/ReplayStatusPage.jsx` | Replay loading/error | Preparing/polling; invalid | Component | Polling; retry; return to game/lobby | Both | Covered | None |
| Postgame & Replay | Replay score chart | `app/replays/components/ReplayScoreChart.jsx` | Replay panel | Multi-player; selected event; keyboard seek | Timeline helpers/component | Hover; click; keyboard seek | Both | Covered | None |
| Postgame & Replay | Replay panel | `app/replays/components/ReplayPanel.jsx` | Replay | Desktop open; desktop collapsed; mobile closed; mobile open | Component | Rail/drawer transition; normal/reduced reviewed | 1440×900 desktop; 390×844 mobile reviewed | Covered | Desktop rail and mobile drawer are deliberate breakpoint-specific variants |

## Clarity visual-system pass — 2026-09-22

This isolated branch applies shared Clarity recipes through the production owners
above, not a parallel mockup component library. The wordmark is provisional and
does not define UI type or control shapes. Exact sampled states, verification
limits and integration boundaries are in `CLARITY_UI_REVIEW.md`.

New review states include homepage `ClarityIdle`, `ClarityFourModesIdle` and
`ClarityV2Starting`; account menu `ClarityLongNameRecovery`; account/public profile
`LongUsername`; search/rescue `RescueError`; open room `LongNamesAndServer`;
game over `DenseResumeError`; and postgame summary `LongPlayerNames`.

The shared foundations story demonstrates pane/HUD/inset materials and actual
spacing/radius tokens. Existing standard controls supply the interaction owners.
Desktop/mobile screenshots and reduced-motion/transparency checks support this
pass; historical coverage below is not automatically a fresh test of every state.
No live auth, matchmaking, push subscription or production deployment was tested.

## Motion and viewport review — 2026-07-29

- Overlay motion was reviewed in `components-overlays--account-dialog-motion`,
  `components-overlays--leave-table-confirmation`, and
  `components-overlays--account-popover-motion`. Dialog and AlertDialog now
  retain their Base UI ending state for the shared exit animation; all three
  overlays restore trigger focus and close immediately under reduced motion.
- Button hover, press, keyboard focus, disabled, and shimmer states were
  reviewed in `components-actions-button--playground`,
  `components-actions-button--production-variants`, and
  `components-actions-button--disabled-and-sheen`. Input and Select focus,
  value changes, disabled presentation, and reduced motion were reviewed in
  the fields-and-selectors stories.
- Dense/error/pending compositions were reviewed in
  `product-patterns-account-identity-account-menu--guest-resume-failed`,
  `product-patterns-account-identity-account-menu--alert-action-pending`, and
  `composed-surfaces-lobby-matchmaking-search-rescue--puffer-rescue-available`.
  The account and rescue compositions fit at both 1440×900 and 390×844 without
  horizontal overflow.
- Postgame composition was reviewed in
  `composed-surfaces-postgame-replay-game-over--mobile` at 390×844.
  Replay was reviewed in
  `composed-surfaces-postgame-replay-replay-panel--desktop-panel-open` at
  1440×900 and
  `composed-surfaces-postgame-replay-replay-panel--mobile-drawer-open` at
  390×844. The desktop rail and mobile drawer are intentionally exclusive
  below/above the 640px production breakpoint; the mobile drawer remains
  scrollable when its chart extends beyond the visible drawer body.
