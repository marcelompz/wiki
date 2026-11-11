# 193 — El build de `production` falla con `COPY VERSION ./: not found` y deja el sitio en 502

**Fecha:** 2026-10-22
**Componente:** `scripts/deploy-production.sh` / `backend/Dockerfile.prod` / target `production` (Hetzner)
**Estado:** ✅ Resuelto

## Síntoma

`./scripts/deploy-production.sh production` aborta en la etapa final de la imagen del backend:

```
#26 [backend stage-1  9/12] COPY VERSION ./
#26 ERROR: failed to calculate checksum of ref ...: "/VERSION": not found
target backend: failed to solve: failed to compute cache key: "/VERSION": not found
```

El fallo ocurre **después** de que el script elimina los contenedores previos
(`docker compose rm -f`), por lo que `pesallaccia.com` queda en **502** sin backend ni frontend.

## Causa raíz

`docker-compose.prod.yml` compila el backend con `context: ./backend`, de modo que el contexto de
build es `/srv/orderflow/backend`. Pero `Dockerfile.prod` hace `COPY VERSION ./`, y el archivo
`VERSION` vive en la **raíz** del repositorio (`/srv/orderflow/VERSION`). Fuera del contexto de build,
Docker no puede resolverlo.

El target `provecchio` no lo sufre porque usa otro par compose/Dockerfile que no copia `VERSION`.
El target `production` (Hetzner) no se desplegaba desde hacía varias versiones, así que el defecto
estaba latente.

## Solución aplicada

En `scripts/deploy-production.sh`, inmediatamente después del rsync y del `chmod` de scripts, se
copia el `VERSION` de la raíz al contexto de build del backend **en el servidor remoto**:

```bash
echo "[SYNC] Copiando VERSION al contexto de build del backend..."
ssh ${SSH_OPTS} "root@${REMOTE_HOST}" \
  "cp -f ${REMOTE_DIR}/VERSION ${REMOTE_DIR}/backend/VERSION 2>/dev/null && echo '[OK] backend/VERSION listo' || echo '[WARN] No se pudo copiar VERSION'"
```

Commit: `fc242ffb` — `fix(deploy): copiar VERSION al contexto de build del backend`.

## Verificación

- `bash -n scripts/deploy-production.sh` → OK.
- Re-ejecución del deploy: el build del backend avanza más allá de la capa 9/12.
- `pre-deploy-diagnostic.sh` valida además que no queden contenedores huérfanos antes de borrarlos.

## Notas

- El `VERSION` copiado a `backend/VERSION` **no** se commitea (se genera en el servidor en cada
  deploy); `check-version-sync.sh` valida explícitamente que `backend/VERSION` **no exista** en el
  repo.
- Si en el futuro se cambia el `context` del servicio `backend` a la raíz del repo, este `cp` deja de
  ser necesario pero sigue siendo inocuo.
- Relacionado: la primera re-ejecución abortó además por disco (`4.8G < 5G`), ver
  `docs/troubleshooting/194-deploy-abortado-por-disco-build-cache.md`.
