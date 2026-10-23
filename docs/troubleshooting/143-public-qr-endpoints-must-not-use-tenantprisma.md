---
title: "143-public-qr-endpoints-must-not-use-tenantprisma"
area: "Backend / Guest / QR / Auth"
symptom: "GET /api/v1/guest/tables/by-token/:token y otros endpoints públicos QR devuelven 401 'API key or valid JWT missing' después de una actualización de versión"
status: "🔧 Aplicado"
date: "2026-10-17"
---

## Síntoma

Después de la actualización a v1.39.5, el escaneo de QR de mesa en `https://provecchio.local/?t=<token>` fallaba con:

```
OmniBio No Encontrado
API key or valid JWT missing
```

Los endpoints públicos de QR / Bio-Link / Guest devolvían 401 a pesar de que el frontend no enviaba credenciales.

## Causa Raíz

Los controladores `guest` tenían `@UseGuards(ApiKeyGuard)` a **nivel de clase** (`@Controller`), lo que protegía todos los endpoints del controlador, incluidos los públicos de QR:

- `GuestTablesController` — `@UseGuards(ApiKeyGuard)` en línea 11
- `GuestOrdersController` — `@UseGuards(ApiKeyGuard)` en línea 29
- `GuestCallWaiterController` — `@UseGuards(ApiKeyGuard)` en línea 21

Adicionalmente, los métodos públicos usaban `@TenantPrisma()`, que lanza `UnauthorizedException` cuando `request.tenantPrisma` es `undefined` (solo seteado por `ApiKeyGuard` o `JwtAuthGuard`).

## Solución Aplicada

1. **Eliminación de guards a nivel de clase** en los 3 controladores `guest`.
2. **Eliminación de `@TenantPrisma()`** de todos los endpoints públicos; ahora usan `this.prisma` (singleton).
3. **Adición de `@UseGuards(ApiKeyGuard)`** a los endpoints de CRUD que sí requieren autenticación (listGuests, createGuest, updateGuest, deleteGuest).
4. **Resolución de tenant desde el QR token**: `by-token` busca `restaurantTable.token` → `tenantId`; `createDraft` y `call-waiter` usan el mismo patrón.

## Regla Agregada (AGENTS.md Rule 4)

> **Endpoints Públicos QR / Guest: Sin Auth ni `@TenantPrisma()`:** Los endpoints llamados por el frontend **antes** de autenticación **NUNCA** deben llevar `@UseGuards(ApiKeyGuard)` ni `@TenantPrisma()`.

### Verificación automática

`scripts/check-public-endpoints.sh` (ejecutado en `scripts/init.sh` paso 0):

1. Los endpoints públicos no usan `@TenantPrisma()`.
2. Los controladores públicos no tienen `@UseGuards(ApiKeyGuard)` a nivel de clase.
3. Los métodos públicos no tienen `@UseGuards(ApiKeyGuard)` a nivel de método.

## Endpoints Públicos Afectados

| Endpoint | Controlador | Estado |
|----------|-------------|--------|
| `GET /api/v1/bio/:slug` | BioLinksController.getPublicBySlug | ✅ |
| `GET /api/v1/bio/tenant/:tenantId` | BioLinksController.getPublicByTenantId | ✅ |
| `POST /api/v1/bio/public/:slug/click` | BioLinksController.registerClick | ✅ |
| `POST /api/v1/bio/public/:slug/order` | BioLinksController.createOrderFromBioLink | ✅ |
| `GET /api/v1/guest/tables/by-token/:qrToken` | GuestTablesController.byToken | ✅ |
| `POST /api/v1/guest/orders` | GuestOrdersController.createDraft | ✅ |
| `GET /api/v1/guest/orders/:id` | GuestOrdersController.track | ✅ |
| `POST /api/v1/guest/tables/:tableId/call-waiter` | GuestCallWaiterController.callWaiter | ✅ |

## Archivos Relacionados

- `AGENTS.md` — Regla 4 (actualizada)
- `scripts/check-public-endpoints.sh` — Check automático
- `scripts/init.sh` — Integración en el pipeline de validación
- `backend/src/guest/guest-tables.controller.ts` — Fix aplicado
- `backend/src/guest/guest-orders.controller.ts` — Fix aplicado
- `backend/src/guest/guest-call-waiter.controller.ts` — Fix aplicado
- `backend/src/biolinks/biolinks.controller.ts` — Fix aplicado
- `docs/troubleshooting/107-biolink-public-endpoints-missing-apikeyguard-fix.md` — Solución previa (v1.37)