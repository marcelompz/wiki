# PLAN_ARQUITECTURA_CORE_MODULAR.md

**Proyecto:** OrderFlow / OmniFlow
**Base auditada:** tarball real v1.33.0 (FEAT-139/140)
**Objetivo:** pasar de 18 microservicios "standalone" (con Postgres y auth propios) a un **core mínimo** que centraliza autenticación y base de datos, con módulos acoplables livianos que siempre corren junto al core.
**Decisión de negocio que enmarca este plan:** ningún módulo necesita venderse o instalarse en un servidor sin el core de OmniFlow. La separación en servicios es solo por mantenibilidad interna, no para distribución externa independiente. Esto cambia la unidad de distribución de "paquete npm instalable en runtime" a "imagen Docker construida en CI dentro del monorepo".

---

## 0. Estado real verificado contra el repo (no contra planes anteriores)

Esto corrige información de auditorías previas que ya no aplica y establece la línea base real:

| Ítem | Estado real en v1.33.0 |
|---|---|
| `JwtAuthGuard` resuelve `tenantPrisma` vía `TenantResolutionService` | ✅ **Ya implementado.** No se debe rehacer. |
| `ApiKeyGuard` resuelve `tenantPrisma` vía `TenantResolutionService` | ✅ **Ya implementado.** |
| Servicios con Postgres propio (contenedor+volumen+red dedicados) | biolinks, bookings, giveaways, omnibookings, omnilinks, pos, sync (7 confirmados; data-editor/omnibi/omnicatalog/omnisites/social-catalog/whatsapp-catalog no declaran Postgres propio en su compose — a confirmar en Fase 1 cuál DB usan realmente) |
| Servicios que dependen de `@orderflow/auth-shared` vía `file:../../packages/auth-shared` | 12 (biolinks, bookings, data-editor, giveaways, hr, omnibi, omnibookings, omnicatalog, omnilinks, pos, social-catalog, sync, whatsapp-catalog) |
| Servicios sin `auth-shared` ni guard JWT propio visible | loyalty, quotations, storefront-builder, omnicrm, omnisites, omnivector — **estado de auth desconocido, requiere auditoría dedicada antes de tocarlos (ver Fase 1)** |
| `docker-compose.yml` de standalones con fallback débil de secretos | Confirmado en biolinks, bookings, giveaways, omnibookings, omnilinks, pos, sync: `JWT_SECRET=${JWT_SECRET:-orderflow-secret-key-change-in-production}` — **esto anula el fail-fast que ya existe a nivel de código**, porque el compose le inyecta un valor válido (aunque débil) antes de que la app pueda detectar que falta |
| Servicios que ya llaman al core por HTTP (`core-http.service.ts`) | biolinks, omnilinks, giveaways — hoy para otro propósito, reutilizable como base del cliente de auth |
| Config real de ruteo de Traefik (routers, middlewares, labels por servicio) | ✅ Obtenida (repo `traefik-orderflow` en producción). Ver hallazgos abajo. |
| Standalones realmente expuestos en producción vía Traefik | Solo 4 de 18: `giveaways`, `whatsapp-catalog`, `omnisites`, `omnivector` (rutas `PathPrefix`/`Host` propias, ver `dynamic/services.yml`). Los otros 14 no tienen router — no están públicamente expuestos en este servidor, o se sirven de otra forma no cubierta por este repo. |
| Middleware de auth existente en Traefik | ❌ **Ninguno.** Los 4 routers expuestos solo aplican (o ni eso) `secure-headers`/`secure-headers-cloudflare` (CSP/HSTS) — cero verificación de identidad a nivel de proxy. Toda la auth depende hoy del guard interno de cada standalone. |
| Proveedor de Traefik | Solo `file` (`/etc/traefik/dynamic`, sin `docker` provider ni labels) — todo el ruteo es explícito en `dynamic/services.yml`, lo que permite escribir el `forwardAuth` con precisión sobre archivos versionados. |
| Alcance de este Traefik | **Compartido con proyectos no relacionados a OmniFlow** (Axon, AIEER/CETISA, Capacitaciones Psicovital, Vitalog, Nandutia, Vaultwarden). Cualquier cambio debe tocar únicamente los routers de OrderFlow/standalones. |
| Alcance del core en la red de Traefik | Ya alcanzable como `http://orderflow-backend-prod:3010` en la red externa `traefik-public` — es el target natural del `forwardAuth`. |

---

## 1. Arquitectura objetivo

```
Cliente → Traefik ──(middleware forwardAuth)──> Core /internal/auth/validate
                │                                        │
                │  (200 OK + headers X-Tenant-Id,        │
                │   X-User-Id, X-Roles, X-Is-SuperAdmin) │
                ▼                                        │
          Módulo (biolinks, pos, hr, ...)  ←──────────────
                │
                ▼
          Postgres compartido (schema propio por módulo, misma instancia que el core)
```

- El core sigue siendo el único que conoce `JWT_SECRET` / `MASTER_API_KEY`.
- Traefik nunca deja pasar una request a un módulo sin que el core la valide primero.
- Los módulos no importan `@orderflow/auth-shared` para verificar tokens — a lo sumo importan un helper que **lee** headers ya validados.
- Los módulos no levantan su propio contenedor Postgres — usan la misma instancia del core, con su propio schema (mismo patrón que `TenantConnectionManager`, extendido de "por tenant" a "por módulo+tenant").
- La imagen Docker de cada módulo se construye en CI con el monorepo completo disponible (`file:../../packages/auth-shared` resuelve sin problema en build time) y se publica versionada — no se necesita registry npm privado porque nunca se instala fuera del monorepo/CI.

---

## 2. Fases

### Fase 0 — Cierre de información y confirmación de asunciones
**No es código.** Con el repo de Traefik ya auditado, lo que queda pendiente:
1. ✅ ~~Conseguir el ruteo real de Traefik~~ — resuelto. Solo 4 standalones (`giveaways`, `whatsapp-catalog`, `omnisites`, `omnivector`) están expuestos en producción; el resto no tiene router. **Esto reordena la prioridad: el `forwardAuth` de Fase 2 se aplica primero a esos 4, no a los 18.**
2. Confirmar qué pasa con los 14 standalones sin router: ¿no están desplegados en Hetzner todavía, se acceden solo por red interna sin pasar por Traefik, o hay otro mecanismo (ej. proxy vía el propio backend) no cubierto por ninguno de los dos repos auditados? Esto decide si son riesgo real hoy o trabajo a futuro.
3. Auditar los 6 servicios huérfanos de auth (loyalty, quotations, storefront-builder, omnicrm, omnisites, omnivector) — de estos, **omnisites y omnivector ya están expuestos públicamente sin guard visible ni middleware de auth en Traefik**, lo cual los vuelve prioridad alta, no solo prolijidad.
4. Confirmar, para los 6 servicios sin Postgres propio declarado en su compose (data-editor, omnibi, omnicatalog, omnisites, social-catalog, whatsapp-catalog), si ya usan la DB del core (como omnibi, que apunta a `orderflow_db`) o una externa distinta.

### Fase 1 — Contrato `AuthContext` + endpoint interno en el core
- Definir el contrato de headers que el core entrega tras validar: `X-Tenant-Id`, `X-User-Id`, `X-User-Email`, `X-User-Role`, `X-Is-SuperAdmin`.
- Nuevo endpoint `GET /internal/auth/validate` en el backend, protegido para que solo Traefik (red interna) pueda llamarlo — reutiliza `JwtAuthGuard`/`ApiKeyGuard` y `TenantResolutionService` ya existentes, no se reescribe la lógica de validación, solo se expone como endpoint consumible por el forwardAuth.

### Fase 2 — Traefik `forwardAuth`
- Alcance real (confirmado contra `traefik-orderflow`): aplica primero a los **4 routers hoy expuestos** (`giveaways-standalone`/`-http`, `whatsapp-catalog-standalone`/`-http`, `omnisites-standalone`/`-http`, `omnivector-standalone`/`-http`). Los otros 14 se agregan a `dynamic/services.yml` recién cuando se desplieguen públicamente (Fase 0.2).
- Nuevo middleware en `dynamic/headers.yml` (mismo archivo donde ya viven `secure-headers`/`secure-headers-cloudflare`):

```yaml
    core-forward-auth:
      forwardAuth:
        address: "http://orderflow-backend-prod:3010/internal/auth/validate"
        authResponseHeaders:
          - "X-Tenant-Id"
          - "X-User-Id"
          - "X-User-Email"
          - "X-User-Role"
          - "X-Is-SuperAdmin"
        trustForwardHeader: true
```

- Agregar `core-forward-auth` a la lista de `middlewares` de los 8 routers de esos 4 servicios en `dynamic/services.yml` (ej. `giveaways-standalone` pasa de `middlewares: []` implícito a `middlewares: [core-forward-auth]`; igual para `-http`, `whatsapp-catalog-standalone(-http)`, `omnisites-standalone(-http)`, `omnivector-standalone(-http)`).
- **No tocar ningún otro router** (Axon, AIEER/CETISA, Vitalog, Nandutia, Vaultwarden, Capacitaciones, Odoo, demo-odoo) — son proyectos ajenos a OmniFlow en el mismo Traefik.
- Los módulos dejan de poder confiar en su propio guard como única defensa — pero **no se retira el guard interno todavía** (eso es Fase 4); en esta fase conviven ambos como defensa en profundidad hasta confirmar que el `forwardAuth` funciona en producción.

### Fase 3 — Consolidar Postgres
- Migrar los 7 módulos con Postgres propio confirmado a la instancia compartida del core, un schema por módulo (`CREATE SCHEMA biolinks;`, etc.), usando el mismo mecanismo de `TenantConnectionManager` extendido.
- Dar de baja los contenedores/volúmenes/redes Postgres dedicados de esos 7 `docker-compose.yml`.

### Fase 4 — Retirar JWT/guards propios de los módulos
- En los 12 que usan `@orderflow/auth-shared`: reemplazar `ApiKeyGuard`/verificación JWT propia por un middleware simple que lee los headers ya validados por Traefik (falla si no están presentes — nunca confía en un módulo alcanzado sin pasar por el forwardAuth).
- En los 6 huérfanos: aplicar el mismo patrón, cerrando lo que la Fase 0.2 haya encontrado abierto.
- Reducir `packages/auth-shared` a, como mucho, un helper de lectura de headers — sin `JWT_SECRET` ni `MASTER_API_KEY` en ningún módulo.

### Fase 5 — Consolidar `docker-compose`
- Unificar los 18 `docker-compose.yml` sueltos en la definición de servicios del compose del core (o un `docker-compose.modules.yml` único), compartiendo red y Postgres, sin duplicar `JWT_SECRET`/`MASTER_API_KEY` en ningún lado.

### Fase 6 — Actualizar plan de Marketplace/addons
- Ajustar `PLAN_OMNIFLOW_MARKETPLACE_ADDONS.md`: la unidad de distribución pasa de `.omniaddon.tar.gz` con dependencias npm a resolver en destino, a **imagen Docker versionada** construida en CI. Se elimina la necesidad de un registry npm privado (Verdaccio) para este propósito.

---

## 3. Prompts de implementación por fase

> Nota: cada prompt es autocontenido, respeta AGENTS.md (no condicionar por `ORDERFLOW_MODE` en services, no instanciar `PrismaClient` directo, Traefik es el único proxy, Axios como cliente HTTP), y asume que el Implementador ya leyó `docs/00-contexto-agentes.md`.

### PROMPT — Fase 1

```
Rol: Implementador (OrderFlow/OmniFlow).
Contexto: JwtAuthGuard y ApiKeyGuard ya resuelven tenant/tenantPrisma vía
TenantResolutionService/TenantConnectionManager. No reescribas esa lógica.

Tarea: crear GET /internal/auth/validate en el backend core que:
1. Reutilice JwtAuthGuard/ApiKeyGuard existentes (via composición, no reimplementación).
2. Devuelva 200 con headers: X-Tenant-Id, X-User-Id, X-User-Email, X-User-Role,
   X-Is-SuperAdmin cuando la auth es válida; 401 en caso contrario.
3. Esté restringido a la red interna (no exponerlo en rutas públicas de Traefik).
4. Tenga test de integración cubriendo: token válido, token inválido, superadmin,
   api-key master.

No toques JwtAuthGuard ni ApiKeyGuard salvo lo estrictamente necesario para
exponer el resultado a este nuevo endpoint.
```

### PROMPT — Fase 3 (ejemplo para un módulo, repetir por cada uno de los 7)

```
Rol: Implementador (OrderFlow/OmniFlow).
Módulo: <nombre-standalone>
Tarea: migrar la base de datos de este módulo de un contenedor Postgres propio
a un schema dedicado dentro de la instancia Postgres compartida del core.
1. Crear schema `<modulo>` en la DB del core.
2. Ajustar DATABASE_URL del módulo a la instancia compartida + `?schema=<modulo>`.
3. Correr las migraciones existentes del módulo contra el nuevo schema.
4. Dar de baja el servicio `postgres` y su volumen en el docker-compose.yml
   de este módulo.
5. Validar que el módulo levanta y responde su healthcheck contra el schema nuevo
   antes de borrar el volumen viejo.

No mezcles datos de un módulo en el schema de otro ni en el schema `public` del core.
```

### PROMPT — Fase 2

```
Rol: Implementador (repo traefik-orderflow, NO el repo de OrderFlow backend).
Contexto: Traefik usa solo el proveedor `file` sobre /etc/traefik/dynamic.
El core backend ya es alcanzable como http://orderflow-backend-prod:3010
en la red traefik-public. Fase 1 (endpoint /internal/auth/validate) debe
estar deployada antes de aplicar esto.

Tarea:
1. Agregar el middleware `core-forward-auth` en dynamic/headers.yml (forwardAuth
   contra http://orderflow-backend-prod:3010/internal/auth/validate, con
   authResponseHeaders: X-Tenant-Id, X-User-Id, X-User-Email, X-User-Role,
   X-Is-SuperAdmin).
2. Agregar `core-forward-auth` a la lista de middlewares de estos routers
   (y solo estos) en dynamic/services.yml:
   giveaways-standalone, giveaways-standalone-http,
   whatsapp-catalog-standalone, whatsapp-catalog-standalone-http,
   omnisites-standalone, omnisites-standalone-http,
   omnivector-standalone, omnivector-standalone-http.
3. NO modificar ningún otro router (axon-*, orderflow-prod*, odoo-*,
   aieer-*, capacitaciones, demo-odoo, vaultwarden*, vitalog*, nanduti-prod)
   — son proyectos ajenos a OmniFlow en este mismo Traefik.
4. Validar con `docker exec traefik traefik healthcheck` (o recarga del
   provider file) que no rompió el resto de los routers antes de dar por
   cerrada la fase.

No tocar traefik.yml (entrypoints/certResolvers) ni docker-compose.yml del
stack de Traefik — el cambio es exclusivamente en dynamic/headers.yml y
dynamic/services.yml.
```

*(Los prompts de Fases 4, 5 y 6 se generan con el mismo nivel de detalle una vez resuelta la Fase 0.2 — qué pasa con los 14 standalones sin router hoy.)*
