#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/root/apps/tasty-banana-v2"
BRANCH="feature/self-host"

cd "$APP_DIR"

echo "[deploy] Updating source..."
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "[deploy] Installing server deps..."
cd "$APP_DIR/server"
npm ci

echo "[deploy] Installing client deps + build..."
cd "$APP_DIR/client"
npm ci
npm run build

echo "[deploy] Restarting PM2 services..."
cd "$APP_DIR"
pm2 describe tasty-banana-server >/dev/null 2>&1 || pm2 start "npm run start" --name tasty-banana-server --cwd "$APP_DIR/server" --update-env
pm2 describe tasty-banana-client >/dev/null 2>&1 || pm2 start "npm run start" --name tasty-banana-client --cwd "$APP_DIR/client" --update-env
pm2 restart tasty-banana-server --update-env
pm2 restart tasty-banana-client --update-env
pm2 save

echo "[deploy] Done"
