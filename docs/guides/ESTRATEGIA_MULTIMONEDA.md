# Estrategia y Arquitectura Multimoneda & Integraciones ERP en OrderFlow

> **Versión:** 1.3.0  
> **Fecha:** 2026-07-31  

---

## 1. Resumen de la Arquitectura Multimoneda

OrderFlow admite operaciones **Multimoneda** nativas en todo el SaaS, adaptándose de forma flexible al país del despliegue:

* **Moneda Base del Tenant:** La moneda por defecto del sistema es **`PYG` (Guaraní Paraguayo)** con un IVA general por defecto del 10%. Cada Tenant puede configurar su propia moneda base (ej. `ARS` en Argentina con 21% IVA, `USD`, `BRL`, `EUR`).
* **Monedas Soportadas (`supportedCurrencies`):** Array de divisas aceptadas por tenant para cobro o publicación en catálogo (ej. `["PYG", "ARS", "USD"]`).
* **Fijación de Precios en Productos:** Un producto puede publicarse en cualquier divisa. Si difiere de la moneda base del tenant, se calcula automáticamente `priceInBaseCurrency` aplicando el `exchangeRate`.
* **Transacciones & Pedidos (`Order`):** Al confirmarse un pedido, se registra la divisa utilizada (`currency`), el tipo de cambio de la fecha (`exchangeRate`) y el equivalente en moneda base (`totalAmountBase`).

---

## 2. Servicio de Conversión y Cotizaciones (`CurrencyService`)

Ubicado en `backend/src/common/services/currency.service.ts`:

- **Caché Inteligente:** Almacena tasas de cambio en memoria con un TTL de 30 minutos.
- **Cotizaciones en Tiempo Real:** Integración con APIs externas (ej. *dolarapi.com* para dólar oficial/MEP en Argentina).
- **Resiliency Fallback:** Fallback estático en caso de desconexión de APIs externas para evitar interrupción del servicio.

---

## 3. Matriz de Integración ERP (Tango, Odoo, Contabilium, Xubio)

### DTOs Canónicos Normalizados

```typescript
export interface CanonicalProductDto {
  sku: string;
  name: string;
  price: number;
  currency: string;
  taxRate: number;
  stock: number;
}

export interface CanonicalOrderDto {
  orderNumber: string;
  currency: string;
  exchangeRate: number;
  customer: CanonicalCustomerDto;
  items: Array<{ sku: string; quantity: number; unitPrice: number; taxRate: number }>;
  totalAmount: number;
}
```

### Mapeo por Integrador

| ERP | Moneda | Cotización | Endpoint / API |
| :--- | :--- | :--- | :--- |
| **Tango ERP (Axoft)** | `moneda` (`ARS`/`USD`) | `cotizacion` (Decimal) | REST API / Sync Manager |
| **Odoo (19 CE)** | `currency_id` (res.currency) | `rate` | XML-RPC / JSON-RPC |
| **Contabilium** | `Moneda` | `Cotizacion` | REST API (OAuth2) |
| **Xubio** | `moneda` | `tasaCambio` | REST API (API Key) |

---

## 4. Verificación QA & Despliegue en Producción

- **Script de Validación (`./scripts/init.sh`):** Aprobado (50 suites / 389 unit tests).
- **Playwright E2E:** 100% de rutas públicas y panel de administración verificadas sin errores HTTP ni imágenes rotas.
- **Producción:** Desplegado exitosamente en el servidor Hetzner (`hetzner-orderflow`), accesible vía Traefik v3.4 y Cloudflare SSL en `https://provecchio.com`.
