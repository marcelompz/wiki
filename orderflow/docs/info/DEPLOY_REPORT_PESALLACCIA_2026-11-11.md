# Informe de Despliegue — `pesallaccia.com` v1.40.2 → v1.46.3

> **Fecha:** 2026-11-11
> **Entorno:** Producción principal (`pesallaccia.com`)
> **Host:** Hetzner `178.105.226.175` (`axon-workspace`) — target `production`
> **Directorio remoto:** `/srv/orderflow`
> **Estado:** ✅ Completado y verificado
> **Autorización:** explícita del usuario (AGENTS.md §3, regla 9)

---

## 1. Resumen ejecutivo

| Ítem | Valor |
|---|---|
| Versión desplegada | **1.46.3** (desde 1.40.2) |
| Commits incluidos | **185** |
| Migraciones Prisma aplicadas | **3** (43 en total, 0 fallidas) |
| Duración del deploy | ~10 minutos (19:13:47 → 19:23:58 -03) |
| Commit local de origen | `a791209c` (`main`) |
| Commit del snapshot remoto | `482fa0d4` |
| Health final | `{"version":"1.46.3","status":"ok"}` |
| Contenedores | 7/7 healthy |
| E2E QA post-deploy | Catálogo, dominio y 8 rutas de admin sin errores |
| Rollback disponible | Sí (env + backup DB/uploads) |

**Resultado:** el salto de 6 releases (1.40.2 → 1.46.3) se aplicó sin downtime posterior al deploy y sin pérdida de datos. Se ejecutó el protocolo obligatorio de diagnóstico (§3.2) y deploy-to-local-first (§3.1.1) antes de tocar producción.

---

## 2. Entornos y versiones

| Entorno | Host | Versión inicial | Versión final |
|---|---|---|---|
| Producción (`pesallaccia.com`) | Hetzner `178.105.226.175` | 1.40.2 | **1.46.3** |
| Staging LAN (`orderflow.local`) | homeserver `192.168.100.204` | 1.46.2 | **1.46.3** |
| Local (validación) | workstation | 1.46.3 (código) | 1.46.3 |
| Referencia (`provecchio.com`) | dimoraserverlocal | 1.46.2 | sin cambios |

> Nota: `provecchio.com` es otro entorno y **no** se tocó en este despliegue.

---

## 3. Estado inicial

- `https://pesallaccia.com/api/v1/health` → **1.40.2**.
- `/srv/orderflow` es un **snapshot sincronizado** (no un checkout git real); último commit de deploy: `0fd6a8fe deploy: sync local changes 20261022_202205`.
- Contenedores `orderflow-*` up desde hacía 2 semanas, todos healthy.
- Disco raíz: **4.5 GB libres (88 % usado)**.
- Base de datos: 40 migraciones aplicadas de 43 en el repo.

### Migraciones pendientes reales

La expectativa inicial era de 4 migraciones, pero la base ya tenía aplicada `20261022190000_restaurant_floors_odoo_floor_id` (la DB iba un paso adelante del backend 1.40.2). Las **3 realmente pendientes** fueron:

1. `20261023120000_gastro_table_sessions_bills`
2. `20261028213010_create_customer_claims`
3. `20261104120000_add_order_line_delivered_at`

---

## 4. Protocolo pre-deploy

### 4.1 Diagnóstico de infraestructura (§3.2)

Primera corrida de `pre-deploy-diagnostic.sh production` → **FAIL (exit 1)** por disco:

```
FAIL: Only 4,5G available (need >= 5G)   (/var/lib/docker)
FAIL: Only 4,5G available (need >= 5G)   (/srv/orderflow)
```

Causa: **17.11 GB de build cache** de Docker fijados por leases de containerd (`Reclaimable: 0B`), por lo que `docker builder prune` no liberaba nada.

Acciones y resultado:

- Poda de imágenes no usadas y journal → 4.5 G → 5.1 G.
- Reinicio controlado de `dockerd` (autorizado) → poda del cache: **10.12 GB liberados**.
- Disco final: **21 GB libres (42 %)**.
- `grafana` y `loki` (política de restart `no`) se levantaron manualmente; el resto volvió solo.

Segunda corrida → **OK (exit 0)**, solo con los 13 warnings conocidos:

- Volúmenes detectados sin prefijo (`postgres_data` vs `orderflow_postgres_data`).
- Versión remota leída por label inexistente (`<no value>`).
- `VITE_API_URL` vacío (se resuelve por build-args en el Dockerfile).

### 4.2 Deploy-to-local-first (§3.1.1)

| Paso | Resultado |
|---|---|
| Dump real de producción | `backups/pre_deploy_production_20261111_185407.sql` (376 KB, 165 tablas, íntegro) |
| Snapshot de rollback local | `backups/local_snapshot_pre_restore_20261111_185407.sql` (545 KB) |
| Restore en localhost | `DROP SCHEMA public CASCADE` + import → **0 errores** (siguiendo troubleshooting #205) |
| `prisma migrate deploy` local | **3 migraciones aplicadas**, 43/43 al día |
| Esquema verificado | `table_sessions`, `bills`, `customer_claims`, `order_lines."deliveredAt"`, `orders.table_session_id` / `idempotency_key` |
| Datos | 1 tenant (`majimboo`), 1 usuario, intactos |
| Persistencia | Datos y migraciones sobreviven reinicio de Postgres |
| `deploy-local.sh --skip-e2e` | Versiones 1.46.3 ✓, Prisma generate ✓, frontend build ✓, **jest 1061/1061 (140 suites)** ✓, health ✓, positions 401 ✓ |

Dos fallos del script local fueron de entorno, no de código:

- `nest build` con el heap por defecto (2 GB) → OOM. Con `NODE_OPTIONS=--max-old-space-size=4096` compila, igual que los Dockerfiles de producción.
- Check de bundle contra `https://provecchio.local`: no hay Traefik/dominio local en la workstation.

> El E2E de `deploy-local.sh` se omitió porque valida el tenant hardcodeado `provecchio-dimora-001`, inexistente en el backup de pesallaccia; el E2E real se ejecutó post-deploy contra producción.

---

## 5. Ejecución del deploy

Comando: `./scripts/deploy-production.sh production` (desde `main`, `a791209c`).

Secuencia efectiva:

1. Validación de variables de entorno requeridas.
2. Diagnóstico pre-deploy (OK).
3. Snapshot de `.env` para rollback.
4. Backup DB + uploads en el remoto.
5. `git push origin main` + rsync al servidor (con `--delete` y exclusiones).
6. Commit del snapshot remoto: **`482fa0d4`**.
7. `docker builder prune` pre-build y **build antes de recrear contenedores** (un build fallido no tumba el sitio).
8. `prisma migrate deploy` → 3 migraciones.
9. Recreación de contenedores y verificación de Traefik.
10. Health checks, E2E QA y rotación de backups (máx. 3 copias).

### Artefactos de rollback

| Artefacto | Ruta |
|---|---|
| Snapshot de `.env` (local) | `~/.orderflow/deploy-artifacts/production/rollback-production-20261111_191347.env` |
| Backup DB (remoto) | `/srv/orderflow/backups/pre_deploy_production_20261111_191347.sql` (376 KB) |
| Backup uploads (remoto) | `/srv/orderflow/backups/uploads_backup_20261111_191347.tar.gz` |
| Snapshot local-first | `/opt/orderflow/backups/pre_deploy_production_20261111_185407.sql` |

---

## 6. Verificación post-deploy

| Verificación | Resultado |
|---|---|
| `https://pesallaccia.com/api/v1/health` | **1.46.3**, `database: ok`, `odoo_adapter: ok` |
| Portada HTTPS | HTTP 200 |
| Redirect HTTP → HTTPS | 301 → `https://pesallaccia.com/` |
| Migraciones | 43 aplicadas, **0 fallidas** |
| Datos | 1 tenant, 1 usuario (sin pérdida) |
| Esquema | 3 tablas nuevas + `deliveredAt` + columnas de `orders` presentes |
| Contenedores | backend, frontend, database, redis, odoo-adapter, loki, grafana — todos healthy |
| Traefik | v3.4 activo y config recargada |
| E2E QA | catálogo público, dominio y `/admin/products`, `/customers`, `/bookings`, `/loyalty`, `/homepage-builder`, `/social-catalog`, `/gastro/kds-stations`, `/follow-up-rules` sin errores JS ni HTTP 500 |

---

## 7. Incidentes y correcciones

### 7.1 Disco lleno por build cache (bloqueante, resuelto)

- **Síntoma:** diagnóstico pre-deploy en FAIL por 4.5 GB libres.
- **Causa:** 17.11 GB de cache de build fijados por leases de containerd; `docker builder prune` reportaba `0B` reclamable.
- **Solución:** reinicio breve de `dockerd` + poda → 10.12 GB liberados, 21 GB libres.
- **Recomendación:** el `builder prune` del script es inefectivo bajo el image store de containerd; monitorear disco antes de cada deploy o programar una poda con reinicio en ventana de mantenimiento.

### 7.2 Riesgo de filtrar la bóveda Obsidian (resuelto antes del deploy)

- **Síntoma:** el rsync no excluía `/opt/orderflow/orderflow/` (bóveda local sin trackear) y el `git add -A` remoto la habría commiteado.
- **Solución (PR #37, `a791209c`):**
  - `.gitignore`: entrada anclada `/orderflow/`.
  - `deploy-production.sh`: `--exclude='/orderflow/'` en el rsync.
- **Verificación:** la bóveda **no** existe en `/srv/orderflow`.

### 7.3 Reloj desfasado en el homeserver (staging, resuelto)

- **Síntoma:** el build de staging fallaba en `apk add` con `TLS: server certificate not trusted`.
- **Causa:** reloj del homeserver **~2 h 51 min atrasado** (`System clock synchronized: no`); el certificado del CDN de Alpine aparecía como “not yet valid”.
- **Solución:** ajuste de hora contra cabecera HTTP + instalación de `systemd-timesyncd` → `synchronized: yes`, NTP activo.

### 7.4 Interrupción del script de staging (sin impacto)

- El SSH local cortó por timeout durante el deploy de staging; el script remoto continuó y completó build + healthchecks, pero no re-ejecutó `apply-staging-k8s.sh`.
- El Ingress existente (sin cambios) siguió enrutando correctamente; el endpoint se validó manualmente.

---

## 8. Staging del homeserver

| Verificación | Resultado |
|---|---|
| Repo | `/srv/orderflow` en `main` (`a791209c`), VERSION 1.46.3 |
| Health interno (`10.42.0.1:3010`) | 1.46.3 |
| `https://api.orderflow.local/api/v1/health` | **1.46.3** |
| `https://orderflow.local/` | HTTP 200 |
| Redirect HTTP | 301 → HTTPS |
| Contenedores staging | backend, frontend, odoo-adapter, database, redis healthy |

---

## 9. Documentación y trazabilidad

| Cambio | Referencia |
|---|---|
| Exclusión de la bóveda Obsidian | PR **#37** → merge `a791209c` |
| Entrada en `docs/timeline.md` | PR **#38** → merge `be6f3f8e` |
| Cierre de FEAT-212 / release 1.46.3 | PR **#36** → merge `e77373de` |

Ramas mergeadas eliminadas (local y remota): `feat/devops-pnpm-workspaces`, `fix/deploy-exclude-obsidian-vault`, `docs/timeline-deploy-1.46.3-pesallaccia`.

---

## 10. Rollback

El script deja todo lo necesario para revertir:

1. Snapshot de `.env`: `~/.orderflow/deploy-artifacts/production/rollback-production-20261111_191347.env`.
2. Backup DB pre-deploy: `/srv/orderflow/backups/pre_deploy_production_20261111_191347.sql`.
3. Backup uploads: `/srv/orderflow/backups/uploads_backup_20261111_191347.tar.gz`.
4. El deploy construye **antes** de eliminar contenedores: un build fallido deja el stack anterior intacto.
5. `scripts/rollback-deploy.sh` disponible para la reversión asistida.

---

## 11. Pendientes y recomendaciones

1. **Wiki:** re-ejecutar `scripts/sync-wiki.sh` para incluir la entrada del timeline (la wiki se sincronizó antes de este cambio).
2. **DB local:** conserva el snapshot de pesallaccia (tenant `majimboo`); el tenant de QA local se perdió por el protocolo local-first (#205).
3. **Wiki Pages:** sigue fallando por Pages no habilitado en `marcelompz/wiki` (preexistente, no bloquea).
4. **Disco:** el cache de build vuelve a crecer con cada deploy; conviene una poda periódica con reinicio controlado o evaluar ampliar el volumen.

---

## 12. Anexo — comandos principales

```bash
# Diagnóstico obligatorio
bash scripts/pre-deploy-diagnostic.sh production

# Local-first
ssh hetzner-orderflow "docker exec orderflow-database-1 pg_dump -U orderflow orderflow_db" \
  > backups/pre_deploy_production_<TS>.sql
docker exec orderflow_db psql -U orderflow -d orderflow_db -c \
  "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker exec -i orderflow_db psql -U orderflow -d orderflow_db -v ON_ERROR_STOP=1 \
  < backups/pre_deploy_production_<TS>.sql
cd backend && DATABASE_URL="postgresql://orderflow:***@localhost:5433/orderflow_db?schema=public" \
  ./node_modules/.bin/prisma migrate deploy

# Deploy a producción
./scripts/deploy-production.sh production

# Verificación
curl -s https://pesallaccia.com/api/v1/health
ssh hetzner-orderflow "docker exec orderflow-database-1 psql -U orderflow -d orderflow_db \
  -c 'SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NULL;'"

# Staging homeserver
ssh -o ForwardAgent=yes marcelompz@192.168.100.204 \
  'cd /srv/orderflow && KUBECONFIG=$HOME/.kube/config PATH=/usr/local/bin:$PATH \
   bash scripts/deploy-staging-homeserver.sh'
```
