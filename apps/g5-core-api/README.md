## G5 Core API

Production-oriented multi-tenant SaaS core service built with NestJS. Focused on correctness, observability, security, and operational resilience.

### Themes domain (plan)

Database (PostgreSQL):
- Table `themes`
	- `id` UUID PK
	- `name` text not null
	- `slug` text unique not null
	- `status` text check in ('draft','staging','canary','published','inactive') default 'draft'
	- `is_default` boolean default false
	- `wcag_score` text check in ('AAA','AA','A','') default ''
	- `performance_score` integer
	- `google_fonts` boolean default false
	- `font_awesome` boolean default false
	- `animate_css` boolean default false
	- `hero_icons` boolean default false
	- `version` integer default 1
	- `tokens` jsonb not null  -- Design Tokens schema (palette, typography, layout, motion, etc.)
	- `created_at` timestamptz default now()
	- `updated_at` timestamptz default now()
	- `updated_by` text

- Table `theme_snapshots`
	- `id` UUID PK
	- `theme_id` UUID FK -> themes(id) on delete cascade
	- `version` integer not null
	- `label` text
	- `tokens` jsonb not null
	- `created_at` timestamptz default now()
	- unique(theme_id, version)

API Endpoints (prefix `/v1`):
- `GET /themes` list themes
- `POST /themes` create theme
- `GET /themes/:id` get theme
- `PATCH /themes/:id` update theme metadata/tokens
- `DELETE /themes/:id` delete theme (if not published or with proper policy)
- `POST /themes/:id/publish` transition workflow (draft→staging→canary→published)
- `GET /themes/:id/snapshots` list snapshots
- `POST /themes/:id/snapshots` create snapshot
- `GET /themes/:id/css` generate CSS variables for client consumption

Notes:
- Health/docs/metrics remain unprefixed per current app config.
- Tokens jsonb follows the `ThemeTokens` structure used in admin, enabling client-side CSS variables generation for consistent theming across modules.

### Feature Overview
- Multi-tenancy via header `X-Tenant-Id` & per-entity `tenantId`
- Auth: Access (short TTL) + rotating refresh tokens (stored hashed) + session listing & revocation
- Password reset & invitation skeletons (tokens hashed / invalidated)
- RBAC: Roles (OWNER, ADMIN, EDITOR, VIEWER) with guard + decorator
- API Keys: SHA-256 hash at rest, batch rotate/revoke, metadata update, usage tracking placeholder
- Audit Logging: Interceptor persists standardized audit records; domain events decouple side-effects
- Domain Events: Internal event bus feeding audit & future outbox/webhooks
- Webhooks: CRUD, HMAC-SHA256 signatures + timestamp anti-replay, queued delivery (BullMQ), exponential backoff, circuit breaker, DLQ + replay endpoint
- Idempotency: Interceptor using `Idempotency-Key` header with persisted responses to prevent duplicate side effects
- Cursor Pagination: Base64URL encoded cursors, stable ordering (id + createdAt fallback if needed)
- Error Catalog: Centralized codes, consistent `{code,message,details,traceId}` envelope via global exception filter
- Correlation IDs: Middleware + AsyncLocalStorage, auto injected into logs & error responses
- Observability: OpenTelemetry (HTTP, PG, Redis) optional bootstrap; Prometheus metrics endpoint
- Rate Limiting: Tenant-level Redis sliding window guard (configurable)
- Backups: Daily `pg_dump` with retention pruning
- Alerts: Scheduled monitoring (e.g. DLQ size) -> structured log events
- Retention Jobs: Scheduled cleanup (old audit logs, revoked tokens/keys, expired reset tokens)
- Config Validation: Joi schema + production environment safety checks
- Security: Helmet (CSP/HSTS/COOP/COEP), optional CSP disable, header hardening, removal of x-powered-by
- API Versioning: `/v1` prefix; future strategy for deprecations
- Swagger: Global headers, auth schemes, error models, pagination & idempotency header docs
- DB Hardening: Extensions, composite/partial indexes, constraints, hashed secrets

### Tech Stack
NestJS 11, TypeORM (PostgreSQL), Redis / BullMQ, prom-client, OpenTelemetry, bcrypt, JWT, helmet, pino.

### Environment Variables (Core Subset)
| Variable | Description | Example |
|----------|-------------|---------|
| NODE_ENV | Environment (`development`/`production`)| development |
| PORT | HTTP port | 3001 |
| DB_HOST | PostgreSQL host | 127.0.0.1 |
| DB_PORT | PostgreSQL port | 5432 |
| DB_USER | DB user | g5_user |
| DB_PASS | DB password | g5_pass |
| DB_NAME | Database name | g5_db |
| JWT_SECRET | JWT signing secret | change_me |
| JWT_KEYS | JSON array for multi-key rotation [{"kid":"k1","secret":"...","current":true}] | (unset) |
| ACCESS_TOKEN_TTL | Access token TTL (s) | 900 |
| REFRESH_TOKEN_TTL | Refresh token TTL (s) | 2592000 |
| REDIS_HOST | Redis host | 127.0.0.1 |
| REDIS_PORT | Redis port | 6379 |
| ALLOWED_ORIGINS | Comma list for CORS | http://localhost:3000 |
| ENABLE_HSTS | Enable HSTS header | true |
| ENABLE_COOP | Enable COOP | false |
| ENABLE_COEP | Enable COEP | false |
| DISABLE_CSP | Disable CSP entirely | false |
| CSP_DEFAULT | Override CSP directives | default-src 'self' |
| OTEL_EXPORTER_OTLP_ENDPOINT | OTLP endpoint (if tracing) | http://otel:4318 |
| ENABLE_BACKUPS | Enable backup cron | true |
| BACKUP_RETENTION_DAYS | Backups retention | 7 |
| BACKUP_DIR | Backup output directory | ./backups |
| BACKUP_ENCRYPT_PASSPHRASE | If set, AES-256 encrypt backups | (unset) |
| BACKUP_TEST_DUMMY | Write dummy file instead of pg_dump (tests) | false |
| RATE_LIMIT_WINDOW_SEC | Sliding window size | 60 |
| RATE_LIMIT_MAX | Requests per window per tenant | 1200 |
| IDP_ENABLED | (Future) external IdP toggle | false |
| BODY_LIMIT | Express JSON/body size limit | 1mb |
| ALERT_DLQ_THRESHOLD | DLQ size alert threshold | 50 |
| ALERT_ERROR_RATE_5M | 5m rolling 5xx fraction threshold | 0.05 |
| ALERT_P95_LATENCY | P95 latency seconds threshold | 0.75 |
| ALERT_P99_LATENCY | P99 latency seconds threshold | 1.5 |
| ALERTS_SLACK_WEBHOOK | Slack Incoming Webhook URL | (unset) |
| ALERTS_COOLDOWN_SEC | Min seconds between repeated same alert | 300 |
| API_KEY_PEPPER | Extra server-side static pepper appended before hashing | (unset) |
| API_KEY_HMAC_SECRET | If set, use HMAC-SHA256 instead of plain hash | (unset) |

Additional internal variables are validated through the centralized Joi schema; startup fails fast if invalid.

### Local Run
```bash
pnpm install
docker compose up -d postgres redis
pnpm -F g5-core-api exec ts-node src/migrate-run.ts
pnpm -F g5-core-api seed
pnpm -F g5-core-api start:dev
```
Docs: http://localhost:3001/docs  
Health: http://localhost:3001/health  
Metrics: http://localhost:3001/metrics

Admin Panel (Docker): http://localhost:3005/admin/status
- Ejecuta checks contra el Core API (latencia, estado) y smoke endpoints.
- Smoke endpoints: `/health/smoke/db`, `/health/smoke/redis`.

### Seeding
Creates demo tenant, owner user, project, asset, and API key (printed once). Store printed key securely.

### Auth & Sessions
1. Register (needs existing tenant slug) -> returns user
2. Login -> access & refresh tokens
3. Refresh -> rotates token
4. Session Listing: Enumerate active refresh sessions (device binding placeholder)
5. Session Revoke: Targeted or bulk invalidation
6. Logout / revoke (refresh token removal)

Passwords & refresh tokens are stored hashed; refresh rotation invalidates previous token atomically.

### API Keys
- Raw only on creation (seed / create) or rotation response
- SHA-256 hashed at rest; prefix strategy for UX safe display (future)
- Soft revoke via `revokedAt`; filtered from active queries
- Batch operations: rotate, revoke (bulk administrative actions)
- Metadata update endpoint (name / description) without revealing secret
- Planned: Per-key usage statistics & last-used timestamps

### Webhooks Reliability & Security
- Delivery Queue: BullMQ with exponential / capped backoff
- HMAC Signatures: `X-Webhook-Signature` (sha256=base64) + `X-Webhook-Timestamp`
- Anti-Replay: Rejects stale (config window) or replayed timestamp/signature combos
- Circuit Breaker: Tracks `failureCount`, opens circuit after threshold; cooldown before reattempt
- DLQ: Messages exceeding retries moved to Dead Letter Queue; replay endpoint to re-enqueue
- Pagination: Cursor-based listing of webhooks & delivery attempts (future)
- Metrics: Success, failure, retry counters & latency histogram
- Planned: Outbox pattern integration & per-tenant delivery concurrency controls

Signature Base String: `timestamp + '.' + payloadJSON` -> HMAC SHA-256 with tenant secret.

### Metrics & Tracing
- Prometheus endpoint `/metrics`
- Standard Counters / Histograms: HTTP request count & duration (+ 4xx/5xx counters), webhook deliveries/failures/retries/duration histogram, DLQ size gauge, rate limit rejections
- OpenTelemetry (conditional): HTTP, PostgreSQL, Redis auto-instrumented; exporter activated if env present
- Correlation IDs propagate as span attributes & log fields

Enable tracing by setting `OTEL_EXPORTER_OTLP_ENDPOINT`; absence results in zero overhead bootstrap skip.
Example minimal tracing env:
```
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=g5-core-api
```
To disable quickly: set `OTEL_DISABLED=true`.

### Migrations & Schema Hardening
Run automatically at startup. Manual:
```bash
pnpm -F g5-core-api exec ts-node src/migrate-run.ts
```
Pending migration CI check: `scripts/check-pending-migrations.ts`.

Rollback / Undo:
```bash
# Revert latest migration
pnpm -F g5-core-api migration:down

# Revert last 2
pnpm -F g5-core-api migration:down 2

# Revert all (danger - wipes schema objects created by migrations)
pnpm -F g5-core-api migration:down all

# Revert down to (and including) a migration whose name contains substring
pnpm -F g5-core-api migration:down to 1709999
```
Guidelines:
- Never modify an already committed migration; create a new one to adjust schema.
- Prefer additive migrations; destructive changes should be paired with a backup and documented.
- Rollbacks in production should be exceptional; validate on staging first.

### Testing
```bash
pnpm -F g5-core-api test
```
Additional guard/webhook tests in progress.

### CI / Quality Gates
GitHub Actions: install -> build -> migrate -> test -> pending migration check.

### Postman / API Exploration
Import `postman_collection.json`. Set: `baseUrl`, `tenantId`, `jwt`, `apiKey` after login.

### Security Notes
- CSP enabled unless disabled by env
- Optional HSTS/COOP/COEP toggles
- Rate limits per bucket
- All tokens/secrets hashed (except one-time display)
- JWT key rotation: supply `JWT_KEYS` env JSON array objects `{kid,secret,current?}`; `current:true` marks active signing key, others accepted for verification. Fallback to `JWT_SECRET` if absent.
- API keys hashed with optional pepper (`API_KEY_PEPPER`) or HMAC (`API_KEY_HMAC_SECRET`). Rotate by introducing new pepper/HMAC secret and re-hashing only on key rotation events (existing hashes remain valid until forced rotation policy).
- Production: avoid shipping a `.env` file; inject secrets via orchestrator. Add CI policy to fail if `.env` present in project root in production builds (future automation).

### Cursor Pagination
Use `?limit=20&cursor=...` pattern. Response includes `nextCursor` when more records exist. Cursor encodes JSON `{"id":"...","createdAt":"..."}` base64url. Stable ordering avoids duplicates / gaps.

### Idempotency
Supply `Idempotency-Key` header (unique client generated). Successful mutating responses cached keyed by (tenant, route, key, body hash). Replays return cached payload with `Idempotent-Replay: true` header.

### Correlation IDs
`X-Correlation-Id` client provided or generated UUID v4 per request. Propagated through AsyncLocalStorage; added to logs, error responses (`traceId`), and metrics labels.

### RBAC & Permissions
Roles: `OWNER`, `ADMIN`, `EDITOR`, `VIEWER`.

Granular permission strings enable future panel fine-tuning:

| Permission | Description | Roles (default) |
|------------|-------------|-----------------|
| tenant.read | View tenant metadata | ALL |
| tenant.update | Update tenant settings | OWNER, ADMIN |
| project.create | Create project | OWNER, ADMIN, EDITOR |
| project.read | List / get projects | ALL |
| project.update | Update project | OWNER, ADMIN, EDITOR |
| project.delete | Delete project | OWNER, ADMIN |
| theme.manage | Manage themes | OWNER, ADMIN, EDITOR |
| apikey.manage | Create/rotate/revoke API keys | OWNER, ADMIN, EDITOR |
| webhook.manage | CRUD webhooks & retries | OWNER, ADMIN, EDITOR |
| membership.invite | Invite members | OWNER, ADMIN |
| membership.read | List members | ALL |
| membership.update | Change roles / revoke | OWNER, ADMIN |
| audit.read | View audit log | ALL |
| queue.dlq.read | Inspect DLQ | OWNER, ADMIN |
| queue.dlq.retry | Replay DLQ items | OWNER, ADMIN |
| metrics.read | View metrics endpoint (panel proxy) | ALL |
| backup.restore | Trigger restore (danger) | OWNER |

Implementation:
1. `@Permissions(...perms)` decorator sets metadata.
2. `PermissionsGuard` resolves user role via membership and validates **all** required permissions (logical AND; supply multiple for composite constraints).
3. `RolesGuard` still allows coarse constraints; both run (roles first). OWNER short‑circuits success.
4. Matrix defined in `common/auth/permissions.ts`.

Override Strategy: Future dynamic editing can source from DB; keep file as seed / fallback. A feature flag could switch guard to DB-backed resolver.

### Standardized Errors
Envelope (final):
```jsonc
{
	"success": false,
	"status": 403,
	"code": "ERR_FORBIDDEN",
	"message": "Forbidden",
	"details": ["optional", "validation issues"],
	"traceId": "optional-correlation-id"
}
```
Notes:
- `success:false` uniform for easy front-end pattern matching.
- `status` echoed for clients without access to raw HTTP layer (some SDK contexts).
- Domain errors throw `AppException(code, message, status, details?)`.
- Unknown exceptions map to `ERR_UNKNOWN` with generic message; stack never exposed.
- Validation arrays collapse to `message: "Validation failed"` + `details`.

### Backups & Retention
Automated:
- Daily cron (01:00) performs logical dump via `pg_dump` to `BACKUP_DIR` (default `./backups`).
- Optional encryption: set `BACKUP_ENCRYPT_PASSPHRASE` -> file stored as `*.sql.enc` (OpenSSL AES-256-CBC PBKDF2).
- Retention: Files older than `BACKUP_RETENTION_DAYS` deleted (both `.sql` and `.sql.enc`).

Manual Backup (on-demand):
```
pnpm -F g5-core-api backup:run   # (placeholder single-run; cron covers prod)
```

Manual Restore:
```
pnpm -F g5-core-api backup:restore backup-2025-01-15-01-00-00.sql
pnpm -F g5-core-api backup:restore backup-2025-01-15-01-00-00.sql.enc  # auto decrypt (passphrase required)
```
Operational Guidelines:
- Always snapshot (cloud-level) or logical backup before destructive migrations.
- Test restore quarterly in a disposable environment (verifies integrity + documentation accuracy).
- Keep passphrase rotated and stored in secret manager separate from DB credentials.
- Consider PITR (point-in-time recovery) via WAL archiving for RPO < 24h (future extension).

Retention Cleanup Tasks:
- Audit logs (beyond policy horizon) – scheduled job.
- Revoked API keys beyond grace period.
- Expired refresh & password reset tokens.

### Alerting
Scheduled job (per minute) evaluates:
- DLQ size > `ALERT_DLQ_THRESHOLD`
- Rolling 5-minute HTTP 5xx rate > `ALERT_ERROR_RATE_5M`
- P95 / P99 latency above `ALERT_P95_LATENCY` / `ALERT_P99_LATENCY`
- Database connectivity failure
Alerts emit structured WARN logs `ALERT[<key>]` and (if configured) post to Slack webhook. Cooldown enforced via `ALERTS_COOLDOWN_SEC` to prevent noise.

### Rate Limiting
Redis sliding window keyed per tenant. Exceeding threshold returns `429` with error code `RATE_LIMIT_EXCEEDED`. Possible extension: per-key + global + adaptive burst tokens.

### Config Validation & Safety
Startup validates environment with Joi; missing or malformed required vars abort boot (fail fast). In production, presence of local `.env` may be rejected (guard against misconfiguration).

### Logging
`pino` used with correlation enrichment. Sensitive fields (passwords, tokens) excluded or truncated (ensure any new fields follow redaction guidelines).

### Development Workflow Tips
- Run `pnpm -F g5-core-api start:dev` for watch mode
- Use `pnpm -F g5-core-api lint` before commits
- Add migrations via script; never edit committed migrations retroactively
- Prefer service-level unit tests + selective e2e flows for critical paths

### Future Enhancements
- Outbox pattern bridging domain events to durable webhook dispatch
- Fine-grained per-tenant rate plan quotas & burst credits
- Key usage analytics & anomaly detection
- Webhook delivery signature rotation support
- Structured audit diffing & masking
- Multi-region active-active replication guidelines
- Secret rotation automation (JWT, HMAC)
- Policy-based access control (attribute rules)
- Pluggable encryption at field level (PII vault abstraction)

### License
UNLICENSED (internal use).

---
For questions or extension proposals, open an internal issue with context: feature intent, tenancy impact, security considerations, metrics/observability plan.
