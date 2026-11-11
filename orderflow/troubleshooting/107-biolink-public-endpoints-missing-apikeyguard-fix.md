---
title: "BioLink Público 401 — Falta @UseGuards(ApiKeyGuard) en Endpoints Públicos"
area: "Backend / BioLinks / Auth"
symptom: "GET /api/v1/bio/:slug y otros endpoints públicos de BioLink retornan 401 con mensaje 'TenantPrisma no resuelto. Guard de autenticación requerido.'"
status: "🔧 Aplicado"
date: "2026-09-14"
---

## Síntoma

Todos los endpoints públicos del módulo BioLink retornan HTTP 401:

```
GET /api/v1/bio/:slug                    → 401 "TenantPrisma no resuelto"
GET /api/v1/bio/tenant/:tenantId         → 401 "TenantPrisma no resuelto"
POST /api/v1/bio/public/:slug/click      → 401 "TenantPrisma no resuelto"
POST /api/v1/bio/public/:slug/order      → 401 "TenantPrisma no resuelto"
```

Afecta a:
- Páginas BioLink públicas (`/bio/:slug`)
- Click tracking de BioLink
- Fast Checkout desde BioLink

## Causa Raíz

Los endpoints públicos del `BiolinksController` usaban el decorador `@TenantPrisma()` pero **NO** tenían `@UseGuards(ApiKeyGuard)`.

El decorador `@TenantPrisma()` (en `tenant-prisma.decorator.ts:9`) lanza `UnauthorizedException` cuando `request.tenantPrisma` es `undefined`:

```typescript
// tenant-prisma.decorator.ts:9
throw new UnauthorizedException('TenantPrisma no resuelto. Guard de autenticación requerido.');
```

`request.tenantPrisma` solo es seteado por `ApiKeyGuard` (api-key.guard.ts:215-222). Sin guard, nunca se setea → 401.

El `TenantByHostMiddleware` resuelve `req.tenant` desde el hostname, pero **NO** setea `req.tenantPrisma`.

**Nota**: `BrandingProvider.tsx` en el frontend resuelve correctamente `targetSubdomain = null` para dominios raíz (2 partes como `provecchio.com`), permitiendo el fallback de API Key en el frontend. El problema es exclusivamente backend.

## Solución Aplicada

Agregar `@UseGuards(ApiKeyGuard)` a los 4 endpoints públicos de `BiolinksController`:

**Archivo**: `backend/src/biolinks/biolinks.controller.ts`

- `getPublicByTenantId` (línea 180): `@UseGuards(ApiKeyGuard)` ✅
- `getPublicBySlug` (línea 188): `@UseGuards(ApiKeyGuard)` ✅
- `registerClick` (línea 211): `@UseGuards(ApiKeyGuard)` ✅
- `createOrderFromBioLink` (línea 226): `@UseGuards(ApiKeyGuard)` ✅

`ApiKeyGuard` ya resuelve tenant desde hostname (api-key.guard.ts:151-159: `findTenantBySlug(hostSubdomain)`), y setea `req.tenantPrisma` (línea 215-222). El patrón es idéntico al de `SocialCatalogPublicController`.

## Verificación

```bash
# Antes (401):
curl -s https://provecchio.com/api/v1/bio/gaiawellness
# → {"message":"TenantPrisma no resuelto...","statusCode":401}

# Después (debería retornar el BioLink o 404 si no existe):
curl -s https://provecchio.com/api/v1/bio/gaiawellness
```

## Archivos Relacionados

- `backend/src/biolinks/biolinks.controller.ts` — Fix aplicado
- `backend/src/common/tenant-prisma.decorator.ts:9` — Lanza 401
- `backend/src/common/api-key.guard.ts:215-222` — Setea `tenantPrisma`
- `backend/src/common/tenant-by-host.middleware.ts` — Resuelve `tenant` pero NO `tenantPrisma`
- `backend/src/social-catalog/social-catalog.controller.ts:12` — Referencia (ya tiene `@UseGuards(ApiKeyGuard)`)
