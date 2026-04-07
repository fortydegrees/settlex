#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="infra/docker-compose.prod.yml"

cd "$ROOT_DIR"

: "${WEB_IMAGE:?WEB_IMAGE must be set}"
: "${GAME_IMAGE:?GAME_IMAGE must be set}"

export WEB_IMAGE
export GAME_IMAGE

docker compose -f infra/docker-compose.prod.yml pull
docker compose -f infra/docker-compose.prod.yml up -d --remove-orphans
docker compose -f infra/docker-compose.prod.yml exec -T web pnpm db:migrate

