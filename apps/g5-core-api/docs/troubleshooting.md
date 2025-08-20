# Troubleshooting

## Quick Reference
| Symptom | Likely Cause | Action |
|---------|--------------|--------|
| 401 on authenticated route | Missing / expired access token | Refresh token or re-login |
| 403 after login | Tenant header missing or role insufficient | Add `X-Tenant-Id` or adjust role |
| 429 responses | Rate limit exceeded | Backoff, inspect tenant traffic |
| Webhook deliveries stalled | Circuit breaker opened | Check webhook failureCount & nextRetryAt |
| DLQ growth | Persistent endpoint failures | Replay selectively after verifying target |
| Repeated duplicate processing | Missing Idempotency-Key | Add header or debug cache key collision |
| Swagger missing new model | ExtraModels not added | Update Swagger document builder |
| High latency spikes | External endpoint slowness / DB contention | Profile with OTEL / EXPLAIN queries |
| Memory growth | Large response caching or unbounded events | Inspect idempotency store & event emission |

## Logs
Search for `traceId` from error response to correlate full request path. Webhook-specific logs include target URL & HTTP status.

## Webhooks DLQ Replay
1. List DLQ (endpoint TBD if implemented) or inspect queue directly.
2. Replay: POST `/v1/webhooks/dlq/:id/replay` with tenant header.
3. Monitor metrics: delivery / failure counters should reflect replay.

## Rate Limiting Debug
- Inspect Redis keys `rate:<tenant>:<window>` (pattern future dependent).
- Confirm window & max settings via env.

## Idempotency Cache Issues
- Verify header presence.
- Ensure body hashing stable (ordering of JSON keys consistent if client builds object deterministically).
- Clear key manually in Redis for forced reprocess.

## Circuit Breaker
- Fields: `failureCount`, `circuitOpenedAt`, `nextRetryAt` on Webhook entity.
- Manual reset: set `failureCount=0`, `isActive=true`, null out breaker timestamps.

## Migrations Fail At Startup
- Check build output path matches `-d dist/src/data-source.js` in generate script.
- Ensure `tsc` ran before migration generation when using CLI.

## Health Check Failing
- DB: confirm network/credentials.
- Redis: verify port / container status.
- Application: look for uncaught exceptions early in logs.

## Common Error Codes
| Code | Meaning | Fix |
|------|---------|-----|
| AUTH_INVALID_CREDENTIALS | Bad email/password | Re-enter credentials |
| RATE_LIMIT_EXCEEDED | Too many requests | Backoff until window resets |
| WEBHOOK_CIRCUIT_OPEN | Circuit breaker active | Wait or reset webhook |
| IDP_DISABLED | Feature toggled off | Enable via config |
| INTERNAL_ERROR | Unhandled server fault | Check logs & traceId |

## Performance Tips
- Batch database queries in services instead of N+1 loops.
- Reuse prepared statements (TypeORM caches internally; use query builder where needed).
- Offload heavy non-critical work to BullMQ queues.

## Updating Dependencies
1. Branch & run `pnpm update --interactive`.
2. Run full test & lint suite.
3. Review changelogs for breaking changes (Nest, TypeORM, BullMQ).
4. Deploy to staging with elevated logging.

---
Last updated: 2025-08-20
