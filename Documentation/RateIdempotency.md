# Rate Limiting & Idempotency

Status: Implemented – Tenant sliding window + idempotent write interceptor.

## Rate Limiting
### Algorithm
- Sliding window counter stored in Redis per key: `rate:{bucket}:{tenantId}`.
- Each request increments a sorted set or rolling list with timestamps (implementation detail); counts within window determine allowance.

### Buckets
Configured via `ThrottlerModule` + custom Tenant guard buckets (e.g., `global`, `login`, etc.). Future: unify into a single adaptive limiter.

### Headers (Recommended Future Additions)
| Header | Meaning |
|--------|---------|
| X-RateLimit-Limit | Max requests allowed in window |
| X-RateLimit-Remaining | Remaining requests in current window |
| X-RateLimit-Reset | Epoch seconds until window reset |

(Current implementation may not yet emit them; panel can derive partially from errors.)

### Enforcement Flow
1. Resolve tenantId.
2. Key = `${tenantId}:${bucket}`.
3. Increment + purge old timestamps.
4. If count > limit → 429 with `ERR_RATE_LIMIT`.

### Panel Integration
- Display current usage vs limit (requires metrics or a lightweight endpoint to fetch counts).
- Provide upgrade CTA where near limit (SaaS plan upsell).

## Idempotency
### Purpose
Prevent duplicate side-effect execution on client retries / network races.

### Mechanism
- Client supplies `Idempotency-Key` header (UUID v4 recommended) for mutating endpoints (POST/PUT/PATCH/DELETE) that support it.
- Interceptor constructs composite key: `idem:{tenantId}:{route}:{hash(body)?:optional}:{idempotencyKey}`.
- On first execution: stores serialized successful response (status + body) with TTL (e.g. 24h) in Redis.
- Subsequent identical key before expiry: returns stored response with header `Idempotent-Replay: true`.

### Storage Considerations
| Aspect | Value |
|--------|-------|
| TTL | Balance between replay utility & memory (common: 24h) |
| Body Hash | Optional inclusion to ensure identical payload (guards against accidental replays with diff body) |
| Serialization | JSON + status code |

### Panel Integration
- Provide admin view listing recent idempotent cache hits for debugging (optional low priority).
- Inline warning in UI forms: if “retry safe” operations, front-end always attaches key.

### Error Scenarios
| Scenario | Handling |
|----------|----------|
| Key Reused (different body) | Return conflict or treat as new? (Current: if body hash included, mismatch leads to new entry; if not, potential logical conflict – recommend adding hash) |
| Storage Failure | Fallback to non-idempotent execution (log warning) |

## Future Enhancements
| Feature | Benefit |
|---------|--------|
| Quota-Aware Rate Limits | Dynamic limits based on plan tier |
| Burst Tokens / Leaky Bucket | Smoother traffic handling |
| Global + Per-API Key Limits | Finer control & abuse mitigation |
| Idempotent Retry-After Guidance | Add `Retry-After` header for 429 responses |
| Idempotency Stats Endpoint | Debugging tool for clients |
| Deduplicated Webhook Emission | Extend idempotency to outbound events |

## Testing Strategy
| Test | Purpose |
|------|---------|
| Rate within window | Allows request |
| Exceed limit | 429 returned |
| Idempotent first call | Executes side effect |
| Idempotent replay | Returns cached with replay header |
| Different body same key (if hashed) | Either mismatch path or new entry logic validated |

