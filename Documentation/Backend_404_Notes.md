## Notas sobre 404 en el Core API

Cuando recibes respuestas como:

```
{"success":false,"code":"ERR_NOT_FOUND","message":"Cannot GET /api/projects","status":404,"traceId":"..."}
```

Esto significa que **la ruta no está implementada todavía** en el backend NestJS. No indica un problema de Tenants ni de autenticación inicial.

### Rutas actualmente existentes (baseline)
- `GET /` (Hello World temporal)
- `GET /health` (estado superficial)
- `GET /health/ready` (estado con chequeo DB/Redis)

### Rutas pendientes (planificadas pero NO expuestas aún)
- `POST /auth/login` (autenticación / JWT)
- `GET /api/projects` (listado de proyectos multi-tenant)
- Cualquier otro prefijo `/api/...` de CRUD de entidades.

### Próximos pasos
Las rutas se introducirán gradualmente siguiendo el Roadmap (Fase 0 - Auth & Tenants, luego CRUD inicial). Hasta entonces, 404 es el comportamiento esperado.

### Cómo distinguir problemas
- 404 con mensaje `Cannot GET/POST ...`: Ruta inexistente.
- 401/403: Ruta existe pero falta token/cabecera.
- 500: Error interno (consultar logs).

Si dudas, revisa Swagger `/docs`: una ruta ausente en Swagger aún no está implementada.
