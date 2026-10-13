# Arquitectura: Subdominios por Tenant (Multi-Tenant Routing Standard)

> **Estado:** Estándar vigente  
> **Alcance:** Backend, Frontend, Traefik, Microservicios  
> **Objetivo:** Eliminar ambigüedades en la generación de URLs públicas y enrutamiento. Un solo patrón obligatorio para todo el ecosistema OrderFlow/OmniFlow.

---

## 1. Principio General

Cada tenant tiene **un único subdominio** dentro del dominio raíz (`ROOT_DOMAIN`).  
No se utilizan subdominios por servicio, por módulo ni por categoría.

Formato estándar:

```
https://<tenant.subdomain>.<ROOT_DOMAIN>
```

Ejemplo real:

```
https://dimora.pesallaccia.com
```

### 1.1. Módulos bajo el mismo subdominio

Los módulos públicos de un tenant se exponen bajo **paths** en ese mismo subdominio:

| Módulo | Ruta pública |
|---|---|
| Catálogo Social | `/social-catalog` |
| Biolinks | `/bio/<slug>` |
| Tienda/Productos | `/tienda/producto/<id>` |
| Contacto | `/contacto/<tenantId>` |
| Archivos | `/archivo/<fileId>` |

Ejemplo completo:

```
https://dimora.pesallaccia.com/social-catalog
https://dimora.pesallaccia.com/bio/mi-bio
https://dimora.pesallaccia.com/tienda/producto/prod-123
```

---

## 2. Reglas por Capa

### 2.1. Backend

- **Fuente de verdad:** `tenant.subdomain` + `ROOT_DOMAIN`.
- No hardcodear `pesallaccia.com` ni ningún dominio en servicios.
- Usar `process.env.ROOT_DOMAIN` con fallback seguro.
- Para construir URLs públicas, usar siempre el helper centralizado del módulo correspondiente (`CloudflareDnsService.getSubdomainHostname(...)` cuando aplique).
- El `baseUrl` del QR generator, social-catalog, biolinks y cualquier módulo público debe respetar el subdominio del tenant autenticado.

### 2.2. Frontend

- No construir URLs públicas con dominios hardcodeados.
- Usar `tenant.subdomain` desde el contexto/JWT para armar rutas públicas.
- Para enlaces internos, usar paths relativos cuando el router lo permita.
- Si se requiere URL absoluta, usar `https://${subdomain}.${ROOT_DOMAIN}/...`.

### 2.3. Traefik

- **Un solo modelo:** routing por subdominio de tenant.
- No crear routers dinámicos adicionales por microservicio standalone si este se sirve dentro del mismo subdominio del tenant.
- Los microservicios standalone que requieran dominio propio deben usar un subdominio **del tenant**, nunca uno genérico del sistema.
- Traefik lee configuración dinámica desde `/opt/traefik-orderflow/dynamic/`.
- El proveedor exclusivo es `file`; no se usa `docker` provider.

### 2.4. Microservicios Standalone

- Reutilizar el subdominio del tenant. No solicitar subdominio propio.
- Si un microservicio necesita URL pública, recibir `subdomain` y `ROOT_DOMAIN` desde el core OrderFlow.
- Los microservicios no deben crear registros DNS adicionales por sí mismos.
- El core OrderFlow es el único autorizado para solicitar creación/validación de subdominios vía `CloudflareDnsService`.

---

## 3. Ciclo de Vida del Subdominio

| Evento | Acción |
|---|---|
| Alta de tenant | `CloudflareDnsService` crea el subdominio en Cloudflare y marca `subdomainVerified: true` |
| Cambio de `ROOT_DOMAIN` | Actualizar env y regenerar URLs desde el backend; no requiere mover tenants |
| Baja de tenant | Eliminar subdominio de Cloudflare y marcar `subdomain: null` |
| Reconciliación | `ReconciliationJob` verifica consistencia entre tenants activos y archivos dinámicos Traefik |

---

## 4. Caso futuro: Dominio propio por tenant con sucursales/servicios

> **Estado:** 📋 Pendiente de implementación  
> **Trigger:** tenants como Provecchio que poseen un dominio corporativo propio y necesitan exponer múltiples catálogos/servicios bajo ese dominio.

### 4.1. Problema

El estándar actual asume `https://<tenant.subdomain>.<ROOT_DOMAIN>`.  
En algunos casos, el tenant representa una **empresa con dominio propio** y requiere:

- Varias sucursales o servicios bajo el mismo dominio.
- Identificadores tipo slug por sucursal/servicio, sin crear subdominios adicionales.
- Ejemplo real: `provecchio.com` como dominio de empresa, `dimora` como sucursal/casa matriz, `/social-catalog/dimora` como catálogo.

### 4.2. Regla propuesta

| Tipo | Formato | Ejemplo |
|---|---|---|
| Tenant con subdominio compartido | `https://<tenant.subdomain>.<ROOT_DOMAIN>/<path>` | `https://dimora.pesallaccia.com/social-catalog` |
| Tenant con dominio propio | `https://<customDomain>/<slug>` | `https://provecchio.com/catalog/dimora` |
| Varios catálogos bajo mismo dominio | `https://<customDomain>/<slug>` | `https://provecchio.com/catalog/dimora`, `https://provecchio.com/catalog/sucursal2` |

### 4.3. Restricciones

- El dominio propio debe registrarse en el tenant y validarse ownership (DNS/verificación).
- El core OrderFlow sigue siendo el único autorizado para crear/validar dominios/subdominios.
- No se permite inventar rutas por módulo sin pasar por este estándar.
- Si un tenant tiene dominio propio, el QR generator y el checkout deben respetar ese dominio antes que `ROOT_DOMAIN`.

### 4.4. Impacto estimado

- `Tenant` necesita campo `customDomain` + `customDomainVerified`.
- QR generator: priorizar `customDomain` sobre `subdomain + ROOT_DOMAIN`.
- Traefik: enrutar el dominio propio al mismo servicio/core sin romper otros tenants.
- Frontend: exponer selector de sucursal/servicio cuando corresponda.

---

## 5. Prohibiciones

- **Prohibido** crear subdominios por módulo/servicio/categoría.
- **Prohibido** hardcodear `pesallaccia.com` o cualquier dominio en código.
- **Prohibido** usar `docker` provider en Traefik; solo `file`.
- **Prohibido** solicitar creación de DNS desde microservicios standalone.

---

## 6. Referencias

- `backend/src/cloudflare/cloudflare-dns.service.ts`
- `backend/src/deploy-manager/reconciliation.job.ts`
- `backend/src/tenants/tenants.controller.ts`
- `docs/troubleshooting/33-traefik-dynamic-config-write-failure.md`
- `docs/ROADMAP.md`
