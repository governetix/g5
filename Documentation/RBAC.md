# RBAC & Permissions

Status: Implemented (static matrix) – ready for Admin Panel consumption.

## Overview
The system implements layered authorization:
1. **Tenant Scoping** – Ensures all resource access is constrained to a tenant via `X-Tenant-Id` and entity `tenantId` columns.
2. **Role-Based Access (RolesGuard)** – Coarse endpoint-level gating using roles metadata (`@Roles`).
3. **Granular Permissions (PermissionsGuard)** – Fine-grained capability checks tied to role→permission matrix (`@Permissions`).

OWNER is a superset and auto-passes all role & permission checks.

## Data Model
- Table: `memberships` (`tenantId`, `userId`, `role`, `status`) with uniqueness (tenant,user) and role/status constraints.
- Role Enum: `OWNER | ADMIN | EDITOR | VIEWER`.
- Future Extension: Add table `role_permissions` for dynamic overrides.

## Static Permission Matrix
Defined in `common/auth/permissions.ts`:
```
Permission          OWNER ADMIN EDITOR VIEWER
------------------------------------------------
tenant.read          ✓     ✓     (—)    ✓
tenant.update        ✓     ✓      —     —
project.create       ✓     ✓      ✓     —
project.read         ✓     ✓      ✓     ✓
project.update       ✓     ✓      ✓     —
project.delete       ✓     ✓      —     —
theme.manage         ✓     ✓      ✓     —
apikey.manage        ✓     ✓      ✓     —
webhook.manage       ✓     ✓      ✓     —
membership.invite    ✓     ✓      —     —
membership.read      ✓     ✓      ✓     ✓
membership.update    ✓     ✓      —     —
audit.read           ✓     ✓      ✓     ✓
queue.dlq.read       ✓     ✓      —     —
queue.dlq.retry      ✓     ✓      —     —
metrics.read         ✓     ✓      ✓     ✓
backup.restore       ✓     —      —     —
```
(ADMIN has all except backup.restore.)

## Runtime Resolution Flow
1. Authentication populates `request.user` with `userId` (and optionally cached `role`).
2. Guards order (`AppModule`): `RolesGuard` → `PermissionsGuard` → others.
3. If `user.role` absent, guard queries `memberships` by `(tenantId, userId)`.
4. `OWNER` short-circuits success; otherwise role vs required metadata evaluated.
5. Multiple `@Permissions` on a handler are ANDed.

## Decorators
- `@Roles('ADMIN','EDITOR')` – coarse access.
- `@Permissions('project.update')` – fine access.
- They can co-exist; failure in either denies.

## Admin Panel Integration
### Use Cases
- Show/hide UI actions (buttons / menu items) based on effective permissions list.
- Pre-fetch permissions once post-login to hydrate client-side ACL cache.
- Guard route navigation (e.g. DLQ page requires `queue.dlq.read`).

### Suggested API Endpoint (to add)
`GET /me/permissions` → returns:
```json
{
  "role": "ADMIN",
  "permissions": ["project.create","project.update", ...]
}
```
Compute server-side by expanding static matrix (or dynamic table in future). Cache for short TTL (e.g. 5m) keyed by user+tenant.

### Front-End Pattern
```ts
const can = (perm: string) => permissionsSet.has(perm) || role === 'OWNER';
if (can('project.delete')) { /* render delete */ }
```

### Evolution Path
| Phase | Change | Migration Impact |
|-------|--------|------------------|
| 1 (now) | Static TS matrix | None |
| 2 | DB table `role_permissions` (override add/remove) | One additive migration |
| 3 | Custom tenant-defined roles | New tables `roles`, `role_permissions` + migration |
| 4 | Attribute-based policies | Introduce policy engine fallback when permission missing |

## Extensibility Points
- Replace `roleHasPermission` implementation to read from cache/DB.
- Add composite permissions (e.g. `project.manage` expanding into multiple) for UI simplification.
- Add audit logging on high-risk permission checks (e.g. `backup.restore`).

## Operational Considerations
- Ensure membership query is indexed (`idx_memberships_tenant_user`).
- Per-request DB hit can be optimized with caching (Redis) keyed by `tenant:user` (TTL 60s). Invalidate on membership changes.
- Log denied accesses (rate-limit to avoid noise) for security analytics.

## Testing Strategy
- Unit test `roleHasPermission` matrix.
- Integration test: create membership for each role and assert endpoint responses for protected routes.
- Negative test: missing `X-Tenant-Id` returns tenant-related error before permission logic.

## Security Notes
- Permissions guard assumes validated tenant context; do not bypass `TenantGuard`.
- For super-admin (cross-tenant) panel accounts, introduce a separate claim (e.g. `platformRole=SUPERADMIN`) and bypass membership lookup while retaining audit trail.

## Pending Enhancements
- Permissions discovery endpoint (as above)
- Dynamic role editing API
- Caching layer
- Super-admin global scope
