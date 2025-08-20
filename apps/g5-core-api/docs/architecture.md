# Architecture Overview

## High-Level Components
- API Layer (Nest Controllers)
- Application Services (per bounded context)
- Domain Events Bus (in-process)
- Persistence Layer (TypeORM Repositories)
- Async Processing (BullMQ queues: webhooks, webhooks-dlq)
- Caching / Rate / Idempotency (Redis)
- Observability (Pino logging, Prometheus metrics, optional OpenTelemetry)
- Security & Edge (Helmet, CORS, Rate Limiter, Correlation Middleware)

## Module Map
| Module | Responsibility | Key Providers |
|--------|----------------|---------------|
| Auth | Registration, login, refresh, sessions | AuthService, JwtStrategy |
| Tenants | Tenant CRUD & theme | TenantsService |
| API Keys | Key lifecycle (create/rotate/revoke) | ApiKeysService |
| Webhooks | Webhook CRUD & delivery orchestration | WebhooksService, WebhooksDispatcher |
| Audit | Capture & persist audit events | AuditLogService, AuditInterceptor |
| Events | Publish internal domain events | EventsService |
| Idempotency | Cache responses for safe replay | IdempotencyService |
| Pagination | Cursor encode/decode helpers | paginate() util |
| Metrics | Counters & histograms exposure | MetricsService, MetricsHttpInterceptor |
| Jobs | Scheduled maintenance tasks | RefreshCleanupService (example) |
| Security | Guards, decorators, middleware | RolesGuard, ApiKeyGuard, CorrelationMiddleware |

## Request Flow
1. Incoming HTTP request hits Express adapter.
2. CorrelationMiddleware attaches `correlationId` (existing or generated) via AsyncLocalStorage.
3. Global pipes validate & transform DTOs.
4. Guards enforce auth / tenant / rate limits.
5. Controller delegates to Service (transaction boundary kept minimal; complex multi-entity ops can add custom transactions if needed).
6. Service performs repository operations & emits domain events.
7. Interceptors (Audit / Metrics) post-process and record metrics or audit logs.
8. Exception Filter normalizes errors into standard envelope.
9. Response returned; async follow-ups (webhook queue, log flush) continue independently.

## Domain Events
- Emitted via `EventsService.emit()` with a discriminated union payload.
- Consumed by audit listener & (future) outbox publisher.
- Synchronous local dispatch keeps latency predictable; offloading to a durable outbox is a future scaling step.

## Webhook Delivery Pipeline
```
Entity Change -> Domain Event -> (future) Outbox -> Queue 'webhooks' -> Dispatcher Processor
  -> HTTP POST attempt -> success => metrics.inc(deliveries)
                       -> failure => metrics.inc(failures), retry/backoff
  -> Exceeds attempts => Move to DLQ 'webhooks-dlq'
  -> Replay (manual) => Re-enqueue original payload
```
- Circuit breaker on Webhook entity (`failureCount`, `circuitOpenedAt`, `nextRetryAt`).
- HMAC signature: `sha256(secretHash, timestamp + JSON(payload))` (hash used as key surrogate).

## Idempotency Strategy
- Composite key: tenantId + route + hashed body + provided Idempotency-Key.
- Stored value: serialized JSON response + status code + expiry.
- On hit: short-circuit controller/service path; returns cached with header `Idempotent-Replay: true`.

## Pagination Strategy
- Forward-only cursor: base64url of JSON { id, createdAt }.
- Query adds deterministic tie-breaker (id) to avoid duplicates when createdAt collisions occur.

## Rate Limiting
- Sliding window counters in Redis keyed by tenant.
- On exceed: 429 with retry semantics (planned header exposure of remaining quota & reset time).

## Observability Stack
- Logs: pino + correlationId fields; structured for ingestion.
- Metrics: prom-client registry (HTTP count/duration, webhooks delivery stats, rate limit rejections).
- Tracing: Conditional OTEL bootstrap; spans automatically generated around HTTP + DB + Redis.

## Security Layers
- Headers: Helmet CSP / HSTS / COOP / COEP (togglable by env).
- Input validation: class-validator via ValidationPipe.
- Secret hygiene: All tokens & API keys hashed (no plaintext persistence).
- Error hygiene: Uniform envelope prevents leaking stack traces.

## Data Integrity & Migrations
- All schema changes codified in TypeORM migrations (no sync in production).
- Recommended: pre-deploy migration run in CI; startup `migrate-run` as fallback.

## Failure Handling Patterns
| Scenario | Mechanism |
|----------|-----------|
| Webhook endpoint down | Retry + backoff + circuit breaker + DLQ |
| Duplicate client POST | Idempotency cache |
| Burst traffic | Rate limit guard |
| Slow external calls | (Future) timeout & abort controllers |
| Internal exception | Global filter -> normalized error |

## Extensibility Guidelines
- Add new bounded context with dedicated module (service, controller, entities, events).
- Expose new metrics via MetricsService registration (prefix with domain).
- Emit domain events for side-effects rather than calling other modules directly.
- Keep DTO validation at edge; domain logic in services.

## Future Scaling Considerations
- Outbox table + worker for exactly-once webhook dispatch.
- Sharded Redis / multi-queue partitioning for high webhook volume.
- Read replicas for analytics read patterns.
- Saga orchestration module for cross-tenant multi-step flows.

## Diagrams (ASCII)
### Module Interaction (Simplified)
```
[Client] -> [Controller] -> [Service] -> [Repo]
                 |             |
                 |             +--> emit(Event)
                 |                     |
                 |                     v
                 |                [Audit Listener]
                 |                     |
                 +--> [Interceptors] (Metrics, Audit)

[Service] -> enqueue(Webhook Job) -> [BullMQ] -> [Dispatcher Processor] -> External Endpoint
                                      |                                     |
                                      +--> Failure -> Retry/Backoff -> DLQ --+
```

---
Last updated: 2025-08-20
