# Reporte de Despliegue — v1.39.25 · Provecchio

> **Target:** `provecchio.com` (producción) · **Host:** `192.168.69.240` (`dimora-server`) · **Path remoto:** `/srv/orderflow`
> **Fecha:** 2026-10-22 · **Inicio:** 05:01 (backup) → **Fin:** 05:32 (QA post-deploy) · **Duración total:** ~31 min
> **Versión desplegada:** **v1.39.25** (producción anterior: v1.39.24)
> **Commit desplegado:** `52d6a4af` → commit remoto de sync `ea0b53d2` · **Tag:** `v1.39.25`
> **Autorizado por:** el usuario (autorización explícita: *"despliega en produccion y crea un reporte del despliegue"*)
> **Auditoría funcional:** [`auditoria-historial-pedidos-f1-2026-10-22.md`](./auditoria-historial-pedidos-f1-2026-10-22.md)

---

## 1. Resumen ejecutivo

Se desplegó en producción la release **v1.39.25** de la vertical OmniGastro, que implementa la
**Fase 1 del plan maestro de historial de pedidos** (FEAT-197) y el **fix del `paidAt`** (FEAT-197-d):

| # | Entregable | Efecto en producción |
|---|---|---|
| 1 | Store local del comensal (`public-orders-store`, clave `gaia-spa-orders`) + botón 🕘 **"Mis pedidos"** en el header del catálogo con contador y drawer (mesa, estado, total, refresco cada 10 s) | El comensal ya **no pierde su pedido** al recargar, navegar o volver al menú; el carrito sí se vacía |
| 2 | Privacidad D3 | El historial es **local del dispositivo**: quien escanea el QR de la mesa **no accede** al pedido de nadie (no existe endpoint público que liste pedidos por mesa) |
| 3 | FEAT-197-d — `normalizeOrderCloseMode` en `POST /api/v1/orders/:id/close` | El cierre con cobro en mesa o pago digital **sí** registra `paidAt`; antes el modo caía siempre en `WITHOUT_PAYMENT` y `paidAt` quedaba en `null` |

**Resultado:** ✅ desplegado y verificado · sin migraciones nuevas · sin regresiones en las 8 rutas admin ·
QA post-deploy en verde.

---

## 2. Protocolo aplicado (AGENTS.md §3.1.1)

| # | Paso | Resultado | Evidencia |
|---|---|---|---|
| 1 | Verificación del repo local | ✅ | `main` = `52d6a4af` = `origin/main`; working tree limpio |
| 2 | **Backup de producción** | ✅ | `backups/pre_deploy_provecchio_20261022_050132.sql` (2.216.632 B) · `_uploads.tar.gz` (28.893.820 B) · `rollback-provecchio-20261022_050132.env` · `pre_deploy_provecchio_20261022_050132_backup_info.json` |
| 3 | **Restore en localhost** | ✅ | `scripts/restore-provecchio.sh` → 168 tablas, 1 tenant, 6 empleados, 4 cajas; uploads restaurados al bind-mount real |
| 4 | Verificación de fidelidad y persistencia | ✅ | health local `1.39.25 ok`; datos persisten tras reinicio de `db` y `backend` |
| 5 | **Pre-deploy diagnostic** | ✅ | `scripts/pre-deploy-diagnostic.sh provecchio` → **sin fallos críticos** (11 checks con warnings preexistentes) |
| 6 | **Deploy** | ✅ | `scripts/deploy-production.sh provecchio` → rsync + build Docker + migraciones + health checks + QA |
| 7 | **QA post-deploy** | ✅ | `scripts/qa_e2e_check.py` (8 rutas admin + catálogo + dominio + auth/DB) |
| 8 | Limpieza y rotación | ✅ | imágenes viejas, caché de build, contenedores detenidos y logs purgados; backups rotados (3 copias) |

---

## 3. Detalle técnico del despliegue

| Componente | Resultado |
|---|---|
| Migraciones Prisma | **38 migraciones, 0 pendientes** (la F1 no añade migración: no toca el schema) |
| Contenedores | `orderflow_backend`, `orderflow_frontend`, `orderflow_odoo_adapter`, `orderflow_sync_standalone`, `orderflow_omnibi_standalone` → **healthy**; `orderflow_db` y `orderflow_redis` healthy; réplica de BD activa |
| Traefik | v3.4 activo y configuración recargada (`docker kill -s HUP traefik`) |
| Health público | `https://provecchio.com/api/v1/health` → **`1.39.25 ok`** · frontend HTTP 200 |
| Bundle de producción | `index-D9ZVaT1F.js` contiene `Ver mis pedidos` (build fresco, sin caché stale) |
| Backend de producción | `/app/dist/orders/order-close-mode.util.js` presente y referenciado por `orders.controller.js` |
| Endpoints autenticados | `/api/v1/tables`, `/api/v1/orders`, `/api/v1/cash-registers`, `/api/v1/hr/employees`, `/api/v1/pos-sessions/active` → **200** con JWT de admin |
| Commit remoto | `ea0b53d2` *deploy: sync local changes 20261022_051149* |
| Rollback | `deploy-artifacts/rollback-provecchio-20261022_050406.env` |

---

## 4. QA post-deploy (detalle)

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

## 5. Incidencias durante el despliegue

| # | Incidencia | Diagnóstico | Resolución | Impacto |
|---|---|---|---|---|
| 1 | `ssh root@192.168.69.240` → **Connection timed out** (la estación quedó en la red `192.168.0.x` y no alcanzaba la LAN `192.168.69.x`) | La producción respondía por HTTPS con normalidad → el servidor estaba vivo; el problema era el **origen** de la conexión | Se añadió `ProxyJump dimoraserver2` (`38.52.135.227:2021`) en `~/.ssh/config` para `dimoraserverlocal` y para la IP literal `192.168.69.240` (los scripts usan la IP) | ✅ Ninguno: `ssh`, `scp` y `rsync` del script pasaron a funcionar por el salto |
| 2 | `❌ Backend health check failed after 60s` (check por SSH) → `[OK] Backend health check passed via public HTTP` | El check interno por SSH no connects; el health real por `https://provecchio.com/api/v1/health` responde `1.39.25 ok` | Fallback automático del propio script (comportamiento idéntico al deploy de v1.39.21) | ✅ Ninguno |
| 3 | `Verificando healthcheck explícito en dimoraserver1 (38.52.135.227:2021) → Connection refused` | Ese host es el **salto**, no el servidor final: no sirve el puerto 3010 | Esperado; la verificación real se hace contra `provecchio.com` | ✅ Ninguno |
| 4 | `[WARN] Could not parse migration status` | Parser del script con la salida de `prisma migrate status` | Sin efecto: `prisma migrate deploy` aplicó **0 pendientes** | ✅ Ninguno |

---

## 6. Validación funcional de la feature en producción

| Verificación | Resultado |
|---|---|
| El bundle servido contiene el botón 🕘 "Mis pedidos" | ✅ `index-D9ZVaT1F.js` |
| El backend servido contiene el normalizador del modo de cierre | ✅ `order-close-mode.util.js` + referencia en `orders.controller.js` |
| Login de admin y endpoints core | ✅ 200 en `tables`, `orders`, `cash-registers`, `hr/employees`, `pos-sessions/active` |
| Riesgo de regresión en el cobro en mesa | ✅ Verificado **previo**: el tenant Provecchio tiene `waiterCanCollectPayment: false` → la UI no ofrece "Cobrar en mesa", así que el nuevo 400 del service (por cobro en mesa deshabilitado) no se dispara |
| Comportamiento nuevo esperado | "Pago digital" y "Cerrar sin cobrar" ahora se registran con su `paidAt` / `closedWithoutPayment` correctos |

> La validación E2E automatizada de esta feature se ejecutó **en localhost** (79 passed / 5 skipped / 0 failed)
> contra el mismo build y los mismos datos restaurados de producción, conforme al protocolo
> "deploy-to-local-first" (§3.1.1).

---

## 7. Rollback

| Artefacto | Ruta |
|---|---|
| Variables de entorno del rollback | `deploy-artifacts/rollback-provecchio-20261022_050406.env` |
| Backup de la base de datos | `backups/pre_deploy_provecchio_20261022_050132.sql` |
| Backup del file store | `backups/pre_deploy_provecchio_20261022_050132_uploads.tar.gz` |
| Script | `scripts/rollback-deploy.sh provecchio` |

---

## 8. Estado tras el despliegue

| Ámbito | Versión / estado |
|---|---|
| Producción (`provecchio.com`) | **v1.39.25** ✅ |
| Localhost (`provecchio.local`) | **v1.39.25** ✅ (misma base restaurada de producción) |
| FEAT-197 | F1 ✅ (v1.39.25) · F4 (mozo) y F4b (cajero) pendientes · F3 (código corto) opcional |
| FEAT-194 (bandera de Mozo) | ⏳ pendiente → F2 (v1.39.26) |
| CI de GitHub Actions | ⛔ sin runners (spending limit) — ver [troubleshooting #185](../../troubleshooting/185-github-actions-spending-limit-no-runners.md) |

**Decisiones que siguen abiertas (cliente):** D1 backfill de la bandera de Mozo · D5 ¿implementar la Capa 2
(código corto)? · D6 ¿Capa 3b en fase propia o integrada en la F4?
