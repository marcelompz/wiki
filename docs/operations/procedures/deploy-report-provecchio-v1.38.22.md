# Informe de Despliegue: Provecchio v1.38.22

**Fecha:** 2026-10-15  
**Versión:** 1.38.22 (patch)  
**Entorno:** Provecchio (dimoraserverlocal - 192.168.69.240)  
**Tag Git:** v1.38.22  
**Commit:** 8ff8987e  
**Rama:** main  

---

## Resumen Ejecutivo

Despliegue exitoso de la versión 1.38.22 que corrige los errores **403 Forbidden** en los endpoints del panel de mozos (OmniGastro) en producción. La causa raíz era que el endpoint `verify-pin` no retornaba tokens JWT, dejando las peticiones posteriores sin autenticación.

---

## Cambios Implementados

### Backend (`backend/src/auth/auth.service.ts`)
- **Método `verifyPin()` (líneas 749-796):** Modificado para generar y retornar `accessToken` y `refreshToken` usando `generateAccessToken()` y `generateRefreshToken()`
- Almacena `refreshTokenHash` en tabla `users` con expiración 30 días
- Retorna tokens en respuesta para que el frontend los guarde

### Frontend (`frontend/src/pages/admin/gastro-mozos.tsx`)
- **`handleVerifyPin`:** Guarda `accessToken` y `refreshToken` en `localStorage`
- **`handleLogoutWaiter`:** Limpia ambos tokens al cerrar sesión
- El interceptor Axios (`api.ts`) adjunta automáticamente `Authorization: Bearer <accessToken>`

### Base de Datos (Producción)
Enlazados 3 empleados a sus usuarios correspondientes:
| Empleado | PIN | Usuario (email) | User ID |
|----------|-----|-----------------|---------|
| Ivan Castillo | 1234 | mozo@provecchio.com | edc24cd5-f9c6-4a03-ae76-6d9b249cec1a |
| Natalia Bado | 1234 | natalia.bado@staff.provecchio.local | staff-natalia-bado |
| Paula Cocina | 0987 | paula@staff.provecchio.local | staff-paula |

---

## Verificación de Endpoints (Post-Deploy)

Todos los endpoints críticos validados en `https://provecchio.com`:

| Endpoint | Método | Auth | Código | Notas |
|----------|--------|------|--------|-------|
| `/api/v1/auth/verify-pin` | POST | ApiKeyGuard | 200 | Retorna JWT access/refresh tokens |
| `/api/v1/modules/installed` | GET | JWT Bearer | 200 | Módulos instalados |
| `/api/v1/waiter/calls` | GET | JWT Bearer | 200 | Llamadas mozo - tablas G10, M01, Giardino correctas |
| `/api/v1/orders/guest/pending` | GET | JWT Bearer | 200 | Pedidos pendientes - nombres mesa correctos |
| `/api/v1/waiter/calls/:id/take-order` | PATCH | JWT Bearer | 200 | Tomar pedido funcional |

---

## Checklist Pre-Deploy (AGENTS.md §9.1)

| Ítem | Estado | Detalle |
|------|--------|---------|
| Traefik services.yml sincronizado | ✅ | `/opt/traefik-orderflow/dynamic/services.yml` → `/opt/srv/traefik/dynamic/services.yml` |
| Traefik recargado (HUP) | ✅ | `docker kill -s HUP traefik` |
| Routers solo HTTPS (websecure) | ✅ | `provecchio-frontend`, `provecchio-api`, `provecchio-socketio` en entrypoint websecure |
| Contenedores previos limpiados | ✅ | Script deploy maneja `docker compose rm -f -s` |
| Build forzado (--build) | ✅ | `docker compose build --no-cache` |
| Repo local commiteado y pusheado | ✅ | Commit 8ff8987e → origin/main |

---

## Diagnóstico Pre-Deploy

```bash
./scripts/pre-deploy-diagnostic.sh provecchio
```
**Resultado:** PASSED (con warnings esperados: contenedores huérfanos, volúmenes a crear)

---

## Proceso de Despliegue

```bash
./scripts/deploy-production.sh provecchio
```

**Pasos ejecutados automáticamente:**
1. Pre-deploy diagnostic ✅
2. rsync código a 192.168.69.240:/srv/orderflow ✅
3. Commit automático en servidor remoto ✅
4. `docker compose rm -f -s` (limpieza) ✅
5. `docker compose build --no-cache` (build forzado) ✅
6. `docker compose up -d --remove-orphans` ✅
7. Migraciones Prisma ✅
8. Health checks ✅

**Duración build:** ~45 minutos (múltiples servicios: backend, frontend, sync-standalone, omnibi-standalone, odoo-adapter)

---

## Estado de Contenedores Post-Deploy

```bash
docker ps --format '{{.Names}} {{.Status}}'
```

| Contenedor | Estado | Puerto/Health |
|------------|--------|---------------|
| orderflow-frontend-prod | Up 31 min | healthy (80) |
| orderflow-backend-prod | Up 31 min | healthy (3010) |
| orderflow-sync-standalone-prod | Up 31 min | healthy (3015) |
| orderflow-odoo-adapter-prod | Up 31 min | healthy (3005) |
| orderflow-database-1 | Up 31 min | healthy (5432) |
| orderflow-redis-1 | Up 31 min | healthy (6379) |
| orderflow-loki | Up 31 min | healthy (3100) |
| orderflow-grafana | Up 30 min | 3000/tcp |
| orderflow_omnibi_standalone | Restarting | (servicio standalone independiente) |

---

## Documentación Actualizada

| Archivo | Cambio |
|---------|--------|
| `VERSION` | 1.38.21 → 1.38.22 |
| `backend/package.json` | version: 1.38.22 |
| `frontend/package.json` | version: 1.38.22 |
| `backend/src/main.ts` | Swagger setVersion('1.38.22') |
| `CHANGELOG.md` | Entrada v1.38.22 con FEAT-165 |
| `featurelist.json` | FEAT-165 agregado (completed) |
| `docs/guides/TECHNICAL-GUIDE-DEVELOPERS.md` | Nueva guía técnica obligatoria |
| `docs/info/OmniGastro.md` | Log de errores 403 y fix |

---

## Sincronización Wiki y Traefik

- **Wiki:** `rsync -avz /opt/orderflow/docs/ /opt/wiki/orderflow/docs/` + root docs ✅
- **Traefik:** `scp services.yml` + `docker kill -s HUP traefik` ✅
- **Tag Git:** `git tag v1.38.22 && git push --tags` ✅

---

## Rollback (si necesario)

El script `deploy-production.sh` guarda snapshot de entorno:
```
deploy-artifacts/rollback-provecchio-<timestamp>.env
```

Para rollback:
```bash
# En servidor remoto
cd /srv/orderflow
docker compose -f docker-compose.prod.yml --env-file .env.prod down
# Restaurar .env desde rollback
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

---

## Próximos Pasos / Pendientes

- [ ] Ejecutar suite E2E Playwright completa en producción (`npx playwright test`)
- [ ] Validar importación de datos OmniGastro (`GET /api/v1/product-imports/suppliers`)
- [ ] Monitorear logs 24h para confirmar estabilidad

---

**Desplegado por:** Kilo AI Assistant  
**Autorizado por:** Usuario (directiva explícita "proceed to deploy at provecchio")  
**Fecha completado:** 2026-10-15 15:55 UTC