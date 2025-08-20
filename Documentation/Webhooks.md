# Webhooks Delivery Pipeline

Status: Implemented – Queue + Retry + DLQ + HMAC Signatures.

## Architecture
| Component | Responsibility |
|-----------|----------------|
| Webhook Registry | Stores endpoint URL, secret, status (enabled/disabled), failure counters |
| Event Producer | Emits domain events → enqueues delivery jobs |
| Delivery Worker (BullMQ) | Performs HTTP POST with signing, backoff retry |
| Circuit Breaker | Opens after threshold failures; pauses further attempts temporarily |
| Dead Letter Queue (DLQ) | Stores exhausted jobs for manual replay |
| Dispatcher Metrics | Exposes counters & histograms for latency/success/failure |

## Job Lifecycle
1. Event captured → normalized payload built `{ id, type, tenantId, data, createdAt }`.
2. Push job to `webhooks` queue with payload & webhook config snapshot.
3. Worker processes job:
   - Compute signature.
   - Send HTTP request with headers.
   - On success → record metrics, reset failure count.
   - On failure → increment failure count, schedule retry with exponential backoff.
4. If retries exceed max → move to DLQ.

## Retry & Backoff
- Strategy: Exponential (e.g. 2^n * base) capped at max interval.
- Jitter recommended (future) to avoid thundering herd.

## Circuit Breaker
| State | Transition Condition |
|-------|----------------------|
| Closed | Normal operation |
| Open | Consecutive failures >= threshold |
| Half-Open | After cool-down interval expires (probe attempt) |
| Closed (reset) | Successful probe |

Open state short-circuits new delivery attempts for that webhook (job may be deferred / requeued later).

## HMAC Signature
- Header: `X-Webhook-Signature: sha256=base64(hmacSha256(secret, baseString))`.
- Header: `X-Webhook-Timestamp: <unix epoch seconds>`.
- Base String: `timestamp + '.' + rawBodyJson`.
- Recipients must verify freshness (timestamp skew window ~5m) and constant-time compare.

## Security Considerations
| Threat | Mitigation |
|--------|-----------|
| Replay | Timestamp header + recipient freshness check |
| Tampering | HMAC signature over body |
| Secret Leak | Rotate secret (future endpoint) & re-sign future events |
| Flood (event storm) | Rate limit per webhook or concurrency cap (future) |

## DLQ Management
- DLQ queue name: `webhooks-dlq`.
- Replay: Admin panel triggers re-enqueue of selected jobs after issue fix.
- Purge: Panel can delete stale DLQ items after retention window.

## Panel Integration
### List Webhooks
Fields: id, url, status, failureCount, lastDeliveryAt, avgLatency (derived), circuitState.

### Delivery Attempts View
- Fetch paginated attempts (`status, statusCode, durationMs, timestamp`).
- Filter by status (success/failure/retried).

### Create / Update
- URL, secret (write-only), enabled toggle, event type filters (future).

### Replay DLQ
- Action: select N DLQ entries → replay → show results.

### Metrics Overview
Panel can surface aggregated stats (24h): success rate, P95 latency, failure bursts.

## Observability
| Metric | Type | Labels |
|--------|------|--------|
| `webhook_deliveries_total` | counter | status (success|failure|retry) |
| `webhook_delivery_duration_seconds` | histogram | status |
| `webhook_dlq_size` | gauge | none |

Add tenant label only if controlled cardinality (sample top tenants).

## Future Enhancements
| Feature | Description |
|---------|-------------|
| Outbox Table | Debounce events, ensure durability before enqueue |
| Secret Rotation | Dual-secret window signing support |
| Delivery Concurrency | Per-tenant concurrency limiter |
| Payload Transformation | Template or filtering rules per webhook |
| Event Filtering | Subscription to subset event types |
| Batch Mode | Bundle multiple events into single delivery for efficiency |

## Testing Strategy
| Test | Purpose |
|------|---------|
| Successful delivery path | Signature + 200 handling |
| Retry after network failure | Ensures backoff scheduling |
| Circuit opens after threshold | No further immediate attempts |
| DLQ insertion after max retries | Terminal failure captured |
| Signature validation | Deterministic base string correctness |

