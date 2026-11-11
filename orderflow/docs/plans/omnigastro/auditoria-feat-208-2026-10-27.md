# Auditoría — FEAT-208 fix POS de Mozo v1.43.6 (2026-10-27)

**Rama:** `fix/omnigastro-pos-envio-cocina-items` · **Origen:** pruebas de producción v1.43.5 (`docs/info/OmniGastro.md`)
**Troubleshooting:** [#208](../../troubleshooting/208-gastro-pos-order-id-lines-catalogo.md) · **Plan:** [plan-actualizacion-v1.43.6](plan-actualizacion-v1.43.6-pos-envio-cocina-items.md)

## Protocolo §3.1 (deploy-to-local-first) — estado

| Paso | Resultado |
|---|---|
| Backup de producción | ✅ `pre_deploy_provecchio_20261027_105312.sql` (2.28 MB) + uploads (28.9 MB) + rollback env |
| Restore en localhost | ✅ 170 tablas, 1 tenant, 7 empleados, 4 cajas · 0 migraciones pendientes |
| Barrera `./scripts/init.sh` | ✅ **139/139 suites · 1053/1053 tests** · builds backend+frontend limpios · QA E2E verde |
| Deploy local v1.43.6 | ✅ `deploy-local.sh` exit 0 · 13/13 versiones sincronizadas · health `{"version":"1.43.6"}` DB + odoo_adapter OK |

**Nota del primer intento de deploy-local:** abortó en la barrera de sincronización de versión por 4 archivos que el checker exige además de los 5 de la Regla #11 (`mobile/package.json`, badge de `README.md`, `docs/ROADMAP.md`, `docs/guides/CHANGELOG.md`) — alineados y reintento aprobado.

## Validación funcional del fix (API + E2E, backend v1.43.6 reconstruido)

| Verificación | Detalle | Resultado |
|---|---|---|
| **Bug 3 — catálogo completo** | `GET /catalog/categories/tree?includeProducts=true` → 2 raíces ("Para beber"/"Para comer"), **203/203 productos activos adjuntos** | ✅ |
| **Bug 2 — guard claim documentado** | `PATCH /orders/:id/items` sin claim → **400** *"El pedido aún no fue reclamado por el mozo"* | ✅ (comportamiento esperado) |
| **Bug 2 — persistencia con claim** | claim 200 → PATCH 2 líneas (seat 1 y 2, total 71000) → GET persiste **2 lineas** | ✅ |
| **Bug 1 — envío a cocina** | `POST /orders/:id/ready` tras claim → **200 con `meta.readyAt`** (la condición que habilita el cobro en el POS) | ✅ |
| **E2E** `frontend/e2e/gastro-pos-send-kitchen.spec.ts` | 5/5 pasadas (árbol completo, alta QR DRAFT+sesión, guard 400, claim+PATCH persiste, ready `readyAt` + cleanup) | ✅ |
| **Vitest frontend** | 26/26 (9 archivos) | ✅ |
| **tsc** | backend y frontend sin errores | ✅ |
| Cleanup datos de prueba | orden `CANCELLED`, `table_sessions` CLOSED, mesa G10 `FREE` | ✅ |

## Validación en producción (post-deploy 2026-10-27 ~15:00 UTC)

`./scripts/deploy-production.sh provecchio` → `DEPLOY_PROD_EXIT=0` · 0 migraciones pendientes · `https://provecchio.com/api/v1/health` → **200 `1.43.6`** (DB + odoo_adapter OK).

Smoke ejecutado desde dentro del contenedor (`docker exec orderflow_backend node -`) con host `localhost` + `X-Tenant-Id` (vía Traefik el ApiKeyGuard resuelve tenant por host `provecchio.com` y el usuario sintético del MASTER key no se crea → 403 "Missing user or tenant context"; hallazgo documentado más abajo):

| Verificación | Resultado |
|---|---|
| `GET /health` | ✅ 200 · 1.43.6 |
| Árbol de catálogo (`X-Tenant-Id`) | ✅ 200 · **203/203 productos** |
| Alta QR pública (mesa G9) | ✅ 201 · DRAFT + sesión (order `a61f0e8b…`) |
| PATCH ítems sin claim | ✅ 400 *"El pedido aún no fue reclamado por el mozo"* |
| Claim → PATCH 2 líneas (seat 1/2) | ✅ 200/200 |
| Persistencia (`GET /orders/:id`) | ✅ 2 líneas · total 71000 |
| `POST /orders/:id/ready` | ✅ 200 · `readyAt=SET` |
| Cancel + cierre sesión force | ✅ cancel 200 · close 403 RBAC (`tables:manage` no derivado del master key — misma condición ya conocida de local; cierre aplicado por SQL siguiendo §2.4) |
| Estado final mesa G9 | ✅ sesión `CLOSED` · mesa `FREE` (sin ordenes activas) |

> Nota del smoke previo abortado: el primer intento filtró mesas con `GET /api/v1/tables` y devolvió `NO FREE TABLE` — con el master key + host localhost el usuario sintético no tiene tenant y la respuesta viene vacía; la DB confirma 6 mesas `FREE`. Corridas siguientes fijan `X-Tenant-Id`.

## Hallazgos nuevos (no bloqueantes, requieren plan propio)

1. **403 MASTER_API_KEY vía Traefik:** en producción el `ApiKeyGuard` resuelve tenant por host antes de considerar el master key, de modo que el usuario sintético super-admin nunca se crea → `PermissionsGuard` 403 "Missing user or tenant context" para llamadas externas con master key (`provecchio.com`). Workaround documentado: ejecutar contenedor-interior con `X-Tenant-Id`. Pendiente de plan (tocaría `backend/src/common/api-key.guard.ts`).
2. **Cleanup RBAC del master key:** `POST /table-sessions/:id/close` con master key retorna 403 `tables:manage` (el permiso no se deriva a la key). Puede examinarse con el hallazgo 1.
3. **1 imagen huérfana en catálogo público** (`1791236270855_provecchio_isotipo_full.jpg`, padrón #167) — reportada por el QA del deploy; no relacionada con FEAT-208.

## Hallazgo ambiental (pre-existente, sin impacto del fix)

La suite completa de Playwright reporta **failures en specs que requieren login de administrador** (cashier-*, gastro-tables-crud, gastro-odoo-provisioning, white-label): `POST /api/v1/auth/login` con las credenciales documentadas en las specs (`SuperAdmin123!`) devuelve **409 "Invalid password"** sobre el backup restaurado de producción — reproducción exacta del troubleshooting **#201**. La password vigente en producción habría rotado y las specs (y el environment de Neweman `provecchio.postman_environment.json`, con `adminPassword` vacío) quedaron desactualizadas.

- **No es una regresión de v1.43.6** (los fallos ocurren en el login, antes de tocar el código modificado).
- **Pendiente de decisión del usuario:** confirmar si la password del SuperAdmin fue rotada (o re-hashear con la estándar, sin pegar hashes con `$` inline — ver lecciones de #201) y **actualizar credenciales de las specs** (o inyectarlas por env en vez de hardcodearlas).

## Próximos pasos

1. ~~Autorización del usuario para el deploy a producción~~ → **✅ Deploy ejecutado 2026-10-27 y validado (ver arriba).**
2. Confirmar password vigente del SuperAdmin (#201) para desbloquear las specs E2E que requieren login (cashier-*, tables-crud, odoo-provisioning, white-label).
3. Planear fix del 403 MASTER_API_KEY vía Traefik (hallazgo 1) y del RBAC del cierre de sesión con master key (hallazgo 2).
4. Imagen huérfana del catálogo público (#167).
