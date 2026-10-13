# **OmniFlow — Plan Maestro de Arquitectura y Desarrollo Técnico: Gestión Estándar de Vistas**

**Documento Técnico Oficial — Especificación de Arquitectura de Vistas (List Views, Selección Global, Filtros Avanzados, Vistas Guardadas y Acciones Masivas)**  
**Ecosistema:** OmniFlow SaaS (NestJS, Prisma ORM, PostgreSQL 15, Redis, BullMQ, React 18, Refine.dev, Ant Design 5\)  
**Versión:** 1.0.0  
**Fecha:** Agosto 2026  
**Estado:** Aprobado y Vigente

---

## **1\. Visión General y Principios de Diseño**

El subsistema de **Gestión Estándar de Vistas (OmniFlow DataView Suite)** tiene como objetivo unificar y estandarizar la experiencia de usuario y la arquitectura técnica de todas las grillas/tablas de administración en OmniFlow (Productos, Contactos, Pedidos, Movimientos de Inventario, Facturación y Compras).

### ***Principios Rectores:***

1. **Selección Global sin Saturación de Memoria ("Select All Across Pages"):** Desacoplar la selección de registros de los IDs puntuales de página. Si un usuario selecciona "todos los 15.000 productos filtrados", el frontend envía una instrucción declarativa (`mode: 'all'`, `filters`, `excluded_ids`) y el backend procesa la consulta directamente en base de datos mediante streaming o workers asíncronos.  
2. **Sincronización Bidireccional con URL (Deep Linking & Shareable Views):** Todo estado de filtrado, búsqueda, ordenamiento y paginación se refleja síncronamente en los query params de la URL (`?page=1&per_page=25&sort=-created_at&filter[price][gte]=50000`). Esto permite recargar la página, navegar con el historial del navegador (Back/Forward) y compartir enlaces con filtros predefinidos.  
3. **Persistencia Multinivel de Preferencias:**  
   - *Visibilidad y orden de columnas:* Persistido en `localStorage` por tenant/usuario/recurso para inmediatez.  
   - *Vistas Guardadas (Presets / Segmentos):* Persistidas en PostgreSQL vía modelo `SavedView`, permitiendo alternar rápidamente entre combinaciones complejas de filtros (ej. "Productos sin stock", "Clientes VIP", "Facturas Vencidas").  
4. **Desacoplamiento Declarativo (DRY \- Don't Repeat Yourself):** Toda la lógica de grilla, paginación, filtros y selección se encapsula en componentes y hooks reutilizables (`useDataTable`, `<DataTableContainer>`). Para agregar una nueva entidad, el desarrollador solo define un archivo de configuración tipado `DataTableConfig<T>`.  
5. **Aislamiento Multi-Tenant Estricto:** Cada consulta, exportación y acción masiva valida de forma inviolable el `tenantId` en la capa de datos.

---

## **2\. Diagrama de Arquitectura Integral**

┌─────────────────────────────────────────────────────────────────────────────────────────┐

│                              FRONTEND (React / Refine / AntD)                           │

│                                                                                         │

│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │

│  │                              \<DataTableContainer\>                                 │  │

│  │  ┌─────────────────────────────────────────────────────────────────────────────┐  │  │

│  │  │                                \<Toolbar\>                                    │  │  │

│  │  │ \[QuickSearch\] \[FilterBuilder\] \[ColumnVisibility\] \[SavedViews\] \[BulkActions\]  │  │  │

│  │  └─────────────────────────────────────────────────────────────────────────────┘  │  │

│  │  ┌─────────────────────────────────────────────────────────────────────────────┐  │  │

│  │  │                 \<SelectionBanner\> (Selección de Página vs Total)            │  │  │

│  │  └─────────────────────────────────────────────────────────────────────────────┘  │  │

│  │  ┌─────────────────────────────────────────────────────────────────────────────┐  │  │

│  │  │                 \<TableView\> (Header Ordenable \+ Rows con Checkbox)          │  │  │

│  │  └─────────────────────────────────────────────────────────────────────────────┘  │  │

│  │  ┌─────────────────────────────────────────────────────────────────────────────┐  │  │

│  │  │                 \<DataTablePagination\> (Selector de tamaño y página)         │  │  │

│  │  └─────────────────────────────────────────────────────────────────────────────┘  │  │

│  └─────────────────────────────────────────┬─────────────────────────────────────────┘  │

│                                            │                                            │

│                                 Hook: useDataTable\<T\>()                                 │

│                   (Sincronización URL Query Params \+ Estado de Selección)               │

└────────────────────────────────────────────┼────────────────────────────────────────────┘

                                             │ HTTP REST (JSON / Streaming)

                                             ▼

┌─────────────────────────────────────────────────────────────────────────────────────────┐

│                                 BACKEND (NestJS Core)                                   │

│                                                                                         │

│  ┌─────────────────────────┐   ┌───────────────────────────┐   ┌─────────────────────┐  │

│  │ List Controller (GET)   │   │ Bulk Action (POST/PATCH)  │   │ Export Worker (POST)│  │

│  │ • Paginación            │   │ • Selección Global        │   │ • BullMQ Queue      │  │

│  │ • Filtros tipados       │   │ • Actualización por lote  │   │ • ExcelJS / CSV     │  │

│  │ • Multi-Sort            │   │ • Ejecución atómica       │   │ • URL de Descarga   │  │

│  └────────────┬────────────┘   └─────────────┬─────────────┘   └──────────┬──────────┘  │

│               │                              │                            │             │

│               └──────────────────────┐       │       ┌────────────────────┘             │

│                                      ▼       ▼       ▼                                  │

│                          ┌───────────────────────────────────────┐                      │

│                          │          BulkQueryBuilder\<T\>          │                      │

│                          │  (Traducción a Prisma / SQL Crudo)    │                      │

│                          └───────────────────┬───────────────────┘                      │

└──────────────────────────────────────────────┼──────────────────────────────────────────┘

                                               │

                                               ▼

┌─────────────────────────────────────────────────────────────────────────────────────────┐

│                                 PERSISTENCIA (PostgreSQL)                               │

│  • Tablas de Negocio: products, contacts, orders, stock\_moves                           │

│  • Tabla de Preferencias: saved\_views (Segmentos y Filtros Guardados)                   │

└─────────────────────────────────────────────────────────────────────────────────────────┘

---

## **3\. Modelo de Datos Prisma (`schema.prisma`)**

Para soportar las Vistas Guardadas y Segmentos Personalizados por Usuario y Tenant:

enum ViewVisibility {

  PRIVATE // Solo visible para el usuario creador

  PUBLIC  // Compartida con todo el equipo del tenant

}

model SavedView {

  id          String         @id @default(uuid()) @db.Uuid

  tenantId    String         @map("tenant\_id") @db.Uuid

  userId      String         @map("user\_id") @db.Uuid

  resource    String         @db.VarChar(50) // "products", "contacts", "orders", etc.

  name        String         @db.VarChar(100) // Ej: "Cafés de Especialidad Activos"

  icon        String?        @db.VarChar(50)

  isDefault   Boolean        @default(false) @map("is\_default")

  visibility  ViewVisibility @default(PRIVATE)


  // Configuración serializada del estado de la vista

  config      Json           // { filters: {...}, sort: \[...\], columns: \[...\], perPage: 25, search: "" }


  createdAt   DateTime       @default(now()) @map("created\_at")

  updatedAt   DateTime       @updatedAt @map("updated\_at")

  tenant      Tenant         @relation(fields: \[tenantId\], references: \[id\], onDelete: Cascade)

  @@unique(\[tenantId, userId, resource, name\])

  @@index(\[tenantId, resource\])

  @@map("saved\_views")

}

---

## **4\. Contratos API Estandarizados**

### ***4.1. Consulta de Listado (`GET /api/v1/{resource}`)***

GET /api/v1/products?page=1\&per\_page=25\&sort=-created\_at,name\&filter\[category\_id\]\[eq\]=4\&filter\[price\]\[between\]=10000,50000\&filter\[name\]\[like\]=cafe\&fields=id,sku,name,price,stock,status

**Operadores Soportados por Tipo de Dato:**

- **Texto:** `eq`, `ne`, `like` (case-insensitive substring), `starts_with`, `ends_with`, `is_null`, `is_not_null`.  
- **Numérico / Moneda:** `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `between`.  
- **Fecha:** `eq`, `gt`, `gte`, `lt`, `lte`, `between` (formato ISO 8601 o timestamps).  
- **Enum / Boolean / Relación:** `eq`, `ne`, `in` (array separado por comas), `nin`.

**Respuesta Estándar (200 OK):**

{

  "data": \[

    {

      "id": "1042",

      "sku": "CF-ESP-01",

      "name": "Café Espresso Blend 1kg",

      "price": 125000,

      "stock": 45,

      "status": "active"

    }

  \],

  "meta": {

    "pagination": {

      "total\_records": 1280,

      "current\_page": 1,

      "per\_page": 25,

      "total\_pages": 52

    },

    "active\_filters": {

      "category\_id": { "eq": "4" },

      "price": { "between": \[10000, 50000\] },

      "name": { "like": "cafe" }

    },

    "sort": \[

      { "field": "created\_at", "direction": "desc" },

      { "field": "name", "direction": "asc" }

    \]

  }

}

---

### ***4.2. Selección Global y Acciones Masivas (`POST /api/v1/{resource}/bulk-action`)***

{

  "selection": {

    "mode": "all",

    "excluded\_ids": \["1042", "1055"\],

    "filters": {

      "category\_id": { "eq": "4" },

      "status": { "eq": "active" }

    },

    "search": "espresso"

  },

  "action": "update\_status",

  "data": {

    "status": "inactive"

  }

}

---

### ***4.3. Exportación Masiva Asíncrona (`POST /api/v1/{resource}/export`)***

{

  "selection": {

    "mode": "all",

    "excluded\_ids": \[\],

    "filters": {

      "status": { "eq": "active" }

    },

    "search": ""

  },

  "export\_config": {

    "format": "xlsx",

    "columns": \["sku", "name", "price", "stock", "category.name"\],

    "title": "Catalogo\_Productos\_Activos"

  }

}

**Respuesta Inmediata (202 Accepted):**

{

  "job\_id": "job\_exp\_98a72bdf",

  "status": "queued",

  "total\_affected\_records": 1280,

  "download\_url": null,

  "message": "La exportación se está procesando en background."

}

---

## **5\. Matriz de Entidades y Vistas del Sistema**

| Módulo | Recurso (`resource`) | Filtros Principales | Acciones en Lote (Bulk Actions) | Exportación |
| :---- | :---- | :---- | :---- | :---- |
| **Productos** | `products` | Categoría, Estado, Rango Precio, Stock Bajo, Tags, Ribbon | Cambiar Estado, Asignar Categoría, Ajuste % Precios, Eliminar | Catálogo Completo (XLSX/CSV), Plantilla Importación |
| **Contactos** | `contacts` | Tipo (Cliente/Proveedor), RUC/CI, Ciudad, Estado, Tags | Enviar Notificación/Email, Asignar Categoría, Cambiar Estado | Listado Contactos, Libreta Direcciones |
| **Pedidos (POS/Ventas)** | `orders` | Canal (POS, Web, WhatsApp), Rango Fechas, Estado, Mesa, Mozo | Cancelación Masiva, Reenvío de Comprobantes, Re-sincronizar | Reporte de Ventas Detallado, Cierre de Caja |
| **Inventario** | `stock_moves` | Warehouse, Location, Tipo Movimiento, Fecha, Variante | Validación Masiva de Movimientos, Reajuste de Kardex | Reporte de Movimientos, Valorización de Inventario |

---

## **6\. Serie de Prompts de Implementación**

Para ejecutar la construcción paso a paso de forma limpia y testeable, se define la siguiente serie modular de prompts:

1. **`01_PROMPT_BACKEND_CONTRATOS_QUERYBUILDER.md`**: DTOs, validación de filtros dinámicos, `BulkQueryBuilder` universal y endpoints base de listado y selección.  
2. **`02_PROMPT_BACKEND_SAVED_VIEWS_Y_EXPORT_WORKER.md`**: Modelo Prisma `SavedView`, módulo CRUD de vistas guardadas y Worker BullMQ de exportación asíncrona con streaming ExcelJS/CSV.  
3. **`03_PROMPT_FRONTEND_CORE_HOOKS_Y_COMPONENTES.md`**: Hook `useDataTable`, sincronización URL, componentes visuales de Toolbar, FilterBuilder, ColumnVisibility y SelectionBanner.  
4. **`04_PROMPT_FRONTEND_INSTANCIACION_MODULOS.md`**: Configuraciones declarativas para Productos (`ProductListConfig.ts`), Contactos (`ContactListConfig.ts`), Pedidos e Inventario.  
5. **`05_PROMPT_TESTING_E2E_Y_ROLLOUT.md`**: Suite de pruebas unitarias, de integración y E2E con Playwright, benchmarks de carga masiva y checklist de homologación.

