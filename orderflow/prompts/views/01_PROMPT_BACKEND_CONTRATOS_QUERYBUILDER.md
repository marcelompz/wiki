# **Prompt 01: Backend — Contratos API, DTOs de Filtrado Dinámico y QueryBuilder Universal**

**Código:** PROMPT-VIEW-01  
**Módulo:** Backend / DataView Core  
**Ecosistema:** OmniFlow (NestJS, TypeScript, Prisma ORM, PostgreSQL)  
**Propósito:** Construir la infraestructura universal de backend para recibir filtros dinámicos tipados, ordenamiento múltiple y resolución del motor de selección global (`selection.mode`).

---

## **🤖 Rol y Contexto de Ingeniería**

Actúa como **Lead Backend Architect** de OmniFlow. Vas a implementar el paquete base reutilizable `backend/src/common/data-view/` que servirá de motor para todos los endpoints de listados y acciones masivas del monorepo.

---

## **📋 Tareas de Implementación**

### ***1\. DTOs de Validación con `class-validator` y `class-transformer`***

Crear en `backend/src/common/data-view/dto/`:

1. **`filter-query.dto.ts`:**

   - Soporte para parsear query params en formato `filter[campo][operador]=valor`.  
   - Transformador personalizado para normalizar operadores (`eq`, `ne`, `like`, `ilike`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`, `between`, `is_null`, `is_not_null`).  
   - Soporte para valores múltiples (arrays separados por comas).  
2. **`selection-payload.dto.ts`:**

   - `mode`: Enum `['all', 'selected', 'none']` (Obligatorio).  
   - `ids`: Array opcional de `String` (para modo `selected`).  
   - `excluded_ids`: Array opcional de `String` (para modo `all` con exclusiones manuales).  
   - `filters`: Objeto tipado con los filtros activos.  
   - `search`: String opcional para búsqueda textual rápida.  
3. **`bulk-action.dto.ts`:**

   - `selection`: `SelectionPayloadDto`.  
   - `action`: String identificador de la acción (ej: `"update_status"`, `"assign_category"`, `"delete"`).  
   - `data`: Objeto genérico `Record<string, any>` con los valores a aplicar.

---

### ***2\. Servicio `DynamicQueryBuilder` (`backend/src/common/data-view/dynamic-query-builder.service.ts`)***

Implementar una clase de utilidad o servicio inyectable con métodos para construir las cláusulas `where` y `orderBy` de Prisma:

import { Injectable } from '@nestjs/common';

import { SelectionPayloadDto } from './dto/selection-payload.dto';

export interface QueryBuilderOptions {

  searchableFields?: string\[\];

  fieldMappings?: Record\<string, string\>; // Mapeo de campos virtuales a columnas reales

  allowedFilterFields?: string\[\];

}

@Injectable()

export class DynamicQueryBuilder {

  /\*\*

   \* Construye el objeto WHERE para Prisma combinando tenantId, filtros, búsqueda y modo de selección

   \*/

  buildPrismaWhere\<T\>(

    tenantId: string,

    selection: SelectionPayloadDto,

    options: QueryBuilderOptions \= {}

  ): any {

    const where: any \= { tenantId };

    // 1\. Aplicar Búsqueda Rápida (OR sobre searchableFields con contains insensible a mayúsculas)

    if (selection.search && options.searchableFields?.length) {

      where.OR \= options.searchableFields.map(field \=\> ({

        \[field\]: { contains: selection.search, mode: 'insensitive' }

      }));

    }

    // 2\. Aplicar Filtros Dinámicos

    if (selection.filters) {

      for (const \[field, ops\] of Object.entries(selection.filters)) {

        if (options.allowedFilterFields && \!options.allowedFilterFields.includes(field)) {

          continue;

        }

        const targetField \= options.fieldMappings?.\[field\] || field;

        where\[targetField\] \= this.translateOperators(ops);

      }

    }

    // 3\. Aplicar Restricción según Modo de Selección

    switch (selection.mode) {

      case 'selected':

        where.id \= { in: selection.ids || \[\] };

        break;

      case 'all':

        if (selection.excluded\_ids?.length) {

          where.id \= { notIn: selection.excluded\_ids };

        }

        break;

      case 'none':

        where.id \= '\_\_NONE\_\_'; // Condición imposible

        break;

    }

    return where;

  }

  /\*\*

   \* Traduce operadores de API a sintaxis de filtros de Prisma

   \*/

  private translateOperators(ops: Record\<string, any\>): any {

    const prismaOps: any \= {};

    for (const \[op, val\] of Object.entries(ops)) {

      switch (op) {

        case 'eq': prismaOps.equals \= val; break;

        case 'ne': prismaOps.not \= val; break;

        case 'like':

        case 'ilike': prismaOps.contains \= val; prismaOps.mode \= 'insensitive'; break;

        case 'starts\_with': prismaOps.startsWith \= val; prismaOps.mode \= 'insensitive'; break;

        case 'ends\_with': prismaOps.endsWith \= val; prismaOps.mode \= 'insensitive'; break;

        case 'gt': prismaOps.gt \= Number(val) || val; break;

        case 'gte': prismaOps.gte \= Number(val) || val; break;

        case 'lt': prismaOps.lt \= Number(val) || val; break;

        case 'lte': prismaOps.lte \= Number(val) || val; break;

        case 'in': prismaOps.in \= Array.isArray(val) ? val : String(val).split(','); break;

        case 'nin': prismaOps.notIn \= Array.isArray(val) ? val : String(val).split(','); break;

        case 'between': {

          const \[min, max\] \= Array.isArray(val) ? val : String(val).split(',');

          if (min \!== undefined) prismaOps.gte \= Number(min) || min;

          if (max \!== undefined) prismaOps.lte \= Number(max) || max;

          break;

        }

        case 'is\_null': prismaOps.equals \= null; break;

        case 'is\_not\_null': prismaOps.not \= null; break;

      }

    }

    return prismaOps;

  }

}

---

### ***3\. Decoradores y Pipes de Utilidad***

1. **`@DataViewQuery()`**: Decorador de parámetro en controladores para extraer y transformar automáticamente `page`, `per_page`, `sort`, `filter`, `search` y `fields`.  
2. **`ParseDataViewPipe`**: Validador y formateador de los query params.

---

### ***4\. Tests Unitarios Obligatorios (`dynamic-query-builder.spec.ts`)***

Crear suite con Jest validando:

- Inyección estricta de `tenantId` en todas las consultas.  
- Construcción correcta de `OR` para búsquedas insensibles a mayúsculas.  
- Traducción precisa de rangos `between` (numéricos y fechas).  
- Selección `mode: 'all'` con exclusión de IDs (`notIn`).  
- Selección `mode: 'selected'` con lista de IDs explícita (`in`).

---

## **🎯 Criterios de Aceptación**

1. Código 100% tipado en TypeScript sin uso de `any` descontrolado.  
2. Manejo seguro de inyección de código SQL y validación estricta de campos permitidos.  
3. Cobertura de pruebas unitarias superior al 95% en la capa de `common/data-view`.

