# Diseño: Modelo de Suscripciones y Facturación Recurrente

## Objetivo
Implementar un sistema de suscripciones mensuales recurrentes para que OrderFlow pueda vender planes/microservicios a sus clientes con facturación automática.

## Estado Actual
- `Tenant.config` almacena `subscription` como JSONB: `{status, plan, billingCycle, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd}`
- `Payment` model existe para pagos one-time (stripe, mercadopago)
- `BillingController` expone endpoints básicos: `GET /subscription`, `POST /subscribe`, `POST /webhooks/payment`
- No hay modelo estructurado para planes, suscripciones ni facturas recurrentes

## Propuesta de Modelo

### 1. `SubscriptionPlan`
Define los planes que se venden (Básico, Profesional, Enterprise, etc.)

```prisma
model SubscriptionPlan {
  id          String   @id @default(uuid())
  name        String   // "Básico Mensual", "Profesional Mensual", "Enterprise Mensual"
  slug        String   @unique // "basic", "professional", "enterprise"
  description String?
  price       Decimal  @db.Decimal(10, 2) // Precio en moneda base
  currency    String   @default("PYG")
  interval    String   @default("month") // month, year
  intervalCount Int    @default(1) // cada cuántos períodos
  features    Json?    // ["pos", "bookings", "whatsapp-catalog", "api-access"]
  limits      Json?    // {maxProducts: 100, maxUsers: 5, maxOrders: 1000}
  active      Boolean  @default(true)
  metadata    Json?
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  subscriptions Subscription[]
  
  @@map("subscription_plans")
}
```

### 2. `Subscription`
Suscripción activa de un tenant a un plan

```prisma
model Subscription {
  id                  String    @id @default(uuid())
  tenantId            String
  planId              String
  status              String    @default("active") // active, past_due, canceled, unpaid, paused
  currentPeriodStart  DateTime
  currentPeriodEnd    DateTime
  cancelAtPeriodEnd   Boolean   @default(false)
  canceledAt          DateTime?
  endedAt             DateTime?
  gateway             String    @default("stripe") // stripe, mercadopago, manual
  gatewaySubscriptionId String? // ID de suscripción en el gateway externo
  metadata            Json?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  tenant   Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  plan     SubscriptionPlan  @relation(fields: [planId], references: [id])

  invoices Invoice[]
  payments Payment[]

  @@index([tenantId])
  @@index([planId])
  @@index([status])
  @@map("subscriptions")
}
```

### 3. `Invoice`
Factura generada por cada período de suscripción

```prisma
model Invoice {
  id              String   @id @default(uuid())
  tenantId        String
  subscriptionId  String
  number          String   @unique // FACT-001, FACT-002, etc.
  amount          Decimal  @db.Decimal(15, 2)
  currency        String   @default("PYG")
  taxAmount       Decimal? @db.Decimal(15, 2)
  totalAmount     Decimal  @db.Decimal(15, 2)
  status          String   @default("draft") // draft, open, paid, void, canceled
  dueDate         DateTime
  paidAt          DateTime?
  gatewayInvoiceId String? // ID de factura en el gateway
  metadata        Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  tenant       Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  subscription Subscription @relation(fields: [subscriptionId], references: [id])
  payments     Payment[]

  @@index([tenantId])
  @@index([subscriptionId])
  @@index([status])
  @@map("invoices")
}
```

### 4. `SubscriptionAddon` (opcional, fase 2)
Add-ons que se pueden comprar además del plan base

```prisma
model SubscriptionAddon {
  id          String   @id @default(uuid())
  planId      String
  name        String   // "Usuario adicional", "10GB almacenamiento"
  slug        String   @unique // "extra-user", "storage-10gb"
  price       Decimal  @db.Decimal(10, 2)
  currency    String   @default("PYG")
  unit        String?  // "user", "gb", "unit"
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  plan SubscriptionPlan @relation(fields: [planId], references: [id])

  @@map("subscription_addons")
}
```

## Migración desde JSONB actual

### Estrategia
1. **Crear tablas nuevas** sin eliminar el JSONB existente
2. **Migrar datos existentes**: un script one-time copia `Tenant.config.subscription` → `Subscription` + `SubscriptionPlan`
3. **Mantener compatibilidad**: el `BillingService` lee/escribe ambos formatos durante la transición
4. **Deprecar JSONB** después de 2 releases sin incidentes

### Paso 1: Seed inicial de planes
```sql
INSERT INTO subscription_plans (id, name, slug, price, currency, interval, features, limits, active, sort_order)
VALUES
  ('plan-basic', 'Básico Mensual', 'basic', 150000, 'PYG', 'month',
   '["pos", "bookings", "whatsapp-catalog"]',
   '{"maxProducts": 50, "maxUsers": 3, "maxOrders": 500}', true, 1),
  ('plan-professional', 'Profesional Mensual', 'professional', 350000, 'PYG', 'month',
   '["pos", "bookings", "whatsapp-catalog", "api-access", "loyalty"]',
   '{"maxProducts": 500, "maxUsers": 10, "maxOrders": 5000}', true, 2),
  ('plan-enterprise', 'Enterprise Mensual', 'enterprise', 850000, 'PYG', 'month',
   '["pos", "bookings", "whatsapp-catalog", "api-access", "loyalty", "bio-links", "giveaways", "integrations"]',
   '{"maxProducts": 999999, "maxUsers": 999, "maxOrders": 999999}', true, 3);
```

### Paso 2: Migrar tenant OrderFlow Company
```sql
-- Ya provisioning asigna 'enterprise' plan via JSONB
-- Después de deploy, ejecutar:
INSERT INTO subscriptions (id, tenant_id, plan_id, status, current_period_start, current_period_end, gateway)
SELECT 'sub-orderflow-company', id, 'plan-enterprise', 'active', now(), now() + interval '1 month', 'manual'
FROM tenants WHERE id = 'orderflow-company';
```

## API Endpoints Nuevos/Modificados

### Públicos (sin auth)
- `GET /api/v1/billing/plans` — listar planes públicos

### Autenticados (tenant scope)
- `GET /api/v1/billing/subscription` — suscripción actual del tenant
- `POST /api/v1/billing/subscription/change` — cambiar de plan
- `POST /api/v1/billing/subscription/cancel` — cancelar
- `GET /api/v1/billing/invoices` — listar facturas
- `GET /api/v1/billing/invoices/:id` — detalle de factura
- `POST /api/v1/billing/invoices/:id/pay` — pagar factura

### Webhooks
- `POST /api/v1/billing/webhooks/stripe` — eventos de Stripe
- `POST /api/v1/billing/webhooks/mercadopago` — eventos de Mercado Pago
- `POST /api/v1/billing/webhooks/payment` — webhook genérico (existente)

## Gateway de Pagos

### Opción A: Stripe (recomendado para v1.5.0)
- Ventajas: manejo nativo de suscripciones, facturación automática, prorrateos
- Flujo: `POST /billing/subscribe` → crea `Subscription` + `Stripe Checkout Session` → webhook actualiza estados
- Campos nuevos en `Payment`: `subscriptionId`, `invoiceId`

### Opción B: Mercado Pago
- Similar a Stripe pero con `preferenceId` recurrente
- Requiere más manejo manual de prorrateos

### Opción C: Manual/Transferencia
- Para clientes que pagan por transferencia bancaria
- Admin crea `Invoice` → cliente paga → admin marca como `paid`
- Webhook no necesario

## Cron Jobs

```typescript
@Cron('0 2 * * *') // Diariamente a las 02:00
async handleRecurringInvoices() {
  // 1. Buscar suscripciones activas cuyo período termine en los próximos 3 días
  // 2. Generar Invoice para cada una
  // 3. Si gateway == 'stripe': llamar a Stripe para generar factura automáticamente
  // 4. Si gateway == 'manual': enviar recordatorio por email
}

@Cron('0 3 * * *') // Diariamente a las 03:00
async handleExpiredSubscriptions() {
  // 1. Buscar suscripciones con currentPeriodEnd < now() y status != canceled
  // 2. Intentar cobro automático (Stripe)
  // 3. Si falla: marcar past_due, enviar recordatorio
  // 4. Si sigue fallando por 7 días: marcar canceled
}
```

## Archivos a Modificar/Crear

### Backend
1. `backend/prisma/schema.prisma` — agregar modelos SubscriptionPlan, Subscription, Invoice, SubscriptionAddon
2. `backend/src/billing/dto/create-subscription.dto.ts`
3. `backend/src/billing/dto/update-subscription.dto.ts`
4. `backend/src/billing/subscription-plans.service.ts`
5. `backend/src/billing/subscriptions.service.ts`
6. `backend/src/billing/invoices.service.ts`
7. `backend/src/billing/subscription-plans.controller.ts`
8. `backend/src/billing/subscriptions.controller.ts`
9. `backend/src/billing/invoices.controller.ts`
10. `backend/src/billing/billing.service.ts` — refactor para usar nuevos modelos
11. `backend/src/billing/billing.controller.ts` — agregar nuevos endpoints
12. `backend/src/billing/billing.module.ts` — registrar nuevos servicios/controladores
13. `backend/src/billing/cron/recurring-billing.cron.ts`
14. `scripts/seed-subscription-plans.sh` — seed inicial de planes

### Frontend
1. `frontend/src/pages/admin/subscription-plans.tsx` — CRUD de planes
2. `frontend/src/pages/admin/subscriptions.tsx` — gestión de suscripciones
3. `frontend/src/pages/admin/invoices.tsx` — listado de facturas
4. `frontend/src/pages/admin/billing.tsx` — dashboard de métricas (MRR, churn)

## Orden de Implementación

### Sprint 1 (1-2 días) — Modelo base
1. Agregar modelos a schema.prisma
2. Ejecutar `prisma migrate dev`
3. Crear `SubscriptionPlanService` + `SubscriptionPlanController`
4. Seed de planes iniciales
5. Actualizar `BillingService` para leer desde `Subscription` en vez de JSONB

### Sprint 2 (2-3 días) — API de suscripciones
1. `SubscriptionService` + `SubscriptionController`
2. `InvoiceService` + `InvoiceController`
3. Endpoint `POST /billing/subscribe` con Stripe Checkout
4. Webhooks de Stripe

### Sprint 3 (1-2 días) — Automatización
1. Cron de generación de facturas
2. Cron de manejo de suscripciones expiradas
3. Emails de recordatorio (Mailjet/Sendgrid)

### Sprint 4 (1-2 días) — Frontend
1. Páginas admin de planes, suscripciones, facturas
2. Checkout público para nuevos clientes

## Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| Migración de datos JSONB corrupta | Script idempotente con validaciones |
| Stripe webhooks duplicados | Idempotency key en `gatewayInvoiceId` |
| Conexiones DB en cron jobs | Usar `@TenantPrisma()` con pool limitado |
| Prórroga/renovación fallida | Retry 3x + notificación admin |
| Cambio de plan a mitad de período | Prorrateo automático o crédito a favor |

## Alternativa Rápida (sin modelo nuevo)

Si necesitás salir al mercado **esta semana**, podés usar el enfoque minimalista:

1. Mantener `Tenant.config.subscription` como fuente de verdad
2. Agregar solo `SubscriptionPlan` (catálogo de planes)
3. Usar Stripe Payment Links (no requiere backend adicional)
4. Webhook `POST /billing/webhooks/payment` actualiza `Tenant.config.subscription`
5. Admin crea facturas manualmente en Stripe y las marca como pagadas

**Ventaja:** 1 día de desarrollo vs 1 semana del modelo completo.

## Decisión Requerida

¿Cuál opción implementamos?
- **A)** Modelo completo (Sprints 1-4, ~1 semana)
- **B)** Rápida (1 día, usar JSONB + Stripe Payment Links)
- **C)** Híbrida: modelo completo pero sin frontend nuevo (usar admin existente + API)
