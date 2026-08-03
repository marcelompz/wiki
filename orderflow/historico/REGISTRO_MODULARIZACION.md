# Registro de Avances: Versionamiento y Modularización

**Fecha:** 2026-06-22  
**Estado Actual:** Fase 1 Completada ✅  
**Próximo Objetivo:** Fase 2 (Endpoints y UI de Módulos)

---

## 🎯 ¿Qué se ha implementado hasta ahora?

### 1. Sistema de Versionamiento Unificado (Opción A)
Se implementó un sistema de control de versiones visual, unificado y sincronizado para todo el ecosistema (monorepo), descartando herramientas pesadas (como Nx) en favor de scripts limpios y directos.

* **Archivos Creados:**
  * `VERSION`: Declaración maestra de la versión actual (`0.1.0-alpha.2`).
  * `CHANGELOG.md`: Registro histórico visual, estructurado y legible por humanos de todos los cambios, correcciones y auditorías.
  * `packages.json`: Manifiesto personalizado que detalla qué puertos, entornos y tecnologías componen las partes del sistema (backend, frontend, mobile, odoo-adapter).
  * `scripts/version.js`: Script de automatización Node.js ejecutable que se encarga de realizar el "bump" (salto) de versión, actualizando sincrónicamente todos los `package.json` de cada sub-proyecto.

### 2. Arquitectura Modular Estilo Odoo (Fase 1)
Preparamos el terreno para que OrderFlow pase de ser un "código monolítico rígido" a un "ecosistema de aplicaciones instalables", replicando la brillante arquitectura de Odoo.

* **Manifiestos por Módulo (`*.manifest.json`):** Se generaron 11 archivos de configuración (uno para cada módulo interno del backend: `auth`, `tenants`, `products`, `orders`, etc.). Estos archivos definen el nombre de la app, dependencias, si es auto-instalable, etc.
* **Registro en Memoria (`ModulesRegistry`):** Se creó el servicio `backend/src/modules.registry.ts`. Su trabajo es escanear los directorios durante el encendido del servidor, leer los manifiestos JSON y armar un árbol de dependencias de todos los módulos disponibles en el código.
* **Inyección de Arranque:** Se modificó `backend/src/main.ts` para que ejecute la lectura del registro de módulos inmediatamente al arrancar el servidor.

---

## 🚀 Próximos Pasos (Roadmap Inmediato)

Para hacer que estos módulos recién registrados cobren vida y sean interactivos para los administradores, avanzaremos con:

### Fase 2: Exposición, UI de Gestión y Módulos Dinámicos (COMPLETADA ✅)
1. **Modelo de Persistencia (`ModuleInstallation`):** Se creó en Prisma la tabla que permite guardar qué tenant instaló qué módulo, así como configuraciones dinámicas en formato `JSON` (ej: Credenciales SFTP). Esto permite que el comportamiento de los módulos varíe por cliente.
2. **Primer Módulo Dinámico (`backups`):** Se porteó un script de Python externo hacia TypeScript nativo usando `ssh2-sftp-client` y `@nestjs/schedule`. Su configuración de conexión y la periodicidad del respaldo ahora pueden leerse dinámicamente desde la base de datos (por tenant).
3. **Endpoint de Exposición (`SystemModulesController`):** Se creó el controlador `/api/v1/modules` en el backend. Gestiona la lógica de instalación, validación de dependencias, desinstalación y guardado de configuraciones (JSON) asociadas a cada módulo.
4. **Interfaz Gráfica (App Store):** Se construyó la vista `frontend/src/pages/admin/modules.tsx` en el panel de administración. Provee una interfaz tipo "Tienda de Aplicaciones", donde el Super Administrador puede visualizar tarjetas estéticas por cada módulo detectado, y con botones dinámicos para **Instalar**, **Desinstalar** y **Configurar**.

### Fase 3: Ciclo de Vida y Pruebas de Estrés Arquitectónico (EN PROCESO 🚧)
1. **Módulo de Prueba (Presupuestos / Quotations):** ✅ **COMPLETADO**. Se creó el módulo `quotations` de manera aislada con su propio manifiesto (`autoInstall: false`). Este módulo demuestra con éxito la arquitectura modular:
   - Se inyecta al catálogo de la "App Store" de manera transparente.
   - Define dependencias estrictas (`depends: ["customers", "products"]`).
   - Define un esquema de configuración nativo en su manifiesto (`validityDays`, `termsAndConditions`), lo que genera automáticamente un formulario en la UI de React para que el usuario guarde esas preferencias.
   - Cuenta con su propia lógica de base de datos aislada (`Quotation` y `QuotationItem` en Prisma) y sus propios endpoints REST.
2. **Sistema de Migraciones (Pendiente):** Habilitar la capacidad de que cada módulo tenga una carpeta `migrations/` donde pueda ejecutar scripts SQL o semillas de datos específicas únicamente cuando el tenant decide "Instalar" la aplicación.
