# Stranded Mainline Improvements Recovery Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recover the useful non-3D changes preserved in `codex/mixed-unfinished-rescue-2026-07-28` onto current `main`, keep 3D isolated on `codex/3d-sandbox-recovery`, and make the mixed rescue branch disposable.

**Architecture:** Treat `7a5922c` as a source archive, not a commit to merge. Recover one independently testable product slice at a time onto `codex/recover-mainline-improvements`, preserving newer `main` behavior and committing each slice separately. Exclude all 3D runtime/assets, generated Blender artifacts, stale screenshots, superseded plans, and unrelated package changes.

**Tech Stack:** Next.js App Router, React, Vitest, boardgame.io, Howler, pnpm, shell deployment scripts.

## Global Constraints

- Do not merge or cherry-pick the mixed WIP commit wholesale.
- Do not move any 3D code, assets, dependencies, Blender output, or 3D plans onto `main`.
- Do not alter the active bot or Storybook worktrees.
- Write or recover behavior tests first and observe the expected failure before changing production code.
- Preserve current-main behavior where files have diverged since the rescue snapshot.
- Do not push or deploy without separate user authorization.

---

### Task 1: Replay reconstruction integrity

**Files:**
- Modify: `lib/server/__tests__/replayFrames.test.js`
- Modify: `lib/server/replays/buildReplayFrames.js`

**Interfaces:**
- Consumes: archived `initialState`, action `log`, optional `finalState`, and a boardgame.io-compatible reducer.
- Produces: `buildReplayFrames({ initialState, log, finalState, reducer })`, which skips already-applied transition entries and rejects malformed or inconsistent reconstructions.

- [x] **Step 1: Recover the replay integrity tests**

Bring the `makeReplayState` fixture and four integrity cases from:

```bash
git show codex/mixed-unfinished-rescue-2026-07-28:lib/server/__tests__/replayFrames.test.js
```

Merge them into the current test file without deleting the existing sequential-frame case.

- [x] **Step 2: Verify the tests fail for the missing guards**

Run:

```bash
pnpm exec vitest run lib/server/__tests__/replayFrames.test.js --reporter=dot
```

Expected: failures for duplicate transition handling, malformed state rejection, reducer/non-advancing action rejection, and final-state validation.

- [x] **Step 3: Recover the guarded reconstruction implementation**

Port `isRecord`, `assertReplayState`, `_stateID` sequencing, reducer-error checks, and optional `finalState` verification from:

```bash
git show codex/mixed-unfinished-rescue-2026-07-28:lib/server/replays/buildReplayFrames.js
```

- [x] **Step 4: Verify and commit**

```bash
pnpm exec vitest run lib/server/__tests__/replayFrames.test.js --reporter=dot
git add lib/server/__tests__/replayFrames.test.js lib/server/replays/buildReplayFrames.js
git commit -m "fix: harden archived replay reconstruction"
```

### Task 2: Replay feed selection and neutral viewer HUD

**Files:**
- Modify: `app/catana/__tests__/FeedPanel.test.js`
- Modify: `app/catana/__tests__/GameLogPanel.test.js`
- Modify: `app/catana/__tests__/LeftMetaRail.test.js`
- Create: `app/catana/__tests__/GameScreen.neutralViewerLayout.source.test.js`
- Create: `app/catana/__tests__/opponentHudLayout.test.js`
- Modify: `app/catana/components/FeedPanel.js`
- Modify: `app/catana/components/FeedPanelScrollState.js`
- Modify: `app/catana/components/GameLogPanel.js`
- Modify: `app/catana/components/LeftMetaRail.js`
- Modify: `app/catana/GameScreen.js`
- Create: `app/catana/utils/opponentHudLayout.js`

**Interfaces:**
- Consumes: `activeEntryKey`, `onEntrySelect`, replay state, viewport type, and viewer seat.
- Produces: selectable replay log rows, automatic active-row visibility, and deterministic two-player opponent placement for neutral replay/spectator viewers.

- [x] **Step 1: Recover focused component and layout tests**

Use the test expectations from the rescue snapshot while retaining newer current-main tests:

```bash
git diff main codex/mixed-unfinished-rescue-2026-07-28 -- app/catana/__tests__/FeedPanel.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/GameScreen.neutralViewerLayout.source.test.js app/catana/__tests__/opponentHudLayout.test.js
```

- [x] **Step 2: Verify the tests fail because the props and helper are missing**

```bash
pnpm exec vitest run app/catana/__tests__/FeedPanel.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/GameScreen.neutralViewerLayout.source.test.js app/catana/__tests__/opponentHudLayout.test.js --reporter=dot
```

- [x] **Step 3: Port only the selection and neutral-layout behavior**

Recover the relevant hunks from the rescue versions of `FeedPanel`, `FeedPanelScrollState`, `GameLogPanel`, `LeftMetaRail`, `GameScreen`, and `opponentHudLayout`. Do not include the mobile lazy-loading work in this task.

- [x] **Step 4: Verify and commit**

```bash
pnpm exec vitest run app/catana/__tests__/FeedPanel.test.js app/catana/__tests__/GameLogPanel.test.js app/catana/__tests__/LeftMetaRail.test.js app/catana/__tests__/GameScreen.neutralViewerLayout.source.test.js app/catana/__tests__/opponentHudLayout.test.js --reporter=dot
git add app/catana
git commit -m "fix: restore replay feed and neutral viewer HUD"
```

### Task 3: Canonical friend-challenge game URLs

**Files:**
- Modify: `app/__tests__/api/challengeRoutes.test.js`
- Modify: `app/__tests__/api/routeModuleExports.source.test.js`
- Delete: `app/__tests__/challengePage.test.js`
- Delete: `app/__tests__/challengePageClient.source.test.js`
- Create: `app/__tests__/challengeRouteRemoved.source.test.js`
- Modify: `app/__tests__/gMatchPage.test.js`
- Modify: `app/api/challenges/create/handler.js`
- Create: `app/catana/__tests__/HomeTableClient.challengeFlow.source.test.js`
- Modify: `app/catana/__tests__/LobbyPageClient.identity.test.js`
- Create: `app/catana/__tests__/MatchPageClient.friendChallenge.source.test.js`
- Modify: `app/catana/__tests__/pendingFriendChallenge.test.js`
- Modify: `app/catana/home/HomeTableClient.js`
- Modify: `app/catana/lobby/AccountEntryModal.js`
- Modify: `app/catana/lobby/[matchID]/MatchPageClient.js`
- Modify: `app/catana/lobby/useLobbyHomeActions.js`
- Modify: `app/catana/utils/pendingFriendChallenge.js`
- Delete: `app/challenge/[matchID]/ChallengePageClient.js`
- Delete: `app/challenge/[matchID]/page-content.js`
- Delete: `app/challenge/[matchID]/page.js`
- Create: `app/g/[matchID]/UnavailableMatchPage.jsx`
- Modify: `app/g/[matchID]/page-content.js`

**Interfaces:**
- Consumes: challenge creation responses and `/g/:matchID` game URLs.
- Produces: one canonical game URL for inviter, invitee, live match, expired/cancelled match, and archived replay states.

- [x] **Step 1: Recover the challenge-route tests without overwriting newer unrelated assertions**

Use:

```bash
git diff main codex/mixed-unfinished-rescue-2026-07-28 -- app/__tests__ app/catana/__tests__
```

Select only friend-challenge, canonical-URL, unavailable-match, identity, and pending-challenge expectations.

- [x] **Step 2: Verify the focused tests fail against the legacy `/challenge` route**

```bash
pnpm exec vitest run app/__tests__/api/challengeRoutes.test.js app/__tests__/api/routeModuleExports.source.test.js app/__tests__/challengeRouteRemoved.source.test.js app/__tests__/gMatchPage.test.js app/catana/__tests__/HomeTableClient.challengeFlow.source.test.js app/catana/__tests__/LobbyPageClient.identity.test.js app/catana/__tests__/MatchPageClient.friendChallenge.source.test.js app/catana/__tests__/pendingFriendChallenge.test.js --reporter=dot
```

- [x] **Step 3: Port the canonical `/g/:matchID` flow**

Reconcile the rescue behavior into current files, delete the legacy route, add `UnavailableMatchPage`, and preserve newer current-main replay and account behavior.

- [x] **Step 4: Verify and commit**

```bash
pnpm exec vitest run app/__tests__/api/challengeRoutes.test.js app/__tests__/api/routeModuleExports.source.test.js app/__tests__/challengeRouteRemoved.source.test.js app/__tests__/gMatchPage.test.js app/catana/__tests__/HomeTableClient.challengeFlow.source.test.js app/catana/__tests__/LobbyPageClient.identity.test.js app/catana/__tests__/MatchPageClient.friendChallenge.source.test.js app/catana/__tests__/pendingFriendChallenge.test.js --reporter=dot
git add app
git commit -m "feat: use canonical game URLs for friend challenges"
```

### Task 4: Shared audio ownership

**Files:**
- Modify: `app/catana/__tests__/DevCardPurchaseReveal.source.test.js`
- Modify: `app/catana/__tests__/effects/AudioManager.test.js`
- Modify: `app/catana/__tests__/HomeDemoBoard.source.test.js`
- Modify: `app/catana/DevCardPurchaseReveal.js`
- Modify: `app/catana/dev/effects/DevCardRevealLab.jsx`
- Modify: `app/catana/effects/AudioManager.js`
- Modify: `app/catana/effects/GameEffects.js`
- Modify: `app/catana/effects/soundThemes.js`
- Modify: `app/catana/homeDemo/HomeDemoEffectBridge.js`

**Interfaces:**
- Consumes: semantic `devcard:reveal:pop` and `devcard:reveal:travel` cues.
- Produces: one shared audio manager with optional idle preload and cleanup; no component-owned duplicate Howler instances.

- [x] **Step 1: Recover the audio ownership and preload tests**

Merge the rescue assertions into the three current test files.

- [x] **Step 2: Verify failures for direct Howler ownership and missing preload**

```bash
pnpm exec vitest run app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/effects/AudioManager.test.js app/catana/__tests__/HomeDemoBoard.source.test.js --reporter=dot
```

- [x] **Step 3: Port the cue routing, preload, cleanup, and muted home-demo behavior**

Reconcile only audio/effect ownership changes from the rescue snapshot.

- [x] **Step 4: Verify and commit**

```bash
pnpm exec vitest run app/catana/__tests__/DevCardPurchaseReveal.source.test.js app/catana/__tests__/effects/AudioManager.test.js app/catana/__tests__/HomeDemoBoard.source.test.js --reporter=dot
git add app/catana
git commit -m "perf: centralize effect audio ownership"
```

### Task 5: Frontend lazy-loading pass

**Files:**
- Modify: `app/catana/__tests__/HomeDemoBoard.source.test.js`
- Modify: `app/catana/__tests__/renderPerfGuards.test.js`
- Modify: `app/catana/components/LeftMetaRail.js`
- Modify: `app/catana/GameScreen.js`
- Modify: `app/catana/home/HomeTableClient.js`

**Interfaces:**
- Consumes: existing modal components and mobile meta drawer.
- Produces: cached dynamic imports, idle warming, a static homepage poster before demo measurement, and mobile-only drawer loading.

- [x] **Step 1: Recover the performance guard assertions**

Merge only lazy-loading, idle-warm, and poster-gating expectations from the rescue tests.

- [x] **Step 2: Verify they fail against eager imports**

```bash
pnpm exec vitest run app/catana/__tests__/HomeDemoBoard.source.test.js app/catana/__tests__/renderPerfGuards.test.js app/catana/__tests__/LeftMetaRail.test.js --reporter=dot
```

- [x] **Step 3: Port the cached imports and idle warm-up logic**

Reconcile these changes into the already-updated current-main components without changing product behavior.

- [x] **Step 4: Verify and commit**

```bash
pnpm exec vitest run app/catana/__tests__/HomeDemoBoard.source.test.js app/catana/__tests__/renderPerfGuards.test.js app/catana/__tests__/LeftMetaRail.test.js --reporter=dot
git add app/catana
git commit -m "perf: defer noncritical Catana UI"
```

### Task 6: Safe fast production deployment lane

**Files:**
- Modify: `.agents/skills/settlex-release/SKILL.md`
- Modify: `.github/workflows/deploy-prod.yml`
- Modify: `.gitignore`
- Modify: `AGENTS.md`
- Create: `infra/scripts/deploy-prod-from-git.sh`
- Modify: `infra/scripts/deploy-prod.sh`
- Modify: `package.json`
- Modify: `scripts/release/__tests__/status.test.mjs`
- Modify: `scripts/release/status.mjs`
- Modify: `server/__tests__/deploymentFiles.source.test.js`

**Interfaces:**
- Consumes: a clean pushed `main`, SSH access to `settlehex-oci`, and production environment configuration.
- Produces: `pnpm deploy:prod:fast`, manual-only thorough GitHub deployment, validation, migration/backup checks, rebuild, and health verification.

- [x] **Step 1: Recover deployment source tests and status expectations**

Bring across deployment behavior tests while intentionally excluding the rescue `infra/Caddyfile`.

- [x] **Step 2: Verify failures for the absent fast lane**

```bash
pnpm exec vitest run server/__tests__/deploymentFiles.source.test.js scripts/release/__tests__/status.test.mjs --reporter=dot
```

- [x] **Step 3: Port the scripts, workflow, package command, ignore rule, and documentation**

Recover the fast lane from the rescue snapshot. Do not change Caddy routing or caching in this task.

- [x] **Step 4: Verify syntax, tests, and release status**

```bash
bash -n infra/scripts/deploy-prod-from-git.sh infra/scripts/deploy-prod.sh
pnpm exec vitest run server/__tests__/deploymentFiles.source.test.js scripts/release/__tests__/status.test.mjs --reporter=dot
pnpm release:status
git add .agents/skills/settlex-release/SKILL.md .github/workflows/deploy-prod.yml .gitignore AGENTS.md infra/scripts package.json scripts/release server/__tests__/deploymentFiles.source.test.js
git commit -m "ops: restore fast production deploy lane"
```

### Task 7: Final verification and branch cleanup readiness

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Interfaces:**
- Consumes: all recovered product slices and their focused commits.
- Produces: a verified recovery branch that can fast-forward `main`, plus an explicit record of excluded 3D/generated/Caddy material.

- [x] **Step 1: Run targeted and repository verification**

```bash
pnpm test:server
pnpm test:app
pnpm lint
git diff --check main...HEAD
```

- [x] **Step 2: Record the recovery boundary**

Document recovered slices, validation evidence, and exclusions in `PROGRESS.md` and `NOTES.md`.

- [x] **Step 3: Commit the recovery record**

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md docs/superpowers/plans/2026-07-28-recover-stranded-mainline-improvements.md
git commit -m "docs: record stranded mainline recovery"
```

- [ ] **Step 4: Integrate locally only after verification**

Fast-forward local `main` to the verified recovery branch. Do not push, deploy, or delete `codex/mixed-unfinished-rescue-2026-07-28` until the recovered tree and exclusions are confirmed.
