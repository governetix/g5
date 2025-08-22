# FrontEnd Roadmap (Panel de Administración gAdmin)

Este roadmap reorganiza y prioriza las tareas del documento `PropossedTasks_Pannel.md` en fases entregables, con criterios de salida claros, dependencias, métricas y riesgos. Busca: (1) poner en producción valor usable temprano, (2) reducir riesgo técnico acumulado, (3) permitir aprendizaje iterativo antes de abordar funcionalidades complejas (governance, marketplace, overrides avanzados), y (4) evitar sobre-ingeniería inicial.

## 0. Principios Rectores
- Incremental: cada fase produce valor demostrable (demo usable o funcionalidad visible al usuario interno).
- Contratos Estables: API Core (OpenAPI v1) considerada estable antes de fases 4+ para evitar rework en UI avanzada.
- Observabilidad Temprana: métricas básicas y tracing ligero activados antes de optimizaciones de rendimiento profundas.
- Accesibilidad Continua: AA contraste y focus visibles validados desde el primer editor (no posponer a fase tardía).
- Seguridad Progresiva: comenzar con protección base (auth, RBAC, headers) y escalar a CSP dinámica / firmas / consent cuando exista superficie real.
- “Cut Lines”: cada fase puede cerrarse anticipadamente si alcanza el mínimo definido (MVP slice) sin bloquear la siguiente.

## 1. Resumen de Fases

| Fase | Objetivo Central | Duración Estimada | Criterio de Salida (Exit) | Riesgos Clave | Mitigaciones |
|------|------------------|-------------------|---------------------------|---------------|--------------|
| 0 | Fundamentos (Next + Auth + Tenant + SDK base) | 1 semana | Login, selección de tenant, `/admin/theme` placeholder, fetch con headers correctos | Config auth/refresh complejo | Implementar wrapper `apiClient` + pruebas manuales token refresh |
| 1 | Tokens mínimos (color, tipografía, spacing) + Editor básico | 1 semana | Guardar y reflejar 6–8 tokens en CSS vars live | Scope creep (añadir todo el schema) | Limitar schema inicial; expandir después |
| 2 | Theme CRUD + Version inicial (v1→v2) sin diff UI | 1 semana | Crear, editar, ver historial simple, rollback básico | Falta de diff legible provoca re-trabajo | Registrar `tokens` snapshots aunque UI diff llegue luego |
| 3 | Live Preview + RBAC UI + i18n básico | 1 semana | Preview aislado (iframe) + roles ocultan acciones + switch EN/ES | Mezcla de concerns | Mantener preview aislado en subruta con provider propio |
| 4 | Style Variants núcleo (Button, Input, Card) + derivación tokens | 1.5 semanas | CRUD variantes + merge determinista + preview states | Complejidad merge / overrides | Tabla de precedencias fija + pruebas unit |
| 5 | Accesibilidad integrada (contrast checker, focus ring tokens) | 0.5 semana | Warnings de contraste en editor + focus visible | Medición incompleta WCAG | Limitar a contraste / foco; posponer tamaño táctil |
| 6 | Versionado completo + Flujo Review/Publish temas | 1 semana | FSM draft→review→published + approve + publish + audit eventos | Estados inconsistentes | Servicio central FSM con tests |
| 7 | Export / Import básico (JSON solo, sin ZIP ni assets) | 0.75 semana | Exporta/Importa tema como draft con dry-run | Formato futuro incompatible | Incluir `schemaVersion` desde inicio |
| 8 | Pages Demo (Landing, Pricing) integradas a tokens/variants | 1 semana | 2 plantillas renderizadas usando `resolveStyle` | Retraso de gStyle afecta pages | Consumir solo componentes estabilizados |
| 9 | Style Variants ampliado (catálogo completo + diff + clone) | 1.5 semanas | +10 componentes, clonación, set default | Explosión combinatoria UI | Cargar variantes on-demand (virtual list) |
| 10 | Governance básico (approval multi reviewer + audit enriched) | 1 semana | Required reviewers (1..N) + audit diffs | Demora revisiones bloquea publish | Parámetro N=1 por defecto |
| 11 | Performance & Observabilidad (Lighthouse budget, metrics) | 0.75 semana | LCP <2.5s, bundle analizado, /metrics front | Métricas ruidosas | Etiquetas mínimas (page, tenant) |
| 12 | Marketplace inicial (instalar preset oficial) | 1 semana | Instala preset → crea draft, sin catálogo público | Vector seguridad import | Sanear + forzar draft always |
| 13 | i18n avanzado + RTL + sources fonts locales | 1 semana | UI completa traducida + RTL functional | Ajustes layout regresan | Test visual comparativo LTR/RTL |
| 14 | Completar seguridad (CSP dinámica, consent baseline) | 0.75 semana | CSP generada desde assets + banner consent | CSP false positives | Modo report-only 48h |
| 15 | Export/Import avanzado (ZIP + assets + checksum) | 1 semana | ZIP con manifest + sha256 + validación | Corrupción streaming | Calcular hash durante stream |
| 16 | Marketplace completo (ratings, filters, updates) | 1 semana | Catálogo filtrable + updates diff | Moderación ausente | Empezar curated allowlist |
| 17 | DX (Storybook + CLI + snippets) | 1 semana | Storybook multi-theme + comando `g5 sdk update` | Duplicación tokens vs UI | Fuente única: SDK tipos |
| 18 | Hardening GA (stress, a11y, visual regression, policies) | 1.5 semanas | Suites verde + budgets + docs actualizadas | Scope final se expande | Congelar backlog para GA |
| 19 | Stretch (context overrides per page, scheduling, shareable previews extended, advanced consent analytics) | Ad-hoc | N/A | Post-GA fatiga | Feature flags + gating |

## 2. Re-Mapping de Secciones Originales

| Sección Original | Nueva Fase Principal | Ajuste | Motivo |
|------------------|----------------------|--------|--------|
| 0 Infra | 0 | Mantener | Fundamento indispensable |
| 1 Tokens Schema completo | 1 (+ expansiones en 4/9) | Dividir | Evitar Big Bang schema |
| 2 gTheme Versionado + Publicación + Activación | 2 y 6 | Escalonar | Reducir riesgo inicial |
| 3 gStyle completo | 4 y 9 | Particionar | Entregar primero subset crítico |
| 4 Resolución/Context Overrides | 9 y 19 (overrides page) | Aplazar parte | Alto costo vs valor temprano |
| 5 Pages Demo | 8 | Después de base style | Demostrar integración real |
| 6 Preview/Publicación Avanzada | 3 (preview básico) y 6 (publish FSM) y 19 (shareable extended) | Fases | Reducir complejidad simultánea |
| 7 Export/Import/Marketplace | 7 (export básico), 12, 15, 16 | Progresivo | Minimizar superficie ataques temprano |
| 8 Accesibilidad & SEO | 5 (contraste) + 11 (perf) + 13 (i18n avanzado) + 18 (regresión completa) | Distribuir | Validación continua |
| 9 Seguridad & Compliance | 0 (headers base) + 14 (CSP/consent) + 18 (pentest) | Fasear | CSP demasiado temprano ralentiza |
| 10 Performance & Publicación | 11 | Consolidar | Métricas necesitan base estable |
| 11 i18n Avanzado | 13 | Mantener | Después de UI estable |
| 12 Gobernanza | 10 | Aplazar | Hasta flujo básico funcional |
| 13 DX & Catálogo Visual | 17 | Aplazar | Evitar mantenimiento extra inicial |
| 14 Release & Calidad | 18 | Final | Hardening pre-GA |

## 3. Corte MVP (Fases 0–3)
MVP objetivo: Demostrar multi-tenant theme editing simple + preview seguro + RBAC + export básico (opcional). Valor: ya permite personalización de branding inicial.

Incluye: Auth, Tenant Switch, Theme tokens base (colores, tipografía, spacing), Theme CRUD + 1 versión, Live Preview, RBAC UI, i18n EN/ES básico.
Excluye: Variants complejos, governance multi-reviewer, marketplace, overrides contextuales.

## 4. Métricas por Fase
- Adopción: nº tenants con ≥1 theme custom (Fase 2+).
- Velocidad: lead time (crear → publicar) mediana, objetivo <15 min (Fase 6+).
- Calidad: ratio rollback/publicaciones <10% (Fase 10+).
- Rendimiento: LCP p95 < 2.5s en páginas demo (Fase 11+).
- A11y: Contrast warnings resueltos ≥90% antes de publicar (Fase 18).
- Seguridad: 0 vulnerabilidades High (npm audit / CodeQL) en pipeline (Fase 18).
- DX: Tiempo regenerar SDK <5s; storybook refresh <3s (Fase 17).

## 5. Riesgos Principales y Mitigación

| Riesgo | Impacto | Prob. | Mitigación | Trigger de Revisión |
|--------|---------|-------|-----------|---------------------|
| Sobrecarga de alcance temprano | Retraso MVP | Alta | Fasear schema tokens | Lead time >2x plan |
| Mezcla de governance + CRUD inicial | Inestabilidad | Media | Aplazar governance a Fase 10 | Bugs de estados >3 en sprint |
| Falta de diff tokens legible | Rollbacks manuales costosos | Media | Guardar snapshots desde Fase 2 | Rollback manual >2/día |
| Complejidad variantes (combinatoria) | Lento/bugs UI | Alta | Subset 3 componentes primero | Render preview >300ms |
| Performance regresiva tardía | Re-trabajo costoso | Media | Métricas base en Fase 11 | LCP p95 >3s |
| Mercado inseguro (import malicioso) | Brecha seguridad | Media | Import draft-only + sanitizar | 1 payload rechazado crítico |
| i18n tardío sin keys centralizadas | Refactor masivo | Media | Empezar con i18n base en Fase 0 (infra de mensajes) | Strings hardcode >5% |
| CSP tardío dificulta depuración | Riesgo XSS | Baja | Policy mínima + nonce wrapper temprano (opt) | Report XSS sospechoso |

## 6. Decisiones Arquitectónicas Clave
- Tokens → CSS Variables: Evitar CSS-in-JS para performance y facilidad de export/import.
- Derivación Variants: Árbol plano (token base → component mapping → variant overrides); no cascadas anidadas para simplificar diff.
- Diff Tokens: Estructura “added/removed/changed (old, new)” serializada (JSON) para auditoría; UI diffs textuales posteriores.
- Preview Isolation: iframe con `previewToken` (scope de permisos limitado a GET) + subdominio futuro (`preview.`) para CSP distinta.
- Caching Resolución: Cache en memoria por (tenant, themeVersion, componentKey) invalidada por eventos `theme.updated` / `variant.updated`.
- RBAC Cliente: Consumir `/users/me/permissions` y derivar booleanos `can*` memorizados; no recalcular en cada render.
- Feature Flags Panel: Para activar fases avanzadas (Marketplace, Governance multi-reviewer) sin redeploy forzado.

## 7. Estrategia de Testing Escalonada
- Fases 0–2: Unit tests básicos (apiClient, token parsing).
- Fases 3–6: Añadir e2e Playwright (login, editar, preview, publicar).
- Fase 9+: Visual regression en componentes críticos (Button, Card) antes de ampliar catálogo.
- Fase 11: Lighthouse CI umbrales.
- Fase 17: Storybook snapshot + axe-core automático.
- Fase 18: Stress (concurrent edits), seguridad (DOMPurify, CSP), cobertura >70% líneas.

## 8. Lista de Backlog Diferido / Stretch
- Context overrides per-page complejos.
- Scheduling publicación con ventanas freeze avanzadas.
- Inspector estilo granular con árbol interactivo.
- RTL fine-tuning per componente exótico.
- Consent granular por bloque (analytics vs ads vs chat) con auditoría detallada.
- Marketplace social (ratings, comentarios públicos).
- Webhooks preview shareables con expiración configurable >7 días.

## 9. Criterios de Calidad por Hito (Resumido)
- MVP (Fase 3): UX consistente, errores tipados, sin console errors críticos, LCP <3s.
- Beta (Fase 9): Variants ampliados, versionado estable, contrast checker, rollback confiable.
- RC (Fase 13): i18n completo, governance básico, export/import estable.
- GA (Fase 18): Budgets performance & a11y cumplidos, seguridad reforzada, documentación actualizada, pipeline verde.

## 10. Métricas de Observabilidad (Implementar Gradualmente)
- `frontend_request_duration_seconds{route}` (histogram) – Fase 11.
- `frontend_theme_apply_ms` – tiempo aplicar variables (observer). Fase 11.
- `frontend_preview_iframe_load_ms` – Fase 3.
- `frontend_variant_editor_render_ms` – Fase 4.
- `frontend_accessibility_warnings_total` – Fase 5.
- `frontend_publish_flow_duration_seconds` – Fase 6.

## 11. Plan de Refactors Previos a GA
1. Consolidar duplicación de validadores tokens (server/client) → paquete compartido.
2. Extraer `resolveStyle` a worker (opcional) si p95 >5ms por resolución en catálogos grandes.
3. Revisión de dependencias UI: eliminar libs no críticas (reducir bundle <250KB).
4. Unificar tipado de diffs (tema y variante) en `@g/sdk`.

## 12. Checklist Resumida por Fase (High-Level)
F0: Auth + Tenant + SDK + Layout
F1: Editor tokens base + CSS vars
F2: Theme CRUD + snapshots + rollback simple
F3: Preview iframe + RBAC UI + i18n base
F4: Style Variants núcleo (3 componentes) + merge
F5: Contrast & focus a11y guard
F6: FSM Review/Publish + audit eventos
F7: Export/Import JSON básico
F8: Demo Pages (Landing, Pricing) integradas tokens
F9: Variants catálogo ampliado + clone + diff
F10: Governance (required reviewers) + enriched audit
F11: Perf & metrics & budgets iniciales
F12: Marketplace preset inicial
F13: i18n avanzado (RTL, fuentes locales)
F14: CSP dinámica + consent base
F15: Export/Import ZIP + assets + checksum
F16: Marketplace completo
F17: Storybook + CLI + snippets
F18: Hardening (tests, budgets, pentest) → GA
F19: Stretch (context overrides, scheduling avanzado, inspector avanzado)

## 13. Recomendaciones Inmediatas
1. Aceptar este roadmap como base y marcar en el documento original qué items migran a qué fase.
2. Crear issues etiquetadas por `phase` y `type` (feature, infra, test, doc).
3. Implementar Fase 0 ahora (bootstrap repo `apps/gadmin`).
4. Integrar pipeline mínimo (lint + build) antes de Fase 1.
5. Activar feature flagging simple para gating de Fases 12+.

---
Documento vivo: actualizar al cierre de cada fase con métricas reales vs estimadas y ajustar duración futura.
