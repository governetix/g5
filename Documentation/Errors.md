# Error Handling & Envelope

Status: Implemented – standardized response shape across all thrown errors.

## Envelope Format
```jsonc
{
  "success": false,
  "status": 404,
  "code": "ERR_NOT_FOUND",
  "message": "Project not found",
  "details": ["optional", "validation issues"],
  "traceId": "3c0a9f0e1d7e4e8f"
}
```
Field Notes:
- `success`: Always `false` for errors (mirrors potential future `true` success envelope for RPC-like uniformity).
- `status`: Echo of HTTP status for SDKs/environments where transport status may be abstracted.
- `code`: Stable machine-readable error code (`ErrorCodes` enum in `errors/error-codes.ts`).
- `message`: Human-readable summary (avoid leaking internals).
- `details`: Optional list (primarily validation messages or granular causes).
- `traceId`: Correlation ID enabling cross-log/trace linkage.

## Error Sources Mapped
| Source | Handling | Code Mapping |
|--------|----------|--------------|
| `AppException` | Directly uses provided `code`, `status`, `details` | As thrown |
| `HttpException` (generic Nest) | Extracts message / validation array | Status→ErrorCodes map |
| Validation pipe array | Collapses to `ERR_VALIDATION`, `message="Validation failed"` + `details[]` | `ERR_VALIDATION` |
| TypeORM unique violation (23505) | 409 Conflict | `ERR_CONFLICT` |
| Other DB query errors | 400 | `ERR_VALIDATION` fallback or generic message |
| Unknown / unhandled | 500 | `ERR_UNKNOWN` |

## Error Codes Catalog
(Current snapshot – extend cautiously; codes are contract surface for clients.)
```
ERR_UNKNOWN
ERR_VALIDATION
ERR_UNAUTHORIZED
ERR_FORBIDDEN
ERR_NOT_FOUND
ERR_CONFLICT
ERR_RATE_LIMIT
ERR_PAYLOAD_TOO_LARGE
ERR_IDENTITY_DISABLED
ERR_TENANT_REQUIRED
ERR_IDEMPOTENT_REPLAY
ERR_WEBHOOK_DISABLED
```
Suggested future additions (not yet implemented):
```
ERR_PERMISSION_DENIED
ERR_BACKUP_IN_PROGRESS
ERR_WEBHOOK_SIGNATURE_INVALID
ERR_WEBHOOK_TIMESTAMP_SKEW
ERR_ROLE_IMMUTABLE
```

## Throwing Domain Errors
Use `AppException` for semantic clarity:
```ts
throw new AppException(ErrorCodes.CONFLICT, 'Project name already exists', 409);
```
Provide `details` when actionable to UI (e.g., which fields are duplicated).

## Validation Layer
Leverages Nest validation pipe (class-validator). On constraint breaches, pipe throws `BadRequestException` with `message: string[]`; filter converts to structured envelope with `ERR_VALIDATION`.

## Correlation & Tracing
- `traceId` sourced from AsyncLocalStorage (correlation middleware) or inbound `X-Correlation-Id`.
- Ensure upstream (gateway / edge) always injects or preserves header for full chain observability.

## Admin Panel Integration
### Display Strategy
- Map `code` to localized user-facing message (panel language layer).
- Show `details` in validation contexts (forms) next to relevant fields; retain original order for user familiarity.
- Include `traceId` in a collapsible debug section for support copy-paste.

### Retry / Guidance Logic
| Code | Recommended UI Action |
|------|-----------------------|
| ERR_RATE_LIMIT | Backoff + exponential retry or disable submit with timer |
| ERR_CONFLICT | Prompt user to adjust conflicting field(s) |
| ERR_IDEMPOTENT_REPLAY | Treat as success reflection; show idempotent indicator |
| ERR_TENANT_REQUIRED | Force user to select tenant context |
| ERR_PAYLOAD_TOO_LARGE | Suggest reducing file/JSON size |

### Analytics
Log error occurrences by `code` client-side (sampled) to detect UX friction spikes (e.g., rising `ERR_VALIDATION`).

## Extension Points
- Add mapping for more Postgres SQLSTATE codes (e.g. foreign key violation 23503 → dedicated code).
- Integrate Sentry / APM: attach `code`, `traceId`, `tenantId`, `userId` as tags.
- Provide `/errors/catalog` endpoint (static) for dynamic UI help overlays.

## Testing Strategy
| Test Type | Scenario |
|-----------|----------|
| Unit | Throw `AppException` with details; assert envelope fields |
| Unit | Simulate validation error; assert `ERR_VALIDATION` & details array |
| Integration | Duplicate unique column insert; assert `ERR_CONFLICT` |
| Integration | Unknown runtime throw inside controller; assert `ERR_UNKNOWN` and sanitized response |

## Hardening Recommendations
- Never pass raw DB errors to client (current filter sanitizes generic messages only).
- Avoid leaking internal identifiers (migration names, stack paths) in `message`.
- Maintain backward compatibility: adding new codes is fine; renaming existing codes is a breaking change (document in changelog).

