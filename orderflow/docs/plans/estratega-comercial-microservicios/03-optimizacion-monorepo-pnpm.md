# Plan de Optimización de Espacio en Monorepo — PNPM Workspaces

> **Estado: Fase 1 implementada** (rama `feat/devops-pnpm-workspaces`, FEAT-212).
> Resultado medido en checkout fresco: **1.6 GB con `node_modules` por proyecto de
> solo KBs** (symlinks), store global compartida por hardlinks (~1.5 GB reales)
> vs ~4.2 GB que ocupaban los `node_modules` npm duplicados por proyecto.

## 🔍 Causa Raíz del Peso Original

Con npm, cada proyecto instalaba su propio `node_modules` completo:
- `services/`: 2.1 GB (7+ carpetas `node_modules` independientes).
- `backend/`: 754 MB (`node_modules` de 743 MB).
- `frontend/`: 656 MB (`node_modules` de 637 MB).
- `mobile/`: 529 MB (`node_modules` de 523 MB).

Las mismas dependencias (NestJS, React, Prisma, TypeScript, Jest) se
descargaban y descomprimían una vez por proyecto.

---

## 🛠️ Implementación (Fase 1)

### Archivos introducidos

| Archivo | Contenido |
| :--- | :--- |
| `pnpm-workspace.yaml` | Importers: `backend`, `frontend`, `mobile`, `desktop`, `odoo-adapter`, `packages/*`, `services/*`. Excluye los 3 symlinks a repos externos (`omnicrm`, `omnisites`, `omnivector`) y los 3 aliases internos (`omnibookings`, `omnicatalog`, `omnilinks`) — pnpm los descubría como importers duplicados. Incluye `onlyBuiltDependencies` para los binarios nativos que requieren build scripts (`bcrypt`, `sharp`, `esbuild`, `prisma`, `@prisma/client`, `ssh2`, `cpu-features`, `msgpackr-extract`, `core-js`). |
| `.npmrc` | `node-linker=isolated` estricto + `auto-install-peers=true` + `strict-peer-dependencies=false`. Sin `shamefully-hoist` (solo como rollback documentado). |
| `package.json` (raíz) | `name: "orderflow"`, `packageManager: "pnpm@10.34.9"` (activación vía corepack, sin instalación global). Elimina la dependencia huérfana `react-qr-code` (documentada en `P0_REMEDIATION_PLAN` L310). |
| `pnpm-lock.yaml` | Lockfile único raíz (lockfileVersion 9.0). |
| `scripts/fix-pnpm-links.sh` | Curación del bug de symlinks de pnpm 10 (ver abajo). |

### Decisión de versión: pnpm 10.34.9

- pnpm 12.18.0 (latest) distribuye **binario nativo** incompatible con el
  corepack 0.24.0 que trae node 20 (`Cannot find module .../bin/pnpm.cjs`).
- pnpm 11.28.11 funciona con corepack pero **requiere node ≥ 22**; el entorno
  local tiene node 20.19.2 y falla con `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING`.
- pnpm 10.34.9 (última de la línea 10) soporta `onlyBuiltDependencies` en el
  workspace y funciona con node 20 + corepack 0.24.

### Dependencias fantasma declaradas (cero drift)

`node-linker=isolated` expone imports que solo resolvían "de rebote" por el
hoisting de npm (transitivas elevadas). Se declararon como dependencias
directas con **la misma versión que ya estaba lockeada** — el lockfile npm
regenerado resuelve exactamente lo mismo que antes:

| Proyecto | Dependencia | Razón |
| :--- | :--- | :--- |
| `backend` | `socket.io@^4.8.1` | Importado en gateways; antes transitiva de `@nestjs/platform-socket.io`. |
| `backend` | `cron@^4.4.0` | Importado en `BackupsService`; antes transitiva de `@nestjs/schedule`. |
| `backend` | ~~`@types/cron@^2.0.1`~~ (eliminada) | 2.x es un stub sin `index.d.ts`; cron 4 trae tipos propios. Solo enmascaraba TS2688. |
| `frontend` | `dayjs@^1.11.21` | 10 archivos lo importan; antes transitiva de antd. |
| `mobile` | `@types/node@^26.6.2` | `useBiometric.ts` usa `Buffer`; antes transitiva de Expo. |
| 8 services standalone | `express@^4.22.1` | Controllers importan `Request/Response`; antes transitiva de `@nestjs/platform-express`. |
| `whatsapp-catalog-standalone` | `@nestjs/testing@^10.0.0` (dev) | `.spec.ts` en `src/`; sus hermanos ya la declaraban. |

### Bug de pnpm 10.34.9: symlinks con profundidad errónea

**Reproducido empíricamente**: en la primera instalación desde `node_modules`
vacío, los paquetes compartidos entre importers de distinta profundidad
(`backend/` a profundidad 1 vs `services/<x>/` a profundidad 2) reciben el
target relativo calculado para el primer importer procesado. En `backend`
quedan links con un `../` de más que resuelven a `/opt/node_modules/...`
(inexistente). Instalaciones posteriores conservan los links sanos.

**Curación** (`scripts/fix-pnpm-links.sh`, idempotente): detectar links rotos
con `find -type l ! -exec test -e`, borrarlos y ejecutar `pnpm install`, que
los recalcula correctamente. Ejecutar tras todo clone/instalación fresca.

### Resultados de disco

| Métrica | npm (antes) | pnpm isolated (después) |
| :--- | :--- | :--- |
| Peso total del checkout | ~4.2 GB | 1.6 GB |
| `node_modules` por proyecto | 500–750 MB | KBs (symlinks) |
| Consumo real de disco | ~4.2 GB | ~1.5 GB (store en `~/.local/share/pnpm/store/v10`, hardlinks — mismo filesystem) |
| Tiempo de instalación | — | ~3 min frío, ~45 s con store tibia, ~11–30 s incremental |

---

## ⚠️ Restricción arquitectónica: Prisma + `node-linker=isolated`

El stub de `@prisma/client` hace `require('.prisma/client/default')`, que Node
resuelve **por realpath** hasta la instancia compartida en
`node_modules/.pnpm/@prisma+client@<versión>/`. Consecuencia: existe **un solo
slot físico de cliente generado por versión de `@prisma/client`** y "último
`prisma generate` gana" (bajo npm cada proyecto tenía su copia en su propio
`node_modules`).

Situación por proyecto:

| Proyecto | Impacto |
| :--- | :--- |
| `backend` | Determinista: generar antes de construir/probar (igual que siempre). |
| `odoo-adapter` | Sin impacto en runtime: usa `pg` crudo (`Pool`), nunca importa el cliente Prisma. |
| 9 services standalone (output `../node_modules/.prisma/client`) | Su output custom queda **invisible** bajo pnpm (el realpath del stub escapa del `node_modules` del importer) → el runtime local resolvería el slot compartido. **No afecta Docker** (adentro del build cada proyecto instala con npm en directorios reales y el patrón funciona igual que siempre). |
| `omnibi-standalone` | ✅ Patrón correcto ya en el repo: `output = "../node_modules/@prisma/omnibi-client"` + `import { PrismaClient } from '@prisma/omnibi-client'`. El import directo resuelve desde el propio `node_modules` del importer (sin realpath escape). |

**Trabajo de fase 2**: migrar los 9 services al patrón omnibi (output con
nombre propio + import directo). No requiere cambios en fase 1 porque su
runtime local no estaba en el alcance y los Docker builds son los vehicles
reales de despliegue.

---

## ✅ Validaciones (FEAT-212)

| Validación | Resultado |
| :--- | :--- |
| `pnpm install` (isolated estricto, workspace completo) | ✓ 1.6 GB |
| `prisma generate` backend + nativos (bcrypt/sharp/msgpackr-extract) | ✓ |
| Build backend (`nest build`, requiere `NODE_OPTIONS=--max-old-space-size=4096` — mismo workaround que ci.yml) | ✓ `dist/src/main.js` |
| Jest backend (orders + auth) | ✓ 42/42 |
| Build frontend (tsc + vite + PWA) | ✓ dist fresco |
| Typecheck mobile (`tsc --noEmit`) | ✓ 0 errores |
| Build `bookings-standalone` desde cero | ✓ dist carga en Node |
| `scripts/fix-pnpm-links.sh` | ✓ 0 links rotos |
| `scripts/check-version-sync.sh` | ✓ 1.46.2 |
| Deploy staging homeserver (`scripts/deploy-staging-homeserver.sh`) | ✓ `feat/devops-pnpm-workspaces@257a863c`. `npm ci` de los builds Docker reconstruidos desde cero (backend 13 min/1073 paquetes, frontend 12 min/1493 — los locks regenerados resuelven limpio); backend `nest build` + `prisma generate` ✓, imagen nueva (digest `8add315c`) y contenedor **recreado** healthy. Frontend 200, `/api/v1/health` → `version: 1.46.2` con database+odoo ok, redirect HTTP→HTTPS 301, enrutamiento k3s reaplicado, Ingress de qBittorrent (`torrents/qbittorrent-ingress`) intacto. Nota: la imagen de frontend quedó contenido-idéntica (los cambios eran solo declaraciones de deps ya presentes en el bundle) y compose mantuvo el contenedor — comportamiento esperado |
| Barrera `./scripts/init.sh` completa | ✓ (dos pasadas, mismo árbol): corrida completa — checks de endpoints públicos ✓, `prisma generate` ✓, **Jest 1061/1061 (140 suites)** ✓, builds backend/frontend ✓ (frontend + PWA, 86 entradas). El paso E2E requiere el módulo Python `playwright` a nivel host (no del repo; en CI lo provee `qa_e2e.yml`): instalado y re-ejecutado con `--only-e2e` → catálogo público sin imágenes rotas, dominio sin errores JS de consola, sanidad auth/DB sin HTTP 500 y 8 rutas `/admin/*` verificadas → `VALIDATION SUCCESSFUL` |

---

## 📋 Trabajo restante (Fase 2)

1. **CI**: migrar `ci.yml` de `npm ci` a `pnpm install --frozen-lockfile` por
   proyecto (o workspace completo) y cachear la store.
2. **Docker builds**: adoptar pnpm con `pnpm fetch`/deploy patterns o mantener
   npm (decisión pendiente; hoy los `package-lock.json` se conservan y los
   builds no se tocan).
3. **Prisma**: patrón omnibi en los 9 services standalone (ver sección
   arquitectónica).
4. **`desktop`**: roto PRE-pnpm (nunca tuvo lockfile, `react-router-dom`
   nunca fue dependencia, faltan tipos `vite/client`, `setLastShortcut` sin
   usar en `App.tsx`). Corregir al retomar la vertical.
5. **Rollback documentado**: si el tooling lo exige, `shamefully-hoist=true`
   en `.npmrc` replica el layout npm (no es necesario a la fecha).
