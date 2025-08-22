# Feature Flags

Status: Minimal module implemented (global flags, no per-tenant targeting yet).

## Model
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| key | string | Unique key (`feature.sectionFlag`) |
| enabled | boolean | Current state |
| description | text | Optional description |
| createdAt/updatedAt | timestamptz | Audit fields |

## API
| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/feature-flags` | GET | any authenticated | Lista flags |
| `/feature-flags` | PATCH | OWNER/ADMIN | Upsert flag (create/update) |

Body PATCH:
```json
{ "key": "ui.newDashboard", "enabled": true, "description": "Nuevo dashboard reactivo" }
```

## Admin Panel Integration
- Precargar lista tras login para condicionar rutas / componentes.
- Hook sugerido: `useFeature('ui.newDashboard')` con fallback a false.
- Vista de administración: tabla editable (toggle + descripción) con PATCH incremental.

## Roadmap
| Phase | Enhancement |
|-------|------------|
| 1 | (actual) flags globales booleanos |
| 2 | Targeting por tenant / rol |
| 3 | Variantes (A/B) con payload JSON |
| 4 | Programación temporal / expiración |
| 5 | Telemetría de exposición (impressions) |

## Testing
- Crear flag nuevo; verificar idempotencia al repetir PATCH.
- Cambiar enabled true/false varias veces; verificar persistencia.
