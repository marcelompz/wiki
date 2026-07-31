# 🚀 OrderFlow — Official Wiki Documentation (v1.1.7 Stable Release)

![OrderFlow Isotipo](../images/orderflow-isotipo.png){width="150"}

[![Version](https://img.shields.io/badge/version-v1.1.7-blue.svg)](VERSION)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Deploy](https://img.shields.io/badge/deploy-staging%20%2B%20production-success)](https://github.com/marcelompz/orderflow/actions)
[![Unit Tests](https://img.shields.io/badge/unit_tests-389_passing-brightgreen.svg)](docs/05-testing-report.md)
[![Architecture](https://img.shields.io/badge/architecture-Multi--Tenant_Multi--Tier_Microservices-purple.svg)](docs/02-architecture.md)

> **Multi-tenant Order Management, E-commerce, POS & Bookings System**
> - **Current Version:** `v1.1.7` (Stable Release)
> - **Last Update:** 2026-07-30
> - **Status:** ✅ Commercial Operational (Staging & Production) | Multi-Tier Isolation (100%), Standalone Microservices Trio, Billing SaaS Engine & QA E2E Suite

Omnichannel high-speed sales SaaS platform, ERP-agnostic and multi-industry (Spa/Wellness, Retail, Automotive, Gastronomy). Features e-commerce, interactive WhatsApp catalog, Bio-Links, bookings/appointments system, quotations with DNIT/SET regulations, giveaways, loyalty program, offline-first Point of Sale (POS) with real-time Kitchen Display System (KDS) via WebSockets, **Multi-Tier Tenant Isolation** architecture with independent PostgreSQL databases for Enterprise tenants, and decoupled **Standalone** microservices.

---

## 📋 General Wiki Index

1. [🏗️ Technical Architecture](#️-technical-architecture)
2. [📖 Role-Based Guides](#-role-based-guides)
3. [🚀 Key Features](#-key-features)
4. [🛠️ Modules & Standalone Microservices](#️-modules--standalone-microservices)
5. [🌐 Deploy, Environments & DevOps](#-deploy-environments--devops)
6. [❓ Frequently Asked Questions (FAQ)](#-frequently-asked-questions-faq)

---

## 🏗️ Technical Architecture & Guides

### Master Wiki Documents:
- [**🚀 Quickstart (01-quickstart.md)**](./01-quickstart.md) - Development environment setup and tenant creation.
- [**🏗️ Technical Architecture (02-architecture.md)**](./02-architecture.md) - Data models, PostgreSQL 15, Redis 7, and Traefik v3.3.
- [**🏢 Multi-Tenant Demo (03-multi-tenant-demo.md)**](./03-multi-tenant-demo.md) - API Key isolation and dynamic branding.
- [**🔐 JWT Authentication (04-jwt-auth.md)**](./04-jwt-auth.md) - Token flow, refresh tokens, and RBAC roles.
- [**📊 Testing Report (05-testing-report.md)**](./05-testing-report.md) - 353 unit tests passing and 14 E2E Playwright tests.
- [**🏪 POS & KDS (06-pos-kds.md)**](./06-pos-kds.md) - Offline-first Point of Sale & WebSockets Kitchen Display.
- [**📊 UML Diagrams (07-uml-diagrams.md)**](./07-uml-diagrams.md) - ERD, flowcharts, and use cases.
- [**🎖️ Loyalty Module (08-loyalty.md)**](./08-loyalty.md) - Loyalty engine, point rules, and cards.
- [**📊 Observability (09-observability.md)**](./09-observability.md) - Prometheus metrics, Winston logs, and Sentry.
- [**💎 Multi-Tier & Microservices (10-multi-tier-and-microservices.md)**](./10-multi-tier-and-microservices.md) - `@TenantPrisma()` isolation and standalone trio.
- [**📊 Maturity Report (INFORME_MADUREZ_ORDERFLOW.md)**](./INFORME_MADUREZ_ORDERFLOW.md) - Technical evaluation (9.7/10).
- [**Modular Architecture**](./arquitectura-modular.md) - Modules, App Store, and extensions.
- [**Versioning Strategy**](./versionamiento.md) - Git Flow, releases, and changelog.
- [**Tenant Configuration**](./configurar-tenant.md) - Branding, custom subdomains, and DB tier.
- [**Administrator Guide**](./guia-admin.md) - User management, RBAC roles, and setup.
- [**Sellers Guide**](./guia-vendedores.md) - Daily operation of orders and customers.
- [**FAQ**](./faq.md) - Technical and commercial FAQ.

---

## 🚀 Key Features

### Multi-Tenant SaaS & Multi-Tier Isolation
- ✅ Data isolation per `tenantId` and API Key.
- ✅ Custom branding and subdomains (`https://<tenant>.pesallaccia.com`).
- ✅ **100% Dynamic Multi-Tier Isolation:** Supports shared database tenants (`Shared`) and dedicated PostgreSQL databases for Enterprise clients (`Dedicated`) using `@TenantPrisma()`.
- ✅ **Super Admin Management:** Create, disable (`active=false`, reversible), enable, and delete tenants with safety confirmations.

### Super Admin Dashboard
- ✅ Tenant list with status, DB tier, monthly consumption, and enabled modules.
- ✅ Direct tenant actions: Promote to Dedicated DB, Configure Branding, Disable/Enable.
- ✅ Automated health checks for DB and external connectors.

### E-commerce & Transactional Bio-Links
- ✅ Product catalog with real-time filters and multi-field search.
- ✅ Persistent shopping cart with omnichannel checkout.
- ✅ **Bio-Links (Linktree 0% Fee):** In-Bio Fast Checkout in floating mobile *Drawer* without leaving Instagram/TikTok/WhatsApp.

### Point of Sale (POS) & Kitchen Display System (KDS)
- ✅ **Offline-First POS:** Waiter Mode and Cashier Mode with Dexie.js + Zustand sync.
- ✅ **Real-Time KDS:** Bidirectional Socket.io WebSockets isolated per tenant (`tenant:<id>`) with Redis PubSub horizontal scaling.

---

## 🛠️ Modules & Standalone Microservices

OrderFlow features a hybrid architecture allowing modules to run inside the monolith or as **independent Standalone microservices**:

| Microservice | Port | Description | Auth Library |
|---|:---:|---|---|
| **`giveaways-standalone`** | `3020` | Giveaways & Viral Campaigns Engine | `@orderflow/auth-shared` |
| **`whatsapp-catalog-standalone`** | `3021` | Transactional WhatsApp E-commerce Catalog | `@orderflow/auth-shared` |
| **`biolinks-standalone`** | `3022` | Bio-Links (0% Fee + In-Bio Fast Checkout) | `@orderflow/auth-shared` |

---

## 🌐 Deploy, Environments & DevOps

### Tech Stack
- **Backend:** NestJS 10, Prisma, PostgreSQL 15, Redis 7, JWT + API Keys.
- **Frontend Web:** React 18, Refine.dev, Ant Design 5.
- **Edge Proxy:** Traefik v3.3 with automatic Let's Encrypt certificates and Cloudflare DNS-01 API (`/srv/traefik`).

### Environments
| Environment | URL | Branch | Description |
|---|---|---|---|
| **Staging** | `https://staging.provecchio.com` | `main` | Pre-production validation environment |
| **Production** | `https://provecchio.com` | `main` | Primary SaaS production environment |
| **Provecchio** | Physical Server | `provecchio` | Frozen legacy production |

---

## ❓ Frequently Asked Questions (FAQ)

Check out our full Q&A section in [faq.md](./faq.md) or [README.md](./README.md).
