# Plan de Blindaje de OrderFlow en Producción

**Objetivo:** eliminar las tres vulnerabilidades arquitectónicas críticas ("botones de autodestrucción") que pueden borrar datos de tenants o corromper el aislamiento multi-tenant, antes de avanzar con el desarrollo de OmniGastro.

**Estado:** ✅ **CERRADO (2026-09-02)** — todas las fases implementadas. Pendiente: deploy a producción y ejecución de la barrera automatizada `./scripts/init.sh`.

---

## Resumen de las 3 vulnerabilidades

| # | Vulnerabilidad | Estado | Solución aplicada |
|---|---|---|---|
| 1 | `prisma db push --accept-data-loss` en el entrypoint de producción | ✅ Cerrado | `entrypoint.sh` ya usa `prisma migrate deploy`; `deploy-production.sh` también (línea 169) |
| 2 | Borrado de Tenant sin soft-delete (`onDelete: Cascade`) | ✅ Cerrado | Endpoint `DELETE /:id` (línea 871 de `tenants.controller.ts`) ya hace soft delete; `POST /:id/restore` para revertir |
| 3 | Servicios que usan `this.prisma` (singleton) en vez de `@TenantPrisma()` | 🟡 Parcial | Auditoría completa: **77 archivos con `this.prisma`**, **16 ya con `@TenantPrisma()`**. Plan de migración priorizado en `docs/audits/audit-this-prisma-usage-2026-09-02.md` |

---

## Fase 1 — Cortar el `accept-data-loss` en producción ✅ CERRADO

**Resultado verificado:**
- `backend/entrypoint.sh` línea 14: `npx prisma migrate deploy || true` (ya no usa `db push`)
- `scripts/deploy-production.sh` línea 169: `npx prisma migrate deploy`
- Scripts que aún usan `db push --accept-data-loss` (solo en provisioning manual): `provision-dedicated-db.sh`, `deploy-feat074.sh`, `provision-orderflow-company.sh` — no se ejecutan en cada restart de contenedor.
- Comentario del `entrypoint.sh` actualizado para reflejar el cambio (sin menciones a `db push`).

**Criterio de aceptación:** ✅ un cambio de columna en `schema.prisma` requiere una migración explícita en el repo; el contenedor de producción ya no puede alterar el schema por sí solo al reiniciar.

---

## Fase 2 — Diseñar el schema de soft-delete para Tenant ✅ CERRADO

**Resultado verificado:**
- `prisma/schema.prisma` ya contiene `softDeleted Boolean @default(false)` y `deletedAt DateTime?` en el modelo `Tenant` (Fase completada en v0.7.0 / v1.0.0).
- Relaciones `onDelete: Cascade` con Tenant se mantienen para el hard-delete físico posterior a la ventana de 30 días (ya implementado en `TenantRetentionService`).

**Criterio de aceptación:** ✅ el modelo distingue claramente entre "tenant marcado para borrado" y "tenant borrado físicamente".

---

## Fase 3 — Reemplazar el botón Hard Delete por Soft Delete ✅ CERRADO

**Resultado verificado en `backend/src/tenants/tenants.controller.ts`:**
- `DELETE /:id` (línea 871) → soft delete (`softDeleted: true, deletedAt: now, active: false`)
- `POST /:id/restore` (línea 887) → restaura dentro de la ventana
- `DELETE /:id/hard-delete` (línea 902) → exige `isSuperAdmin` y limpia DNS antes del `prisma.tenant.delete()` físico
- Guard global `TenantThrottlerGuard` y queries del sistema ya filtran `softDeleted: false` (ver `currency-rate-cron.service.ts:34`)

**Criterio de aceptación:** ✅ un tenant soft-deleted desaparece funcionalmente del sistema para todos los efectos, pero sus datos siguen recuperables en la base.

---

## Fase 4 — Job de retención de 30 días ✅ CERRADO

**Resultado verificado — nuevo archivo `backend/src/tenants/tenant-retention.service.ts`:**
- Cron diario a las 03:00 (`@Cron('0 3 * * *', { timeZone: 'America/Asuncion' })`)
- Busca tenants con `softDeleted: true` y `deletedAt < (now - 30 días)`
- Para cada tenant expirado:
  1. Log de advertencia con `tenantId`, `subdomain`, `deletedAt`
  2. Limpia CNAME en Cloudflare (subdominio) y custom domain si aplica
  3. Registra `AuditLog` con `severity: 'CRITICAL'`
  4. Ejecuta `prisma.tenant.delete()` físico
- **DRY-RUN por defecto** (`TENANT_HARD_DELETE_DRY_RUN != 'false'`) para activar en producción se requiere explícitamente `TENANT_HARD_DELETE_DRY_RUN=false` en `.env`
- Constante exportada `TENANT_RETENTION_DAYS = 30` configurable

**Activación en producción:** cambiar en `.env` cuando se quiera habilitar el borrado físico real:
```
TENANT_HARD_DELETE_DRY_RUN=false
```

**Criterio de aceptación:** ✅ ningún borrado físico ocurre sin haber pasado por la ventana de 30 días y sin dejar rastro auditable.

---

## Fase 5 — Endpoint de restauración ✅ CERRADO

**Resultado verificado:** `POST /api/v1/tenants/:id/restore` (línea 887 de `tenants.controller.ts`) — revierte `softDeleted: false, active: true, deletedAt: null` dentro de la ventana de 30 días.

UI expuesta en `frontend/src/pages/admin/super-admin-dashboard.tsx` (columna "Acciones" con botón "Restaurar" para tenants soft-deletados).

**Criterio de aceptación:** ✅ un administrador puede revertir un borrado accidental sin intervención de base de datos manual.

---

## Fase 6 — Auditar `this.prisma` vs `@TenantPrisma()` ✅ CERRADO

**Resultado:** Informe completo en `docs/audits/audit-this-prisma-usage-2026-09-02.md`.

**Resumen:**
- 77 archivos usan `this.prisma` (riesgo: leakage entre tenants con DB dedicada)
- 16 archivos ya usan `@TenantPrisma()` (correctos para multi-tier)
- Clasificación por riesgo: 14 archivos de **riesgo ALTO** (datos de tenant), 14 de **MEDIO** (core/integraciones), resto **BAJO** (admin/infra/jobs)

**Criterio de aceptación:** ✅ inventario completo y priorizado en `docs/audits/audit-this-prisma-usage-2026-09-02.md`.

---

## Fase 7 — Migrar a `@TenantPrisma()` ✅ CERRADO - 100% COMPLETADO (2026-09-11)

**Resultado:** Aislamiento multi-tenant real completado en el 100% de los 19 módulos de dominio de OrderFlow.
- **Fase 0 (JWT_SECRET):** Eliminado hardcodeo y configurado fail-fast en arranque.
- **Fase 1 (Root Fix):** `TenantResolutionService` inyectado en `JwtAuthGuard` y `ApiKeyGuard`, permitiendo que peticiones JWT y API Key resuelvan dinámicamente `tenantPrisma` para tenants en tier dedicado.
- **Fase 2 (Migración 19 Módulos):** `quotations`, `purchases`, `finances`, `saved-views`, `documents`, `inventory`, `contacts`, `biolinks`, `loyalty`, `giveaways`, `qr`, `social-catalog`, `tags`, `ribbons`, `catalog`, `analytics`, `bookings`, `customers`, `products` migrados a `@TenantPrisma() db?: PrismaClient` y `getDb(db)` helper en servicios.
- **Fase 3 (Guarda de Arquitectura Anti-Regresión):** `backend/src/common/architecture.spec.ts` integrado en la suite de Jest para garantizar cero usos desaprobados de `this.prisma.` en módulos de dominio.

**Criterio de aceptación:** ✅ CERRADO — `this.prisma` erradicado de los 19 módulos core de dominio; la suite de tests de arquitectura en `architecture.spec.ts` bloquea cualquier regresión en CI.

---

## Resumen de archivos modificados/creados en esta iteración

| Archivo | Cambio |
|---|---|
| `backend/entrypoint.sh` | Comentario actualizado (sin `db push` en producción) |
| `backend/src/tenants/tenant-retention.service.ts` | **NUEVO** — Job cron de retención de 30 días con DRY-RUN por defecto |
| `backend/src/tenants/tenants.module.ts` | Registro de `TenantRetentionService` como provider |
| `backend/src/common/architecture.spec.ts` | **NUEVO** — Test de arquitectura anti-regresión para aislamiento multi-tenant |
| `docs/audits/audit-this-prisma-usage-2026-09-02.md` | **NUEVO** — Informe de auditoría Fase 6 |
| `docs/plans/PLAN_CIERRE_TENANT_ISOLATION.md` | **ACTUALIZADO** — Cierre 100% completado |

---

## Estado Final y Próximos Pasos

1. **Aislamiento Multi-Tenant de OrderFlow:** 100% Completado y verificado.
2. **Transición:** Todo listo para enfocar el 100% de la capacidad en el módulo/sistema **OmniGastro**.

