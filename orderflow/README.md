# OrderFlow SaaS Omnicanal

![Version](https://img.shields.io/badge/version-1.12.0-blue)
![License](https://img.shields.io/badge/license-Proprietary-red)
![NestJS](https://img.shields.io/badge/backend-NestJS-green)
![React](https://img.shields.io/badge/frontend-React-blue)
![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL-blue)

**OrderFlow** es una plataforma SaaS omnicanal para gestión de negocios, con multi-tenancy, facturación electrónica, integraciones ERP, catálogo WhatsApp, punto de venta y fidelización.

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│              Hetzner VPS / Cloudflare (SSL/TLS)              │
│                    Traefik v3.3 Reverse Proxy                │
└──────┬──────────────────────────────────────┬────────────────┘
       │                                      │
       ▼                                      ▼
┌──────────────────┐               ┌──────────────────┐
│   OrderFlow      │               │   Odoo Adapter   │
│   Frontend:3011  │               │   Port:3005      │
│   Backend:3010   │               │                  │
│   DB:5432        │               │                  │
└──────────────────┘               └──────────────────┘
```

### Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| **Backend** | NestJS + TypeScript + Prisma ORM |
| **Frontend** | React + Vite + Ant Design + Refine |
| **Base de Datos** | PostgreSQL (multi-tenant por schema) |
| **Proxy** | Traefik v3.4 (SSL automático, DNS dinámico) |
| **Infraestructura** | Docker Compose en Hetzner VPS |
| **Integraciones** | Odoo, Tango ERP, FacturaSend (SIFEN), Stripe, Mercado Pago |

---

## 🚀 Características Principales

### Contactos Unificados (v1.5.1)
- **Menú único** "Contactos" reemplaza "Usuarios" y "Clientes"
- **Roles múltiples:** Cliente, Proveedor, Usuario, Empleado, Lead
- **Persona o Empresa:** `isCompany` flag con `parentId` para contactos vinculados
- **Campos de empleado:** `jobTitle`, `department`, `employeeNumber`, `hireDate`
- **API unificada:** `/api/v1/contacts` con filtrado por tipo y rol
- **Compatibilidad legacy:** Endpoints `/api/v1/customers` y `/api/v1/users` mantenidos

### Modelo de Suscripción SaaS
- **Planes:** `basic`, `professional`, `enterprise`
- **Suscripciones** por tenant con fecha de inicio/fin
- **Facturas** generadas automáticamente
- **Addons** opcionales por suscripción
- **Webhooks** para Stripe/Mercado Pago

### Multi-Tenancy
- **Shared DB:** Mismo esquema, aislamiento por `tenantId`
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
- **BioLinks:** Linktree-style
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

- [Guía de Deploy](docs/guides/DEPLOYMENT.md)
- [Modelo de Suscripción](docs/guides/SUBSCRIPTION_MODEL_DESIGN.md)
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

**Última actualización:** 2026-08-03  
**Versión:** 1.12.0
