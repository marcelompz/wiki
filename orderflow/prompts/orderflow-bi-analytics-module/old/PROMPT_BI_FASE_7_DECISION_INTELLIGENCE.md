# PROMPT – FEAT-067 · Fase 7: Decision Intelligence

**Gobernanza:** FEAT-067 v1.21.0  
**Fase:** 7 – Decision Intelligence (Sugerencias de IA / Reglas Avanzadas)  
**Documento padre:** `PLAN_DESARROLLO_MODULO_BI_v1.21.0_CORREGIDO.md`  
**Dependencias:** Fase 0 + Fase 1 + Fase 5 + Fase 6 (Insights & Data Quality)  
**Prioridad:** Media  
**Stack:** NestJS · Prisma · Motor de reglas / heurísticas (extensible a LLM en el futuro) · Multi-tenant

---

## 1. Rol y Contexto

Eres un ingeniero senior de backend con experiencia en sistemas de recomendación, motores de reglas y Decision Intelligence.  
Tu tarea es implementar la **Fase 7 – Decision Intelligence** del módulo OmniFlow BI (FEAT-067).

Esta fase convierte los **Insights** de la Fase 6 en **recomendaciones accionables** de mayor nivel, cerrando el ciclo:

> Datos → Información (KPIs) → Insights → **Decisiones recomendadas**

El objetivo no es reemplazar al tomador de decisiones, sino **reducir la fricción** entre ver un problema/oportunidad y saber qué acción concreta conviene tomar.

Debes respetar:
- El aislamiento multi-tenant.
- Los insights y el Data Quality Score de la Fase 6.
- La arquitectura de servicios ya construida.
- Un enfoque primero basado en **reglas + heurísticas claras y auditables** (la integración con LLMs puede dejarse preparada pero no es obligatoria en esta versión).

---

## 2. Objetivo de la Fase

1. Transformar insights detectados en **recomendaciones concretas** con:
   - Descripción de la acción sugerida
   - Impacto estimado (cuando sea calculable)
   - Prioridad / urgencia
   - Contexto (datos que la sustentan)
2. Exponer endpoints para obtener recomendaciones activas por tenant.
3. Permitir que el usuario marque una recomendación como “aceptada”, “descartada” o “pospuesta”.
4. Dejar la arquitectura preparada para enriquecer las recomendaciones con un LLM en el futuro (sin depender de él ahora).
5. Cumplir la visión del plan: *“El éxito del módulo no se medirá por la cantidad de gráficos, sino por la cantidad de decisiones de negocio que ayude a tomar”*.

---

## 3. Alcance Detallado

### 3.1 Concepto de Recomendación (Decision)

```typescript
interface Recommendation {
  id: string;
  tenantId: string;
  insightId?: string;                 // insight que la originó (si aplica)
  code: string;                       // ej. "LAUNCH_HAPPY_HOUR_TUE_15_18"
  category: "promotion" | "pricing" | "inventory" | "operations" | "data_quality" | "cost" | "other";
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;                // qué se recomienda hacer
  rationale: string;                  // por qué se recomienda (basado en datos)
  estimatedImpact?: {
    type: "revenue_up" | "margin_up" | "cost_down" | "stockout_risk_down" | "other";
    value?: number;                   // % o monto estimado cuando sea posible
    unit?: string;
    confidence: "low" | "medium" | "high";
  };
  actionPayload?: Record<string, any>; // datos estructurados para ejecutar la acción (ej. días, horas, productos)
  status: "active" | "accepted" | "dismissed" | "snoozed" | "expired";
  createdAt: string;
  expiresAt?: string;
  acceptedAt?: string;
  dismissedAt?: string;
}
```

### 3.2 Motor de Decisiones

Construir un **Decision Engine** que:

1. Tome como entrada los insights activos de la Fase 6 (y opcionalmente métricas directas).
2. Aplique un conjunto de **reglas de decisión** (heurísticas).
3. Genere una o más `Recommendation`.
4. Evite duplicados (no generar la misma recomendación activa dos veces).
5. Asigne prioridad y, cuando sea factible, un impacto estimado.

#### Reglas de decisión mínimas a implementar

| Código / Tipo                    | Condición de origen (Insight o métrica)                          | Recomendación generada |
|----------------------------------|------------------------------------------------------------------|------------------------|
| `LAUNCH_HAPPY_HOUR`              | Insight de tipo `happy_hour_opportunity`                         | “Crear promoción Happy Hour en [día] de [horaDesde] a [horaHasta]” |
| `PROMOTE_HIGH_MARGIN_LOW_SALES`  | Producto con margen alto + ventas bajas (matriz / Menu Engineering) | “Promocionar [producto] – alto margen y baja rotación” |
| `REPLENISH_CRITICAL_STOCK`       | Insight `stock_critical`                                         | “Reponer stock de [producto] – cobertura X días / por debajo del punto de reorden” |
| `REVIEW_COST_INCREASE`           | Insight `cost_impact`                                            | “Revisar proveedor o precio de venta de [producto] – el costo impactó el margen en Y %” |
| `IMPROVE_DATA_CAPTURE`           | Insight `data_quality` con score bajo en campos clave            | “Capacitar al equipo / ajustar POS para capturar [campo] – score actual Z %” |
| `CHANNEL_PERFORMANCE_REVIEW`     | Insight `channel_anomaly`                                        | “Revisar rendimiento del canal [canal] – desviación significativa detectada” |

Cada regla debe ser:
- Independiente
- Fácil de activar/desactivar
- Documentada (input → lógica → output)

### 3.3 Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`    | `/analytics/recommendations`              | Lista de recomendaciones activas (filtros: priority, category, status) |
| `GET`    | `/analytics/recommendations/:id`          | Detalle de una recomendación |
| `POST`   | `/analytics/recommendations/:id/accept`   | Marcar como aceptada |
| `POST`   | `/analytics/recommendations/:id/dismiss`  | Marcar como descartada |
| `POST`   | `/analytics/recommendations/:id/snooze`   | Posponer (body: `{ days: number }` o `until: ISO date`) |
| `POST`   | `/analytics/recommendations/generate`     | Forzar re-generación (útil para admin/testing) |

Todos filtrados por `tenantId` del usuario autenticado.

### 3.4 Persistencia

Crear una tabla (o colección) `analytics_recommendations` con los campos del interface anterior + índices por `tenantId + status + priority`.

### 3.5 Integración con Fase 6

- El Decision Engine se alimenta principalmente de los insights activos.
- Puede ejecutarse:
  - Bajo demanda (`/generate`)
  - De forma periódica (cron / BullMQ job) después de la evaluación de insights
- Una recomendación puede referenciar el `insightId` que la originó para trazabilidad.

### 3.6 Preparación para LLM (opcional pero recomendada)

Diseñar el motor de forma que una futura versión pueda:

- Recibir el insight + contexto de métricas
- Pedir a un LLM que redacte o enriquezca el `description` y `rationale`
- Seguir validando la recomendación con reglas deterministas (guardrails)

En esta fase **no es obligatorio** llamar a ningún LLM. Solo dejar la interfaz limpia.

### 3.7 Impacto estimado (heurísticas simples)

Cuando sea posible calcular un impacto aproximado:

- Happy Hour: usar el gap de revenue de la franja × margen promedio histórico de esa franja.
- Stock crítico: riesgo de quiebre × margen perdido estimado por día.
- Producto alto margen / baja venta: upside potencial si se alcanza la rotación media de la categoría.

Siempre indicar `confidence: "low" | "medium" | "high"`.

---

## 4. Restricciones Técnicas Inviolables

1. **Multi-tenant estricto** – una recomendación nunca cruza tenants.
2. Las recomendaciones deben ser **trazables** (saber qué datos las generaron).
3. Preferir reglas explícitas y auditables sobre modelos opacos.
4. No ejecutar automáticamente cambios en el sistema (no crear promociones ni órdenes de compra solas). Solo **recomendar**.
5. No romper los endpoints ni el comportamiento de las fases anteriores.
6. El usuario debe poder descartar o posponer recomendaciones.

---

## 5. Entregables Esperados

1. Modelo / tabla `analytics_recommendations`.
2. `DecisionEngine` (servicio) con las reglas mínimas implementadas.
3. Endpoints de listado, detalle, accept, dismiss, snooze y generate.
4. Integración con los insights de la Fase 6.
5. Job o mecanismo para generar/actualizar recomendaciones de forma periódica o bajo demanda.
6. Tests:
   - A partir de un insight de Happy Hour se genera la recomendación correcta.
   - Aislamiento multi-tenant.
   - Flujos de accept / dismiss / snooze cambian el status correctamente.
7. Documentación de cada regla de decisión (input → lógica → output).
8. (Opcional) Stub o interfaz preparada para enriquecimiento futuro con LLM.

---

## 6. Criterios de Aceptación (Definition of Done)

- [ ] Existen recomendaciones activas generadas a partir de insights de la Fase 6.
- [ ] Se pueden listar, aceptar, descartar y posponer recomendaciones.
- [ ] Cada recomendación tiene título, descripción, rationale y prioridad claros.
- [ ] Al menos 4 de las 6 reglas mínimas están implementadas y testadas.
- [ ] Un tenant no ve recomendaciones de otro tenant.
- [ ] El endpoint de generación puede ejecutarse de forma segura (idempotente o controlado).
- [ ] Tests pasan y el build es exitoso.
- [ ] No se introdujeron regresiones en fases anteriores.

---

## 7. Fuera de Alcance (explícito)

- Ejecución automática de las acciones recomendadas (crear promoción, generar OC, etc.).
- Integración real con un proveedor de LLM (solo preparación de interfaz).
- UI elaborada de “centro de decisiones” (se puede consumir desde una tab básica en el frontend de la Fase 3).
- Modelos predictivos complejos o forecasting avanzado.
- Personalización de reglas por tenant (versión futura).
- Notificaciones push / email / WhatsApp de las recomendaciones.

---

## 8. Orden de Trabajo Recomendado

1. Revisar los insights generados por la Fase 6 y su estructura.
2. Diseñar el modelo `Recommendation` y la tabla.
3. Implementar el `DecisionEngine` con 1–2 reglas primero (Happy Hour + Stock Crítico).
4. Crear los endpoints CRUD de estado (list, accept, dismiss, snooze).
5. Agregar el resto de reglas mínimas.
6. Implementar el endpoint `/generate` y/o el job periódico.
7. Calcular impactos estimados simples donde sea factible.
8. Escribir tests de generación y de ciclo de vida (accept/dismiss).
9. Documentar las reglas.
10. Verificar no-regresión.

---

## 9. Ejemplo de Recomendación generada

```json
{
  "id": "rec_9c2e1a",
  "tenantId": "a1b2c3d4-...",
  "insightId": "ins_8f3a2b",
  "code": "LAUNCH_HAPPY_HOUR",
  "category": "promotion",
  "priority": "high",
  "title": "Lanzar Happy Hour los martes 15:00–18:00",
  "description": "Crear una promoción de Happy Hour los martes entre las 15:00 y las 18:00 con descuento selectivo en productos de alto margen.",
  "rationale": "Los martes en esa franja las ventas están 31 % por debajo del promedio comparable, el margen promedio de la franja es 62,5 % y hay capacidad disponible.",
  "estimatedImpact": {
    "type": "revenue_up",
    "value": 12.5,
    "unit": "percent",
    "confidence": "medium"
  },
  "actionPayload": {
    "dayOfWeek": 2,
    "hourFrom": 15,
    "hourTo": 18,
    "suggestedDiscountPercent": 15,
    "targetProducts": ["high_margin"]
  },
  "status": "active",
  "createdAt": "2026-08-17T18:45:00Z"
}
```

---

## 10. Referencias

- Plan oficial corregido: `PLAN_DESARROLLO_MODULO_BI_v1.21.0_CORREGIDO.md` (Sección 10 – Insights + visión de Decision Intelligence)
- Plan original (anexo): `OmniBI — Plan de Implementación.md` (Fase 7 – Decision Intelligence + ejemplos de recomendaciones)
- Prompt Fase 6: `PROMPT_BI_FASE_6_INSIGHTS_DATA_QUALITY.md`
- Prompt Fase 1: `PROMPT_BI_FASE_1_BACKEND_CORE.md`
- Prompt Fase 5: `PROMPT_BI_FASE_5_ERP_INVENTORY.md`

---

**Instrucción final:**  
Implementa el Decision Intelligence Engine descrito en este prompt.  
Prioriza recomendaciones claras, trazables y accionables por encima de sofisticación algorítmica.  
Al terminar, reporta:  
1) reglas de decisión implementadas,  
2) endpoints creados,  
3) ejemplo real de recomendación generada a partir de un insight,  
4) flujo de accept/dismiss,  
5) resultado de los tests.
