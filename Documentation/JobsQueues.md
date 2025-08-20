# Jobs & Queues

Status: Implemented (BullMQ for webhooks + placeholders for future job types).

## Architecture
| Component | Responsibility |
|----------|---------------|
| BullMQ Connection | Redis-backed queue transport |
| Webhooks Queue | Primary delivery jobs |
| Webhooks DLQ | Terminal failures |
| (Future) Maintenance Queue | Cleanup, pruning tasks |
| (Future) Analytics Queue | Heavy async aggregation tasks |

## Queue Configuration
- Connection parameters via Redis env vars.
- Concurrency tuned per worker process (default moderate; scale horizontally by adding workers).

## Job Data Schema (Webhooks)
| Field | Description |
|-------|-------------|
| webhookId | Target webhook config id |
| tenantId | Tenant scope |
| eventType | Domain event type |
| payload | Event payload JSON |
| attempt | Current attempt number |
| signatureHeaders | Precomputed signature for quick reuse (optional) |

## Retry Policy
- Exponential backoff: attempt delay = `base * 2^(n-1)` (capped).
- Max attempts -> move to DLQ.

## Monitoring & Panel Integration
### Dashboard
- Queued jobs count
- Active jobs count
- Failed (recent window)
- DLQ size
- Average processing time (derive from metrics or job timestamps)

### DLQ Management
- Inspect job payload and last error message.
- Replay selected -> copy job data into main queue.
- Bulk purge with confirmation after retention period.

### Job Detail View
- Metadata: id, attempts made, timestamps (created, processed, finished), last error, next retry ETA.

## Operational Considerations
| Concern | Mitigation |
|---------|-----------|
| Stuck Jobs | Use BullMQ stalled job detection (enabled by default) |
| Redis Outage | Queue pauses; implement alerting on high backlog |
| Memory Pressure | Keep payloads lean; externalize large blobs |
| Poison Messages | DLQ isolation & manual inspection |

## Scaling Strategy
| Dimension | Approach |
|----------|---------|
| Throughput | Add more worker processes (horizontally) |
| Isolation | Separate queues for high-latency tasks |
| Priority | Introduce priority queue or multiple dedicated queues |

## Future Enhancements
| Feature | Value |
|---------|-------|
| Rate-limited consumer | Prevent external endpoint overload |
| Priority scheduling | Urgent events faster delivery |
| Deduplication | Avoid duplicate job flooding (hash-based) |
| Scheduled jobs | Delayed activation for future events |
| Multi-Region replication | Region-local dispatch reducing latency |

## Testing Strategy
| Test | Purpose |
|------|---------|
| Retry escalation | Confirm backoff progression |
| DLQ insertion | Terminal failure captured |
| Replay path | DLQ job successfully reprocessed |
| Stalled job detection | Automatic requeue behavior |

