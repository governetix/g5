# Authentication & Sessions

Status: Implemented (JWT access + rotating refresh tokens) – Panel ready.

## Components
| Layer | Responsibility |
|-------|---------------|
| AuthController | Login / refresh / logout / (future register) endpoints |
| AuthService | Credential validation, token issuing, refresh rotation |
| JWT Strategy (Passport) | Decodes & validates access JWT, attaches user context |
| Refresh Store (DB table or cache) | Persists hashed refresh tokens with rotation semantics |
| Password Hashing | Bcrypt with adaptive cost (configurable) |
| Membership Resolver | Associates user ↔ tenant context |

## Token Model
- **Access Token**: Short TTL (e.g. 15m). Contains: `sub` (userId), `tenantId` (if bound), `role?`, `kid`. Signed with current active key.
- **Refresh Token**: Long TTL (e.g. 30d) but rotated on each use (one-time use chain). Stored hashed.
- **JWT Key Rotation**: `JWT_KEYS` env – JSON array: `{ kid, secret, current? }`. Active signing key marked `current:true`. Verification accepts any known key.

### JWT Claims (Access)
| Claim | Description |
|-------|-------------|
| sub | User ID |
| tenantId | Current tenant scope (optional for cross-tenant operations) |
| role | Cached role (optimization, validated server-side if critical) |
| iat / exp | Standard issued-at / expiry |
| jti | (Optional future) for revocation lists |

## Flows
### Login
1. Validate credentials.
2. Issue access (15m) + refresh (30d) tokens.
3. Hash refresh (bcrypt or fixed cost) and persist with metadata (ip, ua, createdAt, prevTokenId?).
4. Return raw refresh once (never log).

### Access Usage
- Access JWT sent via `Authorization: Bearer <token>`.
- Middleware / Strategy attaches `request.user`.

### Refresh
1. Client sends current refresh token.
2. Lookup hashed stored record (hash compare).
3. If valid & not revoked/expired: issue new pair (access + new refresh) and invalidate (delete or mark usedAt) previous refresh.
4. Return new tokens; client replaces stored refresh.

### Logout (Single Session)
- Delete/mark the refresh token entry; access token naturally expires.

### Global Logout (All Sessions)
- Invalidate all refresh rows for the user (tenant-scoped or global).

### Rotation Guarantees
- Replay of refresh token after successful rotation should yield `ERR_UNAUTHORIZED`.
- Timing window minimized by invalidating previous token before returning new one (atomic transaction recommended).

## Security Considerations
| Aspect | Practice |
|--------|---------|
| Brute force | Throttle login endpoint bucket (already via Throttler) |
| Token theft | Short access TTL + rotation reduces blast radius |
| Refresh fixation | Rotation invalidates old token each cycle |
| JWT key compromise | Multi-key rotation: add new key, mark current, remove old after TTL expiry window |
| Password hashing | Adjust bcrypt cost based on performance budget; monitor login latency |
| Storage | Refresh hashed (bcrypt) to prevent raw leak reuse |
| IP / UA tracking | (Future) store for anomaly detection |

## Admin Panel Integration
### Post-Login Bootstrap
1. Call `/auth/login` → store access (memory) & refresh (secure storage – ideally `localStorage` encrypted or httpOnly cookie if backend adapted).
2. Fetch `/me/permissions` (future) + `/me/profile`.
3. Schedule silent refresh (e.g., when access TTL < 2m, call refresh endpoint; if fails → force reauth).

### Silent Refresh Algorithm (Pseudo)
```ts
if (Date.now() > accessExp - 120_000) {
  try { const { access, refresh } = await refreshCall(oldRefresh); setTokens(access, refresh); }
  catch { forceLogout(); }
}
```

### Multi-Tab Strategy
- BroadcastChannel or storage event to sync new access token across tabs post-refresh.

### Super-Admin Support
- Add `platformRole` claim for cross-tenant browsing (bypasses membership requirement) – not yet implemented.

## Error Handling Mapping
| Scenario | Response Code | Error Code |
|----------|---------------|------------|
| Invalid credentials | 401 | ERR_UNAUTHORIZED |
| Disabled identity | 403 | ERR_IDENTITY_DISABLED |
| Expired refresh | 401 | ERR_UNAUTHORIZED |
| Replayed refresh | 401 | ERR_UNAUTHORIZED |
| Tenant missing (required endpoint) | 400/401 | ERR_TENANT_REQUIRED |

## Observability Hooks
- Increment login success/failure counters (future improvement).
- Trace spans around refresh rotation for latency monitoring.

## Future Enhancements
- HttpOnly secure cookie mode (refresh) + SameSite=strict fallback.
- Device/session listing endpoint with revoke one/all.
- WebAuthn / MFA factor issuance & enforcement.
- Account lockout after N failed logins with exponential backoff.
- Risk-based adaptive session TTL (shorten on suspicious geo).

## Testing Strategy
| Test | Purpose |
|------|---------|
| Unit AuthService credential fail | Ensures rejection path secure |
| Refresh rotation success | Returns new pair; old rejected |
| Refresh replay | Second attempt fails |
| Key rotation acceptance | Legacy kid still verifies |
| Access expiry | Expired token rejected |

