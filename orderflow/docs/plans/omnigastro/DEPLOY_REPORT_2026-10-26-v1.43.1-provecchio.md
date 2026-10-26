# DEPLOY REPORT — v1.43.1 en provecchio.com (deploy en segundo plano) + addon 14.0.1.6.0 en Odoo 14

> **Fecha:** 2026-10-26 · **Deploy de OrderFlow:** ejecutado por el cliente en segundo plano sobre `192.168.69.240` (`dimoraserverlocal`)
> **Deploy del addon POS:** ejecutado por agente (auditoría FEAT-207) sobre `192.168.69.246` · **Referencias:** FEAT-207, FEAT-153/185/201/205, troubleshooting #197/#198/#201

---

## 1. Deploy OrderFlow — provecchio.com (192.168.69.240)

### Fuente / versión

| Dato | Valor |
| --- | --- |
| Repo del servidor | `/srv/orderflow` · `f34ef5db` "deploy: sync local changes 20261026_095646" |
| Release | **v1.43.1** vía **PR #24 → `main`** (commit `5f136f81`, incluye `docs/` OmniGastro limpia sin tokens · ref #201) |
| `VERSION` / `backend/package.json` | **1.43.1** |
| Tag | ⚠️ `v1.43*` **no existe** en el repositorio — pendiente crear/pushear |

### Ciclo ejecutado (verificado)

| Etapa | Resultado |
| --- | --- |
| Merge PR #24 → `main` | ✅ Commit `5f136f81` (incluye última doc limpia de OmniGastro.md sin tokens) |
| Diagnóstico pre-deploy (`pre-deploy-diagnostic.sh provecchio`) | ✅ env vars OK, redes OK, compose OK — solo warnings menores |
| Checklist Traefik §9.1 | ✅ routers `provecchio-api`/`provecchio-frontend` (HTTPS + letsencrypt), targets `orderflow_backend:3010` / `orderflow_frontend:80` correctos — no hubo rutas nuevas que syncar |
| Backups pre-deploy | ✅ rollback env snapshot `rollback-provecchio-20261026_094908.env` + uploads + DB |
| Build en servidor | ✅ frontend `tsc && vite build` (provecchio), backend `tsc -p tsconfig.prod.json` con paths completos + standalone rebuild |
| Migraciones Prisma | ✅ **41 aplicadas, 0 pendientes** |
| QA automático post-deploy | ✅ sanidad auth/DB sin 500, rutas admin verificadas (`/admin/products`, `/admin/gastro/kds-stations`, etc.) |
| Limpieza | ✅ imágenes viejas, build cache, backups rotados (3 copias) |

### Infraestructura (verificada en caliente)

- Contenedores recreados hace ~8 min y **todos healthy**: `orderflow_backend`, `orderflow_frontend`, `orderflow_odoo_adapter`, `orderflow_omnibi_standalone`, `orderflow_sync_standalone`, `orderflow_redis`, `orderflow_db`, `orderflow-database-replica-prod`.
- Imágenes reconstruidas en la ventana: `orderflow-odoo_adapter` (26 min), `orderflow-omnibi_standalone`/`orderflow-sync_standalone` (16 min), `orderflow-backend` (10 min).

### Smoke post-deploy (ejecutado desde provecchio.com)

| Check | Resultado |
| --- | --- |
| `GET /api/v1/health` | ✅ `v1.43.1`, `database: ok`, `odoo_adapter: ok` |
| `POST /auth/login` (SuperAdmin) | ✅ JWT emitido con `isSuperAdmin: true` — fix #201 **intacto** tras el deploy |
| `GET /api/v1/integrations` | ✅ HTTP 200 (FEAT-188-ext operativo) |
| `GET /login` | ✅ HTTP 200 |

### Estado del conector POS tras este deploy

- `odoo-adapter` (.240) incluye el mapeo `POS_ORDER_LOCKED` → **409 solo para `/sync_bill`** (herencia FEAT-205 de `main`, `index.js:1044`). El mapeo para `/sync_table_order` llega con el próximo deploy (v1.43.2 / merge de la rama del sprint).
- El backend v1.43.1 llama `/api/omniflow/sync_bill` (FEAT-205) — ese endpoint **no existía** en el addon que corría en .246 antes de hoy; tras el deploy del addon (§2) la ruta quedó operativa.

## 2. Deploy addon `pos_omniflow_sync` 14.0.1.6.0 — Odoo 14 (192.168.69.246)

Ejecutado con `scripts/deploy-odoo-addon.sh --apply` (sucursal canon `odoo-adapter/odoo-addons/pos_omniflow_sync`, branch `fix/gastro-pos-omniflow-sync-hardening`).

| Paso | Resultado |
| --- | --- |
| Backup | `/opt/odoo/backups/pos_omniflow_sync_20261026_102101.tar.gz` + `odoo.conf.bak` |
| py_compile de los 6 ficheros | OK |
| Copia scp + `docker restart odoo_web_8081` | OK, ERP 200 al 2do intento |
| **Upgrade de módulo** (`odoo:14.0 -d prod -u pos_omniflow_sync --stop-after-init`, one-off en red `odoo_default`) | OK — `ir_module_module`: **`14.0.1.6.0 \| installed`** |
| Columna `omniflow_bill_ref` en `pos_order` | ✅ creada (no existía: prod venía de 14.0.1.3.0 y el campo es de 1.4.0/FEAT-205) |
| Sesiones POS abiertas | Intactas (3, sin corte de caja) |
| Errores post-restart (`docker logs`, 3 min) | Ninguno |

### Lecciones registradas (ni troubleshooting ni script traían el caso)

1. `deploy-odoo-addon.sh` **no ejecuta el upgrade de módulo**: copia código y reinicia, pero las columnas nuevas (p. ej. campos nuevos en `models/`) no se crean sin `-u`. Añadir paso opcional `--upgrade` al script (gap propuesto en FEAT-207).
2. El one-off de upgrade exige `-d <db>` explícito: el `odoo.conf` de .246 no trae `db_name`, y sin `-d` el proceso sale sin cargar registry (se verificó que no hizo nada en la primera corrida).

## 3. Coherencia entre ambos despliegues

- Protocolo compatible en ambos sentidos (el backend siempre envía `order_uuid`; el addon 1.6.0 es retrocompatible con backend 1.43.1).
- Cadena completa habilitada en este deploy: `sync_table_order` + `transfer_table_order` + **`sync_bill`** (no operativo antes de hoy en .246) + guard de idempotencia `ORDER_UUID_REQUIRED` / `POS_ORDER_LOCKED`.

## 4. Pendientes

| # | Ítem | Toque prod |
| --- | --- | --- |
| 1 | Tag `v1.43.1` (sobre el release `5f136f81` / sync del deploy) + push de tags | ninguno |
| 2 | Sincronizar Wiki `/opt/wiki/orderflow/` (ROADMAP/CHANGELOG/docs del conector + este reporte + auditoría FEAT-207) | ninguno |
| 3 | Merge `fix/gastro-pos-omniflow-sync-hardening` → `main` y push → activa hardening 1.43.2 (mapping 409 en `sync_table_order` + guardas del addon) en el próximo deploy/rebuild de `odoo_adapter` | futuro deploy |
| 4 | Contract test `test-pos-order-contract.js` contra .246 (requiere `ODOO_PASSWORD`) | ninguno |
| 5 | Rotación `SuperAdmin123!` (#201) | ventana acordada |
| 6 | Revisar dueño de `AGENTS.md` (la sección "Update Traefik Routes" ↔ "Newman" se alternó 3 veces en sesión — revisar quién lo edita en paralelo para no perder secciones) | repo local |
