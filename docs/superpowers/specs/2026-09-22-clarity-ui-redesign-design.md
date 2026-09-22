# SettleHex Clarity UI redesign

Date: 2026-09-22
Status: First-pass implementation approved in the design-history conversation.
Baseline: `28b42ec`, isolated branch `codex/clarity-ui-redesign`.

## Intent and approval

Develop the bright, modern glass direction explored as 2a Clarity into a coherent
working interface system and apply it to the homepage and the existing product
surfaces. David liked Tabletop's consistency and satisfying button, not its paper
or skeuomorphic material. He liked the subsequent Clarity homepage and wanted to
see the system carry across the product. He approved an autonomous complete first
pass for visual review, with no deployment.

The latest clarification is binding: the existing wordmark was only good enough,
not settled. Do not redesign the wordmark in this pass; do not make the UI mimic
its bubbly Fredoka shapes. Keep it independently replaceable. Outfit remains the
UI typeface; Fredoka stays confined to the existing wordmark.

## Scope

- Shared foundations and existing production primitives.
- Homepage title, mode actions, account menu, sign-in, identity, settings controls.
- Account and public-profile pages, matchmaking, friend challenge and open room.
- Alerts/recovery presentation, game-over and postgame summary surfaces.
- Shared HUD glass and meta-panel shell treatment, including replay's exterior.
- Desktop and mobile, keyboard focus, disabled/error/loading, reduced motion.

Preserve routes, functionality, server authority, auth and matchmaking callbacks,
form semantics, gameplay mechanics, player-color identity, board assets, animation
and sound events. Preserve the replay's manual event-first workflow, chart and
responsive rail/drawer architecture. No autoplay, playback speed, new feature,
new library, marketing sections, fake metrics, or wordmark redesign.

The main checkout has uncommitted functionality and presentation changes. They
are deliberately not copied or overwritten. Record integration overlaps in the
handoff instead of merging over them.

## Design system

This is a game client, not a marketing landing page. The existing board remains
the central product signal. The mode dock stays at the bottom, account controls
top-right, supporting metadata quiet. Existing blue/lime/amber/rose and player
colors remain; no dark theme is added. Generic landing-page skill defaults for
photography, new icon libraries, dark mode and hero sections do not apply here.

### Geometry and rhythm

- Radius small: 8px, for inset rows, small groups and tooltips.
- Radius control: 14px, for buttons, fields, compact popovers and banners.
- Radius panel: 22px, for dialogs and standalone panels.
- Pill: 999px, only for circular icon controls, avatar/status shapes and existing
  compact identity triggers. Not every interactive element becomes a pill.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48px.
- Panel content padding: 24px desktop, 20px on narrow screens where useful.
- Compact content padding: 12-16px; related controls 8px apart; groups 16-24px.
- Standard actionable target: at least 44px on touch, including icon buttons.
- Keep intentional board-specific silhouettes and zero-radius joined edges.

Use semantic CSS variables and recipes in the owning styles. Do not append a
global override stylesheet fighting page-specific utility classes. Remove
conflicting arbitrary styles when moving a component to a shared recipe.

### Materials

- `pane`: dense bright off-board glass, white alpha .88, blur 24px, saturate 1.5,
  strong white top rim, restrained blue-tinted contact shadow.
- `hud`: lighter over-board glass, white alpha .58, blur 18px, same edge language.
- `inset`: quiet blue-tinted fill or divider, no second independent glass shadow.
- Readability must survive unsupported blur and reduced transparency. Supply a
  solid-fill fallback. Do not stack numerous blurs or animate backdrop-filter.
- Warnings retain semantic rose treatment, not the ordinary white pane.

### Type and controls

- Outfit for UI; sentence case, restrained weight 500/600/700.
- Display/section title: 24-28px / 18px. Body: 14-15px with useful line height.
- Supporting labels: 12-13px, not 10px 900-weight tracked uppercase.
- Three readable text tiers, each appropriate for its surface. Small labels
  should not get louder merely because they are small.
- Primary stays recognizably lime. Use dark green ink on bright lime when needed
  to meet text contrast rather than retaining low-contrast white small text.
- Amber accent and neutral white actions share button geometry and press depth.
- A crisp 2px base compresses on press; modest hover lift; no utility bounce.
- Focus uses a visible contrasting blue outline with offset, not white-on-white.
- Disabled controls lose elevation and sheen, remain identifiable.
- Shared UI motion: fast 140ms, dialog entrance 220ms, exit 160ms, standard curve
  cubic-bezier(.2,.9,.24,1). Reduced motion removes travel and decorative animation.

## Composition

Homepage: remove the outer translucent dock tray, preserve spatial grouping with
12px gaps and the existing mode order. Retain optional V2 mode support. Normalize
button internals without nested glossy chips. Keep pending modes and identity
states. Existing wordmark content/font stays; its layout and contrast can be
tuned without treating its geometry as a system foundation.

Account: one title and explanation, not duplicated inside the dialog. Form
labels/inputs, providers, primary submit and guest alternative have distinct
hierarchy. Use existing callbacks and accessible semantics. Menus use clearly
grouped rows, calm metadata and consistent targets; no buried recovery action.

Other product surfaces: remove page-local material/radius drift, unnecessary
card-in-card shadows and uppercase micro-labels. Keep real status/copy branches,
error messages, long names, friend links, scoreboard and empty states readable.

Gameplay: improve shared shell material and corner consistency, not the gameplay
layout or control model. Preserve tactile action dock, player colors, card and
resource silhouettes, dice, and board occlusion boundaries. Replay gets shell
and type consistency only, not an analysis-tool redesign.

## Implementation architecture

`app/globals.css` owns semantic tokens and common presentation recipes. Existing
`app/ui/*` primitives consume those recipes without changing their public APIs or
Base UI behavior. Surface owners remove conflicting local utilities. Existing
Storybook stories remain the executable inventory; add a few named review states
where needed. Real game/HUD integration is checked in the 2D sandbox.

No data flow changes are needed. Forms, busy/error handling and auth/network
boundaries remain in their current owners. If a behavior regression needs a fix,
add a focused behavioral test, not a source-grep styling assertion.

## Verification and handoff

Baseline: current foundations and sign-in reviewed in Storybook at 1440x900;
sign-in contains a duplicated explanation, nested faint surfaces, differing
corner sizes and oversized provider rows. Focused account/replay baseline is
12 tests passing. Installed existing frozen lockfile offline, no dependency edits.

Check shared buttons/fields/overlays; homepage idle/busy/optional V2/account menu;
sign-in modes/error/pending; profile states; matchmaking/rescue; friend invite;
open room; recovery; postgame; replay rail/drawer. Use 1440x900 and 390x844; add
375x667 and 430x932 for touched phone/game surfaces. Verify keyboard, overflow,
focus restoration and reduced motion. Review console errors. Use existing
behavioral tests and lint; do not add tests for class strings or CSS values.

Review all relevant component diffs separately and the whole branch once. Leave
a working review preview with an honest coverage matrix and integration notes.
Do not merge, push or deploy without separate authorization.
