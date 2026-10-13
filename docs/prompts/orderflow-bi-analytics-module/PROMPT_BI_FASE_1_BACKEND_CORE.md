# PROMPT – FEAT-067 · Fase 1: Backend Core & Agregación SQL

**Gobernanza:** FEAT-067 v1.21.0  
**Fase:** 1 – Backend Core & Agregación SQL  
**Documento padre:** `PLAN_DESARROLLO_MODULO_BI_v1.21.0_CORREGIDO.md`  
**Dependencia:** Fase 0 (Data Foundation) debe estar completada  
**Prioridad:** Alta  
**Stack:** NestJS · Prisma · PostgreSQL · Multi-tenant / Multi-tier · `$queryRaw`

---

## 1. Rol y Contexto

Eres un ingeniero senior de backend especializado en NestJS, Prisma, PostgreSQL y arquitecturas multi-tenant de alto rendimiento.  
Tu tarea es implementar la **Fase 1 – Backend Core & Agregación SQL** del módulo OmniFlow BI (FEAT-067).

Esta fase entrega el **motor de agregación histórica y comparativa** (Strategic & Comparative Analytics Engine).  
No implementa aún Live Stream (Fase 1.5), Cache Redis (Fase 2), Frontend ni Exportación.

Debes respetar estrictamente:
- El schema real de OrderFlow (`order_lines`, `"priceAtSale"`, `"tenantId"`, `"totalAmount"`, `"createdAt"`, etc.).
- El aislamiento multi-tenant (filtro obligatorio por `tenantId` + soporte `@TenantPrisma` / tiers Shared y Dedicated).
- Los contratos definidos en `analytics.manifest.json` (creado en Fase 0).
- Exclusión de órdenes con status `DRAFT` y `CANCELLED`.

---

## 2. Objetivo de la Fase

Construir el núcleo de servicios backend capaces de:

1. Calcular **matrices comparativas de productos** (Mes a Mes y Year over Year).
2. Entregar un **resumen ejecutivo de KPIs** (crecimiento YoY, facturación, ticket promedio, top product, etc.).
3. Soportar filtros por año(s), rango de meses, categoría y criterio de ordenamiento.
4. Funcionar de forma idéntica en tenants **Shared** y **Dedicated**.
5. Mantener tiempos de respuesta razonables incluso antes de la capa de caché (objetivo final < 200 ms se alcanzará en Fase 2).

---

## 3. Alcance Detallado

### 3.1 Módulo / Servicio a crear

Crear (o extender) el módulo:

```
backend/src/modules/analytics/
  ├── analytics.module.ts
  ├── analytics.controller.ts
  ├── analytics.service.ts
  ├── dto/
  │   ├── product-matrix-query.dto.ts
  │   ├── kpi-summary-query.dto.ts
  │   └── ...
  ├── interfaces/
  │   ├── product-matrix-row.interface.ts
  │   ├── kpi-summary.interface.ts
  │   └── ...
  └── analytics.service.spec.ts
```

### 3.2 Endpoints mínimos

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`  | `/analytics/product-matrix` | Matriz de productos Mes a Mes / YoY |
| `GET`  | `/analytics/kpi-summary`    | Resumen ejecutivo de KPIs del período |

Ambos endpoints deben:
- Estar protegidos por el guard de autenticación existente.
- Extraer `tenantId` del contexto de usuario.
- Aceptar el cliente Prisma inyectado (`dbClient?: any`) para soporte multi-tier.

### 3.3 Query Parameters (DTO)

#### Product Matrix
```typescript
{
  years: number[];          // ej. [2025, 2026] – obligatorio, mín 1, máx 3 años
  monthFrom?: number;       // 1-12 (default 1)
  monthTo?: number;         // 1-12 (default 12)
  category?: string;        // filtro opcional por p.category
  limit?: number;           // default 50, máx 200
  sortBy?: 'revenue' | 'quantity' | 'name'; // default 'revenue'
  sortOrder?: 'asc' | 'desc';              // default 'desc'
}
```

#### KPI Summary
```typescript
{
  year: number;             // año actual de análisis
  compareYear?: number;     // año de comparación (default year - 1)
  monthFrom?: number;
  monthTo?: number;
  category?: string;
}
```

### 3.4 Lógica de Agregación (SQL raw)

Usar **exclusivamente** `$queryRaw` con parámetros bindeados. `$queryRawUnsafe` está prohibido (ver nota al final de esta sección).

#### Reglas SQL obligatorias

1. Filtrar siempre por `"tenantId"`.
2. Excluir `status IN ('DRAFT', 'CANCELLED')`.
3. Usar `"priceAtSale"` de `order_lines` para el cálculo de facturación.
4. Usar `p.category` (campo directo del producto, no JOIN a tabla categories).
5. Nombres de columnas camelCase entre comillas dobles.

#### Ejemplo de estructura esperada para la matriz

La respuesta debe permitir construir una tabla del estilo:

| Producto       | Categoría   | 2025-01 | 2025-02 | … | 2025 Total | 2026-01 | … | 2026 Total | Crecimiento % |
|----------------|-------------|---------|---------|---|------------|---------|---|------------|---------------|
| Hamburguesa X  | Comidas     | 1.200   | 1.450   | … | 18.300     | 1.380   | … | 19.100     | +4.4 %        |

Cada celda puede contener `{ revenue: number, quantity: number }` o solo revenue según se defina en la interfaz.

#### Cálculos del KPI Summary

| KPI                        | Fórmula |
|----------------------------|---------|
| Facturación período actual | `SUM(quantity * "priceAtSale")` |
| Facturación período anterior | Igual, año de comparación |
| Crecimiento YoY %          | `((actual - anterior) / anterior) * 100` |
| Total de pedidos           | `COUNT(DISTINCT o."id")` — **obligatorio usar DISTINCT** siempre que la query involucre un JOIN con `order_lines`, ya que sin DISTINCT cada línea se cuenta como un pedido separado. Nunca usar `COUNT(orders)` a secas sobre un resultado joineado. |
| Unidades vendidas          | `SUM(quantity)` |
| Ticket promedio            | `Facturación / Nº pedidos` |
| Top Selling Product        | Producto con mayor revenue en el período |

> **Nota sobre `$queryRawUnsafe`:** Queda **prohibido** su uso en esta fase.
> Todos los filtros dinámicos (`category`, `sortBy`, `sortOrder`, rangos de
> fecha) deben resolverse con `$queryRaw` + parámetros bindeados, o —si el
> nombre de columna a ordenar es dinámico— mediante un mapa fijo en código
> (`whitelist`) que traduzca el valor del DTO a la columna real, nunca por
> interpolación directa de strings del usuario en el SQL.

### 3.5 Soporte Multi-Tenant & Multi-Tier

```typescript
async getProductMatrix(
  tenantId: string,
  query: ProductMatrixQueryDto,
  dbClient?: any,                // ← inyección para Dedicated
) {
  const prisma = dbClient || this.prisma;
  
  // Todas las queries usan prisma.$queryRaw
  // y siempre incluyen: WHERE o."tenantId" = ${tenantId}::uuid
}
```

Nunca hardcodear el cliente Prisma global cuando se reciba `dbClient`.

### 3.6 Tipado y DTOs

- Usar `class-validator` + `class-transformer` en los DTOs de entrada.
- Definir interfaces claras para las respuestas.
- Tipar los resultados de `$queryRaw` (evitar `any` en la medida de lo posible).

### 3.7 Manejo de errores

- Validar que `years` no esté vacío y no supere 3 elementos.
- Validar rangos de meses (1-12, monthFrom ≤ monthTo).
- Devolver errores HTTP 400 claros cuando los parámetros sean inválidos.
- Si no hay datos, devolver estructuras vacías (no 404).

---

## 4. Restricciones Técnicas Inviolables

1. **No usar ORM findMany + reduce en memoria** para las matrices grandes. Preferir agregación en PostgreSQL.
2. **Filtro `tenantId` obligatorio** en todas las consultas.
3. **Nombres reales del schema** (ver Fase 0 y `analisis_modulo_bi_analytics.md`).
4. **No implementar caché Redis** todavía (eso es Fase 2).
5. **No implementar WebSockets / Live** (eso es Fase 1.5).
6. **No tocar el frontend**.
7. Mantener compatibilidad con el código existente (cero regresiones).

---

## 5. Entregables Esperados

1. Módulo `analytics` completo (module, controller, service, DTOs, interfaces).
2. Dos endpoints funcionales: `/analytics/product-matrix` y `/analytics/kpi-summary`.
3. Queries SQL raw optimizadas y tipadas.
4. Tests de integración (al menos):
   - Matriz con 1 y 2 años.
   - Filtro por categoría.
   - Exclusión correcta de DRAFT/CANCELLED.
   - Cálculo de crecimiento YoY.
   - Comportamiento con `dbClient` inyectado (simulado).
5. Documentación breve de los endpoints (JSDoc o README de la fase).

---

## 6. Criterios de Aceptación (Definition of Done)

- [ ] Los dos endpoints responden correctamente con datos reales de prueba.
- [ ] La matriz devuelve columnas por mes + total por año + crecimiento.
- [ ] El KPI Summary calcula correctamente todos los indicadores listados.
- [ ] Todas las queries filtran por `tenantId` y excluyen DRAFT/CANCELLED.
- [ ] Se usa `"priceAtSale"` y `order_lines` (no nombres genéricos).
- [ ] Soporte `dbClient?: any` implementado.
- [ ] DTOs validados con class-validator.
- [ ] `npm run build` y `npm test` pasan.
- [ ] No se introdujo ninguna dependencia de Redis, WebSocket o frontend.

---

## 7. Fuera de Alcance (explícito)

- Cache Redis / invalidación (Fase 2)
- Live Real-Time Stream / WebSockets (Fase 1.5)
- Frontend / Refine / Ant Design (Fase 3)
- Exportación Excel (Fase 4)
- Conectores ERP / Inventory Intelligence (Fase 5)
- Insights automáticos y Data Quality Score expuesto (Fase 6)
- Decision Intelligence (Fase 7)
- Heatmap 7×24, Menu Engineering completo y P&L dinámico avanzado (se pueden dejar interfaces preparadas, pero la lógica completa puede ir en iteraciones siguientes)

---

## 8. Orden de Trabajo Recomendado

1. Verificar que la Fase 0 esté aplicada (campos `priceAtSale`, `channel`, enum status, etc.).
2. Crear la estructura del módulo `analytics`.
3. Definir DTOs e interfaces de respuesta.
4. Implementar primero `getKpiSummary` (más simple).
5. Implementar `getProductMatrix` (más compleja – agregación por mes/año).
6. Añadir validaciones y manejo de errores.
7. Escribir tests de integración.
8. Ejecutar build + test suite completa.
9. Documentar.

---

## 9. Ejemplo de respuesta esperada (KPI Summary)

```json
{
  "period": {
    "year": 2026,
    "monthFrom": 1,
    "monthTo": 8,
    "compareYear": 2025
  },
  "revenue": {
    "current": 154230.50,
    "previous": 142100.00,
    "growthPercent": 8.54
  },
  "orders": {
    "current": 1872,
    "previous": 1754
  },
  "unitsSold": {
    "current": 9450,
    "previous": 8890
  },
  "averageTicket": {
    "current": 82.39,
    "previous": 81.01
  },
  "topProduct": {
    "productId": "...",
    "name": "Hamburguesa Doble",
    "revenue": 18200.00,
    "quantity": 910
  }
}
```

---

## 10. Referencias

- Plan oficial corregido: `PLAN_DESARROLLO_MODULO_BI_v1.21.0_CORREGIDO.md` (Sección 7 – KPIs y Sección 3 – Arquitectura)
- Análisis técnico de schema: `analisis_modulo_bi_analytics.md`
- Prompt de la Fase 0: `PROMPT_BI_FASE_0_DATA_FOUNDATION.md`
- Contrato: `analytics.manifest.json`

---

**Instrucción final:**  
Implementa únicamente el Backend Core de agregación SQL descrito en este prompt.  
Prioriza corrección de datos, tipado fuerte y respeto al multi-tenant por encima de micro-optimizaciones (la capa de caché llegará en la Fase 2).  
Al terminar, reporta los endpoints creados, un ejemplo de respuesta real y el resultado de los tests.
