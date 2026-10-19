# Odoo 14 responde "Test Page" en el puerto 80 y el adapter falla con "database does not exist"

## Síntomas

1. Al abrir `http://192.168.69.246:80` (el host de Odoo 14) responde la página por defecto de Nginx:

   ```
   <title>Test Page for the Nginx HTTP Server on Red Hat Enterprise Linux</title>
   ```

   pero `http://192.168.69.246:8081/web/login` sí devuelve el login de Odoo 14.

2. El `odoo-adapter` responde `success: false` en `/test-connection` con el error:

   ```
   Odoo authentication failed: XML-RPC fault: ...
   psycopg2.OperationalError: connection to server at "db_odoo_5433" failed:
   FATAL: database "wellnesscoffee" does not exist
   ```

3. `https://odoo14.provecchio.com` responde 404 o página de test en lugar del ERP.

## Causa raíz

Son **dos problemas independientes** en el mismo camino (Odoo 14 → Nginx → Traefik → OrderFlow):

### A) Nginx: el `default_server` captura los requests

El host `192.168.69.246` (CentOS Stream 8) tiene Nginx 1.14.1 con el vhost correcto en
`/etc/nginx/conf.d/odoo14.conf` (proxy a `127.0.0.1:8081`), **pero** `nginx.conf` declaraba
otro `server` con `server_name _;` y `listen 80 default_server;` que servía
`/usr/share/nginx/html` (la "Test Page").

Traefik y las llamadas por IP pura envían un `Host` que no coincide con
`odoo14.provecchio.com|local`, así que ganaba el `default_server` y se servía la página de test.
El vhost de Odoo solo respondía cuando el `Host` coincidía exactamente.

### B) Nombre de base de datos desactualizado en el `odoo-adapter`

`docker-compose.yml` (y el compose de producción) configuraban:

```yaml
ODOO_HOST: 192.168.69.246
ODOO_PORT: 8081
ODOO_DB: wellnesscoffee      # <-- no existe
```

En el contenedor `odoo_web_8081` (odoo:14.0) con `odoo.conf` (`db_name` vacío, `dbfilter` vacío,
`list_db = True`) y el postgres `db_odoo_5433`, la **única base de datos de negocio existente es
`prod`**:

```bash
docker exec db_odoo_5433 psql -U odoo -d postgres -tAc \
  "SELECT datname FROM pg_database WHERE datistemplate=false;"
# postgres
# prod
```

Por lo tanto, toda llamada XML-RPC del adapter (usuarios, productos, empleados, facturas)
fallaba con `database "wellnesscoffee" does not exist`.

## Solución aplicada

### A) Nginx: el vhost de Odoo pasa a ser el servidor por defecto

En `192.168.69.246` (respaldos: `nginx.conf.bak.<timestamp>` y `conf.d/odoo14.conf.bak.<timestamp>`):

1. `nginx.conf`: el bloque catch-all pierde `default_server` y su `server_name _;` se renombra a
   `catchall.orderflow.invalid` (evita el warning *"conflicting server name \_"*).
2. `conf.d/odoo14.conf`: el vhost pasa a `listen 80 default_server;` +
   `listen [::]:80 default_server;`, agrega `proxy_set_header Host $host;`,
   `proxy_set_header Upgrade/Connection` (bus WebSocket) y `client_max_body_size 100M;`.
3. Validación y recarga:

```bash
nginx -t && nginx -s reload
```

> Nota: Nginx aquí es **solo el upstream del host Odoo**, no el edge. El edge sigue siendo Traefik
> (Regla #4 de `AGENTS.md`): Traefik continúa apuntando a `http://192.168.69.246:80`.

### B) Adapter: nombre de base de datos correcto

```yaml
ODOO_DB: prod
```

Aplicado en `docker-compose.yml` (local) y `odoo-adapter/test-xmlrpc.js`.
**Pendiente de paridad en producción**: el `orderflow_odoo_adapter` del servidor Provecchio
(192.168.69.240) sigue con `ODOO_DB=wellnesscoffee` y necesita redeploy con autorización (§9).

## Verificación

```bash
# Nginx sirve Odoo por IP, por Host y por puerto directo
curl -s -o /dev/null -w "%{http_code}\n" http://192.168.69.246:80/web/login          # 200
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: odoo14.provecchio.local" \
     http://192.168.69.246:80/web/login                                               # 200
curl -s -o /dev/null -w "%{http_code}\n" http://192.168.69.246:8081/web/login        # 200
curl -sk -o /dev/null -w "%{http_code}\n" https://odoo14.provecchio.com/web/login   # 200

# XML-RPC con la base correcta
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"host":"192.168.69.246","port":8081,"db":"prod","username":"soporte@crossnexion.com","password":"***"}' \
  http://localhost:3005/test-connection
# {"success":true,"uid":2,"user":{"name":"Administrator",...}}

# Lectura real de datos maestros
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"host":"192.168.69.246","port":8081,"db":"prod","username":"soporte@crossnexion.com","password":"***"}' \
  http://localhost:3005/sync/hr/departments/fetch
# {"success":true,"records":[{"id":1,"name":"Administración",...}]}
```

## Resolución DNS local

`odoo14.provecchio.local` no existe en `/etc/hosts` de la máquina de desarrollo, por eso el
`curl` devolvía `000` (fallo de resolución, no de routing). Con la entrada

```
127.0.0.1 odoo14.provecchio.local
```

el router de Traefik resuelve y responde 200 (verificado con
`curl --resolve odoo14.provecchio.local:443:127.0.0.1`).
