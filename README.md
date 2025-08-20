# G5 Core Monorepo

## Arquitectura
Monorepo PNPM con apps y packages:
- apps/g5-core-api: API NestJS multi-tenant.
- packages/plugin-sdk: Cliente TypeScript generado desde OpenAPI.

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
