# 🛠️ Troubleshooting #72 — Integración de OmniFlow DataView Suite en Vistas Admin & Corrección de Checkbox Duplicado

> **Área:** Frontend / Admin App / DataView Suite  
> **Síntoma:**  
> 1. En la pantalla de **Productos & Variantes** (`/admin/products`), **Contactos** (`/admin/contacts`) y **Pedidos** (`/admin/orders`), no aparecían la barra de **Filtros Avanzados** (`<FilterBuilder>`), el selector de **Vistas Guardadas** (`SavedViews`), el control de **Visibilidad de Columnas** (`<ColumnVisibility>`) ni el **Banner de Selección Global** (`<SelectionBanner>`).  
> 2. En la tabla de **Productos & Variantes**, aparecían dos casillas de verificación (checkbox) por fila; la segunda no respondía y la primera marcaba ambas.  
> **Estado:** ✅ Resuelto en `v1.20.41`  

---

## 🔍 Causa Raíz

1. **Desacople en la Integración de Pantallas:**  
   Los componentes de UI Kit (`DataTableContainer`, `FilterBuilder`, `ColumnVisibility`, `SelectionBanner`) y las configuraciones (`ProductListConfig`, `ContactListConfig`) existían en `frontend/src/components/data-view/`, pero las páginas en `frontend/src/pages/admin/` (`products.tsx`, `contacts.tsx`, `orders.tsx`) continuaban utilizando directamente la tabla básica `<Table>` de Ant Design con llamadas manuales a la API en lugar de instanciar `<DataTableContainer>`.

2. **Doble Checkbox en la Tabla de Productos:**  
   El componente `products.tsx` tenía una columna manual hardcodeada que renderizaba un componente `<Checkbox>` propio en la primera celda, además de tener activada la propiedad `rowSelection` nativa de la `<Table>` de Ant Design. Esto provocaba la duplicación visual de dos checkboxes por cada fila de la grilla.

3. **Deserialización de Parámetros de Filtrado:**  
   En `products.service.ts`, el método `findAll` leía directamente `filters.category` y `filters.search` sin una salvaguarda defensiva contra `undefined`, lo que podía desencadenar un error HTTP 500 si la llamada HTTP enviaba parámetros vacíos o no tipados.

---

## 🛠️ Solución Aplicada

1. **Creación del Componente `SavedViews` (`frontend/src/components/data-view/SavedViews.tsx`):**  
   Se desarrolló el selector interactivo de vistas guardadas conectado a los endpoints `/api/v1/saved-views`, permitiendo guardar y cargar presets (públicos y privados por tenant/usuario) directamente desde la barra superior del contenedor.

2. **Extensión de `DataTableContainer.tsx`:**  
   Se añadió soporte para `resource` (para SavedViews) y la propiedad `extraToolbarActions` para recibir botones de acción propios de cada módulo (ej. *Atributos Globales*, *Importar/Exportar Variantes*, *Nuevo Producto*, *Generar QR*).

3. **Refactorización de Vistas Admin:**  
   - `frontend/src/pages/admin/products.tsx`: Conectado a `<DataTableContainer>` con `resource="products"`. Se eliminó la columna manual de checkbox duplicada.
   - `frontend/src/pages/admin/orders.tsx`: Conectado a `<DataTableContainer>` con `resource="orders"`.
   - `frontend/src/pages/admin/contacts.tsx`: Conectado a `<DataTableContainer>` con `resource="contacts"`.

4. **Defensiva de Parámetros Nulos (`products.service.ts`):**  
   Se incorporó la inicialización segura `const f = filters || {}` en `ProductsService.findAll` y se ajustó `fetchProducts` en `products.tsx` para no adjuntar el parámetro `filters` cuando `activeFilters` esté vacío.

---

## 🧪 Validación de la Solución

- **Verificación de Compilación:** Compilación limpia con TypeScript (`tsc && vite build`) sin errores.
- **Validación Visual:** Un solo checkbox de selección por fila gobernado por `DataTableContainer` con soporte para selección masiva de página y selección global en base de datos (`mode: 'all'`).
- **Pruebas de Despliegue:** Verificación exitosa en pipeline de deploy a producción con paso de suite E2E de Playwright.
