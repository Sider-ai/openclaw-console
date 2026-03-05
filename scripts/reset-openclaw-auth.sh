#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Reset OpenClaw auth profiles safely (with backup).

Usage:
  $(basename "$0") [options]

Options:
  --provider <id>   openai | openai-codex | all (default: openai)
  --profile <name>  Pass-through to openclaw --profile <name>
  --dev             Pass-through to openclaw --dev
  --dry-run         Show what would change without writing files
  --no-restart      Do not run 'openclaw gateway restart'
  -y, --yes         Skip confirmation prompt
  -h, --help        Show this help

Examples:
  $(basename "$0") --provider openai -y
  $(basename "$0") --provider openai-codex --dry-run
  $(basename "$0") --provider all --profile prod -y
USAGE
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[error] missing required command: $1" >&2
    exit 1
  fi
}

PROVIDER="openai"
DRY_RUN=0
RESTART=1
ASSUME_YES=0
OC_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --provider)
      [[ $# -ge 2 ]] || { echo "[error] --provider requires a value" >&2; exit 1; }
      PROVIDER="$2"
      shift 2
      ;;
    --profile)
      [[ $# -ge 2 ]] || { echo "[error] --profile requires a value" >&2; exit 1; }
      OC_ARGS+=("--profile" "$2")
      shift 2
      ;;
    --dev)
      OC_ARGS+=("--dev")
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --no-restart)
      RESTART=0
      shift
      ;;
    -y|--yes)
      ASSUME_YES=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[error] unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

case "$PROVIDER" in
  openai|openai-codex|all) ;;
  *)
    echo "[error] unsupported provider: $PROVIDER" >&2
    echo "        expected: openai | openai-codex | all" >&2
    exit 1
    ;;
esac

require_cmd openclaw
require_cmd jq

oc() {
  if [[ ${#OC_ARGS[@]} -gt 0 ]]; then
    openclaw "${OC_ARGS[@]}" "$@"
  else
    openclaw "$@"
  fi
}

expand_home() {
  local p="$1"
  if [[ "$p" == ~* ]]; then
    printf '%s\n' "${p/#\~/$HOME}"
  else
    printf '%s\n' "$p"
  fi
}

AUTH_STORE="$(oc models status --json | jq -r '.auth.storePath // empty')"
if [[ -z "$AUTH_STORE" || "$AUTH_STORE" == "null" ]]; then
  echo "[error] cannot resolve auth store path from 'openclaw models status --json'" >&2
  exit 1
fi

CONFIG_FILE_RAW="$(oc config file | tr -d '\r')"
CONFIG_FILE="$(expand_home "$CONFIG_FILE_RAW")"

if [[ ! -f "$AUTH_STORE" ]]; then
  echo "[error] auth store not found: $AUTH_STORE" >&2
  exit 1
fi
if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "[error] config file not found: $CONFIG_FILE" >&2
  exit 1
fi

if [[ "$PROVIDER" == "all" ]]; then
  AUTH_TARGETS="$(jq -r '.profiles // {} | keys[]?' "$AUTH_STORE" || true)"
  CFG_TARGETS="$(jq -r '.auth.profiles // {} | keys[]?' "$CONFIG_FILE" || true)"
else
  AUTH_TARGETS="$(jq -r --arg p "$PROVIDER" '.profiles // {} | to_entries[] | select(.value.provider == $p) | .key' "$AUTH_STORE" || true)"
  CFG_TARGETS="$(jq -r --arg p "$PROVIDER" '.auth.profiles // {} | to_entries[] | select(.value.provider == $p) | .key' "$CONFIG_FILE" || true)"
fi

echo "[info] provider: $PROVIDER"
echo "[info] auth store: $AUTH_STORE"
echo "[info] config file: $CONFIG_FILE"

echo "[info] profiles to remove from auth store:"
if [[ -n "$AUTH_TARGETS" ]]; then
  printf '  - %s\n' $AUTH_TARGETS
else
  echo "  (none)"
fi

echo "[info] profiles to remove from config:"
if [[ -n "$CFG_TARGETS" ]]; then
  printf '  - %s\n' $CFG_TARGETS
else
  echo "  (none)"
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[dry-run] no files were changed"
  exit 0
fi

if [[ "$ASSUME_YES" -ne 1 ]]; then
  read -r -p "Proceed with reset? [y/N] " ans
  case "$ans" in
    y|Y|yes|YES) ;;
    *)
      echo "[info] cancelled"
      exit 0
      ;;
  esac
fi

TS="$(date +%Y%m%d-%H%M%S)"
AUTH_BAK="${AUTH_STORE}.bak.${TS}"
CFG_BAK="${CONFIG_FILE}.bak.${TS}"

cp "$AUTH_STORE" "$AUTH_BAK"
cp "$CONFIG_FILE" "$CFG_BAK"
echo "[info] backup created:"
echo "  - $AUTH_BAK"
echo "  - $CFG_BAK"

TMP1="$(mktemp)"
TMP2="$(mktemp)"
cleanup() {
  rm -f "$TMP1" "$TMP2"
}
trap cleanup EXIT

if [[ "$PROVIDER" == "all" ]]; then
  jq '
    .profiles = {}
    | .usageStats = {}
  ' "$AUTH_STORE" > "$TMP1"

  jq '
    .auth = (.auth // {})
    | .auth.profiles = {}
  ' "$CONFIG_FILE" > "$TMP2"
else
  jq --arg p "$PROVIDER" '
    .profiles |= with_entries(select(.value.provider != $p))
    | .usageStats |= (
        if type == "object" then
          with_entries(select((.key | startswith($p + ":")) | not))
        else
          .
        end
      )
  ' "$AUTH_STORE" > "$TMP1"

  jq --arg p "$PROVIDER" '
    .auth = (.auth // {})
    | .auth.profiles = (
        if (.auth.profiles | type) == "object" then
          (.auth.profiles | with_entries(select(.value.provider != $p)))
        else
          {}
        end
      )
  ' "$CONFIG_FILE" > "$TMP2"
fi

mv "$TMP1" "$AUTH_STORE"
mv "$TMP2" "$CONFIG_FILE"
echo "[info] auth reset complete"

if [[ "$RESTART" -eq 1 ]]; then
  if oc gateway restart; then
    echo "[info] gateway restarted"
  else
    OC_ARG_STR=""
    if [[ ${#OC_ARGS[@]} -gt 0 ]]; then
      OC_ARG_STR="${OC_ARGS[*]} "
    fi
    echo "[warn] gateway restart failed; you can restart manually:" >&2
    echo "       openclaw ${OC_ARG_STR}gateway restart" >&2
  fi
else
  echo "[info] skipped gateway restart (--no-restart)"
fi

echo "[info] current auth providers:"
oc models status --json | jq '.auth.providers'
