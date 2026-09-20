# PURPO architecture

PURPO is a single deployable Next.js application with separate durable workers. PostgreSQL is the source of truth, Redis/BullMQ carries jobs, and S3-compatible object storage holds assets. Browser code never receives platform or customer secrets.

## Product build flow

1. The API creates a `Build`, its ordered `BuildStage` records, and an atomic credit reservation.
2. Redis receives an idempotent job identifier also recorded in PostgreSQL.
3. The worker loads project memory, requirements, and file state.
4. The model router selects an enabled provider/model by task class and priority.
5. Intent intelligence produces a structured specification; build intelligence produces a validated file manifest.
6. Files are scanned for unsafe paths and secret-like material, then stored with hashes in a new immutable version.
7. Preview integrity checks run before the project is marked ready.
8. The reservation is settled for measured work; unused reserved credits are released.

Generated browser projects are served from authenticated same-origin routes with a restrictive CSP. The initial runtime is HTML/CSS/JS so preview execution is deterministic and isolated. A future container build runner can implement the same project-file and version contracts without changing project intelligence.

## Trust boundaries

- Authentication, authorization, credit accounting, billing, secrets, and provider calls are server-only.
- Every project read/write rechecks membership; frontend project identifiers are never trusted.
- Customer credentials use AES-256-GCM data keys wrapped by a server master key and bound to project/provider context.
- Stripe webhooks are signature verified and credit grants are idempotent.
- Hostinger deployment accepts only validated SSH identities and `/var/www/...` targets.
- Expensive media/build/deployment retries default to one or require explicit cost-safe handling.

## Extension points

- `AiProviderAdapter` adds new AI vendors without changing build code.
- database model/task configuration controls routing, prices, and priority.
- prompt definitions and versions are editable and rollbackable data.
- integrations store public configuration separately from encrypted secrets.
- automation trigger/step JSON is versioned and suitable for specialized executors.
