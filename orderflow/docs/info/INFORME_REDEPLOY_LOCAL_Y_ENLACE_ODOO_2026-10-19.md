# Informe — Redploy limpio local + diagnóstico y corrección del enlace a Odoo 14

- **Fecha:** 2026-10-19
- **Versión en curso:** 1.39.10 (sin incremento: cambios de configuración/infra, no de API)
- **Rama de trabajo:** `feat/opencore-plan0-baseline` (desde `main` @ `27e76a4b`)
- **Alcance:** (1) redeploy limpio del stack local para validar la operativa real; (2) diagnóstico del enlace
  OrderFlow ↔ Odoo 14 (host `192.168.69.246`) y su corrección.

---

## 1. Contexto

El stack local llevaba **más de 5 horas en pie** con imágenes viejas, por lo que no servía como
banco de pruebas de la operativa real. Se pidió detener, purgar contenedores/imágenes del proyecto
y redesplegar desde cero. En el camino, el enlace con Odoo 14 (host `192.168.69.246`) reveló dos
problemas independientes: el routing en Nginx y el nombre de la base de datos en el `odoo-adapter`
(el mismo bug que afecta a producción).

## 2. Redploy limpio del stack local

### 2.1 Purga ejecutada (solo del proyecto OrderFlow)

| Acción | Resultado |
|---|---|
| `docker compose down --remove-orphans` | 7 contenedores del proyecto eliminados (backend, frontend, postgres, redis, odoo_adapter, standalones y restos `orderflow-database-1`) |
| `docker rmi -f orderflow-*` | 4 imágenes del proyecto eliminadas (`orderflow-backend`, `orderflow-odoo_adapter`, `orderflow-omnibi_standalone`, `orderflow-sync_standalone`) |
| `docker image prune -f` | 0 B (no había colgantes) |
| `docker builder prune -f` | **22.63 GB** de caché de build liberados |

**Intactos a propósito** (no son del proyecto o son compartidos):

- **Traefik** (`traefik-orderflow`): es el edge y sirve a `aieer`, `axon`, `qms` y otros servicios.
- Imágenes base compartidas: `node:20-alpine`, `redis:7-alpine`, `postgres:15-alpine`, `traefik:latest`.
- Volúmenes con datos: `postgres_data`, `redis_data`, `uploads_data`, `grafana/loki`, `letsencrypt`.
- Stack ajeno `freellmapi` y sus contenedores detenidos.

### 2.2 Rebuild y despliegue

```bash
# El contenedor `frontend` sirve ./frontend/dist por bind mount: hay que reconstruirlo en el host
cd frontend && rm -rf dist && npm run build

# Rebuild completo de imágenes (Regla #11 de AGENTS.md: siempre --build, nunca restart)
docker compose -f docker-compose.yml -f docker-compose.provecchio.yml \
  up --build -d postgres redis backend frontend odoo_adapter omnibi_standalone sync_standalone
```

Exclusiones deliberadas:

- `database-replica`: es solo producción (replica desde `178.105.226.175`, bind `127.0.0.1:5432`).
- Perfil `traefik-local`: el Traefik vivo es el externo.

Imágenes resultantes (todas nuevas, cache bust forzado):

```
orderflow-backend:latest            d82444f5c2bb   1.14 GB
orderflow-odoo_adapter:latest       2a897adcab85   351 MB
orderflow-omnibi_standalone:latest  9d5c7fca35fd   576 MB
orderflow-sync_standalone:latest    30a455dc3989   533 MB
```

### 2.3 Verificación del redploy

| Check | Resultado |
|---|---|
| Contenedores | 7/7 `healthy` |
| `prisma migrate deploy` (en el arranque) | 37 migraciones · `No pending migrations to apply` |
| `GET /api/v1/health` | `{"version":"1.39.10"}` · `database: ok` · `odoo_adapter: ok` |
| Redis / Socket.IO | `RedisIoAdapter initialized successfully` · `Analytics Cache initialized on Redis redis:6379` |
| Traefik `provecchio.local` | `/`, `/social-catalog`, `/admin` → 200 `text/html` · `/api/v1/health` → 200 `application/json` |
| Standalones | `omnibi.local/api/v1/health` 200 · `sync :3015` 200 · `odoo_adapter :3005` 200 |
| Bundle servido | `index-BBMF7Z6G.js` == build local (coincidencia exacta) |
| QA E2E local (`qa_e2e_check.py`) | 4/4 SUCCESS: catálogo sin imágenes rotas, dominio sin errores JS, login sin HTTP 500, 7 rutas `/admin/*` |
| Logs de contenedores | 0 coincidencias de `error|fatal|unhandled|crash` en los últimos 200 renglones de los 5 contenedores |

**Mejora observado:** `omnibi.local` pasó de **404 → 200** (antes el standalone no estaba en pie).

## 3. Diagnóstico del enlace a Odoo 14

### 3.1 Síntomas

1. `http://192.168.69.246:80` devolvía *"Test Page for the Nginx HTTP Server on Red Hat Enterprise Linux"*.
2. `http://192.168.69.246:8081/web/login` sí devolvía el login de Odoo 14 (el contenedor publica 8081→8069).
3. `odoo14.provecchio.local` no resolvía por DNS local → `curl` con `000` (fallo de resolución, no de routing).
4. El `odoo-adapter` fallaba en toda llamada XML-RPC: `FATAL: database "wellnesscoffee" does not exist`.

### 3.2 Causas raíz (dos, independientes)

**A) Nginx: el `default_server` capturaba los requests.**
El vhost correcto ya existía en `/etc/nginx/conf.d/odoo14.conf` (proxy a `127.0.0.1:8081`), pero
`nginx.conf` declaraba otro bloque con `server_name _;` + `listen 80 default_server` que servía
`/usr/share/nginx/html`. Traefik y el acceso por IP envían un `Host` distinto a
`odoo14.provecchio.com|local`, así que ganaba el default y se servía la página de test.

**B) Nombre de base de datos obsoleto en el `odoo-adapter`.**
`docker-compose.yml` (y el compose de producción) usaban `ODOO_DB: wellnesscoffee`. En el host Odoo:

```bash
docker exec db_odoo_5433 psql -U odoo -d postgres -tAc \
  "SELECT datname FROM pg_database WHERE datistemplate=false;"
# postgres
# prod        <-- única base de negocio
```

`odoo.conf` del contenedor `odoo_web_8081` tiene `db_name` vacío, `dbfilter` vacío y
`list_db = True` → se listan todas las bases y solo existe `prod`. Por tanto, **todas** las
integraciones Odoo (usuarios, productos, empleados, facturas) fallaban con el mismo error.

### 3.3 Correcciones aplicadas

**Host Odoo `192.168.69.246`** (respaldos `nginx.conf.bak.20261019_194931` y
`conf.d/odoo14.conf.bak.20261019_194931`):

| Archivo | Cambio |
|---|---|
| `conf.d/odoo14.conf` | El vhost pasa a `listen 80 default_server;` + `listen [::]:80 default_server;`; agrega `proxy_set_header Host $host;`, `proxy_set_header Upgrade/Connection` (bus WebSocket), `client_max_body_size 100M;` |
| `nginx.conf` | El bloque catch-all pierde `default_server` y su `server_name _;` pasa a `catchall.orderflow.invalid` (evita el warning *"conflicting server name \_"*) |

```bash
nginx -t && nginx -s reload   # nginx queda "enabled": persiste tras reboot
```

> Nginx aquí es **únicamente el upstream del host Odoo**. El edge sigue siendo Traefik
> (Regla #4 de `AGENTS.md`): Traefik continúa apuntando a `http://192.168.69.246:80`.

**OrdenFlow local** (`docker-compose.yml` + `odoo-adapter/test-xmlrpc.js`):

```yaml
ODOO_HOST: 192.168.69.246
ODOO_PORT: 8081
ODOO_DB: prod        # antes: wellnesscoffee (inexistente)
```

### 3.4 Verificación del enlace

| Prueba | Resultado |
|---|---|
| `http://192.168.69.246:80/web/login` (IP directa) | **200** · Odoo (antes: Test Page) |
| `Host: odoo14.provecchio.local` en :80 | **200** · Odoo |
| `Host: odoo14.provecchio.com` en :80 | **200** · Odoo |
| `http://192.168.69.246:8081/web/login` (puerto directo) | **200** · Odoo |
| `https://odoo14.provecchio.com/web/login` (producción, con `-k`) | **200** · Odoo |
| `https://odoo14.provecchio.local/web/login` vía Traefik local | **200** · Odoo |
| XML-RPC `db=prod` por :80 y por :8081 | `uid=2` (Administrator) |
| `POST /test-connection` (adapter, `db=prod`) | `{"success":true,"uid":2,"user":{"name":"Administrator"}}` |
| `POST /sync/hr/departments/fetch` | `success: true` con datos reales: Administración, Atención… (company *Provecchio Di Mora*) |
| `POST /sync/users/fetch` → `/test-connection` con `db=wellnesscoffee` | `success: false` → `database "wellnesscoffee" does not exist` (confirma la causa raíz) |

## 4. Hallazgos colaterales

1. **Producción tiene el mismo bug de base de datos**: el `orderflow_odoo_adapter` en
   `192.168.69.240` sigue con `ODOO_DB=wellnesscoffee` → sus syncs Odoo fallan. Requiere redeploy
   con autorización explícita (AGENTS.md §9).
2. **Falta la entrada DNS local**: `127.0.0.1 odoo14.provecchio.local` en `/etc/hosts`
   (requiere sudo con password). La ruta ya responde con `curl --resolve`.
3. **`GET /sync/categories/fetch` sigue fallando** ("No fue posible obtener datos de Odoo"): es
   independiente del connectivity/DB — el método `getProductCategories` no mapea contra este Odoo 14.
4. **`odoo.provecchio.local` → 502**: el contenedor `odoo_web_18` solo existe en el host remoto.
   Correcto para local.
5. **QA local requiere ignorar el cert auto-firmado**: `qa_e2e_check.py` falla con
   `ERR_CERT_AUTHORITY_INVALID` en dominios `*.local` (en producción el cert es válido). Se validó
   con una copia temporal en `/tmp/kilo/qa_e2e_local.py` (contexto de browser con
   `ignore_https_errors=True`), **sin modificar el repositorio**.
6. **Log Ruido en el arranque del backend**: `RedisService: No disponible (REDIS_URL no configurado)`
   aparece antes de que la conexión se établir — el servicio conecta después
   (`Analytics Cache initialized on Redis redis:6379`). Revisar el orden de inicialización del módulo.

## 5. Archivos modificados

| Archivo | Cambio | Estado |
|---|---|---|
| `docker-compose.yml` | `ODOO_DB: wellnesscoffee` → `prod` | Sin commitear |
| `odoo-adapter/test-xmlrpc.js` | `wellnesscoffee` → `prod` | Sin commitear |
| `docs/troubleshooting/184-odoo14-nginx-test-page-and-odoo-db-name-mismatch.md` | Nueva entrada de troubleshooting (síntoma, causa raíz, solución, verificación) | Sin commitear |
| `docs/troubleshooting/README.md` | Índice actualizado con la entrada 184 | Sin commitear |
| `192.168.69.246:/etc/nginx/nginx.conf` | `default_server` removido del catch-all; `server_name` único | Aplicado y activo |
| `192.168.69.246:/etc/nginx/conf.d/odoo14.conf` | Vhost como default server + headers WebSocket | Aplicado y activo |

## 6. Pendientes

| # | Acción | Requiere |
|---|---|---|
| 1 | Redploy a Provecchio con `ODOO_DB=prod` en el `odoo-adapter` | Autorización explícita (§9) |
| 2 | Agregar `127.0.0.1 odoo14.provecchio.local` a `/etc/hosts` | Password sudo |
| 3 | Sincronizar `/opt/traefik-orderflow` → wiki si hay cambios de routing | Push al repo de la wiki |
| 4 | Soporte de cert auto-firmado en `scripts/qa_e2e_check.py` (para QA local reproducible) | Aprobación de cambio |
| 5 | Mapear `getProductCategories` contra este Odoo 14 | Análisis de la API del ERP |
| 6 | Commitear los cambios locales de esta sesión en `feat/opencore-plan0-baseline` | Aprobación del usuario |

## 7. Pruebas de contrato con Newman (AGENTS.md §3.3)

Newman **sí forma parte del protocolo** (`AGENTS.md` §3.3, "Pruebas de API con Newman
(Complemento a Playwright)": obligatorio cuando se modifican endpoints públicos, integraciones,
webhooks o contratos REST/WebSocket, sin reemplazar la suite Playwright).

Estado del tooling encontrado:

- Colección: `docs/tests/newman/contracts.postman_collection.json` (12 requests, **última
  actualización 2026-10-04**).
- Ambientes: `production.postman_environment.json` (baseUrl `https://api.pesallaccia.com`, sin
  secretos) y `provecchio.postman_environment.json` (baseUrl `https://provecchio.com`, con
  `MASTER_API_KEY`; `adminPassword` vacío).
- Newman instalado globalmente: **6.2.3**. No hay ambiente ni colección para **local**.

### 7.1 Ejecución contra el stack local recien desplegado

Se creó un ambiente local efímero (`/tmp/kilo/local.postman_environment.json`, fuera del repo
para no versionar secretos) con `baseUrl=https://provecchio.local`, `tenantId=provecchio-dimora-001`,
`MASTER_API_KEY` del `.env` local y las credenciales de admin. Resultado:

```
requests        12 | 0 failed
test-scripts    12 | 0 failed
assertions      13 | 6 failed
```

Los 6 fallos son **falsos negativos por colección desactualizada**, no fallas del sistema:

| # | Request de la colección | Status | Causa raíz | Endpoint real verificado |
|---|---|---|---|---|
| 1 | `GET /api/v1/public/social-catalog/{{tenantId}}` | 404 | Ruta que ya no existe | `GET /api/v1/public/social-catalog/products?tenantId={{tenantId}}` → **200** (devuelve productos reales: Americano, …) |
| 2 | `POST /api/v1/orders/:id/claim` | 401 | La colección no propaga el `accessToken` del login (solo manda `x-tenant-id`) y usa `:id` literal | La ruta existe: `api/v1/orders/:id/claim` |
| 3 | `POST /api/v1/orders/:id/send-to-kitchen` | 401 | Ídem (falta `Authorization`) | La ruta existe |
| 4 | `GET /api/v1/pos/sessions` | 404 | Ruta desactualizada | `GET /api/v1/pos-sessions/active` (401 sin token) · `POST /api/v1/pos-sessions/open` |
| 5 | `POST /api/omniflow/sync_table_order` | 404 | **Apunta al servicio equivocado**: la ruta vive en el `odoo-adapter` (`odoo-adapter/src/index.js:306`), no en el core | `POST http://<odoo-adapter>:3005/api/omniflow/sync_table_order` |
| 6 | `POST /api/v1/integrations/odoo/order-paid` | 404 | Ruta que no existe en el core | `GET /api/v1/integrations` (401 sin token) |

Requests que sí pasaron: health (2 asserts), login con `accessToken`, webhook sin API key → 401,
webhook con `x-api-key` → 201, KDS público → 200, guest order draft → 200/400.

### 7.2 Plan de actualización de la colección (pendiente de aprobación)

1. **Propagar autenticación**: script `prerequest` a nivel de colección que toma
   `pm.response.json().accessToken` del login y lo guarda en `accessToken`; las requests
   autenticadas pasan a enviar `Authorization: Bearer {{accessToken}}`.
2. **Corregir la ruta del catálogo público** a `/api/v1/public/social-catalog/products?tenantId={{tenantId}}`.
3. **Corregir POS sessions** a `/api/v1/pos-sessions/active` (o `POST /api/v1/pos-sessions/open`).
4. **Reapuntar el sync de Odoo** al `odoo-adapter` con una variable `adapterBaseUrl`
   (`http://localhost:3005` en local, `http://orderflow_odoo_adapter:3005` en red Docker) y
   validar además `GET /health` del adapter.
5. **Reemplazar `order-paid`** por el contrato real de integraciones (`GET /api/v1/integrations`).
6. **Agregar el ambiente local** `docs/tests/newman/local.postman_environment.json` (sin secretos
   versionados: referencia a variables de entorno) y documentar el comando en
   `docs/tests/newman/README.md`.
7. Volver a ejecutar la colección contra **local** y **provecchio.com**, y registrar el resultado
   en el informe de auditoría de la vertical afectada.

## 8. Referencias

- Troubleshooting: `docs/troubleshooting/184-odoo14-nginx-test-page-and-odoo-db-name-mismatch.md`
- Vertical OpenCore: `docs/plans/opencore/`
- Backlog del cliente: `docs/plans/omnigastro/BACKLOG_CLIENTE_20261019.md`
- Colección Newman: `docs/tests/newman/contracts.postman_collection.json` (AGENTS.md §3.3)
