# SettleHex UI Catalog And Claude Design Integration

Date: 2026-07-29
Status: Draft for review

## Purpose

Make SettleHex's standard product UI easier to inspect, review, extend, and
reuse consistently.

The current repository already has:

- a shared component layer in `app/ui/`;
- brand and interaction guidance;
- a standard-UI showcase at `/catana/dev/ui`;
- focused dev surfaces for gameplay and effects;
- an earlier Storybook atlas implementation on
  `codex/storybook-ui-atlas`.

The remaining problem is that those ingredients do not yet form one dependable
workflow. Important components and rare production states can be hard to reach,
some useful UI is trapped inside large route components, exact copy is not
centrally inspectable, and motion can still be reinvented at individual call
sites. This leaves human reviewers and coding agents interpreting the design
system afresh when they add a feature.

This design defines a production-faithful Storybook catalog for standard UI,
selective component-boundary cleanup, shared motion review, and a curated
Claude Design import.

## Goals

- Inventory the current standard product UI before adding more stories.
- Make individual components, real compositions, exact copy, and meaningful
  alternate states easy to inspect.
- Restrict stories to production-valid state combinations.
- Show how shared primitives build into real SettleHex product surfaces.
- Make standard UI motion and reduced-motion behavior inspectable.
- Improve component boundaries where route-local presentation prevents
  isolated review or reuse.
- Give Codex, Claude, and other coding agents an executable visual reference
  alongside the written design guidance.
- Sync the curated system into Claude Design only after the local source is
  current and trustworthy.

## Non-Goals

- Do not reproduce the full game inside Storybook.
- Do not catalog the board, tiles, pieces, resource bar, dice, card-transfer
  effects, or other mechanics-bound gameplay presentation.
- Do not rewrite gameplay rules, provider behavior, match lifecycle, or
  server-authoritative state.
- Do not move the UI into a separate package or convert it to TypeScript in
  this slice.
- Do not create stories for every prop permutation or every styling-only edit.
- Do not duplicate production copy, CSS, state logic, or component markup in
  Storybook.
- Do not import an external visual system or an off-the-shelf `DESIGN.md`
  aesthetic.
- Do not push, deploy, or update production as part of the catalog work.

## Scope Boundary

“Comprehensive” means comprehensive coverage of SettleHex's standard product
UI, not comprehensive coverage of all rendered game elements.

### Included

- `app/ui/*` shared primitives;
- account and identity controls;
- account menus and top product chrome;
- homepage and lobby entry controls;
- matchmaking and friend-invite UI;
- match-alert controls and dialogs;
- status, error, reconnect, and recovery UI;
- standard dialogs, popovers, banners, tooltips, fields, and selectors;
- postgame and results UI;
- replay controls, replay panel chrome, and replay status UI;
- other normal product controls that are not tightly bound to a game mechanic.

### Excluded

- board rendering and board themes;
- resource, development-card, and piece presentation;
- turn-critical bespoke controls whose form is part of gameplay;
- effect-bus runners, game-event animation, audio, and haptics;
- the full `GameScreen` and provider-heavy whole routes.

Existing integrated dev surfaces remain the correct place for excluded
gameplay presentation.

## Catalog Architecture

The catalog has four levels.

### 1. Foundations

Render the production foundations rather than rewriting them as prose:

- color families and semantic usage;
- typography hierarchy;
- spacing and density;
- radii, borders, glass layers, and shadows;
- z-index/layering conventions;
- motion durations, easings, and reduced-motion behavior.

### 2. Shared Components

Cover every relevant canonical component from `app/ui/*`.

Stories show:

- semantic variants;
- meaningful sizes;
- disabled, loading, and error behavior where the component supports it;
- interaction behavior;
- responsive constraints where applicable.

Story metadata should identify the real component so Storybook controls and
documentation describe the production API. Plain-JavaScript components may
use focused `argTypes` or JSDoc where useful; a type-system migration is not
required.

### 3. Product Patterns

Cover reusable, product-aware components such as:

- `SystemAccountMenu`;
- `MatchAlertControl`;
- identity selection;
- invite/share controls;
- reconnect and status banners;
- replay navigation;
- results and recovery dialogs.

These stories use real production state models and production copy.

### 4. Composed Surfaces

Show representative assembled sections without mounting an entire live route:

- homepage account chrome;
- matchmaking entry;
- friend-challenge states;
- replay panel;
- postgame/results and recovery surfaces.

Compositions import real components and production CSS. They do not copy the
route's render implementation or emulate live network/provider behavior.

## Story Navigation

Use a clear, stable hierarchy:

1. `Foundations`
2. `Components`
3. `Product Patterns`
4. `Composed Surfaces`

Within product patterns and compositions, group by user domain:

- Account & Identity
- Lobby & Matchmaking
- Alerts & Recovery
- Postgame & Replay
- Shared Feedback

This makes it possible to browse both from primitive to composition and by the
user task being reviewed.

## UI Inventory

Before implementing or porting stories, audit the current main checkout.

For each included surface, record:

- public name;
- owning production file/component;
- where it appears;
- catalog level;
- valid user-visible states;
- source of visible copy;
- interaction and motion requirements;
- desktop/mobile relevance;
- present Storybook coverage;
- required fixture or provider boundary;
- whether extraction or cleanup is needed.

The inventory is a finite implementation input and coverage checklist. It must
not become a second hand-maintained description of component props. The
finished Storybook index and stories remain the living component/state
catalog.

## Production-State Policy

The primary catalog contains only combinations that can occur in production.

Use named stories for meaningful product states. For example:

- Guest · Alerts off
- Guest · Alerts paused · Resume available
- Guest · Alerts paused · Human game active
- Saved account · Alerts active
- Saved account · Notifications blocked
- Action pending
- Resume failed

Use Storybook controls only for safe local variation such as:

- name;
- emoji;
- color;
- viewport;
- harmless content length;
- loading/error values already supported by the named state.

Do not expose free-form controls that imply impossible state combinations.
Deliberate visual stress tests may exist in a clearly labeled development-only
group when they solve a specific problem, but they are not part of the
production-state catalog.

## Copy Fidelity

Storybook must render exact production copy.

- Pure state helpers continue to own labels, details, and allowed actions.
- Stories call those helpers or consume production-shaped outputs.
- Do not paste production strings into story files as parallel fixtures.
- When a visible string has no clear owner, move it to the smallest production
  view model or component that legitimately owns it.
- Copy-only branches count as meaningful states when a user could reasonably
  need to review or distinguish them.

The match-alert system is the first acceptance example:
`getMatchAlertDisplayState` remains the source for status, label, detail,
action, and action label. The account-menu stories render those outputs through
the real `MatchAlertControl`.

## Component-Boundary Cleanup

Storybook should reveal and improve real component boundaries rather than add
permanent workarounds.

Extract a presentational component from a route/client when it:

- has meaningful visible states;
- owns important product copy or interaction;
- is hard to inspect independently;
- can accept a clear, production-shaped input;
- materially simplifies its parent;
- is plausibly reusable or independently reviewable.

Do not split every small render fragment into a new file solely for Storybook.

The initial expected extraction is:

```text
HomeTableClient
  ├── coordinates homepage state and actions
  └── SystemTopChrome
        └── SystemAccountMenu
              └── MatchAlertControl
```

The route/client retains orchestration and provider actions. The extracted
components receive identity, account state, match-alert display state, pending
state, error state, and callbacks through explicit props.

Other extractions must meet the same criteria and stay within the included
standard-UI scope.

## Motion System

Standard UI motion is part of the design system.

The catalog should make these behaviors inspectable:

- dialog entry and exit;
- popover and account-menu entry and exit;
- banner/status appearance;
- loading-to-success and loading-to-error transitions;
- hover, press, focus, and disabled feedback;
- mobile drawer/sheet motion;
- reduced-motion fallbacks.

Production components own their transitions. Call sites should not routinely
invent new durations, easings, and keyframes.

Start from the existing tokens in `app/globals.css`:

- `--settlex-ui-duration-fast`;
- `--settlex-ui-duration-dialog`;
- `--settlex-ui-ease-standard`;
- `--settlex-ui-ease-bounce`.

Extend or rename tokens only when the inventory demonstrates a repeated
standard-UI need. Avoid creating a large speculative token taxonomy.

Interactive stories should allow a reviewer to trigger the real motion.
Focused play functions may demonstrate repeatable open/close or state-change
flows. Reduced-motion behavior must remain operable and understandable.

Gameplay-event animation stays outside this system and continues to use the
effect bus and gameplay dev surfaces.

## Fixtures And Data Flow

Stories must be deterministic and network-free.

```text
production state/helper
        ↓
production-shaped view model
        ↓
real presentational component
        ↑
Storybook named fixture + action spies
```

- Reuse production selectors and pure display-state helpers.
- Keep shared, data-only fixtures under a development-only Storybook folder.
- Keep callbacks as Storybook actions/spies.
- Do not call auth, matchmaking, replay, push, or boardgame.io APIs.
- Do not mock an entire provider graph when a production-shaped input is
  sufficient.
- Use decorators only for true environmental context such as routing, global
  CSS, fonts, surface background, or a small required context.

Provider and network integration remain covered by focused application tests
and the real route.

## Existing Storybook Work

Use the earlier `codex/storybook-ui-atlas` work as a proven foundation and
source of useful fixtures, not as a branch to sync blindly.

The old atlas is based on an earlier checkout and includes stories for
components that have since changed or disappeared. Implementation should:

1. inspect the current main checkout;
2. port the minimal verified Storybook configuration;
3. re-create coverage against current production components;
4. discard obsolete stories and fixtures;
5. retain the low-maintenance rule of using real leaf/composed components and
   deterministic data.

Keep the previously verified Storybook 8.6/Next 13 boundary unless the current
dependency graph proves it unusable. A Storybook or Next.js upgrade is outside
this scope.

## Verification

Verification should be proportional and should test runtime contracts rather
than implementation text.

Required checks:

- the focused UI-inventory/coverage review is complete;
- the static Storybook build succeeds;
- all indexed stories render without visible Storybook runtime errors;
- representative desktop and mobile viewports are inspected;
- exact account-menu and match-alert states render their production copy;
- interactive primitives can be operated with mouse and keyboard;
- motion is inspected for normal and reduced-motion behavior;
- `git diff --check` passes.

Add rendered component tests when extraction or state wiring changes:

- visible semantics;
- valid state-to-copy mapping;
- allowed actions;
- pending and error behavior;
- accessible labels and keyboard behavior.

Use Storybook play/interaction tests when they provide durable value for:

- menu/dialog opening;
- action transitions;
- focus/dismissal behavior;
- state changes visible inside one story.

Do not add source-grep tests for CSS classes, copied strings, or implementation
placement. Do not add broad automated tests for timing-value-only tuning.

## Agent Workflow

The finished system should reduce design ambiguity for Codex, Claude, and
other coding agents.

For standard UI work, agents should:

1. read the Catana design guidance;
2. consult the UI catalog for the owning component or pattern;
3. inspect the relevant component and composed stories;
4. reuse or extend the shared component rather than adding page-local styling;
5. add a named story when introducing a meaningful production state or copy
   branch;
6. verify the real component, motion, and responsive behavior in Storybook;
7. use an integrated dev route only when provider/route behavior requires it.

Encode this concise routing rule in the repository `AGENTS.md`, the
`catana-design` skill, and contributor guidance after the catalog exists.
Avoid duplicating the whole specification in each instruction surface.

Storybook is executable design evidence, not an automatic taste guarantee.
Agents still need the brand guidance and visual judgment, but they no longer
need to invent the existing component vocabulary or valid states.

## Claude Design Integration

Claude Design is a visual exploration and handoff layer around the production
system, not its source of truth.

After the refreshed Storybook catalog passes verification:

1. run the Claude CLI from the current, catalog-enabled checkout;
2. reuse the existing pinned `SettleHex Design System` project;
3. run `/design-sync` through the Storybook path;
4. approve the required upload boundary when prompted;
5. inspect the generated component/system import;
6. correct missing, stale, generic, or misleading entries at the local source;
7. resync as needed.

Do not use the weak whole-app synth-entry fallback.

The first Claude Design acceptance exercise is:

- produce an alternative account/profile surface using only the imported
  SettleHex system;
- produce a replay-control composition using the imported system;
- preserve the bright, rounded, game-native SettleHex family;
- avoid inventing unrelated components or generic SaaS styling.

If the outputs are weak, improve the source stories, component APIs, state
examples, or captured context rather than compensating with an increasingly
large prompt.

## Definition Of Done

This slice is complete when:

- the standard product UI inventory has been reviewed;
- the implementation checkout contains the refreshed Storybook foundation
  based on current `main`;
- all in-scope shared components have baseline coverage;
- important product patterns and compositions expose their production-valid
  states and exact copy;
- the account-menu/match-alert example is independently inspectable;
- standard UI motion and reduced-motion behavior can be reviewed;
- necessary selective component extractions are complete and tested;
- agent guidance points future UI work at the catalog;
- the Storybook build and browser verification pass;
- Claude Design has imported the curated system successfully;
- the two acceptance exercises demonstrate recognizably SettleHex output.
