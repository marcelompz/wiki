# Prompt: Feature flags de módulos por tenant (OrderFlow)

## Contexto
OrderFlow es un SaaS multi-tenant con módulos opcionales (catálogo, bookings, biolinks, POS, KDS, loyalty, giveaways, etc.).

Ya existe en Prisma el modelo:

```prisma
model ModuleInstallation {
  id          String   @id @default(uuid())
  tenantId    String
  moduleId    String
  version     String
  installedAt DateTime @default(now())
  updatedAt   DateTime @updatedAt
  active      Boolean  @default(true)
  config      Json     @default("{}")
  tenant      Tenant   @relation(...)
  @@unique([tenantId, moduleId])
  @@map("module_installations")
}
```

También hay flags legacy en `Tenant` (`bookingsEnabled`, `ecommerceEnabled`, etc.).

Objetivo: convertir eso en una **capa de feature flags** usable por:
- API (guards / servicios)
- Admin web
- App móvil **cliente** (módulos opcionales)
- App móvil **staff/admin** (más features operativas)

No implementar Super Admin de plataforma ni Deploy Manager dentro de las apps móviles.

---

## Objetivos
1. Catálogo canónico de `moduleId` (fuente única de verdad).
2. Servicio backend que responda: ¿módulo X activo para este tenant?
3. Guard/decorator para proteger endpoints de módulos opcionales.
4. Endpoint(s) para que las apps obtengan la lista de módulos habilitados (y config ligera).
5. Compatibilidad con flags legacy del `Tenant` durante la transición.
6. Contrato claro para app cliente vs app staff (audiencias).

---

## Catálogo de módulos (mínimo)

| moduleId           | Nombre                 | Core | Audiencias típicas      | Legacy (si aplica)   |
|--------------------|------------------------|------|-------------------------|----------------------|
| `core`             | Core                   | sí   | client, staff, admin    | —                    |
| `catalog`          | Catálogo / Ecommerce   | no   | client, staff, admin    | `ecommerceEnabled`   |
| `bookings`         | Turnos                 | no   | client, staff, admin    | `bookingsEnabled`    |
| `biolinks`         | Bio Links              | no   | client, admin           | —                    |
| `pos`              | Punto de Venta         | no   | staff, admin            | —                    |
| `kds`              | Kitchen Display        | no   | staff, admin            | —                    |
| `loyalty`          | Fidelización           | no   | client, staff, admin    | —                    |
| `giveaways`        | Sorteos                | no   | client, admin           | —                    |
| `quotations`       | Cotizaciones           | no   | staff, admin            | —                    |
| `whatsapp_catalog` | Catálogo WhatsApp      | no   | client, admin           | —                    |
| `facturasend`      | Facturación electrónica| no   | admin                   | —                    |
| `integrations`     | Integraciones ERP      | no   | admin                   | —                    |
| `billing`          | Billing SaaS           | no   | admin                   | —                    |
| `analytics`        | Analytics              | no   | staff, admin            | —                    |

- `core` siempre habilitado (no requiere fila en `ModuleInstallation`).
- Resto: habilitado si existe `ModuleInstallation` con `active: true` **o** (transición) el flag legacy del tenant es `true`.
- Ampliar el catálogo solo en un archivo central (no hardcodear IDs sueltos en controllers).

---

## Backend

### 1. `modules.catalog.ts`
- Exportar `MODULE_CATALOG`, tipos `ModuleId`, `ModuleAudience`, helpers `getModuleDefinition`, `listModulesForAudience`.

### 2. `FeatureFlagsService`
Métodos mínimos:

- `isEnabled(tenantId, moduleId, prisma?): Promise<boolean>`
- `getEnabledModules(tenantId, options?: { audience?: ModuleAudience }): Promise<Array<{ moduleId, name, config?, version? }>>`
- `assertEnabled(tenantId, moduleId)` → lanza `ForbiddenException` / `NotFoundException` si no está activo
- Resolución de tenant: usar `@TenantPrisma()` / connection manager existente cuando corresponda
- Cache opcional en memoria por `tenantId` (TTL corto, p. ej. 30–60s) para no golpear DB en cada request de menú

Reglas de resolución (en orden):
1. Si el módulo es `core` → `true`
2. Si hay `ModuleInstallation` para `(tenantId, moduleId)` → usar `active`
3. Si no hay fila y el módulo define `legacyTenantFlag` → leer ese boolean del `Tenant`
4. Si no → `false`

### 3. Guard + decorator
- `@RequireModule('bookings')` (aceptar uno o varios: OR u AND documentado)
- `ModuleGuard` que lea metadata, resuelva `tenant` del request y llame a `FeatureFlagsService`
- Combinable con guards actuales (`ApiKeyGuard`, `PermissionsGuard`): **módulo activo + permiso RBAC**

Ejemplo de uso:

```ts
@Get()
@RequireModule('bookings')
@RequirePermissions('bookings:read')
findAll(...) { ... }
```

Aplicar de forma prioritaria a controllers de módulos opcionales (bookings, biolinks, giveaways, loyalty, pos/kds si aplica, facturasend, etc.). No bloquear `core`.

### 4. API pública para apps

**Autenticado (JWT o API key de tenant):**

- `GET /api/v1/modules/enabled`  
  Query opcional: `audience=client|staff|admin`  
  Response ejemplo:

```json
{
  "tenantId": "...",
  "modules": [
    { "moduleId": "core", "name": "Core", "active": true },
    { "moduleId": "bookings", "name": "Turnos", "active": true, "version": "1.0.0", "config": {} },
    { "moduleId": "biolinks", "name": "Bio Links", "active": false }
  ]
}
```

- Opcional: `GET /api/v1/modules/enabled/:moduleId` → `{ active: boolean, config?: object }`

**Instalación / admin** (si aún no está completo el marketplace):
- Reutilizar endpoints existentes de system-modules / marketplace si ya existen (`modules:read`, `modules:install`, `modules:uninstall`, `modules:configure`).
- Si faltan: CRUD mínimo sobre `ModuleInstallation` solo para roles admin del tenant o superadmin, sin romper el App Store actual.

### 5. Módulo Nest
- `FeatureFlagsModule` global o exportado e importado en `AppModule` y en módulos que usen el guard.
- No instanciar `PrismaClient` a mano: seguir patrón `@TenantPrisma()` / `PrismaService` del proyecto.

---

## Frontend / Apps

### Contrato
Tras login (o al resolver tenant), llamar `GET /api/v1/modules/enabled?audience=...` y guardar en store (Zustand/context).

### App cliente (`audience=client`)
- Mostrar solo ítems cuyo `moduleId` esté `active`.
- Ejemplos: Catálogo, Turnos, BioLinks, Loyalty, Sorteos, Mis pedidos (core).
- Si el usuario abre deep link a un módulo desactivado → pantalla amigable “No disponible en este negocio”, no crash.

### App staff/admin (`audience=staff` o `admin`)
- Igual, pero incluye POS, KDS, cotizaciones, analytics, etc.
- No incluir Super Admin de plataforma ni Infrastructure Deploy Manager.

### Admin web
- Menú/sidebar filtrado por módulos activos + permisos RBAC (además del trabajo de drawer móvil ya discutido).
- Helper único: `isModuleEnabled(moduleId)` / `useFeatureFlags()`.

### No hacer
- No meter feature flags “globales de producto” tipo LaunchDarkly salvo que ya exista infraestructura; este diseño es **por tenant** vía `ModuleInstallation`.
- No duplicar listas de módulos en cada pantalla: un catálogo + respuesta del API.

---

## Migración / datos
1. Seed o script: para tenants con `bookingsEnabled=true` → upsert `ModuleInstallation(moduleId='bookings', active=true)`.
2. Idem `ecommerceEnabled` → `catalog`.
3. Documentar que a medio plazo los flags del `Tenant` quedan deprecados a favor de `ModuleInstallation`.

---

## Criterios de aceptación
- [ ] Catálogo central de `moduleId` documentado y usado en backend.
- [ ] `FeatureFlagsService.isEnabled` respeta core + ModuleInstallation + legacy.
- [ ] `@RequireModule` bloquea endpoints de módulos inactivos (403/404 consistente con el resto de la API).
- [ ] `GET /api/v1/modules/enabled` filtra por `audience` y refleja el estado real del tenant.
- [ ] App cliente y app staff pueden construir menú solo con módulos activos.
- [ ] RBAC sigue aplicándose: módulo activo no implica permiso de escritura.
- [ ] Sin regresiones en tenants que solo tenían flags legacy.
- [ ] Tests unitarios del service (core, install active/inactive, legacy, audience filter) y al menos un test de guard.

---

## Fuera de alcance
- Implementar las apps Expo completas.
- Rediseño del menú móvil (drawer/bottom bar) — solo consumir flags cuando exista el menú.
- Facturación de add-ons / billing automático al instalar módulo (puede integrarse después con `BillingModule`).
- Cambiar schema de `ModuleInstallation` salvo necesidad justificada (p. ej. índice extra).

---

## Entregables
1. Código backend: catalog, service, guard, decorator, module Nest, endpoint(s).
2. Integración mínima en 1–2 controllers de módulos opcionales como ejemplo (p. ej. bookings y biolinks).
3. Helper/hook frontend (o snippet documentado) para consumir `/modules/enabled`.
4. Script o nota de migración legacy → `ModuleInstallation`.
5. Breve doc en `docs/` o comentario en README: cómo agregar un módulo nuevo al catálogo y proteger un endpoint.

## Estilo
- TypeScript estricto, alineado a NestJS + Prisma del repo.
- Español en mensajes de error orientados a usuario; inglés aceptable en código/identificadores.
- No inventar paths de archivos que contradigan la estructura real: ubicar bajo `backend/src/feature-flags/` (o el módulo `system-modules` existente si ya concentra esta lógica).
