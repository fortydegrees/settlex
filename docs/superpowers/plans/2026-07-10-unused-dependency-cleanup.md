# Unused Dependency Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the unused `jsnetworkx` and `next-images` production dependency trees without upgrading unrelated packages.

**Architecture:** Prove both packages have no executable imports, record the production audit baseline, remove them through pnpm so the manifest and lockfile stay synchronized, then verify resolution, tests and production build.

**Tech Stack:** pnpm 9.13.2, Next.js 13, repository audit/build scripts.

## Global Constraints

- Remove only `jsnetworkx` and `next-images`.
- Do not upgrade Better Auth, Next.js or any unrelated direct dependency.
- Do not change build tooling or uncomment image-plugin configuration.
- Use pnpm; do not create or modify `package-lock.json`.

---

### Task 1: Capture evidence and remove the packages

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: current workspace dependency graph.
- Produces: a lockfile with neither package reachable from the root importer.

- [ ] **Step 1: Confirm executable references are absent**

Run: `rg -n "jsnetworkx|next-images" package.json pnpm-lock.yaml next.config.js app server game-core scripts --glob '!node_modules'`

Expected: manifest/lock entries plus only the commented `next-images` configuration; no executable import or require.

- [ ] **Step 2: Record the production audit baseline**

Run: `pnpm audit --prod`

Expected: audit may exit nonzero because known vulnerabilities remain; save the severity totals and package paths for comparison.

- [ ] **Step 3: Remove exactly the two direct dependencies**

Run: `pnpm remove jsnetworkx next-images`

Expected: `package.json` and `pnpm-lock.yaml` change; no other direct dependency version changes.

- [ ] **Step 4: Verify dependency resolution**

Run: `pnpm why jsnetworkx`

Expected: no dependency path.

Run: `pnpm why next-images`

Expected: no dependency path.

- [ ] **Step 5: Inspect manifest and lockfile scope**

Run: `git diff -- package.json pnpm-lock.yaml`

Expected: the root entries and now-unreachable transitive trees are removed; unrelated direct versions remain unchanged.

- [ ] **Step 6: Commit the dependency cleanup**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: remove unused legacy dependencies"
```

### Task 2: Verify security and build impact

**Files:**
- Modify: `docs/agent/PROGRESS.md`
- Modify: `docs/agent/NOTES.md`

**Interfaces:**
- Consumes: updated lockfile and baseline audit totals from Task 1.
- Produces: current after-audit evidence and build/test confirmation.

- [ ] **Step 1: Run the post-removal production audit**

Run: `pnpm audit --prod`

Expected: trees reachable only through `jsnetworkx` or `next-images` are absent. Other known advisories may remain and are explicitly out of scope.

- [ ] **Step 2: Run the full release verification gate**

Run: `pnpm verify`

Expected: engine, server, app tests and lint PASS.

- [ ] **Step 3: Run a fresh production build**

Run: `SETTLEX_ALLOW_BUILD_TIME_SERVER_PLACEHOLDERS=1 pnpm build`

Expected: production build exits 0.

- [ ] **Step 4: Record exact before/after evidence**

Document the before/after audit severity totals, removed dependency paths, verification result and build result. State clearly that Better Auth and Next.js advisories were not addressed by this cleanup.

- [ ] **Step 5: Verify diff hygiene and commit documentation**

Run: `git diff --check`

Expected: no output and exit 0.

```bash
git add docs/agent/PROGRESS.md docs/agent/NOTES.md
git commit -m "docs: record dependency cleanup verification"
```
