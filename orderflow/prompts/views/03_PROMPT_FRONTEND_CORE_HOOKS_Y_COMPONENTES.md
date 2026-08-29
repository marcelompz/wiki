# **Prompt 03: Frontend — Suite de Hooks `useDataTable`, Componentes Reutilizables y UI (Refine / Ant Design 5\)**

**Código:** PROMPT-VIEW-03  
**Módulo:** Frontend / DataView UI Kit  
**Ecosistema:** OmniFlow (React 18, Refine.dev, Ant Design 5, TypeScript, TailwindCSS)  
**Propósito:** Construir los componentes de interfaz y el hook maestro `useDataTable` para desacoplar completamente la lógica de filtrado dinámico, selección global, persistencia de columnas y acciones en lote de las páginas individuales.

---

## **🤖 Rol y Contexto de Ingeniería**

Actúa como **Principal Frontend Architect** de OmniFlow. Vas a crear la suite de componentes reutilizables en `frontend/src/components/data-view/` y hooks en `frontend/src/hooks/data-view/`.

---

## **📋 Tareas de Implementación**

### ***1\. Tipado Declarativo Universal (`data-view.types.ts`)***

Definir en `frontend/src/components/data-view/types.ts`:

export type ColumnType \= 'text' | 'number' | 'currency' | 'date' | 'enum' | 'boolean' | 'custom';

export interface ColumnOption {

  label: string;

  value: string | number | boolean;

  color?: string;

}

export interface ColumnConfig\<T \= any\> {

  key: string;

  label: string;

  type: ColumnType;

  sortable?: boolean;

  filterable?: boolean;

  defaultVisible?: boolean;

  width?: number | string;

  fixed?: 'left' | 'right';

  options?: ColumnOption\[\]; // Para tipos enum/select

  render?: (value: any, record: T, index: number) \=\> React.ReactNode;

}

export interface BulkAction\<T \= any\> {

  key: string;

  label: string;

  icon?: React.ReactNode;

  danger?: boolean;

  confirmMessage?: string;

  modalForm?: React.ComponentType\<{ onSubmit: (values: any) \=\> Promise\<void\>; onCancel: () \=\> void }\>;

  handler: (selection: SelectionState, values?: any) \=\> Promise\<void\>;

}

export interface DataTableConfig\<T \= any\> {

  resource: string;

  primaryKey?: string;

  defaultSort?: { field: string; direction: 'asc' | 'desc' };

  defaultFilters?: Record\<string, any\>;

  columns: ColumnConfig\<T\>\[\];

  bulkActions?: BulkAction\<T\>\[\];

  quickSearchFields?: string\[\];

}

export interface SelectionState {

  mode: 'none' | 'page' | 'all' | 'custom';

  selectedIds: Set\<string | number\>;

  excludedIds: Set\<string | number\>;

}

---

### ***2\. Hook Maestro: `useDataTable<T>` (`useDataTable.ts`)***

Centraliza la sincronización de URL, persistencia local y estado de selección:

import { useState, useEffect, useMemo, useCallback } from 'react';

import { useTable } from '@refinedev/antd';

import { useSearchParams } from 'react-router-dom';

import { DataTableConfig, ColumnConfig, SelectionState } from '../types';

export function useDataTable\<T \= any\>(config: DataTableConfig\<T\>) {

  const \[searchParams, setSearchParams\] \= useSearchParams();

  const storageKey \= \`dataview\_cols\_${config.resource}\`;

  // 1\. Persistencia de Columnas Visibles

  const \[columns, setColumns\] \= useState\<ColumnConfig\<T\>\[\]\>(() \=\> {

    const saved \= localStorage.getItem(storageKey);

    if (saved) {

      try {

        const parsedKeys: string\[\] \= JSON.parse(saved);

        return config.columns.filter(col \=\> parsedKeys.includes(col.key));

      } catch (e) { /\* fallback \*/ }

    }

    return config.columns.filter(col \=\> col.defaultVisible \!== false);

  });

  const updateColumnVisibility \= useCallback((newVisibleKeys: string\[\]) \=\> {

    const nextCols \= config.columns.filter(c \=\> newVisibleKeys.includes(c.key));

    setColumns(nextCols);

    localStorage.setItem(storageKey, JSON.stringify(newVisibleKeys));

  }, \[config.columns, storageKey\]);

  // 2\. Estado de Selección Global

  const \[selection, setSelection\] \= useState\<SelectionState\>({

    mode: 'none',

    selectedIds: new Set(),

    excludedIds: new Set(),

  });

  // 3\. Integración con Refine useTable

  const tableProps \= useTable\<T\>({\\n    resource: config.resource,

    syncWithLocation: true,

    pagination: { mode: 'server' },

    sorters: {

      initial: config.defaultSort ? \[{ field: config.defaultSort.field, order: config.defaultSort.direction }\] : undefined,

    },

  });

  // Métodos de selección

  const selectCurrentPage \= useCallback((pageIds: (string | number)\[\]) \=\> {

    setSelection({ mode: 'page', selectedIds: new Set(pageIds), excludedIds: new Set() });

  }, \[\]);

  const selectEntireDatabase \= useCallback(() \=\> {

    setSelection({ mode: 'all', selectedIds: new Set(), excludedIds: new Set() });

  }, \[\]);

  const clearSelection \= useCallback(() \=\> {

    setSelection({ mode: 'none', selectedIds: new Set(), excludedIds: new Set() });

  }, \[\]);

  const toggleRow \= useCallback((id: string | number) \=\> {

    setSelection(prev \=\> {

      if (prev.mode \=== 'all') {

        const nextExcluded \= new Set(prev.excludedIds);

        nextExcluded.has(id) ? nextExcluded.delete(id) : nextExcluded.add(id);

        return { ...prev, excludedIds: nextExcluded };

      }

      const nextSelected \= new Set(prev.selectedIds);

      nextSelected.has(id) ? nextSelected.delete(id) : nextSelected.add(id);

      return { ...prev, mode: nextSelected.size \> 0 ? 'custom' : 'none', selectedIds: nextSelected };

    });

  }, \[\]);

  return {

    tableProps,

    columns,

    allColumns: config.columns,

    updateColumnVisibility,

    selection,

    selectCurrentPage,

    selectEntireDatabase,

    clearSelection,

    toggleRow,

    bulkActions: config.bulkActions,

  };

}

---

### ***3\. Componentes Visuales del UI Kit***

1. **`<SelectionBanner>` (`SelectionBanner.tsx`):**

   - Muestra alerta azul cuando se seleccionan los N registros de la página con botón *"Seleccionar los X registros totales coincidentes"*.  
   - Muestra alerta violeta cuando se activa la selección global con botón *"Limpiar selección"*.  
2. **`<FilterBuilder>` (`FilterBuilder.tsx`):**

   - Popover interactivo para agregar condiciones dinámicas: `[Columna] [Operador] [Valor]`.  
   - Renderiza inputs especializados según el tipo de columna (DateRangePicker, Select múltiple, InputNumber).  
3. **`<ColumnVisibilityMenu>` (`ColumnVisibilityMenu.tsx`):**

   - Desplegable con checkboxes y opción de reordenar columnas.  
4. **`<SavedViewsDropdown>` (`SavedViewsDropdown.tsx`):**

   - Selector de vistas guardadas con opciones para: Guardar vista actual, Editar nombre, Compartir (Pública/Privada) y Fijar como predeterminada.  
5. **`<BulkActionsBar>` (`BulkActionsBar.tsx`):**

   - Barra flotante inferior animada que muestra el total de elementos seleccionados y los botones de acción configurados en `bulkActions`.  
6. **`<DataTableContainer>` (`DataTableContainer.tsx`):**

   - Envoltorio principal que orquesta la Toolbar, SelectionBanner, Table y Pagination en un layout coherente.

---

## **🎯 Criterios de Aceptación**

1. Cero parpadeos (flickers) al actualizar filtros o paginar.  
2. Sincronización perfecta de URL params navegables con botón Atrás/Adelante.  
3. Compatibilidad total con el tema claro/oscuro de Ant Design 5 y Refine.

