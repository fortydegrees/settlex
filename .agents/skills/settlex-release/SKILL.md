---
name: settlex-release
description: Use when preparing a Settlex production release, pushing main for settlehex.com, drafting release notes, bumping the homepage release badge, or deploying the app.
---

# Settlex Release

Prepare an approved production release note before any deploy to settlehex.com.

## Workflow

1. Inspect the current release state:
   - Read `release/release-notes.json`.
   - Run `git log --oneline origin/main..HEAD` when available; otherwise inspect recent local commits.
   - Run `pnpm release:check` to confirm the release file is valid.
2. Draft a new release entry:
   - Increment `currentVersion` by 1.
   - Add the new release at the top of `releases`.
   - Use today's date in `YYYY-MM-DD`.
   - Set `approved: false` until the user approves the exact copy.
   - Write a short title and 3-6 user-facing highlights.
   - Avoid raw commit-message wording unless it is already clear to a non-developer.
3. Show the user the exact `What changed` copy that will appear in the release badge.
4. Ask the user to approve or edit that copy before shipping.
5. After explicit approval, update `release/release-notes.json` with `approved: true`.
   - Do not set `approved: true` based on your own judgment.
   - If the user asks for edits, keep `approved: false` until the edited copy is approved.
6. Run:
   - `pnpm release:check`
   - `pnpm release:check -- --require-approved`
   - focused tests for files changed in the release
7. Only then help commit, push, or deploy.

## Guardrails

- Do not invent shipped work. Base highlights on commits, diffs, or user-provided release content.
- Keep notes high level and product-facing.
- Do not run production deploy commands before the user approves the release entry.
- Production deploy checks require the current release entry to have `approved: true`.
- If only infrastructure/versioning changed, say so plainly in the highlights.
