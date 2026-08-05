# AGENTS.md — OrderFlow Harness Engineering Protocol

> **Protocolo Operativo de Actuación y Barrera de Calidad para Inteligencia Artificial**  
> **Versión:** 2.2.0 (Harness Engineering & E2E QA Standard + Wiki/Traefik Sync)  
> **Fecha:** 2026-07-31  

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
6. **Mantenimiento del Roadmap Standalone:** Cualquier cambio en la suite independiente debe sincronizarse en [docs/ROADMAP_MICROSERVICES.md](docs/ROADMAP_MICROSERVICES.md).
7. **Sincronización de Documentación con Wiki:** Toda actualización de documentación en `docs/` del proyecto debe reflejarse en la Wiki oficial (`/opt/wiki/orderflow/`). Cuando se actualiza `VERSION`, `CHANGELOG.md`, `ROADMAP.md` o cualquier `.md` en `docs/`, la Wiki debe actualizarse en el mismo paso y hacer push a su repositorio remoto.

---

## ⚙️ 3. Barrera de Validación Automatizada (`scripts/init.sh`)

La IA tiene **terminantemente prohibido** entregar una tarea como completada, o realizar modificaciones en la **Base de Datos (Prisma/PostgreSQL)**, **Configuración de Red/DNS/Traefik** o **Lógica de Desarrollo**, sin ejecutar previamente la barrera automatizada:

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

---

## 📊 4. Sistema de Memoria Estructurada (`featurelist.json`)

Toda tarea o refactorización debe leerse y gestionarse desde la lista estructurada de características:
👉 [featurelist.json](featurelist.json)

### Ciclo de Actualización:
- Al tomar una tarea: cambiar estado a `"in_progress"`.
- Al finalizar y pasar `./scripts/init.sh`: cambiar estado a `"completed"` e incrementar la versión en `VERSION`, manifiestos y documentaciones vinculadas.

---

## 🎭 5. Protocolo de Orquestación por Roles (Multi-Fase)

Para evitar la saturación de contexto, toda tarea compleja debe ejecutarse dividiéndose en 3 roles clave:

1. 🎯 **Líder / Planificador:**
   - Lee `docs/00-contexto-agentes.md` y selecciona el siguiente ítem `PENDING` de `featurelist.json`.
   - Traza el plan sin modificar código de negocio.

2. 🛠️ **Implementador:**
   - Modifica código respetando las 6 Reglas Inviolables.
   - Si extrae un microservicio standalone, aplica `@orderflow/auth-shared` y su propio `schema.prisma`.

3. 🔍 **Revisor / Auditor:**
   - Ejecuta `./scripts/init.sh`.
   - Verifica la sincronización de versión en `VERSION`, `CHANGELOG.md`, `ROADMAP.md`, `package.json` y manifiestos `*.manifest.json`.
   - Crea y sube el tag de la nueva versión: `git tag vX.Y.Z && git push --tags`.
   - Sincroniza la documentación actualizada con la Wiki oficial (`/opt/wiki/orderflow/`) y la documentación de Traefik (`/opt/traefik-orderflow/`), haciendo push a sus respectivos repositorios.
