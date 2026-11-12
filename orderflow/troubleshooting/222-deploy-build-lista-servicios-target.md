# 222 — `[FAIL] build postgres: no such service` en `deploy-production.sh`

## Síntoma

En el deploy a producción (`production`, Hetzner) el log muestra un build fallido
que no corresponde a ningún servicio del stack:

```
[BUILD] postgres...
[FAIL] build postgres fallo (log: /srv/orderflow/deploy-artifacts/build-postgres.log)
no such service: postgres
[BUILD] backend...
[OK] backend built
```

El deploy continúa y termina bien porque `postgres` no es un servicio crítico
(`backend`/`frontend` sí lo son), pero el log queda con un falso error y el
chequeo de "build crítico" pierde señal.

## Diagnóstico

El loop de build serializado resolvía la lista de servicios así:

```bash
for svc in $(docker compose config --services 2>/dev/null); do
  ...
  docker compose -f docker-compose.prod.yml --env-file .env build "$svc"
```

Las dos invocaciones no usan los mismos archivos de compose:

| Invocación | Compose que resuelve |
| :--- | :--- |
| `docker compose config --services` | `docker-compose.yml` (default del directorio) |
| `docker compose -f docker-compose.prod.yml ... build` | solo `docker-compose.prod.yml` |

En Hetzner el `docker-compose.yml` por defecto define `postgres`, mientras que
`docker-compose.prod.yml` define `database` (imagen `postgres:15-alpine`). El loop
lista `postgres` y luego intenta construirlo contra un compose donde ese nombre no
existe → `no such service`.

En Provecchio la lista por defecto coincidía por casualidad con los servicios del
target, así que el error no aparecía; el riesgo real era el drift: cualquier
servicio presente solo en el compose del target (por ejemplo
`sync_standalone` / `omnibi_standalone` en el override) podía quedar fuera del
build y desplegarse con una imagen vieja.

## Causa raíz

La lista de servicios se resolvía con el compose **por defecto**, no con el par
`-f`/`--env-file` del target. Es un caso de "dos fuentes de verdad" para el mismo
stack: los nombres pueden diferir (`postgres` vs `database`) y los servicios del
override no aparecen.

## Solución aplicada (2026-11-12)

En `scripts/deploy-production.sh`:

1. Resolver la lista con **los mismos flags del target**:
   `SERVICE_LIST=$(${COMPOSE_REL} config --services ...)`.
2. Abortar si la lista queda vacía (una lista vacía saltearía todos los builds y
   desplegaría imágenes viejas: falso deploy exitoso).
3. Loggear la lista resuelta al inicio del bloque de build.
4. Distinguir servicios sin contexto de build (`No services to build`) como
   `[SKIP]` en vez de `[OK] built`.

```bash
SERVICE_LIST=$(${COMPOSE_REL} config --services 2>${REMOTE_DIR}/deploy-artifacts/compose-services.err)
if [ -z "${SERVICE_LIST}" ]; then
  echo "[ABORT] No se pudo resolver la lista de servicios del target"
  cat ${REMOTE_DIR}/deploy-artifacts/compose-services.err
  exit 1
fi
for svc in ${SERVICE_LIST}; do
  ...
```

## Verificación

- `bash -n scripts/deploy-production.sh` → OK.
- Sintaxis del bloque remoto expandido (`ssh` recibe el string con los escapes
  resueltos) → OK.
- Hetzner: `docker compose -f docker-compose.prod.yml --env-file .env config
  --services` → `database odoo_adapter loki promtail alertmanager redis backend
  frontend tempo grafana` (sin `postgres`).
- Provecchio: `docker compose -f docker-compose.yml -f
  docker-compose.provecchio.yml --env-file .env.provecchio config --services` →
  incluye `backend`, `frontend`, `odoo_adapter`, `omnibi_standalone` y
  `sync_standalone`.
- Servicio image-only (`build redis`) → `No services to build`, exit 0 → se
  reporta como `[SKIP]`.

## Regla para futuros scripts de deploy

Toda invocación de `docker compose config` / `build` / `up` debe usar exactamente
los mismos `-f` y `--env-file` que el resto del script para ese target. Nunca
resolver nombres de servicios con el compose por defecto del directorio: el
servidor puede tener un `docker-compose.yml` legacy distinto del par que realmente
se despliega.
