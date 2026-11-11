# Plan de Remediación P0 — OrderFlow / OmniFlow

> **Estado:** 🟢 BLOQUE SEGURO COMMITEADO Y CI VERDE (2026-11-08, rama `fix/p0-secrets-hardening`, PR #26 en draft) — pendientes rotación de credenciales, purga de historia y deploy con autorización explícita (AGENTS.md reglas 9, 15 y 16).
> **Fecha:** 2026-11-07
> **Base analizada:** `main` @ `bd47825d` · `VERSION` 1.46.1
> **Versión objetivo:** `1.46.2` (patch de hardening; no introduce features)
> **Alcance:** seguridad de credenciales, CI bloqueante y fuente única de versión.
> **Fuera de alcance:** refactor de schema (FEAT-177–182), upgrades de majors, K8s, HA. Esos van a P1/P2.

> ⚠️ **Nada de este plan se ejecuta sin aprobación.** En particular, la rotación de credenciales y los reinicios de contenedores en producción requieren **autorización separada y explícita** (AGENTS.md regla 9), además de la aprobación del plan.

## 0. Estado de ejecución — bloque seguro (2026-11-07)

Ejecutado en la rama `fix/p0-secrets-hardening`, **sin deploy ni rotación**. El
2026-11-08 se commiteó y pusheó (PR #26, draft) con CI en verde:

- [x] `const orderId` en `backend/src/claims/claims.service.ts:48`.
- [x] `git rm --cached` de los 12 archivos del inventario §2.1.
- [x] Cuarentena de los archivos expuestos en `~/.orderflow/quarantine/2026-11-07/` (permisos `go-rwx`).
- [x] `ARTIFACT_DIR` de `deploy-production.sh`, `deploy-staging.sh` y `backup-production.sh` movido a `~/.orderflow/deploy-artifacts/<target>` (override `ORDERFLOW_ARTIFACT_DIR`).
- [x] `.gitleaks.toml` + `.gitleaksignore` (173 hallazgos brutos; 30 tras allowlist de docs/`.qwen`; cualquier hallazgo NUEVO bloquea).
- [x] `gitleaks` bloqueante sobre working tree en un job dedicado `secrets`; historia sigue informativa (`fetch-depth: 0`).
- [x] `ci-cd.yml` retirado (renombrado a `ci-cd.yml.disabled`; era inválido y fallaba en 0 s).
- [x] Node 22 en `test-staging.yml`; job `version-sync` agregado a `ci.yml`.
- [x] `sync-version.sh 1.46.2` + `check-version-sync.sh` extendido a `package.json` raíz, `featurelist.json`, Swagger y `docs/00-contexto-agentes.md`.
- [x] `./scripts/check-version-sync.sh` → exit 0.
- [x] `gitleaks detect --no-git` → `no leaks found` con el baseline.

**Pendiente (requiere autorización):** rotación de credenciales, purga de historia, deploy y `./scripts/init.sh`.

### 0.2 Verificación del bloque seguro (2026-11-08)

Se re-ejecutaron los gates del CI **contra el working tree actual**, antes de
commitear, usando el contenedor `orderflow-backend` (Node 22.23.4) con montajes
de solo lectura para replicar el entorno del runner:

| Gate | Comando | Resultado |
|---|---|---|
| Typecheck | `npx tsc --noEmit` con `NODE_OPTIONS=--max-old-space-size=4096` | ✅ exit 0 |
| ESLint backend | `npx eslint "src/**/*.ts" --max-warnings=311` | ✅ **308 warnings, 0 errores** (umbral 311) |
| Prisma | `npx prisma validate` | ✅ schema válido |
| Auditoría prod | `npm audit --omit=dev --audit-level=critical` | ✅ exit 0 (25 vulns: 15 moderate / 10 high / 0 critical) |
| Jest del CI | `npx jest --runInBand src/orders/orders.service.spec.ts` | ✅ **34/34 tests** |
| Versión | `./scripts/check-version-sync.sh` | ✅ exit 0 (17 referencias) |
| Gitleaks (árbol post-commit simulado) | `gitleaks detect --source . --no-git` | ✅ `no leaks found` |

**Bug de Jest corregido en este bloque:** `.github/workflows/ci.yml` ejecutaba
`npx jest --runInBand --maxWorkers=1 ...`. Jest 29 rechaza ambos flags juntos
(`Both --runInBand and --maxWorkers were specified, only one is allowed`), por
lo que el job backend habría fallado **después** de corregir ESLint. Se dejó
solo `--runInBand`. Era deuda preexistente, no introducida por el P0.

**Bug de Prisma corregido en el primer run del PR:** `prisma validate` falla
con `P1012: Environment variable not found: DATABASE_URL` porque resuelve el
datasource aunque no conecte. Se declaró una `DATABASE_URL` ficticia a nivel
del job backend (el validador solo parsea el schema). También era deuda
preexistente, oculta detrás del fallo de ESLint.

**Resultado del CI (run 42478953736, commit `02368780`):** `backend`,
`frontend`, `secrets`, `semgrep`, `version-sync` y `QA E2E` en `success`.

**Nota sobre el gate local:** `gitleaks detect --no-git` sobre `/opt/orderflow`
encuentra **5 leaks en `.env`** (archivo local, `600`, gitignored, no
trackeado). En CI no existe porque el checkout no lo incluye; el gate se validó
sobre el árbol que resultaría del commit (`git stash create` → 0 leaks).

**Pendiente de autorización:** rotación de credenciales, purga de historia,
branch protection, deploy y `./scripts/init.sh`.

### 0.1 Hallazgos adicionales del baseline de gitleaks

El escaneo inicial del working tree encontró 173 coincidencias (98 `generic-api-key`, 75 `curl-auth-header`). Tras allowlist de documentación (`*.md`) y `.qwen/`, quedan **30 hallazgos en código/config**, todos `generic-api-key`. La mayoría son fixtures de test, pero **hay valores que parecen credenciales reales y NO estaban en el inventario original**:

| Archivo | Qué contiene | Acción requerida |
|---|---|---|
| `docker-compose.yml` | defaults reales de `ODOO_PASSWORD` y `REDIS_PASSWORD` | Rotar y mover a `.env` / secret store |
| `scripts/set-tenant-subdomains.sql` | `apiKeySecret` reales de tenants (`sk_...`, hex de 32/64) | Rotar las API keys de esos tenants |
| `frontend/src/pages/admin/super-admin-dashboard.tsx` | API keys de tenants hardcodeadas en `localStorage.setItem` | Mover a configuración de servidor y rotar |
| `mobile/app/(auth)/tenant-select.tsx` | API keys de tenants hardcodeadas | Mover a configuración y rotar |
| `qa/scripts/*.py` | `provecchio-api-key-2026` | Rotar junto con `MASTER_API_KEY`/API keys |
| `backend/.env.example` | `DEFAULT_API_KEY` con valor que parece real | Reemplazar por placeholder |
| `docs/tests/newman/provecchio.postman_environment.json` | `MASTER_API_KEY` **real** (`sk_master_...`) en un archivo trackeado; Gitleaks no lo marcó por entropía | **Rotar la master key** y dejar el environment vacío (ya corregido en el PR #26) |

Estos valores están **baselined** en `.gitleaksignore` para que el gate pueda bloquear desde hoy; el baseline debe vaciarse a medida que se roten y se eliminen del código. **No se rotaron en este bloque** porque la rotación no estaba autorizada.

---

## 1. Objetivo y Definition of Done

Cerrar los tres bloqueantes que impiden calificar el proyecto como *production-grade*:

| # | Bloqueante | Evidencia |
|---|---|---|
| P0-1 | Secretos reales en el repositorio git | `client_secret_*.json` trackeado desde 2026-07-05 + 10 `deploy-artifacts/rollback-*.env` con `POSTGRES_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `MASTER_API_KEY`, `DATABASE_URL` reales; `qa/.env` con `ADMIN_PASSWORD` |
| P0-2 | CI en rojo sobre `main` | `CI` falla por `prefer-const` en `backend/src/claims/claims.service.ts:48`; `.github/workflows/ci-cd.yml` falla en 0 s |
| P0-3 | Deriva de versión/documentación | `VERSION` 1.46.1 vs `README.md`/`ROADMAP.md` 1.46.0 vs `package.json` raíz 1.38.16 vs `mobile/package.json` 1.45.1; ROADMAP afirma producción en 1.43.8 cuando la live es 1.46.1 |

**DoD (todo debe cumplirse):**

1. `git ls-files | grep -E 'client_secret|rollback-.*\.env|qa/\.env'` devuelve **vacío**.
2. `gitleaks detect --source .` (working tree) y `gitleaks detect` (historia) devuelven **0 leaks** o solo allowlist documentada.
3. Todas las credenciales expuestas fueron **rotadas y verificadas** en `provecchio.com` y `pesallaccia.com`/staging.
4. `gh run list --limit 5` muestra **todos los workflows requeridos en success** sobre `main`.
5. `./scripts/check-version-sync.sh` termina con **exit 0**.
6. `https://provecchio.com/api/v1/health` y el health de staging devuelven la **misma versión** que `VERSION`.
7. `./scripts/init.sh` en verde (previa autorización de recursos del host).
8. Tag `v1.46.2` creado y documentación sincronizada.

---

## 2. Inventario de exposición (sin valores)

### 2.1 Archivos trackeados que deben salir del índice

```
client_secret_488073621789-2tlllcqt1r7si3o2mr35fb128vnpevmk.apps.googleusercontent.com.json
deploy-artifacts/rollback-prod-20260717_030313.env
deploy-artifacts/rollback-prod-20260717_030339.env
deploy-artifacts/rollback-prod-20260717_032812.env
deploy-artifacts/rollback-prod-20260717_032923.env
deploy-artifacts/rollback-prod-20260717_090258.env
deploy-artifacts/rollback-prod-20260717_092818.env
deploy-artifacts/rollback-prod-20260717_093143.env
deploy-artifacts/rollback-prod-20260717_093626.env
deploy-artifacts/rollback-prod-20260717_095254.env
deploy-artifacts/rollback-production-20260717_022336.env
qa/.env
qa/.env.provecchio
```

> `frontend/.env.production`, `frontend/.env.provecchio` y `frontend/.env.staging` contienen solo variables `VITE_*` públicas (el `client_id` de Google es público por diseño). **No requieren rotación**, pero conviene migrarlas a `.example` + gestión por entorno. Se dejan fuera del P0 para no ampliar el blast radius.

### 2.2 Credenciales a rotar y consumidores

| Credencial | Dónde vive | Consumidores / blast radius |
|---|---|---|
| Google OAuth `client_secret` | JSON raíz (histórico) | Login Google / Calendar. **Rotar en Google Cloud Console.** El `client_id` no es secreto. |
| `POSTGRES_PASSWORD` + `DATABASE_URL` | rollback envs | Backend, `odoo_adapter`, standalone, réplica, backups. Rotar en conjunto. |
| `REDIS_PASSWORD` | rollback envs | Backend (Socket.IO adapter + BullMQ), standalone. |
| `JWT_SECRET` | rollback envs | Invalida **todas las sesiones** de usuario. |
| `JWT_REFRESH_SECRET` | rollback envs | Invalida refresh tokens. |
| `MASTER_API_KEY` | rollback envs | Super-admin vía API, automatizaciones externas, E2E, integraciones. |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `qa/.env`, `qa/.env.provecchio` | Solo suite E2E/QA. Rotar la password del usuario admin de pruebas. |

### 2.3 Causa raíz

- `.gitignore` ya contiene las reglas (`client_secret*.json`, `deploy-artifacts/`, `qa/.env`), pero **los archivos se commitearon antes** y `.gitignore` no destrackea.
- `scripts/deploy-production.sh` y `scripts/backup-production.sh` generan los `rollback-*.env` **dentro del repo** (`deploy-artifacts/`).
- `gitleaks` corre con `continue-on-error: true` en `.github/workflows/ci.yml`, por lo que nunca bloqueó.

---

## 3. Workstream P0-1 — Rotación y eliminación de secretos

**Prioridad:** máxima · **Esfuerzo:** 6–8 h · **Ventana:** mantenimiento (afecta sesiones y DB).

> 📘 Procedimiento detallado, verificación y rollback por secreto:
> `docs/plans/P0_ROTATION_RUNBOOK_2026-11-08.md`. Checklist de ventana con
> comandos y checkpoints: `docs/plans/P0_WINDOW_CHECKLIST_2026-11-08.md`. Nada
> de esto se ejecutó: requiere autorización + ventana.

### Paso 1.1 — Congelar y respaldar (D0)

```bash
git status
git switch -c fix/p0-secrets-hardening
./scripts/backup-production.sh provecchio   # requiere autorización
./scripts/backup-production.sh production   # requiere autorización
```

Guardar los backups **fuera del repo** (`/var/backups/orderflow/` o `$HOME/.orderflow/`).

### Paso 1.2 — Rotar credenciales (orden recomendado)

> Orden elegido para minimizar downtime: primero secretos de aplicación (sin tocar DB), después infraestructura.

1. **Google OAuth:** Google Cloud Console → Credentials → OAuth 2.0 Client → **reset secret**. Actualizar `GOOGLE_CLIENT_SECRET` en los `.env` de cada entorno (no en git). Verificar login/Calendar.
2. **`JWT_SECRET` y `JWT_REFRESH_SECRET`:** generar nuevos (`openssl rand -hex 32`). Avisar a usuarios: **todas las sesiones se cierran**. Actualizar `.env` en `provecchio` y staging, reiniciar backend.
3. **`MASTER_API_KEY`:** generar nueva. Inventariar consumidores externos antes (automatizaciones, Postman/Newman, integraciones, `scripts/qa_e2e_check.py`, workflows). Actualizar todos. Verificar `200` en endpoint autenticado con master key.
4. **`ADMIN_PASSWORD` de QA:** rotar el usuario admin de pruebas y actualizar `qa/.env` local (gitignored) + variables de CI/secret store.
5. **`REDIS_PASSWORD`:** `redis-server --requirepass <nueva>` (o `CONFIG SET requirepass`), actualizar `REDIS_URL` en backend y standalone, reiniciar y verificar Socket.IO + BullMQ.
6. **`POSTGRES_PASSWORD` + `DATABASE_URL`:** `ALTER USER ... PASSWORD '<nueva>'`, actualizar `DATABASE_URL` en backend/odoo_adapter/standalone/réplica y `POSTGRES_PASSWORD` del compose, reiniciar y verificar `/api/v1/health` (`database: ok`). Hacerlo en ventana de mantenimiento.

**Verificación por credencial:** health check + un endpoint funcional representativo (login, guest order, KDS WebSocket, Odoo sync) + revisar logs 5–10 min.

### Paso 1.3 — Sacar del índice sin borrar del working tree

```bash
git rm --cached client_secret_*.json
git rm --cached deploy-artifacts/rollback-*.env
git rm --cached qa/.env qa/.env.provecchio
```

(.gitignore ya los cubre; no hace falta agregar reglas nuevas, salvo `deploy-artifacts/` que ya está en la línea 165.)

### Paso 1.4 — Dejar de generar artefactos dentro del repo

Modificar:

- `scripts/deploy-production.sh` (líneas ~32–33): mover `ARTIFACT_DIR` a `${HOME}/.orderflow/deploy-artifacts/${ENV_FILE}` o `/var/backups/orderflow/deploy-artifacts/`.
- `scripts/backup-production.sh` (línea ~21): mismo cambio para `ROLLBACK_FILE`.
- `scripts/deploy-staging.sh` (líneas ~11–12): idem.
- Los tres scripts aceptan el override `ORDERFLOW_ARTIFACT_DIR=/ruta/absoluta`.
- Documentar en `docs/operations/` que los rollback envs **nunca** se commitean.
- Verificar que `scripts/rollback-deploy.sh` siga aceptando una ruta absoluta al artefacto (ya lo hace: `--env-file` acepta path absoluto).

### Paso 1.5 — Purga de historia (opcional pero recomendada, D4)

> La rotación es obligatoria; la purga **no sustituye** la rotación. Si no se puede coordinar la purga, igual hay que rotar.

```bash
pip install git-filter-repo
git filter-repo --invert-paths \
  --path 'client_secret_488073621789-2tlllcqt1r7si3o2mr35fb128vnpevmk.apps.googleusercontent.com.json' \
  --path 'deploy-artifacts' \
  --path 'qa/.env' --path 'qa/.env.provecchio'
git remote add origin git@github.com:marcelompz/orderflow.git
git push --force --all
git push --force --tags
```

**Coordinación obligatoria antes del force-push:**
- Mergear/cerrar PRs abiertos y ramas remotas útiles (hay ramas stale).
- Avisar a todos los colaboradores: deben **re-clonar** (no `pull`).
- GitHub puede conservar objetos accesibles por SHA; abrir ticket a soporte para purga de caché o aceptar que la rotación ya neutraliza el riesgo.
- Re-crear protección de rama y required checks tras el push.

### Paso 1.6 — Prevención de recurrencia

1. `.github/workflows/ci.yml`: step de gitleaks **bloqueante** con `detect --no-git`; el escaneo de historia queda en un step separado con `continue-on-error: true` hasta la purga.
2. `.gitleaks.toml`: extiende las reglas default y agrega allowlist **solo** para placeholders de docs y los `.env` de QA transitorios.
3. `.gitleaksignore`: baseline de los 173 hallazgos existentes (fingerprints `archivo:regla:línea`). Cualquier hallazgo nuevo falla. El baseline se reduce a medida que se rota cada credencial.
4. Agregar hook pre-commit opcional (`.githooks/pre-commit`) que corra `gitleaks protect --staged`.
5. Semgrep: confirmar que `p/secrets` está activo (ya figura en `ci.yml`).
6. Documentar el procedimiento de rotación en `docs/guides/LIMPIEZA_Y_ROTACION_SECRETOS.md` (ya existe; actualizarlo).

**Aceptación P0-1:** inventario vacío en `git ls-files`, gitleaks limpio, credenciales nuevas verificadas en ambos entornos, y ningún `rollback-*.env` nuevo dentro del repo tras un deploy de prueba.

---

## 4. Workstream P0-2 — CI verde y bloqueante

**Prioridad:** alta · **Esfuerzo:** 2–3 h · **Depende de:** nada.

### Paso 2.1 — Fix del lint

`backend/src/claims/claims.service.ts:48`:

```ts
let orderId = dto.orderId;
```

→

```ts
const orderId = dto.orderId;
```

Verificado: el linter reporta que nunca se reasigna; el resto del método solo lee `orderId`. Correr `npx eslint "src/**/*.ts" --max-warnings=$BACKEND_MAX_LINT_WARNINGS` en `backend/`.

### Paso 2.2 — Reparar o retirar `ci-cd.yml`

`ci-cd.yml` falla en 0 s ("workflow file issue"). Acciones:

1. `actionlint .github/workflows/ci-cd.yml`.
2. Si es redundante con `ci.yml` + `qa_e2e.yml` + `test-staging.yml`, **retirarlo** (renombrar a `ci-cd.yml.disabled` o borrar) y dejar un solo pipeline canónico.
3. Si se conserva, corregir la sintaxis y alinear Node 20 → 22.

### Paso 2.3 — Agregar gates faltantes a `ci.yml`

```yaml
- name: Verificar sincronización de versión
  run: ./scripts/check-version-sync.sh

- name: Gitleaks (bloqueante)
  uses: docker://ghcr.io/gitleaks/gitleaks:latest
  with:
    args: detect --source . --report-path /tmp/gitleaks.json --report-format json
```

- Mantener `npm audit --omit=dev --audit-level=critical` como bloqueante.
- Alinear `node-version` a 22 en todos los workflows (hoy `ci.yml` usa 22 y `ci-cd.yml`/`test-staging.yml` usan 20).

### Paso 2.4 — Branch protection

En GitHub → Settings → Branches → `main`:

- Require status checks: `CI / backend`, `CI / secrets`, `CI / frontend`, `CI / semgrep`, `CI / version-sync`, `QA E2E (Playwright + Python)`.
- Require PR + 1 approval.
- Prohibir force-push (salvo ventana de purga, que se restaura después).

**Aceptación P0-2:** `gh run list --limit 5` con todos los workflows requeridos en `success`; un PR de prueba con lint roto queda bloqueado.

---

## 5. Workstream P0-3 — Fuente única de versión y docs

**Prioridad:** alta · **Esfuerzo:** 1–2 h · **Depende de:** P0-2 (para validar en CI).

### Paso 3.1 — Sincronizar a 1.46.2

```bash
./scripts/sync-version.sh 1.46.2
```

Esto actualiza `VERSION`, `backend/frontend/mobile package.json`, manifiestos, marcadores `<!--CURRENT_VERSION-->`, espejos `docs/ROADMAP.md` y `docs/guides/CHANGELOG.md`, y agrega el encabezado 1.46.2 al CHANGELOG.

### Paso 3.2 — Corregir lo que el script no toca

- **`package.json` raíz:** hoy 1.38.16 y solo declara `react-qr-code`. Alinear a 1.46.2 **o eliminarlo** si no se usa (verificar que ningún script lo invoque). Recomendado: alinearlo y agregarlo a `check-version-sync.sh`.
- **`mobile/package.json`:** 1.45.1 → 1.46.2 (el script lo hace; verificar).
- **`ROADMAP.md`:** corregir la línea "Versión Actual" y el estado de producción (decir 1.46.1/1.46.2, no 1.43.8).
- **`README.md`:** badge y marcador a 1.46.2.
- **`docs/00-contexto-agentes.md`:** línea 29 (`v1.46.0`) → 1.46.2.
- **`CHANGELOG.md`:** completar la entrada 1.46.2 con P0-1/2/3.

### Paso 3.3 — Extender el verificador

Agregar a `scripts/check-version-sync.sh`:

- `package.json` raíz.
- `mobile/package.json` (ya está condicional).
- `docs/00-contexto-agentes.md` (si se decide mantener versión allí).

**Aceptación P0-3:** `./scripts/check-version-sync.sh` → exit 0; CI lo ejecuta en cada push/PR.

---

## 6. Workstream P0-4 — Alinear entornos (cierre)

**Esfuerzo:** 1 h + deploy autorizado.

- `pesallaccia.com` está en **1.40.2**. Decidir: actualizar a 1.46.2 o declararlo **deprecado** y retirarlo de la documentación.
- Actualizar `ROADMAP.md` y `docs/00-contexto-agentes.md` con el estado real de cada entorno.
- Verificar health de ambos entornos tras el deploy autorizado.

---

## 7. Cronograma propuesto

| Día | Actividad | Duración | Requiere |
|---|---|---|---|
| D0 | Aprobación del plan, freeze, backups, inventario de consumidores de MASTER key | 2 h | Aprobación + autorización de backup |
| D1 | P0-2 (lint + CI + branch protection) + PR | 3 h | — |
| D2 | P0-3 (versión/docs) + P0-1 pasos 1.3/1.4/1.6 (código y gitleaks) | 4 h | — |
| D3 | P0-1 paso 1.2 (rotación en ventana de mantenimiento) | 4 h | **Autorización explícita de producción** |
| D4 | P0-1 paso 1.5 (purga de historia + force-push) + re-clonado | 3 h | **Autorización explícita de rewrite** |
| D5 | P0-4 (entornos), `./scripts/init.sh`, tag `v1.46.2`, postmortem | 3 h | Autorización de recursos del host |

**Total:** ~19 h de trabajo efectivo, 5 días hábiles con coordinación.

---

## 8. Matriz de verificación

| Check | Comando | Esperado |
|---|---|---|
| Sin secretos trackeados | `git ls-files \| grep -E 'client_secret\|rollback-.*\.env\|qa/\.env'` | vacío |
| Gitleaks working tree | `gitleaks detect --source . --no-git` | 0 leaks |
| Gitleaks historia | `gitleaks detect --source .` | 0 leaks (o allowlist) |
| Versión sincronizada | `./scripts/check-version-sync.sh` | exit 0 |
| CI main | `gh run list --limit 5` | todos success |
| Backend lint | `cd backend && npx eslint "src/**/*.ts"` | exit 0 |
| Backend tests | `cd backend && npm run test -- --runInBand` | 100% pass |
| Frontend build | `cd frontend && npm run build` | exit 0 |
| Barrera completa | `./scripts/init.sh` | verde (previa autorización) |
| Prod provecchio | `curl -s https://provecchio.com/api/v1/health` | `version: 1.46.2`, `database: ok` |
| Staging | `curl -s https://staging.pesallaccia.com/api/v1/health` | `version: 1.46.2` |
| Login Google | flujo OAuth manual | OK con secret nuevo |
| Sesión JWT | login → API → refresh | OK |
| Master key | request autenticada con nueva key | 200 |
| Redis/WS | abrir KDS y recibir evento | OK |
| Odoo sync | guest order → sync | OK |

---

## 9. Riesgos y mitigaciones

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Rotar JWT cierra todas las sesiones | Alta | Medio | Aviso previo + ventana de mantenimiento + comunicado |
| Rotar MASTER key rompe automatizaciones externas | Media | Alto | Inventario previo de consumidores + despliegue coordinado + período de doble key (requiere cambio P1) |
| Rotar password de Postgres deja servicios sin DB | Media | Alto | Ventana de mantenimiento + orden backend→adapter→standalone→réplica + rollback con password anterior |
| Force-push rompe PRs/ramas de colaboradores | Alta | Alto | Merge/cierre previo, aviso, re-clonado, re-crear branch protection |
| GitHub conserva commits viejos por SHA | Media | Medio | Ticket a soporte; la rotación ya neutraliza el valor del secreto |
| Purga de historia elimina el remote configurado | Alta | Bajo | `git remote add origin ...` documentado |
| `xlsx` sigue con CVEs sin fix | Alta | Medio | P1: reemplazar o aislar; no bloquea P0 |
| Falta de autorización retrasa la ventana | Media | Medio | D0 incluye checklist de aprobaciones |

---

## 10. Rollback

- **Código (PR P0-2/P0-3):** `git revert` del merge; no toca datos.
- **Rotación de credenciales:** conservar las credenciales anteriores en un gestor de secretos hasta 72 h después de verificar; volver a desplegar el `.env` anterior si algo falla.
- **Purga de historia:** hacer un `git bundle` completo antes (`git bundle create orderflow-pre-purge.bundle --all`) y conservarlo fuera del repo.
- **Deploy:** `./scripts/rollback-deploy.sh <target> <ruta-absoluta-al-rollback-env>`.

---

## 11. Checklist de aprobación (bloqueante)

- [ ] Apruebo el plan P0 completo (documento).
- [ ] Autorizo la **ventana de mantenimiento** para rotar credenciales y reiniciar producción.
- [ ] Autorizo la **purga de historia y force-push** (implica re-clonar para todos).
- [ ] Confirmo quién rota el secret de Google Cloud y la password de PostgreSQL.
- [ ] Confirmo el inventario de consumidores de `MASTER_API_KEY`.
- [ ] Confirmo destino para `deploy-artifacts/` fuera del repo.
- [ ] Autorizo ejecutar `./scripts/init.sh` (consume CPU/RAM del host).

> Sin los checks marcados, la IA solo puede ejecutar los pasos **sin efectos en producción** (P0-2 lint/CI en rama, P0-3 versión, `git rm --cached`, cambios de scripts y gitleaks).

---

## 12. Anexo — Archivos a modificar (resumen)

| Archivo | Cambio |
|---|---|
| `backend/src/claims/claims.service.ts` | `let orderId` → `const orderId` (línea 48) |
| `.github/workflows/ci.yml` | gitleaks bloqueante + `check-version-sync.sh` + Node 22 |
| `.github/workflows/ci-cd.yml` | reparar o retirar |
| `.github/workflows/test-staging.yml` | Node 20 → 22 |
| `.gitleaks.toml` | allowlist de placeholders de docs y `.env` de QA (nuevo) |
| `.gitleaksignore` | baseline de 173 hallazgos existentes; se reduce al rotar (nuevo) |
| `scripts/deploy-production.sh` | `ARTIFACT_DIR` fuera del repo |
| `scripts/backup-production.sh` | `ROLLBACK_FILE` fuera del repo |
| `scripts/deploy-staging.sh` | `ARTIFACT_DIR` fuera del repo |
| `scripts/check-version-sync.sh` | validar `package.json` raíz y `docs/00-contexto-agentes.md` |
| `scripts/sync-version.sh` | incluir `package.json` raíz si se conserva |
| `package.json` (raíz) | alinear a 1.46.2 o eliminar |
| `README.md`, `ROADMAP.md`, `CHANGELOG.md`, `docs/00-contexto-agentes.md` | sincronizar a 1.46.2 y estado real de entornos |
| `docs/guides/LIMPIEZA_Y_ROTACION_SECRETOS.md` | procedimiento de rotación y purga |
| `.gitignore` | sin cambios necesarios (ya cubre); verificar |
| Índice | `git rm --cached` de los 12 archivos listados en §2.1 |

---

## 13. Despliegue local de pruebas (2026-11-07)

Se levantó el stack en localhost sin tocar producción ni el repo:

| Servicio | URL / puerto | Estado |
|---|---|---|
| `backend` | http://localhost:3010/api/v1 | healthy, reporta `1.46.2` |
| `frontend` | http://localhost:3011 | healthy (SPA + assets 200) |
| `odoo_adapter` | http://localhost:3005/health | healthy |
| `postgres` | localhost:5433 | healthy |
| `redis` | localhost:6379 | healthy |

- `.env` local generado con secretos aleatorios, permisos `600` y gitignored.
- Override de compose **fuera del repo**: `~/.orderflow/deploy-artifacts/local/docker-compose.local.override.yml`
  (publica `frontend:3011`, ajusta `odoo_adapter` a Redis local y evita credenciales Odoo hardcodeadas).
- Tenant/usuario de prueba creado vía `POST /api/v1/auth/register-tenant`; credenciales en
  `~/.orderflow/deploy-artifacts/local/test-credentials.txt` (600). Login y `GET /auth/me` verificados.
- CORS verificado para `Origin: http://localhost:3011`.

### Hallazgo nuevo (deployabilidad)

`npx prisma migrate deploy` **falla en una base nueva**:

```
Migration name: 20260920210000_sync_hr_schema
Database error code: 42P01
ERROR: relation "employees" does not exist
```

Ninguna migración crea `employees` (ni el resto del schema de HR): la migración solo hace
`ALTER TABLE "employees"`. En producción esas tablas existen por historia previa (probablemente
`prisma db push`), pero un deploy limpio no es reproducible. Para el entorno local se inicializó
el schema con `prisma db push --force-reset` y el contenedor arranca sin `migrate deploy`.

**Acción recomendada (requiere decisión):** generar una migración baseline que cree el schema de HR
(o documentar formalmente `db push` para entornos no productivos) y agregar un job de CI que valide
`migrate deploy` contra una base vacía. No se modificó nada de esto en este bloque.

### Integración con el Odoo local

El stack Odoo de pruebas corre por separado en `/opt/odoo/odoo9049-migracion-test`:

- Web: `http://localhost:9049` (contenedor `odoo_web_9049`, Odoo 18.0).
- DB: `prod_2026-03-05` (contenedor `db_odoo_5771`, host `localhost:5771`).
- El adapter llega a Odoo por `host.docker.internal:9049` (el compose le agrega
  `extra_hosts: host.docker.internal:host-gateway`).

Se creó la integración Odoo del tenant QA (`integrations`, tipo `ODOO`):

- `name`: `Odoo Local (prod_2026-03-05)`
- `config`: `host=host.docker.internal`, `port=9049`, `database=prod_2026-03-05`,
  usuario `soporte@crossnexion.com`.
- La password no se versiona; queda en la fila de `integrations` de la DB local
  y en el override local (permisos 600).

Verificaciones:

- `POST /api/v1/integrations/<id>/test` → `success: true`, `uid: 2`.
- Preview `200` para `products`, `categories`, `posCategories`, `stock`,
  `departments`, `positions`, `employees`.
- `POST .../odoo/categories/sync` → 10 categorías POS.
- `POST .../odoo/products/reconcile` (`PULL_FROM_ODOO`) → 653 registros de Odoo:
  609 productos creados y 44 actualizados (SKUs duplicados en Odoo se colapsan
  por el unique `(tenantId, skuInterno)`).

### Fix necesario en el adapter para Odoo 18

`odoo-adapter/src/odoo-client.js` pedía campos que ya no existen en Odoo 18:

- `product.product.pos_categ_id` → ahora es `pos_categ_ids` (M2M).
- `product.category.active` → eliminado.

Se agregó `resolveFields()` (filtra contra `fields_get` y cachea por cliente) y
se normaliza `pos_categ_ids[0]` a `pos_categ_id` para no romper al backend.
`npm test` del adapter: 5/5 OK. Este cambio de código queda **sin commit** para
revisión aparte.
