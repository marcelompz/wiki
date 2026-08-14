# Informe de Evaluación — OrderFlow v1.12.0

**Fecha:** 2026-08-04  
**Versión evaluada:** 1.12.0  
**Fuente:** `orderflow_v1.12.0.tar.gz` (core files)  
**Alcance:** Arquitectura, backend, frontend, infraestructura, flujo de confirmación de pedidos y recomendaciones

---

## 1. Resumen ejecutivo

OrderFlow es una plataforma **SaaS omnicanal multi-tenant** orientada a negocios (retail, spa, gastronomía, servicios) con:

| Capa | Tecnología |
|------|------------|
| Backend | NestJS 10 + Prisma 5 + PostgreSQL |
| Frontend | React 18 + Vite + Ant Design + Refine + Zustand |
| Auth | JWT + API Keys (`x-api-key`) + RBAC granular |
| Infra | Docker Compose, Traefik v3, Redis, Grafana/Loki/Tempo |
| Integraciones | Odoo, Tango ERP, FacturaSend (SIFEN), Stripe, Mercado Pago, WhatsApp, Google Calendar |

**Conclusión general:** Edición **estable y comercialmente usable**. El core de multi-tenancy, pedidos, POS/KDS, facturación electrónica paraguaya e integraciones ERP está sólido. Existe deuda técnica controlada (testing hacia 70-80 %, refinamiento UX, algunos atajos de dominio).

---

## 2. Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│         Cloudflare + Traefik v3 (SSL / DNS-01)              │
└──────┬──────────────────────────────────────┬───────────────┘
       │                                      │
       ▼                                      ▼
┌──────────────────┐               ┌──────────────────┐
│  OrderFlow       │               │  Odoo Adapter    │
│  Frontend :80    │               │  :3005           │
│  Backend  :3010  │◄─────────────►│                  │
│  PostgreSQL      │               └──────────────────┘
│  Redis           │
└──────────────────┘
```

### Características arquitectónicas destacadas

1. **Multi-tenancy maduro**
   - Aislamiento por `tenantId` (shared DB).
   - Soporte de DB dedicada (`isolationTier: shared | dedicated`).
   - Resolución de tenant por host (`TenantByHostMiddleware`): `customDomain` o subdomain.
   - White-label (dominio propio, branding, CSS custom).

2. **Inyección de Prisma por tenant**
   - Decorador `@TenantPrisma()` + `TenantConnectionManager`.
   - Guards y middleware inyectan el cliente correcto.

3. **Módulos / plugins**
   - `modulesRegistry`, `ModuleInstallation` por tenant.
   - Estrategia de microservicios standalone (Giveaways, WhatsApp Catalog, Bio-Links).

4. **Observabilidad**
   - Sentry (backend + frontend).
   - Prometheus (`prom-client`).
   - Stack Grafana + Loki + Tempo + Alertmanager en producción.

---

## 3. Backend

### 3.1 Bootstrap (`main.ts`)

- Helmet con `crossOriginResourcePolicy: false`.
- CORS dinámico según `ROOT_DOMAIN` / `FRONTEND_URL`.
- `ValidationPipe` estricto (`whitelist`, `forbidNonWhitelisted`, `transform`).
- Swagger solo en no-producción (`/api/docs`).
- Redis IoAdapter opcional para WebSockets (`ENABLE_REDIS_WS`).
- Static `/uploads` para imágenes de catálogo WhatsApp.
- TZ forzada a `America/Asuncion`.

### 3.2 Resolución de tenant

`TenantByHostMiddleware`:

1. Si ya existe `req.tenant` o es super-admin → next.
2. Busca por `customDomain`.
3. Si no, toma el primer segmento del host como `subdomain` (excluye `www` y `orderflow`).
4. No bloquea si no encuentra tenant (permite rutas públicas).

### 3.3 Orders — Controller

| Método | Ruta | Permiso | Acción |
|--------|------|---------|--------|
| POST | `/api/v1/orders` | `orders:create` | Crear DRAFT |
| PATCH | `/api/v1/orders/:id/confirm` | `orders:update` | Confirmar |
| GET | `/api/v1/orders` | `orders:read` | Listar |
| GET | `/api/v1/orders/:id` | `orders:read` | Detalle |
| PATCH | `/api/v1/orders/:id/cancel` | `orders:update` | Cancelar |
| PATCH | `/api/v1/orders/:id/status` | `orders:update` | Cambiar estado (KDS) |

### 3.4 Schema Prisma (puntos clave)

- **Tenant:** branding, multi-currency, soft-delete, isolation tier, webhook URL, subdomain/custom domain.
- **Order / OrderLine:** status, márgenes, impuestos, cost snapshot, metadata.
- **Bookings:** Service, Resource (HUMAN/PHYSICAL), Availability, Exceptions, Slots, AppointmentAssignment.
- **Contacts unificados** estilo Odoo (`Contact` + `ContactRole`).
- **Loyalty, Giveaways, BioLink, Suppliers, Tango, ExchangeRate, FacturaSend, Billing** (planes, suscripciones, facturas, payment transactions).
- Índices adecuados en tablas calientes (`orders`, `products`, `appointment_assignments`).

---

## 4. Frontend

### 4.1 App principal (`App.tsx`)

- Detección de storefront por subdominio / dominio dedicado vs subdominios de sistema.
- Landing pública vs app autenticada.
- Prompt de instalación PWA.
- Rutas: catálogo, checkout, pedidos.

### 4.2 API client (`api.ts`)

- Interceptor: JWT prioritario sobre API key.
- Redirect a login en 401 (excepto rutas públicas).
- Base URL normalizada (evita duplicar `/api`).

### 4.3 POS Admin (`pos.tsx`)

Dos modos:

| Modo | Función |
|------|---------|
| **Mozo** | Catálogo → carrito → crea orden DRAFT con `metadata.table` |
| **Cajero** | Lista DRAFTs → selecciona mesa → aplica descuento UI → confirma con `paymentType` |

UI Ant Design usable. En el extracto evaluado aún aparecen aspectos de staging (mesas hardcodeadas; offline/Dexie mencionado en roadmap pero no visible aquí).

---

## 5. Infraestructura

### Desarrollo (`docker-compose.yml`)

- PostgreSQL 15, Redis 7, backend (hot-reload), frontend nginx, odoo_adapter.
- Traefik opcional vía profile.
- Healthchecks configurados.

### Producción (`docker-compose.prod.yml`)

- Backend + frontend + odoo_adapter + Redis + Postgres.
- Observabilidad: Loki, Tempo, Grafana, Promtail, Alertmanager.
- Redes: `orderflow-network` + `traefik-public` (externa).
- Dominios de ejemplo: `provecchio.com`, `api.provecchio.com`.

### Traefik

- Routers por host + `PathPrefix(/api)` y `/webhook`.
- Middlewares de headers de seguridad.
- DNS-01 Cloudflare, Let's Encrypt wildcard.
- Storefronts de tenants por `HostRegexp`.

---

## 6. Flujo de confirmación de pedidos (análisis detallado)

### 6.1 Entrada

```http
PATCH /api/v1/orders/:id/confirm
Authorization: Bearer <jwt>  |  x-api-key: <secret>
Content-Type: application/json

{
  "customer_id": "...",          // opcional
  "paymentType": "cash" | "card" | "transfer"
}
```

Protegido por `ApiKeyGuard` + `PermissionsGuard` (`orders:update`).  
El tenant y el `PrismaClient` correcto llegan inyectados (`req.tenant`, `@TenantPrisma()`).

### 6.2 Validación inicial

1. `findUnique` del pedido con `orderLines` (product), `customer` y `tenant`.
2. Verifica `order.tenantId === tenantId`.
3. **Idempotencia:** si `status === 'CONFIRMED'` → retorna el pedido sin reejecutar side-effects.

### 6.3 Transacción principal (`$transaction`)

#### A. Actualización del pedido

- `status → CONFIRMED`
- `customerId` (si viene en el DTO)
- `metadata` enriquecido con:
  - `paymentType`
  - `paymentTypeName` (Efectivo / Tarjeta / Transferencia)

#### B. Por cada OrderLine

1. Cálculos:
   - `subtotal = priceAtSale × quantity`
   - `costTotal = costPrice × quantity`
   - `taxAmount = subtotal × (taxRateSale / 100)`
   - `grossProfit = subtotal − costTotal − taxAmount`
   - `profitMargin = (grossProfit / subtotal) × 100`
2. Actualiza la línea con `costPrice`, `taxAmount`, `grossProfit`, `profitMargin`.
3. **Stock:**
   - Si `stockAvailable >= quantity` → `decrement`.
   - Si no → `console.warn` (**no bloquea**; permite stock negativo).

#### C. “Caja” (Integration CUSTOM)

Upsert en `Integration` con `id = tenantId + '_cash'`:

- Nombre: `"Caja - Ventas"`
- Tipo: `CUSTOM`
- Acumula `totalEntries` y guarda `lastEntry` (orderId, amount, paymentType, timestamp).

Diseño ad-hoc (no es un modelo formal de movimientos de caja).

#### D. Side-effects lanzados dentro del callback de la TX

- Si el tenant tiene `webhookOrderConfirmedUrl` → `sendWebhook(...)` (fire-and-forget + catch).
- `ordersGateway.emitNewOrder(tenantId, updatedOrder)` → WebSocket para KDS.

### 6.4 Side-effects post-transacción

| Servicio | Comportamiento |
|----------|----------------|
| **Loyalty** | `awardPointsForOrder` — try/catch; fallo no revierte el pedido |
| **FacturaSend** | Emite DE si config habilitada y `syncToOdoo === false` — try/catch |

### 6.5 Webhook (`sendWebhook`)

Payload enriquecido:

```json
{
  "event": "order.confirmed",
  "tenant_id": "...",
  "order_id": "...",
  "integration_config": { },
  "customer": {
    "tax_id", "name", "phone", "email", "city", "street"
  },
  "items": [
    {
      "sku_interno", "name", "category", "qty", "price", "type",
      "booking_details": { ... }   // si hay AppointmentAssignment
    }
  ],
  "timestamp": "..."
}
```

- Timeout configurable (`WEBHOOK_TIMEOUT`, default 5 s).
- Escribe `WebhookLog` (success/failure).
- Si OK → `order.webhookSent = true` + `webhookSentAt`.
- Existe `retryPendingWebhooks()` para pedidos `CONFIRMED` con `webhookSent = false`.

### 6.6 Diagrama de secuencia

```
Cliente / POS
    │
    ▼
OrdersController.confirm
    │
    ▼
OrdersService.confirm
    │
    ├─ findUnique (order + lines + product + customer + tenant)
    ├─ validaciones + early return si ya CONFIRMED
    │
    ▼
$transaction
    ├─ order.update → CONFIRMED + metadata payment
    ├─ por línea: márgenes/tax + decrement stock (warn si no alcanza)
    ├─ Integration upsert “Caja - Ventas”
    ├─ (fire) sendWebhook
    └─ (fire) ordersGateway.emitNewOrder  → KDS
    │
    ▼
post-TX
    ├─ loyaltyService.awardPointsForOrder   (try/catch)
    └─ facturasendService.emitFromOrder     (try/catch)
    │
    ▼
return confirmedOrder
```

### 6.7 Ciclo de vida del pedido

| Estado | Origen típico |
|--------|----------------|
| `DRAFT` | POS mozo, WhatsApp, storefront, API |
| `CONFIRMED` | Este flujo (caja / checkout) |
| `PREPARING` / `READY` / `DELIVERED` | KDS (`PATCH .../status`) |
| `CANCELLED` | `PATCH .../cancel` |

---

## 7. Fortalezas

| Área | Evaluación |
|------|------------|
| Multi-tenant + multi-tier | Alto — schema, middleware, guards y connection manager listos |
| Pipeline de pedidos | Alto — márgenes, stock, webhook, KDS, loyalty, FacturaSend |
| Integraciones | Alto — Odoo, Tango, FacturaSend, pagos |
| Billing SaaS | Alto — planes, suscripciones, facturas, MRR |
| Observabilidad | Alto — Sentry, Prometheus, Grafana/Loki/Tempo |
| Dominio Paraguay | Alto — TZ, PYG, SIFEN, cotizaciones |
| Idempotencia en confirm | Buena |
| Side-effects no bloqueantes | Correcto (la venta no se pierde por fallo de integración) |

---

## 8. Riesgos y puntos débiles

1. **Stock negativo permitido**  
   Solo warning. Útil en gastronomía/POS; riesgoso en retail puro. Conviene flag configurable por tenant.

2. **“Caja” ad-hoc**  
   Upsert sobre `Integration` con `id = tenantId + '_cash'` es frágil (race en `totalEntries`, tipado `any`, sin movimientos individuales). Mejor un modelo `CashMovement` o `CashRegister`.

3. **Side-effects dentro del callback de la transacción**  
   Webhook y WebSocket se lanzan dentro de `$transaction`. Ideal moverlos **después** del `await` para separar claramente el commit de DB de las notificaciones.

4. **Descuento**  
   El POS envía `discountAmount`, pero en el extracto de `confirm` no se observa aplicación al `totalAmount` ni a las líneas. Posible gap frontend ↔ backend.

5. **Confirm concurrente**  
   Dos `PATCH /confirm` simultáneos pueden pasar el check de status antes del commit. Un `UPDATE ... WHERE status = 'DRAFT'` sería más seguro.

6. **Cobertura de tests**  
   Roadmap indica ~498 tests / 58 suites (~45 % real) con target 70-80 %. Buen avance, aún margen.

7. **POS frontend**  
   Funcional pero con rasgos de staging (mesas hardcodeadas; offline no visible en el extracto).

---

## 9. Madurez por módulo (síntesis)

| Módulo | Estado aparente |
|--------|-----------------|
| Multi-Tenant Core & Multi-Tier | Completo |
| Orders / POS / KDS | Completo |
| Bookings | Completo |
| Loyalty | Completo |
| FacturaSend (SIFEN) | Completo (vía directa); Odoo-mediated parcial |
| Billing SaaS | Completo |
| WhatsApp Catalog | Completo |
| Giveaways / Bio-Links | Completo |
| Observabilidad | Completo |
| Testing / QA | En progreso (E2E presente, cobertura unitaria a mejorar) |
| UX mobile / desktop | En evolución (foco de v1.12.0) |

---

## 10. Recomendaciones priorizadas

### Alta prioridad

1. Hacer el control de stock **configurable** por tenant (allow negative / hard fail).
2. Extraer side-effects (webhook, WS, loyalty, FacturaSend) **fuera** de la transacción de confirmación.
3. Aplicar descuentos de forma consistente en `confirm` (actualizar `totalAmount` y/o líneas).
4. Endurecer la transición de estado con `UPDATE ... WHERE status = 'DRAFT'`.

### Media prioridad

5. Reemplazar el upsert de “Caja” por un modelo formal de movimientos de caja.
6. Elevar cobertura de tests hacia 70 %+ (especialmente `orders.service`, billing, integraciones).
7. Completar offline-first del POS (Dexie + cola de sync) y quitar hardcodes de mesas.
8. Documentar el comportamiento de stock negativo y de side-effects best-effort.

### Baja prioridad / roadmap

9. Continuar refinamiento UX mobile + desktop (ya en curso en v1.12.0).
10. Avanzar microservicios standalone y, a medio plazo, evaluación de Kubernetes.

---

## 11. Conclusión

**OrderFlow v1.12.0** es un producto SaaS **listo para producción** en el segmento multi-tenant omnicanal, con fuerte adecuación al mercado paraguayo (moneda, TZ, facturación electrónica SIFEN) y base sólida de pedidos, integraciones ERP y billing.

El flujo de confirmación de pedidos es **robusto y pragmático**: prioriza que la venta se complete y trata integraciones (webhook, loyalty, FacturaSend) como best-effort. Los principales puntos a endurecer son el control de stock, la formalización de la caja, la aplicación de descuentos y la separación clara entre commit de base de datos y side-effects.

Con la deuda técnica actual controlada y un roadmap claro, la plataforma se encuentra en una posición favorable para consolidar calidad (testing, UX) y escalar (microservicios, multi-tier enterprise).

---

*Informe generado a partir del análisis de los archivos core de `orderflow_v1.12.0.tar.gz`.*
