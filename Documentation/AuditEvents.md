# Audit Logging & Domain Events

Status: Implemented (interceptor + event bus) – UI consumption feasible.

## Purpose
Provide immutable, queryable trail of security and business-relevant actions with correlation linking to requests and webhooks.

## Architecture
| Component | Responsibility |
|-----------|----------------|
| AuditLogInterceptor | Captures request metadata + outcome and persists record |
| Domain Event Bus | Publishes internal events (entity created, updated, etc.) |
| Event → Audit Bridge | Converts domain events to audit entries (where applicable) |
| Correlation Provider | Supplies `traceId` / correlation id for linkage |

## Audit Record Schema (Conceptual)
| Field | Description |
|-------|-------------|
| id | UUID |
| tenantId | Tenant scope (nullable for global ops) |
| actorUserId | User performing action (or system) |
| actorRole | Role at time of action |
| action | Canonical verb (e.g., `PROJECT.CREATED`) |
| resourceType | Domain type (`project`, `apikey`, ...) |
| resourceId | Identifier of affected entity |
| metadata | JSON diff / snapshot subset |
| ip | Remote IP (if captured) |
| userAgent | Client UA string |
| status | success | failure |
| errorCode | If failed, the standardized error code |
| traceId | Correlation id |
| createdAt | Timestamp |

## Action Naming Convention
`<RESOURCE>.<VERB>` (uppercase, dot separated). Examples:
- `PROJECT.CREATED`
- `PROJECT.UPDATED`
- `APIKEY.ROTATED`
- `WEBHOOK.DELIVERY.FAIL`

## Event Flow
1. Service performs mutation.
2. Emits domain event `ProjectCreatedEvent`.
3. Event handler converts to audit entry + publishes webhook (if configured).
4. Webhook dispatch includes audit traceId for full chain.

## Panel Integration
### Audit List Page
- Filters: `tenantId`, `actorUserId`, `action`, `resourceType`, date range, `status`.
- Pagination: cursor-based.
- Columns: action, resource, actor (name resolved), status, time, link to details.

### Detail View
- Show JSON metadata diff (highlight changed fields).
- Show raw standardized error on failures.
- Provide copy buttons for `traceId` and event payload.

### Correlation Navigation
- From an audit entry, link to: related webhook deliveries (matching traceId), related subsequent actions (session of actor within ± X min).

## Data Volume Management
| Strategy | Description |
|----------|-------------|
| Partitioning (future) | Monthly partitions for purging + performance |
| TTL Purge Job | Delete entries older than policy (e.g., 400d) |
| Field Pruning | Limit metadata to changed fields not full entity snapshot |

## Performance Considerations
- Insert path must be non-blocking to primary response latency (use async event loop or queue offloading if needed when volume increases).
- Indexes: `(tenantId, createdAt)`, `(tenantId, action)`, `(traceId)`.

## Security & Integrity
| Concern | Mitigation |
|---------|-----------|
| Tampering | App-level only; consider append-only store or WORM storage for compliance versions |
| PII Exposure | Redact sensitive fields (apply redaction map before persisting) |
| Flood / Noise | Rate-limit noisy event types (e.g. health pings) |

## Future Enhancements
| Feature | Value |
|---------|-------|
| Diff Computation | Store before/after summary for updates |
| Search Index | Full-text search on metadata (Elastic/OpenSearch) |
| Export | CSV/JSON export endpoint with streaming |
| Integrity Hash Chain | Append cryptographic hash linking entries |
| Real-time Stream | SSE/WebSocket feed for live admin console view |

## Testing Strategy
| Test | Purpose |
|------|---------|
| Interceptor success path | Persists record with status=success |
| Failure path | Captures error code & failure status |
| Event to audit mapping | Domain event produces correct action string |
| Correlation propagation | TraceId consistent across request + audit + webhook (simulate) |

