# OrderFlow v1.16.0 — Análisis Profundo de la Arquitectura Monolítica

**Fecha:** 6 de agosto de 2026  
**Foco:** Diagnóstico estructural del monolito, acoplamiento real y deuda técnica de dominio

---

## 1. Diagnóstico en una frase

OrderFlow es un **monolito modular en apariencia** (carpetas por dominio) pero un **monolito acoplado en la práctica**: un único proceso NestJS, un único schema Prisma de ~1.600 líneas con 50+ modelos, y un servicio central (`OrdersService`) que orquesta de forma síncrona múltiples bounded contexts.

---

## 2. Evidencia estructural

### 2.1 Un solo schema = un solo modelo de datos

El archivo `schema.prisma` concentra **todos** los dominios:

| Dominio | Modelos principales |
|---------|---------------------|
| Multi-tenancy & Identity | `Tenant`, `User`, `UserTenantAccess`, `Permission`, `RolePermission`, `ApiKey*` |
| Catálogo | `Product`, `Service` |
| Inventario | `Warehouse`, `Location`, `StockQuant`, `StockMove` |
| CRM / Contactos | `Customer` (legacy), `Contact`, `ContactAddress`, `ContactRole`, `ContactCategory*` |
| Pedidos | `Order`, `OrderLine`, `WebhookLog`, `Payment`, `CashMovement` |
| Bookings | `Resource`, `BookingSlot`, `AppointmentAssignment`, `ResourceAvailability` |
| Loyalty | `LoyaltyCard`, `LoyaltyTransaction`, `LoyaltyRule`, `PushToken` |
| Integraciones | `Integration`, `IntegrationFieldMap`, `TangoTenantConfig`, `TangoIdMap`, `FacturasendTenantConfig`, `ElectronicDocument` |
| Billing SaaS | `SubscriptionPlan`, `Subscription`, `Invoice`, `SubscriptionAddon`, `PaymentTransaction` |
| Otros | `Quotation`, `Giveaway*`, `BioLink*`, `AuditLog`, `ImportJob`, `ExchangeRate`, `Supplier` |

**Consecuencia:** cualquier cambio de schema (migración Prisma) toca potencialmente todos los dominios. No existe isolation de datos a nivel de bounded context. El `tenantId` se repite como foreign key en prácticamente todas las tablas — patrón correcto de multi-tenancy compartida, pero que refuerza el acoplamiento horizontal.

### 2.2 Estructura de carpetas vs. realidad de runtime

El README muestra una organización por dominio:

```
backend/src/
├── auth/
├── billing/
├── bookings/
├── contacts/
├── customers/          # legacy
├── integrations/       # Odoo, Tango, FacturaSend
├── orders/
├── products/
├── quotations/
├── tenants/
├── users/              # legacy
└── ...
```

Esto da la **ilusión** de modularidad. En runtime, sin embargo:

- Todo se carga en un único `AppModule`.
- Existe un `modulesRegistry.loadAll()` que sugiere un sistema de plugins/módulos, pero sigue viviendo dentro del mismo proceso y del mismo grafo de dependencias de NestJS.
- Los servicios se inyectan directamente entre sí (no hay mensajería interna obligatoria).

### 2.3 El síntoma más claro: `OrdersService.confirm()`

Este método es la mejor radiografía del acoplamiento actual. En una sola transacción + side-effects post-transacción hace lo siguiente:

```text
confirm(orderId)
├── 1. Validación de tenant + estado DRAFT
├── 2. Cálculo de totales, descuentos, impuestos y margen de ganancia por línea
├── 3. Actualización de OrderLine (costPrice, taxAmount, grossProfit, profitMargin)
├── 4. Decremento directo de Product.stockAvailable          ← inventario denormalizado
├── 5. Creación de CashMovement
├── 6. [Post-tx] Webhook HTTP al ERP externo
├── 7. [Post-tx] Emisión WebSocket (KDS)
├── 8. [Post-tx] LoyaltyService.awardPointsForOrder()
└── 9. [Post-tx] FacturasendService.emitFromOrder()         ← facturación electrónica
```

**Dependencias inyectadas en el constructor:**

```ts
constructor(
  private prisma: PrismaService,
  private httpService: HttpService,
  private ordersGateway: OrdersGateway,
  private loyaltyService: LoyaltyService,          // dominio Loyalty
  private facturasendService: FacturasendService,  // dominio Integraciones / Fiscal
)
```

Esto no es un “servicio de pedidos”. Es un **orquestador de venta completa** que conoce y muta:

- Inventario
- Caja
- Loyalty
- Facturación electrónica
- Notificaciones en tiempo real
- Integraciones externas

---

## 3. Inconsistencia crítica de dominio: inventario dual

En v1.16.0 se introdujo (según el ROADMAP) el modelo de inventario de doble entrada inspirado en Odoo:

```
Warehouse → Location → StockQuant
                ↓
            StockMove (DRAFT → CONFIRMED → DONE)
```

Sin embargo, el flujo de confirmación de pedido **sigue mutando el campo denormalizado**:

```ts
await tx.product.update({
  where: { id: line.productId },
  data: { stockAvailable: { decrement: line.quantity } },
});
```

No se crea un `StockMove`. No se actualiza `StockQuant`. No se respeta ubicación ni reserva.

**Interpretación:** el sistema está en una fase de transición incompleta. El modelo “correcto” ya existe en el schema, pero el camino crítico de negocio (la venta) todavía usa el modelo simple anterior. Esto es el clásico síntoma de un monolito que crece por features sin reescribir los caminos calientes.

Mientras ambos modelos coexistan sin una capa de dominio que los unifique, cualquier reporte de stock, cualquier transferencia entre depósitos o cualquier reserva temporal será inconsistente o requerirá lógica dual.

---

## 4. Patrones de crecimiento típicos de monolito observados

| Patrón | Evidencia en OrderFlow |
|--------|------------------------|
| **God Service** | `OrdersService` conoce 5+ dominios |
| **Shared Database** | Un solo `schema.prisma`, un solo `PrismaClient` (con inyección por tenant) |
| **Legacy dual models** | `Customer` + `Contact` coexistiendo; `users` migrando a `contacts` |
| **Denormalización pragmática** | `Product.stockAvailable` + `StockQuant` al mismo tiempo |
| **Side-effects síncronos con try/catch silencioso** | Loyalty y FacturaSend se ejecutan después de la transacción y se loguean si fallan |
| **Webhook retry ad-hoc** | `retryPendingWebhooks()` con `console.log` y query global (sin tenant isolation visible en el extracto) |
| **Feature folders sin bounded context enforcement** | Carpetas por dominio, pero imports cruzados libres |

---

## 5. Por qué este monolito todavía “funciona”

Hay razones legítimas por las que el diseño actual es comprensible y, en cierta medida, racional:

1. **Velocidad de entrega** — Un solo deploy, un solo schema, transacciones ACID fáciles entre Order + OrderLine + CashMovement + stock.
2. **Equipo pequeño** — Coordinar microservicios o even packages internos tiene overhead que un equipo bootstrap no puede pagar.
3. **Dominio todavía cohesivo** — La mayoría de los flujos realmente giran alrededor de “vender algo a alguien y registrarlo fiscalmente”. El núcleo es un dominio de Order-to-Cash.
4. **Multi-tenancy ya resuelto a nivel de dato** — El `tenantId` + middleware + decorator dan aislamiento suficiente para la etapa actual.

El problema no es que sea monolito. El problema es que **la complejidad de dominio ya superó la capacidad de coordinación informal del monolito**.

---

## 6. Riesgos concretos a medio plazo

### 6.1 Riesgo de consistencia de inventario
El camino crítico de venta no usa el modelo de doble entrada. Cualquier feature de multi-depósito, reserva o transferencia se construirá sobre una base que el propio flujo de venta ignora.

### 6.2 Riesgo de cascada de fallos
Si `LoyaltyService` o `FacturasendService` empiezan a fallar de forma intermitente, el código actual solo loguea. No hay cola durable ni compensación. El ROADMAP de 1.14 introduce BullMQ precisamente para esto, pero el `confirm()` todavía no lo usa de forma visible en el extracto.

### 6.3 Riesgo de migraciones
Una migración Prisma que toque `Product`, `Order` o `Tenant` afecta a todos los tenants (shared) y requiere coordinación con los tenants dedicated. El costo de cambio del schema crece de forma no lineal.

### 6.4 Riesgo de testabilidad
Para testear `confirm()` de forma unitaria hay que mockear:
- Prisma transaction
- LoyaltyService
- FacturasendService
- OrdersGateway
- HttpService (webhooks)

El costo de setup de tests crece con cada nuevo side-effect que se agregue al mismo método.

### 6.5 Riesgo de escalado horizontal
Todo el estado de negocio vive en un solo proceso (salvo Redis opcional para WebSockets). El scaling se reduce a “más réplicas del mismo monolito + sticky sessions o Redis adapter”. Es viable, pero no es el diseño que el ROADMAP de Kubernetes imagina.

---

## 7. Clasificación arquitectónica precisa

| Criterio | Estado actual | Ideal para esta etapa |
|----------|---------------|------------------------|
| Deploy | Monolito | Monolito (correcto) |
| Base de datos | Shared schema + opción dedicated | Shared + dedicated (correcto) |
| Código | Modular folders | Modular folders + **límites de import** |
| Comunicación interna | Inyección directa de servicios | Event bus / colas para side-effects |
| Transacciones | Prisma `$transaction` cross-domain | Transacciones solo dentro del agregado |
| Inventario | Dual (denormalizado + formal) | Un solo modelo de verdad |
| Extensibilidad | `modulesRegistry` + ModuleInstallation | Eventos + plugins reales |

OrderFlow está en la zona clásica del **“modular monolith que todavía no es modular de verdad”**.

---

## 8. Recomendaciones concretas (ordenadas por impacto)

### Prioridad 1 — Cortar el God Service (1-2 sprints)
Extraer del `confirm()` todos los side-effects hacia un bus de eventos interno:

```text
OrderConfirmed Event
  → InventoryHandler (crea StockMove + actualiza StockQuant)
  → CashHandler
  → LoyaltyHandler
  → FacturaSendHandler
  → WebhookHandler (BullMQ)
  → KdsNotifier
```

El método `confirm()` debería terminar siendo:

```ts
async confirm(...) {
  const order = await this.orderRepository.confirmInTransaction(...);
  this.eventBus.publish(new OrderConfirmed(order));
  return order;
}
```

### Prioridad 2 — Unificar inventario (crítico)
Eliminar o degradar `Product.stockAvailable` a un campo calculado/caché. Toda mutación de stock debe pasar por `StockMove`. Mientras existan dos fuentes de verdad, el multi-depósito del ROADMAP será frágil.

### Prioridad 3 — Enforce de límites de módulo
Aunque se mantenga el monolito:
- Prohibir imports directos entre ciertos dominios (eslint boundaries o dependency-cruiser).
- Loyalty no debería ser inyectable desde Orders; solo debería reaccionar a eventos.
- FacturaSend idem.

### Prioridad 4 — Cola durable obligatoria para todo I/O externo
Webhooks, emisión SIFEN, sincronización Odoo/Tango y cualquier llamada HTTP fuera del proceso deben pasar por BullMQ con retries, dead-letter y observabilidad. El `retryPendingWebhooks()` actual es un parche temporal.

### Prioridad 5 — No fragmentar prematuramente
No convertir esto en microservicios todavía. El costo de red, de consistencia distribuida y de operación supera el beneficio mientras el equipo y el volumen de tenants no lo justifiquen. El objetivo intermedio correcto es un **monolito modular con event-driven internals**.

---

## 9. Conclusión

La arquitectura monolítica de OrderFlow no es un error de diseño original: es el resultado natural de un producto que creció resolviendo un dolor concreto (pedidos + WhatsApp + Odoo + fiscalidad paraguaya) con velocidad.

El problema actual es de **madurez de límites**. El schema ya modela dominios distintos. Las carpetas ya existen. El EventBus y BullMQ ya están en el roadmap y parcialmente en las dependencias. Lo que falta es **hacer que el código respete esos límites**.

El `OrdersService.confirm()` es el canario en la mina: mientras ese método siga conociendo loyalty, facturación electrónica, stock denormalizado y webhooks, el sistema seguirá siendo un monolito acoplado, independientemente de cuántas carpetas o de cuántos eventos se agreguen alrededor.

La ventana de oportunidad es ahora (v1.14–v1.16). Después de eso, cada nueva feature (multi-depósito real, más integraciones, más reglas de loyalty, más automatizaciones fiscales) aumentará el costo de la refactorización de forma no lineal.

---

*Análisis basado en schema.prisma (71 modelos/enums), OrdersService (440 líneas), confirm() flow, main.ts, Tenant model y estructura documentada en README/ROADMAP de OrderFlow 1.16.0.*
