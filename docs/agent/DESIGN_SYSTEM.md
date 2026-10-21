# Enforced Clarity foundations

The contract is global. Production and developer-tool chrome share these
foundations; board/card artwork, identity colours and coordinate geometry retain
explicit owned contracts in `UI_STYLE_EXCEPTIONS.md`. A passing policy check means
**no new tracked styling drift**, not exhaustive visual/accessibility conformance.

## Ownership

- `app/ui/theme.cjs`: canonical spacing, corner, semantic colour, motion, layer,
  shadow and complete typography-role values.
- `tailwind.config.js`: emits those values as CSS variables and semantic utilities.
  It does not redefine existing Tailwind defaults or globally restyle headings.
- `app/globals.css`: owned material and interaction recipes, font registration,
  focus treatment, motion and reduced-motion/transparency behavior.
- `app/catana/home/HomeBrand.module.css`: deliberate wordmark-fitting and
  responsive logo-layout exception, owned by the wordmark integration task.
- `app/catana/home/HomeSkyText.module.css`: title-screen ambient copy over the
  blue field, using semantic home-chrome ink tokens; it does not set the
  wordmark, action-button or popover-panel colours.
- `app/ui/*`: normal product controls over the existing Base UI behavior layer.
- Board/piece rendering and joined gameplay geometry remain bespoke. HUD text,
  materials and ordinary controls consume shared roles without changing anchors,
  command eligibility or hidden-information rules.

## Typography

Choose a complete role: `type-body`, `type-body-small`, `type-label`,
`type-caption`, `type-code-caption`, `type-section`, `type-title`, `type-page`, `type-action-small`,
`type-action`, or `type-action-large`. Every role owns family, size, weight,
line height and tracking. Do not compose `text-sm font-bold leading-6` or
override individual font properties on a consumer.

Use semantic HTML independently: `<h2 className="type-title">` is normal.
Choose tone separately: `text-ink-primary`, `text-ink-secondary`,
`text-ink-muted` or `text-ink-danger`.
The exposed homepage title chrome uses `--settlex-ui-text-home-chrome` and its
muted companion for small sky-layer copy; product controls and light panels
keep their normal ink roles.

Outfit is the normal UI family. `DisplayText` explicitly opts into the custom
Black/900 display font. The face has a partial alphabet; unsupported copy falls
back to Outfit for the entire string. Do not make it the default for names or
localization. `BrandWordmark` alone applies the approved per-letter logo fit.
The legacy optional Sx icon still has its own Fredoka artwork, not UI typography.

`type-code-caption` owns the full monospace role for technical metadata such as
the lobby server address. Emoji are graphics, not prose: shared avatar and
emoji-option recipes own their glyph sizes separately. Do not override a shared
Button's typography to enlarge an emoji; put the graphic recipe on its child.

`type-chart-tick` is a complete 10px/700/1.2 role for dense chart axes only,
not an alternative body or button size. Replay tick labels use it through the
shared SVG text recipe. Replay materials (rail, markers, thumb, future-score
hatching) live in the recipe owner; plot coordinates and seek logic remain in
the replay components. Player colours remain data, not semantic UI ink.

The Next font variable belongs on the document root, where the foundation aliases
are defined, not only on `body`. Storybook mirrors this scope so portalled text
uses the same loaded face. `TypographyFontInheritance` checks that contract in
the rendered browser; a locally installed Outfit must not conceal a missing webfont.

`DisplayText variant="celebration"` owns the win-heading role: 32–48px responsive
size, 900 weight, 1.15 line height, zero tracking. Consumers do not override the
individual role variables.

Compact `type-hud-*` roles retain the measured cockpit/desktop sizes, weights,
line heights and tracking for counters, timers, names and tooltip text. They are
not substitutes for ordinary form/body text. The `type-home-*` roles preserve the
approved play-action and secondary-marker metrics. Both families are shown in
the foundation catalog; adding a role requires a real repeated use, not a way to
hide a page-local override. The trailing `type-home-marker` is 16px at phone
size as well as desktop size; weight and colour keep it secondary.

## Geometry

Use `p-ui-5`, `gap-ui-3`, `mt-ui-6`, etc. for spacing. The main rhythm is
4/8/12/16/20/24/32/48px; 2/6/10/14px steps are available for compact internals,
and the 56px step preserves the existing large-screen game-container gutter.
Avoid introducing a new arbitrary value because one screenshot looks tight.

Corners follow role: `rounded-small` (8px tiles/insets), `rounded-control`
(14px form/play actions), `rounded-panel` (22px panels), `rounded-pill`
(floating utilities/segmented selectors). Pill is a shape, not an emphasis level.

Components own their internal material, padding and typography. Pages own layout,
alignment and available width. Prefer a semantic component variant over local
appearance overrides. Layout widths, aspect ratios, board coordinates and icon
dimensions are not blanket-normalized by the spacing checker.

For banner actions, emphasis follows the available choice rather than the word
on the button: a sole Dismiss uses the flat `subtle` action, while Dismiss paired
with a stronger recovery action uses `ghost` and leaves the recovery action
prominent. Do not use the raised `secondary` action just to make a banner
dismissal visible. Keep the shared 44px small-button hit area in both cases.

## Enforcement and migration

- `pnpm ui:check`: scans app JS/JSX/TS/TSX and CSS using the installed TypeScript
  parser and PostCSS. Flags independent type fragments, literal palette/corner
  utilities, raw spacing utilities, selected inline/CSS appearance properties,
  unknown type roles, spacing tokens and semantic colour names. The semantic
  colour registry is shared with Tailwind; invented names cannot silently compile
  to nothing. Slash-opacity modifiers on semantic colours are rejected because
  this installed Tailwind configuration does not emit them; use a named material.
- `pnpm test:ui-policy`: behavioral fixture tests for the checker and display
  coverage helper. No tests assert production class strings or source nesting.
- `pnpm lint` and `pnpm verify` run the policy. `UI design policy` runs on PRs
  and pushes to main, without deploying. CI compares the migration ledger with
  the base commit so regenerating it cannot silently accept additional debt.
- `pnpm ui:inventory`: prints the current inventory for inspection only; it does
  not write or accept a new baseline.

`scripts/design-system/legacy-styles.json` is the exact retained-contract ledger,
keyed by file, rule, value and occurrence count. Its historical name is retained.
`UI_STYLE_EXCEPTIONS.md` explains each owning artwork/data/geometry family. A stale
entry fails too, so old exemptions cannot accumulate.
Do not regenerate the ledger to silence new errors. A genuinely necessary new
exception needs an explicit, documented policy review.

The checker is an engineering guardrail, not a security boundary or a full CSS
interpreter. It does not resolve arbitrary dynamic class construction, imported
style objects, CSS-module selector semantics, or every visual property. Ordinary
consumer appearance overrides still need code review. Stories/tests are not
scanned; the global recipe owner and canonical token module intentionally own
literals. Branch-protection settings must make the CI job required if merging
must be technically blocked; this local task does not change remote settings.

## Migration history

The counts below record earlier slice boundaries, not the current inventory.
The latest completion entry in `CLARITY_UI_REVIEW.md` records final checks/counts.

Buttons, fields, dialogs/alerts, panels, popovers/tooltips, metadata disclosure,
banners, account page and account-entry form now consume complete roles and
token spacing. Both email-auth entry points use `SegmentedControl`. Homepage
play-button metrics/material are preserved. `Foundations/Visual language` and
its `TypographyRoles` story display the production contract.

The next slice migrates `SystemAccountMenu`, `IdentityModal`, `MatchAlertControl`,
`SearchingModal`, `PendingFriendChallengeScreen` and `OpenMatchRoom`. These six
consumers now use complete roles, token spacing, semantic tones and role-based
corners, with no remaining tracked findings. Callbacks, pending gates, search
phases and lifecycle ownership are unchanged. Stories cover long identities,
long invitation links, cancelling invitations and rooms with no open seats.

The recovery/postgame/replay slice covers idle/status feedback, interrupted and
unavailable matches, result modal/summary/backdrop, replay status, panel, controls
and score chart. Ordinary result actions use shared Button; the unavailable-page
navigation keeps Link semantics with the existing button recipe. The custom
celebration face, confetti ownership, player colours, pending gates, native seek
semantics and future-score filtering are unchanged.

That slice reduced the ledger to 2,283 occurrences across 70 files: 362 fewer
in the slice and 805 fewer than the initial 3,088. Five tracked findings remain in the
touched consumers deliberately: four data-derived player-colour swatches and
the drawer's flat bottom corners. They were not hidden behind new exemptions.
Shared `app/ui` and `app/account` consumers and the account-entry form also have
no tracked findings. This describes the checker's scope, not every CSS property.

The public-profile/homepage-metadata slice now uses complete roles for profile
names, statistics, history, navigation, descriptor/status and release details.
The profile avatar has a central graphic-size recipe; its colour remains account
data. Profile lookup/date/result logic and encoded replay hrefs stay unchanged.
PublicProfileView and SystemTopChrome have no tracked findings. The ledger is
now 2,181 occurrences across 68 files: 102 removed in this slice, 907 removed
since the initial inventory. HomeTitleChrome retains 39 explicit findings in
legacy exported action-style metadata, optional logo artwork and the existing
pending spinner; approved mode-button internals and wordmark fitting are intact.

The shared-feed slice migrates FeedPanel, ChatPanel and GameLogPanel completely
within the checker, plus FeedTokenRow prose and spacing. Transcript body uses
`type-body-small`, player/dev-card names `type-action-small`, and the compact
composer `type-label`. Header, footer, composer and current-entry materials are
owned by globals.css; standalone feeds use the existing lighter HUD material.
The desktop dock and mobile drawer still own placement, dimensions and opening
behavior; neither was migrated in this slice. Composer padding keeps its ~36px
height. Fourteen explicit miniature tile/card-art findings remain in FeedTokenRow.
That slice reduced the ledger to 2,077 occurrences across 65 files.

The game-chrome slice then migrates LeftMetaRail, MobileMetaDrawer, MobileMatchMenu
and metaPanelChrome, plus the three desktop utility overrides in GameScreen.
Feed panels use 22px corners, tooltips 8px, menu rows 14px and utility/tab pills
full rounding. The drawer has 22px top corners and a square bottom edge.
The menu/drawer use pane density; desktop feed and utility controls use HUD density.
Typography is complete action-small/caption roles, with 44px phone tab/menu targets.
Geometry, callbacks, stored preferences and the phase-coupled desktop feed timers
remain owned by their existing components. New Game Chrome stories cover these
production owners, while the integrated sandbox checks the actual play-screen fit.
That slice reduced the ledger to 1,973 occurrences across 61 files: 104 removed,
1,115 removed since the initial inventory, and no added exceptions.

The game-information slice extracts GameSettingsDialog and GameRulesDialog from
GameScreen without moving state, audio persistence or rule calculation. Both reuse
Dialog/Button and 8px inset rows; labels use action-small and values label roles.
Rules use two wrapping columns to contain long identifiers. Their four production
stories cover audio on/muted, standard/custom rows and dismissal/focus behavior.
The current ledger is 1,937 occurrences across 61 files: 36 removed in this slice,
1,151 removed since adoption. No added exceptions or new primitive.

The completion pass covers trade/discard/development-card selection, live-match
loading, compact HUD typography/materials, approved home-action recipes and
developer-tool control chrome. `Compact HUD` and `Trade And Resource Selection` catalog the
production components. Mini-card/tile/SVG artwork and social-image composition
retain their coordinate contracts; they are not unfinished product controls.
Never infer integrated gameplay verification from Storybook alone.

The user-approved white-on-bright-lime button palette still has a contrast
limitation. This work does not claim accessibility conformance or silently alter
that approved palette.
