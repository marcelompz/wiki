# Runbook de rotación de credenciales P0 — OrderFlow / OmniFlow

> **Estado:** 📝 PREPARADO, NO EJECUTADO.
> **Requiere:** autorización explícita + ventana de mantenimiento (AGENTS.md reglas 9, 15 y 16).
> **Contexto:** `docs/plans/P0_REMEDIATION_PLAN_2026-11-07.md` (P0-1).
> **Ejecución paso a paso:** `docs/plans/P0_WINDOW_CHECKLIST_2026-11-08.md`
> (comandos, checkpoints y criterios de aborto).
> **Regla de oro:** este documento no contiene valores de secretos. Los valores
> nuevos se generan en el servidor, se guardan en el gestor de secretos y nunca
> se pegan en tickets, chat, PRs ni logs.

## 0. Por qué rotar

Los 13 archivos retirados del índice en el PR #26 **siguen en la historia de
`main` y en `origin`**. Removerlos del árbol no revoca el acceso: cualquiera con
el historial puede leerlos. La rotación es la única mitigación real; la purga de
historia es higiene posterior, no un sustituto.

La rama `fix/p0-secrets-hardening` ya está pusheada y con CI verde, pero **no
debe mergearse como "cierre de seguridad"** hasta completar la rotación.

## 1. Inventario y consumidores

| # | Secreto | Consumidor principal | Dónde se configura | Impacto de rotar |
|---|---|---|---|---|
| 1 | Service account Google (JSON) | Integraciones Google Calendar / APIs | `GOOGLE_APPLICATION_CREDENTIALS` / archivo en host | Integraciones Google dejan de autenticar hasta actualizar |
| 2 | `JWT_SECRET` | Firma de access tokens (`auth.module`, `jwt-auth.guard`, `api-key.guard`, `documents.module`) | `.env` backend (prod/staging/local) | **Cierra todas las sesiones** |
| 3 | `JWT_REFRESH_SECRET` | Firma de refresh tokens (`auth.service`) | `.env` backend | **Cierra todas las sesiones** (incluido refresh) |
| 4 | `MASTER_API_KEY` | SuperAdmin sintético (`api-key.guard`), analítica (`analytics.service`), consumidores externos | `.env` backend, `docker-compose.yml`, scripts QA, clientes/servicios | Rompe automatizaciones que la usen |
| 5 | Admin QA (usuario/contraseña) | `qa/.env`, `qa/.env.provecchio`, scripts Python | Fuera del repo (cuarentena) | QA debe actualizar credenciales locales |
| 6 | `REDIS_PASSWORD` | Backend, cache analítica, colas, WebSocket/KDS, `odoo_adapter` | `.env` + `docker-compose.yml` (literal en `odoo_adapter`) | Reinicio coordinado de backend, Redis y `odoo_adapter` |
| 7 | `POSTGRES_PASSWORD` | Postgres, backend, backups, microservicios | `.env` + `docker-compose.yml` + `DATABASE_URL` | Reinicio coordinado; riesgo de downtime |
| 8 | API keys de tenants | `scripts/set-tenant-subdomains.sql`, frontend/mobile hardcodeados | DB (`tenant.apiKeySecret`) y código | Tenants deben recibir la nueva key |
| 9 | `MASTER_API_KEY` en Newman | `docs/tests/newman/provecchio.postman_environment.json` (trackeado) | Archivo del repo + runtime | Ya vaciado a placeholder en el PR #26; **rotar la key filtrada** |
| 10 | `VITE_MASTER_API_KEY` | Panel admin en el navegador (`login.tsx`, `AdminApp.tsx`, `admin/modules.tsx`) + 5 compose de `services/` | Build del frontend / variables de entorno | **No debe existir en el bundle**; rotar y mover la operación al backend |

### 1.1 Bloqueantes antes de empezar

- [x] **Inventario de consumidores de `MASTER_API_KEY`** (verificado 2026-11-08,
      detalle en checklist §2.2): dimora → `.env`, `.env.prod`, `.env.provecchio`
      y copia `/opt/srv/orderflow/*`; contenedores `backend`, `sync_standalone`,
      `omnibi_standalone`. localhost sin crons, timers ni secretos en GitHub
      Actions. Hetzner queda fuera de esta ventana (riesgo residual: el valor
      viejo sigue válido allí). Postman de operadores: confirmado que no hay
      otros. Monitoreo: Grafana instalado sin configurar (no consume la key
      hoy). **Riesgo abierto:** integraciones de clientes/móvil/kiosk no
      confirmadas; revisar tráfico 48 h antes de rotar (checklist §5.3).
- [ ] **Responsables de Google Cloud y PostgreSQL** identificados (quién puede
      crear/revocar claves y ejecutar `ALTER USER`).
- [x] Acceso SSH a provecchio verificado desde localhost (2026-11-08): `ssh -J
      root@38.52.135.227:2021 root@192.168.69.240` → `dimora-server`. Directo a
      `192.168.69.240` no rutea desde thinkpad. Hetzner queda fuera de alcance.
- [ ] Backup reciente de PostgreSQL verificado **restaurable** (no solo creado).
- [ ] Ventana acordada; aviso a usuarios por el cierre de sesiones.
- [ ] Gestor de secretos disponible (Vault/1Password/`pass`/sealed secrets).

### 1.2 Hallazgos que amplían el alcance (2026-11-08)

- **Master key real en un archivo versionado:** `provecchio.postman_environment.json`
  contenía una `sk_master_...` literal. Gitleaks no la marcó por entropía. Ya se
  vació a placeholder en el PR #26, pero **la key debe rotarse igual**.
- **Master key en el frontend:** el panel admin usa `VITE_MASTER_API_KEY` con
  fallback `dev-master-key-change-in-prod`. Toda variable `VITE_*` se embebe en
  el bundle: si se compiló con la key real, cualquiera puede extraerla. Al rotar,
  verificar el bundle publicado (`grep -r sk_master dist/`) y migrar esas
  operaciones a un endpoint del backend.
- **Consumidores en microservicios:** 5 `docker-compose.yml` de `services/`
  reciben `MASTER_API_KEY`; actualizarlos junto con el backend.
- **Redis hardcodeado:** `docker-compose.yml` tiene una contraseña literal en el
  servicio `odoo_adapter` (`REDIS_PASSWORD: <literal>`, línea ~181); reemplazar
  por `${REDIS_PASSWORD}` al rotar. `sync_standalone` apunta a otro Redis
  (`lowfarm_redis`) sin auth y no se toca en este paso.
- **`.env` legibles (dimora):** `/srv/orderflow/.env` y `.env.prod` están en
  `755`, y `backend/.env` en `644`; aplicar `chmod 600` en la ventana.
- **Copia/checkout duplicado:** `/opt/srv/orderflow` es otro checkout git
  (`main`, 5 commits adelante de `origin/main`) con `.env`, `.env.prod`,
  `.env.provecchio` y `backend/.env` que contienen la key. No lo referencia
  ningún cron/systemd: rotarlo igual o ponerlo en cuarentena.
- **Bundle del frontend:** verificado 2026-11-08 que `frontend/dist` no contiene
  `sk_master`. Repetir `grep -rl sk_master frontend/dist` (esperado 0) después
  del próximo rebuild.
- **Backup automático roto (dimora):** el cron apunta a
  `/srv/orderflow/scripts/backup.sh`, inexistente; `/var/log/orderflow-backup.log`
  repite `not found`. No hay backup automático. Fix en checklist §6.3.
- **Alcance reducido:** esta ventana rota solo provecchio/dimora. Hetzner
  (`/srv/orderflow`, `backend/.env`, `/srv/orderflow-staging/*`) conserva el
  valor viejo; agendar una ventana aparte.

### 1.3 Valores nuevos
Generar en el servidor, sin escribirlos en la shell history:

```bash
# Secretos aleatorios (ejemplo de generación; ejecutar en el host destino)
openssl rand -base64 48
```

Guardar directamente en el gestor de secretos o en `.env` con permisos `600`.
Nunca usar `echo` con el valor ni pasarlo como argumento de proceso.

## 2. Orden de rotación

1. **Google OAuth / service account** (no afecta sesiones).
2. **JWT_SECRET**.
3. **JWT_REFRESH_SECRET** (junto con el anterior, mismo reinicio).
4. **MASTER_API_KEY** (después del inventario de consumidores).
5. **Admin QA**.
6. **Redis**.
7. **PostgreSQL** (último: mayor riesgo y mayor downtime).

> JWT y refresh se rotan en la misma ventana: rotar solo uno deja refresh tokens
> válidos firmados con el secreto viejo.

## 3. Procedimiento por secreto

Convención para esta ventana: `PROD=/srv/orderflow` y
`ENVFILE=/srv/orderflow/.env.provecchio` (stack `docker-compose.yml` +
`docker-compose.provecchio.yml`, servicio DB `postgres`). Todos los comandos se
ejecutan en el host destino, con el stack identificado. El backup del checklist
§2.1 se ejecuta desde localhost por el jump `root@38.52.135.227:2021`.

### 3.1 Google service account

1. En Google Cloud Console → IAM → Service Accounts → clave usada por el
   proyecto → **crear nueva clave JSON**.
2. Reemplazar el archivo en el host (fuera del repo, permisos `600`).
3. Revocar la clave vieja en GCP **después** de verificar la nueva.
4. Verificar: listar calendarios o ejecutar el flujo de integración Google.

**Rollback:** reactivar temporalmente la clave vieja (solo si aún no se revocó).

### 3.2 JWT_SECRET y JWT_REFRESH_SECRET

1. Generar dos valores independientes.
2. Respaldar `$ENVFILE` (fuera del repo, `600`).
3. Actualizar `JWT_SECRET` y `JWT_REFRESH_SECRET` en prod (staging se rota en su
   propia ventana).
4. Reiniciar el backend (`docker compose up -d backend` o el orquestador usado).
5. Verificar: login nuevo, `/auth/me`, refresh, y que un token viejo da 401.

**Downtime:** ~1 reinicio. **Efecto esperado:** todos los usuarios vuelven a
logearse. Avisar antes.

### 3.3 MASTER_API_KEY

1. Completar §1.1 (inventario).
2. Generar key nueva.
3. Actualizar `$ENVFILE` y todos los consumidores inventariados (scripts,
   integraciones, monitoreo).
4. Reiniciar backend.
5. Verificar: request con key nueva → 200; key vieja → 401.
6. Revocar la key vieja en los sistemas que la tengan registrada.

**Rollback:** restaurar valor anterior en `$ENVFILE` y reiniciar (solo durante
la ventana).

### 3.4 Admin QA

1. Cambiar la contraseña del usuario QA en la base/API.
2. Actualizar los `.env` de QA **fuera del repo** (`/opt/srv/orderflow/qa/.env`,
   `.env.provecchio` en dimora; copias locales en cuarentena).
3. Verificar login QA y CORS contra provecchio.
4. Eliminar las entradas `qa/.env*` del allowlist de `.gitleaks.toml` cuando ya
   no existan en disco.

### 3.5 Redis

1. Definir `REDIS_PASSWORD` nueva y actualizar `REDIS_URL` (password embebida).
2. **Quitar el valor hardcodeado de `docker-compose.yml`** (hoy hay una
   contraseña literal en `odoo_adapter`) y usar `${REDIS_PASSWORD}`.
   `sync_standalone` usa otro Redis (`lowfarm_redis`) sin auth: fuera de alcance.
3. Actualizar `.env` (backend, cache, colas, WebSocket).
4. Reiniciar Redis, backend y `odoo_adapter` en la misma ventana.
5. Verificar: `REDISCLI_AUTH=<nueva> $DC exec -T -e REDISCLI_AUTH redis redis-cli ping`
   → `PONG` (sin `-a` en argv); abrir KDS y recibir un evento WebSocket;
   confirmar que las colas procesan.

**Rollback:** restaurar contraseña anterior y reiniciar ambos.

### 3.6 PostgreSQL

1. Backup verificado y restaurable de las tres bases (`orderflow_db`,
   `orderflow_sync`, `orderflow_bi`).
2. `ALTER USER orderflow WITH PASSWORD '<nueva>';` (ejecutar sin dejar el valor
   en historial: usar `\password` o un script con permisos `600`).
3. Actualizar **todas** las `DATABASE_URL` / `SYNC_DATABASE_URL` /
   `OMNIBI_DATABASE_URL` (backend, sync, bi, backups, microservicios).
4. Reiniciar el stack completo.
5. Verificar: `/api/v1/health` con `database: ok`, login, backup manual.

**Downtime:** el mayor del plan. Hacerlo al final y con rollback listo.

### 3.7 API keys de tenants (hallazgo adicional §0.1 del plan P0)

1. Identificar tenants afectados en `tenant.apiKeySecret`.
2. Rotar por tenant y comunicar la nueva key.
3. Quitar los valores hardcodeados de frontend/mobile y leerlos de configuración
   de servidor.
4. Verificar requests autenticadas de cada tenant.

## 4. Verificación post-rotación

| Check | Comando/acción | Esperado |
|---|---|---|
| Salud prod | `curl -s https://provecchio.com/api/v1/health` | `status: ok`, `database: ok`, versión actual `1.46.1` (el deploy a 1.46.2 es posterior) |
| Salud staging | fuera de alcance 2026-11-08 | no se valida en esta ventana |
| Login | flujo normal | OK |
| Refresh | access token vencido → refresh | OK |
| Token viejo | usar token previo a la rotación | 401 |
| Master key vieja | request con key anterior | 401 |
| Redis/WS | abrir KDS, disparar evento | evento recibido |
| Odoo sync | pedido de prueba → sync | OK |
| Backups | ejecutar backup manual | archivo creado y restaurable |
| Gitleaks | `gitleaks detect --source . --no-git` | 0 leaks |
| Baseline | `.gitleaksignore` | entradas rotadas eliminadas |

## 5. Purga de historia (recién después de rotar)

La purga **no reemplaza** la rotación. Solo se ejecuta cuando todas las
credenciales expuestas estén revocadas/rotadas.

> **Orden acordado 2026-11-08:** mergear el PR #26 **antes** de purgar (evita
> rebasar sus 10 commits). La purga reescribe luego `main` con el merge incluido.

1. Mergear el PR #26 (quitar draft, verificar 6/6 verde).
2. Coordinar ventana y re-clonado de todos los colaboradores.
3. `git filter-repo --path <archivo> --invert-paths` para los 13 archivos (o un
   `--replace-text` para valores puntuales).
4. Verificar localmente: `gitleaks detect --source .` → 0 leaks.
5. `git push --force-with-lease` a `main` y ramas afectadas.
6. Re-clonar colaboradores (los clones viejos conservan los secretos).
7. Invalidar cualquier credencial que haya quedado en forks, cachés de CI o
   artefactos.
8. **Branch protection:** no existe y no se puede crear (repo privado + plan
   Free, API 403). El gate queda procedural: PR + 6/6 verde + revisión manual.
   Si se requiere enforcement, evaluar GitHub Pro.

## 6. Deploy de 1.46.2 (después de rotar)

1. El PR #26 ya se mergeó antes de la purga (§5); verificar `main` con 6/6 verde.
2. Deploy a provecchio; verificar `version: 1.46.2` y salud.
3. Alinear staging/pesallaccia (hoy 1.40.2) o documentar el gap si requiere
   migraciones intermedias.
4. Confirmar que el CI de `main` queda verde (los 6 checks).

## 7. Rollback

- Cada paso debe respaldar `$ENVFILE` antes de editar (fuera del repo, `600`).
- Si un servicio no arranca: restaurar `$ENVFILE`, reiniciar y volver al valor
  anterior; el secreto viejo sigue válido hasta que se revoque.
- No revocar la credencial vieja hasta que la nueva esté verificada.
- Si PostgreSQL falla: restaurar contraseña anterior con `ALTER USER`; el
  backup no es necesario si solo cambió la contraseña, pero debe existir.

## 8. Aprobaciones

| Rol | Nombre | Aprueba |
|---|---|---|
| Owner del repo | | Ventana, orden y merge |
| Responsable Google Cloud | | Rotación/revocación de service account |
| Responsable PostgreSQL | | `ALTER USER` y backups |
| Responsable de QA | | Credenciales QA y scripts |
| Responsable de infra | | Reinicios y rollback |

**Nada de §3–§6 se ejecuta sin las firmas de esta tabla.**
