# Multi-Tenancy Architecture

Status: Implemented – Header + DB-scoped model.

## Tenancy Model
| Aspect | Approach |
|--------|---------|
| Isolation | Logical (single DB) with `tenantId` FK on multi-tenant entities |
| Ingress Identification | HTTP header `X-Tenant-Id` (UUID or slug->UUID resolve future) |
| Enforcement | `TenantGuard` + repository filtering / service-level constraints |
| Membership Binding | `memberships` table joining user↔tenant + role |

## Tenant Resolution Flow
1. Request enters with `X-Tenant-Id` header.
2. Guard validates format (UUID) – future: slug resolution via cache.
3. Guard attaches `tenantId` to request context (AsyncLocal or request object).
4. Downstream services use `tenantId` for queries and membership lookups.

## Entity Strategy
- All tenant-scoped tables include `tenantId` column (indexed, often part of composite unique constraints where applicable).
- Global tables (e.g. feature flags, plans) can omit `tenantId`.

## Guard Stack Interaction
| Order | Guard | Purpose |
|-------|-------|---------|
| 1 | Throttler / Rate | Generic throttle |
| 2 | TenantGuard | Ensures tenant context present where required |
| 3 | RolesGuard | Role gating |
| 4 | PermissionsGuard | Fine-grain permissions |
| 5 | ApiKeyAuth / etc | Auth variants |

## Super-Admin (Future)
Introduce a `platformRole=SUPERADMIN` claim:
- Bypasses membership lookup.
- Allows omitting `X-Tenant-Id` for cross-tenant listing endpoints (must be explicitly annotated to avoid accidental leakage).
- All access audited with `targetTenantId` field.

## Panel Integration
### Context Switching
- Panel header/selector sets chosen tenant; store in memory/localStorage.
- On switch: clear caches (permissions, lists) and refetch base metadata.

### Missing Tenant Handling
- API returns `ERR_TENANT_REQUIRED` if header absent for protected endpoints; panel redirects to tenant selection.

### Cross-Tenant Views
- For super-admin only: global overview page -> provide `?tenantId=` query for lazy loading; ensure endpoints defend against unbounded scans (pagination mandatory).

## Performance Considerations
| Concern | Mitigation |
|---------|-----------|
| Query fan-out | Avoid non-tenant-filtered queries on large tables |
| Hot partition | If a single tenant grows large, consider vertical sharding strategies (future) |
| Index bloat | Composite indexes `(tenantId, something)` kept lean; periodic reindex as needed |

## Future Evolution Paths
| Phase | Enhancement |
|-------|------------|
| 1 | Slug-based tenant resolution cache (slug→UUID) |
| 2 | Per-tenant resource quotas (rate limiting integration) |
| 3 | Read replica routing per geography |
| 4 | Physical multi-DB partition (single `TenantRegistry` database) |
| 5 | Full multi-region active-active conflict resolution |

## Testing Strategy
- Ensure access without header returns error for tenant-scoped endpoints.
- Confirm cross-tenant data leakage attempts fail (manipulating IDs).
- Benchmark queries by tenant with typical filters (explain analyze) to validate index usage.

## Observability
- Add `tenantId` label to key metrics where cardinality safe (avoid high-cardinality explosion; sample top tenants only if necessary).
- Log `tenantId` in structured logs (already via audit / correlation layering).

## Security Notes
- All writes must include tenant predicate; add service-layer assertions for defensive programming.
- Avoid using user-provided tenant IDs directly in dynamic SQL (use parameter binding always).

## Failure Modes
| Mode | Effect | Handling |
|------|--------|----------|
| Missing header | 400/ERR_TENANT_REQUIRED | Prompt select tenant |
| Unknown tenant | 404/ERR_NOT_FOUND | Show not found / invite flow |
| Membership missing | 403/ERR_FORBIDDEN | Offer request access UI |

