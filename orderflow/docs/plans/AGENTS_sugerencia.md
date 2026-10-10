# AGENTS.md — OrderFlow Harness Engineering Protocol

> **Protocolo Operativo de Actuación y Barrera de Calidad para Inteligencia Artificial**  
> **Versión:** 2.3.0 (Harness Engineering & E2E QA Standard + Wiki/Traefik Sync + Troubleshooting First + DB Naming Convention)  
> **Fecha:** 2026-09-21  

---

## 🚦 1. Primer Paso Obligatorio: Carga de Contexto
Antes de examinar código o ejecutar cualquier acción en la base del proyecto, debes consultar el documento de contexto técnico vivo:
👉 [docs/00-contexto-agentes.md](docs/00-contexto-agentes.md)

---

## 🛡️ 2. Reglas Inviolables de Arquitectura & Código

1. **`tenantId` es Sagrado:** NO eliminar `tenantId` de ninguna query ni tabla. Ambos modos (`community` y `enterprise`) dependen de él.
2. **Cero Lógica de Negocio Condicionada por `ORDERFLOW_MODE`:** Prohibido usar `if (mode === 'enterprise')` dentro de services (`*.service.ts`). La diferencia es responsabilidad exclusiva de los guards y middleware.
3. **Prohibido Instanciar `PrismaClient` Directamente:** Usar `this.prisma` (singleton) o `@TenantPrisma()` (dinámico multi-tier). Nunca hacer `new PrismaClient()`.
4. **Infraestructura Proxy Exclusive Traefik v3.4:** Prohibido sugerir o configurar Nginx. Traefik administra SSL y subdominios dinámicos. La configuración de Traefik se gestiona desde `/opt/traefik-orderflow` y debe sincronizarse a `/srv/traefik` en el servidor de producción después de cada cambio mayor. Traefik sirve a múltiples servicios (OrderFlow, Aieer, Axon y otros) en los servidores de producción; los cambios de ruteo o configuración deben respetar los servicios existentes y no romper el enrutamiento de servicios ajenos a OrderFlow. La documentación de Traefik (`README.md`, `ROADMAP.md`, `POS_KDS_ARCHITECTURE.md` y archivos en `dynamic/`) debe mantenerse sincronizada con la Wiki oficial (`/opt/wiki/orderflow/`) cuando haya cambios de ruteo o arquitectura.
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
10. **Prohibición de Colores Hardcodeados & Obligatoriedad de Tokens de Tema:** Queda estrictamente PROHIBIDO incluir colores absolutos o valores HEX hardcodeados (`#ffffff`, `#000000`, `#e2e8f0`, etc.) en componentes React, Ant Design, CSS inline o en la creación de nuevas páginas/endpoints del frontend. Todo nuevo desarrollo UI DEBE consumir obligatoriamente los tokens de diseño del sistema (`theme.useToken()` de Ant Design, variables `var(--ant-*)` o el sistema de temas dinámico) para garantizar soporte nativo 100% para modo claro y oscuro, alto contraste y paridad de diseño premium.
11. **Incremento de Versión Menor por Feature (OBLIGATORIO — Validación de Deploy):** Cada nueva feature (FEAT-XXX) implementada y desplegada debe incluir un **incremento de versión menor** (`patch` o `minor` según criticidad) en `VERSION`, `backend/package.json`, `frontend/package.json` y `featurelist.json` para:
    - Forzar rebuild de imágenes Docker (evitar cache stale).
    - Validar el pipeline de deploy end-to-end (build → push → despliegue → health check).
    - Mantener historial de versiones rastreable por feature.
    - **Regla:** Sin incremento de versión, el deploy no se considera completo. Usar `patch` para fixes/cambios menores, `minor` para nuevas features con endpoints o lógica de negocio nueva.
    - **Aclaración de Vertical:** Los cambios implementados dentro de una vertical existente (ej: OmniGastro) que NO agreguen endpoints nuevos ni lógica de negocio inédita en el core OrderFlow usan `patch` (ej: 1.34.3 → 1.34.4). El bump `minor` (ej: 1.34 → 1.35) se reserva para features que amplíen la superficie de API del core o introduzcan un nuevo módulo público.
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

---

## 🗄️ 2.4 Convención de Columnas de Base de Datos y Migraciones (OBLIGATORIO)

Esta sección es **vinculante** para todo el proyecto y existe para resolver de raíz una familia de bugs recurrente (ver `docs/troubleshooting/06-postgresql-camelcase-column-names.md`, `132-rls-migration-snakecase-columns.md` y `151-prisma-migration-failed-birthday-campaigns.md`).

1. **Convención de columnas para TODO desarrollo nuevo:** toda tabla o columna nueva usa `snake_case` en PostgreSQL con `@map("nombre_columna")` explícito en `schema.prisma` (y `@@map("nombre_tabla")` en el modelo). El campo de Prisma en sí se mantiene `camelCase` (`tenantId`), solo la columna real de la base de datos va en `snake_case` (`tenant_id`). Esto aplica sin excepción a partir de la migración `20260912_rls_enable` (troubleshooting #132) en adelante — ninguna migración nueva debe crear columnas `camelCase` sin comillas.
2. **Zona legacy explícita (no retroactiva):** las tablas creadas antes del 2026-09-12 (ej. `tenants`, `module_installations`, `cash_registers` y otras del core histórico) usan `camelCase` sin `@map()`, documentado en troubleshooting #06. No se migran retroactivamente salvo tarea explícita del usuario. Cualquier migración SQL que las toque debe seguir usando comillas dobles (`"tenantId"`) tal como están hoy.
3. **SQL cross-cutting (RLS, backups, scripts de mantenimiento, joins entre módulos):** antes de escribir un `WHERE`/`SET`/`JOIN` que toque más de una tabla, verificar explícitamente la convención de cada tabla involucrada — nunca asumir que todas usan la misma. Si mezcla ambas zonas, separar en bloques `DO $$ ... END $$;` según convención, como se resolvió en troubleshooting #132.
4. **Nombre de carpeta de migración — timestamp completo obligatorio:** el nombre SIEMPRE debe llevar el formato completo `YYYYMMDDHHMMSS_descripcion` (nunca solo `YYYYMMDD_descripcion`). Motivo: Prisma aplica las migraciones en orden alfabético del nombre de carpeta, no por hora real de creación del archivo — dos migraciones del mismo día con nombre corto pueden desplegarse en un orden distinto al que fueron probadas localmente, generando drift no reproducible.
5. **Nombre de tabla en Foreign Keys:** las FK de una migración SQL deben referenciar el nombre real de la tabla en PostgreSQL (plural, minúscula, ej. `"tenants"`), nunca el nombre del modelo Prisma en PascalCase (ej. `"Tenant"`) — ver troubleshooting #151, migración fallida por este motivo.
6. **Lectura previa obligatoria:** antes de escribir cualquier migración SQL manual o script de mantenimiento sobre la base de datos, consultar `docs/troubleshooting/06-postgresql-camelcase-column-names.md` y `docs/troubleshooting/132-rls-migration-snakecase-columns.md`.

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

**Sintaxis del script:** `./scripts/deploy-production.sh <target>`
- Targets válidos: `production` (hetzner-orderflow) y `provecchio` (dimoraserverlocal).
- El deploy remoto hace commit automático en el servidor, por lo que el repo local debe estar limpio y actualizado antes de ejecutarlo.

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
