# SettleHex Standard UI Catalog

This is the implementation checklist for the production-faithful Storybook
catalog. Storybook is the living visual/state reference; this file records
ownership, scope, and coverage only.

## Enforced foundation contract

`DESIGN_SYSTEM.md` describes the current implementation and migration boundary.
`app/ui/theme.cjs` owns complete typography roles and foundation values; Tailwind
emits them for production and Storybook. `globals.css` owns material/interaction
recipes. `TypographyRoles` shows the UI/display split; `TypographyFontInheritance`
checks document-root and portal font parity. Segmented control `Selection` and
`Disabled` stories exercise the selector shared by both email-auth entry points.
Catalog coverage is not exhaustive interaction/accessibility verification.
`pnpm ui:check` rejects new drift and retains exact owned artwork/data/geometry
contracts explained in `UI_STYLE_EXCEPTIONS.md`.

The completion pass adds `Composed Surfaces/Gameplay/Trade And Resource Selection`
with real engine trade rates and bank counts: `MaritimeTrade`, `ForcedDiscard`,
`YearOfPlentyShortBank`, `Monopoly` and `CancelableDiscard`. They check required
selection, payloads and cancellation capability. The existing non-dismissible
discard/dev-card policy is preserved; no generic Dialog dismissal was introduced.
`Live Match Loading` renders the real loading shell and underlay.

`Composed Surfaces/Gameplay/Compact HUD` uses the production cockpit, opponent,
dock and resource controls. `DenseResources`, `EmptyHandPreRoll`,
`PlayableAndSleepingCards`, `WaitingReadOnly`, `LongOpponentNameAndHiddenResources`,
`OverLimitOpponentAtRest`, `NamedDockAction` and `DesktopQuickTradeKeyboard`
cover their meaningful states, including the inactive opponent's discard-warning rim.
Complete `type-hud-*` roles preserve compact metrics, not generic body sizes.
The component/Foundation examples also consume the same tokens, including
CSS-valued line-height labels, approved home-marker materials and portal fonts.

The account/lobby migration now covers the account menu, identity editor,
match-alert control, search/rescue, friend invite and open room. These production
owners have no remaining tracked findings. New stress stories: identity
`LongUsername`, friend invite `LongNamesAndLink`/`CancelPending`, open room
`NoOpenSeats`. The standalone emoji-browser and friend-invite stories retain
controlled local state so selection and text entry visibly update. See
`CLARITY_UI_REVIEW.md` for this batch's fresh checks and limits.

The following recovery/postgame/replay slice adds `IdleSubmitting`, `IdleError`,
`UnavailableLongMatchId`, game-over `ReplayPreparing`/`ReplayFailed`, replay
status `ActiveMatch`, and replay panel `MobileChartExpanded`/
`MobileFourPlayersLongNames`. The replay panel harness now uses the existing
`useReplayNavigation` hook and turn helpers, so event/turn/range/chart changes
update the rendered cursor and scores. It remains a fixture, not a live archive.
Result actions, perspective selectors and quiet turn-jump controls consume the
existing shared recipes. Chart axes use the complete `type-chart-tick` role.

The public-profile and homepage-metadata slice adds `LongHistoryLabels` and
`LongReleaseNotes`. The latter uses fixture release data; it never edits the
production release announcement. Profiles, top navigation and release details
now use complete roles and token spacing. The homepage disclosure explicitly
owns its 22rem width over Popover's content-sized default. Mode-button internals,
wordmark, account actions and replay-link destinations are unchanged.

The shared-feed migration adds `Composed Surfaces/Gameplay/Game Feeds` with
`LiveChat`, `EmptyChat`, `ReadOnlyChat`, `LongTranscript`, `LogEntries` and
`SelectableReplayLog`. They use the production panels/formatters with local
fixture transport only. Send/clear, disabled composer and click/Enter/Space
selection are exercised in story play functions. The integrated sandbox remains
the verification owner for desktop rail and mobile drawer placement/behavior.

The following game-chrome slice adds `Composed Surfaces/Gameplay/Game Chrome`:
`MobileMenu`, `MobileMenuSpectatorOrReplay`, `MobileFeedDrawer`,
`MobileFeedDrawerReadOnly` and `DesktopFeedDock`. They render the production
MobileMatchMenu, MobileMetaDrawer and DesktopMetaDock rather than copied markup.
Menu spies verify close-and-callback behavior; drawer fixtures use local chat
state. Spectator/replay is a menu capability fixture, not a live replay session.
Feed hosts now consume shared panel/pill/tooltip shapes and type roles. Integrated
sandbox checks retain ownership of board coexistence and persisted dock geometry.

`Composed Surfaces/Gameplay/Game Info Dialogs` now catalogs the production
GameSettingsDialog and GameRulesDialog extracted from GameScreen. `SettingsAudioOn`
and `SettingsMuted` toggle local state only; `StandardRules` preserves the observed
sandbox configuration and `CustomRules` stresses a long caller-provided identifier
and disabled rule values. All four check Close/Escape and focus return. Rule
calculation, audio preferences and modal-blocking flags stay with GameScreen.

## Current control-family reference

`Components/Actions/Button/ButtonFamily` compares the real homepage dock,
account trigger, standard form actions and launchable account-entry modal. Use
it with `Foundations` as the current Clarity visual reference, not older bespoke
button snippets. Shared CSS owns the palette; shape follows role: 8px tiles,
14px play/form controls, 22px panels, and fully rounded utility chrome/auth
selector. `Button` exposes the semantic `utility` variant (legacy `pill` alias).

Account Entry includes `EmailOnly`, `SignInOrGuest`, `CreateAccount`,
`SaveGuestProfile`, `LongUsername`, `MissingCredentials`, `EmailSubmitting`,
`ProviderPending` and `ProviderError`. Stories retain production components and
mock only external callbacks. White-on-lime text contrast remains unresolved.

| Domain | Surface | Production owner | Appears in | Valid visible states | Copy owner | Motion/interaction | Viewports | Story | Boundary work |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Foundations | Brand foundations | `app/ui/theme.cjs`, `app/globals.css` | Product-wide | Default; reduced motion; partial display-font fallback | Canonical roles and material recipes | Token samples; portal font parity | Desktop; mobile | Covered | Legacy consumers migrate incrementally |
| Components | Button | `app/ui/Button.js` | Product-wide | Variants; sizes; disabled; sheen | Component children | Hover; press; focus; normal/reduced reviewed | Desktop; mobile reviewed | Covered | None |
| Components | Icon button | `app/ui/IconButton.js` | Product-wide | Variants; sizes; disabled | `aria-label` at call site | Hover; press; tooltip composition | Both | Covered | None |
| Components | Fields and selectors | `app/ui/Input.js`, `Select.js`, `SwatchPicker.js` | Account and setup forms | Empty; populated; disabled; selected | Call site | Focus; selection; normal/reduced reviewed | Desktop; mobile reviewed | Covered | None |
| Components | Feedback | `app/ui/Banner.js`, `Panel.js` | Status and content surfaces | Neutral; danger; title/body/actions | Props | Entry at composition | Both | Covered | None |
| Components | Overlays | `app/ui/Dialog.js`, `AlertDialog.js`, `Popover.js`, `MetaDisclosure.js`, `Tooltip.js` | Product-wide | Open; closed; confirm; destructive | Props | Dialog, AlertDialog, and Popover open/close/focus reviewed in normal and reduced motion | Both | Covered | None |
| Account & Identity | Account entry | `app/catana/lobby/AccountEntryModal.js` | Homepage/account entry | Sign in or guest; save guest profile; choose online identity; choose friend identity; missing credentials; email submitting | Component | Dialog transition; form validation; submit pending | Both | Covered | None |
| Account & Identity | Identity editor | `app/catana/lobby/IdentityModal.js` | Homepage/lobby | Suggested identity; existing identity; empty name; long username; emoji browser; mobile | Component and identity helpers | Dialog; picker selection; input validation | Both | Covered | None |
| Account & Identity | Account menu | `app/catana/home/SystemAccountMenu.js` | Homepage top chrome | Signed out; guest; claimed; alert states; pending; error | Component and match-alert helper | Popover open/close; normal/reduced reviewed | 1440×900; 390×844 reviewed | Covered | None |
| Account & Identity | Account/profile page | `app/account/AccountPageView.js` | `/account` | No profile; guest; claimed; missing credentials; email submitting | `AccountPageView.js` and `getAccountProfileCopy` | Auth mode; form validation; submit pending | Both | Covered | `AccountPageClient.js` owns fetch, auth, provider redirects, and refresh |
| Account & Identity | Public profile | `app/u/[username]/PublicProfileView.js` | `/u/[username]` | Empty recent matches; populated match history; mobile | View component | Replay link navigation | Both | Covered | `page-content.js` retains profile lookup and `notFound` |
| Lobby & Matchmaking | Homepage title chrome and game-mode dock | `app/catana/home/HomeTitleChrome.js` | Homepage | Brand/status metadata; signed-out, guest, or claimed top chrome; idle; finding; creating; starting; release notes; mobile | Component constants and release info | Link hover; account popover; release disclosure; mode selection; pending feedback | Both | Covered | `HomeTableClient.js` retains board, auth, matchmaking, and navigation ownership |
| Lobby & Matchmaking | Search/rescue modal | `app/catana/home/SearchingModal.js` | Homepage matchmaking | Finding table; alert rescue available; Puffer rescue available; match found; starting Puffer | Component and `matchmakingRescue.js` | Local rescue disclosure; cancel; alert action; Puffer handoff; normal/reduced reviewed | 1440×900; 390×844 reviewed | Covered | `HomeTableClient.js` owns matchmaking actions and match-alert adapter |
| Lobby & Matchmaking | Friend invite | `app/catana/lobby/[matchID]/PendingFriendChallengeScreen.js` | Pending challenge route | Inviter; long names/link; invitee; invitee joining; cancel pending; expired; challenge error | Component and challenge helpers | Copy; join; cancel; refresh; return | Both | Covered | `MatchPageClient.js` owns polling, credentials, accept/cancel requests, and navigation |
| Lobby & Matchmaking | Open match room | `app/catana/lobby/[matchID]/OpenMatchRoom.js` | Non-challenge lobby route | Open seats; no open seats; loading; join pending; bot fill pending; error | Component and match helpers | Join; refresh; spectate; fill seats | Both | Covered | `MatchPageClient.js` retains requests, credentials, polling, navigation, and board mounting; full/spectating transitions directly to the excluded board client |
| Alerts & Recovery | Match-alert control | `app/catana/matchAlerts/MatchAlertControl.js` | Account menu/search rescue | Off; active; paused; blocked; unsupported; install required; pending; error | `matchAlertState.js` | Pending/error action feedback reviewed in normal and reduced motion | Both | Covered | None |
| Alerts & Recovery | Match-alert dialog | `app/catana/matchAlerts/MatchAlertDialog.js` | Alert deep link | Checking; confirm; Puffer handoff; stale; error | `getMatchAlertDialogCopy` | Dialog/action transition | Both | Covered | Provider resolves and joins through production lifecycle helpers; stories stay provider-free |
| Alerts & Recovery | Recovery surfaces | `StatusBanner`, `HomeErrorBanner`, `GlobalReconnectBanner`, `IdlePromptModal`, `ResignConfirmDialog` | Homepage and match lifecycle | Neutral and danger status; lone lobby-error Dismiss; reconnect recipe; idle; resign confirm; unavailable match | Production components and `getReconnectStatusBannerProps` | Banner/dialog; flat sole Dismiss and paired ghost Dismiss | Both | Covered | `GlobalReconnectBanner` retains storage/router ownership; `LiveMatchLoadingShell` remains in the board boundary |
| Alerts & Recovery | Match availability and interrupted-duel recovery | `app/g/[matchID]/UnavailableMatchPage.jsx`, `app/catana/lobby/[matchID]/InterruptedDuelRecovery.js` | Unavailable game and interrupted duel routes | Generic unavailable game (combined cancelled/expired/removed copy); interrupted duel; recovery pending; recovery error | Route-local components and match helpers | Return; retry/look again; pending feedback | Both | Covered | `MatchPageClient.js` retains eligibility, leave request, `MATCH_FOUND`, storage cleanup, and redirects |
| Postgame & Replay | Game over | `app/catana/components/GameOverModal.js` | Completed match | Winner; loser; finished human alert resume; archived/replay actions; pending; mobile | `gameScreenDisplayModel.js` and component | Dialog/actions | 390×844 mobile composition reviewed | Covered | Live and archived callers retain lifecycle ownership |
| Postgame & Replay | Postgame summary | `app/catana/components/PostgameOverlay.js` | Completed match | Ranked scoreboard; summary rows; final scores unavailable; mobile | `gameScreenDisplayModel.js` and component | Replay; close | Both | Covered | None |
| Postgame & Replay | Replay controls | `app/replays/components/ReplayStepControls.jsx` | Replay | Start; middle; end; compact mobile state | Component | Button, range, and keyboard interaction | Both | Covered | None |
| Postgame & Replay | Replay status | `app/replays/components/ReplayStatusPage.jsx` | Replay loading/error | Preparing/polling; invalid | Component | Polling; retry; return to game/lobby | Both | Covered | None |
| Postgame & Replay | Replay score chart | `app/replays/components/ReplayScoreChart.jsx` | Replay panel | Multi-player; selected event; keyboard seek | Timeline helpers/component | Hover; click; keyboard seek | Both | Covered | None |
| Postgame & Replay | Replay panel | `app/replays/components/ReplayPanel.jsx` | Replay | Desktop open; desktop collapsed; mobile closed; mobile open | Component | Rail/drawer transition; normal/reduced reviewed | 1440×900 desktop; 390×844 mobile reviewed | Covered | Desktop rail and mobile drawer are deliberate breakpoint-specific variants |
| Gameplay | Log and Chat feed contents | `FeedPanel.js`, `ChatPanel.js`, `GameLogPanel.js`, `FeedTokenRow.js` | Live game and replay | Empty; writable; read-only; long transcript; mixed log tokens; selectable replay entries | Production chat/log formatters | Local send/clear, manual scroll/send-resume, keyboard selection | 1440×900; 375/390/430px phones | Covered | LeftMetaRail/MobileMetaDrawer remain bespoke; no live transport or complete gameplay-state verification |
| Gameplay | Settings and rules dialogs | `app/catana/components/GameInfoDialogs.js` | GameScreen desktop utilities and phone menu | Audio on/muted; standard/custom rule rows | Caller-owned state and rules | Local toggle; Close/Escape; focus return | 1440×900; 390×844; custom rules 320×568 | Covered | Actual audio persistence and game-rule calculation unchanged; no live-match test |
| Gameplay | Trade and resource selection | `TradeDiscardModal.js` | Trade, forced discard, Year of Plenty and Monopoly | Empty/valid selection; bank shortage; cancellable/forced | Component and engine rate/availability helpers | Real selection/payload story checks; local sandbox trade | Desktop; 320/375/390px phones | Covered | Existing dismissal policy retained; server validation still authoritative |
| Gameplay | Compact HUD | `MobilePlayerCockpit.js`, `PlayerActionContainer.js`, `OpponentPlayerBox.js`, `TurnControlCluster.js` | Live screen and read-only views | Dense/empty hand; pre-roll/waiting; playable cards; hidden opponent hand | Production model/components | Named dock keyboard action; quick-trade; existing hold/command tests | Desktop; 375/390px phones | Covered | Geometry/animation anchors remain component-owned |
| Alerts & Recovery | Live match loading | `LiveMatchLoadingShell.js` | Live board loading boundary | Loading/synchronizing with board underlay | Production component | Passive state | Desktop; phone | Covered | Transport remains outside Storybook |

## Clarity visual-system pass — 2026-09-22

This isolated branch applies shared Clarity recipes through the production owners
above, not a parallel mockup component library. The wordmark is provisional and
does not define UI type or control shapes. Exact sampled states, verification
limits and integration boundaries are in `CLARITY_UI_REVIEW.md`.

New review states include homepage `ClarityIdle`, `ClarityThreeModesIdle` and
`ClarityBot006Starting`; account menu `ClarityLongNameRecovery`; account/public profile
`LongUsername`; search/rescue `RescueError`; open room `LongNamesAndServer`;
game over `DenseResumeError`; and postgame summary `LongPlayerNames`.
Account entry also has `LongUsername` for maximum-length primary-action wrapping.

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
