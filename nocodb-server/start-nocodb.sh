#!/usr/bin/env bash
# Start the npm-based NocoDB used by my-shop (no Docker needed).
# Serves the "EntertainmentGuild" base on http://localhost:8090
# Data lives in ./nocodb/data-npm/noco.db  (the old Docker noco.db is left untouched).
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

# First run only: install runner deps (nocodb + express).
if [ ! -d "$DIR/runner/node_modules/nocodb" ]; then
  echo "Installing NocoDB (first run, this downloads a lot)..."
  (cd "$DIR/runner" && npm install --no-audit --no-fund)
fi

export NC_TOOL_DIR="$DIR/nocodb/data-npm"
export PORT=8090
export NC_DISABLE_TELE=true
export NC_ADMIN_EMAIL=admin@shop.local
export NC_ADMIN_PASSWORD='Admin@12345'

echo "Starting NocoDB -> http://localhost:8090  (Ctrl+C to stop)"
cd "$DIR/runner"
node server.js
