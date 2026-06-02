---
name: settlex-release
description: Use when preparing, checking, pushing, retrying, or verifying a Settlex production deploy to settlehex.com, including release-note drafting, approval, homepage release badge updates, and GitHub Actions deploy monitoring.
---

# Settlex Release

Use this workflow for every production deploy to settlehex.com.

## First Checks

1. Work from a clean branch/worktree that is current with `origin/main`.
2. Run `pnpm release:status`.
3. Read `release/release-notes.json`.
4. Inspect the actual change:
   - `git status --short --branch`
   - `git diff --stat origin/main`
   - `git log --oneline origin/main..HEAD`

## Release Notes

Create a new release entry only when product/user-facing shipped behavior changed.

- Increment `currentVersion` by 1.
- Put the new release first in `releases`.
- Use `YYYY-MM-DD`.
- Keep `approved: false` while drafting.
- Draft a short title and 1-6 high-level highlights from the actual diff/commits.
- Avoid raw commit-message wording unless it already reads clearly to an end user.

Before deploy, show the user the exact badge copy:

```text
What changed
Release N · <title>
- <highlight>
```

Set `approved: true` only after explicit user approval of that exact copy.

## Same-Release Fixes

Do not invent a new public release for deploy plumbing or retry fixes after a release already landed on `main`.

If `release/release-notes.json` did not change:

- keep the existing release number,
- still require `approved: true`,
- fix the deploy issue under the same release,
- run the extra checks listed by `pnpm release:status` when deployment infra changed.

## Required Checks

Always run the checks reported by:

```bash
pnpm release:status
```

At minimum this includes:

```bash
pnpm release:check -- --require-approved
pnpm verify
```

If release notes changed, also run:

```bash
pnpm release:check -- --require-bump-from origin/main
```

If deployment infra changed, also run:

```bash
pnpm exec vitest run server/__tests__/deploymentFiles.source.test.js --reporter=dot
bash -n infra/scripts/deploy-prod.sh
docker build -f Dockerfile.web --target deps .
docker build -f Dockerfile.game .
```

## Push And Monitor

1. Commit focused release/deploy changes.
2. Push the feature branch.
3. Push or merge to `main` only after the user asks to deploy.
4. Watch `.github/workflows/deploy-prod.yml`.
5. If GitHub Actions fails:
   - identify whether failure is in `verify` or `deploy`,
   - pull exact job logs,
   - fix the concrete cause,
   - retry under the same release when release notes did not change.

## Live Verification

After Actions reports success:

1. Open `https://settlehex.com`.
2. Confirm HTTP 200.
3. Confirm the bottom-right `rN` badge is visible.
4. Click the badge.
5. Confirm the panel shows the approved title/highlights.
6. Mention the Actions run id and live badge result in the final response.

## Deploy Lessons

- Do not assume Node exists on the OCI host before Docker build.
- Pass build metadata from Actions into `infra/scripts/deploy-prod.sh`.
- Keep Docker toolchains pinned; the repo currently pins `pnpm@9.13.2` for Node 20 images.
- Do not run `pnpm build` against the same `.next` directory while `pnpm dev` is serving it.
