# AGENTS.md — OrderFlow Harness Engineering Protocol

> **Protocolo Operativo de Actuación y Barrera de Calidad para Inteligencia Artificial**  
> **Versión:** 2.2.2 (Harness Engineering & E2E QA Standard + Wiki/Traefik Sync + Troubleshooting First + Provecchio Deploy Fixes)  
> **Fecha:** 2026-10-19  

---

## 🚦 1. Primer Paso Obligatorio: Carga de Contexto
Antes de examinar código o ejecutar cualquier acción en la base del proyecto, debes consultar el documento de contexto técnico vivo:
👉 [docs/00-contexto-agentes.md](docs/00-contexto-agentes.md)

---

## 🛡️ 2. Reglas Inviolables de Arquitectura & Código

1. **`tenantId` es Sagrado:** NO eliminar `tenantId` de ninguna query ni tabla. Ambos modos (`community` y `enterprise`) dependen de él.
2. **Certificados TLS en dominios `.local`:** En entornos **locales/development**, está permitido usar `tls: {}` (certificados auto-firmados) para dominios como `*.local` porque no hay resolución DNS pública y Traefik los gestiona internamente. **En producción NUNCA se debe usar `tls: {}`** sin un certResolver válido (ej. `letsencrypt`), ya que generaría certificados auto-firmados inaceptables para entornos reales y rompería la confianza del usuario. El archivo `/opt/traefik-orderflow/dynamic/services.yml` dokumenta este patrón con comentarios explicando la diferencia. **Para Provecchio: los routers `provecchio-frontend` / `provecchio-api` usan entrypoint `websecure` (HTTPS) únicamente; HTTP retorna 404 — esto es esperado, el redirect HTTP→HTTPS se maneja en edge/Cloudflare.**
2. **Cero Lógica de Negocio Condicionada por `ORDERFLOW_MODE`:** Prohibido usar `if (mode === 'enterprise')` dentro de services (`*.service.ts`). La diferencia es responsabilidad exclusiva de los guards y middleware.
3. **Prohibido Instanciar `PrismaClient` Directamente:** Usar `this.prisma` (singleton) o `@TenantPrisma()` (dinámico multi-tier). Nunca hacer `new PrismaClient()`. 

   **Omnigastro-config Module Requirements:**
   - **Architecture**: Create a standalone, tenant-aware module with isolated database access
   - **Configuration Management**: Support payment routing configuration for both custom endpoints and Odoo integration
   - **API Design**: Implement RESTful endpoints following existing project patterns
   - **Security**: Apply appropriate tenant isolation and permission controls
   - **Validation**: Validate configuration inputs and enforce business rules
   - **Documentation**: Comprehensive API documentation and examples
   - **Testing: ** Complete test coverage for all endpoints and business logic
   - **Integration**: Follow existing module integration patterns and dependencies

   **Module Structure Expectations**:
   - `src/modules/omnigastro-config/` directory
   - `controllers/omnigastro-config.controller.ts` - API endpoints
   - `services/omnigastro-config.service.ts` - Business logic
   - `dto/omnigastro-settings.dto.ts` - Data types and validation
   - `omnigastro-config.module.ts` - NestJS module configuration
   - `omnigastro-config.manifest.json` - Module metadata
   bypass end
4. **Endpoints Públicos QR / Guest: Sin Auth ni `@TenantPrisma()`:** Los endpoints que son llamados por el frontend **antes** de autenticación (QR de mesa escaneado, Bio-Link público, Fast Checkout) **NUNCA** deben llevar `@UseGuards(ApiKeyGuard)` ni `@TenantPrisma()`. El `@TenantPrisma()` lanza `UnauthorizedException` cuando `request.tenantPrisma` es `undefined`, y `ApiKeyGuard` exige API key o JWT. Ambos rompen el flujo público.

   **Regla de detección (pre-commit / CI):** Todo endpoint que contenga `@TenantPrisma()` DEBE estar protegido por `@UseGuards(ApiKeyGuard)` o `JwtAuthGuard`. La única excepción son los endpoints públicos QR/Bio-Link, que **no deben usar `@TenantPrisma()` en absoluto** y deben resolver tenant desde el propio dato de la request (QR token → `restaurantTable.tenantId`, slug → `bioLink.tenantId`, etc.) usando `this.prisma` (singleton).

   **Endpoints públicos que usan `this.prisma` directamente (NO `@TenantPrisma()`):**
   - `GET /api/v1/bio/:slug` — `BioLinksController.getPublicBySlug`
   - `GET /api/v1/bio/tenant/:tenantId` — `BioLinksController.getPublicByTenantId`
   - `POST /api/v1/bio/public/:slug/click` — `BioLinksController.registerClick`
   - `POST /api/v1/bio/public/:slug/order` — `BioLinksController.createOrderFromBioLink`
   - `GET /api/v1/guest/tables/by-token/:qrToken` — `GuestTablesController.byToken`
   - `POST /api/v1/guest/orders` — `GuestOrdersController.createDraft`
   - `GET /api/v1/guest/orders/:id` — `GuestOrdersController.track`
   - `POST /api/v1/guest/tables/:tableId/call-waiter` — `GuestCallWaiterController.callWaiter`

   **Verificación obligatoria en cada release:** Ejecutar `grep -rn "@TenantPrisma" backend/src --include="*.ts" | grep -v ".spec.ts"` y confirmar que cada resultado tiene `@UseGuards(ApiKeyGuard)` o `@UseGuards(JwtAuthGuard)` en el mismo controlador/método. Los endpoints de la lista superior NO deben aparecer.

   **Causa raíz histórica:** El error "OmniBio No Encontrado" + "API key or valid JWT missing" en `https://provecchio.local/?t=<token>` fue causado porque estos endpoints públicos llevaban `@TenantPrisma()` sin guard, o `@UseGuards(ApiKeyGuard)` a nivel de clase. Véase `docs/troubleshooting/107-biolink-public-endpoints-missing-apikeyguard-fix.md` y `docs/troubleshooting/143-public-qr-endpoints-must-not-use-tenantprisma.md`.
4. **Infraestructura Proxy Exclusive Traefik v3.4:** Prohibido sugerir o configurar Nginx. Traefik administra SSL y subdominios dinámicos. La configuración de Traefik se gestiona desde `/opt/traefik-orderflow` y debe sincronizarse a `/srv/traefik` en el servidor de producción después de cada cambio mayor. Traefik sirve a múltiples servicios (OrderFlow, Aieer, Axon y otros) en los servidores de producción; los cambios de ruteo o configuración deben respetar los servicios existentes y no romper el enrutamiento de servicios ajenos a OrderFlow. La documentación de Traefik (`README.md`, `ROADMAP.md`, `POS_KDS_ARCHITECTURE.md` y archivos en `dynamic/`) debe mantenerse sincronizada con la Wiki oficial (`/opt/wiki/orderflow/`) cuando haya cambios de ruteo o arquitectura. **Para Provecchio: el archivo destino es `/opt/srv/traefik/dynamic/services.yml` (no `/opt/traefik-orderflow/` en el servidor); sincronizar con `scp` y recargar con `docker kill -s HUP traefik`.**
5. **Formato y Coexistencia de Módulos:** Verificar acoplamiento cross-module. Si un nuevo módulo posee acoplamiento 0, califica como candidato para la suite de Microservicios Standalone.
6. **Mantenimiento del Roadmap Standalone:** Cualquier cambio en la suite independiente debe sincronizarse en [docs/guides/ROADMAP_MICROSERVICES.md](docs/guides/ROADMAP_MICROSERVICES.md).
7. **Sincronización de Documentación con Wiki:** Toda actualización de documentación en `docs/` del proyecto debe reflejarse en la Wiki oficial (`/opt/wiki/orderflow/`). Es **OBLIGATORIO** actualizar e incluir el `ROADMAP.md` junto con `VERSION`, `CHANGELOG.md`, `README.md`, `package.json` y cualquier `.md` en `docs/` en cada release o entrega de características, haciendo push a sus repositorios remotos.
8. **Subdominios Exclusivos por Tenant:** Todo microservicio, módulo público o ruta expuesta debe usar el subdominio del tenant (`<tenant.subdomain>.<ROOT_DOMAIN>`). Está prohibido crear subdominios por servicio, categoría o módulo. El core OrderFlow es el único autorizado para crear/validar subdominios vía `CloudflareDnsService`. Ver estándar completo: `docs/architecture/tenant-subdomain-standard.md`.
9. **Autorización Previa Obligatoria para Despliegues:** Queda estrictamente PROHIBIDO que la IA ejecute despliegues, builds de producción, reinicios de contenedores o comandos/scripts de deploy (tales como `docker compose up`, `deploy-production.sh`, etc.) sin solicitar y obtener autorización previa y explícita del usuario.

   **Uso correcto de `scripts/deploy-production.sh`:**
   - Targets disponibles:
     - `production` — Host: `hetzner-orderflow` (`root@178.105.226.175`), path: `/srv/orderflow`, env: `.env` / `.env.production` / `.env.prod`
     - `provecchio` — Host directo: `root@192.168.69.240` (`dimoraserverlocal`), fallback con ProxyJump: `root@38.52.135.227:2021` (`dimoraserver1`), path: `/srv/orderflow`, env: `.env.prod` / `.env.provecchio` / `.env`
   - Sintaxis: `./scripts/deploy-production.sh <target>`
     - Ejemplo producción: `./scripts/deploy-production.sh production`
     - Ejemplo provecchio: `./scripts/deploy-production.sh provecchio`
   - El script hace rsync al remoto, commit automático en el servidor, build Docker, migrate, health checks y cleanup.
   - **Pre-requisito obligatorio:** cambios locales deben estar commiteados y pusheados a `origin/main` antes de ejecutar el deploy, porque el script hace `git stash` + `git push` y lo que quede sin commit queda fuera del despliegue.
   - **Nota:** El script valida variables requeridas (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `MASTER_API_KEY`) y crea backup DB pre-deploy.
   - **Rollback:** se guarda snapshot de env en `deploy-artifacts/rollback-<target>-<timestamp>.env` y el script puede revertir containers si falla migrate.

### 9.1 Checklist Específico Provecchio (OBLIGATORIO)
   Antes de ejecutar `./scripts/deploy-production.sh provecchio`, verificar:
   1. **Traefik services.yml sincronizado:** `/opt/traefik-orderflow/dynamic/services.yml` → `/opt/srv/traefik/dynamic/services.yml` en servidor
      - `orderflow-prod-frontend` → `http://orderflow_frontend:80` (NOTA: contenedor real es `orderflow_frontend`, NO `orderflow-frontend-prod`)
      - `orderflow-prod-backend` → `http://orderflow_backend:3010` (NOTA: contenedor real es `orderflow_backend`, NO `orderflow-backend-prod`)
      - **NO** `qms-web-app:3000` / `qms-backend-api:3001` (son servicios QMSSuite, puertos 3000/3001)
   2. **Recargar Traefik post-sync:** `docker kill -s HUP traefik` (no restart)
   3. **Routers provecchio solo HTTPS:** Los routers `provecchio-frontend` / `provecchio-api` usan entrypoint `websecure` únicamente; HTTP retorna 404 (esperado — redirect manejado en edge/Cloudflare)
   4. **Limpiar contenedores previos:** `docker rm -f orderflow-frontend-prod orderflow-backend-prod orderflow-odoo-adapter-prod ...` antes del deploy para evitar conflictos de nombre
   5. **Build forzado:** `docker compose up --build -d` (ver Regla #11)
   6. **Backend build sin bind mount `./backend:/app`:** El bind mount sobrescribe la carpeta `dist/` compilada. Usar solo volúmenes `/app/node_modules` y `./uploads:/app/uploads`.
   7. **tsconfig.prod.json con paths completos:** Debe incluir todos los aliases `@common/*`, `@auth/*`, `@products/*`, etc. copiados de `tsconfig.json` para que `tsc` resuelva imports en producción.
   8. **Runtime tsconfig-paths:** Agregar `tsconfig-paths` a `package.json` y usar `TS_NODE_PROJECT=dist/tsconfig.json node -r tsconfig-paths/register dist/main.js` en comando de arranque.
   9. **Variables de entorno en docker-compose.provecchio.yml:** El servicio `backend` debe tener `env_file: .env.provecchio` y `environment` explícito con `REDIS_URL` (usando nombre de contenedor `redis:6379`) y `DATABASE_URL`.
   10. **Redis con password en producción:** Configurar `command: redis-server --requirepass ${REDIS_PASSWORD}` y healthcheck con `-a ${REDIS_PASSWORD}`. En `.env.provecchio` usar `REDIS_URL=redis://:password@redis:6379` (NO `localhost`).
   11. **Sincronizar uploads de social-catalog/biolinks:** Las imágenes configuradas en `tenant.config.instances.*.logoUrl`, `bannerUrl`, `categoryBackgrounds` deben existir en `/srv/orderflow/uploads/` en producción. Usar `rsync` pre-deploy.
   12. **BrandingProvider para dominios custom:** El frontend debe pasar el hostname completo (ej. `provecchio.com`) al endpoint `tenant-by-subdomain`, no solo el primer segmento del subdominio.
10. **Prohibición de Colores Hardcodeados & Obligatoriedad de Tokens de Tema:** Queda estrictamente PROHIBIDO incluir colores absolutos o valores HEX hardcodeados (`#ffffff`, `#000000`, `#e2e8f0`, etc.) en componentes React, Ant Design, CSS inline o en la creación de nuevas páginas/endpoints del frontend. Todo nuevo desarrollo UI DEBE consumir obligatoriamente los tokens de diseño del sistema (`theme.useToken()` de Ant Design, variables `var(--ant-*)` o el sistema de temas dinámico) para garantizar soporte nativo 100% para modo claro y oscuro, alto contraste y paridad de diseño premium.
11. **Incremento de Versión Menor por Feature (OBLIGATORIO — Validación de Deploy):** Cada nueva feature (FEAT-XXX) implementada y desplegada debe incluir un **incremento de versión menor** (`patch` o `minor` según criticidad) en `VERSION`, `backend/package.json`, `frontend/package.json` y `featurelist.json` para:
    - Forzar rebuild de imágenes Docker (evitar cache stale).
    - Validar el pipeline de deploy end-to-end (build → push → despliegue → health check).
    - Mantener historial de versiones rastreable por feature.
    - **Regla:** Sin incremento de versión, el deploy no se considera completo. Usar `patch` para fixes/cambios menores, `minor` para nuevas features con endpoints o lógica de negocio nueva.
    - **Aclaración de Vertical:** Los cambios implementados dentro de una vertical existente (ej: OmniGastro) que NO agreguen endpoints nuevos ni lógica de negocio inédita en el core OrderFlow usan `patch` (ej: 1.34.3 → 1.34.4). El bump `minor` (ej: 1.34 → 1.35) se reserva para features que amplíen la superficie de API del core o introduzcan un nuevo módulo público.
    - **Rebuild de Imágenes Docker (OBLIGATORIO):** Tras cualquier incremento de versión, **siempre usar** `docker compose up --build -d` (no `docker compose restart`). El comando `restart` solo reinicia el contenedor con la imagen *existente*, preservando cachés stale. El flag `--build` fuerza la reconstrucción de la imagen con los archivos fuente actualizados. Esto aplica a todos los servicios con imágenes propias (no contenedores con bind mounts).
    - Regla: `docker compose restart <service>` NO refresca imágenes — usar siempre `docker compose up --build -d <service>`.
12. **Estructura de Documentación por Vertical (OBLIGATORIO):** Cada vertical o módulo comercial debe tener su propio directorio en `docs/plans/<Nombre_de_la_vertical>` con documentación individual que incluya al menos:
    - `README.md` — Índice y descripción general de la vertical.
    - `ROADMAP_<VERTICAL>.md` — Roadmap ejecutivo con dependencias, timeline y bloqueadores.
    - `PLAN_MAESTRO.md` — Plan maestro consolidado con numeración FEAT, fases y métricas de éxito.
    - `AUDITORIA_<VERTICAL>_<fecha>.md` — Auditoría técnica de estado inicial o de progreso.
    - `featurelist.json` — Lista estructurada de características de la vertical (sincronizada con el global).
    - `prompts/` (opcional) — Prompts y especificaciones para IA relacionados con la vertical.
    - `historico/` (opcional) — Documentación legacy u obsoleta de la vertical.
    - **Convención de nombres:** Usar `kebab-case` para los nombres de archivos (ej: `omni-catalog.tsx`, `product-variants.service.ts`).
    - **Sincronización con Wiki:** Toda actualización en `docs/plans/<vertical>/` debe reflejarse en la Wiki oficial (`/opt/wiki/orderflow/docs/plans/<vertical>/`).
 13. **Diagram-Driven Development & Telemetry-First (OBLIGATORIO):** Todo nuevo submódulo o flujo principal debe nacer con un archivo `flujo_<modulo>.md` en su respectivo directorio `docs/plans/`. Este documento debe contener un diagrama de secuencia en formato Mermaid detallando los actores, el backend (Core), sistemas de colas y servicios externos. Además, debe incluir implícitamente los contratos REST/WebSockets y declarar explícitamente los **Hitos de Telemetría (t0...tN)** para medir KPIs de negocio (ej. SLAs de cocina o tiempos de espera). Las implementaciones en código (ej. guardado de timestamps) DEBEN usar exactamente la misma nomenclatura declarada en el diagrama.
14. **Pruebas E2E Obligatorias para Nuevas Features (OBLIGATORIO):** Toda feature que modifique flujos críticos de usuario, especialmente en verticales como OmniGastro, DEBE incluir pruebas E2E con Playwright. Estas pruebas deben documentarse en `/opt/orderflow/frontend/e2e/` y cubrir al menos:
    - **Flujos críticos:** QR → pedido → KDS → mozo → cobro → cierre.
    - **Validación de endpoints públicos:** rutas públicas como `/api/v1/public/hr/kiosk/pin/verify`.
    - **Notificaciones:** eventos WebSocket y notificaciones sonoras en KDS y panel mozo.
    - **Documentación:** crear/actualizar el archivo de auditoría en `docs/plans/<vertical>/auditoria-<feature>.md` con el estado de las pruebas.
    - **Ejecución:** las pruebas deben ejecutarse con `npx playwright test` y los resultados documentarse antes de considerar la feature como completada.
    - **Validación de Importación de Datos:** toda prueba E2E de OmniGastro en localhost DEBE incluir verificación de que provecchio.com tenga importación de datos funcionando — validar endpoint `GET /api/v1/product-imports/suppliers` y `GET /api/v1/product-imports/jobs`, y confirmar que exista al menos un proveedor de catálogo activo para el tenant.

15. **Plan de Acción Previa Obligatorio (OBLIGATORIO):** Antes de tocar o modificar cualquier código (frontend, backend, configuración, etc.), la IA DEBE presentar un plan de acción detallado al usuario. El plan debe incluir:
     - Análisis del problema o bug reportado.
     - Propuesta de solución con archivos específicos a modificar.
     - Verificación de dependencias y posibles efectos secundarios.
     - Confirmación del usuario antes de proceder con los cambios.
     - **Excepción:** En casos de emergencia o fallos críticos de producción que requieran acción inmediata, se puede proceder sin plan previo, pero se debe notificar al usuario en el primer mensaje.
16. **Plan de Actualización Obligatorio para Bugs, Correcciones y Nuevas Funcionalidades (OBLIGATORIO):** Ante cualquier bug reportado, corrección aplicada o nueva funcionalidad propuesta, la IA DEBE crear un **plan de actualización** documentado antes de tocar el código. Este plan debe:
     - Identificar el alcance completo (archivos, endpoints, componentes afectados).
     - Evaluar impacto en dependencias y posibles efectos secundarios.
     - Incluir una estrategia de testing (unitarios, E2E, smoke tests).
     - Ser aprobado explícitamente por el usuario antes de ejecutar cualquier cambio.
     - Actualizarse iterativamente a medida que se descubran nuevos hallazgos durante la investigación.
     - **Prohibido:** Modificar código sin que el plan de actualización haya sido presentado y aprobado por el usuario.


---

## 🔍 2.1 Troubleshooting First (Obligatorio)

Antes de investigar un bug o error de build/despliegue, **consultar SIEMPRE** el índice de troubleshooting:

👉 [docs/troubleshooting/README.md](docs/troubleshooting/README.md)

### Regla:
1. Buscar el síntoma en el índice de troubleshooting.
2. Si existe una entrada, leer la **causa raíz** y la **solución aplicada** antes de modificar código.
3. Solo si NO hay una entrada previa, se permite investigar desde cero y, en ese caso, **documentar la nueva entrada** en `docs/troubleshooting/` para futuras referencias.

### Prohibido:
- Repetir investigaciones de errores ya documentados.
- Modificar código sin antes verificar si el problema tiene una solución conocida en troubleshooting.

---

## 🏷️ 2.2 Convención de Nombres de Archivos y Enrutamiento

Esta sección es **vinculante** para todo el proyecto.

1. **Páginas, componentes, utilidades y servicios (`.tsx`, `.ts`, `.jsx`, `.js`):** Uso estricto de `kebab-case` para todos los nombres de archivos.  
   Ejemplos válidos: `omni-catalog.tsx`, `api-key-config.tsx`, `messaging-deep-links.ts`, `product-variants.service.ts`.

2. **Exportación de componentes:** Los nombres de componentes internos deben definirse en `PascalCase` dentro de sus respectivos archivos `kebab-case`.  
   Ejemplo: `export const OmniCatalog = () => ...` dentro de `omni-catalog.tsx`.

3. **Archivos residuales y temporales:** Prohibido dejar backups (`.bkup`, `.bak`), logs (`.log`) o duplicados dentro de los directorios de código fuente (`src/`). Deben ser ignorados vía `.gitignore` o eliminados.

4. **Rutas y consistencia de despliegue:** El uso de `kebab-case` es mandatorio para garantizar compatibilidad con sistemas Linux/Docker (case-sensitive) y consistencia con las URLs públicas. Cualquier cambio de ruta debe actualizar también referencias en Traefik, React Router y `import` estáticos/dinámicos.

---

## 📁 2.3 Estándar de Estructura de Documentación (`docs/`)

La documentación del proyecto debe mantenerse organizada y clasificada estrictamente según la siguiente taxonomía de directorios:

```text
docs/
├── README.md
├── architecture/          # Arquitectura del sistema, módulos, integraciones y ADRs
│   ├── system/
│   ├── modules/
│   ├── integrations/
│   └── decisions/
├── specifications/        # Especificaciones funcionales, API y modelos de datos
│   ├── features/
│   ├── api/
│   ├── data-model/
│   └── integrations/
├── tests/                 # Documentación y reportes de suites de pruebas y features
│   ├── README.md
│   ├── FEAT-113/
│   └── FEAT-125/
├── operations/            # Manuales operativos, runbooks y procedimientos
│   ├── restaurant/
│   ├── procedures/
│   └── roles/
├── user-manuals/          # Manuales de usuario finales por producto
│   ├── omniflow/
│   ├── omnigastro/
│   ├── omnibi/
│   └── omniledger/
├── guides/                # Guías técnicas y tutoriales
├── troubleshooting/       # Índice y soluciones de problemas
├── observability/         # Monitoreo, dashboards y métricas
├── audits/                # Auditorías técnicas y de seguridad
├── plans/                 # Planes de implementación y roadmaps
├── brand/                 # Identidad de marca, logos y assets
├── legal/                 # Contratos y licencias
├── info/                  # Información general del ecosistema
├── prompts/               # Prompts y especificaciones para IA
├── screenshots/           # Capturas de pantalla de la aplicación
└── historico/             # Archivo de documentos legacy u obsoletos
```

## 🗄️ 2.4 Convención de Columnas de Base de Datos y Migraciones (OBLIGATORIO)

Esta sección es **vinculante** para todo el proyecto y existe para resolver de raíz una familia de bugs recurrente (ver `docs/troubleshooting/06-postgresql-camelcase-column-names.md`, `132-rls-migration-snakecase-columns.md` y `151-prisma-migration-failed-birthday-campaigns.md`).

1. **Convención de columnas para TODO desarrollo nuevo:** toda tabla o columna nueva usa `snake_case` en PostgreSQL con `@map("nombre_columna")` explícito en `schema.prisma` (y `@@map("nombre_tabla")` en el modelo). El campo de Prisma en sí se mantiene `camelCase` (`tenantId`), solo la columna real de la base de datos va en `snake_case` (`tenant_id`). Esto aplica sin excepción a partir de la migración `20260912_rls_enable` (troubleshooting #132) en adelante — ninguna migración nueva debe crear columnas `camelCase` sin comillas.
2. **Zona legacy explícita (no retroactiva):** las tablas creadas antes del 2026-09-12 (ej. `tenants`, `module_installations`, `cash_registers` y otras del core histórico) usan `camelCase` sin `@map()`, documentado en troubleshooting #06. No se migran retroactivamente salvo tarea explícita del usuario. Cualquier migración SQL que las toque debe seguir usando comillas dobles (`"tenantId"`) tal como están hoy.
3. **SQL cross-cutting (RLS, backups, scripts de mantenimiento, joins entre módulos):** antes de escribir un `WHERE`/`SET`/`JOIN` que toque más de una tabla, verificar explícitamente la convención de cada tabla involucrada — nunca asumir que todas usan la misma. Si mezcla ambas zonas, separar en bloques `DO $$ ... END $$;` según convención, como se resolvió en troubleshooting #132.
4. **Nombre de carpeta de migración — timestamp completo obligatorio:** el nombre SIEMPRE debe llevar el formato completo `YYYYMMDDHHMMSS_descripcion` (nunca solo `YYYYMMDD_descripcion`). Motivo: Prisma aplica las migraciones en orden alfabético del nombre de carpeta, no por hora real de creación del archivo — dos migraciones del mismo día con nombre corto pueden desplegarse en un orden distinto al que fueron probadas localmente, generando drift no reproducible.
5. **Nombre de tabla en Foreign Keys:** las FK de una migración SQL deben referenciar el nombre real de la tabla en PostgreSQL (plural, minúscula, ej. `"tenants"`), nunca el nombre del modelo Prisma en PascalCase (ej. `"Tenant"`) — ver troubleshooting #151, migración fallida por este motivo.
6. **Lectura previa obligatoria:** antes de escribir cualquier migración SQL manual o script de mantenimiento sobre la base de datos, consultar `docs/troubleshooting/06-postgresql-camelcase-column-names.md` y `docs/troubleshooting/132-rls-migration-snakecase-columns.md`.

---

## 🌿 2.5 Flujo de Trabajo con Branches (OBLIGATORIO)

Toda feature, fix o cambio de código DEBE desarrollarse en una rama dedicada. Prohibido trabajar directamente sobre `main` o ramas de integración.

### Nomenclatura
| Tipo | Patrón | Ejemplo |
|------|--------|---------|
| Feature | `feat/<vertical-o-area>-<descripcion>` | `feat/gastro-kds-multi-station-print` |
| Fix | `fix/<vertical-o-area>-<descripcion>` | `fix/gastro-kitchen-ticket-routing` |
| Hotfix | `hotfix/<descripcion>` | `hotfix/kds-websocket-reconnect` |

- Cuando exista un FEAT-XXX asignado, preferir `feat/<vertical>-<feat-id>-<desc>`.
- Usar `kebab-case` obligatoriamente.

### Ramas de integración
| Alcance | Rama de integración | Notas |
|---------|---------------------|-------|
| Core OrderFlow | `main` | Rama principal de despliegue |
| Vertical OmniGastro | `product/omnigastro` | Rama de integración de la vertical |
| Otras verticales | `product/<vertical>` | Una por vertical/modulo público |

> Si la rama de integración de la vertical no existe, crearla desde `main` antes de abrir la feature branch.

### Ciclo de vida
1. **Creación:** partir desde la rama de integración correspondiente.
   ```bash
   git checkout product/omnigastro
   git pull origin product/omnigastro
   git checkout -b feat/gastro-kds-multi-station-print
   ```
2. **Desarrollo:** commits atómicos siguiendo Conventional Commits.
3. **Pull Request:** abrir PR hacia la rama de integración.
4. **Cierre:** después del merge, eliminar la rama feature.
   ```bash
   git branch -d feat/gastro-kds-multi-station-print
   ```

### Reglas adicionales
- Un PR por feature/fix. Prohibido mezclar cambios no relacionados.
- El PR debe incluir: descripción, issue vinculado, plan de testing y capturas si aplica.
- Las migraciones Prisma y cambios de schema van en la misma feature branch, nunca directo en `main`.
- El merge a `main` solo se hace después de pasar `./scripts/init.sh` y actualizar versiones/documentación.

---

## ⚙️ 3. Barrera de Validación Automatizada (`scripts/init.sh`)

> ⚠️ **REGLA DE CONFIRMACIÓN DE RECURSOS DEL HOST:**  
> Debido a que `./scripts/init.sh` compila backend, frontend y ejecuta la suite completa de unit tests (Jest) y E2E (Playwright), este script consume un alto porcentaje de CPU y RAM.  
> **La IA TIENE PROHIBIDO ejecutar `./scripts/init.sh` de forma automática o desatendida sin antes pedir confirmación explícita al usuario**, informándole que liberará o cerrará aplicaciones en su equipo de oficina antes de la ejecución.

La IA debe solicitar autorización previa antes de invocar la barrera automatizada:

```bash
./scripts/init.sh
```

### El script verifica automáticamente:
1. Generación del cliente Prisma ORM (`npx prisma generate`).
2. Ejecución y aprobación del 100% de los unit tests (`jest`).
3. Compilación limpia del Backend NestJS (`npm run build`).
4. Compilación limpia de TypeScript & Vite Frontend (`frontend/`).
5. **Auditoría E2E con Playwright (`qa_e2e_check.py`):**
   - Catálogos públicos y verificación de imágenes rotas (HTTP 200/naturalWidth).
   - Navegación sin cabeza por todos los módulos del panel de administración (`/admin/products`, `/admin/customers`, `/admin/bookings`, `/admin/loyalty`, `/admin/homepage-builder`, `/admin/whatsapp-catalog`).
   - Asertividad de cero excepciones JS en consola y cero errores HTTP 502/404.

### 3.1 Pre-Deploy: Verificación del Repositorio (OBLIGATORIA)
Antes de cualquier despliegue a producción, y como **primer paso**, verificar siempre el estado del repositorio local:
- `git status` para detectar cambios sin commitear (working tree dirty).
- Si existen modificaciones pendientes que deben ir al deploy, **commiteerlas y pushearlas a `origin/main`** antes de desplegar (el script `deploy-production.sh` hace `git stash` + `git push`, por lo que los cambios sin commitear quedarían fuera del despliegue).
- Si por alguna razón se sincronizan archivos directo al servidor sin commit (deploy express), dejar registrado explícitamente que el repo local quedó desincronizado y commiteer/pushear en cuanto el usuario lo autorice.
- Nunca asumir que el servidor tiene el mismo código que el repo local: tras cualquier fix aplicado directamente en el servidor, reflejarlo en el repo local antes de commiteer.

### 3.1.1 Pre-Deploy: Deploy-to-Local-First (OBLIGATORIO)
Antes de cualquier despliegue a producción, **siempre**:
1. **Exportar datos actuales desde producción:** Ejecutar `./scripts/backup-production.sh provecchio` (o `production`) para generar un backup de la base de datos y files store actuales desde el entorno de producción.
2. **Importar datos a localhost:** Restaurar el backup exportado en el entorno local (`provecchio.local`) para garantizar que las pruebas E2E se ejecuten contra datos reales y actualizados. Esto asegura que las validaciones locales reflejen fielmente el estado de producción y previene la pérdida de información sensible durante el despliegue.
3. **Garantizar consistencia de datos:** El backup restaurado en localhost debe ser el punto de partida para todas las pruebas. Después del deploy de producción, restaurar el backup siempre que sea posible para asegurar la consistencia de datos y evitar la pérdida de información sensible.
4. Deployar a entorno local usando `./scripts/deploy-local.sh` (valida build, tests, health checks, endpoints).
5. Verificar consistencia del sistema: health endpoint, endpoints críticos (sin 500), E2E tests.
6. Verificar consistencia de datos: migraciones aplicadas correctamente, datos intactos.
7. **Validar proceso automatizado de backup/restore SFTP:** Ejecutar backup manual desde `/admin/backups` (trigger), verificar que el archivo sube al SFTP, y probar restore del último backup en entorno de staging/localhost antes de considerar el deploy completo.
8. Solo después de corroborar localmente, proceder al despliegue de producción con `./scripts/deploy-production.sh <target>` y autorización explícita del usuario.

**Sintaxis del script:** `./scripts/deploy-production.sh <target>`
- Targets válidos: `production` (hetzner-orderflow) y `provecchio` (dimoraserverlocal).
- El deploy remoto hace commit automático en el servidor, por lo que el repo local debe estar limpio y actualizado antes de ejecutarlo.

### 3.2 Pre-Deploy: Protocolo de Diagnóstico de Infraestructura (OBLIGATORIO)
Antes de cualquier `docker compose up -d` o `./scripts/deploy-production.sh`, ejecutar obligatoriamente:
- `./scripts/pre-deploy-diagnostic.sh <target>`

Este protocolo verifica, en orden:
1. Estado del repo local (`git status`, branch `main`).
2. Conectividad SSH al host remoto.
3. Espacio en disco disponible en `/var/lib/docker` y `/srv/orderflow`.
4. Estado del daemon Docker y Docker Compose.
5. Contenedores huérfanos del proyecto.
6. Redes Docker requeridas (`traefik-public`, `orderflow-network`).
7. Volúmenes Docker requeridos.
8. Validación de `docker compose config`.
9. Variables de entorno requeridas en el env file del target.
10. Conectividad a la base de datos primaria (solo para `provecchio`).

Reglas:
- Si el script reporta fallos críticos (`❌`), el deploy **no puede proceder**.
- Si reporta advertencias (`⚠️`), el deploy puede proceder, pero deben revisarse antes de continuar.
- Este diagnóstico se ejecuta automáticamente al invocar `./scripts/deploy-production.sh` y su fallo aborta el deploy.

### 3.3 Pruebas de API con Newman (Complemento a Playwright)
Newman se utiliza como herramienta complementaria para la validación de contratos de API y pruebas de integración. Su uso es obligatorio cuando se modifiquen endpoints públicos, integraciones, webhooks o contratos REST/WebSocket, **sin reemplazar** la suite Playwright de flujos E2E y UI.

- Casos de uso recomendados:
  - Smoke tests de salud y contratos base (`/api/v1/health`, `/api/v1/auth/login`, endpoints públicos de catálogo/QR/KDS).
  - Validación de integraciones y webhooks (`/api/v1/integrations/*`, `/api/v1/public/*`).
  - Pruebas de regresión de endpoints críticos sin interfaz gráfica.
- Ubicación de colecciones: `docs/tests/postman/` o `docs/tests/newman/`.
- Ejecución recomendada:
  - `newman run docs/tests/newman/contracts.postman_collection.json --environment docs/tests/newman/production.postman_environment.json --reporters cli,html --reporter-html-export docs/tests/newman/report.html`
  - En CI/CD, ejecutar después del build y antes del deploy.
- Regla: toda feature que modifique endpoints debe incluir o actualizar su colección de Newman y documentar el resultado en el archivo de auditoría correspondiente.

---

## 📊 4. Sistema de Memoria Estructurada (`featurelist.json`)

Toda tarea o refactorización debe leerse y gestionarse desde la lista estructurada de características:
👉 [featurelist.json](featurelist.json)

### Ciclo de Actualización:
- Al tomar una tarea: cambiar estado a `"in_progress"`.
- Al finalizar y pasar `./scripts/init.sh`: cambiar estado a `"completed"` e incrementar la versión en `VERSION`, manifiestos y documentaciones vinculadas (`ROADMAP.md`, `CHANGELOG.md`, `README.md`).

---

## 🎭 5. Protocolo de Orquestación por Roles (Multi-Fase)

Para evitar la saturación de contexto, toda tarea compleja debe ejecutarse dividiéndose en 3 roles clave:

1. 🎯 **Líder / Planificador:**
   - Lee `docs/00-contexto-agentes.md` y selecciona el siguiente ítem `PENDING` de `featurelist.json`.
   - Traza el plan sin modificar código de negocio.

2. 🛠️ **Implementador:**
   - Modifica código respetando las 8 Reglas Inviolables.
   - Si extrae un microservicio standalone, aplica `@orderflow/auth-shared` y su propio `schema.prisma`.

3. 🔍 **Revisor / Auditor:**
   - Ejecuta `./scripts/init.sh`.
   - **Verificación de Documentación Obligatoria:** Actualiza y verifica la sincronización de versión en `VERSION`, `CHANGELOG.md`, `ROADMAP.md` (OBLIGATORIO), `docs/timeline.md`, `README.md`, `backend/src/main.ts` (Swagger version), `package.json` y manifiestos `*.manifest.json`.
   - Crea y sube el tag de la nueva versión: `git tag vX.Y.Z && git push --tags`.
   - Sincroniza toda la documentación actualizada (`ROADMAP.md`, `CHANGELOG.md`, `README.md`, `docs/`) con la Wiki oficial (`/opt/wiki/orderflow/`) y la documentación de Traefik (`/opt/traefik-orderflow/`), haciendo push a sus respectivos repositorios.
