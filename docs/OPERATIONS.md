# Operations and Hostinger runbook

## Provision

Use Ubuntu 24.04+, Node.js 22, PostgreSQL 17, Redis 7, an S3-compatible bucket, nginx, PM2, and TLS. Create a dedicated Linux deploy user. Never run the application as root.

## Release

```bash
pnpm install --frozen-lockfile
pnpm prisma migrate deploy
pnpm db:seed
pnpm check
pm2 startOrReload ecosystem.config.cjs
curl --fail https://your-domain.example/api/health
```

Place production secrets in the Hostinger server environment, not in the repository. Generate `SESSION_SECRET` with at least 32 random bytes. Generate `ENCRYPTION_MASTER_KEY` as a base64-encoded 32-byte value and protect its backups; losing it makes stored integration secrets unrecoverable.

Configure nginx from `deploy/nginx.conf.example`, then use Certbot or Hostinger TLS. Back up PostgreSQL and the object bucket independently. Redis persistence helps queue recovery but is not the source of truth.

Run `purpo-web` and `purpo-worker` as separate PM2 processes. The `/api/health` endpoint verifies database reachability. Deployment logs, queue depth, failed builds, provider failures, credits, and audit logs are available to administrators.
