# Clarity UI migration review

## Completion review — 2026-09-23

The ordinary production and developer UI migration is complete locally in
`codex/clarity-ui-redesign`. This section supersedes the earlier slice-specific
remaining-work counts below. It is not a production deployment or an exhaustive
accessibility/gameplay certification.

### Contract and review

- Complete typography roles, shared semantic colours/materials, spacing and
  role-based corners now cover ordinary UI, including resource-selection dialogs,
  compact HUD and developer consoles. Approved homepage actions and custom
  wordmark remain visually unchanged; Outfit remains the normal UI face.
- Ledger: **292 retained occurrences / 44 files**, down from 1,937 at the start of
  this completion pass and 3,088 at adoption. No new findings or count growth.
  `UI_STYLE_EXCEPTIONS.md` explains the retained board/card art, player data,
  joined geometry and explicit visual experiments; no directory is exempted.
- Policy now rejects invented semantic colours, unsupported semantic opacity,
  raw accent colours and consumer foundation-variable overrides. New checks
  were verified with failing-then-passing fixture tests.
- Independent implementation and final source reviews found and resolved lost
  avatar warning rings, an inline-foundation override bypass, two raw range
  accents and an unsupported modal accessibility claim. Scoped re-review is clean.
- Removed the obsolete three-test CSS-only CardStackStyles suite and two exact
  CSS assertions in the connection-banner test, following TESTING.md. Existing
  card layout, discard-tone and transport/debounce checks remain. Git preserves
  the deleted suite if its historical assertions are needed.

### Fresh browser and behavioral evidence

| Surface | Observed coverage |
| --- | --- |
| Home and account | Approved action colours/metrics retained; real ButtonFamily account entry at phone width, 22px panel / 14px controls / utility pills; portal font inheritance story passes |
| Resource selection | Five real-engine stories exercise trade, forced/cancelable discard, Year of Plenty shortage and Monopoly payloads; 375/390px screenshots fit; 320px DOM has two 95.5px columns without overflow and bounded vertical scroll; desktop has five columns |
| Compact HUD | Dense/empty/playable/sleeping/hidden-resource states; accessible dock action and native quick-trade keyboard stories observed failing then passing; inactive opponent warning rim verified |
| Integrated game | Pre-roll, post-roll, waiting, road/settlement/city placement, robber and game-over fixtures; correct command gating/prompts; 375x667 resource rail, Log/Chat and hold-control rectangles and text metrics exactly match pre-turn baseline |
| Trade callback | QA exposed preexisting generic Trade treating launch geometry as a resource preset. Narrow callback adapter now drops geometry, preserves resource quick-trade and read-only gating; three hook regressions pass. Actual sandbox trade submits 4 Wood for 1 Brick and updates hand/log |
| Drawer and replay | Phone Chat opens correct tab; Escape returns trigger focus. Four-player long-name replay fits 390px, Next advances event/scores; reduced effects give opaque/no-blur/no-motion pane and close restores focus |
| Developer UI | Dark effects console and effect selectors; underlay range/ports; palette selection/number toggle; phone showcase dialog/Escape; connector-study Dock only visibly closes panels; viewport-wall scaling preserves all six intrinsic viewport sizes |

### Limits and unrelated findings

- The legacy `/board-editor` crashes on initial hydration: generated empty tiles
  have `type: "Empty"` but no `resource`; Board's resource check sends them to
  EditableTile, whose `useDrag` rejects an undefined type. Generator/Board/
  EditableTile match the pre-turn snapshot. Sidebar styling is migrated, but
  this unrelated prototype defect blocks its runtime visual sign-off; not fixed
  as part of the design-system migration.
- The resource dialog keeps its existing non-dismissible policy and named
  `role="dialog"`; it does not claim a focus trap with `aria-modal`.
- Bright-lime/white action contrast remains the explicitly approved visual
  limitation. This work does not claim WCAG conformance. Storybook's existing
  React act deprecation and drawer-description warnings remain separate work.
- Reconnect and spectator/replay checks use local capability fixtures; no real
  multiplayer transport, physical-device, exhaustive card combination or audio
  audition was performed. No authoritative engine rules changed.
- Policy is a tested static guardrail, not a full dynamic CSS interpreter. CI is
  included locally; requiring its status in remote branch protection is separate
  and was not authorized. No commit, push or deployment.

### Final gates and handoff

- `SETTLEX_APP_TEST_CONCURRENCY=2 pnpm verify .`: exit 0. Policy/display tests
  29 passed; engine 153 passed; server 279 passed / 8 skipped; all 194 app test
  files passed; ESLint has no warnings/errors; policy passes at 292/44. The
  trailing `.` was forwarded to the policy command, not used to filter tests.
  Log: `/tmp/settlehex-clarity-verify-20260923-retry.log`.
- `SETTLEX_ALLOW_BUILD_TIME_SERVER_PLACEHOLDERS=1 pnpm build`: exit 0, all
  20 static pages generated. These placeholders are build-only, not production
  credentials. Log: `/tmp/settlehex-clarity-build-20260923.log`.
- `pnpm build-storybook`: exit 0, generated `storybook-static`.
  Log: `/tmp/settlehex-clarity-storybook-20260923.log`.
- Non-blocking tooling warnings: Vite CJS API, Node punycode/CommonJS-to-ESM,
  Storybook webpack metadata and recommended bundle/entrypoint size limits.
- Task-created QA tabs closed and viewport overrides reset. Original reference,
  home (3011) and Storybook (6011) tabs preserved; preview servers retained for
  review. The app server was stopped during the build to avoid `.next` conflicts
  and restarted afterward. All changes remain local and uncommitted.

## Latest game-information dialog migration — 2026-09-23

GameSettingsDialog and GameRulesDialog now use the shared pane, inset, type, ink
and spacing roles. GameScreen only replaces inline markup with these production
owners; state, rule calculation, mute persistence, blocking flags, copy and dialog
max-widths remain unchanged. No board/action-dock geometry or game rules changed.

Fresh observed coverage:

- Four Game Info Dialogs story play functions ran without assertion errors:
  SettingsAudioOn, SettingsMuted, StandardRules and CustomRules. They exercise
  local toggle callbacks, ordered term/value output, Close/Escape and focus return.
- Settings reviewed at desktop 1440x900 and integrated phone 390x844; rules at
  both sizes. Desktop settings remains 384px wide and rules 448px; phone rules
  measure 358x550px with no horizontal overflow and 16px viewport gutters.
- CustomRules at 320x568 wraps the unbroken identifier in a 92px value column;
  no row overflow. The dialog is height-capped to 536px and scrolls. Close gets
  the existing shared autofocus, which scrolls this short dialog down initially;
  scrolling up exposes the heading. No focus-policy redesign in this slice.
- Reduced motion/transparency yields solid rgb(248,251,255), no blur, no animation
  and 0s transition. Popup corners measure 22px, inset rows 8px, values 14px/500/20px.
- Both real desktop utility entry points and phone menu entry points open the
  correct dialogs in sandbox. Seven rule values match the before-state. Close
  and Escape work; actual persistent audio preferences were not changed.

28 targeted tests pass (4 command-state, 11 policy, 13 display-font); lint has no
warnings/errors and policy passes with 1,937 occurrences / 61 files remaining.
Only 36 resolved findings were removed. Independent read-only review against the
pre-turn GameScreen/ledger snapshots found no actionable issues.

Storybook still emits its existing ReactDOMTestUtils.act deprecation warning.
No new application errors observed. This was browser-emulated desktop/phone QA,
not physical-device, multiplayer, full-gameplay or production-build validation.
Other gameplay dialogs remain outside this slice. No commit, push or deployment.

## Latest game-chrome migration — 2026-09-23

The feed dock, phone drawer/menu and desktop utility overrides now consume
shared Clarity roles. The design router's HUD/pane distinction is preserved:
lighter glass over the board, denser glass for the off-board drawer/popover.
No handlers, preference logic, phase timers, drawer options or game rules changed.

Fresh observed coverage:

| Surface | Scope | Result |
| --- | --- | --- |
| MobileMenu story | 390x844, local callbacks | Mute state updates; rules/settings/resign callbacks each fire once and close the menu; final rows measure 44px, 14px/600/20px type, 14px corners |
| Spectator/replay menu story | 390x844 capability fixture | Muted state shown; no Resign control |
| Mobile drawer stories | 390x844, normal/read-only | Tab selection, local send/clear, Escape and reopen pass; long player name/message wraps; disabled composer stays disabled |
| DesktopFeedDock story | 1440x900 | Real frame/content owners render; 22px corners; minimize/Enter restore work |
| Integrated desktop sandbox | General scenario, 1440x900 | Log (16,164,288,342), chat (16,514,288,306) unchanged; Enter restores and Space minimizes log to 56px square; utility circles remain 48px |
| Integrated phone sandbox | 375x667 general; 390x844 pre-roll/waiting; 430x932 robber | No horizontal overflow in measured drawers; tabs 44px; drawer heights 346.8/416/416px; Roll Dice/waiting/robber prompts remain correct; menu rules callback opens actual rules dialog |
| Keyboard/reduced effects | Drawer tabs/composer; desktop dock and menu | Blue 2px focus rings visible; reduced-transparency produces solid rgb(248,251,255), no blur; reduced motion removes transitions on tested frame/utility surfaces |

Outside board drag and Escape still dismiss the mobile drawer. This deliberately
preserves the behavior recorded in the preceding pass, not the older stay-open
description. Taller 44px tabs take a few pixels from transcript space, not from
the board or the total drawer height.

Four targeted existing tests and 24 policy/display-font tests pass; full lint has
zero warnings and policy rejects drift. The ledger only shrank: 104 occurrences
removed, 1,973 remain in 61 files. Independent pre-turn-snapshot review found one
minor unsupported-blur fallback gap, now corrected with solid defaults and
supports-gated translucent overrides. No new exemptions or source-grep tests.

Preview startup required restarting the stopped local servers; a first-load Next
chunk error cleared after compilation/reload. Storybook retains its act deprecation
warning and Vaul description warning; the latter's wiring was unchanged. Four
story play functions ran successfully after visibility assertions were made to
wait for entrance motion. The fifth story is a manually checked desktop fixture.

Limits: no live chat, real resign, multiplayer transport, physical iOS/Android,
full gameplay-state matrix, production build or deployment. Discard, placement,
game-over and all development-card combinations were not rerun in this slice.
Their state logic/action-dock code is unchanged. No claim of whole-game migration.

## Latest shared Log/Chat feed migration — 2026-09-22

Migrated FeedPanel, ChatPanel, GameLogPanel and FeedTokenRow prose/spacing to
the existing complete roles and semantic colours. Shared recipes now own feed
header/footer/composer/current-entry materials. Player identity colours and
miniature dice, card and tile artwork are preserved. LeftMetaRail, MobileMetaDrawer,
GameScreen, scroll state, formatter and transport helpers are unchanged.

Fresh local coverage:

| Surface | Viewports/state | Observed result |
| --- | --- | --- |
| Storybook chat | 390×844 LiveChat; 375×812 LongTranscript; 430×932 ReadOnlyChat | Send appends fixture message and clears input; disabled spectator input; 280-character unbroken text and long name wrap without horizontal overflow |
| Feed scroll | 375×812 long fixture | Manual scroll moves off bottom (1,624px remaining); local send restores bottom (0px remaining) and empties composer |
| Log/replay entries | 1440×900 LogEntries; 390×844 SelectableReplayLog | Resource/dice/dev-card/tile images load; server entries stay italic; click, Enter and Space update current entry; focus ring visible |
| Reduced effects | 1440×900 EmptyChat; 390×844 ReadOnlyChat | Solid rgb(248,251,255) shell/input, no blur, entry animation none and composer transition 0s; disabled input remains disabled |
| Integrated desktop | Classic sandbox general scenario, 1440×900 | Expanded frame rectangles unchanged: log (16,164,288,342), chat (16,514,288,306). Minimize returns log to 56px square; chat stays put. Composer remains ~36px tall |
| Integrated phone | Classic sandbox, 375×812 log; 390×844 and 430×932 chat | Drawer tabs switch; no horizontal overflow; 390px drawer is 416px high at y428, composer ~36px at y797; input focus ring fits inside frame |

Browser interaction also observed an outside board drag dismissing the mobile
drawer while panning the board. The current unchanged dismissible/non-modal
outside-pointer handler explains that behavior; it contradicts older notes
claiming no outside close. This batch does not change drawer interaction, and
does not claim that behavior passed the older specification.

Fifty-one existing feed/formatter/scroll tests and 24 policy/display-font tests
passed. Independent snapshot-based review found no concrete regressions. A minor
disabled-state specificity observation was addressed in the opaque fallback.
Final full lint (zero warnings), policy and diff checks passed. The temporary
QA tab was closed and viewport/media overrides reset. The existing Storybook
tab now shows LogEntries; original homepage and Claude reference tabs remain.
The ledger removes exactly 104 findings, with zero growth: 2,077 across 65 files
remain. Fourteen retained feed findings are miniature graphic typography/palette/
corners. These are explicit, not new exemptions.

This is a feed-content migration, not whole-game sign-off. No live chat was sent,
no server/privacy logic was exercised through fixtures, and the full pre-roll,
waiting, discard/robber, placement and game-over state matrix was not rerun.
Mobile keyboard/real-device touch behavior, production build and deployment were
not tested. Existing development warnings (Vite CJS, React test-utils act and
drawer Description warning) were observed; no unrelated fixes were mixed in.

## Latest public-profile/homepage metadata migration — 2026-09-22

Migrated PublicProfileView, SystemTopChrome and the metadata portions of
HomeTitleChrome. Full typography roles replace local font combinations; spacing,
ink and focus corners use canonical tokens. Avatar glyph and metadata-dot
materials have central recipes. Profile data/formatters, navigation, release
contents, callbacks, mode-button internals and custom wordmark are unchanged.

Fresh local coverage:

| Surface | Viewports/state | Observed result |
| --- | --- | --- |
| Profile | 390×844 long username; 375×667 empty and long history labels; 1440×900 history | No horizontal overflow in phone samples; long names/labels wrap; 44px replay anchors retain encoded game routes; Tab reaches the last history action |
| Homepage metadata | 1440×900 normal and long release notes; 1024×768 long notes | Open/close and Escape restore trigger focus; exactly three highlights; long-copy panel fits its 352px width |
| Homepage controls | 1440×900 three/four-mode idle; 390×844 idle and four-mode pending | Three-mode dimensions, padding, radii, colours and text metrics match pre-turn sample exactly; pending disables all four actions; mobile hides desktop metadata/navigation |
| Reduced effects | Desktop long release notes | Solid rgb(248,251,255) panel, no backdrop blur, no animation, 0s transition; Escape restores focus |
| Integrated homepage | Existing `/catana/dev/home-table` preview at 1122×1414 | Refreshed stale page, then verified current caption/heading roles, loaded Next Outfit face, 352px release panel and open/close/focus |

The long-copy story exposed a pre-existing cascade conflict: Popover's `w-max`
won over the caller's width, producing a ~714px panel. A caller-scoped explicit
width override fixes it without changing every Popover. This is CSS/layout
verification, not a new behavioral helper or lifecycle change.

Twenty-nine tests passed: 24 policy/display-font, four release-info and one
public-profile server test. Final full lint/policy and diff checks passed.
Independent pre-turn-snapshot review found no actionable issues. The policy
ledger shrank by 102 to 2,181 findings across 68 files. No new exemptions.

This is not whole-site or gameplay sign-off: dev showcases/labs, optional
surfaces, shared game chrome and bespoke gameplay remain. No live profile
lookup, auth, match creation, replay navigation, production build or deployment
was exercised. Existing Vite CJS deprecation and approved lime-text contrast
limitations remain. Temporary QA tab/overrides are removed at closeout; the
original reference, homepage and typography-library previews remain.

## Latest recovery, postgame and replay foundation migration — 2026-09-22

Migrated eleven presentation consumers: idle/status feedback, interrupted and
unavailable matches, game-over modal/backdrop, postgame summary, replay status,
panel, step controls and score chart. Result actions use shared Button; the
unavailable-page Link uses the same material without changing navigation.
Replay segments reuse the shared selected-state recipe, turn jumps use subtle
Button, and dense chart axes use a complete typography role. Custom celebration
type, confetti, timeline/seek helpers, spoiler filtering, player colours, drawer
options and board-safe offsets remain unchanged.

Fresh local Storybook observations:

| Surface | Viewports/state | Observed result |
| --- | --- | --- |
| Recovery | 1440×900 interrupted error; 375×667 pending/error/long unavailable ID | Actions fit; recovery pending disables both actions; long ID wraps; lobby link retains href="/" |
| Idle/shared recovery | Phone idle pending/error, resign confirmation and match-alert failure | Sending is disabled; retry/acknowledgment and safe dismissal branches remain; no horizontal overflow |
| Results | 1440×900 and 375×667 dense resume error; phone loser, pending, replay preparing/failed | Long names fit; internal scrolling reaches every action; sampled actions remain 44px; pending and replay-loading guards preserved |
| Summary | 375×667 long names and empty scores | Score rows and footer wrap; replay/close remain available |
| Replay desktop | 1440×900 expanded chart, collapsed/restored panel, four players | Segment labels fit after a token-padding adjustment; select changes perspective; chart and legend remain scrollable |
| Replay phone | 375×667, 390×844 and 430×932 drawer/chart, board/player perspectives | No horizontal overflow; 44px controls; event and turn navigation update the fixture; start/end gates disable previous/next controls; native range and chart keyboard seeking update cursor/scores |
| Replay effects | 430×932 reduced motion/transparency | Solid rgb(248,251,255) pane, no blur, no animation and 0s transition; Escape restores open-tray focus |
| Replay status | 390×844 preparing/invalid/active | Correct actions for each state; polling stops after its bounded attempts; Retry restarts at 1/10 using mocked router refresh |

The replay fixture now uses existing production navigation helpers; it does not
prove live archived-match reconstruction or board interaction. No live recovery,
join, auth, push or navigation request was submitted. This pass did not retest
the full gameplay state matrix or perform a production build/deploy.

Verification: 24 policy/display-font tests plus 40 game-over, display-model,
interrupted-duel, replay-navigation/session, panel and chart tests passed. Full
Next lint and policy checks passed. Browser logs showed the existing
ReactDOMTestUtils.act deprecation; CLI showed Vite/Recharts module warnings.
The ledger shrank by 362 to 2,283 occurrences across 70 files; five explicit
player-colour/flat-drawer-corner findings remain in this scope. White-on-lime
contrast remains an open, unchanged limitation.

Independent source review found one pending-state presentation issue: the
close SVG matched the disabled-button decoration-hiding selector. Wrapped the
icon like shared button content; verified the disabled Close retains its visible
cross at 390×844. Final lint, policy and diff checks passed. Closed the temporary
QA tab and reset viewport/media overrides; the existing reference, homepage and
typography-library previews remain open.

## Latest account/lobby foundation migration — 2026-09-22

Migrated the account menu, identity editor, match-alert control, search/rescue,
friend invite and open match room to complete type roles, UI spacing, semantic
tones and role corners. Kept the approved button palette, game/HUD boundaries,
auth and lifecycle behavior intact. Emoji graphic sizes are centrally owned;
server metadata uses the full monospace `type-code-caption` role.

Fresh local observations (production components in Storybook, external actions
mocked):

| Surface | Viewports/state | Observed result |
| --- | --- | --- |
| Account menu | 1440×900 and 390×844 long-name/recovery; 375×667 pending/install-required/paused | Content fits; Enable disabled while pending; Escape closes and restores trigger focus |
| Identity | 1440×900, 390×844 and 375×667 long username | Name, swatches and CTA fit; emoji and colour selection update; clearing name disables submit; emoji-browser Escape restores trigger |
| Identity effects | 375×667 reduced motion/transparency | Avatar animations none; pane is solid rgb(248,251,255), no backdrop blur |
| Search/rescue | 1440×900 and 390×844 rescue error; phone finding/found/starting | All actions fit; Keep waiting collapses rescue; Match found disables Loading board; Starting Puffer has no actions |
| Friend invite | 1440×900 and 390×844 long names/link; phone invitee/joining/cancelling/expired/error | Long host wraps; Copy becomes Copied; name input and mocked join work; empty name and pending states disable appropriate actions |
| Open room | 1440×900 and 390×844 long names/server; phone loading/join/bot/no-seat/error | No horizontal overflow; seat selection and mocked join work; appropriate actions disabled by existing gates |

Normal keyboard deletion verified the empty-name behavior; the automation's
empty `fill` call initially left the old value and was not an application bug.
No production behavior change was made for it.

Fresh checks: 24 policy/display-font tests plus 41 account-menu, matchmaking-rescue
and match-alert-state tests passed; full Next lint, policy and diff checks passed.
The ledger shrank by 210 occurrences to 2,645 across 77 files; all six scoped
consumers have no remaining tracked findings. This is not every CSS property or
a whole-site migration. No full engine suite, live auth, real matchmaking, push
subscription or production validation was performed. White-on-lime contrast
remains unresolved. No dependencies, push, merge or deployment changed.

## Latest control-family integration — 2026-09-22

This section supersedes the first-pass button palette below. The user approved
the actual 2a lime/white, amber/brown and white/navy mode-button treatments after
several local trials. Shared Button now owns those material palettes; the
homepage consumes them with its unchanged geometry, icon tiles and stronger
depth. Compact form actions use the same palette with a shallower base. Header
and account utilities use the explicit fully rounded utility variant; ordinary
form/play controls remain 14px, small tiles 8px and panels 22px.

Account entry has centered headings, simplified copy and a pill auth selector,
with left-aligned labels/values and existing auth behavior. Storybook ButtonFamily
composes the real production controls; EmailOnly reflects the local provider
configuration. See the latest PROGRESS entry for this pass's sampled checks;
historical checks below were not all rerun. All three home buttons matched their
recorded computed appearance after palette extraction. Targeted lint and the two
SystemAccountMenu model tests passed. No live auth or deployment was attempted.

White text on the approved bright lime remains an accessibility contrast issue,
now also present on compact primary controls. It needs an explicit future design
decision, not an unannounced replacement of the user-approved colours.

## Original first-pass record

Status: first-pass implementation, local verification and independent review
complete on an isolated branch. Ready for user visual feedback; nothing has been
pushed, merged or deployed.

## Intent and boundaries

Continue the approved Claude Design 2a direction: bright smooth glass, consistent
geometry and typography, readable hierarchy, compact tactile controls. The user
explicitly said the wordmark is provisional: it is retained, not redesigned, and
does not dictate the UI's shapes or typography.

The existing blue world, board art, player colors and functional workflows remain.
This is a game-client redesign, not a marketing landing page. No auth, match
rules, network state, replay navigation or game-effect behavior is redesigned.

## Shared rules implemented

- Outfit for UI; existing Fredoka wordmark stays isolated.
- Corners: 8/14/22px and pills. Existing bespoke joined game shapes stay intact.
- Spacing: 4/8/12/16/24/32/48px, with 20px mobile pane padding.
- Pane: 88% white with 24px blur. HUD: 58% white with 18px blur. Both saturation 1.5,
  crisp edge and solid/reduced-transparency fallback; inset groups have no second
  glass shadow.
- Lime primary with dark ink, amber accent and rose danger; quiet controls do not
  inherit CTA depth. Standard targets 44px minimum and blue visible focus.
- Fast 140ms, entrance 220ms, exit 160ms; reduced motion removes travel. No animated
  backdrop-filter.

Existing production primitives and shared material owners implement these rules;
stories use the same components, including portal fonts and HUD CSS.

## Observed verification

All checks below are local development/Storybook observations, not production or
live-provider validation. Native screenshots were inspected during the session.

| Surface | Viewports/state | Observed result |
| --- | --- | --- |
| Shared foundations | Desktop 1440x900 | Consistent type, spacing, corners and distinct pane/HUD/inset roles |
| Shared dialog | Short phone 390x667 | Safe 16px bounds, internal scroll reaches bottom actions |
| Shared keyboard/motion | Dialog/disclosure Escape; reduced motion | Trigger focus restored; control transitions 0s/transform none |
| Accessibility material | Friend identity, 390x844; reduced motion/transparency | Solid fill, no blur, 0s animation/transition; no overflow |
| Homepage chrome | Desktop 1440x900; 375x667; 4 modes at 768px | Tray removed; 12px gaps; phone 64px/desktop 72px actions; 4 modes use 2 tablet columns |
| Real 2D homepage | Desktop 1280x720; 375x667 | Board remains clear of header/actions; no horizontal overflow |
| Account entry | Desktop; 375x667; validation/provider-pending; create account; save guest | One explanation; horizontal provider rows; 44px mode selector; error/pending preserved |
| Account menu | 375x667; long name/recovery | Name wraps; 44px rows; popup fits; Escape restores trigger |
| Identity | 390x844 | Palette/CTA fit; 44px arrow controls; emoji browser opens |
| Real 2D game utility icons | Desktop | Integrated padding regression fixed; SVGs 20x20px inside 48px buttons |
| Account/public profile | Long usernames, 375x667 and 390x844 | Names wrap, fields/actions remain usable; stat values align after equal-height labels |
| Matchmaking rescue | Rescue error, 375x667 | Explanation, alert error and all actions fit; targets at least 44px |
| Friend invite | Inviter 1440x900; invitee joining 375x667 | Shared pane/divider hierarchy; pending join remains disabled |
| Open room | Long names/server/identifier, 375x667 | No horizontal overflow; all seats and actions reachable with ordinary page scroll |
| Recovery | Interrupted-duel error 1440x900; match-alert failure and resign confirmation 390x844 | Error/destructive semantics and available actions preserved, shared material/type |
| Dense postgame | Resume error and long-name summary 375x667; loss state 390x844 | Internal scroll reaches all six dense-state actions; 44px targets, long-name score/footer fit |
| Replay desktop | Four-player long names, 1440x900 | Chart expands, perspective changes; outer HUD material and manual controls retained |
| Replay phone | Drawer/chart, 390x844 | 44px controls; scrollable chart; perspective changes; Escape restores open-tray trigger |
| Replay reduced motion | Open/close drawer | Transition property none, duration 0s, animation 0s, transform none |
| Real 2D sandbox | 1280x720 and 375x667 | Shared HUD/meta material renders; bespoke player/dock shapes retained; no horizontal overflow or console warnings/errors |

These are sampled named states, not an exhaustive live-flow test. Storybook replay
seek callbacks are spies with a fixed event index: keyboard focus was checked in
the browser, while seek behavior is covered by the existing regression suite.

## Coverage ownership

Direct product work covers account/profile views, search rescue, friend invite,
open room, interrupted-duel recovery, match-alert control, idle prompt, game-over
and postgame summary. Shared HUD and meta-panel owners align the light game shell;
replay edits are limited to shell, typography and control presentation.

StatusBanner, MatchAlertDialog and ResignConfirmDialog inherit the production
primitive changes without source edits. Global reconnect/unavailable-game surfaces
inherit their existing primitives. The live meta rail inherits its shared frame;
GameScreen, board renderers, player color identity, joined nameplate/dock shapes,
game effects, server/auth models and replay state/navigation remain untouched.

Six dense/long-name production stories were added for account, public profile,
search rescue, open room, game over and postgame summary. They are fixture-driven,
not new product states or invented user data.

## Automated verification

Fresh combined check after the product-surface commit, repeated after the final
shared Button alignment correction:

```sh
pnpm exec vitest run app/catana/__tests__/SystemAccountMenu.test.js app/__tests__/replayPanel.test.js app/__tests__/replaySessionState.test.js app/__tests__/replayNavigation.test.js app/__tests__/replayScoreChart.test.js --reporter=dot
git diff --name-only -z 28b42ec..HEAD -- 'app/**/*.js' 'app/**/*.jsx' | xargs -0 pnpm exec eslint
pnpm exec eslint --no-ignore .storybook/preview.js
git diff --check
```

Results: **5 files / 28 tests passed**; all changed JS/JSX and Storybook preview
lint clean; whitespace check clean. Existing lockfile dependencies were installed
offline and `pnpm -C game-core build` passed before the focused checks. No new
dependencies or source-grep tests were added.

## Independent review

The foundation, homepage/account and product-shell tasks each passed their
spec/quality review. Whole-branch review (`28b42ec..fa30a19`) found no critical or
important issues and one minor Button alignment regression: the full-width inner
wrapper centered content even when a caller requested left alignment. Commit
`f7323ea` makes alignment inherit from the outer button and adds a focused
`ContentAlignment` story. Manual checks confirm center/start/end/space-between,
horizontal icons/text, left-aligned provider rows and centered default actions.
The scoped fix review confirmed the finding addressed with no new issues. No
findings are deferred. The branch remains separate for user visual judgment and
later authorized reconciliation with main.

## Verification limits and integration

- Branch: `codex/clarity-ui-redesign`, baseline: `28b42ec`. This starts from committed
  main, not the main checkout's uncommitted work.
- The main checkout has active independent work. Known overlap for reconciliation:
  `app/catana/home/SearchingModal.js`, `docs/agent/PROGRESS.md`, and
  `docs/agent/NOTES.md`. Do not replace main's files wholesale.
- Main's homepage animation/matchmaking changes were not copied or altered; route-
  level and live provider/network integration must be checked after reconciliation.
- No full suite, production build, live authentication, notification subscription,
  matchmaking request or deployment is claimed by this visual pass.
- Local test warnings: existing Vite CJS, Recharts/Redux ESM-loading warnings, and
  Storybook React act deprecation. The focused checks passed despite these existing
  toolchain warnings; this task does not change dependencies.
- The local sandbox toolbar overlays some top HUD content by design. The shared
  material review does not claim a whole-game layout or accessibility audit.
- Foundations Storybook accessibility result: 0 violations, 20 passes, 1 incomplete
  rule. The incomplete contrast rule cannot determine gradient backgrounds; this
  is not a complete automated contrast pass.
- Some hidden-browser screenshots at larger-than-native dimensions tiled or
  mis-scaled. Final visual judgments use settled captures within supported bounds,
  supplemented by actual DOM geometry. These capture artifacts are not UI defects.

## Enforced foundations follow-up — 2026-09-22

This follow-up adds canonical complete typography roles and a no-new-drift
policy; it is not a full migration of every surface catalogued above. The current
contract is `DESIGN_SYSTEM.md`. Shared controls/account consumers have no tracked
policy findings; 2,855 legacy occurrences across 83 other files remain explicit.

Fresh automated evidence: 24 policy/font fixture tests, 8 game-over model tests
and 2 account-menu model tests passed. `pnpm lint` (including policy), explicit
Storybook preview ESLint and `git diff --check` passed. No full build or whole
engine suite was run for this stage, and CI has not run remotely.

Fresh browser samples: 1440×900 desktop and 390×844 phone 2D sandbox; account
email/selection/pending/error states; 375×667 long-name form and avatar picker;
Escape focus return; phone typography scale; root/portal font inheritance;
reduced motion/transparency. The root-font check caught and fixed an alias that
used locally installed Outfit instead of Next's bundled face. Production now
reports the custom-loaded Outfit, and modal/button font families match the body.

All 12 measured desktop gameplay button boxes match the captured pre-migration
baseline. Ten of 11 measured phone button boxes match exactly; the remaining
animated action differs by about 0.14px with its pulse phase. The three homepage
button material/type recipes and 72px desktop height match their baseline.
These are sampled geometry checks, not a guarantee about every game state.
Normal/reduced effects and custom-display fallback were checked independently;
the separate wordmark task documents its own responsive header/win checks.

## Local review entry points

- Real homepage: `http://127.0.0.1:3011/catana/dev/home-table`
- Storybook: `http://127.0.0.1:6011/`
- Stable homepage story: `composed-surfaces-lobby-matchmaking-homepage-title-chrome--clarity-idle`
- Shared system story: `foundations-visual-language--production-visual-language`
- Optional four-mode story: `composed-surfaces-lobby-matchmaking-homepage-title-chrome--clarity-four-modes-idle`

These addresses require the task-owned local dev servers to remain running.
The homepage and Storybook catalog tabs are deliberately preserved for review;
temporary viewport/media emulation was cleared. Original Claude reference tabs
remain untouched. No separate standalone browser process was created.
