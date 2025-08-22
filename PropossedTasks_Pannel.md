NOTA: En la carpeta "Documentation" se han incluído varios archivos .md que contienen explicaciones técnicas de cómo fueron creados las diversas funcionalidades, verifica dichos archivos, al igual que los archivos de código, en caso de alguna duda. Marca las tareas completadas o en proceso como se indica en cada sección. 

# 📖 Módulos de Personalización (nomenclatura)

Los nombres internos de módulos usan prefijo g (p. ej., gTheme, gStyle) para evitar conflictos. En las URLs públicas y la UI se usan nombres comunes: /admin/theme (Theme), /admin/style (Style).

* **gTheme (Theme)**: Gestión de temas por tenant. Define y versiona design tokens (colores, tipografías, espaciados, sombras, radios, z-index, transiciones, opacidades, breakpoints) y configura modos light/dark. Aplica temas activos por tenant con fallback global y export/import.
* **gStyle (Style)**: Gestión de variantes de componentes (Button, Input, Select, Checkbox, Radio, Switch, Badge, Tag, Alert, Tooltip, Modal, Drawer, Tabs, Accordion, Card, Table, Pagination, Navbar, Sidebar, Footer, Hero, Section, CTA, etc.) heredando tokens de gTheme con overrides seguros.
* **gAdmin (Admin Panel)**: App Next.js (TS + Tailwind + shadcn/ui) que expone UI para gTheme, gStyle y el resto del Core. Integra auth, RBAC, i18n, previsualización, auditoría y publicación.
* **gAuth / gMemberships**: Autenticación, roles y permisos (OWNER/ADMIN/EDITOR/REVIEWER/VIEWER). Controla quién puede crear/editar/aplicar temas y estilos.
* **gPages (Pages)**: Generador de páginas y bloques reutilizables que consumen tokens/variantes para validar estilos y construir contenido visual consistente.
* **plugin-sdk**: Tipos y cliente OpenAPI/TS para consumir el Core desde el panel y plugins. Expone tipos: Theme, StyleToken, ComponentVariant, ThemeVersion, utilidades de X-Tenant-Id y auth.

---

# ✅ Checklist — 0) Preparativos de Base

**Estados:** \[x] Hecho · \[\~] En progreso · \[ ] No hecho

### A. Infra Frontend

* [ ] **Crear app Admin** — *módulo*: `gAdmin` · *tarea técnica*: Inicializa Next.js 14 con TypeScript en `/apps/gadmin` (monorepo PNPM). Añade Tailwind y shadcn/ui.

  * Sub-tareas:
    * [ ] `pnpm dlx create-next-app@latest gadmin --ts --eslint --app --src-dir --import-alias "@/*" --use-pnpm`
    * [ ] `pnpm -F gadmin add tailwindcss postcss autoprefixer @radix-ui/react-icons class-variance-authority tailwind-merge lucide-react`
    * [ ] `pnpm -F gadmin dlx shadcn@latest init` (y configura base)
    * [ ] Crear `app/(admin)/layout.tsx` con **Shell** (Sidebar + Topbar)
    * [ ] Añadir `theme-provider` (dark/light, CSS variables)
* [ ] **Layout & rutas mínimas** — *módulo*: `gAdmin` · *tarea técnica*: Crea páginas protegidas `/admin/theme` y `/admin/style` (TBD dentro) con layout consistente.

  * Sub-tareas:
    * [ ] `app/(admin)/theme/page.tsx` y `app/(admin)/style/page.tsx`
    * [ ] Barra lateral con links (oculta por rol)
    * [ ] Estados `loading.tsx` y `error.tsx`
* [ ] **Auth contra Core** — *módulo*: `gAdmin` · *tarea técnica*: Pantalla `/login`, llamada a `/v1/auth/login`, almacenamiento de **access** y **refresh**; refresh automático; logout.

  * Sub-tareas:
    * [ ] Servicio `authClient` con `login/refresh/logout`
    * [ ] Guarda tokens en **cookies httpOnly** vía API route (`/api/session`) o, si no usas cookies, en `memory + secure storage` (evitar `localStorage` si es posible)
    * [ ] Interceptor fetch que añade `Authorization: Bearer`
* [ ] **Inyección de `X-Tenant-Id`** — *módulo*: `gAdmin` · *tarea técnica*: Selector de tenant en Topbar + middleware/interceptor que añade la cabecera en **todas** las requests.

  * Sub-tareas:
    * [ ] Contexto `TenantContext` + `useTenant()`
    * [ ] `apiFetch` centralizado que adjunta `X-Tenant-Id`
* [ ] **i18n base** — *módulo*: `gAdmin` · *tarea técnica*: Configura internacionalización (por ejemplo `next-intl` o `next-i18next`) con `es` y `en`, soporte RTL preparado.

  * Sub-tareas:
    * [ ] Archivos de mensajes `/locales/{en,es}.json`
    * [ ] Switch de idioma en Topbar
* [ ] **Verificación A (Infra)** — *checkpoint*:

  * [ ] Puedes iniciar sesión y ver `/admin/theme` y `/admin/style` con layout cargado
  * [ ] Las requests muestran `Authorization` y `X-Tenant-Id` en el network inspector
  * [ ] Cambiar idioma actualiza textos sin recargar (SSR/CSR coherente)

---

### B. SDK & Tipos

* [ ] **Cliente OpenAPI** — *módulo*: `plugin-sdk` · *tarea técnica*: Genera cliente TypeScript desde `openapi.json` del Core; publicar como paquete interno del monorepo.

  * Sub-tareas:
    * [ ] `pnpm -w add -D openapi-typescript`
    * [ ] Script `pnpm gen:sdk` → genera tipos y cliente (`/packages/plugin-sdk`)
    * [ ] Exporta tipos: `Theme`, `StyleToken`, `ComponentVariant`, `ThemeVersion`
* [ ] **Helper de fetch** — *módulo*: `plugin-sdk` · *tarea técnica*: `createApiClient({ baseUrl, getAccessToken, getTenantId })` que añade `Authorization` y `X-Tenant-Id`, maneja **401** con refresh y propaga errores tipados `{code,message,details}`.
* [ ] **Path alias & consumo** — *módulo*: `gAdmin` · *tarea técnica*: Importa el SDK con alias `@g/sdk` y usa en una llamada de prueba (p.ej. `/v1/health` o `/v1/themes`).
* [ ] **Verificación B (SDK)** — *checkpoint*:

  * [ ] `@g/sdk` se usa desde `gAdmin` sin tipos `any`
  * [ ] Un `fetch` real al Core responde 200 y muestra headers correctos
  * [ ] Errores 401/403 se muestran con mensaje y no rompen la app

---

### C. RBAC en el Admin

* [ ] **Matriz de permisos** — *módulo*: `gAuth/gMemberships` · *tarea técnica*: Define mapping UI → permisos:

  * OWNER/ADMIN: **crear/editar/aplicar** temas/estilos
  * REVIEWER: **aprobar/publicar**
  * EDITOR: **aplicar** (sin crear/editar)
  * VIEWER: **solo lectura**
* [ ] **Protección de rutas** — *módulo*: `gAdmin` · *tarea técnica*: Middleware/HOC `withRole` que exige rol mínimo para cada ruta.
* [ ] **UI consciente de rol** — *módulo*: `gAdmin` · *tarea técnica*: Oculta botones y acciones según permisos; página `/admin/403` para denegados.
* [ ] **Verificación C (RBAC)** — *checkpoint*:

  * [ ] Usuario VIEWER ve páginas pero no botones de **Guardar/Aplicar**
  * [ ] Acceso directo a `/admin/style` como VIEWER devuelve 403
  * [ ] OWNER puede acceder y ver controles completos

---

### D. Configuración DevOps base

* [ ] **Variables de entorno** — *módulo*: `gAdmin` · *tarea técnica*: `.env.example` con `NEXT_PUBLIC_API_URL`, `TENANT_HEADER=X-Tenant-Id`; valídalas (zod/schemas).
* [ ] **Lint/format/test** — *módulo*: `gAdmin` · *tarea técnica*: ESLint + Prettier + Jest/RTL mínimos; script `pnpm test`.
* [ ] **CI básico** — *módulo*: `gAdmin` · *tarea técnica*: Workflow GitHub Actions: setup pnpm, install, build, test; cache.
* [ ] **Verificación D (DevOps)** — *checkpoint*:

  * [ ] `pnpm build` y `pnpm test` verdes en local y CI
  * [ ] Cambiar `NEXT_PUBLIC_API_URL` no rompe; tipos siguen estrictos

---

### E. DoD (Definition of Done) de la Sección 0

* [ ] Inicio de sesión funcional; tokens gestionados; refresh OK
* [ ] `X-Tenant-Id` se adjunta en todas las requests
* [ ] Rutas `/admin/theme` y `/admin/style` protegidas y visibles según rol
* [ ] SDK instalado y consumido con tipos correctos
* [ ] Checks i18n básicos (EN/ES); switch operativo
* [ ] CI ejecuta build y tests; `.env.example` actualizado


# ✅ Checklist — 1) Diseño de Design Tokens (base visual)

**Estados:** \[x] Hecho · \[\~] En progreso · \[ ] No hecho

### A. Schema de Tokens

* [ ] **Definir contrato JSON** — *módulo*: `gTheme` · *tarea técnica*: Especifica un schema con Zod/Joi para los grupos principales:

  * [ ] `color.{primary,secondary,accent,background,foreground,success,warning,danger,muted}`
  * [ ] `typography.{fontFamily, fontSizeScale, lineHeight, fontWeight}`
  * [ ] `space.{xs,sm,md,lg,xl,2xl,...}`
  * [ ] `radius.{sm,md,lg,full}`
  * [ ] `shadow.{sm,md,lg,xl}`
  * [ ] `zIndex.{modal,overlay,dropdown,sticky}`
  * [ ] `opacity.{disabled,hover,focus}`
  * [ ] `transition.{fast,normal,slow}`
  * [ ] `breakpoints.{sm,md,lg,xl,2xl}`
  * [ ] `focusRing` (color, grosor, offset)
* [ ] **Validación estricta** — error 400 si faltan claves obligatorias o si valores son inválidos (ej. `#XYZ123`).
* [ ] **Documentar schema** — agrega ejemplos en Swagger/OpenAPI.

### B. Fuentes & Iconos

* [ ] **Google Fonts** — *módulo*: `gTheme` · *tarea técnica*: Permite elegir tipografías de Google Fonts (con subset, weights, display=swap).
* [ ] **Fuentes Custom** — *módulo*: `gTheme` · *tarea*: subida de archivos `.woff2` al bucket/DB y registro en tema.
* [ ] **Packs de Iconos** — *módulo*: `gTheme` · *tarea*: soporta packs Lucide, Font Awesome; tree-shaking para importar solo íconos usados.
* [ ] **Verificación B (Fonts & Icons)**:

  * [ ] Seleccionar “Roboto” cambia la fuente global
  * [ ] Subir una fuente custom la activa sin romper
  * [ ] Elegir pack Lucide permite usar íconos en botones/cards

### C. Binding a Tailwind

* [ ] **CSS Variables** — *módulo*: `gAdmin` · *tarea técnica*: Mapear tokens a variables CSS `--color-primary`, `--space-md`, etc.
* [ ] **Config extendida** — *módulo*: `gAdmin` · *tarea*: Extiende `tailwind.config.ts` con `theme.extend.colors = "var(--color-primary)"`.
* [ ] **Scope por tenant** — *módulo*: `gAdmin` · *tarea*: Encapsula variables por `data-tenant` en `<html>` para aislar tenants.
* [ ] **Verificación C (Tailwind binding)**:

  * [ ] Cambiar color primario en el editor refleja cambio en botones/cards
  * [ ] En DevTools aparecen las variables `--color-*` por tenant

### D. Editor de Tokens (UI)

* [ ] **Pantalla de edición** — *módulo*: `gAdmin` · *tarea técnica*: UI para seleccionar colores, tipografías, espaciados, radios, sombras.
* [ ] **Previsualización instantánea** — *módulo*: `gAdmin` · *tarea*: componente live preview que refleja cambios de tokens al vuelo.
* [ ] **Resets & defaults** — *módulo*: `gAdmin` · *tarea*: botón “Reset” y carga de presets por defecto (ej. tema light/dark base).
* [ ] **Accesibilidad** — *módulo*: `gAdmin` · *tarea*: incluir checker de contraste en colores y preview de texto mínimo WCAG.
* [ ] **Verificación D (Editor UI)**:

  * [ ] Guardar tokens actualiza DB y CSS variables
  * [ ] Cambiar tipografía en editor actualiza títulos/párrafos en preview
  * [ ] El checker de contraste avisa si color primario vs background < AA

### E. DoD (Definition of Done) de la Sección 1

* [ ] Schema definido y validado en Core
* [ ] Tokens persisten y son consumidos por Tailwind + CSS variables
* [ ] Editor UI en Admin funciona con preview instantánea
* [ ] Fuentes e íconos configurables, subidas y reflejadas en UI
* [ ] Checkpoints de accesibilidad (contraste AA mínimo) validados


# ✅ Checklist — 2) **gTheme**: CRUD, Versionado y Activación por Tenant

**Estados:** \[x] Hecho · \[\~] En progreso · \[ ] No hecho

### A. Modelo y Migraciones

* [ ] **Entidad Theme** — *módulo*: `gTheme` · *tarea técnica*: `Theme { id(uuid), tenantId(uuid|null para global), name, description, tags[string[]], tokens(jsonb), status('draft'|'published'|'archived'), version(int), createdAt, updatedAt, publishedAt|null, createdBy, updatedBy }`.
* [ ] **Índices** — *tarea*: `tenantId+status`, `name trigram`, `createdAt desc`.
* [ ] **Histórico** — *tarea*: tabla `ThemeVersion { id, themeId, version, tokens, changelog, createdAt, createdBy }`.
* [ ] **Migración** — *tarea*: generar y aplicar migración TypeORM.
* [ ] **Checkpoint A**: DB contiene `themes` y `theme_versions`; `tokens` acepta JSON válido según schema de Sección 1.

### B. API/DTOs y Validación

* [ ] **DTO Create/Update** — *módulo*: `gTheme` · *tarea técnica*: `CreateThemeDto { tenantId|null, name, description?, tags?, tokens: ThemeTokens }`, `UpdateThemeDto { name?, description?, tags?, tokens? }` con class-validator/zod.
* [ ] **Rutas** — *tarea*:

  * [ ] `POST /v1/themes` (crear)
  * [ ] `GET /v1/themes?tenantId=&q=&status=&limit=&cursor=` (listar + búsqueda)
  * [ ] `GET /v1/themes/:id` (detalle)
  * [ ] `PATCH /v1/themes/:id` (editar)
  * [ ] `DELETE /v1/themes/:id` (soft-delete → status `archived`)
  * [ ] `POST /v1/themes/:id/clone` (clonar)
* [ ] **Guardas** — *tarea*: Auth + TenantGuard + RBAC (OWNER/ADMIN crear/editar/borrar; VIEWER solo GET).
* [ ] **Checkpoint B**: Swagger muestra esquemas; validación rechaza tokens fuera de schema; 403 si rol insuficiente.

### C. Versionado & Diff

* [ ] **Snapshot** — *tarea técnica*: al `PATCH` que modifique `tokens`, crear entrada en `ThemeVersion` con `version = (prev + 1)` y `changelog` opcional.
* [ ] **Diff service** — *tarea*: generar diff de `tokens` (keys cambiadas, añadidas, removidas) para UI.
* [ ] **Rollback** — *tarea*: `POST /v1/themes/:id/rollback/:version` que reemplace `tokens` y cree nueva versión +1 con `changelog="rollback to vX"`.
* [ ] **Checkpoint C**: editar tema crea `v2`; rollback a `v1` restaura exactamente los tokens; auditoría registra antes/después (sin secretos).

### D. Activación por Tenant (tema activo)

* [ ] **Campo activo** — *opción 1*: `Tenant.themeIdActive` en tabla tenants.
* [ ] **Rutas** — *tarea*: `POST /v1/tenants/:tenantId/theme/activate` body `{ themeId }`.
* [ ] **Cascada de modos** — *tarea*: soportar `light/dark` dentro de `tokens`; cabecera/env que permita “prefer-color-scheme”.
* [ ] **Invalidación de cache** — *tarea*: emitir **DomainEvent** `theme.activated` → que dispare revalidaciones/ISR/caches.
* [ ] **Checkpoint D**: activar un tema cambia variables CSS para ese tenant; SSR/ISR revalida páginas; no afecta otros tenants.

### E. Flujo de Publicación (Draft → Review → Published)

* [ ] **Estados** — *tarea técnica*: `status` del theme: `draft` (editable), `published` (solo cambio vía nueva versión), `archived`.
* [ ] **Aprobaciones** — *tarea*: `POST /v1/themes/:id/request-review`, `POST /v1/themes/:id/approve`, `POST /v1/themes/:id/publish`. Roles: REVIEWER aprueba, OWNER/ADMIN publica.
* [ ] **Comentarios** — *tarea*: `ThemeReview { id, themeId, comment, authorId, createdAt }`.
* [ ] **Checkpoint E**: un EDITOR no puede publicar; REVIEWER aprueba; al publicar se sella `publishedAt` y se bloquea edición directa (solo nueva versión).

### F. UI en gAdmin (CRUD + Versiones + Activación)

* [ ] **Listado** — *tarea técnica*: `/admin/theme` con tabla (nombre, estado, versión, actualizado, acciones). Búsqueda por nombre/tags; filtros por estado.
* [ ] **Editor** — *tarea*: `/admin/theme/:id` con tabs: *Tokens* (de Sección 1), *Versiones* (historial con diff), *Revisión* (comentarios), *Publicación*, *Activación*.
* [ ] **Clonar/Crear** — *tarea*: wizard con presets (Light/Dark) y plantilla vacía.
* [ ] **Activar** — *tarea*: botón “Activar en este tenant” (muestra tenant actual en Topbar).
* [ ] **Checkpoint F**: desde la UI se puede crear, clonar, editar, versionar, publicar y activar un tema en < 3 clics por paso; errores se muestran tipados.

### G. Auditoría, Seguridad y Errores

* [ ] **AuditLog** — *tarea técnica*: registra `THEME_CREATED`, `THEME_UPDATED`, `THEME_VERSIONED`, `THEME_ROLLBACK`, `THEME_PUBLISHED`, `THEME_ACTIVATED` (actor, tenant, themeId, version, diff resumido).
* [ ] **Rate limit + Idempotency** — *tarea*: aplica buckets a `publish/activate`; idempotencia en `approve/publish` para evitar doble click.
* [ ] **Errores tipados** — *tarea*: `ERR_THEME_NOT_FOUND`, `ERR_THEME_INVALID_TOKENS`, `ERR_THEME_ROLLBACK_VERSION`, `ERR_THEME_FORBIDDEN`.
* [ ] **Checkpoint G**: logs de auditoría visibles en visor; errores devuelven código + mensaje coherente; 429 si se abusa de publish.

### H. Pruebas

* [ ] **Unit** — *tarea técnica*: servicios `ThemeService`, `ThemeVersionService`, `ThemeDiffService`.
* [ ] **E2E** — *tarea*:

  * [ ] Crear → Editar tokens → Versionar (v1→v2)
  * [ ] Rollback a v1
  * [ ] Publicar y bloquear edición directa
  * [ ] Activar en tenant A (no afecta tenant B)
  * [ ] 403 por rol insuficiente (VIEWER/EDITOR)
* [ ] **Performance smoke** — *tarea*: payload `tokens` grande (p.ej. 50KB) <-> DB ok, sin timeouts.
* [ ] **Checkpoint H**: suite e2e verde; cobertura mínima (funcs 70%+).

### I. DoD (Definition of Done) Sección 2

* [ ] CRUD de temas operativo con validación estricta
* [ ] Versionado con historial y **rollback** funcional
* [ ] Flujo de publicación con aprobaciones y auditoría
* [ ] Activación por tenant con inval. de cache/ISR
* [ ] UI gAdmin permite todo el ciclo (crear→publicar→activar)
* [ ] Pruebas unit/e2e y errores tipados implementados

# ✅ Checklist — 3) **gStyle**: Variantes de Componentes (UI System)

**Estados:** \[x] Hecho · \[\~] En progreso · \[ ] No hecho

### A. Modelo y Migraciones

* [ ] **Entidad StyleComponent** — *módulo*: `gStyle` · *tarea técnica*: `StyleComponent { id(uuid), tenantId(uuid|null global), key(text, p.ej. 'button', 'table'), description?, createdAt, updatedAt }`.
* [ ] **Entidad StyleVariant** — *tarea*: `StyleVariant { id(uuid), componentId, name(text p.ej. 'primary'), tokens(jsonb), states(jsonb: {hover,focus,active,disabled}), size('sm'|'md'|'lg'|custom?), isDefault(boolean), createdAt, updatedAt, createdBy, updatedBy }`.
* [ ] **Índices** — *tarea*: `tenantId+key` único, `componentId+name` único.
* [ ] **Migraciones** — *tarea*: generar y aplicar migraciones TypeORM.
* [ ] **Checkpoint A**: tablas creadas; constraints únicos funcionan; `tokens` acepta JSON válido.

### B. Mapa de Componentes y Catálogo Base

* [ ] **Catálogo inicial** — *módulo*: `gStyle` · *tarea*: registrar componentes base: `button, input, textarea, select, checkbox, radio, switch, badge, tag, alert, tooltip, modal, drawer, tabs, accordion, card, table, pagination, navbar, sidebar, footer, hero, section, cta`.
* [ ] **Semántica** — *tarea*: documentar props mínimas por componente (p.ej. button: `variant`, `size`, `icon`, `loading`).
* [ ] **Seeder opcional** — *tarea*: crear variantes por defecto (p.ej. `button.primary`, `button.secondary`, `table.striped`).
* [ ] **Checkpoint B**: endpoint `GET /v1/styles/components` devuelve catálogo; variantes por defecto disponibles.

### C. Tokens de Componente (derivación desde gTheme)

* [ ] **Derivación** — *módulo*: `gStyle` · *tarea técnica*: servicio que traduce tokens de `gTheme` → *component tokens* (p.ej., `button.bg = color.primary`, `button.radius = radius.md`, `button.font = typography.body`).
* [ ] **Overrides** — *tarea*: permitir overrides por variante (solo whitelisted keys); merge determinista y seguro.
* [ ] **Validación** — *tarea*: schema de `StyleVariantTokens` (colores, espaciados, radios, sombras, borderWidth, fontWeight, gap, iconSpacing, focusRing).
* [ ] **Checkpoint C**: cambiar `color.primary` en `gTheme` repercute en `button.primary` salvo override explícito.

### D. API/DTOs y Rutas

* [ ] **DTOs** — *módulo*: `gStyle` · *tarea técnica*: `CreateComponentDto`, `CreateVariantDto { componentKey, name, tokens?, states?, size?, isDefault? }`, `UpdateVariantDto`.
* [ ] **Rutas** — *tarea*:

  * [ ] `GET /v1/styles/components`
  * [ ] `POST /v1/styles/components` (crear componente custom, opcional)
  * [ ] `GET /v1/styles/components/:key/variants`
  * [ ] `POST /v1/styles/variants` (crear variante)
  * [ ] `PATCH /v1/styles/variants/:id` (editar)
  * [ ] `DELETE /v1/styles/variants/:id` (soft-delete)
  * [ ] `POST /v1/styles/variants/:id/clone`
  * [ ] `POST /v1/styles/variants/:id/set-default`
* [ ] **Guardas** — *tarea*: Auth + TenantGuard + RBAC (OWNER/ADMIN crear/editar/borrar; EDITOR aplicar; REVIEWER aprobar publicación si aplica).
* [ ] **Checkpoint D**: Swagger muestra esquemas; crear/editar/borrar variante funciona y respeta permisos.

### E. Editor WYSIWYG de Variantes

* [ ] **UI Editor** — *módulo*: `gAdmin` · *tarea técnica*: `/admin/style` con tabs: *Componentes*, *Variantes*, *Previsualización*.
* [ ] **State toggles** — *tarea*: toggles para `hover/focus/active/disabled`, tamaños `sm/md/lg`, densidad, con/sin icono, loading.
* [ ] **Live Preview** — *tarea*: muestra el componente real con tokens aplicados; compara lado a lado *default vs editado*.
* [ ] **Accesibilidad** — *tarea*: contraste AA/AAA, radio mínimo táctil (44px), focus ring configurable, navegación por teclado.
* [ ] **Checkpoint E**: crear `button.primary`, ajustar radius/colores, ver cambios al vuelo y pasar checker AA.

### F. Aplicación Global y Resolución de Precedencias

* [ ] **Prioridades** — *módulo*: `gStyle` · *tarea técnica*: orden de merge: `theme tokens` → `component tokens` → `variant overrides` → `context overrides` (módulo/página).
* [ ] **Context maps** — *tarea*: mapear variante por contexto (p.ej. “en Admin, los botones por defecto usan `primary`”).
* [ ] **Per-page (opcional)** — *módulo*: `gPages/gStyle` · *tarea*: permitir override de una variante en una página concreta (guardado en Page JSON).
* [ ] **Checkpoint F**: cambiar el “default” de `button` actualiza botones en Admin y CMS sin romper otras vistas; inspección muestra procedencia de estilos.

### G. Integración con Tailwind/CSS Variables

* [ ] **Variables dinámicas** — *módulo*: `gAdmin` · *tarea técnica*: exportar tokens/variantes a CSS variables `--g-button-bg`, `--g-card-radius`.
* [ ] **Utilities** — *tarea*: helpers/`cva()` para construir clases desde tokens; evitar clases conflictivas.
* [ ] **RTL ready** — *tarea*: soporte direccionalidad (márgenes invertidos, iconos espejados si procede).
* [ ] **Checkpoint G**: cambiar `--g-button-bg` en runtime refleja inmediatamente el estilo en preview.

### H. Seguridad & Sanitización

* [ ] **Whitelist valores** — *módulo*: `gStyle` · *tarea técnica*: listas permitidas para colores (hex/rgb/hsl), unidades (px, rem, %), bordes, sombras; bloquear expresiones CSS peligrosas.
* [ ] **CSP-aware** — *tarea*: no inyectar `style` inline salvo con `nonce` y solo si está habilitado; preferir clases/variables.
* [ ] **Rate limit/Idempotency** — *tarea*: aplicar a crear/editar variantes para evitar spam/doble click.
* [ ] **Checkpoint H**: pruebas negativas de XSS/CSS injection fallan con 400; CSP sin violaciones.

### I. Accesibilidad (a11y)

* [ ] **Contraste** — *módulo*: `gAdmin` · *tarea técnica*: validador AA/AAA en combinaciones foreground/background.
* [ ] **Focus y teclado** — *tarea*: todos los componentes tienen foco visible y orden lógico; probar con *tab/shift+tab/enter/esc*.
* [ ] **Tamaño interactivo** — *tarea*: controles táctiles ≥ 44px; tooltips accesibles (ARIA).
* [ ] **Checkpoint I**: Lighthouse a11y ≥ 95 en la página de preview de estilos.

### J. UI en gAdmin (Catálogo + CRUD + Preview)

* [ ] **Listado de componentes** — *tarea técnica*: tabla de componentes y contador de variantes; filtros/búsqueda.
* [ ] **CRUD variantes** — *tarea*: formulario con validación en tiempo real, botón “Clonar”, “Set default”.
* [ ] **Preview Matrix** — *tarea*: grid que muestra (variant × size × state).
* [ ] **Historial y notas** — *tarea*: notas por variante (intención de diseño), quién editó y cuándo.
* [ ] **Checkpoint J**: crear → clonar → set default → ver reflejo global; undo/rollback simple vía historial.

### K. Auditoría, Errores Tipados

* [ ] **AuditLog** — *módulo*: `gAdmin/gStyle` · *tarea técnica*: registra `STYLE_COMPONENT_CREATED`, `STYLE_VARIANT_CREATED/UPDATED/DELETED`, `STYLE_VARIANT_SET_DEFAULT`, con diff breve.
* [ ] **Errores** — *tarea*: `ERR_STYLE_COMPONENT_EXISTS`, `ERR_STYLE_VARIANT_CONFLICT`, `ERR_STYLE_INVALID_TOKENS`, `ERR_STYLE_FORBIDDEN`.
* [ ] **Checkpoint K**: auditoría visible en visor; errores coherentes en API/UI.

### L. Pruebas

* [ ] **Unit** — *tarea técnica*: `StyleService`, `VariantService`, `ResolveService`, `Sanitizer`, `ContrastChecker`.
* [ ] **E2E** — *tarea*:

  * [ ] Crear componente/variante y set default
  * [ ] Clonar variante y editar tokens
  * [ ] Validar precedencias (context override)
  * [ ] Acceso/403 por rol
  * [ ] XSS/CSS injection negativo
* [ ] **Performance smoke** — *tarea*: muchas variantes (p.ej. 200) cargan sin timeouts; render de preview < 200ms mediana.
* [ ] **Checkpoint L**: suites verde; cobertura mínima (funcs 70%+).

### M. DoD (Definition of Done) Sección 3

* [ ] Catálogo de componentes y variantes CRUD operativo
* [ ] Derivación de tokens desde `gTheme` con overrides seguros
* [ ] Editor WYSIWYG con preview y validaciones a11y
* [ ] Resolución de precedencias y context mapping funcional
* [ ] Seguridad (sanitización/CSP) y errores tipados
* [ ] Pruebas unitarias y e2e cubren el ciclo completo

# ✅ Checklist — 4) Aplicación, Herencia y Precedencias

**Estados:** \[x] Hecho · \[\~] En progreso · \[ ] No hecho

### A. Motor de Resolución de Estilos

* [ ] **Servicio Resolver** — *módulo*: `gStyle` · *tarea técnica*: implementar `resolveStyle(componentKey, context?)` que combine:

  1. `theme tokens` (base)
  2. `component tokens` (defaults por componente)
  3. `variant overrides` (definidos en `StyleVariant`)
  4. `contextual overrides` (opcional: per-módulo o per-página).
* [ ] **Determinismo** — *tarea*: garantizar orden de precedencia estable (último en la cadena sobrescribe).
* [ ] **Cache interna** — *tarea*: memoización por tenant + tema activo para reducir cálculos.
* [ ] **Checkpoint A**: cambiar un token de theme → resolver refleja cambio en todas las variantes sin overrides; inspección devuelve árbol de origen.

### B. Context Mapping (per-módulo/per-sección)

* [ ] **Entidad ContextMap** — *módulo*: `gStyle` · *tarea técnica*: `ContextMap { id, tenantId, contextKey (ej: 'admin', 'cms', 'checkout'), componentKey, variantId }`.
* [ ] **CRUD ContextMap** — *tarea*: endpoints para asignar variantes a contextos específicos.
* [ ] **UI** — *módulo*: `gAdmin` · *tarea*: vista de mapeo: seleccionar “en CMS → usar `button.secondary`”.
* [ ] **Checkpoint B**: un botón en Admin usa `primary`; en CMS usa `secondary` sin romper otros contextos.

### C. Overrides por Página (opcional, gPages)

* [ ] **Soporte JSON overrides** — *módulo*: `gPages/gStyle` · *tarea técnica*: permitir en Page JSON un bloque `styleOverrides` con pares `componentKey.variantName → tokens`.
* [ ] **Validación fuerte** — *tarea*: schema limita overrides a propiedades whitelisted.
* [ ] **UI Editor** — *tarea*: toggle “override local” en Page Builder con advertencia de deuda técnica.
* [ ] **Checkpoint C**: una Landing Page puede forzar `hero.bg = color.special`; rollback elimina override y vuelve a herencia normal.

### D. Visual Inspector (Debug)

* [ ] **DevTools interno** — *módulo*: `gAdmin` · *tarea técnica*: en modo preview, click en un componente abre “Inspector” con detalle: `theme → component → variant → override`.
* [ ] **Highlight visual** — *tarea*: resaltar la fuente del estilo aplicado.
* [ ] **Checkpoint D**: un desarrollador puede ver en la UI de preview de dónde proviene cada valor.

### E. Persistencia y Auditoría

* [ ] **AuditLog** — *módulo*: `gStyle` · *tarea*: registrar cambios en `ContextMap` y overrides por página (`STYLE_CONTEXTMAP_UPDATED`, `STYLE_PAGE_OVERRIDE_ADDED`).
* [ ] **Rollback** — *tarea*: rollback granular por contexto/página desde auditoría.
* [ ] **Checkpoint E**: eliminar un override desde auditoría restaura estilos previos sin inconsistencias.

### F. Seguridad y Consistencia

* [ ] **Restringir contexts** — *tarea*: lista blanca de contextKeys (`admin`, `cms`, `store`, `landing`, etc.) para evitar colisiones.
* [ ] **Limitar overrides** — *tarea*: máximo nº de overrides por página/contexto configurable.
* [ ] **Idempotency** — *tarea*: POST de contextMap/override protegido por Idempotency-Key.
* [ ] **Checkpoint F**: intento duplicado de override devuelve 409 Conflict; sin duplicados.

### G. Integración con gTheme

* [ ] **Suscripción a eventos** — *módulo*: `gTheme/gStyle` · *tarea técnica*: cuando un tema cambia, recalcular variantes y context maps dependientes.
* [ ] **Propagación** — *tarea*: invalidar cache de `resolveStyle` al activar nuevo tema.
* [ ] **Checkpoint G**: activar nuevo tema cambia automáticamente todos los contextos; no requiere limpiar manualmente.

### H. Pruebas

* [ ] **Unit** — *tarea*: pruebas de `resolveStyle`, `ContextMapService`, `PageOverrideService`.
* [ ] **E2E** — *tarea*:

  * [ ] Cambiar token base repercute en todas las variantes.
  * [ ] Context map distinto para Admin y CMS.
  * [ ] Override local en página respeta límites.
  * [ ] Audit rollback restaura estilos.
* [ ] **Carga** — *tarea*: probar 1000 resoluciones seguidas < 100ms mediana.
* [ ] **Checkpoint H**: suites verdes, cobertura >75%.

### I. DoD (Definition of Done) Sección 4

* [ ] Motor `resolveStyle` implementado con precedencia clara.
* [ ] ContextMap funcional con UI y auditoría.
* [ ] Overrides por página opcionales, seguros y reversibles.
* [ ] Inspector visual muestra herencia y fuente.
* [ ] Pruebas unitarias + e2e completas, rendimiento validado.

# ✅ Checklist — 5) Contenidos de Referencia (Páginas Demo)

**Estados:** \[x] Hecho · \[\~] En progreso · \[ ] No hecho

### A. Plantillas de Demo

* [ ] **Entidad DemoPage** — *módulo*: `gPages` · *tarea técnica*: definir tabla/JSON `DemoPage { id, tenantId, slug, blocks[] }` para páginas de referencia.
* [ ] **Set inicial de plantillas** — *tarea*: crear páginas predefinidas: **Landing**, **About**, **Pricing**, **Blog Post**, **Dashboard básico**.
* [ ] **UI de selección** — *módulo*: `gAdmin` · *tarea*: menú `/admin/demo` para previsualizar plantillas.
* [ ] **Checkpoint A**: render de `/admin/demo/landing` muestra hero, CTA y botones aplicando tokens/variantes activos.

### B. Bloques Compatibles

* [ ] **Definir catálogo de bloques** — *módulo*: `gPages` · *tarea*: componentes reutilizables (Hero, FAQ, Pricing Table, Contact Form, Feature Grid, Testimonial, BlogList, Footer).
* [ ] **Integración con gStyle** — *tarea*: cada bloque consume `resolveStyle` para tokens/variantes (ej. `button.primary`, `card.shadow.md`).
* [ ] **Drag & Drop (fase 2)** — *módulo*: `gAdmin` · *tarea*: habilitar edición de orden de bloques para demo pages.
* [ ] **Checkpoint B**: editar estilo de `button.primary` se refleja en todos los bloques de demo instantáneamente.

### C. Data de Mock Multilingüe

* [ ] **Dataset semilla** — *módulo*: `gAdmin` · *tarea*: textos cortos/largos, precios ficticios, FAQs, posts dummy.
* [ ] **i18n** — *tarea*: proveer traducciones (EN, ES, FR) con alternancia en runtime.
* [ ] **Media placeholders** — *tarea*: imágenes SVG/Unsplash placeholders para consistencia visual.
* [ ] **Checkpoint C**: cambiar idioma de demo page → textos e imágenes cambian sin romper layout.

### D. Validación Visual & Técnica

* [ ] **SSR/CSR consistency** — *módulo*: `gAdmin` · *tarea*: asegurar que el render inicial (SSR) y el hidrato (CSR) no producen saltos de contenido (*no content jumps*).
* [ ] **Preview aislado** — *tarea*: `/admin/demo/:slug?preview=true` genera iframe sandbox.
* [ ] **Accesibilidad base** — *tarea*: usar `aria-*`, roles, foco visible en todos los bloques demo.
* [ ] **Checkpoint D**: Lighthouse en demo pages ≥ 95 en **SEO** y **A11y**.

### E. Auditoría y Persistencia

* [ ] **AuditLog** — *módulo*: `gPages` · *tarea*: registrar creación/edición de demo pages y bloques (`DEMO_PAGE_UPDATED`).
* [ ] **Rollback demo** — *tarea*: permitir restaurar plantillas a estado base.
* [ ] **Checkpoint E**: rollback de Landing Page demo devuelve al diseño inicial con tokens actuales aplicados.

### F. Pruebas

* [ ] **Unit tests** — *tarea*: validar que cada bloque usa `resolveStyle`.
* [ ] **E2E tests** — *tarea*:

  * [ ] Crear demo Landing.
  * [ ] Cambiar color primario en `gTheme`.
  * [ ] Refrescar → hero/CTA reflejan nuevo color.
  * [ ] Cambiar idioma → contenido se traduce.
* [ ] **Carga** — *tarea*: stress test con 50 bloques por página < 1s render SSR.
* [ ] **Checkpoint F**: suites verdes, cobertura >75%.

### G. DoD (Definition of Done) Sección 5

* [ ] Páginas demo operativas con bloques vinculados a tokens/variantes.
* [ ] Data de mock multilingüe funcional.
* [ ] Validaciones SEO + A11y con Lighthouse ≥ 95.
* [ ] Auditoría activa y rollback disponible.
* [ ] Pruebas unit + e2e completas.

# ✅ Checklist — 6) Previsualización, Borradores y Publicación

**Estados:** \[x] Hecho · \[\~] En progreso · \[ ] No hecho

### A. Sandbox / Preview

* [ ] **Preview token** — *módulo*: `gAuth/gTheme/gStyle` · *tarea técnica*: generar `previewToken` temporal firmado (JWT corto) para aislar previsualización.
* [ ] **Iframe sandbox** — *módulo*: `gAdmin` · *tarea*: renderizar preview en iframe con `?previewToken=...`, sin afectar prod.
* [ ] **Expiración** — *tarea*: tokens caducan en minutos; accesos caducados → 401.
* [ ] **Checkpoint A**: abrir `/admin/theme/preview` muestra cambios no publicados sin afectar usuarios finales.

### B. Estado Draft / Review / Publish

* [ ] **Estado de entidades** — *módulo*: `gTheme/gStyle` · *tarea*: agregar campo `status ∈ {draft, review, published}` a temas y estilos.
* [ ] **Transición de estados** — *tarea*: OWNER/ADMIN pueden mover de draft→review; REVIEWER aprueba y pasa a published.
* [ ] **Comentarios inline** — *módulo*: `gAdmin` · *tarea*: interfaz para comentarios en cambios de tokens/variantes.
* [ ] **Audit log** — *tarea*: cada transición se registra (`THEME_REVIEW_REQUESTED`, `THEME_PUBLISHED`).
* [ ] **Checkpoint B**: un EDITOR crea tema draft; REVIEWER lo aprueba; OWNER lo publica → visible para tenant.

### C. Programación de Publicación

* [ ] **Campo scheduledAt** — *módulo*: `gTheme/gStyle` · *tarea*: permitir programar publicación con timestamp.
* [ ] **Worker de jobs** — *módulo*: `JobsModule` · *tarea*: job que activa tema/estilo en hora programada.
* [ ] **UI de scheduling** — *módulo*: `gAdmin` · *tarea*: selector de fecha/hora con zona horaria tenant.
* [ ] **Checkpoint C**: programar publicación para mañana → job aplica automáticamente sin intervención manual.

### D. Rollback

* [ ] **Versionado con rollback** — *módulo*: `gTheme/gStyle` · *tarea*: cada publicación genera snapshot con ID de versión.
* [ ] **UI Rollback** — *módulo*: `gAdmin` · *tarea*: botón “Revertir a versión X” con confirmación.
* [ ] **Audit trail** — *tarea*: registrar rollback como acción separada (`THEME_ROLLBACK`).
* [ ] **Checkpoint D**: hacer rollback restaura tokens/variantes previas y auditoría conserva historial.

### E. Shareable Previews

* [ ] **Enlace temporal** — *módulo*: `gAdmin` · *tarea*: generar link con `previewToken` compartible.
* [ ] **Expiración configurable** — *tarea*: default 24h, con posibilidad de 1–7 días.
* [ ] **Revocación anticipada** — *tarea*: OWNER/ADMIN pueden revocar previews desde panel.
* [ ] **Checkpoint E**: compartir link a preview abre sandbox aislado; tras expiración → 401; revocación manual → invalida.

### F. Pruebas

* [ ] **Unit tests** — *tarea*: validación de estados (`draft→review→published`, rechazo en caso inválido).
* [ ] **E2E tests** — *tarea*:

  * [ ] Crear tema draft.
  * [ ] Pasar a review.
  * [ ] Aprobar y publicar.
  * [ ] Programar publicación y verificar ejecución por job.
  * [ ] Rollback y confirmación en UI.
  * [ ] Preview compartido → válido, luego caduca.
* [ ] **Carga** — *tarea*: 100 previews simultáneos por tenant sin impacto en prod.
* [ ] **Checkpoint F**: todas pruebas verdes; cobertura >75%.

### G. DoD (Definition of Done) Sección 6

* [ ] Previews aislados con tokens temporales operativos.
* [ ] Flujo draft→review→publish funcional con comentarios y auditoría.
* [ ] Scheduling de publicaciones en producción.
* [ ] Rollback activo y probado.
* [ ] Enlaces de preview compartibles y revocables.
* [ ] Pruebas unit + e2e completas y cobertura mínima cumplida.

# ✅ Checklist — 7) Export/Import & Marketplace

**Estados:** \[x] Hecho · \[\~] En progreso · \[ ] No hecho

### A. Modelo y almacenamiento de artefactos

* [ ] **Entidad ThemeExport / StyleExport** — *módulo*: `gTheme/gStyle` · *tarea técnica*: `Export { id, tenantId, kind('theme'|'style'), refId(themeId|styleId), version, filename, size, hash(sha256), storageUrl, createdBy, createdAt, metadata(jsonb) }`.
* [ ] **Storage** — *módulo*: `Infra` · *tarea*: bucket S3/minio o carpeta segura; política de retención y permisos (solo OWNER/ADMIN del tenant).
* [ ] **Checksum** — *tarea*: calcular y almacenar `sha256` del paquete para verificar integridad.
* [ ] **Checkpoint A**: al exportar, se crea registro `Export`, archivo subido, tamaño y hash visibles en UI.

### B. Export JSON/ZIP (tema y estilos)

* [ ] **Formato** — *módulo*: `gTheme/gStyle` · *tarea técnica*:

  * Theme: `theme.json` (tokens, name, description, tags, version, createdAt, createdBy).
  * Styles: `styles.json` (components\[], variants\[], states, isDefault, mapping).
  * `manifest.json` (schemaVersion, kind, sourceTenant, createdAt, toolVersion).
  * ZIP opcional: incluir assets de fuentes (woff2) y licencia si aplica.
* [ ] **Comando/endpoint** — *tarea*: `POST /v1/exports` body `{ kind, refId, includeAssets }` → devuelve URL/ID.
* [ ] **Licencias** — *tarea*: incluir `LICENSE.txt` cuando se empaquetan fuentes/icon packs.
* [ ] **Checkpoint B**: descargar ZIP y abrir `manifest.json` muestra metadatos correctos; `theme.json` valida contra schema de Sección 1.

### C. Import Seguro (dry-run y commit)

* [ ] **Validación de schema** — *módulo*: `gTheme/gStyle` · *tarea técnica*: validar `manifest`, `theme.json`, `styles.json` (Zod/Joi) y versiones compatibles.
* [ ] **Dry-run** — *tarea*: `POST /v1/imports/dry-run` → responde **plan**: crear/clonar/actualizar; conflictos detectados (nombres/keys).
* [ ] **Resolución de conflictos** — *tarea*: estrategias: `rename`, `overwrite`, `skip`; UI para elegir por ítem.
* [ ] **Commit** — *tarea*: `POST /v1/imports/commit` con plan aprobado.
* [ ] **Rollback** — *tarea*: si commit falla a mitad, revertir entidades afectadas (transacción/unidad de trabajo).
* [ ] **Checkpoint C**: importar un paquete válido crea tema/variantes en estado **draft** por defecto; conflictos resueltos según elección; auditoría registra acciones.

### D. Marketplace (catálogo de presets)

* [ ] **Entidad CatalogItem** — *módulo*: `gTheme/gStyle` · *tarea técnica*: `CatalogItem { id, kind('theme'|'style'|'bundle'), name, description, tags[], version, rating?, installCount, visibility('public'|'private'), createdBy, updatedAt, artifactExportId }`.
* [ ] **Listado y filtros** — *tarea*: `GET /v1/catalog?kind=&q=&tags=&sort=`; UI con cards, badges (light/dark, a11y AA, i18n-ready).
* [ ] **Instalación** — *tarea*: botón “Instalar” → descarga `artifactExportId` y ejecuta flujo de **import (dry-run→commit)** hacia el tenant actual.
* [ ] **Actualizaciones** — *tarea*: si hay versión nueva, mostrar “Update available” y diffs relevantes (tokens/variantes).
* [ ] **Checkpoint D**: desde Marketplace, instalar “Governetix Light” crea tema draft en el tenant; se puede previsualizar y publicar.

### E. Seguridad, permisos y licencias

* [ ] **RBAC** — *módulo*: `gAuth/gMemberships` · *tarea técnica*: OWNER/ADMIN pueden exportar/importar/instalar; EDITOR solo previsualizar; VIEWER no.
* [ ] **Sanitización** — *tarea*: limpiar valores peligrosos en import (colores, URLs de fonts); bloquear CSS/JS inline; verificar CSP.
* [ ] **Licencias/atribución** — *tarea*: UI muestra licencia; impide instalar si licencia incompatible (opción de forzar con aceptación explícita).
* [ ] **Checkpoint E**: intento de importar paquete con CSS malicioso → 400; logs de seguridad registran incidente.

### F. Auditoría y Cuotas

* [ ] **AuditLog** — *módulo*: `gAdmin` · *tarea técnica*: `EXPORT_CREATED`, `IMPORT_DRYRUN`, `IMPORT_COMMIT`, `CATALOG_INSTALL`; guardar hash del artefacto y plan aplicado.
* [ ] **Cuotas** — *tarea*: límite de export/import por día por tenant; tamaño máximo de artefacto; rate limit por IP.
* [ ] **Checkpoint F**: exceder cuota → 429 con cabeceras; auditoría lista eventos con correlationId.

### G. UI en gAdmin

* [ ] **Pantalla de Export** — *tarea técnica*: seleccionar **Theme/Styles** + toggles (incluir assets, incluir variantes por defecto), botón **Exportar** → Job + progreso.
* [ ] **Pantalla de Import** — *tarea*: dropzone de archivo ZIP/JSON → muestra **plan de dry-run**, selector de resolución de conflictos, botón **Aplicar**.
* [ ] **Marketplace** — *tarea*: `/admin/marketplace` con grid, filtros, detalles, **Preview** (iframe sandbox), **Instalar**.
* [ ] **Checkpoint G**: flujo completo visible, con estados (idle/loading/success/error), toasts y reintentos.

### H. Performance y almacenamiento

* [ ] **Streaming/Chunks** — *módulo*: `Infra` · *tarea técnica*: subir/descargar artefactos con streaming; calcular hash en stream.
* [ ] **Compresión** — *tarea*: usar ZIP `store` para fuentes (ya comprimidas) y `deflate` para JSON; tamaño objetivo < 5MB en presets.
* [ ] **TTL/retención** — *tarea*: política para borrar artefactos antiguos; métrica de espacio consumido por tenant.
* [ ] **Checkpoint H**: export/import de \~3–5MB se completa < 5s en entorno local; tamaño y tiempos registrados.

### I. Pruebas

* [ ] **Unit** — *tarea técnica*: validadores de schema, generador de plan de import, resolver de conflictos.
* [ ] **E2E** — *tarea*:

  * [ ] Export de tema + estilos con assets.
  * [ ] Import dry-run → commit con `rename/overwrite/skip`.
  * [ ] Instalar desde Marketplace y previsualizar.
  * [ ] Rollback automático ante error intencional.
* [ ] **Seguridad** — *tarea*: tests de payloads maliciosos (CSS `expression`, URLs externas no permitidas, fuentes no válidas).
* [ ] **Checkpoint I**: suites verde; cobertura ≥ 75%; pruebas de seguridad pasan.

### J. DoD (Definition of Done) Sección 7

* [ ] Export JSON/ZIP con `manifest` y checksums listo.
* [ ] Import con dry-run, resolución de conflictos y commit atómico.
* [ ] Marketplace funcional con instalación en un click (draft por defecto).
* [ ] Seguridad (sanitización, licencias, RBAC, cuotas) aplicada.
* [ ] UI completa (export/import/marketplace) con feedback y estados.
* [ ] Pruebas unitarias y e2e completas; métricas de tamaño/tiempo registradas.

# ✅ Checklist — 8) Accesibilidad & SEO por Defecto

**Estados:** \[x] Hecho · \[\~] En progreso · \[ ] No hecho

### A. Accesibilidad (A11y Guard)

* [ ] **Contrast Checker** — *módulo*: `gStyle` · *tarea técnica*: util que valide colores `foreground/background` con WCAG 2.1 (AA/AAA).
* [ ] **Focus Visible** — *módulo*: `gStyle` · *tarea*: aplicar `:focus-visible` por defecto; tokens de focusRing desde `gTheme`.
* [ ] **Tamaño táctil mínimo** — *tarea*: advertencia si botones/inputs < 44px (Apple HIG/Material).
* [ ] **A11y Overlay en Editor** — *módulo*: `gAdmin` · *tarea*: mostrar warnings/errores a11y en UI al diseñar variantes.
* [ ] **Checkpoint A**: crear `button.primary` con contraste bajo → aparece warning; focusRing visible en tab navigation.

### B. SEO Defaults en Themes

* [ ] **Metadatos globales** — *módulo*: `gTheme/gAdmin` · *tarea técnica*: CRUD para título base, descripción, keywords, OG\:title/description, Twitter cards, favicon, manifest.
* [ ] **Plantilla OG dinámica** — *módulo*: `gAdmin` · *tarea*: endpoint que genere imagen OG por tema (puppeteer/satori).
* [ ] **Robots.txt / sitemap.xml** — *módulo*: `gAdmin` · *tarea*: generar automáticamente, incluir URLs por tenant, soportar i18n (hreflang).
* [ ] **Per-page overrides** — *módulo*: `gPages` · *tarea*: campos meta en páginas (title, desc, canonical, noindex).
* [ ] **Checkpoint B**: crear un Theme → setear título/OG; ver `<head>` con meta tags correctos en página demo.

### C. Carga de fuentes optimizada

* [ ] **Subsetting** — *módulo*: `gTheme` · *tarea técnica*: cortar subsets de Google Fonts/local fonts por idioma.
* [ ] **Preconnect/Preload** — *módulo*: `gAdmin` · *tarea*: inyectar `<link rel=preconnect>` y `<link rel=preload>` en `<head>`.
* [ ] **font-display: swap** — *tarea*: configuración por defecto para evitar FOIT.
* [ ] **Fallbacks inteligentes** — *tarea*: tipografías alternas configurables por locale.
* [ ] **Checkpoint C**: Lighthouse no reporta FOIT; cambio de idioma usa fallback correcto.

### D. Integración con i18n para SEO/A11y

* [ ] **hreflang automático** — *módulo*: `gAdmin` · *tarea*: generar hreflang en `<head>` por página e idioma.
* [ ] **Lang attribute** — *módulo*: `gAdmin` · *tarea*: inyectar `lang` correcto en `<html>`.
* [ ] **Alt text en media** — *módulo*: `gPages` · *tarea*: requerir alt/aria-label en imágenes/íconos; warning si falta.
* [ ] **Checkpoint D**: página demo en 2 idiomas muestra `<html lang>` correcto y hreflang apuntando a la otra versión.

### E. Testing & Validación

* [ ] **Unit** — *tarea técnica*: validadores WCAG, generador meta tags, verificador hreflang.
* [ ] **E2E** — *tarea*: Lighthouse CI para cada página demo; assert `a11y ≥ 95`, `SEO ≥ 95`.
* [ ] **Accessibility snapshots** — *tarea*: usar axe-core en test suite para validar reglas WCAG en componentes.
* [ ] **Checkpoint E**: correr suite e2e → Lighthouse report ≥ 95 en demo, sin violaciones axe-core críticas.

### F. DoD (Definition of Done) Sección 8

* [ ] Guard de accesibilidad activo en editor (contraste, focus, tamaño).
* [ ] Metadatos SEO globales y por página configurables y persistidos.
* [ ] OG images dinámicas funcionando por tenant.
* [ ] Carga de fuentes optimizada con swap y preloads.
* [ ] i18n integrado en SEO (hreflang, lang, fallbacks).
* [ ] Tests unit/e2e con Lighthouse y axe-core verificando ≥95.

# ✅ Checklist — 9) Seguridad & Compliance Visual

**Estados:** \[x] Hecho · \[\~] En progreso · \[ ] No hecho

### A. Sanitización de Valores

* [ ] **Whitelist de propiedades** — *módulo*: `gTheme/gStyle` · *tarea técnica*: lista permitida de colores, unidades (`px`, `rem`, `%`), tipografías, íconos.
* [ ] **Validación en backend** — *módulo*: `gTheme` · *tarea*: Zod/Joi schema en API; rechazar inyección de CSS/JS arbitrario.
* [ ] **Escape seguro en frontend** — *módulo*: `gAdmin` · *tarea*: usar `DOMPurify` o equivalente al renderizar descripciones/tokens.
* [ ] **Checkpoint A**: intentar inyectar `<script>alert()</script>` en un color/token → API rechaza con 400.

### B. CSP-aware (Content Security Policy)

* [ ] **Generación dinámica de CSP** — *módulo*: `gAdmin` · *tarea*: construir CSP a partir de fuentes e iconos habilitados.
* [ ] **Modo report-only** — *tarea*: activar `Content-Security-Policy-Report-Only` primero para recopilar violaciones.
* [ ] **Differences Analyzer** — *tarea*: servicio que muestra cambios CSP al modificar tema (ej. añadir fuente de Google).
* [ ] **Checkpoint B**: crear un Theme con fuente externa → CSP actualizado incluye solo ese dominio.

### C. Consentimiento de Terceros

* [ ] **Consent Manager** — *módulo*: `gAdmin` · *tarea técnica*: gestor de consentimiento (analytics, chatbots, pixels) categorizados: *necessary*, *analytics*, *ads*, *support*.
* [ ] **Scripts Condicionados** — *tarea*: solo cargar scripts tras consentimiento; almacenar preferencia por tenant/usuario.
* [ ] **UI Banner/Modal** — *tarea*: multilenguaje; configurable desde admin.
* [ ] **Checkpoint C**: desactivar “analytics” en banner → Google Analytics no aparece en `network` tab.

### D. Seguridad Avanzada de API/UI

* [ ] **Comparación segura de tokens** — *módulo*: `gAuth` · *tarea*: usar `crypto.timingSafeEqual` en validaciones sensibles.
* [ ] **Rate limit sensible en admin** — *módulo*: `gAdmin` · *tarea*: bucket distinto para panel de admin (más restrictivo).
* [ ] **Body size limit** — *módulo*: `gAdmin` · *tarea*: limitar payloads (`1MB` default, override en uploads).
* [ ] **Checkpoint D**: enviar payload >1MB en POST normal → API responde 413 Payload Too Large.

### E. Auditoría y Logs de Seguridad

* [ ] **AuditLog** — *módulo*: `gAdmin` · *tarea*: registrar cambios en CSP, consent, seguridad avanzada (activación/desactivación de features).
* [ ] **Correlation ID** — *módulo*: `gAdmin` · *tarea*: cada acción de seguridad vinculada con requestId.
* [ ] **Checkpoint E**: activar un CSP nuevo → AuditLog guarda acción con ID de usuario y correlación.

### F. Testing & Validación

* [ ] **Unit Tests** — validación de schema seguro, CSP generator, consent service.
* [ ] **E2E** — simulación de inyección maliciosa, verificación CSP headers, toggling de consent.
* [ ] **PenTesting básico** — suite automatizada contra XSS, CSRF, CSP bypass.
* [ ] **Checkpoint F**: correr suite de pentest → sin bypasses detectados.

### G. DoD (Definition of Done) Sección 9

* [ ] Tokens y estilos sanitizados en API/UI.
* [ ] CSP dinámico actualizado según selección de fuentes/iconos.
* [ ] Consentimiento de terceros implementado y efectivo.
* [ ] Límites de payload y rate limit reforzados en admin.
* [ ] Auditoría de cambios de seguridad.
* [ ] Pruebas unit/e2e + pentest básico superadas.

# ✅ Checklist — 10) Rendimiento & Publicación

**Estados:** \[x] Hecho · \[\~] En progreso · \[ ] No hecho

### A. Critical CSS & Split

* [ ] **Extracción de CSS crítico** — *módulo*: `gAdmin` · *tarea técnica*: usar herramientas (Next.js built-in o Critters) para generar CSS crítico por plantilla/página.
* [ ] **Code splitting de variantes pesadas** — *tarea*: cargar dinámicamente componentes/variantes grandes (ej. tablas complejas) solo cuando se usen.
* [ ] **Checkpoint A**: Lighthouse muestra reducción de CSS no usado (<10%).

### B. Icon Budget

* [ ] **Limitador de sets de iconos** — *módulo*: `gTheme` · *tarea*: permitir seleccionar subset de íconos (ej. solo 20 más usados).
* [ ] **Tree-shaking aplicado** — *tarea*: configurar build para eliminar íconos no usados (ej. FontAwesome subsets o Lucide import selectivo).
* [ ] **Medición de impacto** — *tarea*: mostrar peso de iconos incluidos en bundle.
* [ ] **Checkpoint B**: bundle de iconos <50KB, sin warnings de overfetch.

### C. Cache/ISR (Incremental Static Regeneration)

* [ ] **Políticas de cache** — *módulo*: `gAdmin` · *tarea*: habilitar `ETag`, `Last-Modified`, `Cache-Control` (`max-age`, `stale-while-revalidate`).
* [ ] **Revalidación ISR** — *tarea*: regenerar páginas estáticas cuando cambia `gTheme` o `gStyle`; invalidar cache automáticamente.
* [ ] **Checkpoint C**: cambiar un tema → al refrescar, página cacheada refleja estilos en segundos, sin servir stale indefinidamente.

### D. Optimización de Recursos

* [ ] **Carga diferida (lazy loading)** — *módulo*: `gAdmin` · *tarea*: imágenes, videos, componentes secundarios.
* [ ] **Preload selectivo** — *tarea*: precargar fuentes y assets críticos (logo, tipografías, colores clave).
* [ ] **Imagen responsive** — *tarea*: soporte WebP/AVIF + `next/image` con `srcset`.
* [ ] **Checkpoint D**: Lighthouse Performance ≥ 95 en páginas demo.

### E. Monitoreo de Rendimiento

* [ ] **Métricas en /metrics** — *módulo*: `gAdmin` · *tarea*: exponer métricas Prometheus: tiempo medio de render, LCP, CLS.
* [ ] **Alertas básicas** — *tarea*: configurar thresholds (ej. LCP > 2.5s) → log warning.
* [ ] **Dashboard Grafana** — *tarea*: opcional, visualizar métricas de build/render.
* [ ] **Checkpoint E**: simular carga → métricas expuestas en /metrics con etiquetas (page, tenant).

### F. Auditoría & Logs

* [ ] **AuditLog** — *módulo*: `gAdmin` · *tarea*: registrar cambios en políticas de cache, regeneraciones ISR, icon budgets.
* [ ] **Correlation ID** — *tarea*: enlazar métricas y logs de rendimiento con requestId.
* [ ] **Checkpoint F**: invalidar cache manualmente → AuditLog refleja acción y métrica se ajusta.

### G. Testing & Validación

* [ ] **Unit Tests** — para funciones de extracción de CSS crítico, icon budget.
* [ ] **E2E** — validar regeneración ISR, cache headers correctos, carga diferida de imágenes.
* [ ] **Lighthouse CI** — correr auditoría en pipeline (mínimos de Performance ≥ 95).
* [ ] **Checkpoint G**: CI bloquea si Lighthouse Performance < 95.

### H. DoD (Definition of Done) Sección 10

* [ ] CSS crítico extraído y variantes pesadas divididas.
* [ ] Icon budget aplicado y medido.
* [ ] Cache + ISR con invalidación automática funcionando.
* [ ] Recursos optimizados (lazy load, imágenes responsive).
* [ ] Métricas Prometheus + alertas básicas activas.
* [ ] Auditoría y logs de rendimiento disponibles.
* [ ] Tests unit/e2e + Lighthouse CI verdes.

# ✅ Checklist — 11) i18n Avanzado aplicado a Theme/Style

**Estados:** \[x] Hecho · \[\~] En progreso · \[ ] No hecho

### A. Overrides por Locale

* [ ] **Fuentes específicas por idioma** — *módulo*: `gTheme` · *tarea técnica*: permitir configurar tipografías diferentes para scripts distintos (ej. Noto Sans Arabic para árabe, Inter para latín).
* [ ] **Fallbacks por locale** — *tarea*: definir `font-family` alternativos por idioma en tokens.
* [ ] **Ajustes RTL** — *módulo*: `gTheme` · *tarea*: activar modo RTL automático en base al locale (`dir="rtl"`) y ajustar tokens de espaciados/márgenes.
* [ ] **Checkpoint A**: cambiar tenant a `ar-SA` aplica tipografía árabe + layout RTL sin romper componentes.

### B. Traducciones del Panel de Administración

* [ ] **UI completa i18n** — *módulo*: `gAdmin` · *tarea*: traducir todos los labels, menús, tooltips y formularios con librería (ej. next-intl, i18next).
* [ ] **Glosarios por módulo** — *tarea*: centralizar terminología técnica (Theme, Style, Token, Variant) con traducción consistente.
* [ ] **Gestión de estados de traducción** — *tarea*: marcar strings no traducidos como `needs-review`.
* [ ] **Checkpoint B**: cambiar idioma de panel → toda la UI traducida, sin strings “hardcoded”.

### C. Sitemaps y SEO Multilenguaje

* [ ] **Sitemaps por idioma** — *módulo*: `gAdmin` · *tarea*: generar sitemap.xml con URLs por locale.
* [ ] **Etiquetas hreflang** — *tarea*: inyectar `<link rel="alternate" hreflang="...">` en páginas públicas.
* [ ] **Canonical tags** — *tarea*: evitar contenido duplicado entre locales, canonical a versión principal.
* [ ] **Checkpoint C**: inspección SEO muestra hreflang correcto y canonical válido para todas las páginas multi-idioma.

### D. Previsualización por Idioma

* [ ] **Preview multi-locale** — *módulo*: `gAdmin` · *tarea*: en sandbox, poder alternar idioma y ver reflejado tema/estilo aplicados.
* [ ] **Comparador de locales** — *tarea*: vista que muestra en paralelo cómo se ve la misma página en dos idiomas distintos.
* [ ] **Checkpoint D**: admin puede revisar traducción visual antes de publicar.

### E. Accesibilidad Multilenguaje

* [ ] **Marcado semántico** — *módulo*: `gAdmin` · *tarea*: añadir atributo `lang` dinámico al HTML `<html lang="...">`.
* [ ] **Compatibilidad lectores de pantalla** — *tarea*: verificar que ARIA labels también se traduzcan.
* [ ] **Checkpoint E**: VoiceOver/NVDA leen textos en idioma correcto según locale.

### F. Auditoría de Idiomas

* [ ] **AuditLog de cambios de traducción** — *módulo*: `gAdmin` · *tarea*: registrar cuando se actualiza un texto o se carga una nueva traducción.
* [ ] **Historial de traducciones** — *tarea*: versionar glosarios y permitir rollback.
* [ ] **Checkpoint F**: al revertir traducción, AuditLog registra cambio y UI refleja texto anterior.

### G. Testing & Validación

* [ ] **Unit Tests** — para resoluciones de tokens por locale y fallback de fuentes.
* [ ] **E2E Tests** — navegación entre idiomas, comprobación de hreflang en HTML.
* [ ] **Lighthouse i18n** — validar SEO multilenguaje ≥95.
* [ ] **Checkpoint G**: pipeline CI bloquea si hreflang ausente o traducciones faltantes.

### H. DoD (Definition of Done) Sección 11

* [ ] Overrides de fuentes, RTL y tokens por locale implementados.
* [ ] Panel admin traducido con glosarios consistentes.
* [ ] Sitemaps + hreflang + canonical activos y correctos.
* [ ] Previsualización multi-locale funcional.
* [ ] Accesibilidad en lectores de pantalla validada.
* [ ] Auditoría de traducciones activa.
* [ ] Tests unit/e2e + validaciones SEO multilenguaje en CI.

# ✅ Checklist — 12) Gobernanza, Auditoría y Flujo de Aprobaciones

**Estados:** \[x] Hecho · \[\~] En progreso · \[ ] No hecho

### A. Modelo de Permisos Finos (RBAC ampliado)

* [ ] **Matriz de permisos granular** — *módulo*: `gAuth/gMemberships` · *tarea técnica*: definir capacidades por recurso/acción: `theme:{create,edit,requestReview,approve,publish,rollback,export,import}`, `style:{create,edit,clone,setDefault,requestReview,approve,publish,rollback,export,import}`, `marketplace:{install,update}`, `pages:{overrideStyle}`.
* [ ] **Scopes por rol** — *tarea*: OWNER (todas), ADMIN (todas salvo gestión de roles/tenant), REVIEWER (approve/publish), EDITOR (create/edit/requestReview, aplicar), VIEWER (read).
* [ ] **Policy resolver** — *tarea*: servicio `can(user, action, resource, context)` con caché por request (tenant + rol + memberships).
* [ ] **Checkpoint A**: pruebas de `can()` retornan verdadero/falso correcto para combinaciones (rol × acción × recurso).

### B. Flujo de Aprobaciones (Draft → Review → Published)

* [ ] **Estados & transiciones** — *módulo*: `gTheme/gStyle` · *tarea técnica*: FSM: `draft → review → published`, `published → draft (new version)`, `review → changesRequested`, `changesRequested → review`.
* [ ] **Solicitar revisión** — *ruta*: `POST /v1/{themes|styles}/:id/request-review` (permiso: EDITOR+).
* [ ] **Aprobar/Rechazar** — *ruta*: `POST /v1/{themes|styles}/:id/approve`, `POST .../request-changes` (permiso: REVIEWER+).
* [ ] **Publicar** — *ruta*: `POST /v1/{themes|styles}/:id/publish` (permiso: ADMIN/OWNER).
* [ ] **Checkpoint B**: un EDITOR no puede publicar; REVIEWER puede aprobar; ADMIN publica; estados quedan persistidos y validados.

### C. Comentarios y Revisiones (Review Notes)

* [ ] **Entidad ReviewNote** — *módulo*: `gTheme/gStyle` · *tarea técnica*: `ReviewNote { id, entityType('theme'|'style'), entityId, authorId, comment, status('open'|'resolved'), createdAt, resolvedAt? }`.
* [ ] **UI de revisión** — *módulo*: `gAdmin` · *tarea*: panel lateral con lista de notas; creación inline sobre diffs de tokens/variantes.
* [ ] **Notificaciones** — *tarea*: evento `review.note.created` → webhook/email opcional a revisores.
* [ ] **Checkpoint C**: al crear “changes requested”, la entidad vuelve a `changesRequested` y el EDITOR ve las notas en UI.

### D. Auditoría Enriquecida

* [ ] **Acciones tipadas** — *módulo*: `gAdmin` · *tarea técnica*: registrar `THEME_*` y `STYLE_*`: `CREATED, UPDATED, VERSIONED, REVIEW_REQUESTED, APPROVED, CHANGES_REQUESTED, PUBLISHED, ROLLBACK, ACTIVATED, EXPORTED, IMPORTED`.
* [ ] **Payload seguro** — *tarea*: almacenar `before/after` minimizado (diff de tokens/variantes) sin datos sensibles; incluir `actorId, tenantId, correlationId, ip, userAgent`.
* [ ] **Consultas y filtros** — *rutas*: `GET /v1/audit?entityType=&entityId=&action=&actorId=&from=&to=&limit=&cursor=`.
* [ ] **Checkpoint D**: auditoría muestra línea de tiempo completa de un theme/variant con diffs; búsquedas por actor y rango de fechas funcionan.

### E. Reglas de Aprobadores y Políticas

* [ ] **Required reviewers** — *módulo*: `gAdmin` · *tarea técnica*: configuración por tenant: mínimo N revisores; lista de revisores obligatorios por módulo.
* [ ] **Políticas por plan** — *tarea*: planes con exigencias distintas (ej. “Enterprise: 2 aprobadores y retención 365 días”).
* [ ] **Bloqueo por incumplimiento** — *tarea*: si no se cumplen políticas, `publish` devuelve 412 Precondition Failed.
* [ ] **Checkpoint E**: configurar “2 aprobadores” → intento de publicar con 1 aprobador falla con 412.

### F. Gobernanza de Cambios Programados

* [ ] **Programación con aprobación** — *módulo*: `gTheme/gStyle/Jobs` · *tarea técnica*: `scheduledAt` requiere estado `approved`; job no ejecuta si caducó aprobación o cambió el diff.
* [ ] **Freeze windows** — *tarea*: ventanas de congelamiento (sin publicaciones) configurables por tenant.
* [ ] **Checkpoint F**: programar publicación en ventana “freeze” devuelve 409; fuera de ella, se permite tras aprobación vigente.

### G. Export/Import con Firma y Trazabilidad

* [ ] **Firma de artefactos** — *módulo*: `gTheme/gStyle` · *tarea técnica*: firmar `manifest` (HMAC/Ed25519) y guardar `signature`.
* [ ] **Trazabilidad** — *tarea*: asociar import a `sourceTenant` y `actor`; exigir aprobación para activar artefactos externos.
* [ ] **Checkpoint G**: un import sin firma válida → 400; import externo requiere aprobación REVIEWER antes de publicar.

### H. Alertas Operativas

* [ ] **Alert rules** — *módulo*: `gAdmin` · *tarea técnica*: alertar si hay >N cambios `published` en 1h, o si `rollback` ocurre >M veces/24h.
* [ ] **Canales** — *tarea*: webhook/Slack/Email con plantillas; incluir correlationId y deep-links a auditoría.
* [ ] **Checkpoint H**: simular 3 publicaciones rápidas → alerta enviada al canal configurado.

### I. UI de Gobernanza

* [ ] **Tab “Governance”** — *módulo*: `gAdmin` · *tarea*: sección con: políticas activas, required reviewers, freeze windows, cuotas, y últimos incidentes (alertas).
* [ ] **Workflow view** — *tarea*: diagrama de estados (draft→review→published) con pasos y responsables.
* [ ] **Checkpoint I**: desde la UI se pueden ajustar políticas y ver su impacto inmediatamente (p. ej., requerido 2 aprobadores → UI cambia indicadores).

### J. Testing & Compliance

* [ ] **Unit** — *tarea técnica*: `PolicyService`, `ApprovalService`, `AuditService`.
* [ ] **E2E** — *tarea*:

  * [ ] Draft → Review → Approve → Publish con required reviewers.
  * [ ] Publish bloqueado por política (freeze/required reviewers).
  * [ ] Auditoría completa con diffs y correlationId.
  * [ ] Import externo requiere aprobación.
* [ ] **Retención** — *tarea*: job que purga logs > política (p. ej., 180/365 días) con export previo opcional.
* [ ] **Checkpoint J**: suites verdes; auditoría exportada antes de purga; políticas aplicadas correctamente.

### K. DoD (Definition of Done) Sección 12

* [ ] RBAC granular operativo con `can()` en backend y UI consciente de permisos.
* [ ] Flujo de aprobaciones completo con comentarios y transiciones FSM.
* [ ] Auditoría enriquecida con diffs, filtros y correlationId.
* [ ] Políticas de gobernanza (required reviewers, freeze windows, planes) aplicadas.
* [ ] Firma/validación en export/import con trazabilidad.
* [ ] Alertas operativas configuradas.
* [ ] Pruebas unit/e2e + retención y export de auditoría implementadas.

# ✅ Checklist — 13) DX & Catálogo Visual

**Estados:** \[x] Hecho · \[\~] En progreso · \[ ] No hecho

### A. Tipados & Documentación Técnica

* [ ] **Tipos expuestos** — *módulo*: `plugin-sdk` · *tarea*: publicar `Theme`, `StyleToken`, `ComponentVariant`, `ThemeVersion` como tipos TS con JSDoc.
* [ ] **Docs en línea** — *tarea*: añadir comentarios de uso en los tipos (ej. `Theme.color.primary` → hex/rgba permitido).
* [ ] **Readme SDK** — *tarea*: guía rápida de uso: cómo inicializar cliente con tenant + auth; ejemplos de consumir themes/styles.
* [ ] **Checkpoint A**: generador de SDK produce `.d.ts` con comentarios; en un proyecto demo, intellisense muestra documentación.

### B. Catálogo Visual (Storybook / Docs UI)

* [ ] **Instalar Storybook** — *módulo*: `gAdmin` · *tarea*: configurar Storybook con soporte multi-tenant y tokens CSS.
* [ ] **Historias por componente** — *módulo*: `gStyle` · *tarea*: cada componente (Button, Input, Table…) con variantes principales.
* [ ] **Temas dinámicos** — *tarea*: knob/toolbar en Storybook para alternar entre temas/variantes activos.
* [ ] **A11y Addon** — *tarea*: integrar addon de accesibilidad (contrastes, labels, roles).
* [ ] **Checkpoint B**: Storybook muestra botones en todos los estilos; cambiar tema los actualiza en vivo; addon a11y pasa mínimo AA.

### C. Ejemplos & Snippets

* [ ] **Snippets TS/JSX** — *módulo*: `gAdmin` · *tarea*: generar snippets de uso (`<Button variant="primary" />`, `<Card theme="dark" />`).
* [ ] **Snippets CSS/Vars** — *módulo*: `gTheme` · *tarea*: exportar ejemplos de `:root { --color-primary: … }`.
* [ ] **Copiar desde UI** — *tarea*: botón de copiar en el catálogo visual.
* [ ] **Checkpoint C**: usuario copia snippet y funciona en app externa con el SDK.

### D. Integración DX

* [ ] **CLI Tools** — *módulo*: `plugin-sdk` · *tarea*: comando `g5 sdk update` para regenerar tipos/snippets.
* [ ] **Hot Reload** — *módulo*: `gAdmin` · *tarea*: cambios en tokens/variantes refrescan catálogo visual sin reiniciar.
* [ ] **Checkpoint D**: correr `g5 sdk update` actualiza tipos y snippets; catálogo se refresca en <3s.

### E. Testing

* [ ] **Unit**: tipados correctos, snippets válidos (parse JSX).
* [ ] **E2E**: cargar Storybook, cambiar tema, copiar snippet, validación a11y.
* [ ] **Checkpoint E**: Lighthouse sobre Storybook ≥90 en performance + a11y.

### F. DoD (Definition of Done) Sección 13

* [ ] SDK con tipos documentados.
* [ ] Catálogo visual navegable (Storybook).
* [ ] Snippets exportables y probados.
* [ ] Integración CLI y hot reload.
* [ ] Tests unit/e2e + a11y.

---

# ✅ Checklist — 14) Release & Calidad

**Estados:** \[x] Hecho · \[\~] En progreso · \[ ] No hecho

### A. Testing Automatizado

* [ ] **Unit tests** — *módulo*: `gAdmin/gTheme/gStyle` · *tarea*: validar parsers de tokens, FSM de estados (draft→review→publish), resolución de overrides.
* [ ] **E2E tests** — *tarea*: pruebas completas: crear tema, editar variante, solicitar review, aprobar, publicar, rollback, export/import.
* [ ] **Visual Regression** — *tarea*: snapshots visuales en Storybook (Percy/Chromatic).
* [ ] **A11y Regression** — *tarea*: axe-core en e2e para validar contrastes y roles.
* [ ] **Checkpoint A**: pipeline muestra 100% suites verdes; diffs visuales reportados.

### B. CI/CD Pipeline

* [ ] **Lint/Build/Test Gates** — *módulo*: `gAdmin` · *tarea*: flujo GitHub Actions: lint → build → unit → e2e → coverage.
* [ ] **Coverage Thresholds** — *tarea*: branches ≥70%, funcs ≥75%, lines ≥80%.
* [ ] **Artifacts Build** — *tarea*: generar openapi.json, postman\_collection.json, sdk TS.
* [ ] **Preview Deploy** — *tarea*: levantar entorno temporal por PR (Vercel/Netlify) con link de catálogo visual.
* [ ] **Checkpoint B**: PR muestra checks verdes y link de preview accesible.

### C. Versionado & Tags

* [ ] **Semver** — *módulo*: `gTheme/gStyle` · *tarea*: versionado semántico (major/minor/patch) en releases.
* [ ] **Changelog auto** — *tarea*: usar Conventional Commits + `changeset` para generar CHANGELOG.md.
* [ ] **GitHub Release** — *tarea*: crear tag y release con notas, changelog y artefactos.
* [ ] **Checkpoint C**: crear tag `v1.0.0` genera release con changelog y SDK publicado.

### D. Publicación de Artefactos

* [ ] **SDK NPM** — *módulo*: `plugin-sdk` · *tarea*: publicar cliente TS en GitHub Packages o npm privado.
* [ ] **Postman Collection** — *tarea*: export y publicar en repo/docs.
* [ ] **Docs site** — *módulo*: `gAdmin` · *tarea*: deploy de documentación (Docusaurus/Next docs).
* [ ] **Checkpoint D**: SDK instalable vía `npm i @governetix/g5-sdk`; docs accesibles online.

### E. Calidad Operativa

* [ ] **Lint estricto** — *tarea*: ESLint + TS strict + Prettier enforced.
* [ ] **Security Scan** — *tarea*: SAST (npm audit, CodeQL).
* [ ] **Performance budget** — *tarea*: Lighthouse CI con LCP <2.5s, CLS <0.1, bundle <250KB.
* [ ] **Checkpoint E**: pipeline falla si audit tiene vulnerabilidades altas o LCP >2.5s.

### F. Definition of Done Sección 14

* [ ] Tests unit/e2e/visual/a11y cubiertos.
* [ ] CI/CD pipeline completo con preview deploy.
* [ ] Versionado semántico y changelog automatizado.
* [ ] SDK, Postman y docs publicados.
* [ ] Calidad garantizada (lint, security, performance budgets).