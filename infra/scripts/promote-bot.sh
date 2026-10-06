#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
if [[ $# != 3 ]]; then
  echo 'Usage: infra/scripts/promote-bot.sh /absolute/model.ctnn CHECKPOINT SHA256' >&2
  exit 2
fi
source_model="$1"
checkpoint="$2"
expected_sha="$3"
[[ -f .env.prod && -r "$source_model" ]] || { echo 'Require .env.prod and a readable model file.' >&2; exit 2; }
source_dir="$(cd "$(dirname "$source_model")" && pwd)"
source_name="$(basename "$source_model")"
override="$(mktemp)"
cat > "$override" <<'YAML'
services:
  game:
    volumes:
      - type: bind
        source: ${SETTLEX_BOT_MODELS_DIR:-/srv/settlex-models}
        target: /opt/settlex/models
        read_only: false
        bind:
          create_host_path: false
YAML
compose() { docker compose --env-file .env.prod -f infra/docker-compose.prod.yml "$@"; }
write_selection() {
  docker compose --env-file .env.prod -f infra/docker-compose.prod.yml -f "$override" run --rm --no-deps \
    --volume "$source_dir:/opt/settlex/candidate:ro" game node scripts/bots/promote.mjs \
    --directory /opt/settlex/models "$@"
}
stopped=0
activated=0
finish() {
  local status=$?
  trap - EXIT
  if [[ "$status" != 0 && "$activated" == 1 ]]; then
    echo 'Activation failed; restoring the previous verified selection.' >&2
    write_selection --rollback || { echo 'Rollback failed; inspect the preserved model selections.' >&2; status=1; }
  fi
  if [[ "$stopped" == 1 ]]; then
    compose up -d --no-build web game || status=1
  fi
  rm -f "$override"
  exit "$status"
}
trap finish EXIT
# Require a verified existing selection before replacing it.
compose run --rm --no-deps game node scripts/bots/check-production-bot.mjs
stopped=1
compose stop web game
write_selection --model "/opt/settlex/candidate/$source_name" --checkpoint "$checkpoint" --sha256 "$expected_sha"
activated=1
compose run --rm --no-deps game node scripts/bots/check-production-bot.mjs
compose up -d --no-build web game
compose exec -T game node scripts/bots/check-production-bot.mjs
stopped=0
echo "Bot $checkpoint activated using the existing images."
