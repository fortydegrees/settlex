#!/usr/bin/env bash

set -euo pipefail

# Normalize only legacy names that have no canonical counterpart.
while IFS= read -r legacy_name; do
  canonical_name="${legacy_name/SETTLEX_/SETTLEHEX_}"
  if ! declare -p "$canonical_name" >/dev/null 2>&1; then
    export "$canonical_name=${!legacy_name}"
  fi
done < <(compgen -v SETTLEX_)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="infra/docker-compose.prod.yml"
HEALTH_URL="${SETTLEHEX_HEALTH_URL:-https://settlehex.com}"
HEALTH_BASE_URL="${HEALTH_URL%/}"

cd "$ROOT_DIR"

require_env_key() {
  local key="$1"
  local value=""
  if [ -f .env.prod ]; then
    value="$(sed -n "s/^${key}=//p" .env.prod | tail -n 1)"
  fi
  if [[ ! "$value" =~ [^[:space:]] ]]; then
    echo "Missing required production env key in .env.prod: ${key}" >&2
    exit 1
  fi
}

required_env_keys=(
  DATABASE_URL
  POSTGRES_DB
  POSTGRES_USER
  POSTGRES_PASSWORD
  PUBLIC_APP_URL
  NEXT_PUBLIC_GAME_SERVER_ORIGIN
  GAME_SERVER_INTERNAL_URL
  SITE_HOST
  SESSION_SECRET
  BETTER_AUTH_SECRET
  BETTER_AUTH_URL
  VAPID_SUBJECT
  VAPID_PUBLIC_KEY
  VAPID_PRIVATE_KEY
)

for key in "${required_env_keys[@]}"; do
  require_env_key "$key"
done

if [ -z "${SETTLEHEX_BUILD_SHA:-}" ]; then
  if git rev-parse --short=12 HEAD >/dev/null 2>&1; then
    SETTLEHEX_BUILD_SHA="$(git rev-parse --short=12 HEAD)"
  else
    SETTLEHEX_BUILD_SHA="local"
  fi
fi

SETTLEHEX_BUILD_DATE="${SETTLEHEX_BUILD_DATE:-$(date -u +"%Y-%m-%dT%H:%M:%SZ")}"

if [ -z "${SETTLEHEX_RELEASE_VERSION:-}" ]; then
  if command -v node >/dev/null 2>&1; then
    SETTLEHEX_RELEASE_VERSION="$(node scripts/release/read-release-notes.mjs)"
  else
    SETTLEHEX_RELEASE_VERSION="$(
      sed -n 's/.*"currentVersion"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' release/release-notes.json | head -n 1
    )"
  fi
fi

if [ -z "${SETTLEHEX_RELEASE_VERSION:-}" ]; then
  echo "Could not determine SETTLEHEX_RELEASE_VERSION." >&2
  exit 1
fi

export SETTLEHEX_BUILD_SHA
export SETTLEHEX_BUILD_DATE
export SETTLEHEX_RELEASE_VERSION

compose() {
  docker compose --env-file .env.prod -f "$COMPOSE_FILE" "$@"
}

# Build and authenticate the candidate before touching running app services.
compose build web game
compose run --rm --no-deps game node scripts/bots/check-production-bot.mjs

compose up -d --wait postgres
backup_dir="${SETTLEHEX_DB_BACKUP_DIR:-backups}"
mkdir -p "$backup_dir"
backup_path="${backup_dir}/prod-before-$(date -u +"%Y%m%dT%H%M%SZ")-$$.sql"
(umask 077; compose exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "${backup_path}.tmp")
mv "${backup_path}.tmp" "$backup_path"
echo "Wrote database backup: ${backup_path}"

# Apply additive migrations before the new API routes begin serving.
compose run --rm --no-deps web pnpm db:migrate
compose up -d --no-build web game
compose up -d --force-recreate proxy --remove-orphans
compose exec -T -w /etc/caddy proxy \
  caddy reload --config /etc/caddy/Caddyfile

curl --fail --silent --show-error --location "$HEALTH_BASE_URL" >/dev/null
curl --fail --silent --show-error --location \
  "$HEALTH_BASE_URL/api/auth/options" >/dev/null
curl --fail --silent --show-error --location \
  "$HEALTH_BASE_URL/socket.io/?EIO=4&transport=polling" >/dev/null
curl --fail --silent --show-error --request OPTIONS \
  "$HEALTH_BASE_URL/timer/settlehex-route-check" >/dev/null
curl --fail --silent --show-error --request OPTIONS \
  "$HEALTH_BASE_URL/idle/settlehex-route-check/ack" >/dev/null
echo "Live health check passed: ${HEALTH_URL}"
