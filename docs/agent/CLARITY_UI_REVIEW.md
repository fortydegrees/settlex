# Clarity UI first-pass review

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
