# PROMPT – FEAT-067 · Fase 1.5: Live Real-Time Stream Engine

**Gobernanza:** FEAT-067 v1.21.0  
**Fase:** 1.5 – Live Real-Time Stream Engine  
**Documento padre:** `PLAN_DESARROLLO_MODULO_BI_v1.21.0_CORREGIDO.md`  
**Dependencias:** Fase 0 (Data Foundation) + Fase 1 (Backend Core)  
**Prioridad:** Alta (parte de la arquitectura dual)  
**Stack:** NestJS · WebSockets (OrdersGateway) · EventBus · BullMQ · Redis Rooms · Multi-tenant

---

## 1. Rol y Contexto

Eres un ingeniero senior de backend especializado en sistemas en tiempo real, WebSockets, colas de eventos y arquitecturas multi-tenant.  
Tu tarea es implementar la **Fase 1.5 – Live Real-Time Stream Engine** del módulo OmniFlow BI (FEAT-067).

Este motor es el complemento del Strategic & Comparative Analytics Engine (Fase 1). Mientras la Fase 1 responde a consultas históricas bajo demanda, esta fase entrega **actualizaciones en vivo** del turno/operación actual con latencia objetivo **< 500 ms**.

Debes respetar estrictamente:
- El aislamiento multi-tenant (rooms y eventos siempre namespaced por `tenantId`).
- La arquitectura de eventos existente de OrderFlow (`EventBus`, `OrdersGateway`, BullMQ).
- El schema y contratos definidos en las Fases 0 y 1.

---

## 2. Objetivo de la Fase

Construir el motor de streaming en tiempo real que permita al dashboard operativo mostrar:

1. Ventas netas acumuladas del día (o del turno activo).
2. Ticket promedio en vivo.
3. Contador de pedidos en preparación / listos / entregados.
4. Gráfico de ventas por hora del día actual (actualización incremental).
5. Cualquier otra métrica operativa de baja latencia definida como “live”.

Todo ello **sin polling** y con propagación de eventos inferior a 500 ms desde que ocurre la transacción.

---

## 3. Alcance Detallado

### 3.1 Componentes a implementar / extender

```
backend/src/
├── modules/
│   └── analytics/                    (o gateway dedicado)
│       ├── live/
│       │   ├── live-analytics.gateway.ts   (o extensión de OrdersGateway)
│       │   ├── live-analytics.service.ts
│       │   ├── live-metrics.interface.ts
│       │   └── live-analytics.module.ts
├── common/events/                    (reutilizar EventBus existente)
└── ...
```

### 3.2 Flujo de eventos (obligatorio)

```
Orden creada / pagada / cambia de estado
        ↓
EventBus emite: order:created | order:paid | order:status_changed
        ↓
BullMQ (opcional, para desacoplar y reintentos)
        ↓
LiveAnalyticsService procesa el evento
        ↓
Calcula / actualiza métricas del tenant + día actual
        ↓
Emite por WebSocket al room → tenant:{tenantId}
        ↓
Frontend (Dashboard Operativo) recibe y actualiza UI
```

### 3.3 Room y Namespace de WebSocket

- **Room obligatorio:** `tenant:{tenantId}`
- Ejemplo de unión:
  ```typescript
  client.join(`tenant:${tenantId}`);
  ```
- Nunca emitir a un room global o a otro tenant.

### 3.4 Eventos de salida (hacia el frontend)

Definir y documentar al menos los siguientes eventos WebSocket:

| Evento                      | Payload mínimo                                                                 | Cuándo se emite |
|-----------------------------|--------------------------------------------------------------------------------|-----------------|
| `live:metrics:update`       | `{ date, revenue, ordersCount, averageTicket, unitsSold, byHour: [...] }`     | Tras cualquier cambio relevante de orden del día |
| `live:order:status`         | `{ orderId, status, previousStatus, timestamp }`                              | Cambio de estado |
| `live:order:new`            | `{ orderId, totalAmount, channel, tableNumber?, dinersCount? }`               | Nueva orden pagada/confirmada |

El payload de `live:metrics:update` debe ser lo suficientemente completo para que el frontend pueda actualizar las tarjetas y el gráfico de horas **sin hacer una nueva petición HTTP**.

### 3.5 Cálculo de métricas live

Las métricas del día actual pueden mantenerse de dos formas (elige la más coherente con la arquitectura actual y documenta la decisión):

**Opción A – Snapshot en Redis (recomendada para baja latencia)**  
- Clave: `live:metrics:{tenantId}:{YYYY-MM-DD}`
- Al recibir un evento se actualiza el snapshot de forma atómica e incremental.
- Se emite el snapshot completo (o el delta) por WebSocket.

**Opción B – Recalculo ligero bajo demanda + broadcast**  
- Se hace una query muy acotada al día actual (índice por `tenantId + createdAt`).
- Se emite el resultado.

En ambos casos el filtro `tenantId` y la exclusión de `DRAFT`/`CANCELLED` son obligatorios.

### 3.6 Integración con el EventBus / OrdersGateway existente

- Reutilizar el `OrdersGateway` existente si ya maneja autenticación y rooms por tenant.
- Si es necesario crear un gateway específico (`LiveAnalyticsGateway`), debe compartir la misma estrategia de autenticación y extracción de `tenantId`.
- Suscribirse a los eventos de dominio ya emitidos por el módulo de órdenes. No duplicar la lógica de negocio de creación/pago de órdenes.

### 3.7 Autenticación y seguridad del WebSocket

- El cliente solo puede unirse al room de su propio `tenantId`.
- Validar el token JWT (o el mecanismo de auth existente) en el `handleConnection`.
- Rechazar conexiones sin tenant válido.

### 3.8 Métricas mínimas del payload `live:metrics:update`

```typescript
interface LiveMetrics {
  tenantId: string;
  date: string;                    // YYYY-MM-DD (día actual del tenant o UTC según convención)
  revenue: number;                 // SUM(quantity * priceAtSale) del día
  ordersCount: number;             // órdenes válidas del día
  unitsSold: number;
  averageTicket: number;           // revenue / ordersCount
  byHour: Array<{
    hour: number;                  // 0-23
    revenue: number;
    ordersCount: number;
  }>;
  byStatus?: Record<string, number>; // opcional: conteo por estado (PREPARING, READY…)
  lastUpdatedAt: string;           // ISO
}
```

---

## 4. Restricciones Técnicas Inviolables

1. **Aislamiento total por tenant** → rooms y claves Redis siempre con `tenantId`.
2. **Latencia objetivo < 500 ms** desde el evento de dominio hasta la emisión WebSocket.
3. **No hacer polling** desde el frontend; todo debe ser push.
4. **No recalcular matrices históricas YoY** en este motor (eso es Fase 1).
5. **No implementar la UI** (solo el backend + contrato de eventos).
6. **Reutilizar** al máximo EventBus, BullMQ y OrdersGateway existentes.
7. Mantener compatibilidad con tiers Shared y Dedicated (el cálculo live debe funcionar con el `dbClient` correcto si se consulta la base).

---

## 5. Entregables Esperados

1. Servicio `LiveAnalyticsService` (o equivalente).
2. Integración con EventBus / suscripción a eventos de órdenes.
3. Emisión de eventos WebSocket documentados (`live:metrics:update`, etc.).
4. Gestión de rooms `tenant:{tenantId}`.
5. (Opcional pero recomendado) Snapshot en Redis para métricas del día.
6. Tests:
   - Un evento `order:paid` produce una emisión al room correcto.
   - Un tenant A nunca recibe datos de un tenant B.
   - El payload contiene las métricas mínimas definidas.
7. Documentación del contrato de eventos (para que la Fase 3 – Frontend pueda consumirlo).

---

## 6. Criterios de Aceptación (Definition of Done)

- [ ] Al crear/pagar una orden se emite `live:metrics:update` al room `tenant:{tenantId}` en < 500 ms (medido en ambiente de prueba).
- [ ] El payload incluye revenue, ordersCount, averageTicket y byHour del día actual.
- [ ] No existe fuga de datos entre tenants.
- [ ] La conexión WebSocket exige autenticación válida y tenantId.
- [ ] Se reutiliza la infraestructura de eventos existente (no se inventa un bus paralelo).
- [ ] `npm run build` y tests pasan.
- [ ] Existe documentación clara del contrato de eventos para el equipo de frontend.

---

## 7. Fuera de Alcance (explícito)

- Implementación del Dashboard Operativo en React/Refine (Fase 3).
- Cache de reportes históricos / YoY (Fase 2).
- Cálculo de matrices, P&L o Menu Engineering (Fase 1).
- Insights automáticos o Decision Intelligence (Fases 6-7).
- Conectores ERP (Fase 5).
- Persistencia histórica de los snapshots live más allá del día actual (no requerido).

---

## 8. Orden de Trabajo Recomendado

1. Revisar la implementación actual de `OrdersGateway`, EventBus y BullMQ.
2. Definir las interfaces de payload (`LiveMetrics`, etc.).
3. Implementar el servicio que escucha los eventos de dominio.
4. Implementar la lógica de cálculo/actualización de métricas del día (Redis o query ligera).
5. Emitir por el room `tenant:{tenantId}`.
6. Añadir autenticación y validación de room en el gateway.
7. Escribir tests de aislamiento y de emisión.
8. Documentar el contrato de eventos.
9. Verificar latencia en un escenario de prueba.

---

## 9. Ejemplo de payload emitido

```json
{
  "event": "live:metrics:update",
  "data": {
    "tenantId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "date": "2026-08-17",
    "revenue": 12450.75,
    "ordersCount": 87,
    "unitsSold": 312,
    "averageTicket": 143.11,
    "byHour": [
      { "hour": 8,  "revenue": 320.00, "ordersCount": 4 },
      { "hour": 9,  "revenue": 890.50, "ordersCount": 9 },
      { "hour": 12, "revenue": 2450.00, "ordersCount": 18 }
      // ...
    ],
    "byStatus": {
      "PREPARING": 5,
      "READY": 3,
      "DELIVERED": 79
    },
    "lastUpdatedAt": "2026-08-17T19:22:14.123Z"
  }
}
```

---

## 10. Referencias

- Plan oficial corregido: `PLAN_DESARROLLO_MODULO_BI_v1.21.0_CORREGIDO.md` (Sección 3 – Arquitectura Dual + Diagrama)
- Prompt Fase 0: `PROMPT_BI_FASE_0_DATA_FOUNDATION.md`
- Prompt Fase 1: `PROMPT_BI_FASE_1_BACKEND_CORE.md`
- Arquitectura original (anexo): `OmniBI — Plan de Implementación.md` (Motor Híbrido / Live Engine)

---

**Instrucción final:**  
Implementa únicamente el Live Real-Time Stream Engine descrito en este prompt.  
Prioriza baja latencia, aislamiento por tenant y reutilización de la infraestructura de eventos existente.  
Al terminar, reporta:  
1) los eventos que se emiten,  
2) cómo se gestiona el room,  
3) si se usa snapshot Redis o recálculo,  
4) resultado de los tests de aislamiento y un ejemplo de payload real.
