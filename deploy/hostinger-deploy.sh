#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env.production"
cd "$ROOT"
value() { sed -n "s/^$1=//p" "$ENV_FILE" | tail -n 1; }
fail() { echo "ERROR: $*" >&2; exit 1; }
command -v git >/dev/null || fail "git is required"
command -v docker >/dev/null || fail "docker is required"
command -v curl >/dev/null || fail "curl is required"
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is required"
if [[ ! -f "$ENV_FILE" ]]; then "$ROOT/deploy/hostinger-setup.sh"; fi
grep -q "^POSTGRES_PASSWORD=CHANGE_ME" "$ENV_FILE" && fail "Run deploy/hostinger-setup.sh to create real secrets."
APP_URL="$(value APP_URL)"
[[ "$APP_URL" == https://* ]] || fail "APP_URL must be HTTPS in production."
if [[ -z "$(value OPENAI_API_KEY)" && -z "$(value GEMINI_API_KEY)" ]]; then fail "At least one AI API key is required."; fi
for key in S3_ENDPOINT S3_BUCKET S3_ACCESS_KEY S3_SECRET_KEY S3_PUBLIC_URL; do
  current="$(value "$key")"
  [[ -n "$current" && "$current" != *"CHANGE_ME"* && "$current" != *"example.com"* ]] || fail "$key is not configured."
done
if ! git diff --quiet || ! git diff --cached --quiet; then
  fail "Tracked local changes exist. Commit or stash them before deployment; this script will not discard them."
fi
git fetch origin main
LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse origin/main)"
if [[ "$LOCAL_SHA" != "$REMOTE_SHA" ]]; then
  git merge-base --is-ancestor "$LOCAL_SHA" "$REMOTE_SHA" || fail "Local history diverged from origin/main. Resolve it manually; no force/reset will be used."
  git merge --ff-only "$REMOTE_SHA"
fi
STACK="$(value PURPO_STACK_NAME)"; STACK="${STACK:-purpo_prod}"
WEB_PORT="$(value PURPO_WEB_PORT)"; WEB_PORT="${WEB_PORT:-3187}"
export PURPO_IMAGE_TAG="$(git rev-parse --short=12 HEAD)"
DC=(docker compose --env-file "$ENV_FILE" --project-name "$STACK" -f deploy/hostinger-compose.yml)
mkdir -p .deploy/backups
echo "Validating isolated PURPO stack..."
"${DC[@]}" config >/dev/null
echo "Building immutable web and worker images for $PURPO_IMAGE_TAG..."
"${DC[@]}" build --pull web worker
echo "Starting only PURPO PostgreSQL and Redis (no host database ports are exposed)..."
"${DC[@]}" up -d postgres redis
for _ in $(seq 1 60); do
  if "${DC[@]}" exec -T postgres pg_isready -U purpo -d purpo >/dev/null 2>&1 && "${DC[@]}" exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then break; fi
  sleep 2
done
"${DC[@]}" exec -T postgres pg_isready -U purpo -d purpo >/dev/null || fail "PURPO PostgreSQL did not become healthy."
"${DC[@]}" exec -T redis redis-cli ping | grep -q PONG || fail "PURPO Redis did not become healthy."
BACKUP=".deploy/backups/purpo-$(date -u +%Y%m%dT%H%M%SZ).dump"
echo "Creating a pre-migration database backup at $BACKUP..."
"${DC[@]}" exec -T postgres pg_dump -U purpo -d purpo --format=custom > "$BACKUP"
echo "Applying forward-only Prisma migrations..."
"${DC[@]}" run --rm --no-deps worker node_modules/.bin/prisma migrate deploy
if [[ ! -f .deploy/seeded ]]; then
  echo "Running idempotent first-install seed data once..."
  "${DC[@]}" run --rm --no-deps worker node_modules/.bin/tsx prisma/seed.ts
  touch .deploy/seeded
fi
PREVIOUS_SUCCESS="$(cat .deploy/current-image-tag 2>/dev/null || true)"
echo "Starting the new PURPO web and worker containers..."
"${DC[@]}" up -d web worker
HEALTH="http://127.0.0.1:${WEB_PORT}/api/health"
healthy=0
for _ in $(seq 1 60); do
  if curl --fail --silent --show-error "$HEALTH" >/dev/null 2>&1; then healthy=1; break; fi
  sleep 2
done
[[ "$healthy" == 1 ]] || fail "Health check failed at $HEALTH. Existing database backup is $BACKUP; no other stack was modified."
if [[ -n "$PREVIOUS_SUCCESS" ]]; then echo "$PREVIOUS_SUCCESS" > .deploy/previous-image-tag; fi
echo "$PURPO_IMAGE_TAG" > .deploy/current-image-tag
echo "PURPO deployment succeeded."
echo "Commit: $(git rev-parse HEAD)"
echo "Local health: $HEALTH"
echo "Only 127.0.0.1:${WEB_PORT} is exposed. Configure a dedicated HTTPS nginx vhost using deploy/nginx.conf.example."
