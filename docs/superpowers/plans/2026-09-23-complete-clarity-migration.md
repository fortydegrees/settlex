# Complete Clarity Migration Implementation Plan

> **For agentic workers:** Follow the plan checklist. Use superpowers:executing-plans for inline execution. Use superpowers:subagent-driven-development when explicitly requested or when substantial independent tasks justify separate implementers and reviews. Preserve any project-required review and approval gates. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish migrating ordinary SettleHex UI to shared enforced foundations, including gameplay and developer UI; explicitly classify the remaining intentional artwork/data/geometry contracts.

**Architecture:** Production components consume complete typography roles, semantic palette/materials and token spacing/shape. Bespoke game geometry, player colour data and fixed-format artwork retain their own contracts. Existing UI policy continues rejecting new drift; a passing check is not a claim of complete accessibility or gameplay validation.

**Tech Stack:** React/Next, Tailwind, Base UI wrappers, Storybook, Vitest, current UI policy.

## Global Constraints

- Work only in `/Users/david/.codex/worktrees/clarity-ui-redesign/settlex`, branch `codex/clarity-ui-redesign`; preserve all pre-existing dirty work.
- No dependency/build-tool additions, commits, pushes, merge, deployment or remote settings changes. Review against source snapshots rather than committing the user's accumulated work.
- No authoritative rules/state/callback/timer changes. Preserve board dimensions, piece/resource geometry, hidden information, command eligibility, hold semantics, animation timing and player identity.
- Keep approved homepage buttons and wordmark visually unchanged. UI uses Outfit; custom display type is opt-in only.
- Standard corners: inset 8px, control 14px, panel 22px, utility 999px. HUD can retain deliberately joined/art geometry, but must explain it.
- Use complete typography roles and semantic ink/materials. Do not blindly enlarge compact HUD type or replace bespoke gameplay controls with generic buttons.
- No new styling debt or broad directory exemptions. Remaining ledger entries must be individually attributable to artwork, domain data or deliberate geometric contracts, not unfinished ordinary UI.
- Pure styling uses browser/manual verification. If callback/state/focus behavior changes, use behavioral tests first. No new source-grep tests.
- Parent owns browser session, final docs, policy ledger pruning and final integration. One implementation worker at a time; read-only reviews/audits can overlap independent parent work. Workers must not change others' edits.
- Baseline: `/tmp/settlehex-design-completion.9oDpA8/` contains pre-turn app, design-system and Tailwind sources. Initial remaining ledger: 1,937 occurrences / 61 files.

### Verification-discovered repair

Integrated QA found a preexisting Trade-dock callback mismatch: launch geometry
was treated as a resource preset. A narrow, regression-tested adapter discards
that payload for the generic Trade action while retaining string presets for
quick-trade. This is the only intentional command-adapter repair in this pass;
engine rules, eligibility and confirmation payloads remain unchanged.

## Completion criteria

- Every ordinary production/developer UI surface in the remaining ledger is migrated; every retained finding has a concrete non-UI-style reason in an inventory document.
- Storybook reflects the real production components and current token recipes, with meaningful interaction/state branches.
- Integrated desktop/phone game screens preserve layout and behavior across the state matrix below; reduced effects remain supported.
- Focused tests, full `pnpm verify`, lint/policy, production build and Storybook build run with explicit results/limits; independent final review has no unresolved important regression.
- Work remains local and uncommitted; previews retained, temporary tabs closed.

### Task 1: Trade, discard, development-card selection and loading surfaces

**Ownership:** `app/catana/components/TradeDiscardModal.js`, its new `TradeDiscardModal.stories.jsx`, `app/catana/lobby/[matchID]/LiveMatchLoadingShell.js`, and its story. Shared recipe additions only in a new scoped CSS module beside TradeDiscardModal if existing recipes cannot express the current layout; request any token additions from parent.

**Interface:** All existing component props and confirmation payload shapes remain unchanged. Preserve existing cancellation capability in each mode. No new shared primitive.

**Verification:** Rendered baseline plus component stories using real engine fixtures for trade rates and bank availability. Parent handles browser QA; implementer supplies fixture controls and exact commands.

- [x] Read design guidance, TESTING.md and current modal before editing. Baseline includes all four modes: trade, discard, dev-yop, dev-monopoly.
- [x] Use existing pane/inset/Button material and `type-title`, `type-section`, `type-label`, `type-body-small`, `type-action-small`; translate raw spacing to equal-valued ui tokens. Preserve resource icons and rate logic. Example: `<h2 className="type-title text-ink-primary">{title}</h2>`.
- [x] Make the existing modal fit short phones with bounded height/scroll and accessible named increment/decrement controls. Retain existing dismissal policy; using shared Dialog must not introduce cancellation in forced discard or other previously non-dismissible paths.
- [x] Stories exercise real selection -> confirmation payload for four modes, invalid/empty selection, finite-bank shortage, cancelable vs forced states. Test new accessibility/event wiring before changing it if needed.
- [x] Migrate loading-shell text/material to the existing shared recipes, retaining its board underlay and sync copy.
- [x] Run relevant existing modal/rule tests and targeted ESLint; report exact output and changed files. Parent checks desktop 1440x900 and phones 375x667/390x844.
- [x] Self-review and write task report, leave uncommitted. Independent task review required before completion.

### Task 2: Compact gameplay HUD foundations

**Ownership:** `MobilePlayerCockpit.js`, `MobilePrimaryTurnButton.js`, `MobileDevCardButton.js`, `MobileDevCardTray.js`, `PlayerAvatarStats.js`, `PlayerActionContainer.js`, `TurnControlCluster.js`, `OpponentPlayerBox.js`, `CardStackStyles.js`, `hudGlass.css`, `DevCardDisplay.js/.css`, `AnimatedCount.css`, `StatusBubble.css`, `ActionsDock/dockStyles.css`, and HUD stories under `app/catana/components/`; remaining GameScreen layout spacing; compact role definitions in `app/ui/theme.cjs` and corresponding recipes in `app/globals.css` if needed. A scoped accessible-name addition in `ActionsDock/DockCard.js` and native button conversion for desktop quick-trade are permitted with behavioral tests, without altering command payloads or hold wiring.

**Interface:** State/model and props unchanged; no gameplay or effect changes. Read mobile UX and dev-surface skills and all ownership components they identify first.

**Verification:** Presentation baseline and exact existing model/command/hold tests. Parent owns full real-browser state matrix.

- [x] Inventory current compact text metrics and joined geometry before edits. Propose the smallest role family that preserves these metrics; do not map 10px counters to 14px prose.
- [x] Centralize complete compact roles (family/size/weight/line/tracking together), shared HUD material and semantic states. Example consumer: `type-hud-label text-ink-secondary`; roles must exist in theme before use.
- [x] Replace raw spacing only where geometry is equivalent. Preserve fan/card offsets, source/destination anchors, control hit areas, safe-area offsets, phase timers, resource visibility and command callbacks.
- [x] Add production-composed HUD stories for dense resources, empty/playable/unplayable cards, disabled controls and long player names. Do not duplicate the authoritative model.
- [x] Run focused gameplay model/hold tests and changed-file lint; self-review and write report. Independent task review required.

**Required gameplay matrix:**

| State | Expected behavior to preserve |
| --- | --- |
| Pre-roll | Roll available only to active local player; no End Turn |
| Post-roll | End Turn follows authoritative eligibility; hold confirmation on phone |
| Waiting | No local roll/end command; opponent resources remain hidden |
| Forced discard | Exact-count selection required; no bypass/cancel |
| Robber placement | Placement prompt and board selection remain active |
| Road/settlement/city placement | Correct placement preview/cancel and board interactions |
| Game over | Results/read-only state, no live commands |
| Spectator/replay | Read-only hidden information and no resign/live commands |
| Card timing/shortage | Existing disabled reasons and resource/card counts preserved |
| Log/Chat open | Drawer focus/close, board pan/zoom and primary-control clearance preserved |
| Disconnect/reconnect | Existing recovery overlay/eligibility preserved |

### Task 3: Developer tools and component-library coherence

**Ownership:** `app/catana/dev/ui/UiShowcaseClient.js`, sandbox `SandboxPanel.js`, sidebar-connection `SidebarConnectionClient.js`, underlay-waves `UnderlayWavesClient.js`, palette-preview `PaletteBoardPreviewClient.js`, viewports `ViewportWallClient.js`, effects `EffectsLabClient.js`, `PiecePlacementLab.jsx`, `DevCardRevealLab.jsx`, `ResourceDistributionLab.jsx`; `app/board-editor/page.js` standard chrome only. Worker may add coherent dark-console semantic aliases/recipes in theme.cjs/globals.css after Task2 releases them. Parent has completed `app/ui/*.stories.jsx` and `.storybook/preview.js` example styling/metric display; worker must not edit those files.

**Interface:** Dev controls retain handlers, ranges, scenario generation and effect routing. No simulation/art controls normalized into product defaults.

**Verification:** Presentation-only; read existing samples before mapping. Parent visits routes and samples their actual controls.

- [x] Replace typography fragments with complete roles: metadata -> caption/code-caption, fields -> label, prose -> body-small, section -> section/title. Replace raw spacing with same-valued tokens, surfaces with pane/inset, plain action chrome with existing Button recipes.
- [x] Keep dark lab stages dark and controls readable. Use a small semantic inverse-ink/console-surface family for the dark control console; do not replace white-on-dark labels with dark-on-dark text or create a renamed copy of every raw palette shade. Preserve ranges, callbacks, seed/tuning values and refs.
- [x] Keep fixed-format diagrams and board drawings separate. Example: `className="settlex-ui-pane space-y-ui-4 p-ui-5"`; do not change diagram coordinates or SVG path data.
- [x] Parent updated shared component/Foundation stories and preview to current tokens. Typography metric labels show CSS size/line values without incorrectly parsing absolute line heights. Existing story interaction branches retained.
- [x] Run targeted lint; report any intentional remaining literals by exact file/key and reason. Parent audits inventory and exercises primary dev surfaces. Self-review/report and independent task review required.

### Task 4: Final consumer audit and explicit exception inventory

**Ownership:** remaining small ordinary-UI findings in `HomeTitleChrome.js`, `HomeModeButton.module.css`, `HomeTableClient.js`, results/replay components; `scripts/design-system/` policy/ledger; `docs/agent/DESIGN_SYSTEM.md`, `UI_CATALOG.md`, `CLARITY_UI_REVIEW.md`, `PROGRESS.md`, `NOTES.md`, new `UI_STYLE_EXCEPTIONS.md`.

**Interface:** Approved home visuals stay exact. Explicit data-driven player colours and board/share-image artwork stay unchanged; don't hide them behind directory-level exemptions.

- [x] Audit every residual ledger entry with its source. Migrate remaining ordinary consumers, remove unused style metadata only after confirming no imports/users.
- [x] Replace component-owned type fragments with existing complete roles or justified semantic role additions. Preserve approved colours/metrics via canonical aliases when necessary rather than repainting them.
- [x] Prune only resolved legacy counts. Document every retained key category/file with the owned artwork/data/geometry contract and reason general product tokens do not apply.
- [x] Strengthen policy only where tests show a concrete enforcement gap; use fixture-level red/green tests, not source-grep. Do not add dependencies, new broad exemptions, or accept new debt.
- [x] Update all ownership/catalog documents and Storybook foundation examples to match the final contract and honestly state limits.

### Task 5: Whole-system verification and handoff

- [x] Review real home/account/lobby/replay plus updated game surfaces at desktop/phone, including focus, disabled, long text and reduced motion/transparency. Finish the HUD state matrix using real sandbox/production fixtures, naming limits explicitly.
- [x] Run `pnpm verify`, production build with the project's approved build-time placeholders if required, and `pnpm build-storybook`; capture outputs without committing build artifacts. Diagnose failures without erasing prior work.
- [x] Independent broad review of accumulated migration and policy, followed by one bundled fix wave and scoped re-review if needed.
- [x] Confirm no unexplained styling debt, no important open review issues, and no accidental state/rule changes. Update progress, close owned QA tabs/reset overrides and retain useful previews.
- [x] Report finished local implementation separately from production deployment and branch-protection enforcement, which are not authorized in this task.
