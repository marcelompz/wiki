# 🛠️ Guía de Troubleshooting #103: Excepciones en Auto-Sincronización de Categorías y KPI Analytics (TypeError & Raw Query Cast)

> **Módulo:** Backend NestJS / Catalog / Analytics / Prisma ORM  
> **Ámbito:** Producción (Provecchio & Hetzner)  
> **Fecha de registro:** 2026-09-10  
> **Versión de referencia:** v1.29.0  

---

## 1. Excepción #1: `Unknown field posCategory for select statement on model Product`

### 🚨 Síntoma
- El backend registra un error 500 al llamar a `GET /api/v1/catalog/categories`:
  ```text
  Unknown field `posCategory` for select statement on model `Product`.
  at CatalogService.autoSyncCategoriesFromProducts
  ```

### 🔍 Causa Raíz
El método `autoSyncCategoriesFromProducts` intentaba seleccionar `posCategory` como campo directo del modelo `Product`. En el esquema Prisma, el campo escalar de clave foránea es `posCategoryId` (String) y la relación es `posCategoryRel`. `posCategory` no existía como propiedad en el modelo.

### 🛠️ Solución Aplicada
En [backend/src/catalog/catalog.service.ts](file:///opt/orderflow/backend/src/catalog/catalog.service.ts), se removió `posCategory` de la cláusula `select` de Prisma:
```typescript
const products = await db.product.findMany({
  where: { tenantId, active: true },
  select: {
    category: true,
    categoryRel: { select: { name: true } },
    posCategoryRel: { select: { name: true } },
  },
});
```

---

## 2. Excepción #2: `ERROR: operator does not exist: text = uuid` en Analytics `prisma.$queryRaw()`

### 🚨 Síntoma
- Error 500 al cargar métricas y KPIs en `/api/v1/analytics/kpi-summary`:
  ```text
  Raw query failed. Code: 42883. Message: ERROR: operator does not exist: text = uuid
  HINT: No operator matches the given name and argument types. You might need to add explicit type casts.
  ```

### 🔍 Causa Raíz
En las consultas SQL con `Prisma.sql` dentro de `analytics.service.ts` y `live-analytics.service.ts`, se incluía un cast explícito `${tenantId}::uuid`. Debido a que los IDs de los tenants en la tabla PostgreSQL se definen como `TEXT` o `VARCHAR` (ej: `"provecchio-dimora-001"`), la comparación `text = uuid` fallaba en PostgreSQL.

### 🛠️ Solución Aplicada
Se removió el cast `::uuid` de las consultas raw en `analytics.service.ts` y `live-analytics.service.ts`, comparando la propiedad `tenantId` directamente como `TEXT`:
```sql
WHERE o."tenantId" = ${tenantId}
```
