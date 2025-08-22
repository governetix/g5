## Readiness y Endpoints Recientes

### Motivación
El check `/health/ready` fallaba (`fail`) mientras `/health` retornaba `ok`. Esto ocurre porque el controlador de readiness valida acceso a **DB** y **Redis**. Si la API se ejecuta fuera de Docker sin variables correctas de conexión, la consulta `SELECT 1` o el `PING` a Redis fallan.

### Causas Comunes de `readiness: fail`
| Causa | Síntoma | Acción |
|-------|---------|--------|
| Postgres no levantado | Error de conexión en logs / ready=false | `docker compose up -d postgres` |
| Redis no levantado | Ping redis false | `docker compose up -d redis` |
| Variables DB_HOST/PORT erróneas | ready=false db=false | Verificar `.env` y docker-compose |
| Puerto ocupado (API previa) | Inicia pero no conecta DB | Detener proceso previo |

### Nuevos Endpoints Añadidos
| Ruta | Método | Descripción | Estado |
|------|--------|-------------|--------|
| `/v1/auth/login` | POST | Login (ya existía en AuthController) | Activo |
| `/v1/projects` | GET | Listado placeholder de proyectos | Nuevo |

### Próximos Pasos
1. Implementar servicio real de Projects (persistencia, filtros, paginación).
2. Integrar frontend `apiClient` para `/v1/projects` con cabecera `X-Tenant-Id`.
3. Extender status page para medir latencia y reintentar.
