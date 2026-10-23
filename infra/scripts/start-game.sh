#!/usr/bin/env sh
set -eu

# Apply the image default only after honoring canonical or legacy runtime config.
export SETTLEHEX_SETTLEGRAPH_V2_WORKER="${SETTLEHEX_SETTLEGRAPH_V2_WORKER-${SETTLEX_SETTLEGRAPH_V2_WORKER-/usr/local/bin/settlegraph-v2-worker}}"

node scripts/bots/check-production-bot.mjs
exec node server/server.js
