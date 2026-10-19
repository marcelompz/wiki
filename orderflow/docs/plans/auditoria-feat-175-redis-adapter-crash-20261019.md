# Auditoría FEAT-175 — Crash-loop del backend por `unhandledRejection` del adapter Socket.IO + Redis

> **Vertical:** Core OrderFlow (Redis / Socket.IO WebSockets / Deploy)
> **Release:** v1.39.10
> **Fecha:** 2026-10-19
> **Estado:** ✅ Completado y validado (pendiente despliegue a producción con autorización)

---

## 1. Alcance

| Ítem | Detalle |
|------|---------|
| Incidente | Contenedor `orderflow_backend` en ciclo de reinicio al arrancar (`RestartCount` creciente, health nunca `healthy`) |
| Síntoma en log | `Error: Stream isn't writeable and enableOfflineQueue options is false` en `@socket.io/redis-adapter` (`psubscribe`) |
| Ambiente detectado | Stack local `provecchio.local` (compose `docker-compose.yml`) |
| Impacto funcional | El backend no levantaba: sin API, sin KDS, sin POS, sin WebSockets. Con password Redis inválida el síntoma era peor (arrancaba "sano" pero **sin pub/sub** → KDS multi-nodo degradado) |
| Archivos afectados | `backend/src/common/redis-io.adapter.ts`, `backend/src/main.ts`, `docker-compose.yml` |

## 2. Análisis de causa raíz

1. **Cliente `sub` de Redis nunca conectado.** `RedisIoAdapter.connectToRedis()` creaba el cliente de pub/sub con `pubClient.duplicate()`, que hereda `lazyConnect: true` y `enableOfflineQueue: false`, y **no ejecutaba `await subClient.connect()`**. `@socket.io/redis-adapter` dispara `psubscribe`/`subscribe` de forma fire-and-forget al construir el adapter del namespace: con el stream no escribible, la promesa se rechaza y, al no estar manejada, **Node 22 termina el proceso** (`unhandledRejection` fatal). El `try/catch` de `connectToRedis()` no podía capturarla porque el rechazo ocurre en la cadena interna del adapter, no en la llamada protegida.
2. **Password de Redis con credencial de relleno.** El compose local arrastraba `REDIS_URL=redis://:***@redis:6379` (placeholder), por lo que el `connect()` fallaba con NOAUTH y se activaba el fallback in-memory: el backend "arrancaba" sin pub/sub y sin ninguna señal visible del problema.
3. **`.env` no propagado al contenedor.** El servicio `backend` del compose no declaraba `env_file`, por lo que faltaban `JWT_SECRET` / `JWT_REFRESH_SECRET` → `TypeError: Configuration key "JWT_SECRET" does not exist`.

## 3. Plan de actualización aplicado

| Paso | Acción | Estado |
|------|--------|--------|
| 1 | `await subClient.connect()` antes de `createAdapter` | ✅ |
| 2 | Enmascarar la password en logs (`redis://***@redis:6379`) | ✅ |
| 3 | `safeQuit()` de pub/sub en el camino de fallback | ✅ |
| 4 | Guard acotado de `unhandledRejection` en `main.ts` (solo Redis; el resto → `process.exit(1)`) | ✅ |
| 5 | `env_file: .env` + `REDIS_URL` / `REDIS_PASSWORD` / `ENABLE_REDIS_WS` en el compose | ✅ |
| 6 | Documentación: `docs/troubleshooting/182-*.md` + índice, CHANGELOG, ROADMAP, timeline, README, Swagger | ✅ |
| 7 | Bump de versión a 1.39.10 (VERSION, package.json, featurelist, 37 manifiestos) | ✅ |
| 8 | Validación (unit + E2E + health) | ✅ |
| 9 | Despliegue a producción | ⏳ Requiere autorización explícita del usuario |

## 4. Validación ejecutada

| Validación | Resultado |
|------------|-----------|
| `docker compose up -d --no-deps backend` | `RestartCount=0`, `Status=running`, `Health=healthy` |
| `GET /api/v1/health` | `200 {"version":"1.39.10","services":{"database":"ok","odoo_adapter":"ok"},"status":"ok"}` |
| Log de arranque | `✅ Socket.io Redis Adapter initialized successfully` + `Analytics Cache initialized on Redis redis:6379` |
| Unit tests backend (`npx jest`) | **127 suites / 940 tests OK** |
| E2E Playwright (`frontend/e2e/`, base `https://provecchio.local`) | **64/64 OK** (22/22 en `omnigastro.spec.ts`, incluida la validación de importación de datos de provecchio.com exigida por AGENTS.md §14) |
| `scripts/qa_e2e_check.py` (provecchio.com) | Catálogo público sin imágenes rotas, dominios sin errores JS, 7 rutas admin sin 5xx |
| `scripts/check-version.sh` | `✅ Todo sincronizado correctamente (v1.39.10)` |

## 5. Dependencias y efectos secundarios

- **Sin migraciones**: no hay cambios en `schema.prisma`; `tenantId` intacto.
- **Sin cambios de contrato API**: el fix es de arranque/configuración del backend.
- **Guard de `unhandledRejection`**: solo absorbe rechazos cuyo mensaje coincide con `/redis|ioredis|stream isn't writeable/i`; cualquier otro rechazo conserva el cierre del proceso, de modo que no se ocultan errores reales.
- **Pub/sub no crítico**: si Redis no está disponible, el adapter cae al modo in-memory de Socket.IO (comportamiento preexistente) y el backend sigue operando.
- **Compose local**: `environment` tiene precedencia sobre `env_file`, por lo que `DATABASE_URL` (`postgres:5432`) y `REDIS_URL` (`redis:6379`) siguen usando los alias de red correctos.

## 6. Pendientes

- [ ] `./scripts/init.sh` (barrera completa: prisma generate, jest, build backend, build frontend, auditoría E2E) — requiere confirmación del usuario por consumo de CPU/RAM.
- [ ] Despliegue a producción (`./scripts/deploy-production.sh provecchio`) — requiere autorización explícita.
- [ ] Verificar en producción que el adapter de Socket.IO + Redis inicializa (log `✅ Socket.io Redis Adapter initialized successfully`) tras el deploy.

## 7. Referencias

- `docs/troubleshooting/182-socketio-redis-adapter-unhandled-rejection-crash.md`
- `docs/troubleshooting/51-analytics-cache-service-redis-connection-failure.md`
- `docs/troubleshooting/179-production-deploy-provecchio-v1.39.8.md`
- `backend/src/common/redis-io.adapter.ts`
- `backend/src/main.ts`
- `docker-compose.yml`
