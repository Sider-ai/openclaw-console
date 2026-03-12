#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_DIR="$ROOT_DIR/scripts"
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

"$SCRIPT_DIR/build-web-assets.sh"

echo "[3/3] Building server binary..."
mkdir -p "$BIN_DIR"
(
  cd "$ROOT_DIR/server"
  echo "Building target: ${TARGET_OS}/${TARGET_ARCH}"
  go build -trimpath -ldflags="-s -w" -o "$BIN_PATH" ./cmd/server
)

echo "Done: $BIN_PATH"
