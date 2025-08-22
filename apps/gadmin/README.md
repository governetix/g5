# gAdmin (Panel Administrativo)

Estado: Panel de estado inicial operativo + editor de tema (fase 1 en progreso).

## Scripts

```bash
pnpm dev        # en raíz: levanta todos (turbo) o filtra: pnpm --filter gadmin dev
pnpm build      # build producción
pnpm start      # iniciar servidor Next en modo prod
```

## Variables de Entorno Front
- `NEXT_PUBLIC_CORE_API_URL` (opcional, default http://localhost:3001)

## Flujo Auth Dummy (Temporal)
Se usa `POST /api/login` local (no backend real aún). Cualquier email/password devuelve token base64 y cookie `auth_token` httpOnly.

## Panel de Status (single pane)
- URL (Docker): http://localhost:3005/admin/status
- Checks incluidos: `/health`, `/health/ready`, `/metrics`, `/docs`, `/v1/projects`, `/health/smoke/db`, `/health/smoke/redis` y placeholder `/v1/auth/login`.
- Controles: Auto-refresh (3/5/10/30s), botón Re-ejecutar, botón Run por fila, input `Tenant ID` (envía `X-Tenant-Id` y se persiste en localStorage), enlaces rápidos a Swagger y Métricas.
- Telemetría: Latencia por check, estado y detalle (truncado) por respuesta.
- Config base API: `NEXT_PUBLIC_CORE_API_URL` o por defecto `http://localhost:3001`.

Pendiente: Visor de logs en vivo (SSE/WebSocket) integrado en el panel.

## Estructura Relevante
- `app/login` página acceso
- `app/admin/*` se protege vía `middleware.ts`
- `components/auth/AuthProvider.tsx` estado usuario
- `components/tenant/TenantProvider.tsx` selección tenant (sessionStorage)
- `lib/apiClient.ts` wrapper fetch con Authorization + X-Tenant-Id
- `i18n/` diccionarios mínimos EN/ES

## Tokens Base (Fase 1)
Editor en `/admin/theme` permite modificar:
- primary
- background
- foreground
- secondary
- accent
- radius (px)
- fontFamily
- spacing (unidad base px)

Auto-cálculo: `--primary-foreground` se determina según luminancia para contraste.
Persistencia: localStorage (`gadmin_tokens_v1`).

### Contraste
Se muestra ratio y nivel (AA / AAA / AA Large) entre `primary` y foreground derivado para vigilar accesibilidad temprana.

### Snapshots Locales
- Botón "Guardar Snapshot" almacena hasta 25 snapshots en `localStorage` (`gadmin_token_snapshots_v1`).
- Cada snapshot guarda timestamp y tokens.
- Acción "rollback" aplica inmediatamente los tokens del snapshot.

## Próximos Pasos Fase 2
- Theme CRUD real contra API (persistencia servidor + snapshots).
- Historial y rollback simple.
- Preparar estructura de versiones (v1→v2).

## Pruebas Locales
1. Con Docker (recomendado):
   ```powershell
   docker compose -f docker-compose.dev.yml up -d
   ```
   - Admin: http://localhost:3005 (status en `/admin/status`)
   - API: http://localhost:3001

2. Modo dev independiente (Next dev server):
1. Arranca backend core si se desea (puede omitirse en dummy):
   ```powershell
   docker compose up -d postgres redis
   pnpm --filter g5-core-api dev
   ```
2. Arranca frontend:
   ```powershell
   pnpm --filter gadmin dev
   ```
3. Navega a: http://localhost:3000/login (dev) o http://localhost:3005/login (Docker)
4. Usa credenciales dummy (cualquier email y password). Ejemplo:
   - Email: demo@example.com
   - Password: password
5. Serás redirigido a `/admin/theme`.

## Notas
- El token se almacena en cookie httpOnly + sessionStorage (temporal). Se migrará a flujo refresh real.
- Multi-idioma: toggle manual aún no expuesto en UI (pendiente toggle selector).
