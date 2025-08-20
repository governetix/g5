# Operations Guide

## Runtime Topology
- Service (NestJS) + PostgreSQL + Redis.
- BullMQ queues share Redis deployment.
- Optional OTEL collector (if tracing enabled).

## Startup Sequence
1. Validate env vars (Joi schema - future central file).
2. Conditional OpenTelemetry bootstrap.
3. Database connection & migrations (manual command recommended in CI).
4. Redis connection (rate limiter, queues, idempotency cache).
5. HTTP server listen.

## Migrations
Generate:
```bash
pnpm -F g5-core-api exec ts-node src/migrate-generate.ts NewFeature
```
Run:
```bash
pnpm -F g5-core-api exec ts-node src/migrate-run.ts
```
CI should fail if pending migrations not applied in image.

## Seeding
```bash
pnpm -F g5-core-api seed
```
Creates demo tenant & admin user.

## Queues
| Queue | Purpose | DLQ |
|-------|---------|-----|
| webhooks | Deliver outbound webhook HTTP POSTs | webhooks-dlq |
| webhooks-dlq | Dead letters for failed deliveries | (manual replay) |

Replay DLQ item:
```
POST /v1/webhooks/dlq/:id/replay (requires tenant context)
```

## Backups
- Cron job (future implementation) invokes `pg_dump`.
- Retention controlled by `BACKUP_RETENTION_DAYS`.

## Metrics Endpoints
- `/metrics` (Prometheus). Scrape interval recommendation: 15s–30s.
- Exemplars (future) once OTEL metrics stable in stack.

## Health & Readiness
- `/v1/health`: DB + Redis ping (extend with queue depth, circuit breaker health).
- Consider separate `/ready` if long warm-up introduced later.

## Environment Promotion Checklist
| Item | Check |
|------|-------|
| JWT_SECRET strong | ✅ |
| DB credentials rotated | ✅ |
| CSP validated for assets | ✅ |
| HSTS enabled (prod) | ✅ |
| OTEL endpoint reachable or disabled | ✅ |
| Rate limits sized | ✅ |
| Backup retention tuned | ✅ |
| Migrations applied | ✅ |

## Scaling
| Concern | Strategy |
|---------|----------|
| CPU-bound webhook bursts | Horizontal scale workers (separate process) |
| Queue latency | Increase concurrency, partition by tenant classes |
| DB read load | Add read replicas, caching layer |
| Large audit volume | Partition audit table, move to log store |

## Logs
- Correlation ID in each line.
- Filter by `level` and `traceId` for incident analysis.
- Webhook failures emit structured entries with endpoint & status.

## Alerting Suggestions
| Signal | Threshold | Action |
|--------|-----------|--------|
| DLQ size | > 50 items | Investigate endpoint availability |
| Circuit opens | > N per 5m | Review failing tenants/targets |
| Rate limit rejects | Sudden spike | Inspect abusive client or misconfig |
| Error rate | > baseline + X% | Rollback / feature flag | 

## Disaster Recovery
- RPO tied to PostgreSQL backup frequency (daily default) – consider WAL archiving for < 15m RPO.
- RTO: redeploy container + restore DB (document restore procedure separately).

## Routine Maintenance
| Task | Frequency |
|------|-----------|
| Dependency audit | Weekly |
| Backup restore drill | Quarterly |
| Secret rotation | Quarterly |
| Review DLQ | Daily |
| Metrics SLO review | Monthly |

---
Last updated: 2025-08-20
