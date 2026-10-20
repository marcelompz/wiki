# Guía: desbloquear el acceso y desplegar la v1.39.15 en Provecchio

> **Motivo de esta guía:** el puerto 22 (SSH) está filtrado hacia
> `192.168.69.240` (provecchio) y `192.168.69.246` (Odoo 14) desde el equipo
> `192.168.69.40`. La LAN funciona con normalidad (HTTP 200 al backend y al ERP),
> así que el bloqueo es una regla de firewall / ban de fail2ban contra esa IP.
>
> **Qué queda por desplegar:**
> 1. La **v1.39.15** (fix del bug #5: el KDS se actualiza solo) — la app OrderFlow.
> 2. El **addon `pos_omniflow_sync`** en el Odoo 14 (transferencia a cliente de la
>    cuenta abierta, FEAT-190).
>
> **Tiempo estimado:** 5 min (desbloqueo) + ~15 min (build en el servidor) + 2 min (addon) + 5 min (verificación).

---

## Paso 0 — Preparación

En el equipo con acceso (este mismo, `192.168.69.40`):

```bash
cd /opt/orderflow
git status                 # debe estar limpio
git log --oneline -1       # e4076027 (fix del KDS) o superior
cat VERSION                # 1.39.15
```

Si `git status` muestra cambios, haz `git stash` antes de desplegar (el script
hace `git stash` + `git push` en el servidor).

---

## Paso 1 — Quitar el bloqueo de SSH (obligatorio)

Conéctate **por consola física o por una vía alternativa** (monitor de Provecchio,
KVM, o desde otra máquina de la LAN) a los dos servidores y ejecuta:

### 1.1 Diagnóstico (¿es fail2ban o una regla de firewall?)

```bash
# ¿Existe fail2ban y hay nuestra IP baneada?
fail2ban-client status 2>/dev/null
fail2ban-client status sshd 2>/dev/null
ipset list 2>/dev/null | grep -i 192.168.69.40

# ¿Hay reglas de iptables/nftables contra nuestra IP?
iptables -L INPUT -n --line-numbers | grep 192.168.69.40
nft list ruleset 2>/dev/null | grep 192.168.69.40
```

### 1.2 Solución A — fail2ban (lo más probable)

```bash
# Ver las IP baneadas
fail2ban-client status sshd

# Quitar el ban de nuestro equipo
fail2ban-client set sshd unbanip 192.168.69.40
```

Si el jail se llama distinto (p. ej. `sshd` vs `ssh`), usa el nombre que
devuelva `fail2ban-client status`.

### 1.3 Solución B — regla de firewall (si no hay fail2ban)

```bash
# Localizar y borrar la regla (¡cuenta el número de línea!)
iptables -L INPUT -n --line-numbers | grep 192.168.69.40
# iptables -D INPUT <NUMERO_DE_LINEA>

# Si el bloqueo está en nftables
nft list ruleset | grep -n 192.168.69.40
# nft delete rule <tabla> <cadena> handle <n>
```

### 1.4 Comprobación

```bash
# Desde el equipo 192.168.69.40 (no desde el servidor)
ssh -o ConnectTimeout=10 root@192.168.69.240 "echo 'provecchio OK'"
ssh -o ConnectTimeout=10 root@192.168.69.246 "echo 'odoo OK'"
```

Ambos deben responder antes de seguir.

---

## Paso 2 — Liberar espacio en Docker (el deploy se aborta si no)

El diagnóstico previo exige **≥ 5 GB** libres en `/var/lib/docker`. Tras los
builds de la noche quedan < 4 GB.

```bash
ssh root@192.168.69.240 "
  docker image prune -f        # imágenes dangling de builds anteriores (~3.5 GB)
  docker builder prune -f      # caché de build
  df -h /var/lib/docker | tail -1
"
```

Debe quedar **≥ 5 GB** disponibles. (No uses `docker system prune -a`: se lleva
las imágenes etiquetadas yROMpe el rollback.)

---

## Paso 3 — Desplegar la app (v1.39.15)

```bash
cd /opt/orderflow
./scripts/deploy-production.sh provecchio
```

Qué hace el script (resumen):

| Fase | Acción |
|---|---|
| 1 | Verifica que el repo local esté limpio y en `main` (hace `git stash` + `git push` en el servidor) |
| 2 | `rsync` del código a `/srv/orderflow` |
| 3 | Diagnóstico previo: disco, Docker, red, compose, variables, connectivity |
| 4 | `docker compose build` + `up -d --build` (con `CACHE_BUST=$(cat VERSION)` → regenera el cliente Prisma) |
| 5 | `prisma migrate deploy` **dentro** del contenedor backend |
| 6 | Health checks (SSH y, si falla, HTTP público) |
| 7 | QA E2E con Playwright contra `https://provecchio.com` (4 secciones) |
| 8 | Limpieza de imágenes/cache y rotación de backups (conserva 3) |

**Espera 12–18 min**: el build del backend rehace `npm ci` + `tsc` porque cambió
la versión del `package.json` (esto es lo que dispara el `CACHE_BUST`).

Durante el build, **el sitio está caído** (~10 min): el script quita los
contenedores antes de reconstruir. Es el comportamiento habitual del script.

Verificación:

```bash
curl -s https://provecchio.com/api/v1/health
# {"version":"1.39.15", ... "status":"ok"}
```

---

## Paso 4 — Desplegar el addon del Odoo 14

El addon añade la ruta `/api/omniflow/transfer_table_order` (transferencia a
cliente: `partner_id` + `table_id = False`). **Sin este paso, la parte de Odoo
del traspaso de la cuenta abierta falla con 404** (el flujo de OrderFlow sigue
funcionando).

```bash
cd /opt/orderflow
./scripts/deploy-odoo-addon.sh --apply --host 192.168.69.246
```

Qué hace:

1. **Backup** del addon actual y del `odoo.conf` en `/opt/odoo/backups/`
   (`pos_omniflow_sync_<timestamp>.tar.gz`).
2. Copia la versión del repo (`odoo-adapter/odoo-addons/pos_omniflow_sync/`).
3. `docker restart odoo_web_8081` (**~30 s de corte del POS**; las sesiones
   abiertas sobreviven porque están en BD y el frontend reconecta solo).
4. Espera de salud y limpieza de `__pycache__`.

Sin `--apply` es un **dry-run** (no toca nada).

Rollback si algo va mal:

```bash
ssh root@192.168.69.246 "
  cd /opt/odoo/addons && rm -rf pos_omniflow_sync && \
  tar xzf /opt/odoo/backups/pos_omniflow_sync_<timestamp>.tar.gz && \
  docker restart odoo_web_8081
"
```

---

## Paso 5 — Verificación

### 5.1 Salud y versión

```bash
curl -s https://provecchio.com/api/v1/health
ssh root@192.168.69.240 "docker ps --format '{{.Names}} | {{.Status}}'"
# Los 7 contenedores de OrderFlow deben estar "healthy"
```

### 5.2 E2E del KDS en tiempo real (bug #5)

```bash
cd /opt/orderflow
JWT=$(curl -s -X POST https://provecchio.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"marcelo@pesallaccia.com","password":"Provecchio2026!"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['accessToken'])")

cd frontend
node e2e/kds-ticket-notification.cjs https://provecchio.com provecchio-dimora-001 "$JWT" \
  "$(cat /tmp/token.txt)" b0b55949-b1a7-4f8d-be27-9bd981e759e9
```

**Esperado:**

```text
[kds-e2e] Socket conectado, uniendose a la sala del tenant...
[kds-e2e] Enviando a cocina...
[kds-e2e] EVENTO kds:ticket_new recibido: {"orderId":"...","station":"Cocina",...}
[kds-e2e] OK: el KDS recibe la comanda automaticamente
```

> Si el `token` de mesa no está en `/tmp/token.txt`, se obtiene con:
> `docker exec orderflow_db psql -U orderflow -d orderflow_db -t -c "select token from restaurant_tables where \"tableNumber\"='G5';"`

### 5.3 Comprobación manual en el KDS

1. Abre `https://provecchio.com/admin/kds` en la tablet de cocina.
2. Desde el POS del mozo (`/admin/gastro/pos/<id-de-mesa>`), envía un pedido a cocina.
3. **La comanda debe aparecer sola**, con sonido y aviso, sin pulsar "Sincronizar Todo".

### 5.4 Cuenta abierta (FEAT-190) y addon de Odoo

En `/admin/gastro/tables` → abre una mesa con pedido → "4. Cerrar cuenta y liberar mesa" →
indica la persona. Comprueba:

- La mesa queda **LIBRE** y el pedido aparece en `/admin/gastro/cashier` como
  **"Cuenta abierta"** (con persona, mesa de origen y sesión).
- En el ERP (Odoo 14): el `pos.order` queda con `partner_id` = cliente y **sin mesa**.

---

## Paso 6 — Si algo falla

| Síntoma | Causa probable | Acción |
|---|---|---|
| "Docker storage: Only X G available" | Espacio insuficiente | Paso 2 (prune) |
| "Backend health check failed after 60s" | El backend tarda en arrancar | Espera 60 s más y comprueba `docker logs orderflow_backend` |
| "Playwright E2E QA failed" | Un módulo admin no carga | Revisa `docker logs orderflow_frontend` y `orderflow_backend` |
| El KDS sigue sin actualizarse solo | El navegador tiene la versión anterior cacheada | `Ctrl+Shift+R` en la tablet |
| El addon de Odoo no responde | Odoo reiniciándose o addon con error | `docker logs odoo_web_8081` y revisa `/opt/odoo/backups/` |
| `git push` falla en el script | El remoto usa SSH y el puerto 22 está filtrado | El remoto ya está en **HTTPS** (`git remote -v` → `https://github.com/marcelompz/orderflow.git`) ✅ |

Rollback de la app:

```bash
cd /opt/orderflow
ls deploy-artifacts/rollback-provecchio-*.env   # snapshot de variables
# revert al commit anterior en el servidor y reconstruir:
ssh root@192.168.69.240 "cd /srv/orderflow && git log --oneline -3"
```

---

## Incidente registrado: el Traefik de Provecchio cae con el deploy

**Síntoma:** tras el deploy de la v1.39.15, `https://provecchio.com` devolvía
**HTTP 521** (Cloudflare: el origen no responde) aunque los 8 contenedores de
OrderFlow estaban levantados y el backend respondía 200 por dentro.

**Causa raíz (dos factores):**

1. El `cleanup` del deploy ejecuta `docker container prune -f`, que borra **todo
   contenedor detenido**. El Traefik de Provecchio **no forma parte del proyecto
   compose de OrderFlow**: vive en `/srv/traefik` (compose propio) y lo levanta
   `restart: unless-stopped`. Si cae durante el build (el servidor es pequeño y
   el build satura la RAM), el prune se lo lleva y **nadie lo vuelve a levantar**.
2. El health check del deploy solo miraba el contenedor del backend: aunque el
   proxy estuviera caído, el backend estaba sano → el deploy "pasaba" y el sitio
   se quedaba sin entrada durante 25 minutos.

**Corrección aplicada en `scripts/deploy-production.sh`:**

- El prune ya no toca el proyecto de Traefik:
  `docker container prune -f --filter 'label!=com.docker.compose.project=traefik'`.
- Tras el `up -d --build` se ejecuta un paso idempotente que asegura el proxy:
  `cd /srv/traefik && docker compose up -d`.
- Si el health check público no responde, se restaura Traefik y se reintenta.

**Restauración manual (si vuelve a pasar):**

```bash
ssh root@192.168.69.240 "cd /srv/traefik && docker compose up -d"
curl -s https://provecchio.com/api/v1/health
```

> Nota: el `IPQoS none` en `~/.ssh/config` (equipo 192.168.69.40) no es un
> firewall: OpenSSH marcaba los paquetes con DSCP `ef` (expedited forwarding) y
> el punto de acceso WiFi los descartaba en silencio, con un síntoma idéntico
> ("Connection timed out") al de un ban.

---

## Anexo — Comandos de solo lectura para diagnosticar

```bash
# Estado de la app
curl -s https://provecchio.com/api/v1/health
ssh root@192.168.69.240 "docker ps --format '{{.Names}} | {{.Status}}'"
ssh root@192.168.69.240 "docker logs --tail 50 orderflow_backend"

# Métricas del sync a Odoo
curl -s https://provecchio.com/metrics | grep '^odoo_sync'

# Cola de BullMQ
ssh root@192.168.69.240 "docker exec orderflow_redis redis-cli -a <REDIS_PASSWORD> llen odoo-table-sync"

# ERP
ssh root@192.168.69.246 "docker ps --format '{{.Names}} | {{.Status}}'"
ssh root@192.168.69.246 "docker logs --tail 50 odoo_web_8081"

# Pedidos de prueba pendientes de limpiar (tras las pruebas)
ssh root@192.168.69.240 "docker exec orderflow_db psql -U orderflow -d orderflow_db -c \
  \"select id, status, \\\"createdAt\\\" from orders where \\\"createdAt\\\" > now() - interval '2 hours';\""
```
