# PROMPT: MÓDULO BI — FASE 8: CUSTOMER INTELLIGENCE & DIGITAL FUNNEL

## 1. Contexto y Objetivos

Esta fase implementa la capa de analítica avanzada orientada a la dimensión **Cliente** y al comportamiento del **Funnel Digital (E-commerce / Catálogo Online)**. Transforma las transacciones de órdenes en inteligencia de retención, segmentación automatizada y métricas de adquisición/conversión.

### Metas Técnicas:
1. Crear el modelo de datos analítico para tracking de clientes, sesiones y eventos de funnel.
2. Construir el motor de segmentación **RFM (Recency, Frequency, Monetary)** dinámico.
3. Calcular métricas clave de e-commerce: CAC, LTV (Lifetime Value), Churn Rate y Funnel de Abandono.

---

## 2. Dependencias y Pre-requisitos

* **Fase 0 (Data Foundation):** Modelo `Order`, `OrderLine`, `Customer` o identificación de clientes por `tenantId`.
* **Fase 1 (Backend Core):** Patrones de inyección de Prisma (`dbClient || this.prisma`), manejo seguro de `$queryRaw` y tipos estándar.
* **Fase 2 (Optimización & Caché):** Estrategia de invalidación por tags y TTL para dashboards analíticos.

---

## 3. Especificaciones Técnicas

### 3.1 Extensiones al Schema de Base de Datos (Prisma)

Añadir al archivo `schema.prisma` los modelos necesarios para tracking de eventos y snapshots RFM:

```prisma
enum RfmSegment {
  CHAMPIONS
  LOYAL_CUSTOMERS
  POTENTIAL_LOYALIST
  NEW_CUSTOMERS
  PROMISING
  NEED_ATTENTION
  ABOUT_TO_SLEEP
  AT_RISK
  CANT_LOSE_THEM
  HIBERNATING
  LOST
}

model CustomerBiSnapshot {
  id              String      @id @default(uuid())
  tenantId        String
  customerId      String
  recencyDays     Int
  frequencyScore  Int
  monetaryTotal   Decimal     @db.Decimal(12, 2)
  rfmScore        String      @db.VarChar(3) // Ej: "555", "421"
  segment         RfmSegment
  calculatedAt    DateTime    @default(now())

  @@index([tenantId, calculatedAt])
  @@index([tenantId, segment])
  @@index([tenantId, customerId])
  @@map("customer_bi_snapshots")
}

model DigitalFunnelEvent {
  id          String   @id @default(uuid())
  tenantId    String
  sessionId   String
  customerId  String?
  step        String   // "VIEW_PRODUCT", "ADD_TO_CART", "INITIATE_CHECKOUT", "ORDER_COMPLETED"
  metadata    Json?
  createdAt   DateTime @default(now())

  @@index([tenantId, step, createdAt])
  @@index([tenantId, sessionId])
  @@map("digital_funnel_events")
}

### 3.2 Reglas Inviolables de SQL y Consultas

- **Aislamiento Multi-tenant:** Toda query raw debe incluir obligatoriamente el filtro `o."tenantId" = $1`.
- **Nombres de Columna:** Usar camelCase entre comillas dobles (ej. `o."totalAmount"`, `c."createdAt"`).
- **Exclusión de Estados:** Excluir órdenes en estado DRAFT, CANCELLED y VOIDED.
- **Prohibido `$queryRawUnsafe`:** Usar exclusivamente `$queryRaw` con bind variables.

### 3.3 Motor de Segmentación RFM (Quintiles)

El cálculo RFM asignará puntuaciones de 1 a 5 mediante window functions (`NTILE(5)`):

```sql
WITH customer_orders AS (
  SELECT
    o."customerId",
    o."tenantId",
    MAX(o."createdAt") AS last_order_date,
    COUNT(DISTINCT o."id")::int AS total_orders,
    SUM(o."totalAmount") AS monetary_value
  FROM "orders" o
  WHERE o."tenantId" = $1
    AND o."status" NOT IN ('CANCELLED', 'DRAFT')
    AND o."createdAt" >= NOW() - INTERVAL '365 days'
    AND o."customerId" IS NOT NULL
  GROUP BY o."customerId", o."tenantId"
),
rfm_scores AS (
  SELECT
    "customerId",
    "tenantId",
    EXTRACT(DAY FROM (NOW() - last_order_date))::int AS recency_days,
    NTILE(5) OVER (ORDER BY last_order_date ASC) AS r_score,
    NTILE(5) OVER (ORDER BY total_orders ASC) AS f_score,
    NTILE(5) OVER (ORDER BY monetary_value ASC) AS m_score,
    monetary_value
  FROM customer_orders
)
SELECT
  "customerId",
  recency_days,
  f_score,
  monetary_value,
  CONCAT(r_score::text, f_score::text, m_score::text) AS rfm_score,
  CASE
    WHEN r_score >= 4 AND f_score >= 4 THEN 'CHAMPIONS'
    WHEN r_score >= 3 AND f_score >= 3 THEN 'LOYAL_CUSTOMERS'
    WHEN r_score >= 4 AND f_score <= 2 THEN 'NEW_CUSTOMERS'
    WHEN r_score <= 2 AND f_score >= 4 THEN 'CANT_LOSE_THEM'
    WHEN r_score <= 2 AND f_score <= 2 THEN 'AT_RISK'
    ELSE 'NEED_ATTENTION'
  END AS segment
FROM rfm_scores;
```

### 3.4 Endpoints Requeridos (CustomerBiController)

1. `GET /api/v1/bi/customers/rfm-matrix`
   - **Query Params:** `startDate`, `endDate`, `channel?`
   - **Response DTO:** Distribución de clientes por segmento RFM, ticket promedio por segmento y porcentaje de contribución al revenue.

2. `GET /api/v1/bi/ecommerce/funnel`
   - **Query Params:** `startDate`, `endDate`, `channel?`
   - **Response DTO:**

```typescript
interface FunnelMetricsDto {
  step: 'PAGE_VIEW' | 'ADD_TO_CART' | 'CHECKOUT_STARTED' | 'PURCHASE_COMPLETED';
  sessionsCount: number;
  conversionRate: number; // Porcentaje relativo al paso anterior
  dropoffRate: number;    // Porcentaje de abandono
}
```

3. `GET /api/v1/bi/customers/unit-economics`
   - **Response DTO:**
     - **LTV (Lifetime Value):** $\text{LTV} = \text{Ticket Promedio} \times \text{Frecuencia de Compra Anual} \times \text{Vida Media del Cliente}$.
     - **Churn Rate Estimado:** % de clientes con > 90 días de inactividad vs. período base.
     - **Tasa de Recompra:** % de clientes con $\ge 2$ órdenes.

### 4. Criterios de Aceptación

- **Eficiencia en Ejecución:** Las queries analíticas de RFM sobre un set de 100k órdenes no deben superar los 400ms (usar snapshots si la ventana temporal supera 90 días).
- **Idempotencia y Aislamiento:** Las transacciones no deben mezclar métricas entre tenants.
- **Tests Unitarios y de Integración:** Cobertura $\ge 85\%$ sobre la lógica de segmentación y cálculo de porcentajes del funnel.
