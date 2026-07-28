# Test Suite Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove implementation-string UI tests that create false confidence and refactoring friction while retaining engine, server, lifecycle, state-model, security, configuration, and observable component coverage.

**Architecture:** Classify tests by what they prove, not by whether they touch UI. Delete cosmetic/source-spelling checks, retain configuration-source tests where file contents are the executable contract, and preserve or isolate behavioural assertions from mixed files. Add a short repository testing policy so future agents do not recreate source-grep coverage.

**Tech Stack:** pnpm, Vitest, boardgame.io reducers, React server rendering, Next.js build/lint, Storybook and browser dev surfaces for visual verification.

**Status (2026-07-28):** Implemented as a high-confidence first pass. Sixty-eight
test files were deleted, one focused state-machine suite was added, and four
mixed files were trimmed. `GameScreen.interactionGuards.test.js` and
`uiNoDragImages.test.js` were retained after inspection because they protect
observable interaction/rendering behavior. The remaining source-oriented
contracts require behavior-first replacements rather than speculative deletion.

## Global Constraints

- Do not change product behaviour in this pass.
- Do not add dependencies or change build tooling.
- Keep all engine, reducer, server, authentication, archive/replay reconstruction, matchmaking, and deployment-security tests.
- Source inspection is allowed only when the source artifact is itself the runtime contract, such as Caddy, Docker, shell scripts, patches, manifests, or Next route export constraints.
- UI copy, Tailwind classes, CSS declarations, import paths, local variable names, hook placement, and component composition are not test contracts.
- Preserve mixed files' behavioural assertions before removing their source assertions.
- Use pnpm and keep `package-lock.json` absent.

---

### Task 1: Record the suite baseline and policy

**Files:**
- Create: `docs/agent/TESTING.md`
- Modify: `AGENTS.md`
- Modify: `docs/agent/NOTES.md`

**Interfaces:**
- Consumes: the existing `pnpm verify`, `pnpm test:app`, dev-surface, and Storybook workflows.
- Produces: one durable rule set future agents must follow when choosing test type.

- [ ] **Step 1: Record the measured baseline**

Add the current inventory to `docs/agent/TESTING.md`:

```markdown
## 2026-07-28 baseline

- 351 repository test files.
- 257 app test files.
- 121 app test files read production source text.
- 110 source-reading files are under `app/catana`.
- 51 files are explicitly named `*.source.test.js`.
```

- [ ] **Step 2: Add the test selection rules**

Add this decision order to `docs/agent/TESTING.md`:

```markdown
1. Engine/rules/state transitions: deterministic engine or real reducer test.
2. Server/auth/lifecycle: call the real handler/manager with controlled adapters.
3. UI state: test a pure model/helper.
4. Component semantics or interaction: render or exercise the component.
5. Visual layout, CSS, animation timing, and copy: Storybook/dev surface/manual browser verification.
6. Source/config inspection: only when the inspected artifact is itself the runtime contract.
```

Explicitly forbid tests whose only evidence is an exact class, copy string, import path, local variable, hook dependency list, or component nesting choice.

- [ ] **Step 3: Route future agents to the policy**

Add one concise bullet to `AGENTS.md` under workflow or guardrails:

```markdown
- Before adding or updating tests, follow `docs/agent/TESTING.md`; do not add source-grep tests for UI implementation details.
```

- [ ] **Step 4: Verify documentation integrity**

Run:

```bash
git diff --check
rg -n "TESTING.md|source-grep" AGENTS.md docs/agent/TESTING.md docs/agent/NOTES.md
```

Expected: no whitespace errors and all three routing references present.

### Task 2: Delete redundant root/replay source tests

**Files:**
- Delete: `app/__tests__/accountPage.source.test.js`
- Delete: `app/__tests__/challengeRouteRemoved.source.test.js`
- Delete: `app/__tests__/publicBranding.source.test.js`
- Delete: `app/__tests__/replayPageClient.source.test.js`
- Delete: `app/__tests__/replayPanel.source.test.js`
- Delete: `app/__tests__/replayScoreChart.source.test.js`
- Delete: `app/__tests__/replayStatusPage.source.test.js`

**Interfaces:**
- Consumes: existing handler, replay model, replay session, chart-model, route, and production-build coverage.
- Produces: the same runtime coverage without exact-copy/import/component-composition assertions.

- [ ] **Step 1: Confirm each file is source-only**

Run:

```bash
rg -n "readFileSync|toContain|toMatch" \
  app/__tests__/accountPage.source.test.js \
  app/__tests__/challengeRouteRemoved.source.test.js \
  app/__tests__/publicBranding.source.test.js \
  app/__tests__/replayPageClient.source.test.js \
  app/__tests__/replayPanel.source.test.js \
  app/__tests__/replayScoreChart.source.test.js \
  app/__tests__/replayStatusPage.source.test.js
```

Expected: assertions inspect source strings; none invokes a route, replay model, or rendered interaction.

- [ ] **Step 2: Delete the seven files**

Use `apply_patch` deletions only.

- [ ] **Step 3: Verify neighbouring behaviour coverage**

Run:

```bash
pnpm exec vitest run \
  app/__tests__/accountPage.test.js \
  app/__tests__/replayPageClient.test.js \
  app/__tests__/replayPanel.test.js \
  app/__tests__/replayScoreChart.test.js \
  app/__tests__/replaySessionState.test.js \
  app/__tests__/replayNavigation.test.js \
  --reporter=dot
```

If `accountPage.test.js` does not exist, omit it rather than creating a copy/string test.

### Task 3: Delete cosmetic Catana source tests

**Files:**
- Delete the following source-only files:

```text
app/catana/__tests__/ActionNode.passiveHover.test.js
app/catana/__tests__/ActionNode.test.js
app/catana/__tests__/Board.buildActionSuppression.test.js
app/catana/__tests__/Board.buildPickupPreview.test.js
app/catana/__tests__/Board.pulseAnimation.test.js
app/catana/__tests__/Board.robberPlacementUx.test.js
app/catana/__tests__/BuildPickupHoverGhost.source.test.js
app/catana/__tests__/BuildPlacementPreview.springMotion.test.js
app/catana/__tests__/CardStack.emptyState.test.js
app/catana/__tests__/CatanaProductBackgrounds.source.test.js
app/catana/__tests__/DevCardDisplay.disabledStyle.test.js
app/catana/__tests__/DevCardDisplayLayout.source.test.js
app/catana/__tests__/DevCardPurchaseReveal.source.test.js
app/catana/__tests__/DevSandboxBoardShell.source.test.js
app/catana/__tests__/DevSandboxClient.source.test.js
app/catana/__tests__/DevSandboxPanel.source.test.js
app/catana/__tests__/Dock.buildPickupUx.test.js
app/catana/__tests__/Edge.passiveHover.test.js
app/catana/__tests__/GameLogPanel.test.js
app/catana/__tests__/GameScreen.audioMute.test.js
app/catana/__tests__/GameScreen.cancelBuildAction.test.js
app/catana/__tests__/GameScreen.diceEffects.test.js
app/catana/__tests__/GameScreen.interactionGuards.test.js
app/catana/__tests__/GameScreen.mobileShell.source.test.js
app/catana/__tests__/GameScreen.playerColors.test.js
app/catana/__tests__/GameScreen.statusPresentation.test.js
app/catana/__tests__/GameScreen.themeSwitcher.test.js
app/catana/__tests__/GameScreen.zoomPan.test.js
app/catana/__tests__/HudMotionPerformance.source.test.js
app/catana/__tests__/IdlePromptModal.source.test.js
app/catana/__tests__/LeftMetaRail.test.js
app/catana/__tests__/MatchPageClient.standardUi.source.test.js
app/catana/__tests__/MobileMetaDrawer.package.test.js
app/catana/__tests__/MobileMetaDrawer.source.test.js
app/catana/__tests__/MobilePlayerCockpit.source.test.js
app/catana/__tests__/OpponentPlayerBox.test.js
app/catana/__tests__/Piece.test.js
app/catana/__tests__/PlayerActionBadges.test.js
app/catana/__tests__/PlayerActionContainer.devCardReveal.test.js
app/catana/__tests__/PlayerActionContainer.diceRollTimeline.test.js
app/catana/__tests__/PlayerActionContainer.hitbox.test.js
app/catana/__tests__/PlayerActionContainer.status.test.js
app/catana/__tests__/PlayerAvatarStatsCounts.test.js
app/catana/__tests__/PlayerAvatarStatsPresence.test.js
app/catana/__tests__/Port.iconAssets.test.js
app/catana/__tests__/PostgameOverlay.test.js
app/catana/__tests__/SettlexDialogs.source.test.js
app/catana/__tests__/SettlexUiFoundation.source.test.js
app/catana/__tests__/SettlexUiPickers.source.test.js
app/catana/__tests__/SettlexUiRecipes.source.test.js
app/catana/__tests__/SidebarConnectionStudy.source.test.js
app/catana/__tests__/StandardUiShowcase.source.test.js
app/catana/__tests__/StatusBanner.source.test.js
app/catana/__tests__/Tile.iconSizing.test.js
app/catana/__tests__/Tile.robberPlacementUx.test.js
app/catana/__tests__/TradeDiscardModal.test.js
app/catana/__tests__/VersionBadge.source.test.js
app/catana/__tests__/effects/DevCardRevealLab.source.test.js
app/catana/__tests__/effects/EffectLayer.test.js
app/catana/__tests__/effects/EffectsLabAudioOverride.test.js
app/catana/__tests__/effects/effectsLabRegistry.test.js
app/catana/__tests__/uiNoDragImages.test.js
```

**Interfaces:**
- Consumes: manual sandbox/effects-lab verification and the retained pure behaviour, asset-existence, game-state, command-model, and effect-payload suites.
- Produces: removal of tests that only freeze CSS, copy, class names, local wiring, or visual component composition.

- [ ] **Step 1: Validate the deletion set**

For every listed file, confirm it has no assertions against an imported runtime helper result and no reducer, handler, rendered interaction, or state transition.

Run:

```bash
node --input-type=module scripts/verify-source-only-deletion-set.mjs
```

If no reusable script is added, perform the same check with a temporary read-only inventory command and do not commit a throwaway script.

- [ ] **Step 2: Delete only validated files**

Use `apply_patch` deletions. Remove any file from the deletion set if it contains meaningful runtime assertions.

- [ ] **Step 3: Run the retained Catana behaviour cluster**

Run:

```bash
pnpm exec vitest run \
  app/catana/__tests__/gameScreenCommandState.test.js \
  app/catana/__tests__/gameScreenDisplayModel.test.js \
  app/catana/__tests__/gameStatus.test.js \
  app/catana/__tests__/turnUiState.test.js \
  app/catana/__tests__/boardBuildInteraction.test.js \
  app/catana/__tests__/boardPreviewTargets.test.js \
  app/catana/__tests__/cancelBuildAction.test.js \
  app/catana/__tests__/effects/EffectBus.test.js \
  app/catana/__tests__/effects/registry.test.js \
  app/catana/__tests__/effects/devCardPlay.test.js \
  --reporter=dot
```

Expected: all retained behavioural tests pass.

### Task 4: Split behaviour from mixed source tests

**Files:**
- Create: `app/catana/__tests__/FeedPanelScrollState.test.js`
- Modify: `app/catana/__tests__/AnimatedCount.test.js`
- Modify: `app/catana/__tests__/GameOverModal.test.js`
- Modify: `app/catana/__tests__/Port.render.test.js`
- Delete: `app/catana/__tests__/renderPerfGuards.test.js`

**Interfaces:**
- Consumes: `FeedPanelScrollState`, `AnimatedCount`, `gameOverAlertLifecycle`, and `Port`.
- Produces: behaviour/render tests with no dependency on production source spelling.

- [ ] **Step 1: Move FeedPanel scroll behaviour into its own test**

Copy only the existing fake-timer and scroll-state tests from
`renderPerfGuards.test.js` into `FeedPanelScrollState.test.js`:

```js
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AUTO_SCROLL_IDLE_MS,
  createFeedPanelScrollState,
  forceFeedPanelAutoScroll,
  handleFeedPanelBlur,
  handleFeedPanelFocus,
  handleFeedPanelMouseEnter,
  handleFeedPanelMouseLeave,
  markFeedPanelManualScroll,
  runFeedPanelAutoScrollIfNeeded
} from "../components/FeedPanelScrollState";
```

Retain the tests that exercise state transitions, idle timers, forced scrolling,
hover/focus gating, and instant versus smooth scroll behaviour. Do not copy
tests that inspect `GameScreen.js`, `Board.js`, component imports, hook
dependencies, `React.memo` markers, or lazy-import spelling.

- [ ] **Step 2: Verify the extracted behaviour tests**

Run:

```bash
pnpm exec vitest run app/catana/__tests__/FeedPanelScrollState.test.js --reporter=verbose
```

Expected: all copied behaviour tests pass before deleting the mixed source file.

- [ ] **Step 3: Delete `renderPerfGuards.test.js`**

Delete it with `apply_patch`; runtime performance claims require profiler/browser
evidence, not source-string guards.

- [ ] **Step 4: Trim source-only assertions from mixed component files**

In `AnimatedCount.test.js`, retain numeric direction and rendered accessible
output; remove CSS/source implementation assertions.

In `GameOverModal.test.js`, retain the `gameOverAlertLifecycle` action/state
tests; remove exact CTA copy, source variable, confetti-hook placement, and
color-helper import assertions.

In `Port.render.test.js`, retain rendered marker count, icon role, and exchange
rate semantics; remove exact CSS z-index, percentage footprint, and exact
inline font-size assertions.

- [ ] **Step 5: Run the trimmed mixed tests**

Run:

```bash
pnpm exec vitest run \
  app/catana/__tests__/AnimatedCount.test.js \
  app/catana/__tests__/GameOverModal.test.js \
  app/catana/__tests__/Port.render.test.js \
  app/catana/__tests__/FeedPanelScrollState.test.js \
  --reporter=dot
```

Expected: all retained behavioural tests pass.

### Task 5: Preserve high-value temporary source contracts

**Files:**
- No product changes.
- Review retained source-reading tests under `app/`, `app/catana`, `server`, and `scripts`.

**Interfaces:**
- Consumes: remaining source-reading inventory.
- Produces: an explicit retained set, avoiding accidental deletion of security or lifecycle boundaries.

- [ ] **Step 1: Confirm the retained categories**

Keep, pending later behavioural replacement:

```text
Next route export/dynamic constraints
Better Auth ownership/configuration
service-worker notification/click safety
postgame board mount/perspective identity
match-alert and tab-attention wiring
match-page credential/seat recovery
home matchmaking rescue and mutation reconciliation
reconnect persistence
neutral replay/viewer safety
dev-only route production guards
patch-package bundle markers
deployment/Caddy/Docker/shell-script contracts
```

- [ ] **Step 2: Recount source-reading tests**

Run:

```bash
rg -l "readFileSync\\(|fs\\.readFileSync\\(" app server lib ai scripts game-core \
  --glob '*test.{js,ts,mjs}' | wc -l
```

Expected: a material decrease from 133 without deleting the retained contract categories.

### Task 6: Full verification and closeout

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Interfaces:**
- Consumes: the pruned suite and testing policy.
- Produces: a verified cleanup branch with before/after counts and no product-code changes.

- [ ] **Step 1: Measure the resulting app suite**

Run:

```bash
/usr/bin/time -p pnpm test:app
```

Record app test-file count and elapsed wall time. Treat timing as
machine-specific evidence, not a universal benchmark.

- [ ] **Step 2: Run the full repository gate**

Run:

```bash
pnpm verify
```

Expected: engine, server, remaining app tests, and lint all pass.

- [ ] **Step 3: Run production compilation**

Run:

```bash
SETTLEX_ALLOW_BUILD_TIME_SERVER_PLACEHOLDERS=1 pnpm build
```

Expected: successful compile, type check, page-data collection, and static page generation.

- [ ] **Step 4: Document the result**

Add a top entry to `docs/agent/PROGRESS.md` with:

```text
before/after app test-file count
before/after source-reading test count
deleted file count
retained test categories
focused/full verification commands and results
```

Add the durable source-test boundary to `docs/agent/NOTES.md`.

- [ ] **Step 5: Review the final diff**

Run:

```bash
git diff --check
git status --short
git diff --stat main...HEAD
git diff --name-status main...HEAD
```

Expected: documentation plus test deletions/refactors only; no production behaviour changes.

- [ ] **Step 6: Commit**

Run:

```bash
git add AGENTS.md docs/agent/TESTING.md docs/agent/NOTES.md docs/agent/PROGRESS.md app
git commit -m "test: replace brittle UI source checks"
```
