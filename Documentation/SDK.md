# SDK Generation & Client Integration

Status: Implemented (OpenAPI → Types + Wrapper Client).

## Generation Pipeline
| Step | Tool | Description |
|------|------|-------------|
| 1 | Swagger generation script | Produces `openapi/openapi.json` from decorators |
| 2 | `openapi-typescript` | Generates TypeScript types into `packages/plugin-sdk/src/client/index.ts` |
| 3 | SDK Wrapper | Adds `G5Client` convenience layer (auth, tenant header) |
| 4 | Build | `pnpm -F @g5/sdk build` outputs ESM/CJS types |

## Wrapper Client (`G5Client`)
### Responsibilities
- Inject `Authorization` header (access token)
- Inject `X-Tenant-Id` header when provided
- Automatic token refresh via callback when 401 encountered
- Simplify base URL handling

### Initialization
```ts
import { G5Client } from '@g5/sdk';
const client = new G5Client({
  baseUrl: 'https://api.example.com',
  getAccessToken: () => authState.accessToken,
  onAuthError: async () => attemptRefresh(),
  tenantId: () => currentTenantId,
});
```

### Request Pattern
Wrapper likely exposes generic `request<T>()` or generated method proxies (future). Until full method generation, consumer may call fetch with typed bodies:
```ts
const project = await client.post('/v1/projects', { name: 'Demo' });
```

## Versioning Strategy
| Aspect | Approach |
|--------|---------|
| Semantic Bump | Align with core API tag (major when breaking schema) |
| OpenAPI Drift Detection | CI diff script fails if spec changed without commit |
| Deprecated Fields | Mark in description; remove in next major |

## Panel Integration
- Panel imports `@g5/sdk` for typed data models and error envelopes (shared types reduce duplication).
- Centralized API layer wraps `G5Client` to map error codes to UI messages.

## Handling Token Refresh
Pseudo logic inside wrapper:
```ts
async function authorizedFetch(input, init) {
  let res = await doFetchWithToken();
  if (res.status === 401 && refreshAvailable) {
    await refreshTokens();
    res = await doFetchWithToken();
  }
  return res;
}
```

## Future Enhancements
| Feature | Value |
|---------|-------|
| Fully Generated Method Stubs | IDE autocomplete for endpoints |
| Response Discriminators | Narrow union types on status codes |
| Retries with Jitter | Resilience for transient network failures |
| Pagination Helpers | Auto iterate cursor-based pages |
| Streaming Support | SSE/WebSocket convenience wrappers |
| Tree-shakable Sub-Clients | Reduced bundle size |

## Publishing
```bash
pnpm -F @g5/sdk build
pnpm -F @g5/sdk publish --tag latest
```
Ensure `version` bump in `packages/plugin-sdk/package.json` first.

## Testing Strategy
| Test | Purpose |
|------|---------|
| Type generation compile | Ensures OpenAPI schema valid |
| Wrapper 401 flow | Refresh path executed |
| Headers injection | Correct tenant + auth headers |
| Error mapping | Maintains standardized envelope parsing |

