# Plan de Implementación: OmniFlow Data Editor (`@orderflow/data-editor`)

> **Estado:** Propuesta de Arquitectura e Implementación  
> **Versión:** 1.0.0  
> **Módulos Afectados:** `frontend/` (OmniBI Analytics), `services/data-editor-standalone/` (Microservicio Standalone), `docs/` & Traefik Proxy.

---

## 📌 1. Visión General de la Feature

**OmniFlow Data Editor** es un editor y validador de datos universal multi-formato (JSON, CSV, XLSX) diseñado para la visualización, edición en tiempo real, limpieza de estructuras tabulares y jerárquicas, y validación estricta de esquemas de datos (Odoo `res.partner`, `product.template`, `sale.order`, `omniflow.workflow`, etc.).

### Capacidades Clave Analizadas del Paquete (`omniflow-data-editor.zip`):
1. **Tres Modos de Visualización Interactivos:**
   - **Table View (Vista Tabular / Hoja de Cálculo):** Edición rápida celda a celda estilo Excel/AG-Grid, adición y eliminación de filas, paginación y formateo de columnas automático.
   - **Tree View (Vista Jerárquica):** Exploración y modificación de estructuras de objetos y arreglos JSON anidados con colapso/expansión.
   - **Raw View (Editor de Código JSON):** Edición directa de JSON en texto plano con resaltado de sintaxis y detección de errores de sintaxis.
2. **Motor de Validación de Esquemas (Schema Validation Engine):**
   - Validación en tiempo real contra esquemas de modelos Odoo/OmniFlow (requeridos, tipos de datos, formato email, opciones de selección enum, rangos numéricos min/max).
   - Panel lateral de validaciones con conteo de errores/advertencias y resalte visual de celdas inválidas.
3. **Ingesta y Exportación Multi-Formato:**
   - Parser cliente de `.json`, `.csv`, `.xlsx` (vía SheetJS / `xlsx`).
   - Exportación limpia a JSON, CSV o XLSX conservando tipos de datos.
4. **Capacidad de Embebido y Standalone:**
   - Modal de generación de código embed (Iframe, React component, Script tag, Standalone app).

---

## 🏗️ 2. Arquitectura de Integración (Doble Modalidad)

Para garantizar flexibilidad máxima, la función se implementará bajo una **arquitectura híbrida**:

```mermaid
graph TD
    A[Cliente / Usuario final] -->|Ruta: tenant.domain.com/admin/bi/editor| B[Frontend OrderFlow Monorepo]
    A -->|Ruta: data-editor.domain.com| C[Microservicio Standalone Docker]
    
    subgraph Monorepo Frontend
        B --> D[OmniBI Analytics Hub]
        D --> E[OmniFlowDataEditor Component]
    end

    subgraph Standalone Microservice
        C --> F[Traefik v3.4 Reverse Proxy]
        F --> G[Data Editor Container]
        G --> H[@orderflow/auth-shared]
    end

    E --> I[Data Parser & Schema Validator]
    G --> I
    I --> J[(PostgreSQL / Odoo 14-18 Historical Ingestion)]
```

---

## 🚀 3. Fases del Plan de Implementación

### Fase 1: Integración en Monorepo Core (OmniBI Analytics Hub)
**Ubicación:** `frontend/src/components/bi/data-editor/` y `frontend/src/pages/admin/bi-data-editor.tsx`

1. **Refactorización e Higiene de Nombres (`kebab-case`):**
   - Adaptar los archivos del paquete al estándar del monorepo (`omni-flow-data-editor.tsx`, `table-view.tsx`, `tree-view.tsx`, `raw-view.tsx`, `validation-panel.tsx`, `embed-code-modal.tsx`, `file-parser.ts`, `schema-validator.ts`).
   - Reemplazar Tailwind v4 beta inline / bun standalone dependencies por el stack UI actual del Frontend de OrderFlow (Ant Design 5 + Tailwind CSS v3 / React 18 + Lucide Icons).
2. **Integración con OmniBI Analytics (`/admin/bi`):**
   - Añadir pestaña/sección **"Editor de Datos ETL & Inspección Odoo"** en el Hub de OmniBI (`frontend/src/pages/admin/bi.tsx`).
   - Permitir cargar datos históricos exportados de Odoo 14 / Odoo 18 para visualización, limpieza y re-ingesta pre-evaluada.
   - Conectar con el backend de OrderFlow para persistir datasets corregidos a endpoints API de NestJS (`POST /api/v1/bi/datasets/ingest`).

### Fase 2: Extracción y Empaquetado como Standalone (`services/data-editor-standalone`)
**Ubicación:** `/opt/orderflow/services/data-editor-standalone/`

1. **Creación del Proyecto Standalone:**
   - Estructura desacoplada equivalente a `services/giveaways-standalone/`.
   - Incorporar `@orderflow/auth-shared` para la validación de tokens JWT y API Keys multi-tenant (`tenantId`).
   - `Dockerfile` multitapa (Node 20 Alpine + Nginx / Serve) optimizado para bajo consumo de RAM.
2. **Configuración de Docker & Traefik v3.4:**
   - `docker-compose.data-editor.yml` con etiquetas de Traefik v3.4.
   - Enrutamiento por subdominio dinámico: `<tenant.subdomain>.<ROOT_DOMAIN>/editor` o subdominio global de herramientas `data-editor.<ROOT_DOMAIN>`.
   - Reglas de Rate Limiting y Middleware de Auth en Traefik.

### Fase 3: Sincronización de Documentación, Wiki & Despliegue
1. **Actualización de Documentación:**
   - Crear manual de uso en `docs/user-manuals/omnibi/manual-omniflow-data-editor.md`.
   - Especificaciones técnicas en `docs/specifications/features/FEAT-128-omniflow-data-editor.md`.
2. **Sincronización Obligatoria de Manifiestos y Wiki:**
   - Registrar la nueva feature en `featurelist.json` (ID: `FEAT-128`).
   - Incrementar versión semántica en `VERSION`, `CHANGELOG.md`, `ROADMAP.md` y `package.json`.
   - Sincronizar documentación con `/opt/wiki/orderflow/` y `/opt/traefik-orderflow/`.

---

## 📋 4. Matriz de Tareas (`featurelist.json` draft)

| Task ID | Componente | Descripción | Estado |
|---|---|---|---|
| `FEAT-128-1` | Frontend / OmniBI | Adaptar componentes de `@omniflow-data-editor` a React 18 / AntD / Lucide en `frontend/src/components/bi/data-editor/` | `PENDING` |
| `FEAT-128-2` | Backend / NestJS | Crear DTO y Endpoint `POST /api/v1/bi/datasets/validate-ingest` para guardar/procesar datos tabulares editados | `PENDING` |
| `FEAT-128-3` | Frontend / OmniBI | Integrar `OmniFlowDataEditor` en la vista de OmniBI (`/admin/bi/editor`) | `PENDING` |
| `FEAT-128-4` | Standalone | Crear microservicio `services/data-editor-standalone/` con `Dockerfile` y `@orderflow/auth-shared` | `PENDING` |
| `FEAT-128-5` | Traefik v3.4 | Configurar rutas dinámicas en `/opt/traefik-orderflow/dynamic/data-editor.yml` y sincronizar a `/srv/traefik` | `PENDING` |
| `FEAT-128-6` | Wiki & Docs | Sincronizar `ROADMAP.md`, `CHANGELOG.md`, `VERSION` y Wiki oficial (`/opt/wiki/orderflow/`) | `PENDING` |

---

## 🛡️ 5. Cumplimiento de Reglas Inviolables de Arquitectura

- ✅ **`tenantId` Preservado:** Toda operación de guardado/edición transmitida al backend requiere validación de `tenantId` vía JWT/API Key.
- ✅ **Cero branching por `ORDERFLOW_MODE`:** El componente funciona de manera idéntica en `community` y `enterprise`.
- ✅ **Traefik v3.4 Exclusivo:** Sin referencias a Nginx para proxying primario; Traefik administra los subdominios de tenant.
- ✅ **Convención Nombres:** Archivos en `kebab-case` (`omni-flow-data-editor.tsx`), componentes en `PascalCase`.
- ✅ **Sincronización Total Wiki & Repo:** Todo cambio documentado en `ROADMAP.md`, `VERSION`, `CHANGELOG.md` y sincronizado a `/opt/wiki/orderflow/`.
