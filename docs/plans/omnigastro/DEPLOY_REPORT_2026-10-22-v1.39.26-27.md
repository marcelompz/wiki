# Reporte de Despliegue — v1.39.26 + v1.39.27 · Provecchio (cierre del plan)

> **Target:** `provecchio.com` (producción) · **Host:** `192.168.69.240` (`dimora-server`) · **Path remoto:** `/srv/orderflow`
> **Fecha:** 2026-10-22 · **Inicio:** 07:10 (backup) → **Fin:** 07:52 (QA post-deploy) · **Duración total:** ~42 min
> **Versiones desplegadas:** **v1.39.26** (FEAT-194 bandera de Mozo) + **v1.39.27** (FEAT-197 Capas 3 y 3b: historial en servidor)
> **Producción anterior:** v1.39.25 · **Commits:** `141fa9dd` (v1.39.26) y `73d783d2` (v1.39.27) · **Tags:** `v1.39.26`, `v1.39.27`
> **Migración aplicada:** `20261022120000_add_can_use_mozo_pos_to_employees` (39 migraciones, 0 pendientes)
> **Autorización:** *"avanza progresivamente con los demás puntos hasta cerrar el plan"*

---

## 1. Resumen ejecutivo

Se desplegó en producción el **cierre del plan maestro de historial de pedidos**, en dos releases:

| Release | Feature | Qué aporta en producción |
|---|---|---|
| **v1.39.26** | **FEAT-194 — Bandera de Mozo** | Solo el personal habilitado puede iniciar sesión en el POS de Mozo. Nueva columna `Employee.can_use_mozo_pos` (con backfill de los mozos de sala), `GET /api/v1/users/mozo-staff`, `verify-pin` con `scope:'mozo'`, sección "Empleados Mozo" en `/admin/settings → OmniGastro` y switch en el formulario de empleado |
| **v1.39.27** | **FEAT-197 (Capas 3 y 3b)** | El mozo y el cajero **no pierden el historial** al cambiar de dispositivo: `GET /api/v1/orders/guest/history` con imputación del mozo (`claimedById` / `waiterId`), vista "✅ Atendidos" en el panel de mozos, `GET /api/v1/pos-sessions` y card "🗂️ Historial de Turnos" con Reporte Z en el panel de caja |

**Estado del plan maestro:** ✅ **CERRADO** — F1 ✅ (v1.39.25), F2 ✅ (v1.39.26), F4 ✅ y F4b ✅ (v1.39.27).
La **Capa 2 (F3, código corto)** queda documentada como **opcional y no implementada** (decisión D5: el
comensal acepta que su historial viva en la memoria del dispositivo).

---

## 2. Protocolo aplicado (AGENTS.md §3.1.1)

| # | Paso | Resultado | Evidencia |
|---|---|---|---|
| 1 | Verificación del repo local | ✅ | `main` = `73d783d2` = `origin/main`; working tree limpio |
| 2 | **Backup de producción** | ✅ | `backups/pre_deploy_provecchio_20261022_071045.sql` + `_uploads.tar.gz` + `rollback-provecchio-20261022_071045.env` |
| 3 | **Restore en localhost** | ✅ | 168 tablas, 1 tenant, 6 empleados, 4 cajas; uploads restaurados |
| 4 | Verificación de fidelidad | ✅ | health local `1.39.26 ok`; datos persistentes |
| 5 | **Pre-deploy diagnostic** | ✅ | sin fallos críticos (11 checks con warnings preexistentes) |
| 6 | **Deploy** | ✅ | rsync + build + `prisma migrate deploy` (39 migraciones, 0 pendientes) + health checks + QA |
| 7 | **QA post-deploy** | ✅ | catálogo, dominio, auth/DB y **8 rutas admin** en verde |
| 8 | Limpieza y rotación | ✅ | imágenes, caché, contenedores detenidos y logs purgados; backups rotados |

---

## 3. Detalle técnico

| Componente | Resultado |
|---|---|
| Migración | `20261022120000_add_can_use_mozo_pos_to_employees` aplicada (**39 migraciones, 0 pendientes**) |
| Backfill en producción | 1 empleado habilitado (`Ivan Castillo` · Mozo · ACTIVE); los 4 cajeros y el cocinero siguen en `false` |
| Contenedores | backend, frontend, odoo-adapter, sync, omnibi → **healthy**; db, redis y réplica de BD activos |
| Traefik | v3.4 activo y configuración recargada |
| Health público | `https://provecchio.com/api/v1/health` → **`1.39.27 ok`** · frontend HTTP 200 |
| Bundle de producción | `gastro-JSSPk9qT.js` (vista "Atendidos") y `gastro-cashier-BpyXEqC1.js` ("Historial de Turnos") |
| Backend de producción | `orders.controller.js` y `pos-sessions.controller.js` incluyen `guestHistory` y `listSessions` |
| Endpoints nuevos en prod | `/api/v1/users/mozo-staff` → 1 (el Mozo) · `/api/v1/orders/guest/history` → 3 pedidos atendidos · `/api/v1/pos-sessions` → 2 turnos (POS/2026/0001 y 0002, CLOSED) |
| Rollback | `deploy-artifacts/rollback-provecchio-20261022_071345.env` |

---

## 4. QA post-deploy

```
✅ [QA SUCCESS] Catálogo público verificado sin imágenes rotas (4 imágenes)
✅ [QA SUCCESS] Dominio https://provecchio.com sin errores JS en consola
✅ [QA SUCCESS] Autenticación admin y consultas DB sin HTTP 500
✅ [QA SUCCESS] 8 rutas admin verificadas:
   /admin/products · /admin/customers · /admin/bookings · /admin/loyalty
   /admin/homepage-builder · /admin/social-catalog · /admin/gastro/kds-stations
   /admin/follow-up-rules
✅ Endpoint https://provecchio.com/api/v1/health → HTTP 200
```

---

## 5. Incidencias

| # | Incidencia | Resolución | Impacto |
|---|---|---|---|
| 1 | `❌ Backend health check failed after 60s` (check por SSH) → fallback por HTTP público OK | El check interno por SSH no conecta; el health real responde `1.39.27 ok` | ✅ Ninguno (comportamiento idéntico en los tres deploys) |
| 2 | `Verificando healthcheck explícito en dimoraserver1 → Connection refused` | Ese host es el **salto**, no el servidor final: no sirve el puerto 3010 | ✅ Ninguno |
| 3 | `[WARN] Could not parse migration status` | Parser del script con la salida de `prisma migrate status` | ✅ Ninguno: `migrate deploy` aplicó 0 pendientes |
| 4 | Disco del servidor en 81% durante el build (3,9 GB libres) | El script purga imágenes y caché al final → 5,2 GB libres tras el deploy | ✅ Ninguno, pero **vigilar**: con dos builds consecutivos el pico de disco se acerca al límite |

> La estación siguió fuera de la LAN `192.168.69.x`: el `ProxyJump` vía `dimoraserver2` configurado en
> `~/.ssh/config` permitió el acceso por SSH, scp y rsync sin cambios en los scripts.

---

## 6. Validación funcional de las features en producción

| Verificación | Resultado |
|---|---|
| Bandera de Mozo aplicada | ✅ `can_use_mozo_pos` existe en la BD de producción; solo el Mozo de sala quedó habilitado |
| `GET /api/v1/users/mozo-staff` | ✅ 1 empleado (Ivan Castillo, Mozo, `canUseMozoPos: true`) |
| `GET /api/v1/orders/guest/history` | ✅ 3 pedidos atendidos devueltos con su mozo y su `closedAt` |
| `GET /api/v1/pos-sessions` | ✅ 2 turnos (POS/2026/0001 y POS/2026/0002, ambos CLOSED) con su cajero |
| Bundle con las vistas nuevas | ✅ `gastro-JSSPk9qT.js` y `gastro-cashier-BpyXEqC1.js` |
| Riesgo de regresión en el cobro | ✅ El tenant tiene `waiterCanCollectPayment: false` → la UI no ofrece "Cobrar en mesa" y el fix de `paidAt` no introduce errores 400 |

> La validación E2E automatizada de ambas features se ejecutó **en localhost** contra el mismo build y
> los mismos datos restaurados de producción (suite completa: 86 passed / 5 skipped / 0 failed),
> conforme al protocolo "deploy-to-local-first" (§3.1.1).

---

## 7. Verificación manual pendiente para el cliente

| # | Qué comprobar | Dónde |
|---|---|---|
| 1 | El mozo (Ivan) inicia sesión con su PIN y ve el panel | `https://provecchio.com/admin/gastro/mozos` |
| 2 | Un cajero **no** aparece en el selector de mozos y su PIN es rechazado con el mensaje explícito | idem |
| 3 | La bandera se puede activar/desactivar y el cambio surte efecto en la siguiente carga | `https://provecchio.com/admin/settings` → OmniGastro → "Empleados Mozo" |
| 4 | Al cerrar un pedido, el mozo lo ve en "✅ Atendidos" y lo recupera recargando o desde otro dispositivo | `https://provecchio.com/admin/gastro` |
| 5 | El cajero encuentra los turnos cerrados y su Reporte Z | `https://provecchio.com/admin/gastro/cashier` → "🗂️ Historial de Turnos" |

---

## 8. Cierre del plan

| Fase | Versión | Estado |
|---|---|---|
| F1 · Capa 1 (comensal, memoria del dispositivo) | v1.39.25 | ✅ en producción desde el 2026-10-22 05:32 |
| F2 · FEAT-194 (bandera de Mozo) | v1.39.26 | ✅ **este deploy** |
| F4 · Capa 3 (mozo, en servidor) | v1.39.27 | ✅ **este deploy** |
| F4b · Capa 3b (cajero, turnos de caja) | v1.39.27 | ✅ **este deploy** |
| F3 · Capa 2 (código corto del comensal) | — | ⚪ **opcional, no implementada** (D5) — se activa solo si el comensal lo pide |
