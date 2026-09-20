#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env.production"
cd "$ROOT"
umask 077
if [[ -f "$ENV_FILE" ]]; then
  echo "Keeping existing $ENV_FILE; no secrets were changed."
  exit 0
fi
command -v openssl >/dev/null || { echo "openssl is required." >&2; exit 1; }
read -r -p "Public HTTPS URL for PURPO (example: https://purpo.example.com): " APP_URL
[[ "$APP_URL" == https://* ]] || { echo "APP_URL must start with https:// for production sessions." >&2; exit 1; }
read -r -s -p "OpenAI API key (leave blank if using Gemini): " OPENAI_API_KEY; echo
read -r -s -p "Gemini API key (leave blank if using OpenAI): " GEMINI_API_KEY; echo
if [[ -z "$OPENAI_API_KEY" && -z "$GEMINI_API_KEY" ]]; then echo "At least one AI provider key is required for real builds." >&2; exit 1; fi
read -r -p "S3-compatible endpoint (https://...): " S3_ENDPOINT
[[ "$S3_ENDPOINT" == https://* ]] || { echo "Use an HTTPS S3-compatible endpoint reachable by users for presigned uploads." >&2; exit 1; }
read -r -p "S3 region [us-east-1]: " S3_REGION; S3_REGION="${S3_REGION:-us-east-1}"
read -r -p "S3 bucket: " S3_BUCKET
read -r -s -p "S3 access key: " S3_ACCESS_KEY; echo
read -r -s -p "S3 secret key: " S3_SECRET_KEY; echo
read -r -p "Public storage URL (https://...): " S3_PUBLIC_URL
[[ "$S3_PUBLIC_URL" == https://* ]] || { echo "S3_PUBLIC_URL must start with https://." >&2; exit 1; }
read -r -s -p "Stripe secret key (optional; Enter to configure later): " STRIPE_SECRET_KEY; echo
read -r -s -p "Stripe webhook secret (optional): " STRIPE_WEBHOOK_SECRET; echo
read -r -p "Stripe Pro monthly price ID (optional): " STRIPE_PRICE_PRO_MONTHLY
read -r -p "Stripe Pro annual price ID (optional): " STRIPE_PRICE_PRO_ANNUAL
read -r -p "Admin email [mohammad.adeela@gmail.com]: " ADMIN_EMAIL; ADMIN_EMAIL="${ADMIN_EMAIL:-mohammad.adeela@gmail.com}"
POSTGRES_PASSWORD="$(openssl rand -hex 24)"
SESSION_SECRET="$(openssl rand -hex 48)"
ENCRYPTION_MASTER_KEY="$(openssl rand -base64 32 | tr -d '\n')"
cat > "$ENV_FILE" <<EOF
NODE_ENV=production
APP_URL=$APP_URL
PURPO_STACK_NAME=purpo_prod
PURPO_WEB_PORT=3187
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
SESSION_SECRET=$SESSION_SECRET
ENCRYPTION_MASTER_KEY=$ENCRYPTION_MASTER_KEY
OPENAI_API_KEY=$OPENAI_API_KEY
OPENAI_DEFAULT_MODEL=gpt-5
OPENAI_IMAGE_MODEL=gpt-image-1
GEMINI_API_KEY=$GEMINI_API_KEY
GEMINI_DEFAULT_MODEL=gemini-2.5-pro
GEMINI_VIDEO_MODEL=veo-3.1-generate-preview
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_PRO_MONTHLY=$STRIPE_PRICE_PRO_MONTHLY
STRIPE_PRICE_PRO_ANNUAL=$STRIPE_PRICE_PRO_ANNUAL
S3_ENDPOINT=$S3_ENDPOINT
S3_REGION=$S3_REGION
S3_BUCKET=$S3_BUCKET
S3_ACCESS_KEY=$S3_ACCESS_KEY
S3_SECRET_KEY=$S3_SECRET_KEY
S3_PUBLIC_URL=$S3_PUBLIC_URL
ADMIN_EMAIL=$ADMIN_EMAIL
EOF
chmod 600 "$ENV_FILE"
echo "Created $ENV_FILE with generated database and encryption secrets."
echo "The file is git-ignored. Back it up securely before storing production data."
