# #207 — Backend prod en restart loop: `Cannot find module '@common/prisma.service'` (MODULE_NOT_FOUND por path aliases sin resolver, 502 en todos los endpoints)

> **Fecha:** 2026-10-27 · **Vertical:** Core / Infra & Deploy · **Relacionados:** §5 del informe de corrección Provecchio, `docs/info/INFORME_CORRECCION_PROVECCHIO_2026-10-27.md` · **Impacto:** 502 en TODO el backend (auth, health, uploads) mientras el contenedor estaba en restart loop

## Síntoma

En `https://provecchio.com` (`srv/orderflow`, servidor Provecchio `192.168.69.240`), todos los endpoints retornaban **502 Bad Gateway**. `docker logs orderflow-backend-prod` mostraba restart loop con:

```
Error: Cannot find module '@common/prisma.service'
Require stack:
- /app/dist/tags/tags.service.js
- /app/dist/products/products.service.js
...
```

## Causa raíz

`tsc` (y por tanto `nest build`) **no reescribe los path aliases** de TypeScript en el JS emitido. El bundle de producción conserva `require('@common/prisma.service')` literal (definidos en `tsconfig.json`: 18 aliases `@common/*`, `@products/*`, `@orders/*`, etc.). En local Nest usa `tsconfig-paths` vía `ts-node`/`nest start --watch`, pero el arranque de producción (`node dist/main.js`) no registra nada → el primer require de un alias crashea y Docker entra en restart loop.

Agravantes detectados en el incidente del 26-oct:

- El fix se aplicó **efímero dentro del contenedor** (creando `/app/bootstrap.js` a mano + instalando `tsconfig-paths` con `npm i` en el contenedor). El siguiente rebuild lo perdía.
- Dist layouts distintos existen en distintos builds: plano (`dist/main.js`, el del servidor) vs anidado (`dist/src/main.js`, build local) — un `baseUrl` hardcodeado a uno solo rompe el otro.

## Solución aplicada (2026-10-27, v1.43.5)

1. **`backend/bootstrap.js` (nuevo):** registra `tsconfig-paths` con los 18 aliases (targets con el prefijo `src/` removido) y **auto-detecta el layout de dist**:
   - existe `dist/main.js` → `baseUrl = /app/dist` (layout plano, servidor)
   - existe `dist/src/main.js` → `baseUrl = /app/dist/src` (layout anidado, build local)
   Luego hace `require(main.js)`.
2. **`backend/entrypoint.sh`:** arranque via `exec node /app/bootstrap.js` (mantiene `prisma migrate deploy` previo y el modo "provided command").
3. **`backend/Dockerfile.prod`:** `COPY bootstrap.js /app/bootstrap.js` en el stage final.
4. **`backend/package.json`:** `tsconfig-paths@^4.2.0` en `dependencies` (runtime, no devDep) + `start:prod: node bootstrap.js`.
5. Los **network aliases** `orderflow_backend`/`orderflow_frontend` en `traefik-public` (falso "host not found" de Traefik tras el rebuild) ya estaban persistidos en `docker-compose.prod.yml` — verificar tras cada `up -d --build`: `docker inspect orderflow-backend-prod --format '{{json .NetworkSettings.Networks.traefik-public.Aliases}}'`.

```javascript
// Resección mínima del fix (ver bootstrap.js completo en backend/)
tsconfigPaths.register({
  baseUrl, // dist/ o dist/src según exista main.js
  paths: { '@common/*': ['common/*'], '@products/*': ['products/*'], /* + 16 más */ },
});
require(main);
```

## Prevención

1. **Prohibido aplicar el fix a mano dentro del contenedor** (bootstrap + npm install efímero). Todo fix debe entrar por el código fuente → branch → build.
2. Tras agregar un alias nuevo a `tsconfig.json`, **agregarlo también a `backend/bootstrap.js`** (los 2 deben espejarse; `@test/*` incluido, no rompe en runtime aunque no exista en dist).
3. Smoke pre-deploy del contenedor: `docker compose -f docker-compose.prod.yml up -d backend && sleep 10 && docker logs --tail 5 orderflow-backend-prod` — no debe ver `Cannot find module '@...` antes de considerar el deploy upgrade.
4. Si aparece el sintoma en el servidor, chequear PRIMERO si el contenedor corre con la imagen actual (fix persistido) o con una imagen previa al 27-oct: `docker image inspect orderflow-backend --format '{{.Created}}'`.
