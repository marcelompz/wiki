# Deploy Report — Hetzner `pesallaccia.com` · 1.36.5 → 1.40.2 (2026-10-22)

> **Host:** `hetzner-orderflow` (`root@178.105.226.175`, hostname `axon-workspace`) · `/srv/orderflow`
> **Resultado:** ✅ `🎉 Production Deploy Complete` — backend/frontend healthy, health `1.40.2`, QA E2E post-deploy OK.

---

## 1. Punto de partida (diagnóstico)

| Ítem | Valor |
|---|---|
| Versión desplegada | `1.36.5` (sitio en **502** desde un deploy previo fallido) |
| Tablas en la DB | **73** de 168 esperadas |
| Filas en datos de negocio | **0** (0 tenants, 0 productos, 0 pedidos, 0 mesas, 0 clientes) |
| Migraciones | 34 aplicadas + **2 fallidas** (`20260920210000_sync_hr_schema` rolled back, `20260927193000_kds_multi_station_printing` bloqueante) |
| Delta contra `schema.prisma` 1.40.2 | 3.771 líneas (95 `CREATE TABLE`, 89 `DROP COLUMN`, 12 `ADD COLUMN`) |
| Disco | 5.5 G libres, build cache 16.86 G con 0 B reclamables |

**Conclusión:** el historial de migraciones no permite reconstruir la base (troubleshooting #192) y la DB
estaba ~4 versiones atrás. Con **0 filas**, se aprobó un **baseline de esquema** en lugar de reparar el
historial.

## 2. Trabajo ejecutado

1. **Backup previo** (schema + uploads) en `/srv/orderflow/backups/pre_upgrade_hetzner_20261022_195347.*`
   y copia local en `backups/`.
2. **Baseline de esquema:**
   - `DROP SCHEMA public CASCADE` + `CREATE SCHEMA public` (DB sin datos).
   - `prisma db push --skip-generate` → **165 tablas** creadas desde `schema.prisma` de 1.40.2 (261 s).
   - `prisma migrate resolve --applied` para las **39** migraciones del repo → `_prisma_migrations`
     consistente; `prisma migrate status` → `Database schema is up to date!`.
3. **Limpieza de disco:** `docker image prune -af` liberó **3.235 GB** (≥ 5 G requeridos por el
   diagnóstico). Ver troubleshooting #194.
4. **Fix del build de `production`:** `Dockerfile.prod` hace `COPY VERSION ./` pero el contexto es
   `./backend`; el script ahora copia `VERSION` a `backend/VERSION` en el servidor antes del build
   (commit `fc242ffb`, troubleshooting #193).
5. **Deploy:** `./scripts/deploy-production.sh production` → build backend/frontend/adapter, `up -d`,
   migraciones, health checks, Traefik, QA Playwright post-deploy.

## 3. Verificación final

| Check | Resultado |
|---|---|
| `GET https://pesallaccia.com/api/v1/health` | `200` · `{"version":"1.40.2", services:{database:ok, odoo_adapter:ok}}` |
| Frontend | `200` |
| Contenedores | `backend`, `frontend`, `database`, `redis`, `odoo_adapter`, `loki`, `grafana`, `promtail`, `tempo`, `alertmanager` → **healthy** |
| Migraciones | 40 encontradas · `No pending migrations to apply` |
| Tablas | 165 |
| Traefik | `orderflow-prod-frontend` → `orderflow-frontend-prod:80`, `orderflow-prod-backend` → `orderflow-backend-prod:3010` (correcto) |
| QA E2E post-deploy | catálogo público, dominio sin errores JS, `/admin` + 8 módulos, auth/DB sin 500 → ✅ |
| Endpoints públicos cURL | `200 OK` |

## 4. Matiz importante: pre-release de FEAT-201 en el host

El `rsync` del deploy capturó el **working tree** en el momento en que el WIP de FEAT-201 había sido
restaurado (`git stash pop`), de modo que el host quedó con:

- Backend: `dist/src/tables/tables.controller.js` **incluye** `odoo-provision/*`.
- Frontend: `assets/gastro-tables-*.js` incluye el botón “Sincronizar con Odoo”.
- Adapter: `provision_floor` / `provision_tables` presentes.
- DB: migración `20261022190000_restaurant_floors_odoo_floor_id` aplicada (columna `odoo_floor_id`).

Pero `VERSION` seguía en **1.40.2** (el bump a 1.41.0 se hizo después del rsync), por lo que la
versión reportada **no refleja** el código desplegado. La DB del host tiene **0 tenants**, por lo que
la feature queda inerte (no hay tenant para operarla).

**Resolución:** el deploy de **v1.41.0** (una vez validado con el protocolo §3.1.1) reemplaza este
estado y alinea código ↔ versión. No se re-desplegó 1.40.2 para evitar otra ventana de 502 con el
build completo (disco al 88 %).

## 5. Lecciones / pendientes

- El deploy sincroniza el **working tree**: antes de lanzarlo hay que `git stash` **y confirmar** que
  el árbol quedó limpio, no sólo lanzar el script.
- El deploy elimina los contenedores **antes** del build; si el build falla, el sitio queda en 502.
  Mejora pendiente: construir primero y recrear contenedores después.
- Recrear el builder de BuildKit para recuperar los 16.86 GB de caché (troubleshooting #194).
- Reparar la cadena de migraciones para que `migrate deploy` funcione en una base vacía
  (troubleshooting #192) — proyecto aparte.

## 6. Rollback disponible

- Env: `deploy-artifacts/rollback-production-20261022_201858.env`.
- DB: `backups/pre_upgrade_hetzner_20261022_195347.sql` (schema-only, 0 filas) + backup pre-deploy
  remoto `pre_deploy_production_20261022_201858.sql`.
