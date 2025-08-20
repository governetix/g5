# G5 Core Monorepo

## Arquitectura
Monorepo PNPM con apps y packages:
- apps/g5-core-api: API NestJS multi-tenant.
- packages/plugin-sdk: Cliente TypeScript generado desde OpenAPI.

## Componentes Clave (Core API)
- Auth: JWT multi-clave (rotación via `JWT_KEYS`), refresh hash + rotación.
- Multi-tenancy: header `X-Tenant-Id` + scoping por entidad.
- API Keys: hash SHA-256 + pepper/HMAC opcional (`API_KEY_PEPPER`, `API_KEY_HMAC_SECRET`).
- Webhooks: cola + DLQ + reintentos + métricas.
- Observabilidad: Prometheus (/metrics), OpenTelemetry opt-in, alertas internas (DLQ, error-rate, p95/p99, DB health) con Slack webhook opcional.
- Backups: pg_dump diario + cifrado opcional (`BACKUP_ENCRYPT_PASSPHRASE`).
- Migrations: TypeORM (no sync), scripts run/rollback.
- Idempotency & Rate Limiting: Redis sliding window + response cache por key.

## Arranque local
```powershell
# Levantar infra
docker compose up -d postgres redis
# Instalar dependencias
pnpm install
# Exportar variables (PowerShell)
$Env:DB_HOST='127.0.0.1'
$Env:DB_PORT='55432'
$Env:DB_USER='g5_user'
$Env:DB_PASS='g5_pass'
$Env:DB_NAME='g5_db'
$Env:REDIS_HOST='127.0.0.1'
$Env:REDIS_PORT='6379'
$Env:JWT_SECRET='dev_jwt_secret_12345'
# Build y run
pnpm -F g5-core-api build
node apps/g5-core-api/dist/src/main.js
```
Health: http://localhost:3001/health
Swagger JSON: http://localhost:3001/docs-json

## Regenerar artefactos (OpenAPI / Postman / Client)
```powershell
pnpm -F g5-core-api artifacts:runtime
pnpm -F g5-core-api check:artifacts
```
Genera:
- apps/g5-core-api/openapi/openapi.json
- packages/plugin-sdk/src/client/index.ts
- postman/g5-core-api.postman_collection.json

## SDK (`@g5/sdk`)
Instalación (después de publicar):
```bash
pnpm add @g5/sdk
```
Uso básico:
```ts
import { G5Client } from '@g5/sdk';
const client = new G5Client({ baseUrl: 'https://api.example.com/v1', tenantId: 't1', accessToken: 'jwt_or_api_key' });
const me = await client.auth.me();
```
Auto refresh (callback onAuthRefresh):
```ts
const client = new G5Client({
	baseUrl: 'https://api.example.com/v1',
	onAuthRefresh: async () => {
		// call your refresh endpoint or secure storage
		return obtainNewAccessToken();
	}
});
```
Generar y compilar localmente (no publish):
```powershell
pnpm -F g5-core-api gen:sdk
```

## CI/CD Pipeline
Pasos (GitHub Actions):
1. Checkout + install deps (pnpm).
2. Build core API.
3. Ejecutar migraciones (`migrate-run`).
4. Tests + cobertura (umbrales en `jest` config).
5. Check pending migrations (`check:migrations`).
6. Generar artefactos runtime (OpenAPI, Postman, TS client) y validar tamaños.
7. Diff OpenAPI vs repo (`openapi:diff`) para exigir commit de cambios.
8. (Opcional futuro) Publicar SDK si tag semántico creado.

## Versionado & Tagging
- Branch principal: `main`.
- Tag inicial estable: `core-v1.0.0` (incluye funcionalidades listadas en Arquitectura + seguridad + observabilidad + SDK).
- Cambios de contrato (breaking) -> incrementar versión mayor (p.ej. `core-v2.0.0`).
- Menores para features retro-compatibles `core-v1.1.0`; parches para fixes `core-v1.0.1`.

## Migraciones
Crear:
```powershell
pnpm -F g5-core-api migration:generate Nombre
```
Aplicar:
```powershell
pnpm -F g5-core-api migration:run
```
Rollback:
```powershell
pnpm -F g5-core-api migration:down          # última
pnpm -F g5-core-api migration:down 2        # últimas 2
pnpm -F g5-core-api migration:down to 1709  # hasta un timestamp parcial
```

## Backups & Restore
Ver README específico en `apps/g5-core-api` para detalles (cifrado, restore script). Resumen: cron 01:00, retention `BACKUP_RETENTION_DAYS`, cifrado AES-256 opcional.

## Alertas Internas
- Variables: `ALERT_DLQ_THRESHOLD`, `ALERT_ERROR_RATE_5M`, `ALERT_P95_LATENCY`, `ALERT_P99_LATENCY`, `ALERTS_SLACK_WEBHOOK`, `ALERTS_COOLDOWN_SEC`.
- Logs `ALERT[key]` + Slack (si configurado).

## Observabilidad
- Métricas clave: `http_requests_total`, `http_request_duration_seconds`, `http_4xx_total`, `http_5xx_total`, `webhook_delivery_duration_seconds`, `webhooks_dlq_size`, `webhook_*_total`.
- Trazas: set `OTEL_EXPORTER_OTLP_ENDPOINT` y (opcional) `OTEL_SERVICE_NAME`.

## Contribución
1. Crear feature branch.
2. Añadir/actualizar migraciones (no editar migraciones ya committeadas).
3. Ejecutar `pnpm -F g5-core-api ci:gates` local.
4. Si cambia API pública: commit del nuevo `openapi.json` y re-generar SDK.
5. Pull Request con resumen de impacto (seguridad, migraciones, métricas nuevas).

## Roadmap (resumido)
- Admin panel UI (multi-tenant management).
- Outbox para webhooks/eventos.
- Uso & cuota por API key.
- Métricas adicionales (tail latencies segmentadas por ruta crítica).
- Integración SSO / IdP externos.

## Runbooks
### Backups
- Variable `ENABLE_BACKUPS=true` activa cron interno (pg_dump). Output (simulado) configurable.
- Restaurar: usar archivo generado en storage externo y `psql < dump.sql`.

### DLQ Webhooks
Listar DLQ:
```
GET /v1/webhooks/dlq  (header X-Tenant-Id requerido)
```
Reprocesar job:
```
POST /v1/webhooks/dlq/{jobId}/replay
```

### Alertas
- DLQ size: AlertsService monitorea tamaño; revisar logs con tag `[AlertsService]`.
- DB health: revisar endpoint `/v1/health/ready`.
- Acción: si DLQ crece, inspeccionar job payload y endpoints externos.

### Retención y Limpiezas
Cron jobs eliminan refresh tokens revocados y logs antiguos (config plazo en variables si se agrega). Ver logs JobsModule.

### Regenerar Cliente para Frontend
Tras cambios en controladores/DTOs:
```powershell
pnpm -F g5-core-api gen:swagger
pnpm -F g5-core-api gen:client:direct
```

### CI Gates Manual
```powershell
pnpm -F g5-core-api ci:gates
```
Incluye lint, build, migrations check, tests, cobertura, artefactos.

## Troubleshooting
- Postgres auth: si falla, `docker compose down` y eliminar volumen `docker volume rm g5_g5_pgdata_v2`, luego `docker compose up -d`.
- Puerto 55432: mapeado a 5432 dentro del contenedor.
- Redis mínimo recomendado 6.2: usar imagen redis:7 para producción.
- Artifacts script colgado: ahora instrumentado (ver `scripts/gen-artifacts-runtime.js`). Si tarda >2m revisar logs de arranque de Nest.

## Licencia
Privado.
