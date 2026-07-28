#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="infra/docker-compose.prod.yml"
HEALTH_URL="${SETTLEX_HEALTH_URL:-https://settlehex.com}"

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

if [ -z "${SETTLEX_BUILD_SHA:-}" ]; then
  if git rev-parse --short=12 HEAD >/dev/null 2>&1; then
    SETTLEX_BUILD_SHA="$(git rev-parse --short=12 HEAD)"
  else
    SETTLEX_BUILD_SHA="local"
  fi
fi

SETTLEX_BUILD_DATE="${SETTLEX_BUILD_DATE:-$(date -u +"%Y-%m-%dT%H:%M:%SZ")}"

if [ -z "${SETTLEX_RELEASE_VERSION:-}" ]; then
  if command -v node >/dev/null 2>&1; then
    SETTLEX_RELEASE_VERSION="$(node scripts/release/read-release-notes.mjs)"
  else
    SETTLEX_RELEASE_VERSION="$(
      sed -n 's/.*"currentVersion"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' release/release-notes.json | head -n 1
    )"
  fi
fi

if [ -z "${SETTLEX_RELEASE_VERSION:-}" ]; then
  echo "Could not determine SETTLEX_RELEASE_VERSION." >&2
  exit 1
fi

export SETTLEX_BUILD_SHA
export SETTLEX_BUILD_DATE
export SETTLEX_RELEASE_VERSION

docker compose -f "$COMPOSE_FILE" up -d postgres
docker compose -f "$COMPOSE_FILE" up -d --build web game
docker compose -f "$COMPOSE_FILE" up -d proxy --remove-orphans

if docker compose -f "$COMPOSE_FILE" exec -T web node -e "const pkg=require('./package.json'); process.exit(pkg.scripts && pkg.scripts['db:migrate'] ? 0 : 1)"; then
  docker compose -f "$COMPOSE_FILE" exec -T web pnpm db:migrate
else
  echo "Skipping db:migrate because the script is not defined yet."
fi

curl --fail --silent --show-error --location "$HEALTH_URL" >/dev/null
echo "Live health check passed: ${HEALTH_URL}"
