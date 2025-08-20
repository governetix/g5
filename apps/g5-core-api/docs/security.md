# Security Overview

## Authentication & Sessions
- JWT Access (short TTL, default 15m) + Refresh (long TTL, default 30d) rotation.
- Refresh tokens stored hashed; rotation invalidates previous token atomically.
- Session listing & revocation endpoints planned (partially implemented).

## Authorization
- Role-based (OWNER, ADMIN, EDITOR, VIEWER) with guard + decorator.
- API Key guard (hashed at rest) for programmatic access; future scope: per-key permissions.

## Multi-Tenancy Isolation
- Mandatory `tenantId` column on tenant-scoped entities.
- Incoming tenant context from `X-Tenant-Id` header; guards validate presence for protected routes.
- Cross-tenant access prevented by repository lookups always scoping `tenantId`.

## Webhook Security
- HMAC-SHA256 signature: `X-Webhook-Signature` + `X-Webhook-Timestamp`.
- Replay protection via timestamp freshness window (configurable future env) and uniqueness check (planned).
- Circuit breaker disables noisy endpoints; manual + automatic recovery after cooldown.

## Rate Limiting
- Redis sliding window per tenant.
- Returns 429 with standardized error; planned exposure of `Retry-After` & remaining quota.

## Idempotency
- Prevent duplicate side effects for unsafe methods with `Idempotency-Key` header.
- Response cache keyed by tenant + route + body hash + key.

## Input Validation & Sanitization
- DTO validation via class-validator; transformation enabled to enforce types.
- Rejects extra properties (`whitelist: true`).

## Headers & Transport
- Helmet: CSP (strict default), HSTS (opt-in), COOP/COEP toggles.
- X-Powered-By removed.
- CORS: dynamic origin whitelist; defaults to allow-all in absence of config (adjust in production).

## Secret & Credential Handling
- Passwords: bcrypt hashed (cost configurable via env in future enhancement).
- API Keys & refresh tokens: SHA-256 hashed; raw only shown once on creation/rotation.
- HMAC uses key hash as surrogate secret (acceptable if hash kept confidential internally).

## Observability & Incident Response
- Correlation ID per request -> logs & error envelopes.
- Structured logs suitable for SIEM ingestion.
- Planned alert triggers on DLQ growth, circuit breaker openings, auth anomaly patterns.

## Database Hardening
- Migrations define constraints & indexes (unique per tenant, partial indexes for active items).
- Future: row-level security policies (if leveraging direct SQL exposure) and immutable audit tables.

## Error Hygiene
- Global exception filter maps known errors -> codes; hides stack traces externally.
- Unknown errors still correlated via `traceId`.

## Supply Chain
- Lock file committed (`pnpm-lock.yaml`).
- Periodic dependency audit recommended (CI job placeholder).

## Remaining / Future Work
| Area | Planned Improvement |
|------|---------------------|
| JWT Secret Rotation | Key versioning & kid header |
| API Key Scopes | Fine-grained capability claims |
| Field Level Encryption | PII vault abstraction |
| Advanced Rate Plans | Per feature & burst buckets |
| Outbox Reliability | Exactly-once webhook publish |
| Audit Integrity | Hash chain / tamper evidence |
| Anomaly Detection | Metrics-based adaptive throttling |

---
Last updated: 2025-08-20
