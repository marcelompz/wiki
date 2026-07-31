# OrderFlow - Arquitectura del Sistema

[🏠 Atrás (README)](../README.md) | [🚀 Inicio Rápido](01-quickstart.md) | [🏗️ Arquitectura](02-architecture.md) | [🏢 Multi-Tenant Demo](03-multi-tenant-demo.md) | [🔐 JWT Auth](04-jwt-auth.md) | [📊 Testing Report](05-testing-report.md) | [🏪 POS & KDS](06-pos-kds.md) | [📊 Diagramas UML](07-uml-diagrams.md) | [🎖️ Loyalty Module](08-loyalty.md)

---

> **Nombre Comercial:** **OrderFlow** (SaaS Multi-Tenant de Ventas de Alta Velocidad).

---

## 🚀 Filosofía del Proyecto

El sistema se rige bajo cuatro pilares fundamentales:

1. **Agnóstico al ERP:** El core define sus propias reglas (API-First). Cualquier sistema externo (Odoo, MIDA, SAP, etc.) se conecta mediante Webhooks y una API REST unificada.
2. **Multi-Rubro:** Estructura de datos flexible mediante metadatos dinámicos (`JSONB`), permitiendo comercializar desde repuestos automotrices hasta indumentaria, spas o tecnología.
3. **Multi-Tenant & Multi-Tier (SaaS Ready):** Aislamiento de datos por `tenant_id` mediante JWT y API Key. Soporta tenants `shared` (DB compartida) y `dedicated` (DB propia enterprise) a través de `TenantConnectionManager`.
4. **Multi-Plataforma & Omnicanal:** Frontend Web (Refine.dev + Ant Design con Code Splitting), Desktop POS nativo (Tauri + Rust), App Móvil (React Native + Expo) y Bio-Links Transaccionales (0% comisión).

---

## 🏗️ Arquitectura de Datos y Persistencia (PostgreSQL 15 + Redis 7)

Aislamiento multi-tenant lógico y físico gestionado por **Prisma ORM** y **Redis 7**:

### Tablas Base y Modelos Core

| Modelo / Tabla | Descripción y Campos Clave |
|-------|--------|
| **Tenant** | `id`, `name`, `apiKeySecret`, `isolationTier` (`shared` \| `dedicated`), `dedicatedDatabaseUrl`, `subdomain`, `active`. |
| **Product** | `id`, `tenantId`, `skuInterno`, `name`, `price`, `costPrice`, `stockAvailable`, `imagesUrls`, `category`, `metadata` (JSONB). |
| **Customer** | `id`, `tenantId`, `taxId` (RUC/Cédula/NIT), `name`, `phone`, `email`, `metadata`. |
| **Order** | `id`, `tenantId`, `customerId`, `status` (Enum: `DRAFT`, `CONFIRMED`, `PREPARING`, `READY`, `DELIVERED`, `CANCELLED`), `totalAmount`. |
| **OrderLine** | `id`, `orderId`, `productId`, `quantity`, `priceAtSale`, `subtotal`, `grossProfit`, `profitMargin`. |
| **BioLink** | `id`, `tenantId`, `slug`, `title`, `bio`, `themeColor`, `blocks` (JSONB), `showBranding`, `isActive`. |
| **LoyaltyCard** | `id`, `tenantId`, `customerId`, `pointsBalance`, `tier` (`BRONZE` → `PLATINUM`), `barcodeValue`. |
| **Quotation** | `id`, `number`, `tenantId`, `customerId`, `status` (`DRAFT`, `SENT`, `ACCEPTED`), `totalAmount`. |
| **AuditLog** | `id`, `tenantId`, `userId`, `action`, `resource`, `resourceId`, `oldValue`, `newValue`. |

> **Índices de Alto Rendimiento:**
> - `orders`: `@@index([tenantId, createdAt, status])` y `@@index([tenantId, customerId])`.
> - `products`: `@@index([tenantId, active])`.

---

## 🌐 Subsistema Edge Proxy & SSL (Traefik v3.3)

OrderFlow utiliza **Traefik v3.3** como su único proxy perimetral y gateway de entrada (sustituyendo a Nginx).

- **Gestión de SSL Automática:** Desafío `DNS-01` con Cloudflare API para emisión de certificados wildcard `*.pesallaccia.com`.
- **Enrutamiento Multi-Tenant:** Redirección automática de subdominios de clientes (`https://<tenant>.pesallaccia.com`) hacia los contenedores de frontend y backend.
- **HTTPS Redirect:** Forzado permanente de HTTP (puerto 80) a HTTPS (puerto 443) con código HTTP 308.
- **Repositorio:** Administrado via [traefik-orderflow](https://github.com/marcelompz/traefik-orderflow.git).

---

## 💻 Backend API-First & WebSockets (NestJS + TypeScript)

El backend expone endpoints REST documentados en Swagger (`/api/docs`) y un WebSockets Gateway para operaciones en tiempo real:

### 1. Ingesta / Sync REST (`/api/v1/sync/*`)
- `POST /api/v1/sync/products`: Upsert masivo de catálogo.
- `PATCH /api/v1/sync/products/stock`: Actualización ultrarrápida de stock.
- `POST /api/v1/sync/customers`: Sincronización de clientes preexistentes.

### 2. POS & KDS WebSockets Gateway (`OrdersGateway`)
- Namespace: `/orders` con salas aisladas por tenant (`tenant:<tenantId>`).
- Eventos: `order:new` (nueva comanda enviada a cocina) y `order:status_updated` (actualización de semáforo KDS).

### 3. Caché y Rate Limiting (Redis 7)
- **Rate Limit por Tenant:** Evaluado vía `TenantThrottlerGuard` con almacenamiento en Redis.
- **Caché de Bio-Links:** Clics y resolución de páginas públicas en `cache:biolink:<slug>` con invalidación automática.

---

## 🖥️ Frontend Web & Optimización (React + Refine.dev)

- **Code Splitting**: Carga perezosa con `React.lazy()` y `<Suspense>` en `AdminApp.tsx` para reducir el bundle inicial.
- **Offline-First POS**: Punto de Venta local impulsado por Dexie.js (IndexedDB) y Zustand sync queue.
- **Live Preview Bio-Links Editor**: Previsualización interactiva tipo smartphone en tiempo real.

---

## 🖥️ Desktop POS (Tauri + Rust)

- App nativa para escritorio con comandos Rust para impresión térmica ESC/POS (`/dev/usb/lp*`) y atajos de teclado.

---

## 📱 Mobile App (React Native + Expo)

- App omnicanal cliente/administrador con persistencia local mediante `SecureStore` y estado global en Zustand.

---

## 📊 Estado Actual de Arquitectura (v1.1.9 Stable)

| Componente | Estado | Tecnología |
|------------|--------|------------|
| **Backend Core & Multi-Tier** | ✅ Completo (389 tests passing) | NestJS 10, Prisma, `@TenantPrisma()`, PostgreSQL 15 |
| **Caché & WebSockets PubSub** | ✅ Completo | Redis 7 Alpine, `@socket.io/redis-adapter` |
| **Frontend Web & Billing** | ✅ Completo (Code Splitting) | React 18, Refine.dev, Ant Design 5, Billing Portal |
| **App Store Marketplace** | 🚧 En progreso (v1.2.0-dev) | Real-time Search, Tenant Selector, Module Registry |
| **POS & KDS** | ✅ Completo | Dexie.js, Zustand, WebSockets Socket.io |
| **Edge Gateway** | ✅ Completo | Traefik v3.3 + SSL Cloudflare |
| **Microservicios Standalone** | ✅ Completo (6 microservices) | `giveaways-standalone`, `whatsapp-catalog-standalone`, `biolinks-standalone`, `bookings-standalone`, `quotations-standalone`, `loyalty-standalone`, `auth-shared` |
| **Testing E2E** | ✅ Completo (14 tests passing) | Playwright |
| **Tauri Desktop** | ✅ Completo | Tauri, Rust, ESC/POS |
| **App Móvil** | ✅ Completo | React Native, Expo |
| **Addon Odoo** | ✅ Completo | Odoo 19 CE (`orderflow_connector`) |
