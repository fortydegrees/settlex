# OCI MVP Deployment

This document covers the MVP deployment shape for Settlex on one OCI Ubuntu VM.

## Current target

- Host: one OCI Ubuntu VM
- CPU architecture: `x86_64`
- Reverse proxy: Caddy
- App services:
  - `web` for Next.js
  - `game` for the `boardgame.io` server
  - `postgres` for the product database
- Delivery path: GitHub Actions builds `linux/amd64` images, pushes them to `ghcr.io`, and deploys them over SSH

## Local development

Local development stays simple:

```bash
docker compose -f infra/docker-compose.local.yml up -d postgres
pnpm serve
pnpm dev
```

Notes:

- local Postgres lives only in the local container volume
- local game traffic still talks directly to the local game server process
- production deploy automation does not affect the local workflow

## One-time OCI bootstrap

Run these steps once on the server:

1. Install Docker Engine and the Compose plugin.
2. Create an app directory such as `/srv/settlex`.
3. Create `/srv/settlex/.env.prod` with:
   - `SITE_HOST`
   - `PUBLIC_APP_URL`
   - `NEXT_PUBLIC_GAME_SERVER_ORIGIN`
   - `SESSION_SECRET`
   - `POSTGRES_DB`
   - `POSTGRES_USER`
   - `POSTGRES_PASSWORD`
   - `DATABASE_URL`
   - `GAME_SERVER_INTERNAL_URL`
   - later, SMTP vars for real magic-link delivery
4. Open firewall/security rules for:
   - `22` from your IP
   - `80`
   - `443`
5. Point DNS for `SITE_HOST` at the VM public IP once the domain exists.

The workflow syncs the checked-out repo contents to `/srv/settlex` over SSH on each deploy, so the VM does not need its own GitHub clone credentials.

## GitHub Actions secrets

Add these repository secrets before enabling automatic deploys:

- `OCI_HOST`
- `OCI_USER`
- `OCI_SSH_KEY`
- `OCI_APP_DIR`
- `GHCR_READ_USER`
- `GHCR_READ_TOKEN`

The workflow uses `GITHUB_TOKEN` for image pushes from Actions, and `GHCR_READ_USER` / `GHCR_READ_TOKEN` so the VM can pull private images during deploy.

## Automatic production deploy flow

After bootstrap, the normal release path is:

1. Push to `main`.
2. GitHub Actions runs `pnpm verify`.
3. If verification passes, Actions builds:
   - `ghcr.io/<owner>/settlex-web:<sha>`
   - `ghcr.io/<owner>/settlex-game:<sha>`
4. Actions syncs the checked-out repo files to `/srv/settlex` over SSH.
5. Actions SSHes into the OCI VM.
6. The VM logs into `ghcr.io` using the provided read token.
7. The VM runs `infra/scripts/deploy-prod.sh`, which:
   - pulls the pinned images
   - recreates the compose stack
   - runs `pnpm db:migrate` in the `web` container

## Current limitation to remember

The existing Catana browser clients still have some hardcoded `:8000` / `:8080` assumptions. The one-host Caddy setup in this document is the target production shape, but the client env-driven transport cleanup from the accounts/replay plan still needs to land before public cutover.
