#!/usr/bin/env bash
# ==============================================================================
# Hi-AQLI Tikrar WhatsApp Cron Runner
# ==============================================================================
# Dipanggil oleh crontab di VPS untuk memicu /api/cron/tikrar-reminder tanpa
# mengekspos CRON_SECRET di crontab atau daftar proses (`ps aux`).
#
# Penggunaan:
#   ./scripts/run-tikrar-cron.sh morning
#   ./scripts/run-tikrar-cron.sh evening
#   ./scripts/run-tikrar-cron.sh friday_weekly
#   ./scripts/run-tikrar-cron.sh morning --dry-run
# ==============================================================================

set -euo pipefail

MODE="${1:-}"
EXTRA_FLAG="${2:-}"

case "$MODE" in
  morning|evening|friday_weekly) ;;
  *)
    echo "Usage: $0 <morning|evening|friday_weekly> [--dry-run]" >&2
    exit 1
    ;;
esac

DRY_RUN_QUERY=""
if [ "$EXTRA_FLAG" = "--dry-run" ]; then
  DRY_RUN_QUERY="&dryRun=true"
fi

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

read_env_var() {
  local key="$1"
  local f val=""
  for f in ".env.production.local" ".env.local" ".env.production" ".env"; do
    if [ -f "$APP_DIR/$f" ]; then
      val="$(awk -v k="$key" '
        BEGIN { found = 0; out = "" }
        {
          line = $0
          sub(/\r$/, "", line)
          pat = "^[[:space:]]*(export[[:space:]]+)?" k "[[:space:]]*="
          if (line ~ pat) {
            found = 1
            sub(pat, "", line)
            sub(/^[[:space:]]+/, "", line)
            sub(/[[:space:]]+$/, "", line)
            if ((line ~ /^".*"$/) || (line ~ /^'\''.*'\''$/)) {
              line = substr(line, 2, length(line) - 2)
            } else {
              sub(/[[:space:]]+#.*$/, "", line)
            }
            out = line
          }
        }
        END { if (found) print out }
      ' "$APP_DIR/$f")"
      if [ -n "$val" ]; then
        printf '%s' "$val"
        return 0
      fi
    fi
  done
  return 1
}

CRON_SECRET_VAL="$(read_env_var "CRON_SECRET" || true)"
if [ -z "$CRON_SECRET_VAL" ]; then
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] ERROR: CRON_SECRET tidak ditemukan di $APP_DIR/.env*" >&2
  exit 1
fi

ENV_PORT_VAL="$(read_env_var "PORT" || true)"
APP_PORT_VAL="${APP_PORT:-${ENV_PORT_VAL:-3001}}"

LOG_DIR="${HOME}/logs"
mkdir -p "$LOG_DIR"
chmod 700 "$LOG_DIR"
LOG_FILE="${LOG_DIR}/tikrar-cron.log"

TARGET_URL="http://127.0.0.1:${APP_PORT_VAL}/api/cron/tikrar-reminder?mode=${MODE}${DRY_RUN_QUERY}"
TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

HTTP_AND_BODY="$(
  printf 'header = "Authorization: Bearer %s"\nurl = "%s"\n' "$CRON_SECRET_VAL" "$TARGET_URL" \
    | curl --silent --show-error --max-time 120 --write-out "\n%{http_code}" --config -
)"

HTTP_CODE="$(printf '%s' "$HTTP_AND_BODY" | tail -n1)"
RESPONSE="$(printf '%s' "$HTTP_AND_BODY" | sed '$d')"

printf '[%s] mode=%s http=%s dry_run=%s response=%s\n' \
  "$TS" \
  "$MODE" \
  "$HTTP_CODE" \
  "$([ -n "$DRY_RUN_QUERY" ] && echo "true" || echo "false")" \
  "$RESPONSE" >> "$LOG_FILE"

if [ -n "$DRY_RUN_QUERY" ]; then
  printf '%s\n' "$RESPONSE"
fi

if [ "$HTTP_CODE" != "200" ]; then
  echo "[${TS}] ERROR: /api/cron/tikrar-reminder returned HTTP ${HTTP_CODE}" >&2
  exit 1
fi
