# OmniFlow SaaS Omnicanal

![Version](https://img.shields.io/badge/version-1.20.38-blue)
![License](https://img.shields.io/badge/license-Proprietary-red)
![NestJS](https://img.shields.io/badge/backend-NestJS-green)
![React](https://img.shields.io/badge/frontend-React-blue)

**OmniFlow** es una plataforma SaaS omnicanal para gestión empresarial integral con arquitectura multi-tenant, facturación electrónica SISET, integraciones nativas con Odoo ERP (v14, v18, v19), catálogo social omnicanal, punto de venta (POS), pantallas de cocina (KDS), manufactura (MRP), compras, tesorería multi-moneda, fuerza de ventas B2B y analítica de negocios (BI).

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
| **Integraciones** | Odoo (v14/v18/v19 CE), Tango ERP, FacturaSend (SIFEN), BCP, Cambios Chaco, DolarApi |

---

## 🚀 Características Principales (v1.20.38)

### Compras & Finanzas Operativas Multi-Moneda (FEAT-104)
- **Órdenes de Compra (OC):** Emisión y congelamiento de tasas de cambio multi-divisa (PYG, USD, BRL, ARS).
- **Recepción Atómica en Kardex:** Recepción de OC con impacto inmediato en el inventario de doble entrada (`executeStockMove`).
- **Cuentas por Pagar (AP):** Generación automática de Facturas de Proveedor (`SupplierBill`) y gestión de pagos parciales/totales.
- **Tesorería & Flujo de Caja:** Movimientos de caja por egresos/ingresos y reporte consolidado (`CashFlow`).

### Dynamic Multi-Currency Engine (FEAT-103)
- **Conversión de Divisas en Tiempo Real:** Cotizaciones dinámicas para PYG, USD, BRL, ARS.
- **Cron Bursátil Automatizado:** Sincronización continua de 07:00 a 18:00 hs (Asunción) con BCP, Cambios Chaco y DolarApi.
- **Caché LRU con TTL de 5 min:** Máximo rendimiento con fallback resiliente en base de datos.

### OmniBI Analytics YoY Standalone (FEAT-100)
- **Analítica Comparativa Año a Año (YoY):** Ingesta histórica vía XML-RPC desde Odoo 14 y consolidación omnicanal.
- **Rentabilidad Omnicanal:** Ingesta de métricas de ventas y margen bruto por tenant.

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
