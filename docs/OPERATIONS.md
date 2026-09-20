# Operations and Hostinger runbook

## Isolation guarantees

The Hostinger production path uses `deploy/hostinger-compose.yml` with the Compose project name `purpo_prod`. PostgreSQL and Redis have no host ports. The web process binds only to `127.0.0.1:3187` by default, so it cannot replace another public website by itself. Persistent volumes and the Docker network are PURPO-namespaced.

Never use `docker compose down -v`, `docker system prune`, `git reset --hard`, database reset commands, or commands that target another application's containers/volumes. The provided scripts do not use them.

## First production setup

Requirements: Ubuntu 24.04+, Git, Docker Engine with Compose v2, curl, openssl, and an HTTPS domain when the site is made public. Use a dedicated S3-compatible production bucket. The S3 endpoint must be reachable by end-user browsers because PURPO creates presigned upload URLs.

From a fresh clone:

```bash
bash deploy/hostinger-setup.sh
bash deploy/hostinger-deploy.sh
```

`hostinger-setup.sh` creates `.env.production` with mode 600, generates the PostgreSQL/session/encryption secrets locally, and asks for real AI and storage credentials without committing them. Existing `.env.production` files are never overwritten.

## Safe releases

`hostinger-deploy.sh` only fast-forwards from `origin/main`, refuses tracked local changes/diverged history, validates the namespaced Compose configuration, builds version-tagged web/worker images, starts the PURPO-only database/Redis services, creates a PostgreSQL dump before migrations, runs `prisma migrate deploy`, seeds only on the first installation, starts the app, and waits for `/api/health`.

Backups are written under `.deploy/backups/`. The script never publishes PostgreSQL or Redis ports and never stops unrelated Compose projects.

## Nginx and TLS

Copy `deploy/nginx.conf.example` into a new PURPO-specific site file, replace `purpo.example.com` with the actual domain, run `nginx -t`, then enable/reload only after the test succeeds. Do not overwrite the global nginx configuration or an existing site's vhost. Obtain TLS with Hostinger or Certbot and keep `APP_URL` on HTTPS; production session cookies are secure.

## Rollback

After at least two successful releases, `bash deploy/hostinger-rollback.sh` can switch the PURPO web/worker containers to the previous retained image tag. Database migrations are deliberately not reversed automatically. Restore a pre-migration dump only after reviewing the migration and confirming a database rollback is required.

## Production credentials

At least one of `OPENAI_API_KEY` or `GEMINI_API_KEY` is required for real AI builds. Stripe values are required for billing checkout/webhooks. S3-compatible endpoint, bucket, access key, secret key, and public URL are required for asset upload/download flows. Secrets belong only in `.env.production` or the server secret store.
