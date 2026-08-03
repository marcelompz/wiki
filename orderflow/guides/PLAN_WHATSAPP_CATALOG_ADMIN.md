# Plan — Customización del Catálogo WhatsApp (Admin Tenant + SuperAdmin)

## Objetivo

Habilitar la personalización completa del catálogo WhatsApp por tenant, con panel administrativo propio y área SuperAdmin para gestión global de plantillas y configuraciones, manteniendo el cumplimiento de `AGENTS.md` y la directiva **mobile-first**.

## Estado Actual

| Capa | Estado |
|------|--------|
| Backend público | Endpoint unificado `GET /api/v1/public/catalog/products` y `/config` resuelve tenant por API key o subdomain. |
| Backend admin | Endpoints específicos para configuración de catálogo (`GET/PUT /api/v1/whatsapp-catalog/config`). |
| Frontend público | `whatsapp-catalog.tsx`, `whatsapp-checkout.tsx` y `TenantTemplate.tsx` consumen el endpoint unificado `/api/v1/public/catalog/...`. |
| Frontend admin | Página `admin/whatsapp-catalog.tsx` para editar config del tenant. |
| SuperAdmin | Panel `admin/super-whatsapp-catalog.tsx` para gestionar plantillas globales. |

## Alcance

### 1. Backend — Endpoints Admin Tenant
- `GET /api/v1/whatsapp-catalog/config` — Obtener configuración del tenant.
- `PUT /api/v1/whatsapp-catalog/config` — Actualizar configuración del tenant.
- Permisos: `whatsapp-catalog:manage` para admin tenant.
- Validación de `tenantId` en todas las operaciones.
- Guardar en `ModuleInstallation.config` existente.

### 2. Backend — Endpoints SuperAdmin
- `GET /api/v1/admin/whatsapp-catalog/templates` — Listar plantillas globales.
- `POST /api/v1/admin/whatsapp-catalog/templates` — Crear plantilla global.
- `PUT /api/v1/admin/whatsapp-catalog/templates/:id` — Actualizar plantilla.
- `DELETE /api/v1/admin/whatsapp-catalog/templates/:id` — Eliminar plantilla.
- Permisos: SuperAdmin exclusivo (`isSuperAdmin`).

### 3. Frontend — Panel Admin Tenant
- Página `admin/whatsapp-catalog.tsx`.
- Campos editables: nombre del negocio, WhatsApp, dirección, costo de envío, zonas de entrega, banner, welcome message, plantilla de mensaje personalizada, colores de branding.
- Validación visual y guardado con `PUT /api/v1/whatsapp-catalog/config`.
- Vista previa en mobile del impacto de cambios.

### 4. Frontend — Panel SuperAdmin
- Página `admin/super-whatsapp-catalog.tsx` o extensión de `super-admin-dashboard.tsx`.
- Gestión de plantillas globales predefinidas por rubro (SPA, retail, food, automotive, cafe).
- Asignar plantilla por defecto a tenants nuevos.
- Variables: `whatsappNumber`, `welcomeMessage`, `address`, `deliveryCost`, `bannerUrl`, `customMessageTemplate`, `deliveryZones`.

### 5. Modelado de Datos
- Reutilizar `ModuleInstallation.config` para config del tenant.
- Nueva tabla `WhatsappCatalogTemplate` para plantillas SuperAdmin (si se requiere persistencia dedicada).
- Migración Prisma si corresponde.

### 6. Criterios de Aceptación
| Criterio | Aceptación |
|----------|------------|
| Admin Tenant | Puede editar toda la config de su catálogo y ver cambios reflejados en `/whatsapp-catalog`. |
| SuperAdmin | Puede crear/editar/eliminar plantillas globales y asignar defaults. |
| Mobile-first | Panel admin usable en 375px mínimo. |
| Trazabilidad | Todos los cambios registran `tenantId`, `userId` y timestamp. |
| Cumplimiento | `AGENTS.md` respetado; sin lógica condicional por modo. |

## Documentación y sincronización

- `docs/PLAN_WHATSAPP_CATALOG_ADMIN.md` (este documento).
- `featurelist.json`: crear feature para customización admin/superadmin.
- `ROADMAP.md`: reflejar sprint de maduración de catálogo.
- `VERSION`, `package.json`, manifiestos: sincronizar tras merge a main.
