#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="infra/docker-compose.prod.yml"

cd "$ROOT_DIR"

docker compose -f "$COMPOSE_FILE" up -d postgres
docker compose -f "$COMPOSE_FILE" up -d --build web game
docker compose -f "$COMPOSE_FILE" up -d proxy --remove-orphans

if docker compose -f "$COMPOSE_FILE" exec -T web node -e "const pkg=require('./package.json'); process.exit(pkg.scripts && pkg.scripts['db:migrate'] ? 0 : 1)"; then
  docker compose -f "$COMPOSE_FILE" exec -T web pnpm db:migrate
else
  echo "Skipping db:migrate because the script is not defined yet."
fi
