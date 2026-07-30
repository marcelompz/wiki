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

---

## 🔗 Referencias cruzadas

- **Contexto vivo del proyecto:** [docs/00-contexto-agentes.md](../00-contexto-agentes.md)
- **FAQ comercial:** [docs/FAQ.md](../FAQ.md)
- **Deploy y entornos:** [README.md](../README.md) — sección *Deploy y Ambientes*
- **Política de limpieza de config legacy:** [README.md](../README.md) — sección *Limpieza de Configuración Obsoleta*
