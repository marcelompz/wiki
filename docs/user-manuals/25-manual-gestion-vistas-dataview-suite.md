# 📘 Manual de Usuario: OmniFlow DataView Suite — Gestión Estándar de Vistas & Selección Global (`v1.20.39`)

> **Módulo:** DataView Suite / Gestión de Vistas, Filtros Avanzados, Selección Global & Presets  
> **Ubicación del Documento:** `docs/user-manuals/25-manual-gestion-vistas-dataview-suite.md`  
> **Versión de OrderFlow / OmniFlow:** v1.20.39+  
> **Fecha:** 26 de Agosto de 2026

---

## 1. INTRODUCCIÓN Y PROPÓSITO

![OmniFlow DataView Suite](/home/marcelompz/.gemini/antigravity-cli/brain/81248e19-f485-437b-aa12-83861e977a30/manual_dataview_suite_1787780287128.jpg)

La **OmniFlow DataView Suite** es el motor estandarizado de visualización y manipulación de datos en grillas/tablas para todo el ecosistema OmniFlow (Productos, Contactos, Pedidos e Inventario).

### 🎯 Características Clave:
1. **Selección Global sin Límites de Página ("Select All Across Pages"):** Permite seleccionar de forma declarariva 10.000+ registros filtrados y aplicar acciones masivas directamente en base de datos.
2. **Constructor de Filtros Avanzados (`<FilterBuilder>`):** Combinación de condiciones dinámicas (`eq`, `ne`, `ilike`, `gt`, `gte`, `between`, `in`) por cualquier columna tipada.
3. **Control Personalizado de Columnas (`<ColumnVisibility>`):** Ocultar, mostrar y reorganizar columnas según las necesidades del usuario.
4. **Vistas Guardadas & Presets (`SavedViews`):** Guardar combinaciones de filtros en la base de datos con visibilidad Privada u Homologada para todo el tenant.
5. **Acciones Masivas en Lote (`<BulkActions>`):** Ejecución atómica de operaciones masivas (cambios de estado, asignaciones de categoría, eliminación).

---

## 2. ARQUITECTURA DEL MOTOR DE CONSULTAS (`DynamicQueryBuilder`)

```mermaid
graph TD
    UI["Frontend UI (<DataTableContainer>)"]
    QueryParams["Query Params URL (?filter[price][gte]=50000)"]
    Controller["NestJS Controller (@DataViewQuery)"]
    Builder["DynamicQueryBuilder Service"]
    Prisma["Prisma ORM (PostgreSQL)"]

    UI -->|1. Cambio de Filtro / Paginador| QueryParams
    QueryParams -->|2. HTTP Request GET| Controller
    Controller -->|3. Parsea DTOs FilterQueryDto| Builder
    Builder -->|4. Genera cláusulas WHERE / ORDERBY| Prisma
    Prisma -->>UI: 5. Retorna lote paginado + conteo total
```

---

## 3. CÓMO USAR LA SELECCIÓN GLOBAL Y ACCIONES MASIVAS

### 🔹 Paso 1: Aplicar Filtros Avanzados
Haz clic en **"Filtros Avanzados"** para desplegar el constructor. Agrega condiciones como `Precio >= 50.000` o `Estado = Activo`.

### 🔹 Paso 2: Selección Global ("Select All Across Pages")
Al marcar la casilla del encabezado de la tabla:
1. La tabla seleccionará los registros de la página actual.
2. Aparecerá el **Banner de Selección Global**:  
   > *"Se seleccionaron 25 registros en esta página. **[Seleccionar los 15.000 registros filtrados]**"*
3. Al hacer clic en el enlace azul, el sistema conmuta a **`mode: 'all'`**, seleccionando virtualmente todo el catálogo filtrado sin sobrecargar la memoria del navegador.

### 🔹 Paso 3: Ejecutar Acción Masiva
Haz clic en **"Acciones Masivas"** y selecciona la operación requerida (ej. *Activar Seleccionados*, *Exportar a Excel* o *Eliminar*). El backend procesará los 15.000 registros en base de datos.

---

## 4. GESTIÓN DE VISTAS GUARDADAS (PRESETS)

Puedes guardar tus combinaciones de filtros más utilizadas (ej: *"Productos Sin Stock"*, *"Clientes VIP"*, *"Pedidos Pendientes"*):

1. Configura tus filtros y columnas deseadas.
2. Abre el selector de **Vistas Guardadas** y haz clic en **"Guardar Vista Actual"**.
3. Asigna un nombre (ej. `Clientes VIP`) y selecciona la visibilidad:
   - **Privada:** Visible únicamente para tu usuario.
   - **Pública:** Compartida con todos los usuarios de tu empresa (`tenant`).
4. Opcionalmente marca la opción **"Establecer como Vista Predeterminada"** para que se cargue automáticamente cada vez que ingreses al módulo.
