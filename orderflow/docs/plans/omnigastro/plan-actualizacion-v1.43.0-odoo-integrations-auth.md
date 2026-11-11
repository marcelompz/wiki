# Plan de Actualización v1.43.0 — Odoo Integrations SuperAdmin Auth

> **Fecha:** 2026-10-25
> **Rama:** `feat/odoo-pos-transfer-catalog-sync`
> **Versión:** 1.43.0
> **FEAT asociada:** FEAT-188 (Telemetría t0…t5, métricas Prometheus y E2E del sync a Odoo POS) — extensión de SuperAdmin auth

---

## 1. Análisis del Problema

El endpoint `GET /api/v1/integrations` (y otros endpoints de integración) devolvía HTTP 403 Forbidden cuando el SuperAdmin accedía vía `MASTER_API_KEY`. La raíz causal era que el flujo de autenticación no establecía correctamente `request.user` como objeto sintético para el caso SuperAdmin vía API key.

### Causa Raíz

En `backend/src/auth/auth.service.ts` y `backend/src/auth/strategies/api-key.strategy.ts`, el flujo de autenticación con `MASTER_API_KEY` no creaba un objeto `request.user` con los campos requeridos por los guards de autorización (`ApiKeyGuard`, `JwtAuthGuard`). Esto provocaba que el `SuperAdminGuard` rechazara la request con 403.

### Solución Aplicada

1. **`backend/src/auth/auth.service.ts`**: Modificado para que al autenticar con `MASTER_API_KEY`, se establezca `request.user` como objeto sintético con `id`, `email`, `isSuperAdmin: true` y `masterApiKey: true`.
2. **`backend/src/auth/strategies/api-key.strategy.ts`**: Ajustado para que el `validate()` devuelva el objeto de usuario sintético correcto.
3. **`frontend/src/AdminApp.tsx`** (líneas 406-420): Añadida la verificación de autenticación SuperAdmin para la ruta `/admin/integrations`, asegurando que el frontend redirija al login si el usuario no está autenticado como SuperAdmin.

---

## 2. Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `backend/src/auth/auth.service.ts` | Establece `request.user` sintético para SuperAdmin vía `MASTER_API_KEY` |
| `backend/src/auth/strategies/api-key.strategy.ts` | `validate()` devuelve objeto de usuario SuperAdmin |
| `frontend/src/AdminApp.tsx:406-420` | Guard de autenticación SuperAdmin para `/admin/integrations` |
| `frontend/e2e/app.spec.ts` | Añadida cobertura E2E para la ruta `/admin/integrations` |
| `frontend/e2e/integrations-admin.spec.ts` | Nuevo archivo de pruebas E2E para el control de acceso a integraciones |

---

## 3. Dependencias y Efectos Secundarios

- **Dependencias:** Ninguna nueva. Solo ajustes en el flujo de autenticación existente.
- **Efectos secundarios:** El cambio en `auth.service.ts` afecta a todos los endpoints que usan `MASTER_API_KEY`. Se verificó que no rompe el flujo de usuarios normales (JWT) ni el flujo de tenants (API key estándar).
- **Riesgo:** Bajo. El cambio es aditivo: solo añade el caso SuperAdmin al flujo de autenticación existente.

---

## 4. Estrategia de Testing

### Unitarios
- `auth.service.spec.ts`: Test de que `MASTER_API_KEY` establece `request.user.isSuperAdmin = true`.
- `api-key.strategy.spec.ts`: Test de que `validate()` devuelve el objeto de usuario correcto.

### E2E
- `frontend/e2e/integrations-admin.spec.ts`: Cobertura de que:
  - Un usuario no autenticado es redirigido al login al acceder a `/admin/integrations`.
  - Un usuario autenticado como SuperAdmin puede acceder a `/admin/integrations`.
  - Un usuario autenticado como no-SuperAdmin recibe 403.

### Smoke Tests
- `GET /api/v1/health` → 200 OK.
- `GET /api/v1/integrations` con `MASTER_API_KEY` → 200 OK (antes 403).

---

## 5. Checklist de Validación

- [x] `auth.service.ts` modificado y compilado sin errores.
- [x] `api-key.strategy.ts` modificado y compilado sin errores.
- [x] `AdminApp.tsx` actualizado con el guard de autenticación.
- [x] E2E tests creados en `frontend/e2e/integrations-admin.spec.ts`.
- [x] E2E tests actualizados en `frontend/e2e/app.spec.ts`.
- [ ] `./scripts/init.sh` ejecutado y aprobado (pendiente de autorización del usuario).
- [ ] Versionado en `VERSION`, `backend/package.json`, `frontend/package.json`, `featurelist.json`.
- [ ] Documentación sincronizada con Wiki oficial (`/opt/wiki/orderflow/`).

---

## 6. Próximos Pasos

1. Solicitar autorización al usuario para ejecutar `./scripts/init.sh`.
2. Actualizar versiones en todos los manifiestos.
3. Sincronizar documentación con la Wiki oficial.
4. Hacer push de la rama `feat/odoo-pos-transfer-catalog-sync` a `origin/main`.

---

## 7. Rutas Traefik (AGENTS.md §9.2) — OBLIGATORIO antes del deploy

Verificación realizada el **2026-10-26** sobre el stack local y la configuración fuente de producción.

### 7.1 Entorno local (`provecchio.local`)

Config activa: `/opt/orderflow/traefik/dynamic/provecchio-router.yml`, servida por el contenedor
`orderflow_traefik` (montaje read-only, `watch: true`).

| Router | Regla | Prioridad | Servicio | Cubre |
|---|---|---|---|---|
| `api-provecchio-local` | `Host(provecchio.local) \|\| HostRegexp(**.provecchio.local)` **&& `PathPrefix(/api)`** | 100 | `provecchio-api` (`orderflow_backend:3010`) | **`/api/v1/integrations/*`** y **`/api/omniflow/*`** |
| `ws-provecchio-local` | ídem `PathPrefix(/socket.io)` | 100 | `provecchio-api` | WebSockets |
| `frontend-provecchio-local` | ídem (sin path) | 90 | `provecchio-frontend` (`orderflow_frontend:80`) | **`/admin/integrations`** y SPA |

**Conclusión:** no hacen falta routers nuevos en local. Los endpoints de la feature quedan cubiertos
por el catch-all `/api` y `/admin/integrations` por el catch-all del frontend. **Ninguna ruta nueva
requiere `docker kill -s HUP traefik`** porque `watch: true` recarga los cambios automáticamente.

### 7.2 Producción Provecchio (`provecchio.com`)

| Router | Regla | Prioridad | Servicio |
|---|---|---|---|
| `provecchio-api` | `(Host(provecchio.com) \|\| Host(www.provecchio.com)) && PathPrefix(/api)` | 95 | `orderflow-prod-backend` |
| `provecchio-frontend` | `Host(provecchio.com) \|\| Host(www.provecchio.com)` | 90 | `orderflow-prod-frontend` |

`/api/v1/integrations/*` y `/api/omniflow/*` → backend. `/admin/integrations` → frontend.
**Sin cambios necesarios en Provecchio.**

### 7.3 Producción Hetzner (`pesallaccia.com`)

Routers agregados en `/opt/traefik-orderflow/dynamic/services.yml`:

| Router | Regla | Prioridad | Servicio |
|---|---|---|---|
| `orderflow-omniflow-api` (`websecure`, `letsencrypt`) | hosts `pesallaccia.com` **&&** (`/api/omniflow/` \|\| `/api/v1/integrations/*`) | 105 | `orderflow-prod-backend` |
| `orderflow-omniflow-api-http` (`web`) | ídem | 105 | `orderflow-prod-backend` |
| `orderflow-admin-integrations` (`websecure`, `letsencrypt`) | hosts **&&** (`/admin/integrations`) | 100 | `orderflow-prod-frontend` |
| `orderflow-admin-integrations-http` (`web`) | ídem | 100 | `orderflow-prod-frontend` |

### 7.4 ⚠️ Defecto detectado y bloqueo de sincronización

1. **Precedencia de operadores:** las reglas de `orderflow-admin-integrations(-http)` se escribieron sin
   paréntesis en el grupo de hosts —
   `Host(...) || Host(...) || HostRegexp(...) && PathPrefix('/admin/integrations') || Path(...)`.
   Como `&&` liga más fuerte que `||`, la regla matchea **cualquier path** de esos hosts y, con
   prioridad **100** sobre el router `/api` (prioridad **95**), enviaría `/api/*` al **frontend** en
   `pesallaccia.com`. **Corrección:** envolver el grupo de hosts en paréntesis:
   `(Host(...) || Host(...) || HostRegexp(...)) && (PathPrefix('/admin/integrations'))`.

2. **La copia de trabajo de `/opt/traefik-orderflow/dynamic/services.yml` NO debe sincronizarse al
   servidor:** contiene reescrituras hechas para el host local (servicios de Axon, Aieer, Vitalog,
   Nanduti, Odoo y los `*-standalone` fueron eliminados; `provecchio-*` apuntan a `frontend` /
   `backend-api` locales). Sincronizarla rompería el ruteo de los demás servicios del servidor
   (AGENTS.md Regla #4).

**Estado verificado en producción:** `https://pesallaccia.com/api/v1/health` → **HTTP 200 JSON**
(la configuración defectuosa **no** está desplegada); `pesallaccia.com` sirve `1.40.2`.

### 7.5 Validación post-deploy

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://provecchio.com/api/v1/health          # 200
curl -s -o /dev/null -w "%{http_code}\n" https://provecchio.com/admin/integrations      # 200 (SPA)
curl -s -H "x-api-key: $MASTER_API_KEY" https://provecchio.com/api/v1/integrations      # 200 (antes 403)
```