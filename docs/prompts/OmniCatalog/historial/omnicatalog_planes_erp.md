# OmniCatalog — Estructura de Planes Comerciales & Especificación de Sincronización ERP

Documento técnico-comercial para la definición de planes SaaS y arquitectura de integración para **OmniCatalog** (módulo de catálogo web y comercio conversacional del ecosistema OmniFlow).

---

## 1. Matriz de Planes y Precios (SaaS USD)

| Característica / Módulo | Plan Básico | Plan Profesional | Plan Enterprise / Sync |
| :--- | :--- | :--- | :--- |
| **Precio mensual (USD)** | **$5 USD / mes** | **$12 USD / mes** | **$29 USD / mes** |
| **Facturación Anual** | $50 USD / año (~$4.16/mes) | $120 USD / año (~$10/mes) | $290 USD / año (~$24.16/mes) |
| **Límite de Productos** | Hasta 50 productos | Hasta 200 productos | **Ilimitados** |
| **Fotos por Producto** | 1 foto por ítem | Hasta 4 fotos por ítem | Hasta 6 fotos por ítem (Galería HD) |
| **Variantes & Modificadores** | Básicas (Talle, Color) | Multi-atributo + Modificadores | Multi-atributo, listas de precios B2B/B2C |
| **Canal de Pedidos** | WhatsApp estructurado | WhatsApp + Checkout básico | WhatsApp, Web Checkout, Direct API |
| **Gestión de Stock** | Manual / Sin control de stock | **Control de stock interno** (Stock masivo, alertas de agotado) | **Control de stock multi-sucursal / multi-depósito** |
| **Herramientas de Marketing** | Horarios comerciales, Links directos | Cupones de descuento, pedido mínimo, analítica de visitas | Meta Pixel, Google Analytics 4, TikTok Pixel, Facebook/IG Shop Catalog Feed |
| **Checkout & Pagos** | A convenir (Efectivo/Transferencia) | A convenir + Pasarelas locales básicas | Pasarelas automáticas (Mercado Pago, Bancard, Stripe) + Pago contra entrega |
| **Sincronización ERP Externa** | ❌ No disponible | ⚠️ Importación/Exportación CSV & Excel | ✅ **Sincronización Nativa Bidireccional en Tiempo Real** (Odoo, SAP, MIDA, Custom API) |

---

## 2. Arquitectura de Sincronización ERP (Plan Enterprise / Sync)

### 2.1. Conectores Soportados
1. **Odoo (v14 a v18+ Community & Enterprise):** Conexión vía JSON-RPC / REST API externa con módulos `sale.order`, `product.template`, `product.product`, `stock.quant`, y `res.partner`.
2. **SAP (Business One / Service Layer & S/4HANA):** Conexión vía SAP B1 Service Layer (OData v4 / REST) para sincronización de maestros de artículos (`Items`), listas de precios (`PriceLists`), socios de negocio (`BusinessPartners`) y órdenes de venta (`Orders`).
3. **MIDA & ERPs Regionales / Legacy:** Arquitectura de *Webhook Dispatcher* y Worker intermedio (ETL/Middleware) con polling programable o endpoints REST estándar.

### 2.2. Flujo de Datos Bidireccional

```
┌─────────────────────────────────────────────────────────────┐
│                       ERP (Odoo / SAP / MIDA)               │
└──────────────┬───────────────────────────────▲──────────────┘
               │ (1) Catálogo & Precios        │ (3) Inyección de
               │     Stock en tiempo real      │     Pedidos de Venta
               ▼                               │
┌─────────────────────────────────────────────────────────────┐
│                 OmniFlow / OmniCatalog Engine               │
└──────────────┬───────────────────────────────▲──────────────┘
               │ (2) Renderizado Catálogo      │ (4) Carrito y Pedido
               ▼                               │     Confirmado
┌─────────────────────────────────────────────────────────────┐
│           Cliente Final (Web Catalog / WhatsApp Chat)       │
└─────────────────────────────────────────────────────────────┘
```

#### Eventos Sincronizados:
* **ERP ➔ OmniCatalog (Inbound):**
  * `product.sync`: Altas, modificaciones de títulos, descripciones, categorías y precios.
  * `stock.update`: Ajustes de inventario por compras, ventas físicas o mermas.
  * `price.update`: Actualización automática de listas de precios promocionales o listas B2B.
* **OmniCatalog ➔ ERP (Outbound):**
  * `order.created`: Creación de presupuesto (`draft quotation`) o pedido confirmado (`sale order`) con desglose de ítems, descuentos y costos de delivery.
  * `partner.sync`: Creación/actualización del cliente con número de WhatsApp, identificación fiscal (RUC/CI) y dirección geolocalizada.
  * `stock.reserve`: Reserva temporal de inventario durante el proceso de checkout.

---

## 3. Master Prompt para Desarrollo / Implementación en OmniCatalog

A continuación se detalla el prompt de ingeniería de producto para ser ejecutado en el entorno de desarrollo o IA de OmniCatalog (OmniFlow):

```markdown
Actúa como Arquitecto de Software y Desarrollador Full-Stack Senior especializado en plataformas de Comercio Conversacional y sincronización con sistemas ERP.

### Contexto del Proyecto:
Estamos evolucionando el catálogo de redes sociales de OmniFlow bajo el módulo "OmniCatalog". OmniCatalog permite a los comercios exhibir productos en una Web App ligera optimizada para móviles y procesar órdenes enviadas a WhatsApp o checkout web.

### Objetivo:
Implementar la infraestructura de planes comerciales SaaS (Básico $5/mes, Profesional $12/mes, Enterprise $29/mes) y construir la capa desacoplada de sincronización bidireccional con ERPs (Odoo Community/Enterprise, SAP Business One Service Layer, MIDA y API genérica).

### Requisitos Funcionales a Desarrollar:

1. **Gestión de Planes y Feature Flags:**
   - Sistema de limitación por plan: recuento de productos (50, 200, ilimitado), cantidad de imágenes por ítem (1, 4, 6) y acceso a módulos.
   - Activación de pasarelas de pago y cupones condicionada al plan contratado.
   - Módulo de ERP Connectors exclusivo para el nivel Enterprise / Sync.

2. **Capa de Abstracción de ERP (`ERPAdapterInterface`):**
   - Diseñar una interfaz estándar en TypeScript/Node.js o Python con los métodos esenciales:
     * `syncProducts(tenantId: string): Promise<SyncResult>`
     * `updateStockLevels(tenantId: string, skuList: string[]): Promise<StockResult>`
     * `pushOrderToERP(tenantId: string, orderData: OrderPayload): Promise<ERPOrderRef>`
     * `upsertCustomer(tenantId: string, customerData: CustomerPayload): Promise<ERPCustomerRef>`

3. **Adaptadores Concretos:**
   - **OdooAdapter:** Implementar llamadas JSON-RPC / REST hacia Odoo para consultar `product.template` / `stock.quant` y generar `sale.order` con sus respectivas `sale.order.line`.
   - **SAPAdapter:** Implementar llamadas HTTPS hacia SAP Business One Service Layer (`/b1s/v2/Orders`, `/b1s/v2/Items`).
   - **GenericWebhookAdapter:** Endpoints configurables con firma HMAC para sistemas propietarios como MIDA.

4. **Motor de Resiliencia y Colas:**
   - Implementar un sistema de colas (Redis / BullMQ / Celery) con reintentos exponenciales (backoff) y dead-letter queue (DLQ) para que caídas temporales del servidor ERP no pierdan pedidos de los clientes.
   - Idempotencia en la inyección de pedidos utilizando `order_uuid` único para evitar duplicación de facturación o presupuestos.

5. **Panel de Control (Tenant Dashboard):**
   - Pantalla de configuración del conector ERP (Host, Credenciales, Base de Datos, Lista de Precios por defecto, Depósito/Almacén asignado).
   - Log visual de sincronización en tiempo real con estados: Exitoso, Pendiente, Fallido (con opción de reintento manual).

Por favor, provee:
1. El diseño del esquema de datos / modelos para `ERPConnection`, `SyncLog`, y `ProductMapping`.
2. La implementación en código de la interfaz y el conector de Odoo.
3. El controlador de webhooks para recibir actualizaciones de inventario en tiempo real.
```
