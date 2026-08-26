# OmniFlow SaaS Omnicanal

![Version](https://img.shields.io/badge/version-1.20.40-blue)
![License](https://img.shields.io/badge/license-Proprietary-red)
![NestJS](https://img.shields.io/badge/backend-NestJS-green)
![React](https://img.shields.io/badge/frontend-React-blue)

**OmniFlow** es una plataforma SaaS omnicanal para gestión empresarial integral con arquitectura multi-tenant, facturación electrónica SISET, integraciones nativas con Odoo ERP (v14, v18, v19), catálogo social omnicanal, punto de venta (POS), pantallas de cocina (KDS), manufactura (MRP), compras, tesorería multi-moneda, fuerza de ventas B2B, analítica de negocios (BI), workspace documental colaborativo con Collabora Online y motor de Inteligencia Artificial con LLM Local (Ollama / vLLM).

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│              Hetzner VPS / Cloudflare (SSL/TLS)              │
│                    Traefik v3.4 Reverse Proxy                │
└──────┬──────────────────────────────────────┬────────────────┘
       │                                      │
       ▼                                      ▼
┌──────────────────┐               ┌──────────────────┐
│   OmniFlow Core  │               │ 8 Microservicios │
│   Frontend:3011  │               │ Standalone Suite │
│   Backend:3010   │               │ :3020 a :3027    │
│   DB:5432        │               │                  │
└──────────────────┘               └──────────────────┘
```

### Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| **Backend** | NestJS + TypeScript + Prisma ORM |
| **Frontend** | React + Vite + Ant Design + Refine |
| **Base de Datos** | PostgreSQL (multi-tenant por schema / RLS) |
| **Proxy** | Traefik v3.4 (SSL automático, subdominios dinámicos por tenant) |
| **Infraestructura** | Docker Compose en Hetzner VPS |
| **Integraciones** | Odoo (v14/v18/v19 CE), Tango ERP, FacturaSend (SIFEN), BCP, Cambios Chaco, DolarApi, Collabora CODE, Ollama / Local LLM (`ai.provecchio.com`) |

---

## 🚀 Características Principales (v1.20.40)

### Motor de Inteligencia Artificial & LLM Local (FEAT-105)
- **Conexión Local Inviolable (`OmniAI`):** Integración con modelos locales (Ollama / vLLM en `ai.provecchio.com` o proxy Traefik SSL) sin enviar información privada a servidores de terceros.
- **Inferencia en Tiempo Real:** Endpoints `/api/v1/integrations/llm/status` y `/chat/completions` con soporte para `llama3`, `mistral` y `gemma`.

### Onboarding Zero-Touch Odoo (FEAT-106)
- **Aprovisionamiento en 1-Click (`tenant_manifest.json`):** Endpoint `POST /api/v1/public/webhooks/odoo/onboard-manifest` para auto-configurar datos de empresa, RUC, categorías, depósitos y credenciales Odoo.

### Workspace Documental & Collabora Online (FEAT-083 & FEAT-082)
- **Visualización & Edición WOPI:** Previsualización y edición en tiempo real de archivos de oficina con Collabora Online (`office.provecchio.com`).
- **Locking Concurrente en Redis:** Control de bloqueos WOPI (`X-WOPI-Lock`) para evitar sobrescrituras entre usuarios.

### OmniFlow DataView Suite (FEAT-VIEW)
- **Filtros Dinámicos & Selección Global:** `DynamicQueryBuilder`, selección global `mode: all` sin límite de páginas y presets `SavedViews` en base de datos.

### Compras & Finanzas Operativas Multi-Moneda (FEAT-104)
- **Órdenes de Compra (OC):** Emisión y congelamiento de tasas de cambio multi-divisa (PYG, USD, BRL, ARS).
- **Recepción Atómica en Kardex:** Recepción de OC con impacto inmediato en el inventario de doble entrada (`executeStockMove`).
- **Cuentas por Pagar (AP):** Generación automática de Facturas de Proveedor (`SupplierBill`) y gestión de pagos parciales/totales.
- **Tesorería & Flujo de Caja:** Movimientos de caja por egresos/ingresos y reporte consolidado (`CashFlow`).

### Dynamic Multi-Currency Engine (FEAT-103)
- **Conversión de Divisas en Tiempo Real:** Cotizaciones dinámicas para PYG, USD, BRL, ARS.
- **Cron Bursátil Automatizado:** Sincronización continua de 07:00 a 18:00 hs (Asunción) con BCP, Cambios Chaco y DolarApi.

### OmniBI Analytics YoY Standalone (FEAT-100)
- **Analítica Comparativa Año a Año (YoY):** Ingesta histórica vía XML-RPC desde Odoo 14 y consolidación omnicanal.

### Fuerza de Ventas B2B & Presupuestos (FEAT-098)
- **Cotizaciones B2B:** Emisión de presupuestos con validez y conversión directa a pedido.
- **Descuentos por Volumen:** Escalas de precios mayoristas Odoo pricelist aplicadas automáticamente.

### OmniPOS & KDS Multi-Estación con BoM (FEAT-097)
- **Punto de Venta POS:** Cobro ultra-rápido, aperturas y arqueos de caja por turno.
- **KDS Multi-Estación con SLA:** Ruteo por comanda a pantallas de Cocina/Bar con tiempos semaforizados (Verde, Amarillo, Rojo).
- **Explosión Atómica de Recetas BoM:** Descuento instantáneo de insumos de cocina al vender platos en el POS.

### OmniManufacturing MRP Engine (FEAT-096)
- **Órdenes de Fabricación (ManufacturingOrder):** Consumo de materias primas y generación de productos terminados.
- **Conversión UoM & Mermas:** Conversión de unidades de medida ($g \leftrightarrow kg$) y cálculo de scrap.
- **Dedicated DB:** Tenant `orderflow-company` con BD propia
- **Aislamiento:** Row-level security + connection pooling

### PWA & Mobile
- **PWA instalable** desde Chrome/Edge/Safari con service worker y manifest
- **Admin responsive:** sidebar colapsable/ocultable en todos los breakpoints
- **Dashboard responsive:** stats en grid adaptativo (xs→lg)
- **Tablas responsive:** scroll horizontal en mobile para mantener datos legibles
- **App móvil Expo:** en progreso (FEAT-012) para clientes y admin básico

### Módulos Activos
- **Core:** Products, Orders, Customers, Bookings, Quotations
- **CRM:** Contacts Unificados (Odoo-style)
- **Billing:** Subscription Plans, Subscriptions, Invoices
- **Integrations:** Odoo, Tango ERP, FacturaSend (SIFEN)
- **WhatsApp:** Catálogo, Checkout, Webhooks
- **Loyalty:** Programa de fidelización
- **POS:** Punto de venta
- **KDS:** Cocina (Kitchen Display)
- **Giveaways:** Sorteos
- **BioLinks:** Bio-Link directory with 0% platform commission
- **Homepage Builder:** Constructor visual de landing

---

## 📁 Estructura del Proyecto

```
orderflow/
├── backend/
│   ├── src/
│   │   ├── auth/               # Autenticación JWT + API Keys
│   │   ├── billing/            # Suscripciones, planes, facturas
│   │   ├── bookings/           # Turnos y agendas
│   │   ├── contacts/           # Contactos unificados (CRM)
│   │   ├── customers/          # Clientes (legacy, migrando a contacts)
│   │   ├── integrations/       # Odoo, Tango, FacturaSend
│   │   ├── orders/             # Pedidos
│   │   ├── products/           # Productos y catálogos
│   │   ├── quotations/         # Presupuestos
│   │   ├── tenants/            # Multi-tenancy
│   │   ├── users/              # Usuarios (legacy, migrando a contacts)
│   │   └── ...
│   ├── prisma/
│   │   └── schema.prisma       # Schema unificado
│   └── Dockerfile.prod
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── admin/          # Admin pages
│   │   │   │   ├── contacts.tsx      # Contactos unificados
│   │   │   │   ├── customers.tsx     # Legacy (mantenido)
│   │   │   │   ├── products.tsx
│   │   │   │   ├── bookings.tsx
│   │   │   │   └── ...
│   │   │   └── ...
│   │   ├── AdminApp.tsx        # Admin router
│   │   └── App.tsx             # Main app router
│   └── Dockerfile.prod
├── scripts/
│   ├── deploy-production.sh    # Deploy a Hetzner
│   ├── provision-orderflow-company.sh  # Provisionar tenant dedicado
│   └── seed-subscription-plans.sh      # Seed planes de suscripción
├── docs/
│   ├── DEPLOYMENT.md           # Guía de deploy
│   ├── SUBSCRIPTION_MODEL_DESIGN.md
│   └── troubleshooting/
├── featurelist.json            # Roadmap y features
├── VERSION                     # Versión actual
└── docker-compose.prod.yml     # Producción Hetzner
```

---

## 🧪 Testing

```bash
# Backend tests
cd backend && npm run test

# Frontend build
cd frontend && npm run build

# Validación completa (AGENTS.md protocol)
./scripts/init.sh
```

---

## 📝 Documentación

- [Línea de Tiempo y Evolución](docs/timeline.md)
- [Guía de Deploy](docs/guides/DEPLOYMENT.md)
- [Modelo de Suscripción](docs/guides/SUBSCRIPTION_MODEL_DESIGN.md)
- [Odoo Deploy Standardization](docs/guides/odoo-deploy-standardization.md)
- [Troubleshooting](docs/troubleshooting/)
- [Contexto para Agentes](docs/00-contexto-agentes.md)

---

## 🔒 Seguridad

- **NO usar Nginx:** Traefik v3.3 administra SSL y subdominios
- **NO eliminar `tenantId`:** Ambos modos (community/enterprise) dependen de él
- **NO instanciar `PrismaClient` directamente:** Usar `this.prisma` o `@TenantPrisma()`
- **NO condicionar lógica por `ORDERFLOW_MODE`:** Responsabilidad de guards/middleware

---

## 📄 Licencia

Propietario - OrderFlow Team

---

**Última actualización:** 2026-08-13  
**Versión:** 1.20.10
