#!/usr/bin/env sh
set -eu

node scripts/bots/check-production-bot.mjs
exec node server/server.js
