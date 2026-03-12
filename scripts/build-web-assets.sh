#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT_DIR/web"
EMBED_DIST_DIR="$ROOT_DIR/server/internal/ui/dist"

echo "[1/2] Building web static assets..."
(
  cd "$WEB_DIR"
  npm ci
  VITE_BASE_PATH="${VITE_BASE_PATH:-/}" VITE_ADMIN_API_BASE= npm run build
)

echo "[2/2] Syncing web assets into server embed directory..."
rm -rf "$EMBED_DIST_DIR"
mkdir -p "$EMBED_DIST_DIR"
cp -R "$WEB_DIR/dist/." "$EMBED_DIST_DIR/"
printf "placeholder\n" > "$EMBED_DIST_DIR/.keep"

echo "Web assets ready for embedding."
