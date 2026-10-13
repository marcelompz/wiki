# Auditoría OrderFlow v1.28.0 (FEAT-135)

**Fecha:** Septiembre 2026
**Alcance:** repo real (`orderflow_v1_28_0_tar.gz`), contrastado contra el estado documentado en auditorías previas (v1.26.00, v1.27.10) y contra `PLAN_CIERRE_TENANT_ISOLATION.md` / `PLAN_BLINDAJE_ORDERFLOW.md`.

---

## 1. Resumen ejecutivo

Desde la última auditoría (v1.27.10) el trabajo de producto avanzó de forma real: **OmniMessaging Hub** cerró sus 5 sprints (FEAT-130 a FEAT-134) y se sumó FEAT-135 (gestión de tokens admin). En seguridad hay **una mejora real y verificada** (`JWT_SECRET` fail-fast) y **un hallazgo nuevo** (`JWT_REFRESH_SECRET` sigue expuesto). El problema de fondo — aislamiento multi-tenant roto para el tráfico de sesión — **sigue exactamente igual que hace dos auditorías**: no se tocó ninguna línea del `PLAN_CIERRE_TENANT_ISOLATION.md`.

| Vulnerabilidad | v1.27.10 | v1.28.0 | Estado |
|---|---|---|---|
| `JWT_SECRET` hardcodeado | presente en 4 archivos | **eliminado** en los 4 + `packages/auth-shared` | ✅ Resuelto |
| `JWT_REFRESH_SECRET` hardcodeado | no auditado antes | presente (2 lugares) | 🆕 Nuevo hallazgo |
| `MASTER_API_KEY` hardcodeado | presente | **eliminado**, fail-fast | ✅ Resuelto |
| Fail-fast real de secretos débiles | solo loguea (warn/error) | **lanza excepción** al arrancar | ✅ Resuelto |
| `this.prisma` vs `@TenantPrisma()` | 61 vs 5 | 67 vs 5 | 🔴 Sin avance (empeoró) |
| `JwtAuthGuard` setea `tenantPrisma` | no | no | 🔴 Raíz sin arreglar |
| `TenantResolutionService` | no existe | no existe | 🔴 Sin avance |
| `hard-delete` de Tenant salta retención | sí | sí | 🔴 Sin avance |
| Regla de lint/`architecture.spec.ts` anti-regresión | no existe | no existe | 🔴 Sin avance |
| `db push --accept-data-loss` en prod automático | resuelto (entrypoint/deploy) | resuelto (sin cambios) | ✅ Se mantiene |
| `db push --accept-data-loss` en provisioning manual | presente, sin chequeo de DB vacía | presente, sin cambios | 🟡 Riesgo bajo (no automático) |

---

## 2. Hallazgos en detalle

### 2.1 ✅ Resuelto — `JWT_SECRET` y `MASTER_API_KEY`
Los 4 archivos identificados en la auditoría anterior (`auth.module.ts`, `jwt-auth.guard.ts`, `auth.service.ts`, `common/api-key.guard.ts`) ya no tienen el string `'orderflow-secret-key-change-in-production'` como fallback:
- `JwtAuthGuard` y `auth.module.ts` usan `configService.getOrThrow<string>('JWT_SECRET')` → la app no arranca sin la env var.
- `api-key.guard.ts` reemplazó el default por un `throw` explícito tanto para `JWT_SECRET` como `MASTER_API_KEY`.
- `packages/auth-shared` (consumido por los 12 microservicios standalone) también fue corregido — ya no reproduce el default hardcodeado que se había detectado expandiéndose ahí.
- `SecretsValidationService` ahora **lanza una excepción real** (`FATAL: ...`) en `onModuleInit()` si falta o es débil un secreto crítico, y su lista `WEAK_SECRET_PATTERNS` **ya incluye** ambos strings hardcodeados originales — antes no los detectaba.

Esta parte del `PLAN_CIERRE_TENANT_ISOLATION.md` (Fase 0) quedó efectivamente cerrada.

### 2.2 🆕 Hallazgo nuevo — `JWT_REFRESH_SECRET` sigue hardcodeado
`backend/auth/auth.service.ts` (líneas 371 y 480) sigue teniendo:
```
this.configService.get<string>('JWT_REFRESH_SECRET', 'orderflow-refresh-secret-change-in-production')
```
`JWT_REFRESH_SECRET` sí figura en `CRITICAL_SECRETS` de `SecretsValidationService`, así que si la env var falta directamente, la app no arranca. Pero **el string por defecto no está en `WEAK_SECRET_PATTERNS`**: si alguien configura la env var con exactamente ese valor (algo plausible, porque es el mismo patrón de nombre que ya vieron fallar con `JWT_SECRET`), el chequeo de secretos débiles no lo detecta y el token de refresh queda firmado con un secreto público conocido. Es el mismo bug que ya se corrigió para `JWT_SECRET`, pero no se generalizó al secreto hermano.

**Recomendación:** aplicar el mismo `getOrThrow` (sin default) a `JWT_REFRESH_SECRET` en los dos puntos de `auth.service.ts`, y verificar que no haya otros secretos con el mismo patrón de nombre `*_SECRET`/`*_KEY` en el repo.

### 2.3 🔴 Sin avance — Aislamiento multi-tenant (la vulnerabilidad de fondo)
Tercera auditoría consecutiva (v1.26.00 → v1.27.10 → v1.28.0) sin cambios en la causa raíz:
- `backend/common/tenant-prisma.decorator.ts` sigue resolviendo `request.tenantPrisma || request.app.get('PrismaService')`.
- Solo `api-key.guard.ts` (rutas de integración externa) setea `request.tenantPrisma`.
- `JwtAuthGuard` (que protege POS, admin y KDS — el tráfico de sesión normal, la inmensa mayoría del uso real) **nunca lo setea**, por lo que todo ese tráfico sigue cayendo al cliente Prisma compartido, tenga o no el tenant una DB dedicada.
- El conteo de superficie empeoró levemente: **67 archivos con `this.prisma`** (antes 61) contra los mismos **5 archivos con `@TenantPrisma()`** (`quotations`, `orders`, `customers`, `products`, `modifier-groups` controllers). El crecimiento viene del desarrollo nuevo (OmniMessaging Hub, admin tokens) hecho siguiendo el patrón viejo, no del patrón correcto.
- No existe `TenantResolutionService`, no existe `env-validation.ts`, no hay regla de lint ni `architecture.spec.ts` — ninguna de las Fases 1 a 3 del `PLAN_CIERRE_TENANT_ISOLATION.md` se ejecutó, pese a que el plan fue copiado a `docs/plans/` hace dos versiones.

Esto sigue siendo, en la práctica, la vulnerabilidad más grave del sistema: cualquier tenant con base de datos dedicada (aislamiento "premium") en realidad sigue compartiendo el pool de conexión y, potencialmente, la vista de datos con el resto de los tenants para casi toda su operación diaria.

### 2.4 🔴 Sin avance — Endpoint de `hard-delete` de Tenant
`DELETE /:id/hard-delete` (`backend/tenants/tenants.controller.ts`) sigue vivo, exige `isSuperAdmin`, limpia DNS de Cloudflare, y **llama directo a `prisma.tenant.delete()`** — sin pasar por soft-delete ni por la ventana de retención de 30 días. Es funcionalmente el mismo botón de autodestrucción original (bypasea la protección #2), solo que ahora con un guard de rol.

Nota importante: `docs/plans/PLAN_BLINDAJE_ORDERFLOW.md` sigue documentando este punto como **"✅ CERRADO"** (Fase 3), citando que "exige `isSuperAdmin` y limpia DNS antes del `prisma.tenant.delete()` físico" como si eso fuera suficiente. El documento también referencia rutas `backend/src/tenants/...` que ya no existen (el backend está aplanado desde hace dos versiones) — es el mismo patrón de documentación desactualizada/optimista detectado en auditorías anteriores.

### 2.5 🟡 Riesgo bajo, sin cambios — `accept-data-loss` en provisioning manual
`scripts/provision-orderflow-company.sh` (línea 110) y `infra/docker-compose.yml` (contenedor de desarrollo, sin sufijo `.prod`) siguen usando `prisma db push --accept-data-loss` sin verificar que la base esté vacía antes de correrlo. No están en el path automático de despliegue a producción (`entrypoint.sh` y `deploy-production.sh` sí usan `migrate deploy`), por lo que el riesgo es bajo — pero sigue siendo un botón manual sin red de seguridad para cuando se aprovisiona un tenant con DB dedicada.

### 2.6 🟡 Hallazgo menor — posible colisión de puerto
La documentación de arquitectura de OmniLedger (fuera de este repo) lo registra en el puerto `:3027`. En este repo, `services/omnibi-standalone/docker-compose.yml` también expone `3027:3027`. Vale la pena confirmar contra el registro real de despliegue si ambos coexisten en el mismo host — si es así, hay colisión de puerto pendiente de resolver antes de desplegar ambos juntos.

---

## 3. Recomendación de secuenciación

El patrón se repite en tres auditorías: el plan de cierre se documenta, se copia al repo, pero no se ejecuta, mientras el desarrollo de producto (con buena velocidad — OmniMessaging Hub completo en este período) sigue construyendo sobre `this.prisma`. Antes de sumar un módulo nuevo de alto valor de datos (ver evaluación de OmniRealState), conviene al menos cerrar la **Fase 1** del `PLAN_CIERRE_TENANT_ISOLATION.md` (que `JwtAuthGuard` también resuelva y setee `tenantPrisma`, generalizando el patrón ya validado en `products`) — es barato, ya está diseñado, y evita que cada módulo nuevo herede la misma falla de origen.
