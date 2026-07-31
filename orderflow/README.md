# 🚀 OrderFlow — Documentación Oficial Wiki (v1.1.7 Stable Release)

![OrderFlow Isotipo](../images/orderflow-isotipo.png){width="150"}

[![Version](https://img.shields.io/badge/version-v1.1.7-blue.svg)](VERSION)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Deploy](https://img.shields.io/badge/deploy-staging%20%2B%20production-success)](https://github.com/marcelompz/orderflow/actions)
[![Tests Unitarios](https://img.shields.io/badge/tests_unitarios-389_passing-brightgreen.svg)](docs/05-testing-report.md)
[![Architecture](https://img.shields.io/badge/architecture-Multi--Tenant_Multi--Tier_Microservices-purple.svg)](docs/02-architecture.md)

> **Sistema Multi-Tenant de Gestión de Pedidos, E-commerce, POS & Bookings**
> - **Versión Actual:** `v1.1.7` (Stable Release)
> - **Última Actualización:** 2026-07-30
> - **Estado:** ✅ Comercial Operativo (Staging & Production) | Multi-Tier Isolation (100%), Trío de Microservicios Standalone, Billing SaaS Engine & QA E2E Suite

Plataforma SaaS omnicanal de ventas de alta velocidad, agnóstica al ERP y multi-rubro (Spa/Wellness, Retail, Automotriz, Gastronomía). Ofrece e-commerce, catálogo interactivo por WhatsApp, Bio-Links, sistema de turnos/bookings, presupuestos con normativa DNIT/SET, sorteos (giveaways), programa de fidelización, punto de venta (POS) offline-first con pantalla de cocina (KDS) en tiempo real mediante WebSockets y arquitectura **Multi-Tier Tenant Isolation** con bases de datos PostgreSQL independientes por tenant Enterprise más microservicios **Standalone** desacoplados.

---

## 📋 Índice General de la Wiki

1. [🏗️ Arquitectura Técnica](#️-arquitectura-técnica)
2. [📖 Guías por Rol](#-guías-por-rol)
3. [🚀 Características Principales](#-características-principales)
4. [🛠️ Módulos & Microservicios Standalone](#️-módulos--microservicios-standalone)
5. [🌐 Deploy, Entornos & DevOps](#-deploy-entornos--devops)
6. [❓ Preguntas Frecuentes (FAQ)](#-preguntas-frecuentes-faq)

---

## 🏗️ Arquitectura & Guías Técnicas

### Documentos Maestros en la Wiki:
- [**🚀 Inicio Rápido (01-quickstart.md)**](./01-quickstart.md) - Pasos para levantar el entorno de desarrollo y crear tenants.
- [**🏗️ Arquitectura Técnica (02-architecture.md)**](./02-architecture.md) - Modelos de datos, persistencia PostgreSQL 15, Redis 7 y Traefik v3.3.
- [**🏢 Multi-Tenant Demo (03-multi-tenant-demo.md)**](./03-multi-tenant-demo.md) - Aislamiento por API Key y branding dinámico.
- [**🔐 Autenticación JWT (04-jwt-auth.md)**](./04-jwt-auth.md) - Flujo de tokens, refresh tokens y roles de usuario.
- [**📊 Testing Report (05-testing-report.md)**](./05-testing-report.md) - Cobertura de 353 unit tests y 14 tests E2E Playwright.
- [**🏪 POS & KDS (06-pos-kds.md)**](./06-pos-kds.md) - Punto de Venta offline-first y Pantalla de Cocina WebSockets.
- [**📊 Diagramas UML (07-uml-diagrams.md)**](./07-uml-diagrams.md) - MER, flujogramas y casos de uso.
- [**🎖️ Loyalty Module (08-loyalty.md)**](./08-loyalty.md) - Motor de fidelización, reglas de puntos y tarjetas.
- [**📊 Observabilidad (09-observability.md)**](./09-observability.md) - Métricas Prometheus, logs Winston y Sentry.
- [**💎 Multi-Tier & Microservicios (10-multi-tier-and-microservices.md)**](./10-multi-tier-and-microservices.md) - Aislamiento `@TenantPrisma()` y trío de microservicios standalone.
- [**📊 Informe de Madurez (INFORME_MADUREZ_ORDERFLOW.md)**](./INFORME_MADUREZ_ORDERFLOW.md) - Evaluación técnica (9.7/10).
- [**Arquitectura Modular**](./arquitectura-modular.md) - Módulos, App Store y extensiones.
- [**Estrategia de Versionamiento**](./versionamiento.md) - Git Flow, releases y changelog.
- [**Configuración de Tenant**](./configurar-tenant.md) - Branding, subdominios personalizados y tier de BD.
- [**Guía de Administración**](./guia-admin.md) - Gestión de usuarios, roles RBAC y configuración.
- [**Guía de Vendedores**](./guia-vendedores.md) - Operación diaria de pedidos y clientes.
- [**Preguntas Frecuentes (FAQ)**](./faq.md) - FAQ técnico y comercial.

---

## 🚀 Características Principales

### Multi-Tenant SaaS & Multi-Tier Isolation
- ✅ Aislamiento de datos por `tenantId` y API Key.
- ✅ Branding y subdominios personalizados (`https://<tenant>.pesallaccia.com`).
- ✅ **Aislamiento Multi-Tier 100% dinámico:** Soporta tenants en base de datos compartida (`Shared`) y bases de datos PostgreSQL dedicadas para clientes Enterprise (`Dedicated`) mediante `@TenantPrisma()`.
- ✅ **Gestión completa desde el Super Admin:** Crear, deshabilitar (`active=false`, reversible), habilitar y eliminar tenants con confirmación de seguridad.

### Super Admin Dashboard
- ✅ Listado de tenants con estado, tier de BD, consumo mensual y módulos habilitados.
- ✅ Acciones directas por tenant: Promover a DB Dedicada, Configurar Branding, Deshabilitar/Habilitar.
- ✅ Health checks automáticos de DB y conectores externos.

### E-commerce & Bio-Links Transaccionales
- ✅ Catálogo de productos con filtros en tiempo real y búsqueda multi-campo.
- ✅ Carrito de compras persistente con checkout omnicanal.
- ✅ **Bio-Links (Linktree 0% comisión):** In-Bio Fast Checkout en *Drawer* flotante sin salir de Instagram/TikTok/WhatsApp.

### Punto de Venta (POS) & Pantalla de Cocina (KDS)
- ✅ **POS Offline-First:** Modo Mozo y Modo Caja con sincronización Dexie.js + Zustand.
- ✅ **KDS en Tiempo Real:** Comunicación bidireccional vía WebSockets Socket.io canalizados por tenant (`tenant:<id>`) con soporte de escalado horizontal vía Redis PubSub.

### Bookings (Turnos) & Presupuestos DNIT
- ✅ Agenda multi-servicio y asignación de recursos/profesionales con buffers de tiempo.
- ✅ Presupuestos/Cotizaciones normativos vigentes DNIT/SET Paraguay.

---

## 🛠️ Módulos & Microservicios Standalone

OrderFlow cuenta con una arquitectura híbrida que permite ejecutar módulos dentro del monolito o extraerlos como **microservicios Standalone independientes**:

| Microservicio | Puerto | Descripción | Librería Auth |
|---|:---:|---|---|
| **`giveaways-standalone`** | `3020` | Motor de Sorteos y Campañas Virales | `@orderflow/auth-shared` |
| **`whatsapp-catalog-standalone`** | `3021` | Catálogo E-commerce transaccional por WhatsApp | `@orderflow/auth-shared` |
| **`biolinks-standalone`** | `3022` | Bio-Links (0% Comisión + In-Bio Fast Checkout) | `@orderflow/auth-shared` |

---

## 🌐 Deploy, Entornos & DevOps

### Stack Tecnológico
- **Backend:** NestJS 10, Prisma, PostgreSQL 15, Redis 7, JWT + API Keys.
- **Frontend Web:** React 18, Refine.dev, Ant Design 5.
- **Proxy Perimetral:** Traefik v3.3 con certificados automáticos Let's Encrypt y DNS-01 Cloudflare API (`/srv/traefik`).

### Entornos
| Entorno | URL | Branch | Descripción |
|---|---|---|---|
| **Staging** | `https://staging.provecchio.com` | `main` | Entorno de validación previa |
| **Production** | `https://provecchio.com` | `main` | Entorno productivo principal SaaS |
| **Provecchio** | Servidor físico | `provecchio` | Producción legacy congelada |

---

## ❓ Preguntas Frecuentes (FAQ)

Consulte nuestra sección completa de preguntas y respuestas en el archivo **[faq.md](./faq.md)** o la versión en inglés en **[README.en.md](./README.en.md)**.
