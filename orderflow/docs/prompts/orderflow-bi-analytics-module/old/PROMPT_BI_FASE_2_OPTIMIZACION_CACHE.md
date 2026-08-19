# PROMPT – FEAT-067 · Fase 2: Optimización & Caché Redis

**Gobernanza:** FEAT-067 v1.21.0  
**Fase:** 2 – Optimización & Caché Redis  
**Documento padre:** `PLAN_DESARROLLO_MODULO_BI_v1.21.0_CORREGIDO.md`  
**Dependencias:** Fase 0 (Data Foundation) + Fase 1 (Backend Core)  
**Prioridad:** Alta  
**Stack:** NestJS · Redis · BullMQ · Prisma · Multi-tenant / Multi-tier

---

## 1. Rol y Contexto

Eres un ingeniero senior de backend especializado en rendimiento, caché distribuida y arquitecturas multi-tenant.  
Tu tarea es implementar la **Fase 2 – Optimización & Caché Redis** del módulo OmniFlow BI (FEAT-067).

Esta fase envuelve el motor de agregación de la Fase 1 con una capa de caché inteligente para alcanzar el objetivo de **latencia < 200 ms** en reportes complejos, sin sacrificar exactitud de datos ni el aislamiento entre tenants.

Debes respetar estrictamente:
- El aislamiento multi-tenant (todas las claves de Redis namespaced por `tenantId`).
- La compatibilidad con tiers Shared y Dedicated.
- La invalidación correcta cuando se crean o modifican órdenes.
- Los contratos y endpoints ya definidos en la Fase 1.

---

## 2. Objetivo de la Fase

1. Reducir drásticamente el tiempo de respuesta de los endpoints de analytics (`/analytics/product-matrix` y `/analytics/kpi-summary`).
2. Implementar un sistema de **caché con TTL dinámico** según el período consultado.
3. Garantizar **invalidación event-driven** (no solo TTL) cuando llegan nuevas órdenes o cambian datos relevantes.
4. Mantener consistencia: el usuario nunca debe ver datos obsoletos de forma prolongada.
5. No romper el comportamiento funcional de la Fase 1 (mismos contratos de entrada/salida).

---

## 3. Alcance Detallado

### 3.1 Estrategia de Caché

#### Claves de Redis (namespace obligatorio)

Todas las claves deben seguir el patrón:

```
analytics:{tenantId}:{resource}:{hash-de-parametros}
```

Ejemplos concretos:

```
analytics:{tenantId}:kpi-summary:2026:1-8:all
analytics:{tenantId}:product-matrix:2025-2026:1-12:cat=Comidas:limit=50:sort=revenue:desc
```

- Nunca usar claves sin `tenantId`.
- El hash de parámetros debe ser determinista (ordenar keys, serializar de forma estable).

#### TTL dinámico recomendado

| Tipo de período                         | TTL sugerido     | Justificación |
|-----------------------------------------|------------------|---------------|
| Día / turno actual                      | 30–60 segundos   | Alta volatilidad |
| Mes en curso                            | 2–5 minutos      | Moderada      |
| Meses cerrados del año actual           | 15–30 minutos    | Baja          |
| Años anteriores completos (históricos)  | 2–6 horas        | Muy estable   |
| Rangos que cruzan el día actual         | Usar el TTL más corto del rango | Conservador |

El TTL puede configurarse vía variables de entorno o constantes del módulo.

### 3.2 Capa de servicio de caché

Crear un servicio reutilizable:

```
backend/src/modules/analytics/cache/
  ├── analytics-cache.service.ts
  ├── cache-key.util.ts
  └── analytics-cache.module.ts
```

Responsabilidades:
- Generar claves deterministas a partir del `tenantId` + DTO de query.
- `get<T>(key): Promise<T | null>`
- `set(key, value, ttlSeconds): Promise<void>`
- `del(key)` / `delByPattern(pattern)` (para invalidación)
- Serialización/deserialización segura (JSON).

### 3.3 Integración con los endpoints de la Fase 1

Modificar `AnalyticsService` (Fase 1) para:

1. Intentar leer de caché.
2. Si existe hit → devolver el valor cacheado.
3. Si miss → ejecutar la query `$queryRaw` original → guardar en caché → devolver.

Pseudocódigo:

```typescript
async getKpiSummary(tenantId: string, query: KpiSummaryQueryDto, dbClient?: any) {
  const cacheKey = this.cache.buildKey(tenantId, 'kpi-summary', query);
  const cached = await this.cache.get(cacheKey);
  if (cached) return cached;

  const result = await this.computeKpiSummary(tenantId, query, dbClient); // lógica Fase 1
  const ttl = this.cache.resolveTtl(query);
  await this.cache.set(cacheKey, result, ttl);
  return result;
}
```

Lo mismo aplica para `getProductMatrix`.

### 3.4 Invalidación de caché (crítica)

**Problema a resolver:** una clave del tipo `tenantId:year` no se invalida automáticamente al crear una nueva orden.

**Solución requerida (event-driven):**

Suscribirse a los mismos eventos de dominio que usa la Fase 1.5:

- `order:created`
- `order:paid`
- `order:status_changed` (cuando el cambio afecta métricas, ej. de DRAFT → CONFIRMED o CANCELLED)

Al recibir el evento:

1. Extraer `tenantId` y la fecha de la orden.
2. Invalidar (borrar) las claves de analytics de ese tenant que puedan verse afectadas:
   - Todas las claves del día actual.
   - Claves del mes en curso.
   - Opcionalmente, usar `SCAN` + patrón `analytics:{tenantId}:*` con cuidado (o mantener un set de claves activas por tenant).

Estrategias aceptables (documentar la elegida):

- **A (recomendada):** Mantener en Redis un Set por tenant (`analytics:keys:{tenantId}`) con las claves activas y borrar solo esas.
- **B:** Invalidar por patrón limitado (`analytics:{tenantId}:kpi-summary:*` y `analytics:{tenantId}:product-matrix:*`) usando un cliente Redis que soporte `SCAN`.
- **C:** TTL muy corto + invalidación solo del día/mes actual (más simple, menos óptimo).

No es aceptable dejar la caché solo con TTL sin ningún mecanismo de invalidación ante nuevas órdenes.

### 3.5 Métricas y observabilidad (mínimas)

- Loguear hits / misses (al menos en nivel debug).
- (Opcional) Contadores de hits/misses por tenant o globales para futuras dashboards de salud del BI.

### 3.6 Configuración

Exponer mediante ConfigService / variables de entorno:

```env
ANALYTICS_CACHE_ENABLED=true
ANALYTICS_CACHE_TTL_CURRENT_DAY=45
ANALYTICS_CACHE_TTL_CURRENT_MONTH=180
ANALYTICS_CACHE_TTL_CLOSED_MONTH=1200
ANALYTICS_CACHE_TTL_HISTORICAL=10800
```

Poder desactivar la caché completamente (`ANALYTICS_CACHE_ENABLED=false`) para debugging.

---

## 4. Restricciones Técnicas Inviolables

1. **Namespace por tenant obligatorio** en todas las claves.
2. **No cachear resultados de un tenant bajo la clave de otro**.
3. La invalidación debe ser **event-driven**, no solo por TTL.
4. Los contratos de los endpoints de la Fase 1 **no cambian** (mismos DTOs de entrada y misma forma de respuesta).
5. Soporte multi-tier: la caché es independiente de si el Prisma client es Shared o Dedicated.
6. No implementar lógica de Live Stream aquí (ya cubierta en Fase 1.5).
7. No tocar frontend.

---

## 5. Entregables Esperados

1. `AnalyticsCacheService` + utilidades de generación de claves y TTL.
2. Integración transparente en `getKpiSummary` y `getProductMatrix`.
3. Sistema de invalidación event-driven conectado a los eventos de órdenes.
4. Configuración por variables de entorno.
5. Tests:
   - Hit de caché devuelve el mismo resultado sin ejecutar SQL.
   - Tras un `order:paid` las claves relevantes del tenant se invalidan.
   - Un tenant A no puede leer la caché de un tenant B.
   - TTL dinámico se aplica según el tipo de período.
6. Documentación breve de la estrategia de claves e invalidación.

---

## 6. Criterios de Aceptación (Definition of Done)

- [ ] Los endpoints de la Fase 1 responden desde caché cuando corresponde.
- [ ] Tras crear/pagar una orden, las consultas posteriores del mismo tenant reflejan el dato nuevo (no quedan datos obsoletos más allá del TTL corto del día).
- [ ] Todas las claves Redis contienen `tenantId`.
- [ ] Se puede desactivar la caché con una variable de entorno.
- [ ] Tests de hit/miss e invalidación pasan.
- [ ] `npm run build` y la suite de tests pasan.
- [ ] No se modificó el contrato público de los endpoints.

---

## 7. Fuera de Alcance (explícito)

- Implementación de Live Stream (Fase 1.5 – ya cubierta).
- Frontend / Refine (Fase 3).
- Exportación Excel (Fase 4).
- Conectores ERP (Fase 5).
- Insights y Data Quality Score expuesto (Fase 6).
- Decision Intelligence (Fase 7).
- Materialized Views o Data Warehouse (fase futura de escalabilidad).
- Cache de resultados de Live Metrics (puede reutilizar Redis, pero la lógica principal es de la Fase 1.5).

---

## 8. Orden de Trabajo Recomendado

1. Revisar los endpoints y la lógica de la Fase 1.
2. Diseñar el formato de claves y la política de TTL.
3. Implementar `AnalyticsCacheService` + utilidades.
4. Envolver los métodos de la Fase 1 con get/set de caché.
5. Implementar la invalidación event-driven (suscripción a eventos de órdenes).
6. Añadir configuración por env.
7. Escribir tests de hit/miss, aislamiento y invalidación.
8. Medir (aunque sea de forma manual) la mejora de latencia.
9. Documentar.

---

## 9. Ejemplo de flujo

```
1. Cliente llama GET /analytics/kpi-summary?year=2026&monthFrom=1&monthTo=8
2. CacheService genera clave: analytics:tenant-uuid:kpi-summary:2026:1-8:all
3. Redis HIT → se devuelve en < 10 ms
4. Redis MISS → se ejecuta $queryRaw (Fase 1) → se guarda con TTL 180 s → se devuelve
5. Llega evento order:paid del mismo tenant
6. Invalidación borra las claves del día/mes actual de ese tenant
7. Siguiente request vuelve a ser MISS y recalcula con el dato nuevo
```

---

## 10. Referencias

- Plan oficial corregido: `PLAN_DESARROLLO_MODULO_BI_v1.21.0_CORREGIDO.md` (Sección 12 – Escalabilidad + Criterios de éxito < 200 ms)
- Prompt Fase 1: `PROMPT_BI_FASE_1_BACKEND_CORE.md`
- Prompt Fase 1.5: `PROMPT_BI_FASE_1_5_LIVE_STREAM_ENGINE.md` (eventos de dominio a reutilizar)
- Prompt Fase 0: `PROMPT_BI_FASE_0_DATA_FOUNDATION.md`

---

**Instrucción final:**  
Implementa la capa de caché Redis descrita en este prompt de forma transparente para los consumidores de los endpoints de la Fase 1.  
Prioriza corrección de invalidación y aislamiento por tenant por encima de micro-optimizaciones de compresión o serialización.  
Al terminar, reporta:  
1) formato de claves utilizado,  
2) política de TTL,  
3) estrategia de invalidación elegida,  
4) resultados de los tests de hit/miss e invalidación.
