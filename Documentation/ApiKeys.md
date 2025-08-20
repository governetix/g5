# API Keys Lifecycle

Status: Implemented – hashing + pepper/HMAC support.

## Overview
API Keys provide programmatic access scoped to tenant context. Raw value shown only at creation/rotation.

## Storage & Security
| Aspect | Implementation |
|--------|---------------|
| Hashing | SHA-256 over (raw + optional pepper) or HMAC-SHA256 if `API_KEY_HMAC_SECRET` set |
| Pepper | Static server-side secret appended before hash (increases difficulty of rainbow attacks) |
| HMAC Mode | If secret present, use `HMAC(key=HMAC_SECRET, rawKey)`; DB stores hex digest |
| Prefix Strategy | (Future) Show first/last chars only in UI for recognition |
| Revocation | `revokedAt` timestamp filter exclusion |
| Rotation | Issues new raw key; old key revoked (optionally overlap window) |

## Key Format
- Suggested raw structure: `<tenantShort>-<randBase32>` (currently random; improvement future for UX).
- Length: ≥ 32 bytes entropy post-base32.

## Creation Flow
1. Generate high-entropy random bytes.
2. Derive hash (pepper or HMAC path).
3. Persist: `{ id, tenantId, name, hash, createdAt, lastUsedAt:null, revokedAt:null }`.
4. Return raw once; never re-display.

## Validation Flow (Inbound Request)
1. Extract from header `X-API-Key` (or Authorization variant future).
2. Derive candidate hash same algorithm branch.
3. Lookup by `(tenantId, hash)` (index recommended) ⇒ authenticate context & permissions.
4. (Optional future) Update `lastUsedAt` asynchronously (debounced).

## Panel Integration
### Listing
- Endpoint returns anonymized keys: `id, name, createdAt, lastUsedAt, revokedAt, truncatedDigest`.
- Show status (Active / Revoked / Rotating...).

### Creation UI
- Form: name / description.
- After API returns, display modal with raw key + copy button + warning (cannot be retrieved again).

### Rotation UI
- Action: "Rotate" -> backend creates new key, revokes old (optionally grace window config).
- Display new raw key modal.

### Revocation UI
- Soft delete: set `revokedAt`.
- Filter active keys for usage list.

### Searching / Filtering
- Filter by `lastUsedAt` range, status, substring of name.

## Metrics & Auditing
- Audit events: created, rotated, revoked, used (sampled) – for anomaly detection.
- Metric idea: `apikey_uses_total{tenantId}` increment (watch cardinality).

## Future Enhancements
| Feature | Description |
|---------|-------------|
| Scoped Key Permissions | Attach subset of permissions limiting operations |
| Expiring Keys | Optional `expiresAt` column enforcing lifecycle |
| Prefix Collision Protection | Store short prefix separately for constant-time lookup |
| Bulk Rotation | Per-tenant mass rotate on compromise |
| Diff Alerts | Alert if sudden surge in key usage or from new geo/IP |

## Operational Considerations
- Changing pepper/hmac secret invalidates ability to verify old stored hashes unless re-hashed; design rotation plan (dual-secret window) before change.
- Monitor key creation rate vs. quota per tenant.

## Testing Strategy
| Test | Purpose |
|------|---------|
| Create key -> returns raw | Ensures one-time display |
| Rotate key -> old rejected | Correct revocation sequence |
| Revoked key usage | Denied access |
| HMAC vs hash modes | Both algorithm branches produce expected digest |

