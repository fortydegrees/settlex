# Clarity UI Redesign Implementation Plan

> **For agentic workers:** Follow the plan checklist. Use superpowers:executing-plans for inline execution. Use superpowers:subagent-driven-development when explicitly requested or when substantial independent tasks justify separate implementers and reviews. Preserve any project-required review and approval gates. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a coherent Clarity first pass across SettleHex's existing UI.

**Architecture:** Semantic tokens and existing production primitives own the
visual system. Surface components consume those recipes; no gameplay, auth or
network logic is rewritten. Existing Storybook and the 2D sandbox supply evidence.

**Tech Stack:** Existing Next 13 / React 18 / Tailwind 3 / Base UI / Storybook 8,
pnpm. No dependency additions.

## Global Constraints

- Work only in `/Users/david/.codex/worktrees/clarity-ui-redesign/settlex`.
- Preserve functionality, routes, callbacks, form names, game rules and board art.
- Preserve replay's manual event-first workflow and rail/drawer architecture.
- The wordmark is provisional. Do not redesign it or propagate its Fredoka style
  into the UI. Outfit remains the UI face.
- No new dependencies, dark theme, production deploy, push or merge.
- Radius scale: 8 / 14 / 22 / 999px; retain special board/joined-edge silhouettes.
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48px; mobile panel padding may be 20px.
- Pane alpha .88, blur 24px; HUD alpha .58, blur 18px; saturate 1.5.
- Shared motion 140ms fast, 220ms entrance, 160ms exit, cubic-bezier(.2,.9,.24,1).
- Existing light blue world, lime/amber/rose semantic palette and player colors.
- Standard touch targets at least 44px, visible focus, reduced-motion and
  solid-fill glass fallbacks, no animated backdrop-filter.
- Pure presentation changes use rendered/manual checks, not new source-grep tests.
- Do not modify main-checkout uncommitted work. Parent records integration overlap.
- Use apply_patch for edits, stage only owned files, commit locally per task.
- No parallel implementation agents. Parent owns browser QA; ask it for a
  screenshot/check rather than starting a separate browser session.

## Task 1: Shared foundations and production primitives

**Files:** `app/globals.css`, `app/ui/{Button,IconButton,Input,Select,Panel,Banner,Dialog,AlertDialog,Popover,Tooltip,MetaDisclosure,SwatchPicker}.js`, `app/ui/{Foundations,Button,Fields,Feedback,Overlays}.stories.jsx`, `.storybook/preview.js` only if font fidelity requires it.

**Interfaces:** Keep all component props/callbacks. Publish shared classes
`settlex-ui-pane`, `settlex-ui-hud`, `settlex-ui-inset`, `settlex-ui-label`,
`settlex-ui-heading`, `settlex-ui-focus`; token names retain `--settlex-ui-` prefix.
Recipes belong in globals.css under @layer components so explicit utilities can
override deliberately, not by accidental CSS load order.

**Verification shape:** Presentation/manual with existing behavioral smoke.

- [ ] Read approved spec, existing primitive implementations and stories. Parent
  has captured foundation and sign-in baseline. No new interaction pattern is
  needed; reuse Base UI ownership and existing recipes.
- [ ] Add semantic tokens/recipes, including this geometry contract:
  ```css
  :root {
    --settlex-ui-radius-small: .5rem;
    --settlex-ui-radius-control: .875rem;
    --settlex-ui-radius-panel: 1.375rem;
    --settlex-ui-radius-pill: 999px;
    --settlex-ui-space-1: .25rem;
    --settlex-ui-space-2: .5rem;
    --settlex-ui-space-3: .75rem;
    --settlex-ui-space-4: 1rem;
    --settlex-ui-space-6: 1.5rem;
    --settlex-ui-space-8: 2rem;
    --settlex-ui-space-12: 3rem;
  }
  ```
  Add text/surface/shadow/focus/motion tokens following the spec. Background and
  edge recipes must work without blur. Do not globally restyle bespoke game code.
- [ ] Replace conflicting arbitrary primitive styling with shared recipes. Button
  content wrapper must align icon+text horizontally and preserve full-width
  consumers. Keep all variants/sizes, disabled and sheen props. Primary text must
  have contrast on lime, danger on rose. Quiet controls should not have CTA depth.
- [ ] Make Dialog and AlertDialog fit short screens with scrollable content and
  safe padding; preserve Base UI focus/dismissal/ending-style lifecycle. Standard
  fields and popovers share corners/focus. Preserve native select semantics.
- [ ] Update foundations story to visibly demonstrate real spacing tokens,
  corner roles, pane versus HUD, type, motion and actual primitive states. Add
  named `ClarityControls` story if combined focus/disabled/error coverage helps.
- [ ] Parent checks desktop/mobile component states on port 6011. Run targeted
  lint on owned JS/JSX; existing tests only where relevant. Include commands and
  outputs in report. Commit owned files and self-review the diff.

## Task 2: Homepage and account entry

**Files:** `app/catana/home/{HomeTitleChrome,SystemTopChrome,SystemAccountMenu}.js`
and their stories; `app/catana/lobby/{AccountEntryModal,IdentityModal}.js` and
stories; optional scoped `app/catana/home/clarityHome.module.css`.

**Interfaces:** Consume Task 1 recipes and tokens. Keep public props and
`buildSystemActions` outputs, optional V2 support, mode selection and pending state,
account/recovery actions. Do not edit `HomeTableClient` or matchmaking models.

**Verification shape:** Presentation/manual. Parent owns live browser checks.

- [ ] Inspect current composition and existing stories, read design spec. Parent
  captures homepage and account-menu baseline before this task's edits.
- [ ] Remove outer glass mode tray while retaining a semantic dock and existing
  responsive mode order. Use 12px grouping and shared button/edge treatment;
  preserve idle/pending/disabled. Three and four modes must fit. Skeleton:
  ```jsx
  <section className="pointer-events-auto absolute inset-x-4 bottom-4 mx-auto grid gap-3 sm:bottom-6">
    {systemActions.map((action) => /* retain current action markup/callbacks */)}
  </section>
  ```
  This is a structural guide, not replacement code: keep actual grid breakpoints,
  safe areas, widths and attributes appropriate to the current component.
- [ ] Refine title/account/utility hierarchy. Keep wordmark identity/font; do not
  create a replacement logo. Use independent UI type language. Avoid forcing
  white small text onto the light-blue background. Keep utility controls 44px.
- [ ] Simplify sign-in composition: one explanation, form mode selector, labeled
  fields, primary submit, provider actions, guest alternative. Do not remove any
  auth mode, provider, recovery/error or pending branch. Reuse Button/Input.
- [ ] Give identity and menu surfaces the same spacing and pane treatment; retain
  emoji/color identity and all callbacks. Remove decorative nested surfaces and
  heavy micro-labels without hiding important state information.
- [ ] Add named no-auto-action `ClarityIdle` homepage story for stable review.
  Existing play functions keep behavioral assertions. Add a long-name/dense menu
  story if absent. Parent checks 1440x900, 390x844, 375x667.
- [ ] Run owned-file lint and `pnpm exec vitest run
  app/catana/__tests__/SystemAccountMenu.test.js --reporter=dot`. Record result,
  request parent visual review, commit only owned files, write task report.

## Task 3: Product surfaces and shared game-shell consistency

**Files:** presentation sections of `app/account/AccountPageView.js`,
`app/u/[username]/PublicProfileView.js`, `app/catana/home/SearchingModal.js`,
`app/catana/lobby/[matchID]/{PendingFriendChallengeScreen,OpenMatchRoom,InterruptedDuelRecovery}.js`,
`app/catana/matchAlerts/{MatchAlertControl,MatchAlertDialog}.js`,
`app/catana/components/{StatusBanner,IdlePromptModal,ResignConfirmDialog,GameOverModal,PostgameOverlay}.js`
where those files exist; `app/catana/components/hudGlass.css`, shared meta-panel
style owner located from `ReplayPanel.jsx`; presentation-only classes in
`app/replays/components/{ReplayPanel,ReplayStatusPage,ReplayStepControls}.jsx`.
Corresponding existing stories may get additional named review states.

**Interfaces:** Consume Task 1 tokens/recipes. Keep existing models, callbacks,
fetches, authorization, polling, transitions, error semantics and replay behavior.
Do not edit `GameScreen`, mobile command/state model or board/effect code.

**Verification shape:** Presentation/manual plus existing replay regression tests.

- [ ] Inspect exact existing owners using `rg --files` before editing. Read spec,
  UI catalog and relevant stories. Write a surface coverage list in the report,
  including inherited-only surfaces so no coverage is invented.
- [ ] Migrate page-local glass/radius/type drift to shared recipes. Prefer simple
  inset grouping/dividers over nested independently blurred panels. Use real
  existing state/copy; never simplify away pending/error/recovery branches.
  Typical composition:
  ```jsx
  <div className="settlex-ui-pane p-5 sm:p-6">
    <h2 className="settlex-ui-heading">{existingTitle}</h2>
    <div className="mt-4 space-y-3">{existingContent}</div>
  </div>
  ```
- [ ] Normalize status/action hierarchy for matchmaking, profiles, room seats and
  postgame. Keep long names/links wrapping safely and controls usable on phones.
- [ ] Update `.catana-hud-glass` material through shared HUD tokens. Preserve
  warning/danger state meaning, joined shapes, player colors and bespoke action
  styles. Do not spread dense pane fill across the board.
- [ ] Inspect replay/meta-shell style owner and align outer pane/type/corners
  only. Do not alter chart, selected event, perspective, keyboard seek or drawer
  behavior. Keep paused/manual event-first navigation.
- [ ] Parent verifies named Storybook states at desktop/mobile and 2D sandbox
  HUD if available. Request specific checks; do not create own browser session.
- [ ] Run owned-file lint and existing `app/__tests__/replayPanel.test.js`,
  `replaySessionState.test.js`, `replayNavigation.test.js`, `replayScoreChart.test.js`.
  Commit owned files and write report with coverage and remaining integration risks.

## Task 4: Integrated visual verification and handoff

**Files:** `docs/agent/{PROGRESS,NOTES,UI_CATALOG}.md`,
`docs/agent/CLARITY_UI_REVIEW.md`, existing affected stories if review coverage
requires a named state. Parent coordinates fixes through owning implementers.

**Interfaces:** Deliver branch, usable local preview, real coverage matrix and
explicit main-checkout overlaps. No deployment or integration.

- [ ] Review primitives; homepage idle/pending/three+four modes; account guest,
  claimed, error/pending; matchmaking rescue; friend/open room; recovery;
  postgame winner/loser; replay desktop/mobile/perspective. Check 1440x900,
  390x844, and touched short/tall phone states.
- [ ] Exercise keyboard focus/escape/restoration, fields, disabled controls and
  relevant Storybook play assertions. Emulate reduced motion through browser
  tools. Inspect no-overflow, errors and console. Static/2D preview only.
- [ ] Capture screenshots of the implemented surfaces. Keep preview for user
  review, close test-only tabs and reset viewport override. No live 3D preview.
- [ ] Run touched-file lint and focused behavioral suites; document commands and
  results. Do not claim an unrun full suite, production build or live integration.
- [ ] Record shared rules, visual evidence, any unverified states, wordmark
  boundary and main-checkout overlapping files. Update progress/catalog notes.
- [ ] Obtain whole-branch review, resolve important findings through implementer,
  commit final docs, leave isolated branch for user visual feedback.
