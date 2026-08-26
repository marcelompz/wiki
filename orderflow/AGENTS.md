# AGENTS.md — OrderFlow Harness Engineering Protocol

> **Protocolo Operativo de Actuación y Barrera de Calidad para Inteligencia Artificial**  
> **Versión:** 2.2.1 (Harness Engineering & E2E QA Standard + Wiki/Traefik Sync + Troubleshooting First)  
> **Fecha:** 2026-08-07  

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
