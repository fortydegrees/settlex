# Release Versioning Design

## Goal

Show the exact deployed Settlex version on the homepage and make production deploys carry approved, user-facing release notes.

## Architecture

Use a tracked JSON release file as the human-approved source of truth. Next.js imports that file for the homepage release badge, while Docker/GitHub Actions inject build metadata such as commit SHA and build time through build arguments and `NEXT_PUBLIC_*` environment variables.

The release workflow has three guardrails:
- a repo-local Codex skill that drafts release notes and asks for approval before updating the release file,
- repo-local Codex hooks that steer or block Codex when it tries to deploy/push without an approved release bump,
- a GitHub Actions check that enforces an approved release bump before every `main` push deployment.

## User Experience

The lobby homepage renders a small fixed `rN` button in the bottom-right corner. `rN` means production release sequence, not product maturity. Clicking it opens the shared animated Catana `Popover` with the release title, approved highlights, deploy timestamp, and short build SHA.

## Data Flow

1. `release/release-notes.json` stores `currentVersion` and release entries.
2. `app/catana/lobby/releaseInfo.js` normalizes the current release and build metadata.
3. `VersionBadge` renders the button and shared Popover details panel inside `LobbyPageClient`.
4. `scripts/release/check-release.mjs` validates the release file locally and, in CI, verifies that `currentVersion` increased compared with the pre-push commit and the current release is approved.
5. `.github/workflows/deploy-prod.yml` passes build SHA/date into `infra/scripts/deploy-prod.sh`.
6. `Dockerfile.web` exposes those values to `next build`.

## Testing

Use test-first coverage for:
- release JSON validation and version bump enforcement,
- build metadata normalization,
- homepage wiring/source expectations,
- deployment file wiring for build args and CI checks,
- Codex hook blocking behavior for deploy/push commands.

## Scope Boundaries

This does not introduce npm package semver, Git tags, release objects, or automatic public-note generation inside CI. Codex may draft release notes, but approval remains human-controlled before deployment.
