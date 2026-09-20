# PURPO

PURPO is an AI-native product creation operating system. A user describes an outcome; PURPO plans the product, builds interactive source files, maintains project intelligence, versions changes, manages assets and integrations, accounts for provider cost, and deploys verified releases.

This repository is a production-oriented foundation, not a static UI demo. Features represented in the interface are backed by PostgreSQL services and authorization checks. External AI, billing, storage, and Hostinger actions require real credentials in server environment variables and fail clearly when they are not configured.

## Included

- premium responsive marketing, onboarding, workspace, project studio, settings, support, and admin interfaces
- password authentication, secure revocable sessions, organization/project roles, and admin authorization
- 38-table PostgreSQL model for product memory, files, versions, AI, prompts, jobs, assets, automations, billing, credits, deployment, analytics, support, and audit logs
- OpenAI/Gemini provider abstraction and centrally configurable model routing
- staged durable build agent with live persisted state, idempotent jobs, immutable versions, integrity checks, and real preview files
- sandboxed interactive preview, source browser/search, immutable checkpoints, restoration API, and secret-free ZIP handoff
- S3-compatible verified uploads and asset metadata
- encrypted integration and environment-secret storage
- atomic credit reservations/settlement and Stripe subscription/invoice webhook handling
- Hostinger SSH/SFTP deployment of immutable versions with domain health verification
- usage, invoices, active sessions, team, API-key inventory, support tickets, and operational admin views
- Docker, PM2, nginx, CI, migrations, seed data, unit tests, and browser test configuration

## Local start

1. Copy `.env.example` to `.env` and replace the two security keys.
2. Start infrastructure: `docker compose up -d`.
3. Install: `pnpm install`.
4. Run `pnpm prisma migrate deploy && pnpm db:seed`.
5. Start the web process with `pnpm dev` and the worker with `pnpm worker`.

Without an AI key, account/project persistence still works and build requests fail explicitly without spending provider resources. Configure at least one of `OPENAI_API_KEY` or `GEMINI_API_KEY` for builds.

See [architecture](docs/ARCHITECTURE.md) and [operations](docs/OPERATIONS.md).
