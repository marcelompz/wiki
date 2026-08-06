# 🛠️ Troubleshooting — Índice de Guías

Ordená por problema y área. Cada entrada incluye síntomas, causa raíz y solución aplicada.

---

## 📑 Índice por documento

| # | Título | Área | Síntoma principal | Estado |
|---|--------|------|-------------------|--------|
| [01](01-traefik-routing-and-spa-cache.md) | Enrutamiento Traefik & Caché SPA | DevOps / Frontend / Traefik | Ruta `/login` carga landing en vez del formulario; errores de caché de assets | ✅ Resuelto |
| [02](02-production-docker-manifests-and-ssl-redirects.md) | Manifiestos Docker & SSL | DevOps / Docker / Cloudflare | App Store vacía; redirecciones HTTPS/522; menú SuperAdmin incompleto | ✅ Resuelto |
| [03](03-odoo-user-sync-and-tenant-modules-management.md) | Sincronización Odoo & Módulos Tenant | Backend / Odoo / RBAC | Diff de usuarios Odoo/OrderFlow; módulos no visibles por tenant | ✅ Resuelto |
| [04](04-prisma-p1000-db-auth-and-redis-fallback.md) | P1000 & Redis/Socket.io | Backend / Prisma / Redis | 502 por auth PostgreSQL; bucle de reconexión Redis | ✅ Resuelto |
| [05](05-whatsapp-catalog-install-and-api-key-auth.md) | WhatsApp Catalog & API Key Auth | Backend / WhatsApp Catalog / Auth | 404/403 al instalar/configurar WhatsApp Catalog | ✅ Resuelto |
| [06](06-postgresql-camelcase-column-names.md) | Columnas camelCase en PostgreSQL | Backend / Prisma / SQL | Errores de sintaxis al ejecutar SQL directo contra Prisma | ✅ Resuelto |
| [06-SSL](06-provecchio-traefik-ssl-and-502-diagnosis.md) | SSL & 502 en Provecchio (anterior) | DevOps / Traefik / Cloudflare | 502 en API; NS_ERROR_REDIRECT_LOOP en `provecchio.com` | ✅ Resuelto |
| [13](13-provecchio-missing-frontend-502.md) | 502 Contenedor Frontend Ausente | DevOps / Docker / Deploy | 502 Bad Gateway `provecchio.com` tras deploy: contenedor `orderflow-frontend-prod` no creado | ✅ Resuelto |
| [09](09-docker-orphan-containers-cleanup.md) | Contenedores Duplicados en Docker | DevOps / Docker / Deploy | Contenedores `backend` duplicados corriendo en paralelo | ✅ Resuelto |
| [10](10-react-router-routes-conflict-and-iterable-guards.md) | Conflicto de Rutas React & Excepciones Iterables | Frontend / React Router / Types | Pantalla en blanco en dominios de producción (`provecchio.com` / `pesallaccia.com`); `t is not iterable` | ✅ Resuelto |
| [11](11-web-builder-and-dashboard-consolidation.md) | Unificación de Dashboards & Diseñador Web Omnicanal | Frontend / Admin App / UX | Duplicidad de Spa Dashboard; posicionamiento del Diseñador Web desacoplado | ✅ Resuelto |
| [12](12-bookings-iterable-guard-fix.md) | Guardia Defensiva en BookingsPage | Frontend / Bookings / React | `TypeError: l.filter is not a function` en `/admin/bookings` | ✅ Resuelto |
| [18](18-cloudflare-api-token-warn.md) | CLOUDFLARE_API_TOKEN No Configurada | DevOps / Cloudflare / DNS | Warning en backend al desplegar; operaciones DNS de tenants fallan | ✅ Resuelto |
| [19](19-login-secrets-missing.md) | Login Fallido por Secrets Faltantes | DevOps / Backend / Auth | Login imposible; SecretsValidation error; backend en crash loop | ✅ Resuelto |
| [20](20-frontend-adaptive-table-build-error.md) | Build Frontend Fallido: `AdaptiveTable` Faltante | Frontend / Docker / TypeScript | Error TS2307 en build de producción; 502 Bad Gateway | ✅ Resuelto |
| [22](22-odoo-adapter-python-fstring-syntax-error.md) | Odoo-Adapter Restart Loop: Python f-String in JS | DevOps / Odoo Adapter | Contenedor `orderflow-odoo-adapter-prod` en crash loop por `f"INV-{...}"` en `.js` | ✅ Resuelto |
| [23](23-contacts-empty-unification.md) | Contactos vacíos: usuarios no linkeados | Backend / Contacts / Auth | Módulo Contactos vacío; usuarios asignados no aparecen (seed sin `contactId`) | ✅ Resuelto |
| [24](24-deploy-script-bugs-fixed.md) | Bugs en deploy-production.sh corregidos | DevOps / Deploy / Traefik | Sin health check de app; sin rollback; sin validación de env vars; Traefik sin backend | ✅ Resuelto |
| 25 | init.sh cuelga el SO | Scripts / Dev Env | Alta carga de CPU/RAM al ejecutar init.sh | ✅ Resuelto |

---

## 🧭 Índice por problema

### Acceso y Auth
- **403 en endpoints de catálogo con API key:** ver [#05](05-whatsapp-catalog-install-and-api-key-auth.md) — `PermissionsGuard` requiere `user` pero `ApiKeyGuard` solo setea `tenant`.
- **401 sin JWT ni API key:** ver [#03](03-odoo-user-sync-and-tenant-modules-management.md) — fallback a endpoint público `/api/v1/tenants/public/list`.

### Enrutamiento y Edge
- **SPA carga ruta incorrecta / assets viejos:** ver [#01](01-traefik-routing-and-spa-cache.md) — colisión de routers Traefik y fallback de `serve`.
- **HTTP 522 / HTTPS mixed content:** ver [#01](01-traefik-routing-and-spa-cache.md) y [#02](02-production-docker-manifests-and-ssl-redirects.md) — prioridad de routers y modo SSL en Cloudflare.
- **Rutas `/api` no llegan al backend:** ver [#02](02-production-docker-manifests-and-ssl-redirects.md) — reglas Traefik y `container_name` fijos.

### Base de Datos
- **P1000 / auth PostgreSQL:** ver [#04](04-prisma-p1000-db-auth-and-redis-fallback.md) — rotación de credenciales y volumen persistente.
- **Errores de columnas en SQL manual:** ver [#06](06-postgresql-camelcase-column-names.md) — Prisma usa camelCase; usar comillas dobles.
- **Módulos no instalados para un tenant:** ver [#05](05-whatsapp-catalog-install-and-api-key-auth.md) — insertar registro en `module_installations`.

### Módulos y RBAC
- **App Store vacía en producción:** ver [#02](02-production-docker-manifests-and-ssl-redirects.md) — manifiestos en `dist/` vs `src/`.
- **Módulo no accesible por API key:** ver [#05](05-whatsapp-catalog-install-and-api-key-auth.md) — RBAC sin `user_tenant_access` para API keys.
- **Gestión de módulos por tenant:** ver [#03](03-odoo-user-sync-and-tenant-modules-management.md) — endpoints `toggleModule` y selector de tenants.

### Integraciones
- **Odoo `ECONNREFUSED` / JSON-RPC:** ver [#03](03-odoo-user-sync-and-tenant-modules-management.md) — puerto 8084/443 y soporte híbrido JSON-RPC + XML-RPC.

### Despliegue & Contenedores
- **502 Bad Gateway tras deploy:** ver [#13](13-provecchio-missing-frontend-502.md) — contenedor `orderflow-frontend-prod` creado pero no iniciado por timeout; forzar con `docker compose up -d frontend`.
- **Error TS2307 `AdaptiveTable` no encontrado en build de producción:** ver [#20](20-frontend-adaptive-table-build-error.md) — el componente `AdaptiveTable` fue referenciado en imports pero su archivo fuente no existía; se creó en `frontend/src/components/common/AdaptiveTable.tsx`.
- **502 en API con frontend OK:** ver [#06-SSL](06-provecchio-traefik-ssl-and-502-diagnosis.md) — contenedores no conectados a red `traefik-public`.
- **Contenedores duplicados:** ver [#09](09-docker-orphan-containers-cleanup.md) — `--remove-orphans` y limpieza de stacks.
- **Warning `CLOUDFLARE_API_TOKEN` no set:** ver [#18](18-cloudflare-api-token-warn.md) — OrderFlow ya no maneja `CLOUDFLARE_API_TOKEN` ni `CF_DNS_API_TOKEN`; la gestión DNS es responsabilidad exclusiva de Traefik (`/opt/traefik-orderflow` → `/srv/traefik`).
- **Login fallido por secrets faltantes:** ver [#19](19-login-secrets-missing.md) — `.env.production` con placeholders post-commit de seguridad; restaurar secrets desde rollback artifacts y sincronizar POSTGRES_PASSWORD.
- **Crash loop `orderflow-odoo-adapter-prod`:** ver [#22](22-odoo-adapter-python-fstring-syntax-error.md) — sintaxis de f-string de Python (`f"INV-{...}"`) en archivo `.js` causaba `SyntaxError` en Node.js.
- **Contactos vacíos / usuarios no aparecen:** ver [#23](23-contacts-empty-unification.md) — `user_tenant_access.contactId` NULL porque el seed no crea el `Contact`; backfill + fix en `create-production-tenants.sql`.
- **Bugs en deploy-production.sh:** ver [#24](24-deploy-script-bugs-fixed.md) — sin health check de aplicación, sin rollback, sin validación de env vars, Traefik sin conexión al backend, sin timeout en migraciones.
- **`init.sh` cuelga el SO por alta carga:** ver #25 — el script es una barrera de CI que ejecuta tests, builds y E2E, saturando los recursos locales; se agregaron flags para ejecución selectiva.

---

## 🔗 Referencias cruzadas

- **Contexto vivo del proyecto:** [docs/00-contexto-agentes.md](../00-contexto-agentes.md)
- **FAQ comercial:** [docs/FAQ.md](../FAQ.md)
- **Deploy y entornos:** [README.md](../README.md) — sección *Deploy y Ambientes*
- **Política de limpieza de config legacy:** [README.md](../README.md) — sección *Limpieza de Configuración Obsoleta*
