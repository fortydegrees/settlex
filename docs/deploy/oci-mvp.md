# OCI MVP Deployment

This document covers the MVP deployment shape for Settlex on one OCI Ubuntu VM.

## Current target

- Host: one OCI Ubuntu VM
- CPU architecture: `arm64`
- Reverse proxy: Caddy
- App services:
  - `web` for Next.js
  - `game` for the `boardgame.io` server
  - `postgres` for the product database
- Delivery path: GitHub Actions verifies the repo, syncs source to the VM over SSH, and asks the VM to rebuild `web` and `game` locally with Docker Compose

## Bot 005 beta option

The homepage's **Play Bot 005** action uses the direct-play SettleGraph/CTNN-v3
checkpoint. The ordinary **Play vs Bot** action remains Puffer. Production
enables the extra action with `SETTLEX_SETTLEGRAPH_V2_ENABLED=1`; the web image
also needs that value as `NEXT_PUBLIC_SETTLEX_SETTLEGRAPH_V2` at build time.

The release identity is pinned in `release/bot-model.json`. Keep the 3.8 MB
model outside Git and Docker images at
`/srv/settlex-models/incumbent-005/model.ctnn`, with SHA-256
`382a8708312d469efdbb7333891a3469bd204d46d85ec02e218e0c0b377437ca`. Compose
mounts `/srv/settlex-models` read-only into the game container. The Rust worker
is built from the locked native source in the game image; startup preflight
checks the exact model hash and V3 contract before the game server listens.
Pre-provision and verify the artifact before enabling the feature flag. If the
artifact or worker is missing or mismatched, startup fails closed before any
Bot 005 match can start. If inference fails during a match, the existing
recovery path logs the failure and falls back to Puffer for that decision.

The 005 policy is a beta opt-in and direct-play only. Its research manifest
still marks it as not production-selected, and its value output remains
unqualified; deploying this website option does not amend that research record.

## Cutover notes

For the current x86 -> ARM migration:

- keep the old VM running until the new ARM VM is verified
- use a fresh Postgres database on the new VM
- update the repository `OCI_HOST` secret to the new public IP only after the new VM is bootstrapped
- keep the raw-IP bootstrap shape for now:
  - `SITE_HOST=http://<public-ip>`
  - `PUBLIC_APP_URL=http://<public-ip>`
  - `NEXT_PUBLIC_GAME_SERVER_ORIGIN=http://<public-ip>`
- expect browser sessions to reset when the public IP changes

## Local development

Local development stays simple:

```bash
docker compose -f infra/docker-compose.local.yml up -d postgres
pnpm db:migrate
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
     - use `http://<public-ip>` during raw-IP bootstrap so Caddy serves plain HTTP
     - switch to the bare domain name once DNS exists and you want automatic HTTPS
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
Because the app images are built on the VM itself, repeated deploys benefit from Docker layer cache on the ARM host instead of rebuilding under emulation on GitHub.
The sync step uses `.gitignore` as an rsync filter, plus a few explicit excludes (`.git/`, `node_modules/`, `.next/`, `.env.prod`) so ignored caches and local-only junk do not get copied to the server.

## GitHub Actions secrets

Add these repository secrets before enabling automatic deploys:

- `OCI_HOST`
- `OCI_USER`
- `OCI_SSH_KEY`
- `OCI_APP_DIR`

## Automatic production deploy flow

After bootstrap, the normal release path is:

1. Push to `main`.
2. GitHub Actions runs `pnpm verify`.
3. If verification passes, Actions syncs the checked-out repo files to `/srv/settlex` over SSH.
4. Actions SSHes into the OCI VM.
5. The VM runs `infra/scripts/deploy-prod.sh`, which:
   - ensures `postgres` is running
   - rebuilds `web` and `game` locally with Docker Compose
   - keeps `caddy` running as the stable front door
   - runs `pnpm db:migrate` in the `web` container once that script exists in the repo

## Current limitation to remember

The existing Catana browser clients still have some hardcoded `:8000` / `:8080` assumptions. The one-host Caddy setup in this document is the target production shape, but the client env-driven transport cleanup from the accounts/replay plan still needs to land before public cutover.
