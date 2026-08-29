# **Prompt 04: Frontend — Instanciación Declarativa en Módulos (Productos, Contactos, Pedidos e Inventario)**

**Código:** PROMPT-VIEW-04  
**Módulo:** Frontend / Módulos de Negocio  
**Ecosistema:** OmniFlow (React 18, Refine.dev, Ant Design 5, TypeScript)  
**Propósito:** Sustituir las vistas de tabla dispersas en el frontend por la arquitectura declarativa estándar `DataTableConfig<T>`, habilitando filtros dinámicos, selección global y acciones masivas en todos los módulos operativos.

---

## **🤖 Rol y Contexto de Ingeniería**

Actúa como **Senior Frontend Engineer** de OmniFlow. Vas a configurar e integrar la suite de tablas estándar en las vistas principales de la aplicación de administración.

---

## **📋 Tareas de Implementación**

### ***1\. Módulo de Productos (`frontend/src/pages/products/`)***

#### **1.1. Archivo de Configuración (`ProductListConfig.tsx`)**

import { Tag, Badge } from 'antd';

import { DownloadOutlined, EditOutlined, TagOutlined, DeleteOutlined } from '@ant-design/icons';

import { DataTableConfig } from '@/components/data-view/types';

import { Product } from '@/types/product';

import { api } from '@/services/api';

export const productListConfig: DataTableConfig\<Product\> \= {

  resource: 'products',

  primaryKey: 'id',

  defaultSort: { field: 'created\_at', direction: 'desc' },

  quickSearchFields: \['name', 'sku', 'barcode', 'handle'\],

  columns: \[

    {

      key: 'sku',

      label: 'SKU',

      type: 'text',

      sortable: true,

      filterable: true,

      defaultVisible: true,

      width: 140,

    },

    {

      key: 'name',

      label: 'Producto',

      type: 'text',

      sortable: true,

      filterable: true,

      defaultVisible: true,

    },

    {

      key: 'category\_name',

      label: 'Categoría',

      type: 'enum',

      sortable: true,

      filterable: true,

      defaultVisible: true,

    },

    {

      key: 'price',

      label: 'Precio',

      type: 'currency',

      sortable: true,

      filterable: true,

      defaultVisible: true,

      render: (val) \=\> \`Gs. ${Number(val).toLocaleString('es-PY')}\`,

    },

    {

      key: 'stock',

      label: 'Stock',

      type: 'number',

      sortable: true,

      filterable: true,

      defaultVisible: true,

      render: (val) \=\> (

        \<Badge

          status={val \> 10 ? 'success' : val \> 0 ? 'warning' : 'error'}

          text={\`${val} un.\`}

        /\>

      ),

    },

    {

      key: 'status',

      label: 'Estado',

      type: 'enum',

      sortable: true,

      filterable: true,

      defaultVisible: true,

      options: \[

        { label: 'Activo', value: 'active', color: 'green' },

        { label: 'Inactivo', value: 'inactive', color: 'red' },

      \],

      render: (val) \=\> (

        \<Tag color={val \=== 'active' ? 'green' : 'red'}\>

          {val \=== 'active' ? 'Activo' : 'Inactivo'}

        \</Tag\>

      ),

    },

  \],

  bulkActions: \[

    {

      key: 'export\_catalog',

      label: 'Exportar Catálogo',

      icon: \<DownloadOutlined /\>,

      handler: async (selection) \=\> {

        await api.post('/products/export', {

          selection,

          export\_config: { format: 'xlsx', columns: \['sku', 'name', 'price', 'stock', 'status'\] },

        });

      },

    },

    {

      key: 'change\_status',

      label: 'Cambiar Estado',

      icon: \<EditOutlined /\>,

      handler: async (selection, formValues) \=\> {

        await api.post('/products/bulk-action', {

          selection,

          action: 'update\_status',

          data: { status: formValues.status },

        });

      },

    },

  \],

};

#### **1.2. Página Principal (`frontend/src/pages/products/list.tsx`)**

import React from 'react';

import { List } from '@refinedev/antd';

import { DataTableContainer } from '@/components/data-view/DataTableContainer';

import { productListConfig } from './ProductListConfig';

export const ProductListPage: React.FC \= () \=\> {

  return (

    \<List title="Catálogo de Productos"\>

      \<DataTableContainer config={productListConfig} /\>

    \</List\>

  );

};

---

### ***2\. Módulo de Contactos (`frontend/src/pages/contacts/`)***

Crear `ContactListConfig.tsx` con:

- Columnas: `vat` (RUC/CI), `name` (Razón Social), `email`, `phone`, `type` (Cliente/Proveedor/Ambos), `balance` (Saldo Pendiente), `is_active`.  
- Acciones masivas:  
  * Exportar Contactos a XLSX.  
  * Enviar Notificación / Correo Masivo.  
  * Asignar Etiquetas (Tags).

---

### ***3\. Módulo de Pedidos y Ventas (`frontend/src/pages/orders/`)***

Crear `OrderListConfig.tsx` con:

- Columnas: `orderNumber`, `tableNumber`, `dinersCount`, `channel` (POS, Web, WhatsApp), `total`, `status` (Draft, Kitchen, Paid, Cancelled), `createdAt`.  
- Filtros por defecto: Rango de fecha hoy, mes actual, canal de venta.  
- Acciones masivas: Cancelación masiva de órdenes borrador, Reenvío masivo de comprobantes electrónicos.

---

### ***4\. Módulo de Inventario y Kardex (`frontend/src/pages/inventory/`)***

Crear `StockMoveListConfig.tsx` con:

- Columnas: `createdAt`, `reference`, `variant_name`, `location_src`, `location_dest`, `quantity`, `unit_cost`.  
- Acciones masivas: Exportación oficial de Libro Kardex para auditoría.

---

## **🎯 Criterios de Aceptación**

1. Integración limpia en 4 módulos clave de OmniFlow con menos de 60 líneas de código por página.  
2. Homogeneidad total en la experiencia visual de filtros, selección global y exportación.

