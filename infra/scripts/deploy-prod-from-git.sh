#!/usr/bin/env bash

set -euo pipefail

if [ -n "${SETTLEX_ROOT_DIR:-}" ]; then
  ROOT_DIR="$SETTLEX_ROOT_DIR"
elif [ -f infra/docker-compose.prod.yml ] && [ -f release/release-notes.json ]; then
  ROOT_DIR="$(pwd)"
else
  ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
fi
COMPOSE_FILE="infra/docker-compose.prod.yml"
REMOTE="${SETTLEX_DEPLOY_REMOTE:-origin}"
BRANCH="${SETTLEX_DEPLOY_BRANCH:-main}"
REPO_URL="${SETTLEX_DEPLOY_REPO_URL:-https://github.com/fortydegrees/settlex.git}"
HEALTH_URL="${SETTLEX_HEALTH_URL:-https://settlehex.com}"

cd "$ROOT_DIR"

if [ ! -f .env.prod ]; then
  echo "Missing .env.prod in ${ROOT_DIR}." >&2
  exit 1
fi

ensure_git_checkout() {
  if [ ! -d .git ]; then
    echo "Initializing Git checkout in ${ROOT_DIR}."
    git init
  fi

  if ! git remote get-url "$REMOTE" >/dev/null 2>&1; then
    git remote add "$REMOTE" "$REPO_URL"
  fi
}

get_env_value() {
  local key="$1"
  sed -n "s/^${key}=//p" .env.prod | tail -n 1
}

require_env_key() {
  local key="$1"
  local value
  value="$(get_env_value "$key")"
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

ensure_git_checkout

has_head=false
if git rev-parse --verify HEAD >/dev/null 2>&1; then
  has_head=true
else
  # A pre-existing source tree may have stale untracked files. Preserve only
  # production configuration and backups before adopting the Git checkout.
  git clean -fdx -e .env.prod -e '.env.prod.backup-*' -e backups/
fi

if [ "$has_head" = true ]; then
  if ! git diff --quiet --ignore-submodules -- ||
    ! git diff --cached --quiet --ignore-submodules --; then
    echo "Production checkout has tracked local changes; refusing to overwrite them." >&2
    git status --short >&2
    exit 1
  fi
fi

old_sha=""
if [ "$has_head" = true ]; then
  old_sha="$(git rev-parse HEAD)"
fi
git fetch "$REMOTE" "$BRANCH"
new_sha="$(git rev-parse "${REMOTE}/${BRANCH}")"

backup_database() {
  local postgres_user postgres_db backup_dir backup_path short_sha
  postgres_user="$(get_env_value POSTGRES_USER)"
  postgres_db="$(get_env_value POSTGRES_DB)"
  backup_dir="${SETTLEX_DB_BACKUP_DIR:-backups}"
  short_sha="${new_sha:0:12}"
  backup_path="${backup_dir}/prod-before-${short_sha}-$(date -u +"%Y%m%dT%H%M%SZ").sql"

  mkdir -p "$backup_dir"
  docker compose -f "$COMPOSE_FILE" up -d postgres
  docker compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_dump -U "$postgres_user" "$postgres_db" > "$backup_path"
  echo "Wrote database backup: ${backup_path}"
}

if [ -z "$old_sha" ]; then
  backup_database
elif [ "$old_sha" != "$new_sha" ]; then
  changed_paths="$(git diff --name-only "$old_sha" "$new_sha" --)"
  if printf "%s\n" "$changed_paths" |
    grep -Eq "^(lib/server/db/sql/|scripts/db/|package.json|pnpm-lock.yaml)"; then
    backup_database
  fi
fi

git reset --hard "$new_sha"

export SETTLEX_BUILD_SHA="$new_sha"
export SETTLEX_BUILD_DATE="${SETTLEX_BUILD_DATE:-$(date -u +"%Y-%m-%dT%H:%M:%SZ")}"

infra/scripts/deploy-prod.sh

docker compose -f "$COMPOSE_FILE" ps
curl --fail --silent --show-error --location "$HEALTH_URL" >/dev/null
echo "Live health check passed: ${HEALTH_URL}"
