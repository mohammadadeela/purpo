#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env.production"
cd "$ROOT"
[[ -f "$ENV_FILE" ]] || { echo "Missing .env.production" >&2; exit 1; }
[[ -f .deploy/previous-image-tag ]] || { echo "No previous successful image tag is recorded." >&2; exit 1; }
value() { sed -n "s/^$1=//p" "$ENV_FILE" | tail -n 1; }
STACK="$(value PURPO_STACK_NAME)"; STACK="${STACK:-purpo_prod}"
WEB_PORT="$(value PURPO_WEB_PORT)"; WEB_PORT="${WEB_PORT:-3187}"
CURRENT="$(cat .deploy/current-image-tag 2>/dev/null || true)"
PREVIOUS="$(cat .deploy/previous-image-tag)"
export PURPO_IMAGE_TAG="$PREVIOUS"
DC=(docker compose --env-file "$ENV_FILE" --project-name "$STACK" -f deploy/hostinger-compose.yml)
echo "Rolling application containers back from ${CURRENT:-unknown} to $PREVIOUS."
echo "Database migrations are intentionally not reversed automatically."
"${DC[@]}" up -d web worker
curl --fail --retry 30 --retry-delay 2 "http://127.0.0.1:${WEB_PORT}/api/health"
echo "$PREVIOUS" > .deploy/current-image-tag
if [[ -n "$CURRENT" ]]; then echo "$CURRENT" > .deploy/previous-image-tag; fi
echo "Application rollback completed."
