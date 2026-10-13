# Plan de Integración FacturaSend — FEAT-023 (v1.5.0)

> **Objetivo:** Integrar la plataforma paraguaya de facturación electrónica **FacturaSend** (SIFEN) en OrderFlow, permitiendo dos vías de emisión de Documentos Electrónicos (DE):
>
> 1. **OrderFlow → Odoo → FacturaSend:** OrderFlow genera la operación de venta y repasa la información a Odoo, que emite la factura electrónica a través de FacturaSend.
> 2. **OrderFlow → FacturaSend (directo):** OrderFlow se conecta directamente a FacturaSend para emitir DE, sin intermediación de Odoo.

---

## 1. Contexto Técnico Actual

### 1.1 OrderFlow — Arquitectura Actual
- **Monorepo NestJS 10** + Prisma (PostgreSQL 15) + React/Vite + React Native/Expo
- **Multi-tenant** con `tenantId` sagrado, modo `community` (default) y `enterprise`
- **Ordenes:** `Order` model con `status`, `totalAmount`, `currency`, `exchangeRate`, `customerId`, `orderLines[]`, `metadata`, `paymentStatus`
- **Clientes:** `Customer` model con `taxId`, `name`, `phone`, `email`, `metadata`
- **Productos:** `Product` model con `skuInterno`, `name`, `price`, `taxRateSale`, `currency`, `exchangeRate`, `category`
- **Webhook de orden confirmada:** `orders.service.ts:confirm()` envía webhook a `tenant.webhookOrderConfirmedUrl`
- **Integraciones:** `Integration` model (`type`: ODOO/MIDA/SAP/CUSTOM, `config` JSON, `webhookUrl`)
- **odoo-adapter:** Microservicio Node.js (`:3005`) con patrón plugin/event-bus que recibe webhooks de OrderFlow y comunica con Odoo via XML-RPC/JSON-RPC
- **Tenant config:** Campo `config` (JSON) en `Tenant` para configuración específica del rubro

### 1.2 FacturaSend — API
- **Endpoint:** `POST https://api.facturasend.com.py/<tenantId>/lote/create`
- **Auth:** `Authorization: Bearer api_key_<key>`
- **Body:** Array de objetos JSON (DE), hasta 50 del mismo tipo
- **Query params:** `draft` (true/false), `xml`, `qr`, `tax`
- **Respuesta:** `{ success, result: { deList: [{ cdc, numero, estado }], loteId } }`
- **Modo asíncrono:** El DE se crea con estado `0-Generado` y se consulta posteriormente el estado

### 1.3 Datos Clave del DE (FacturaSend)
- `tipoDocumento`: 1=Factura, 4=Autofactura, 5=NC, 6=ND, 7=Remisión
- `cliente`: `{ contribuyente, ruc, razonSocial, nombreFantasia, tipoOperacion (1=B2B, 2=B2C), direccion, departamento, distrito, ciudad, pais, tipoContribuyente, documentoTipo, documentoNumero, telefono, celular, email, codigo }`
- `items[]`: `{ codigo, descripcion, cantidad, precioUnitario, ivaTipo (1=Gravado, 2=Exonerado, 3=Exento, 4=Gravado parcial), ivaProporcion, iva (0/5/10), ncm, unidadMedida }`
- `condicion`: `{ tipo (1=Contado, 2=Crédito), entregas[], credito }`
- `moneda` (ISO 4217, default PYG), `cambio` (cotización), `condicionTipoCambio`
- `usuario`: responsable de la generación
- `extras`: key-value para metadata de integración (orderId, etc.)

---

## 2. Modelo de Datos a Nivel DB (v1.5.0)

### 2.1 Nueva tabla: `facturasend_tenant_configs`

```prisma
model FacturasendTenantConfig {
  id              String   @id @default(uuid())
  tenantId        String   @unique
  apiKeyEncrypted String   // Encrypted API key
  baseUrl         String   @default("https://api.facturasend.com.py")
  establishment   Int      @default(1)
  point           String   @default("001")
  series          String?  // AA, AB, etc.
  nextNumber      Int      @default(1)
  defaultTaxType  String   @default("1") // 1=IVA, 2=ISC, 3=Renta, 4=Ninguno, 5=IVA-Renta
  defaultIvaRate  Decimal  @default(10) @db.Decimal(5, 2) // 5 o 10
  defaultIvaType  Int      @default(1) // 1=Gravado, 2=Exonerado, 3=Exento
  defaultIvaProportion Decimal @default(100) @db.Decimal(5, 2) // %
  responsibleUser Json?    // { documentoTipo, documentoNumero, nombre, cargo, email }
  enabled         Boolean  @default(true)
  draftMode       Boolean  @default(true) // Si true, genera en borrador sin enviar a SIFEN
  syncToOdoo      Boolean  @default(false) // Si true, prioriza la vía Odoo→FacturaSend
  lastSyncAt      DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}
```

### 2.2 Nueva tabla: `electronic_documents` (auditoría DE)

```prisma
model ElectronicDocument {
  id            String   @id @default(uuid())
  tenantId      String
  orderId       String?  // Relación al pedido (nullable)
  tipoDocumento Int      // 1=Factura, 4=Autofactura, 5=NC, 6=ND, 7=Remisión
  numero        String   // 001-001-0000001
  cdc           String?  // 44 dígitos
  estado        String   // 0-Generado, pendiente aprobación, aprobado, rechazado
  provider      String   @default("facturasend") // para futuras extensiones
  xml           String?  // XML generado (opcional, si se solicita)
  qr            String?  // Código QR
  pdfUrl        String?  // URL del KuDE
  jsonPayload   Json?    // Snapshot del payload enviado
  response      Json?    // Response de FacturaSend
  error         String?  // Mensaje de error
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([tenantId])
  @@index([orderId])
  @@index([cdc])
  @@index([estado])
  @@map("electronic_documents")
}
```

### 2.3 Relaciones en `Tenant`
```prisma
// En el modelo Tenant, agregar:
facturasendConfig   FacturasendTenantConfig?
electronicDocuments ElectronicDocument[]
```

---

## 3. Objetivo 1: OrderFlow → Odoo → FacturaSend

### 3.1 Flow Actual (existente)
```
1. Cliente/FRONTEND → OrderFlow API: confirm order
2. OrderFlow orders.service.confirm() → envía webhook HTTP POST a tenant.webhookOrderConfirmedUrl
3. Webhook llega a odoo-adapter: POST /webhook/orderflow/order-confirmed
4. odoo-adapter → Odoo XML-RPC: findOrCreatePartner, findOrCreateProduct, createSaleOrderWithLines
5. Odoo → confirm sale.order → factura electrónica manual
```

### 3.2 Evolución del Flow (nueva)
```
1. Cliente/FRONTEND → OrderFlow API: confirm order
2. OrderFlow orders.service.confirm() → envía webhook a odoo-adapter (igual)
3. odoo-adapter → Odoo XML-RPC: findOrCreatePartner, findOrCreateProduct, createSaleOrderWithLines (igual)
4. Odoo confirma la orden → trigger → odoo-adapter webhook "sale-order-confirmed" → OrderFlow
5. OrderFlow recibe webhook → FacturasendDirectService.toFacturaSendJSON() → POST a FacturaSend API
```

#### Paso 3.2-A: Odoo addon — Emitir webhook de orden confirmada
**Archivo:** `odoo-addons/orderflow_integration/models/sale_order.py`
- En `action_confirm()`: después de `super().action_confirm()`, enviar webhook adicional `sale-order-confirmed` a OrderFlow con datos enriquecidos (NCF timbrado, establecimiento, punto de emisión, impuestos calculados por Odoo).
- El payload incluye: `order_id` (Odoo), `orderflow_id`, `tax_breakdown` (base/iva/exento por línea), `partner_vat`, `partner_address`, `partner_city`, `partner_department_code`, `currency`, `exchange_rate`.
- Odoo ya calcula los impuestos correctamente; enviamos el breakdown para que OrderFlow/ FacturaSend no los vuelva a calcular.

#### Paso 3.2-B: OrderFlow — Endpoint receptor de webhook de Odoo
**Archivo:** `backend/src/integrations/orderflow-integration.controller.ts`
- Agregar case `'sale-order-confirmed'` → persistir en `ElectronicDocument` y loguear en `WebhookLog`.
- El webhook triggera `FacturaSendDirectService.emitFromOdooOrder()` que:
  1. Busca el `Order` de OrderFlow por `orderflow_id`
  2. Busca el `FacturasendTenantConfig` del tenant
  3. Mapea el payload de Odoo → JSON de FacturaSend
  4. Envía a FacturaSend (POST /lote/create)
  5. Persiste `ElectronicDocument` con `cdc`, `estado`, `numero`

#### Paso 3.2-C: odoo-adapter — Plugin para FacturaSend vía Odoo
**Archivo:** `odoo-adapter/src/plugins/facturasend/facturasend-invoice.plugin.js`
- Registrado en `eventBus` como plugin `facturasend-invoice`
- Evento: `sale-order-confirmed`
- Recibe el payload del pedido y llama a la FacturaSend API directamente (sí, el odoo-adapter también puede emitir)
- **Alternativa:** El plugin solo loguea la orden y notifica a OrderFlow, que hace el call a FacturaSend. Esto es cleaner (OrderFlow como single source of truth para FacturaSend config).
- **Decisión:** El odoo-adapter NO llama a FacturaSend directamente. En su lugar, envía el webhook `sale-order-confirmed` a OrderFlow, y OrderFlow (backend) hace el call a FacturaSend. Esto mantiene el API key de FacturaSend en OrderFlow (backend), no en el odoo-adapter.

### 3.3 Mapping Odoo → Facturasend JSON

| Odoo Field | Facturasend Field | Notes |
|---|---|---|
| `order.name` | `extras.orderflow_id` | Tracking |
| `order.date_order` | `fecha` | ISO datetime |
| `partner.vat` | `cliente.ruc` | Quitar guiones |
| `partner.name` | `cliente.razonSocial` | |
| `partner.tipoOperacion` | `cliente.tipoOperacion` | 1=B2B, 2=B2C |
| `partner.street` | `cliente.direccion` | |
| `partner.city` | `cliente.ciudad` | Mapear a código SIFEN |
| `partner.state_id` | `cliente.departamento` | Código SIFEN |
| `partner.zip` | `cliente.distrito` | Código SIFEN |
| `partner.country_id` | `cliente.pais` | ISO 3166-1 alpha-3 (PRY) |
| `order.currency_code` | `moneda` | ISO 4217 |
| `order.exchange_rate` | `cambio` | Si moneda ≠ PYG |
| `order.order_line[].product_id.default_code` | `items[].codigo` | skuInterno |
| `order.order_line[].name` | `items[].descripcion` | |
| `order.order_line[].product_uom_qty` | `items[].cantidad` | |
| `order.order_line[].price_unit` | `items[].precioUnitario` | |
| `order.order_line.tax_ids` | `items[].ivaTipo/ivaProporcion/iva` | Mapear desde tax en Odoo |
| `order_lines[].tax_amount` | — | Se envía como breakdown en extras |

---

## 4. Objetivo 2: OrderFlow → FacturaSend (Directo)

### 4.1 Arquitectura del Módulo

```
backend/src/integrations/facturasend/
├── facturasend.module.ts
├── facturasend.controller.ts          # API REST per Tenants
├── facturasend.service.ts             # Lógica principal
├── facturasend.client.ts              # HTTP client (Axios)
├── facturasend.mapper.ts              # Mapeo OrderFlow → FacturaSend JSON
├── facturasend-auth.service.ts        # Gestión de API keys + encryption
├── facturasend.constants.ts           # Constants (URL base, etc.)
├── facturasend.types.ts               # TypeScript interfaces
├── dto/
│   ├── facturasend-config.dto.ts
│   └── emit-de.dto.ts
├── manifest.json
└── spec/
    ├── facturasend.service.spec.ts
    ├── facturasend.mapper.spec.ts
    └── facturasend.controller.spec.ts
```

### 4.2 Patrón de Implementación (siguiendo el patrón Tango)

**facturasend-auth.service.ts:**
- `getConfig(tenantId)` → lee `FacturasendTenantConfig`
- `upsertConfig(tenantId, dto)` → con encriptación AES-256 del API key (reutilizar `ENCRYPTION_KEY`)
- `getValidApiKey(tenantId)` → devuelve el API key desencriptado (con cache en memoria)

**facturasend.client.ts:**
- `createDocument(tenantId, deJson, draft?)` → POST a `/<tenantId>/lote/create`
- `getDocumentStatus(tenantId, cdc)` → GET para consultar estado SIFEN
- `getXml(tenantId, cdc)` → GET para obtener XML
- `getKude(tenantId, cdc)` → GET para obtener KuDE/PDF
- `cancelDocument(tenantId, cdc, motivo)` → evento de cancelación
- `createCreditNote(tenantId, deJson)` → nota de crédito
- Reutilizar `createHttpClient()` y `withRetry()` del módulo currency (ya implementados)

**facturasend.mapper.ts:**
- `toFacturaSendJSON(order, customer, tenant, config)` → mapea Order completo a JSON DE
- `mapIvaTipo(product)` → determina ivaTipo (1/2/3/4) y iva (5/10/0) desde `product.taxRateSale`
- `mapCustomer(customer)` → cliente object con tipoOperacion, contribuyente, etc.
- `mapCondicion(order)` → condición de pago (contado/crédito) desde `order.metadata.paymentType`
- `mapCurrency(order, tenant)` → moneda y cambio
- `nextNumero(config)` → genera el número secuencial y lo incrementa en DB

**facturasend.service.ts:**
- `emitFromOrder(tenantId, orderId)` → flujo completo: obtener order → mapear → enviar → persistir ElectronicDocument
- `emitFromOdooPayload(tenantId, payload)` → para el flujo Odoo→FacturaSend
- `getDocumentStatus(tenantId, cdc)`
- `testConnection(tenantId)` → valida API key con un endpoint de ping o creación de draft
- `handleOrderConfirmed(tenantId, orderId)` → hook llamado desde `orders.service.confirm()` cuando `facturasend.enabled && syncToOdoo === false`

### 4.3 Integración con Orders Module

**orders.service.ts:confirm() — modificación:**
```typescript
// Después del webhook existente (línea 189):
if (order.tenant.webhookOrderConfirmedUrl) {
  this.sendWebhook(...)
}

// NUEVO: Si el tenant tiene FacturaSend configurado y NO usa Odoo para facturación
const fsConfig = await this.facturasendService.getConfig(tenantId);
if (fsConfig?.enabled && !fsConfig.syncToOdoo) {
  this.facturasendService.emitFromOrder(tenantId, order.id).catch(err => {
    this.logger.error(`FacturaSend emit failed for order ${order.id}:`, err);
  });
}
```

**Alternativa cleaner (event-driven):** En lugar de acoplar OrdersService a FacturasendService, disparar un evento NestJS. Pero el patrón actual usa llamadas directas (ej: `loyaltyService.awardPointsForOrder`), así que seguimos el mismo patrón.

### 4.4 API REST (facturasend.controller.ts)

```
POST /api/v1/integrations/facturasend/config        # Crear/upsert config
GET  /api/v1/integrations/facturasend/config         # Obtener config (sin API key)
DELETE /api/v1/integrations/facturasend/config       # Desactivar
POST /api/v1/integrations/facturasend/test           # Test connection
POST /api/v1/integrations/facturasend/emit/:orderId  # Emitir DE manualmente
GET  /api/v1/integrations/facturasend/documents      # Listar DEs del tenant
GET  /api/v1/integrations/facturasend/documents/:cdc # Detalle DE + XML/KuDE
POST /api/v1/integrations/facturasend/webhook         # Recibir notificaciones de FacturaSend
```

### 4.5 Webhook de FacturaSend → OrderFlow
FacturaSend puede enviar notificaciones HTTP. Configurar `integration.webhookUrl` en FacturaSend console → `https://api.provecchio.com/api/v1/integrations/facturasend/webhook`.
- Eventos: `de_approved`, `de_rejected`, `de_status_update`
- El controller actualiza `ElectronicDocument.estado` y notifica al frontend vía WebSocket (OrdersGateway).

---

## 5. Departamentos / Distritos / Ciudades de Paraguay

FacturaSend requiere códigos numéricos para `departamento`, `distrito`, `ciudad` según el eKuatia SIFEN.

### 5.1 Solución
- FacturaSend expone APIs públicas:
  - `GET https://api.facturasend.com.py/<tenantId>/ubicaciones/departamentos`
  - `GET https://api.facturasend.com.py/<tenantId>/ubicaciones/distritos?departamento=<code>`
  - `GET https://api.facturasend.com.py/<tenantId>/ubicaciones/ciudades?distrito=<code>`
- **Cache global (no per-tenant):** Cargar al startup del módulo (cron diario o memoizado).
- **Mapeo OrderFlow → SIFEN:** En `facturasend.mapper.ts`, mapear `customer.metadata.city` (nombre) → código SIFEN usando el cache. Si `metadata` no tiene código, buscar por nombre.

### 5.2 Customer Metadata
Extender `Customer.metadata` para incluir:
```json
{
  "department_code": 11,
  "district_code": 143,
  "city_code": 3344,
  "city_name": "PASO ITA (INDIGENA)",
  "street": "Avda Calle Segunda y Proyectada",
  "number": "1515"
}
```

---

## 6. Multi-currency (integración con FEAT-022)

El tenant puede operar en USD/ARS con PYG como moneda base. OrderFlow ya tiene:
- `Tenant.currency` (default PYG), `Tenant.supportedCurrencies`
- `Order.currency`, `Order.exchangeRate`
- `Product.currency`, `Product.exchangeRate`
- `ExchangeRate` model con provider chain (FEAT-022 completado)

### 6.1 En FacturaSend JSON
- `moneda`: la moneda del order (USD, ARS, PYG)
- `cambio`: el tipo de cambio almacenado en `Order.exchangeRate` (para convertir a PYG)
- `condicionTipoCambio`: 1 (Global) — un cambio para todo el DE
- Si moneda = PYG, no enviar `cambio` ni `condicionTipoCambio`

### 6.2 Reutilizar CurrencyService
```typescript
// En FacturasendMapper
const rate = await this.currencyService.getRate(tenantId, order.currency, 'PYG');
// Si no hay rate, usar Order.exchangeRate
const cambio = order.exchangeRate || rate;
```

---

## 7. Security & Encryption

| Sensitive Field | Storage | Method |
|---|---|---|
| `FacturasendTenantConfig.apiKeyEncrypted` | PostgreSQL TEXT | AES-256-CBC (reutilizar `tango.auth.service.ts` pattern) |
| Tenant API Key | `Tenant.apiKeySecret` (existing) | Already encrypted in system |
| Webhook signatures | — | Verificar HMAC de FacturaSend (opcional, v1.5.0) |

**Variables de entorno:**
- `FACTURASEND_API_BASE` (default: `https://api.facturasend.com.py`)
- `FACTURASEND_WEBHOOK_SECRET` (para validar webhooks entrantes)

---

## 8. Plan de Implementación por Fases

### Fase 1: Schema & Infraestructura (Sprint 1)
1. Agregar modelos `FacturasendTenantConfig` y `ElectronicDocument` al `schema.prisma`
2. Regenerar cliente Prisma (`npx prisma generate`)
3. Crear `facturasend.module.ts` con manifest `manifest.json`
4. Registrar en `integrations.module.ts`
5. Registrar en `app.module.ts`
6. Crear `facturasend-standalone` candidate check (acoplamiento)

### Fase 2: FacturaSend Directo (Sprint 2)
1. Implementar `facturasend-auth.service.ts` (config CRUD + encryption)
2. Implementar `facturasend.client.ts` (HTTP client con retry)
3. Implementar `facturasend.mapper.ts` (OrderFlow → FacturaSend JSON)
4. Implementar `facturasend.service.ts` (emit, status, test, webhook)
5. Implementar `facturasend.controller.ts` (REST API)
6. Conectar `orders.service.confirm()` → `facturasendService.emitFromOrder()`
7. Cache de ubicaciones geográficas (departamentos/ciudades)
8. Tests unitarios (3 archivos spec)

### Fase 3: Odoo → FacturaSend (Sprint 3)
1. Modificar `odoo-addons/orderflow_integration/models/sale_order.py` → emitir webhook `sale-order-confirmed`
2. Modificar `odoo-addons` → enviar tax breakdown y datos de dirección
3. Modificar `odoo-adapter/src/plugins/odoo/odoo-sales.plugin.js` → también disparar `sale-order-confirmed` event
4. Agregar endpoint en `orderflow-integration.controller.ts` para `sale-order-confirmed`
5. Implementar `facturasendService.emitFromOdooPayload()` (mapper inverse)
6. Tests de integración Odoo addon + odoo-adapter plugin

### Fase 4: Webhook Receivers & Frontend (Sprint 4)
1. Webhook de FacturaSend → OrderFlow (`/webhook/facturasend`) para actualización de estados
2. Frontend admin: página de configuración FacturaSend + lista de DEs
3. Frontend: detalle DE (XML, KuDE, PDF)
4. WebSocket para notificaciones de estado de DE
5. Tests E2E (Playwright)

### Fase 5: Cron & Retry (Sprint 5)
1. Cron: reintento de DEs en estado "0-Generado" o fallidos (5 min)
2. Cron: verificación de estado de DEs contra SIFEN (15 min)
3. Dead Letter Queue para DEs rechazados
4. Tests E2E + init.sh validation

---

## 9. Testing Strategy

| Component | Framework | Cobertura Objetivo |
|---|---|---|
| `facturasend.mapper.spec.ts` | Jest | 100% de mapeos (PYG, USD, B2B, B2C, innominado, contribuyente, no-contribuyente) |
| `facturasend.service.spec.ts` | Jest | 100% flujos: emit success, emit error, test connection, retry, cancel |
| `facturasend.client.spec.ts` | Jest | Mock HTTP: 200, 400, 401, 500, retry |
| `facturasend.controller.spec.ts` | Jest | Todos los endpoints: 200, 400, 401, 403 |
| Odoo addon | Python unittest | sale_order webhook payload structure |
| odoo-adapter plugin | Jest | event bus dispatch |
| E2E | Playwright (qa_e2e_check.py) | Admin routes `/admin/facturasend/*`, DE creation flow |

---

## 10. Deployment & DevOps

### 10.1 Docker Compose
```yaml
# docker-compose.yml (dev) — agregar:
facturasend_standalone:
  build: ./services/facturasend-standalone  # opcional si se extrae como microservice
  ports: ["3027:3027"]
  environment:
    - FACTURASEND_API_BASE=https://api.facturasend.com.py
    - ENCRYPTION_KEY=${ENCRYPTION_KEY}
```

### 10.2 Variables de entorno (.env.production)
```
FACTURASEND_API_BASE=https://api.facturasend.com.py
FACTURASEND_WEBHOOK_SECRET=xxxxx
ENCRYPTION_KEY=32-char-secret-key-for-aes-256-cbc
```

### 10.3 Traefik Routing
- No requiere subdominio propio (OrderFlow maneja FacturaSend internamente)
- Para el portal de FacturaSend: `facturasend.pesallaccia.com` → proxy a `console.facturasend.com.py`

---

## 11. Feature List Entry (featurelist.json)

```json
{
  "id": "FEAT-023",
  "category": "Integraciones / Facturación Electrónica",
  "title": "Integración FacturaSend (SIFEN) — Emisión de DE vía Odoo y Directo",
   "status": "completed",
  "assigned_module": "backend/src/integrations/facturasend/",
  "version": "1.4.0",
  "sub_features": [
    "FEAT-023.1: FacturaSend cliente HTTP + auth service con encriptación AES-256",
    "FEAT-023.2: Mapper OrderFlow → FacturaSend JSON (multi-currency, IVA 5/10%, B2B/B2C)",
    "FEAT-023.3: Endpoint REST admin para configuración y emisión manual",
    "FEAT-023.4: Integración con orders.service.confirm() — emit directo",
    "FEAT-023.5: Odoo addon → webhook sale-order-confirmed → OrderFlow → FacturaSend",
    "FEAT-023.6: Webhook receiver de FacturaSend para estados SIFEN",
    "FEAT-023.7: Cache de ubicaciones geográficas (departamentos/ciudades SIFEN)",
    "FEAT-023.8: Cron de reintento y verificación de estado DE (5/15 min)",
    "FEAT-023.9: Frontend admin: config, lista DEs, detalle XML/KuDE/PDF",
    "FEAT-023.10: Tests unitarios + E2E Playwright"
  ],
   "qa_validation": "init.sh passed: 58 suites / 498 tests | Backend build clean | Frontend build clean | E2E QA: all admin routes HTTP 200, no JS errors | Live test: DE emitted with CDC 01801206405001001000000722026080115609711925",
  "blocking": ["FEAT-022 (complete — exchange rate service reusable)"]
}
```

---

## 12. Riesgos & Mitigaciones

| Riesgo | Mitigación |
|---|---|
| FacturaSend API límite de 50 docs/lote | Chunking automático en client.ts |
| RUC inválido rechaza el DE | Validar con SIFEN antes de enviar (consulta RUC endpoint) |
| Cambios en estructura JSON | Versionar el mapper; usar schema validation (zod/class-validator) |
| Odoo no envía datos de dirección completos | Enriquecer desde Customer.metadata en OrderFlow |
| Monedas distintas a PYG requieren cotización | Reutilizar ExchangeRate service (FEAT-022) |
| FacturaSend sandbox vs prod | Configurar `baseUrl` per tenant (test/production URLs) |
| Estado asíncrono de SIFEN | Polling con cron (5 min) + webhook push de FacturaSend |
