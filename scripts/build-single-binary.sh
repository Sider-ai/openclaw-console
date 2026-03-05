#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_UI_DIR="$ROOT_DIR/web-ui"
EMBED_DIST_DIR="$ROOT_DIR/admin-api/internal/ui/dist"
BIN_DIR="$ROOT_DIR/dist"
TARGET_OS="${GOOS:-$(go env GOOS)}"
TARGET_ARCH="${GOARCH:-$(go env GOARCH)}"

if [[ -n "${GOOS:-}" || -n "${GOARCH:-}" ]]; then
  BIN_NAME="openclaw-console-${TARGET_OS}-${TARGET_ARCH}"
else
  BIN_NAME="openclaw-console"
fi

BIN_PATH="$BIN_DIR/$BIN_NAME"

command -v go >/dev/null 2>&1 || {
  echo "go is required but not found in PATH" >&2
  exit 1
}

command -v npm >/dev/null 2>&1 || {
  echo "npm is required but not found in PATH" >&2
  exit 1
}

echo "[1/3] Building web-ui static assets..."
(
  cd "$WEB_UI_DIR"
  npm ci
  NEXT_PUBLIC_ADMIN_API_BASE= npm run build
)

echo "[2/3] Syncing web-ui assets into admin-api embed directory..."
rm -rf "$EMBED_DIST_DIR"
mkdir -p "$EMBED_DIST_DIR"
cp -R "$WEB_UI_DIR/out/." "$EMBED_DIST_DIR/"
printf "placeholder\n" > "$EMBED_DIST_DIR/.keep"

echo "[3/3] Building admin-api binary..."
mkdir -p "$BIN_DIR"
(
  cd "$ROOT_DIR/admin-api"
  echo "Building target: ${TARGET_OS}/${TARGET_ARCH}"
  go build -o "$BIN_PATH" ./cmd/server
)

echo "Done: $BIN_PATH"
