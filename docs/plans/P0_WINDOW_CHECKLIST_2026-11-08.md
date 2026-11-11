# Checklist de ejecución — Ventana de rotación P0 (4 h)

> **Modo:** el operador ejecuta en el host; el agente guía paso a paso.
> **Regla:** no pegar valores de secretos en el chat. Devolver solo `OK`/`FAIL`
> y la salida de los comandos de verificación.
> **Base:** `docs/plans/P0_ROTATION_RUNBOOK_2026-11-08.md` (procedimiento y rollback).
> **Ventana:** única, 4 h. Fase A (aplicación) → checkpoint → Fase B (infraestructura).
>
> **Estado 2026-11-09:** la ventana original (08/11 22:00–02:00) **no se
> ejecutó**. Se abrió una ventana de recuperación el 09/11: backup verificado
> 12:35 desde localhost (`~/.orderflow/backups/20261109-123445`) y rotación
> ejecutada entre 13:19 y 14:33 (JWT, `MASTER_API_KEY`, usuario QA, Redis,
> PostgreSQL y cron de backup). Google OAuth queda pendiente de la consola del
> usuario. Merge, purga de historia y deploy de 1.46.2 siguen **pendientes de
> autorización explícita**.

## 0. Reglas de la ventana

1. Un paso por vez: el operador ejecuta, pega la salida de verificación, el
   agente confirma y recién entonces se avanza.
2. Nunca `echo` de un secreto, ni pasarlo como argumento de proceso.
3. Cada secreto viejo se revoca **solo después** de verificar el nuevo.
4. **Criterios de aborto** (rollback inmediato y cierre de ventana):
   - `/api/v1/health` no vuelve a `status: ok` en 10 min tras un reinicio.
   - Login falla para todos los usuarios tras rotar JWT.
   - Postgres no acepta la nueva contraseña o los backups fallan.
   - Cualquier servicio entra en crash-loop no explicado.
5. Si se aborta, se restaura `$ENVFILE` desde el backup y se reinicia; los
   secretos viejos siguen válidos hasta que se revoquen.

## 1. Parámetros (verificados 2026-11-08)

**Alcance de esta ventana: solo `provecchio` / `dimora-server`.** Hetzner
(`axon-workspace`) y `staging.pesallaccia.com` quedan fuera: el valor viejo de
`MASTER_API_KEY` sigue válido allí y debe rotarse en una ventana aparte.

Valores reales del stack (confirmados con `docker inspect`):

| Parámetro | Valor |
|---|---|
| Host | `dimora-server` (`root@192.168.69.240`, vía jump `root@38.52.135.227:2021`) |
| `APP_DIR` | `/srv/orderflow` |
| `ENVFILE` | `/srv/orderflow/.env.provecchio` (600) |
| Compose | `docker-compose.yml` + `docker-compose.provecchio.yml` |
| Servicio DB | `postgres` (contenedor `orderflow_db`) |
| Consumidores de la key | `backend`, `sync_standalone`, `omnibi_standalone` |

En el host destino:

```bash
export APP_DIR=/srv/orderflow
export ENVFILE=$APP_DIR/.env.provecchio
export BK_ROOT=$HOME/.orderflow/backups   # snapshots de rollback en el host
export BK=$BK_ROOT/$(date +%Y%m%d-%H%M%S)
mkdir -p "$BK_ROOT" "$BK" && chmod 700 "$BK_ROOT" "$BK"
cd "$APP_DIR"
COMPOSE_ARGS="-f docker-compose.yml -f docker-compose.provecchio.yml --env-file .env.provecchio"

# Detectar Compose (v2 plugin o binario v1)
if docker compose version >/dev/null 2>&1; then export DC="docker compose $COMPOSE_ARGS"; else export DC="docker-compose $COMPOSE_ARGS"; fi
echo "APP_DIR=$APP_DIR BK=$BK DC=$DC"
ls -l "$ENVFILE" && stat -c '%a %U:%G' "$ENVFILE"
```

Esperado: `APP_DIR` correcto, `.env.provecchio` con permisos `600`, `DC` resuelto.

## 2. T-24 h — prerrequisitos

### 2.1 Backup verificado (obligatorio)

**Ejecutar desde localhost (thinkpad).** Acceso a dimora por jump:
`ssh -J root@38.52.135.227:2021 root@192.168.69.240`.

> **Agent SSH (verificado 2026-11-09):** si `ssh-add -l` devuelve
> `Connection refused`, `SSH_AUTH_SOCK` apunta a un socket muerto
> (`/run/user/1000/keyring/ssh`). Usar el agent activo:
> `export SSH_AUTH_SOCK=/run/user/1000/gcr/ssh`. Sin esto, `scp`/`ssh` cuelgan o
> dan `Permission denied`. Agregar siempre `-o ConnectTimeout=15
> -o ServerAliveInterval=15` para no quedar bloqueado.

> **Hallazgo 2026-11-08:** el cron de backup del host apunta a
> `/srv/orderflow/scripts/backup.sh`, que **no existe**;
> `/var/log/orderflow-backup.log` repite `not found`. No hay backup automático
> funcionando: este backup manual es el único respaldo. El fix del cron se hace
> en §6.3 (Fase B).

> Las variables de este bloque viven en **localhost** y por eso usan el prefijo
> `LOCAL_`; no confundirlas con `BK`/`BK_ROOT`, que en §1 apuntan al host.

```bash
export LOCAL_TS=$(date +%Y%m%d-%H%M%S)
export LOCAL_BK="$HOME/.orderflow/backups/$LOCAL_TS"
mkdir -p "$LOCAL_BK" && chmod 700 "$HOME/.orderflow/backups" "$LOCAL_BK"
SSH="ssh -o BatchMode=yes -J root@38.52.135.227:2021 root@192.168.69.240"
DBS="orderflow_db orderflow_sync orderflow_bi"   # verificado 2026-11-08

# Snapshot del env vivo (fuera del repo, 600)
scp -o BatchMode=yes -o ProxyJump=root@38.52.135.227:2021 \
  root@192.168.69.240:/srv/orderflow/.env.provecchio "$LOCAL_BK/env.backup"
chmod 600 "$LOCAL_BK/env.backup"

# Dump de las 3 bases (auth local dentro del contenedor, sin password en CLI)
for db in $DBS; do
  $SSH "docker exec orderflow_db pg_dump -U orderflow -d $db" | gzip > "$LOCAL_BK/$db.sql.gz"
  gzip -t "$LOCAL_BK/$db.sql.gz" && ls -lh "$LOCAL_BK/$db.sql.gz"
done

# Files store unificado (32 MB / 43 archivos al 2026-11-08)
$SSH 'tar -C /srv/orderflow -czf - uploads' > "$LOCAL_BK/uploads.tar.gz"
tar -tzf "$LOCAL_BK/uploads.tar.gz" >/dev/null && echo "UPLOADS_OK"
echo "BACKUP_OK"
```

**Restore de prueba (una DB descartable por base, mismo Postgres):**

```bash
for db in $DBS; do
  testdb="${db}_restore_test"
  $SSH "docker exec orderflow_db createdb -U orderflow $testdb"
  gunzip -c "$LOCAL_BK/$db.sql.gz" | $SSH "docker exec -i orderflow_db psql -U orderflow -d $testdb >/dev/null"
  printf '%s tablas: ' "$testdb"
  $SSH "docker exec orderflow_db psql -U orderflow -d $testdb -tAc \"select count(*) from information_schema.tables where table_schema='public';\""
  if [ "$db" = orderflow_db ]; then
    printf 'tenants: '
    $SSH "docker exec orderflow_db psql -U orderflow -d $testdb -tAc 'select count(*) from tenants;'"
  fi
  $SSH "docker exec orderflow_db dropdb -U orderflow $testdb"
done
```

Esperado: las 3 bases se dumpean y restauran, `uploads.tar.gz` es legible;
`orderflow_db` conserva `tenants` con conteo razonable (hoy = 1) y las otras dos
conservan sus tablas. **Sin este paso, no se abre la ventana.**

### 2.2 Inventario de `MASTER_API_KEY` (verificado 2026-11-08)

Repo-side ya inventariado: backend, 5 compose de `services/`, scripts
deploy/QA, Playwright, Newman. Relevamiento externo read-only:

| Ubicación | Consumidores / archivos |
|---|---|
| **dimora-server** (en alcance) | `.env` y `.env.prod` en **755** (corregir a 600), `.env.provecchio` (600, vivo), `backend/.env` (644, corregir); copia en `/opt/srv/orderflow/{.env,.env.prod,.env.provecchio,backend/.env}`; contenedores `backend`, `sync_standalone`, `omnibi_standalone`. Los `*.example` son placeholders (no se rotan) |
| **localhost** | `~/.orderflow/quarantine/2026-11-07/deploy-artifacts/rollback-*.env` (10 archivos) + `client_secret_*.json`; sin crons, sin timers propios, sin secretos `MASTER_API_KEY` en GitHub Actions, sin Postman fuera del repo |
| **Hetzner** (fuera de alcance) | `/srv/orderflow/.env`, `/srv/orderflow/backend/.env`, `/srv/orderflow-staging/.env.prod` y `.env.production`; contenedor `orderflow-backend-prod` |

Pendiente de confirmar / riesgos abiertos (respuestas 2026-11-08):

- [x] **Postman/Newman de operadores:** confirmado que nadie más tiene la key;
      solo las colecciones del repo (ya en placeholder).
- [x] **Monitoreo externo:** Grafana está instalado pero **sin configurar**; hoy
      no consume la key. Si se configura antes de la ventana, actualizarlo.
- [ ] **Integraciones de clientes / móvil / kiosk:** *no confirmado*. Riesgo
      residual: si alguna usa la key, deja de autenticar al rotar. Antes de
      §5.3, revisar el tráfico reciente (logs de Traefik/backend de las últimas
      48 h) por clientes externos y, si aparece algo dudoso, contactar antes de
      rotar. El rollback de la key vieja solo cubre la ventana.

> Los `.env` de dimora con permisos `755`/`644` son legibles por cualquier
> usuario del host: `chmod 600` en §5.3. La copia `/opt/srv/orderflow` es otro
> checkout git (`main`, 5 commits adelante de `origin/main`) y no la referencia
> ningún cron/systemd: rotarla igual o ponerla en cuarentena.
>
> **Bundle del frontend (2026-11-08):** `grep -rl sk_master frontend/dist` → 0
> archivos; `VITE_MASTER_API_KEY` no quedó embebida en el build actual. Repetir
> la verificación tras el próximo rebuild (§5.3).
>
> **Riesgo residual:** como Hetzner queda fuera, el valor filtrado sigue válido
> allí. Agendar su rotación en una ventana aparte.

### 2.3 Aviso y accesos

- [ ] **Preflight read-only en verde** (T-12 h y T-2 h):

  ```bash
  ./scripts/p0-preflight.sh   # debe terminar en PREFLIGHT_OK
  ```

- [ ] Aviso a usuarios: cierre de sesiones en Fase A.
- [ ] Responsable Google Cloud disponible.
- [ ] Responsable PostgreSQL disponible.
- [ ] Acceso SSH/VPN al host verificado desde la red correcta.
- [ ] Gestor de secretos listo para guardar los valores nuevos.

## 3. T-1 h — preparación

> En el host destino, en la misma shell que §1 (allí viven `$BK` y `$DC`).

```bash
# Health y versión de referencia
curl -s https://provecchio.com/api/v1/health | tee "$BK/health-before.json"
# Guardar en el gestor de secretos: valor actual de MASTER_API_KEY (para comparar)
# y una sesión de navegador abierta para probar login después.
```

- [ ] Congelar deploys y merges durante la ventana.
- [ ] Confirmar que no hay migraciones ni jobs pesados corriendo:

```bash
$DC ps
$DC logs --tail=50 backend | grep -iE 'migrat|deploy' || true
```

## 4. Helper para editar `.env` sin filtrar valores

Cargar una vez por shell:

```bash
set_var() {
  local key="$1" value="$2" file="${3:-$ENVFILE}"
  KEY="$key" VALUE="$value" FILE="$file" python3 - <<'PY'
import os, re
k, v, f = os.environ['KEY'], os.environ['VALUE'], os.environ['FILE']
lines = open(f).read().splitlines()
out, found = [], False
for line in lines:
    if re.match(rf'^{re.escape(k)}=', line):
        out.append(f'{k}={v}'); found = True
    else:
        out.append(line)
if not found:
    out.append(f'{k}={v}')
open(f, 'w').write('\n'.join(out) + '\n')
PY
}
# Verificación sin mostrar el valor:
check_var() { grep -q "^$1=" "$ENVFILE" && echo "$1 presente"; }

# Reescribe la password embebida en una URL (VAR=esquema://usuario:pass@host...)
# Sin imprimir el valor. Las passwords nuevas son hex: no requieren encoding.
set_url_pass() {
  local key="$1" value="$2" file="${3:-$ENVFILE}"
  KEY="$key" VALUE="$value" FILE="$file" python3 - <<'PY'
import os, re
k, v, f = os.environ['KEY'], os.environ['VALUE'], os.environ['FILE']
pat = re.compile(rf'^({re.escape(k)}=[a-z0-9+.\-]+://(?:[^:@/]+)?:)([^@]*)@', re.I)
out = []
for line in open(f).read().splitlines():
    m = pat.match(line)
    out.append(f'{m.group(1)}{v}@{line[m.end():]}' if m else line)
open(f, 'w').write('\n'.join(out) + '\n')
PY
}
```

## 5. Fase A — aplicación (T+0:00 → T+2:15)

### 5.1 Google service account (T+0:00–0:30)

1. Detectar cómo se usa en el host:

```bash
grep -nE 'GOOGLE_(APPLICATION_CREDENTIALS|CLIENT_SECRET|CLIENT_ID)' "$ENVFILE" || echo "sin claves Google en .env"
grep -rn --include='*.json' -l 'service_account' "$APP_DIR" 2>/dev/null | grep -v node_modules | head
```

2. En Google Cloud Console: Service Accounts → clave usada → **crear nueva
   clave JSON**.
3. Reemplazar el archivo en el host, permisos `600`, fuera del repo.
4. Reiniciar solo los servicios que usan Google Calendar/integraciones.
5. Verificar el flujo de integración (listar calendarios o abrir la pantalla de
   integración).
6. Revocar la clave vieja en GCP.
7. Rollback: reactivar la clave vieja si aún no se revocó.

**OK cuando:** la integración Google responde y la clave vieja está revocada.

### 5.2 JWT_SECRET + JWT_REFRESH_SECRET (T+0:30–1:00)

```bash
cp -a "$ENVFILE" "$BK/env.before-jwt" && chmod 600 "$BK/env.before-jwt"
NEW_JWT=$(openssl rand -hex 32)
NEW_REFRESH=$(openssl rand -hex 32)
set_var JWT_SECRET "$NEW_JWT"
set_var JWT_REFRESH_SECRET "$NEW_REFRESH"
unset NEW_JWT NEW_REFRESH
check_var JWT_SECRET; check_var JWT_REFRESH_SECRET

$DC up -d backend
$DC ps backend
```

Verificación:

```bash
curl -s https://provecchio.com/api/v1/health
# Login nuevo desde navegador → OK
# /auth/me con el token nuevo → 200
# Token emitido antes de la ventana → 401
```

**OK cuando:** login nuevo funciona, refresh funciona y el token viejo da 401.
**Efecto:** todas las sesiones previas quedan cerradas (avisado).

### 5.3 MASTER_API_KEY (T+1:00–2:00)

Antes de generar la key, revisar consumo externo no inventariado (48 h):

```bash
# IPs/UA que pegan a la API (no imprime headers ni secretos)
docker logs traefik --since 48h 2>&1 | grep -E 'api/v1' | awk '{print $1}' | sort | uniq -c | sort -rn | head -20
```

Si aparece una IP/UA desconocida con volumen relevante, contactar antes de rotar.

```bash
cp -a "$ENVFILE" "$BK/env.before-master" && chmod 600 "$BK/env.before-master"
OLD_MASTER=$(grep -m1 '^MASTER_API_KEY=' "$ENVFILE" | cut -d= -f2-)
NEW_MASTER="sk_master_$(openssl rand -hex 24)"
set_var MASTER_API_KEY "$NEW_MASTER"
check_var MASTER_API_KEY

# Rotar también las copias de dimora (no dejar el valor viejo en otros .env).
# Ojo: los *.example son placeholders; NO se tocan.
for f in /srv/orderflow/.env /srv/orderflow/.env.prod /srv/orderflow/backend/.env \
         /opt/srv/orderflow/.env /opt/srv/orderflow/.env.prod \
         /opt/srv/orderflow/.env.provecchio /opt/srv/orderflow/backend/.env; do
  [ -f "$f" ] && set_var MASTER_API_KEY "$NEW_MASTER" "$f"
done
chmod 600 /srv/orderflow/.env /srv/orderflow/.env.prod /srv/orderflow/backend/.env 2>/dev/null || true

# Reiniciar los 3 consumidores confirmados
$DC up -d backend sync_standalone omnibi_standalone
```

Actualizar **todos** los consumidores inventariados (scripts, microservicios,
Newman/Postman, integraciones). Verificación:

```bash
# Key nueva → 200 (el header va por stdin, no como argumento de proceso)
printf 'x-api-key: %s\n' "$NEW_MASTER" | \
  curl -s -o /dev/null -w 'nueva=%{http_code}\n' -H @- https://provecchio.com/api/v1/tenants
# Key vieja → 401
printf 'x-api-key: %s\n' "$OLD_MASTER" | \
  curl -s -o /dev/null -w 'vieja=%{http_code}\n' -H @- https://provecchio.com/api/v1/tenants
```

**OK cuando:** `nueva=200` y `vieja=401`. Luego guardar la nueva en el gestor y
`unset NEW_MASTER OLD_MASTER`.

Verificación adicional (2026-11-08 el bundle no tenía la key; confirmar que sigue
así tras el rebuild):

```bash
grep -rl 'sk_master' frontend/dist 2>/dev/null | wc -l   # esperado: 0
```

### 5.4 Admin QA (T+2:00–2:15)

```bash
# Cambiar la password del usuario QA (API o SQL, según el entorno)
# Actualizar los .env de QA fuera del repo:
#   /opt/srv/orderflow/qa/.env y .env.provecchio (dimora)
#   copias locales en ~/.orderflow/quarantine (localhost)
# Verificar login QA contra provecchio
```

**OK cuando:** login QA funciona y las credenciales viejas ya no.

### ✅ Checkpoint 1 (T+2:15)

| Check | Esperado |
|---|---|
| Salud prod | `status: ok`, `database: ok` |
| Login + refresh | OK |
| Token viejo | 401 |
| Master key vieja | 401 |
| Integración Google | OK |
| Sesiones | usuarios re-logueados |

**Go/No-Go:** si algo falla, rollback de Fase A y no se toca infraestructura.

## 6. Fase B — infraestructura (T+2:15 → T+4:00)

### 6.1 Redis (T+2:15–2:45)

```bash
cp -a "$ENVFILE" "$BK/env.before-redis" && chmod 600 "$BK/env.before-redis"
NEW_REDIS=$(openssl rand -hex 24)
set_var REDIS_PASSWORD "$NEW_REDIS"
set_url_pass REDIS_URL "$NEW_REDIS"
check_var REDIS_PASSWORD

# Quitar el literal hardcodeado del compose. Está en el servicio odoo_adapter
# (docker-compose.yml:181, REDIS_PASSWORD con valor literal): reemplazar por
# ${REDIS_PASSWORD}. sync_standalone usa otro Redis (lowfarm_redis) sin auth:
# no tocar en este paso.
grep -nE 'REDIS_PASSWORD: [^$]' docker-compose.yml || true
# Editar el archivo para reemplazar el literal por ${REDIS_PASSWORD}

$DC up -d redis backend odoo_adapter
```

Verificación:

```bash
export REDISCLI_AUTH="$NEW_REDIS"
$DC exec -T -e REDISCLI_AUTH redis redis-cli ping    # PONG (sin -a en argv)
unset REDISCLI_AUTH
# Abrir KDS y confirmar evento WebSocket
# Confirmar que las colas procesan (logs sin errores de auth)
```

**OK cuando:** `PONG`, KDS recibe eventos y no hay errores de Redis en logs.
**Rollback:** restaurar `env.before-redis`, reiniciar redis+backend.

### 6.2 PostgreSQL (T+2:45–3:45)

```bash
cp -a "$ENVFILE" "$BK/env.before-db" && chmod 600 "$BK/env.before-db"
NEW_DB=$(openssl rand -hex 24)
umask 077 && printf '%s' "$NEW_DB" > "$BK/db.pass"   # $BK ya está en 700

# Cambiar la password por stdin: no queda en argv ni en el historial.
$DC exec -T postgres psql -U orderflow -d postgres -v ON_ERROR_STOP=1 <<SQL
ALTER USER orderflow WITH PASSWORD '$(cat "$BK/db.pass")';
SQL
```

Actualizar todas las URLs (backend, sync, bi, backups, microservicios):

```bash
set_var POSTGRES_PASSWORD "$NEW_DB"
# URLs embebidas: compose las reconstruye desde POSTGRES_PASSWORD, pero los
# scripts y .env con DATABASE_URL/SYNC_DATABASE_URL/OMNIBI_DATABASE_URL deben
# quedar alineados. La password es hex: no requiere URL-encoding.
for k in DATABASE_URL SYNC_DATABASE_URL OMNIBI_DATABASE_URL; do set_url_pass "$k" "$NEW_DB"; done

$DC up -d
rm -f "$BK/db.pass"
```

Verificación:

```bash
curl -s https://provecchio.com/api/v1/health
$DC ps
$DC logs --tail=100 backend | grep -iE 'error|prisma|connect' | tail -20
# Backup posterior de las 3 bases:
for db in orderflow_db orderflow_sync orderflow_bi; do
  $DC exec -T postgres pg_dump -U orderflow -d "$db" | gzip > "$BK/$db.after.sql.gz"
  gzip -t "$BK/$db.after.sql.gz" && echo "BACKUP_AFTER_OK $db"
done
```

**OK cuando:** health `database: ok`, todos los servicios `Up`, sin errores de
conexión y backup posterior íntegro.
**Rollback:** `ALTER USER orderflow WITH PASSWORD '<anterior>'` y restaurar
`env.before-db`; reiniciar.

### 6.3 Fix del cron de backup (T+3:45–3:55)

Estado actual verificado el 2026-11-08:

```bash
crontab -l
# 0 3 * * * /srv/orderflow/scripts/backup.sh >> /var/log/orderflow-backup.log 2>&1
tail -5 /var/log/orderflow-backup.log
# /bin/sh: 1: /srv/orderflow/scripts/backup.sh: not found
```

El script no existe. `scripts/backup-production.sh` **no** es adecuado para el
cron de dimora: está pensado para ejecutarse desde localhost y, para
`provecchio`, hace SSH a `dimoraserverlocal` (desde el propio dimora se
conectaría a sí mismo).

**Solución implementada (2026-11-09 14:32):** se creó `scripts/backup.sh`,
versionado en la rama `fix/p0-secrets-hardening`. Se ejecuta **en el host**, sin
SSH, y:

- hace `pg_dump` comprimido de `orderflow_db`, `orderflow_sync` y `orderflow_bi`;
- empaqueta `uploads/` (bind mount real en dimora) y verifica con `tar -tzf`;
- valida tamaño y `gzip -t` de cada dump; sale ≠ 0 si no genera ningún dump;
- aplica retención configurable (14 días por defecto) **solo** a `daily_*`, sin
  tocar los `pre_deploy_*`;
- resuelve el contenedor de DB en caliente (tolera renombrados);
- no imprime secretos.

El crontab ya apuntaba a `/srv/orderflow/scripts/backup.sh`, así que **no hizo
falta modificarlo**. `scripts/verify-backups.sh` también se actualizó para
validar los archivos `daily_*`.

```bash
# Prueba manual en dimora (entorno normal y simulación de cron):
cd /srv/orderflow && ./scripts/backup.sh
env -i HOME=/root LOGNAME=root PATH=/usr/bin:/bin \
  /bin/sh -c '/srv/orderflow/scripts/backup.sh'
./scripts/verify-backups.sh 1
```

Resultado verificado 2026-11-09:

| Check | Resultado |
|---|---|
| Duración | 8 s |
| Dumps | `orderflow_db` 397 KB, `orderflow_sync` 1.7 KB, `orderflow_bi` 1.7 KB |
| Uploads | 28 MB, `tar -tzf` OK |
| Restore de prueba | 171 tablas, 1 tenant, 11 usuarios |
| Simulación cron (`env -i`) | exit 0, mismos artefactos |
| Crontab | `0 3 * * * /srv/orderflow/scripts/backup.sh >> /var/log/orderflow-backup.log 2>&1` |

**OK cuando:** una ejecución manual genera un backup íntegro, el restore de
prueba funciona y el cron apunta a un script existente. ✅

## 7. Cierre (T+3:45–4:00)

```bash
curl -s https://provecchio.com/api/v1/health | tee "$BK/health-after.json"
$DC ps
# staging/pesallaccia queda fuera de esta ventana
```

| Check final | Esperado |
|---|---|
| `/api/v1/health` | `ok`, `database: ok` |
| Login / refresh | OK |
| Token viejo | 401 |
| Master key vieja | 401 |
| Redis / WS | OK |
| Postgres / backups | OK |
| Métricas/errores 30 min | sin picos anómalos |
| Secretos nuevos en gestor | guardados |
| Secretos viejos | revocados (Google, master, Redis, DB) |

Cerrar la ventana solo con **todos** los checks en verde. Registrar hora, quién
ejecutó y desvíos en la tabla de §9.

## 8. Después de la ventana

1. ✅ Sacar el PR #26 de draft, verificar 6/6 verde y **mergear antes de la purga**
   (evita rebasar 10 commits del P0). Mergeado por rebase → `3e16063b`.
2. Vaciar del `.gitleaksignore` las entradas ya rotadas. *(parcial: quedan las
   entradas de secretos históricos que aún no se rotaron, ver §10)*
3. ✅ Purga de historia + `--force-with-lease` (runbook §5) con re-clonado →
   `origin/main = 5401d307`, 0 objetos tainted.
4. Rebase del PR #27 sobre el nuevo `main`, CI verde y merge. *(pendiente)*
5. ✅ Deploy de `1.46.2` a prod (autorización y ventana aparte) → `0917b003`,
   `version: 1.46.2` en producción y staging/pesallaccia **sin tocar** (§10).
6. Agendar la rotación de Hetzner/`orderflow-staging` (fuera de alcance hoy).
7. Rotar API keys de tenants (hallazgo §0.1) y revisar el bundle del frontend
   por `VITE_MASTER_API_KEY`.

> **Branch protection:** el repo es privado y el plan es Free; la API de
> protección devuelve 403. No hay enforcement real: el gate es PR + 6/6 verde +
> revisión manual. Si se requiere protección efectiva, hay que pasar a GitHub
> Pro (decisión del owner).

## 9. Registro de la ventana

| Hora | Paso | Resultado | Operador | Notas |
|---|---|---|---|---|
| 2026-11-09 12:35 | Backup + restore test | OK: 3 DBs + uploads (`20261109-123445`) | agente (localhost) | backup verificado; base de rollback |
| | Google | **Pendiente** | usuario | requiere Google Cloud Console; fuera del alcance del agente |
| 2026-11-09 13:19 | JWT + refresh | OK | agente (dimora) | `.env`, `.env.provecchio`, `.env.prod`, `backend/.env` (600); backend+omnibi recreados; hashes `b1e7577907` / `9d76390519`; health local y público OK; 0 errores |
| 2026-11-09 13:21 | `MASTER_API_KEY` | OK | agente (dimora) | nueva → 200, vieja → 401 (host sin tenant); backend+sync+omnibi con hash `cbbe3fbcd2`; backup `master-20261109-132153` |
| 2026-11-09 14:21 | QA admin | OK (usuario dedicado) | agente (dimora) | `qa-admin@provecchio.local` (id `24dd6746…`), rol `ADMIN`, tenant `provecchio-dimora-001`; login 200 y `/api/v1/users` 200; super admin **no** rotado por decisión del usuario; password en `~/.orderflow/backups/qa-local-20261109-142126/qa-admin.password` (600) |
| 2026-11-09 14:22 | Checkpoint 1 | OK | agente | health `ok`; login QA OK; token/master viejos rechazados; Google pendiente |
| 2026-11-09 14:20 | Redis | OK | agente (dimora) | hash `e9eaa5a3f7`; redis+backend+odoo_adapter+sync recreados; `PING` nueva OK / vieja rechazada; 0 errores; literal del compose reemplazado por `${REDIS_PASSWORD}` |
| 2026-11-09 14:28 | PostgreSQL | OK (con recuperación) | agente (dimora) | hash `7d4efd36e6`; `ALTER USER` aplicado; URL/password alineadas en 5 archivos; postgres+backend+sync+odoo+omnibi recreados; auth por red Docker nueva OK / vieja rechazada (`127.0.0.1` es `trust`, no sirve como prueba); 0 errores de auth; dumps pre/post de las 3 bases; password en `~/.orderflow/backups/pg-local-20261109-143036/postgres_password` (600) |
| 2026-11-09 14:32 | Fix cron backup | OK | agente (dimora) | creado `scripts/backup.sh`; 3 DBs + uploads (28 MB) en 8 s; restore de prueba 171 tablas/1 tenant/11 usuarios; simulación cron `env -i` OK; retención 14 días; `verify-backups.sh` actualizado; crontab sin cambios |
| 2026-11-09 14:35 | Cierre de rotación | **Parcial** | agente | rotación P0 de provecchio/dimora completa; Google OAuth, merge del PR #26, purga de historia y deploy 1.46.2 quedan pendientes de autorización/acción del usuario |
| 2026-11-09 14:43 | Limpieza checkout servidor | OK | agente (dimora) | `qa/.env` y `qa/.env.provecchio` sacados del índice de `/srv/orderflow` (commit local `1feab8b8`, **sin push**); archivos siguen en disco (600) e ignorados por `.gitignore`; backup en `/root/.orderflow/backups/qa-env-20261109_144345` (700, 600 + SHA256SUMS). Objetivo: que el `git add -A` del deploy no re-commitee la password de QA. El árbol sucio restante (`docker-compose.yml` → `${REDIS_PASSWORD}`, `scripts/verify-backups.sh`, `scripts/backup.sh`) no contiene secretos nuevos |
| 2026-11-10 ~11:20 | Merge PR #26 (rebase) | OK | agente | `3e16063b` en `main`; CI 3/3 verde |
| 2026-11-10 ~11:35 | Purga de historia | OK | agente | 13 paths purgados de `main`; 15 ramas + 215 tags `--force-with-lease`; `origin/main = 5401d307`; 0 objetos tainted; rama de purga eliminada |
| 2026-11-10 ~12:00 | Deploy 1.46.2 (intentos) | Abortado y reintentado | agente (dimora) | `deploy-production.sh` abortaba por el build redundante del frontend en el host (`vite build --mode provecchio` sin minificar → Workbox rechaza `vendor-antd` 3.2 MB > 2 MiB); los shells remotos sobrevivieron a los cortes de SSH y dejaron el stack en 1.46.2, pero sin `up -d` final |
| 2026-11-10 ~12:5x | Fix deploy (PR #28) | OK | agente | `0917b003`: se elimina el build del frontend en el host; `minify: mode !== 'development'`; `maximumFileSizeToCacheInBytes: 4 MiB`; keepalive SSH; troubleshooting #215 + CHANGELOG. CI 6/6 verde; build de `Dockerfile.prod` validado localmente (`vendor-antd` 1.455.065 B) |
| 2026-11-10 14:00 | Deploy 1.46.2 (final) | OK | agente (dimora) | `git reset --hard 0917b003` en `/srv/orderflow` (limpio, `core.fileMode=false`); imágenes reconstruidas (backend, frontend, omnibi, sync); `up -d --remove-orphans` detached → 8 contenedores recreados con las imágenes nuevas y healthy |
| 2026-11-10 14:02 | Migraciones | OK | agente (dimora) | `prisma migrate status` → 43 migraciones, *Database schema is up to date!* |

## 10. Cierre del deploy 1.46.2 y riesgos residuales

**Estado final verificado (2026-11-10 14:03 -03, `/srv/orderflow` @ `0917b003`):**

| Check | Resultado |
|---|---|
| Imagen del contenedor == tag | OK en backend / frontend / omnibi / sync |
| `http://127.0.0.1:3010/api/v1/health` | `{"version":"1.46.2", database:ok, odoo_adapter:ok}` |
| `https://provecchio.com/api/v1/health` | HTTP 200 |
| `https://provecchio.com/` | HTTP 200 |
| Traefik (`Host: provecchio.com`) frontend / api | 200 / 200 |
| Bundle servido | `vendor-antd-zezbCeg-.js` = 1.455.065 B (minificado) |
| Imagen de uploads de catálogo | HTTP 200, `image/jpeg`, 191.495 B |
| Migraciones Prisma | 43, schema up to date |
| Logs backend / frontend | sin errores recientes |

**Riesgos residuales (fuera de esta ventana):**

1. **Google OAuth / client secret:** sin rotar; requiere Google Cloud Console
   (acción del usuario). El JSON sigue en el bundle pre-purga (ya no en el índice).
2. **Secretos residuales:** 8 únicos, 6 aún presentes en el tip de `main`
   (API keys de tenants + fix de código pendiente). Requiere rotación de claves
   y trabajo de código en ventana aparte.
3. **Réplica `orderflow-database-replica-prod`:** `primary_conninfo` apunta a
   Hetzner (`178.105.226.175`), **no** al primario local; sin streaming. Fuera
   de alcance (decisión previa).
4. **Hetzner / `orderflow-staging`:** conserva valores viejos de
   `MASTER_API_KEY`/DB; rotación en ventana aparte.
5. **`ODOO_PASSWORD: Cross1983_`** literal en `docker-compose.yml`; riesgo
   residual aceptado fuera de alcance.
6. **Super admin `marcelao@pesallaccia.com`** conserva su password (decisión
   del usuario).
7. **Branch protection:** no disponible (repo privado + plan Free; API 403). El
   gate real es PR + CI verde + revisión manual.
8. **Docs server-only eliminados por el rsync:** 675 archivos (43 MB) — incluye
   `docs/prompts`, `docs/historico`, `docs/brand` no versionados — respaldados en
   `/root/.orderflow/backups/pre-deploy-tree-20261110_113435/server-only-files.tar.gz`
   (dimora). **No se restauraron** al checkout para no reintroducir archivos no
   versionados que el próximo `rsync --delete` volvería a borrar.
