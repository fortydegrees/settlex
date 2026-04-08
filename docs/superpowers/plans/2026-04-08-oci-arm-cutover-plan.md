# OCI ARM Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move production from the current x86 OCI VM to a fresh ARM OCI VM with a fresh Postgres database, while preserving a rollback path on the old host until the new host is verified.

**Architecture:** Keep the existing one-host production shape: Caddy reverse proxy, `web`, `game`, and `postgres` containers on one OCI VM. Update GitHub Actions to build container images for the new architecture, bootstrap the new VM in parallel, then cut over the deploy target and verify the site over the new raw IP.

**Tech Stack:** GitHub Actions, Docker Buildx, GHCR, Docker Compose, Caddy, OCI Ubuntu, PostgreSQL

---

### Task 1: Lock the cutover plan and verify baseline

**Files:**
- Create: `docs/superpowers/plans/2026-04-08-oci-arm-cutover-plan.md`
- Test: `pnpm verify`

- [ ] **Step 1: Verify the worktree starts from a clean baseline**

Run: `pnpm verify`
Expected: test suite passes and lint exits `0` with only the existing warnings.

- [ ] **Step 2: Record the cutover plan**

Capture the migration decisions:
- old VM stays up as rollback
- new VM gets a fresh Postgres database
- live URL changes to the new raw IP
- GitHub Actions switches from x86-only images to an ARM-compatible build target

### Task 2: Update repo deploy configuration for the new host

**Files:**
- Modify: `.github/workflows/deploy-prod.yml`
- Modify: `docs/deploy/oci-mvp.md`
- Test: `server/__tests__/deploymentFiles.source.test.js`

- [ ] **Step 1: Write a failing workflow coverage test if needed**

Add or adjust a source test so the workflow/documented deploy files assert the intended production architecture target (`linux/arm64` or multi-arch) and the current deploy file shape.

- [ ] **Step 2: Run the targeted test to verify it fails for the current x86-only workflow**

Run: `pnpm exec vitest run server/__tests__/deploymentFiles.source.test.js`
Expected: failure that points at the current `linux/amd64` setting or missing documentation detail.

- [ ] **Step 3: Update the deploy workflow**

Change `.github/workflows/deploy-prod.yml` so image builds are compatible with the new ARM VM while keeping the rest of the GHCR + SSH deploy flow intact.

- [ ] **Step 4: Update the OCI deployment document**

Revise `docs/deploy/oci-mvp.md` so it matches the new production target and the fresh-DB cutover process.

- [ ] **Step 5: Re-run the targeted deploy test**

Run: `pnpm exec vitest run server/__tests__/deploymentFiles.source.test.js`
Expected: PASS

### Task 3: Bootstrap the new OCI VM

**Files:**
- Create on server: `/srv/settlex/.env.prod`
- Sync to server: repo root under `/srv/settlex`

- [ ] **Step 1: Confirm SSH connectivity to the new host**

Run: `ssh -i ~/.ssh/id_ed25519 ubuntu@145.241.254.241`
Expected: successful shell login.

- [ ] **Step 2: Install Docker Engine and Compose plugin on the new VM**

Use the same bootstrap shape as the existing VM so the deploy script can run unchanged.

- [ ] **Step 3: Create `/srv/settlex` and the fresh prod env file**

Set:
- `SITE_HOST=http://145.241.254.241`
- `PUBLIC_APP_URL=http://145.241.254.241`
- `NEXT_PUBLIC_GAME_SERVER_ORIGIN=http://145.241.254.241`
- fresh `SESSION_SECRET`
- fresh Postgres credentials
- `DATABASE_URL` pointing at the `postgres` container

- [ ] **Step 4: Confirm OCI ingress**

Ensure the new instance accepts:
- `22` from the admin IP
- `80` from `0.0.0.0/0`
- `443` from `0.0.0.0/0`

### Task 4: Deploy and cut over

**Files:**
- Modify in GitHub repo settings: `OCI_HOST` secret

- [ ] **Step 1: Update the GitHub deploy target**

Set `OCI_HOST=145.241.254.241` after the new VM is ready.

- [ ] **Step 2: Trigger deployment**

Push the repo change to `main` or run the workflow manually.

- [ ] **Step 3: Verify the live site on the new IP**

Check:
- `http://145.241.254.241`
- lobby create/join flow
- websocket-backed match connection
- `/games/catan` responds through the reverse proxy

- [ ] **Step 4: Keep the old VM as rollback until verification is complete**

Only decommission the old VM after the new host is confirmed healthy.
