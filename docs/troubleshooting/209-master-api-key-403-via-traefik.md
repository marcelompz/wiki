# 209 — MASTER_API_KEY 403 "Missing user or tenant context" vía Traefik + RBAC 403 `tables:manage` en `close(force)`

**Fecha:** 2026-10-27 · **Versión:** corregido en v1.43.7 (FEAT-209) · **Descubierto en:** smoke post-deploy v1.43.6 (auditoría FEAT-208)

## Síntomas (2 relacionados, misma raíz)

1. **403 "Missing user or tenant context"** al llamar CX endpoints con `x-api-key: <MASTER_API_KEY>` vía `https://provecchio.com` (externo, por Traefik). El **mismo** key contra `localhost`/contenedor-interior funciona.
2. **403 `Missing permission: tables:manage`** en `POST /api/v1/table-sessions/:id/close` con `force:true` y master key (incluso contenedor-interior con `X-Tenant-Id`).

## Causa raíz

En `backend/src/common/api-key.guard.ts`, la resolución de tenant y la identificación de la API key corrían en una cadena `if (paramTenant) … else if (apiKey)`: cuando el **host ya resuelve tenant** (`provecchio.com` → tenant por `customDomain`), el master key caía en la rama del `if` y **nunca se creaba el usuario synthetic super-admin** (`request.isSuperAdmin` ausente). El `PermissionsGuard` tampoco podía sintetizar user (busca con `apiKeySecret` de tenant, no el master key) → `ForbiddenException('Missing user or tenant context')`.

> En `localhost` funcionaba por accidente: el host no resuelve tenant (está excluido del slug), la rama `else if (apiKey)` se ejecutaba y el synthetic se creaba — por eso el bug solo aparecía vía Traefik/dominios de producción.

El segundo síntoma: aunque `PermissionsGuard` short-circuita con `isSuperAdmin`, el endpoint `close(force)` llama **directamente** `rbacService.assertPermission(req.user?.id, …, 'tables:manage')` (`table-sessions.controller.ts`). `RbacService.hasPermission` solo reconocía el synthetic `'super-admin-global'`; el id `'master'` no existe en DB → 403.

## Solución (v1.43.7 — sin endpoints ni migraciones)

1. **`api-key.guard.ts`:** el chequeo del master key se extrajo a un bloque **independiente** de la resolución por host/query. Si `apiKey === MASTER_API_KEY` → `isSuperAdmin=true` + usuario synthetic (`id 'master'`), conservando el tenant resuelto por host en `tenantId`/`defaultTenantId`. Las API keys de tenant solo se consultan cuando el host **no** ya resolvió tenant (`else if (apiKey && !paramTenant)`) — semántica previa intacta.
2. **`rbac.service.ts` `hasPermission`:** shortcut extendido a `userId === 'master'`.
3. Workaround válido mientras (documentado en auditoría FEAT-208): ejecutar desde el contenedor con `X-Tenant-Id`.

## Lecciones / reglas

- **No encadenar resolución de identidad con `else if`:** cada criterio de identidad (JWT, master key, tenant API key, host) debe evaluarse de forma independiente y documentar su precedencia.
- Al automatizar contra producción, preferir JWT de login (`POST /api/v1/auth/login`, credenciales por env — ver `E2E_ADMIN_PASSWORD` en `.env` gitignored, specs 18 actualizadas en FEAT-209) o el contenedor-interior con `X-Tenant-Id`.
- El `assertPermission()` directo en controladores **bypassea** el shortcut del `PermissionsGuard`: cualquier usuario synthetic nuevo debe agregarse también a `RbacService.hasPermission`.
