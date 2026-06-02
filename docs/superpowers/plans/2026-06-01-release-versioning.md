# Release Versioning Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a homepage deployment release badge backed by approved release notes and guarded by Codex hooks plus CI checks.

**Architecture:** Store public release notes in tracked JSON, expose build metadata through Next public env vars, and render a small `rN` lobby badge. Validate release notes with a deterministic Node script, wire GitHub Actions/Docker build metadata, and add repo-local Codex skill/hooks to steer release preparation.

**Tech Stack:** Next.js 13 app router, React client components, Vitest, Node ESM scripts, GitHub Actions, Docker Compose, Codex hooks/skills.

---

### Task 1: Release Data And Validation

**Files:**
- Create: `release/release-notes.json`
- Create: `scripts/release/check-release.mjs`
- Create: `scripts/release/read-release-notes.mjs`
- Create: `scripts/release/__tests__/check-release.test.mjs`
- Modify: `package.json`

- [ ] Write failing tests for valid release JSON, malformed releases, and required version bump from a base ref.
- [ ] Implement shared release-note reader and validation helpers.
- [ ] Add `release:check` package script.
- [ ] Verify targeted tests and `pnpm release:check`.

### Task 2: Homepage Release Badge

**Files:**
- Create: `app/catana/lobby/releaseInfo.js`
- Create: `app/catana/lobby/VersionBadge.js`
- Create: `app/catana/__tests__/releaseInfo.test.js`
- Create: `app/catana/__tests__/VersionBadge.source.test.js`
- Modify: `app/catana/lobby/LobbyPageClient.js`

- [ ] Write failing tests for build metadata normalization and homepage badge wiring.
- [ ] Implement release info normalization.
- [ ] Render a bottom-right `rN` release badge with an animated shared Popover details panel.
- [ ] Verify targeted app tests.

### Task 3: Deployment Metadata And CI Guard

**Files:**
- Modify: `.github/workflows/deploy-prod.yml`
- Modify: `infra/docker-compose.prod.yml`
- Modify: `infra/scripts/deploy-prod.sh`
- Modify: `Dockerfile.web`
- Modify: `server/__tests__/deploymentFiles.source.test.js`

- [ ] Write failing source tests for release check wiring and build metadata propagation.
- [ ] Add GitHub Actions release check before deploy.
- [ ] Pass SHA/date/release version through deploy script, compose build args, and Dockerfile public env vars.
- [ ] Verify deployment source tests.

### Task 4: Codex Release Skill And Hooks

**Files:**
- Create: `.agents/skills/settlex-release/SKILL.md`
- Create: `.codex/hooks.json`
- Create: `.codex/hooks/settlex-release-guard.mjs`
- Create: `scripts/release/__tests__/codex-release-guard.test.mjs`

- [ ] Write failing tests for hook behavior: deploy prompts add context, protected Bash deploy/push commands block when release checks fail.
- [ ] Implement hook script with `UserPromptSubmit` and `PreToolUse` behavior.
- [ ] Add repo-local skill instructions for drafting approved release notes.
- [ ] Verify hook tests and run a direct sample hook invocation.

### Task 5: Docs And Final Verification

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

- [ ] Document the release workflow and current status.
- [ ] Run focused tests: release scripts, app badge tests, deployment source tests, hook tests, lint.
- [ ] Run `git diff --check`.
