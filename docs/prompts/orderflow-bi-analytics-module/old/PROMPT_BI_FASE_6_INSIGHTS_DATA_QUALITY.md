# PROMPT – FEAT-067 · Fase 6: Insights Automáticos & Data Quality Score

**Gobernanza:** FEAT-067 v1.21.0  
**Fase:** 6 – Insights Automáticos & Data Quality Score  
**Documento padre:** `PLAN_DESARROLLO_MODULO_BI_v1.21.0_CORREGIDO.md`  
**Dependencias:** Fase 0 + Fase 1 + Fase 2 + Fase 5 (recomendado)  
**Prioridad:** Media  
**Stack:** NestJS · Prisma · Redis (opcional) · Multi-tenant · Reglas / detección de anomalías

---

## 1. Rol y Contexto

Eres un ingeniero senior de backend con experiencia en analítica, detección de anomalías y sistemas de calidad de datos.  
Tu tarea es implementar la **Fase 6 – Insights Automáticos & Data Quality Score** del módulo OmniFlow BI (FEAT-067).

Esta fase cierra el ciclo analítico básico: no solo muestra números, sino que **interpreta** los datos y mide su confiabilidad.

Debes respetar:
- El aislamiento multi-tenant.
- Los contratos y datos preparados en las fases anteriores.
- La arquitectura de servicios ya existente (AnalyticsService, etc.).

---

## 2. Objetivo de la Fase

1. Implementar un **Data Quality Score** medible y auditable por módulo/tenant.
2. Generar **Insights accionables** automáticos a partir de los datos de ventas, inventario y operación.
3. Exponer endpoints para consultar el score de calidad y la lista de insights activos.
4. Preparar el terreno para la Fase 7 (Decision Intelligence), donde los insights se convertirán en recomendaciones más elaboradas o impulsadas por reglas/IA.

---

## 3. Alcance Detallado

### 3.1 Data Quality Score

#### Definición

Índice (0–100 %) que mide la integridad y completitud de los datos capturados, basado en campos críticos definidos en el plan y en `analytics.manifest.json`.

#### Campos / reglas mínimas a evaluar

| Área          | Campo / Regla                                      | Peso sugerido | Notas |
|---------------|----------------------------------------------------|---------------|-------|
| POS / Órdenes | `channel` informado                                | Alto          | Obligatorio |
| POS / Órdenes | `priceAtSale` no nulo en `order_lines`             | Crítico       | Obligatorio |
| Restaurante   | `dinersCount` / `party_size` informado              | Medio         | Cuando el canal es POS restaurante |
| Restaurante   | `tableNumber` informado                            | Medio         | Idem |
| Timestamps    | `paidAt >= createdAt` (coherencia)                 | Medio         | |
| Ubicación     | `locationId` informado (si el tenant es multi-local)| Medio         | |
| Costos        | `costAtSale` o `cost_price_pmp` disponible         | Medio-Alto    | Impacta márgenes reales |
| Inventario    | Movimientos con costo y cantidad válidos           | Medio         | |

#### Cálculo

```
Data Quality Score = (Σ (campos_ok * peso) / Σ pesos) * 100
```

Se debe poder calcular:
- Score global del tenant.
- Score por módulo (orders, order_lines, inventory, erp…).
- Evolución temporal opcional (score de los últimos 7/30 días).

#### Endpoint

```
GET /analytics/data-quality
Query params opcionales: from, to, module
```

Respuesta ejemplo:

```json
{
  "tenantId": "...",
  "score": 87.4,
  "byModule": {
    "orders": 92.1,
    "order_lines": 95.0,
    "inventory": 78.3,
    "erp": 70.0
  },
  "issues": [
    {
      "module": "orders",
      "field": "dinersCount",
      "completeness": 64.2,
      "message": "Solo el 64 % de las órdenes de restaurante tienen comensales informados"
    }
  ],
  "calculatedAt": "2026-08-17T20:00:00Z"
}
```

### 3.2 Insights Automáticos

#### Tipos de insights mínimos a implementar

| Tipo                        | Condición de disparo (ejemplos)                                                                 | Ejemplo de mensaje |
|-----------------------------|--------------------------------------------------------------------------------------------------|--------------------|
| **Caída de facturación**    | Revenue del día/hora/categoría < X % del promedio histórico comparable                          | “Las ventas de hoy entre 15:00–18:00 están 28 % debajo del promedio de los últimos 4 miércoles” |
| **Oportunidad de Happy Hour**| Franja horaria con baja demanda + margen alto + capacidad disponible (Heatmap 7×24)             | “Los martes 15:00–18:00 tienen baja demanda y alto margen. Oportunidad de Happy Hour.” |
| **Impacto de costo**        | Producto cuyo margen cayó significativamente por aumento de costo o de packaging                | “El costo de descartables en Delivery redujo el margen neto de Hamburguesa Doble en 14 %” |
| **Stock crítico**           | Productos bajo punto de reorden o cobertura < lead time del proveedor                           | “12 productos están en stock crítico. El más urgente: Cerveza Rubia (cobertura 1.2 días)” |
| **Calidad de datos baja**   | Data Quality Score de un módulo < umbral (ej. 80 %)                                             | “El score de calidad de datos de Órdenes es 74 %. Principal problema: dinersCount” |
| **Anomalía de canal**       | Un canal (WhatsApp, Delivery…) con caída o pico inusual                                         | “WhatsApp convirtió 35 % menos que la semana pasada” |

#### Motor de reglas

Implementar un **motor de reglas simple y extensible** (no es necesario ML en esta fase):

- Cada insight se define como una regla con:
  - `id` / `code`
  - Condición (query o función)
  - Severidad (`info`, `warning`, `critical`)
  - Template de mensaje
  - (Opcional) acción sugerida
- Las reglas se evalúan bajo demanda o de forma periódica (cron / BullMQ).
- Los insights generados se pueden persistir temporalmente (tabla `analytics_insights` o Redis) con estado `active` / `dismissed` / `expired`.

#### Endpoints

```
GET  /analytics/insights              → lista de insights activos del tenant
GET  /analytics/insights/:id          → detalle
POST /analytics/insights/:id/dismiss  → marcar como descartado (opcional)
```

Query params útiles: `severity`, `type`, `from`, `to`, `limit`.

#### Estructura de un Insight

```typescript
interface Insight {
  id: string;
  tenantId: string;
  code: string;                    // ej. "REVENUE_DROP_HOURLY"
  type: "revenue_drop" | "happy_hour_opportunity" | "cost_impact" | "stock_critical" | "data_quality" | "channel_anomaly";
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  actionSuggested?: string;
  metadata?: Record<string, any>;  // valores usados en el cálculo
  detectedAt: string;
  expiresAt?: string;
  status: "active" | "dismissed" | "expired";
}
```

### 3.3 Heatmap 7×24 (soporte a insights de Happy Hour)

Reutilizar o implementar una agregación de ventas por **día de la semana × hora** (ya esbozada en planes anteriores).  
Esta matriz alimenta la regla de “oportunidad de Happy Hour”.

Endpoint de soporte (opcional pero recomendado):

```
GET /analytics/heatmap/hourly
```

### 3.4 Integración con el frontend (contrato)

Aunque la UI completa de insights puede refinarse después, el backend debe devolver datos listos para:

- Badge de “X insights nuevos” en el menú de analytics.
- Lista de tarjetas de insights en una pestaña o panel lateral.
- Indicador visual del Data Quality Score (barra o porcentaje).

---

## 4. Restricciones Técnicas Inviolables

1. Todo cálculo filtrado por `tenantId`.
2. No usar datos de otros tenants bajo ninguna circunstancia.
3. Las reglas deben ser deterministas y auditables (evitar “caja negra” en esta fase).
4. No implementar aún modelos de Machine Learning complejos (Fase 7 puede extenderlo).
5. No modificar el comportamiento de los endpoints de KPIs y matrices de las fases anteriores.
6. Preferir reutilizar queries y servicios ya existentes.

---

## 5. Entregables Esperados

1. Servicio `DataQualityService` con cálculo de score global y por módulo.
2. Endpoint `GET /analytics/data-quality`.
3. Motor de reglas de insights + al menos las 5–6 reglas mínimas listadas.
4. Endpoints de listado y detalle de insights.
5. (Recomendado) Persistencia temporal de insights y posibilidad de dismiss.
6. Agregación de soporte Heatmap 7×24 (si no existe).
7. Actualización de `analytics.manifest.json` si se agregan nuevos conceptos.
8. Tests:
   - Cálculo correcto del score con datos de prueba controlados.
   - Generación de al menos 2–3 tipos de insights con fixtures.
   - Aislamiento multi-tenant.
9. Documentación de las reglas implementadas y de cómo agregar nuevas.

---

## 6. Criterios de Aceptación (Definition of Done)

- [ ] `GET /analytics/data-quality` devuelve score global + desglose por módulo + lista de issues.
- [ ] Existen insights activos generados automáticamente para los escenarios de caída de ventas, stock crítico y calidad de datos.
- [ ] Los insights tienen severidad, mensaje claro y (opcional) acción sugerida.
- [ ] Un tenant nunca ve insights ni scores de otro tenant.
- [ ] Las reglas son extensibles (agregar una nueva regla no requiere reescribir el motor).
- [ ] Tests pasan y el build es exitoso.
- [ ] No se rompieron endpoints de fases anteriores.

---

## 7. Fuera de Alcance (explícito)

- UI completa de gestión de insights (se puede consumir desde la Fase 3 con una tab básica, pero el diseño visual elaborado no es obligatorio aquí).
- Modelos predictivos o de Machine Learning (Fase 7).
- Envío de notificaciones push / email / WhatsApp (solo generación del insight).
- Decision Intelligence avanzada (recomendaciones multi-variable complejas) → Fase 7.
- Re-entrenamiento o umbrales personalizables por tenant (versión futura).

---

## 8. Orden de Trabajo Recomendado

1. Revisar campos críticos y `analytics.manifest.json` (Fase 0 y 5).
2. Implementar `DataQualityService` y su endpoint.
3. Diseñar el modelo de Insight + tabla/Redis de persistencia.
4. Implementar el motor de reglas genérico.
5. Codificar las reglas mínimas (empezar por Data Quality + Stock Crítico + Caída de revenue).
6. Agregar el endpoint de listado de insights.
7. (Opcional) Implementar/asegurar el Heatmap 7×24.
8. Escribir tests con fixtures controlados.
9. Documentar cómo se agrega una nueva regla.
10. Verificar no-regresión de fases anteriores.

---

## 9. Ejemplo de Insight generado

```json
{
  "id": "ins_8f3a2b",
  "tenantId": "a1b2c3d4-...",
  "code": "HAPPY_HOUR_OPPORTUNITY",
  "type": "happy_hour_opportunity",
  "severity": "info",
  "title": "Oportunidad de Happy Hour",
  "message": "Los martes entre 15:00 y 18:00 las ventas están 31 % debajo del promedio, con margen alto y capacidad disponible.",
  "actionSuggested": "Crear una promoción Happy Hour para martes 15:00–18:00.",
  "metadata": {
    "dayOfWeek": 2,
    "hourFrom": 15,
    "hourTo": 18,
    "revenueDropPercent": 31.2,
    "avgMarginPercent": 62.5
  },
  "detectedAt": "2026-08-17T18:30:00Z",
  "status": "active"
}
```

---

## 10. Referencias

- Plan oficial corregido: `PLAN_DESARROLLO_MODULO_BI_v1.21.0_CORREGIDO.md` (Secciones 10 y 11 – Insights + Data Quality Score)
- Plan original (anexo): `OmniBI — Plan de Implementación.md` (Insights + Data Quality visual)
- Prompt Fase 0: `PROMPT_BI_FASE_0_DATA_FOUNDATION.md`
- Prompt Fase 1: `PROMPT_BI_FASE_1_BACKEND_CORE.md`
- Prompt Fase 5: `PROMPT_BI_FASE_5_ERP_INVENTORY.md`

---

**Instrucción final:**  
Implementa el Data Quality Score y el motor de Insights Automáticos descritos en este prompt.  
Prioriza reglas claras, mensajes accionables y total aislamiento multi-tenant.  
Al terminar, reporta:  
1) cómo se calcula el score,  
2) qué reglas de insights quedaron implementadas,  
3) endpoints creados,  
4) ejemplos de insights generados con datos de prueba,  
5) resultado de los tests.
