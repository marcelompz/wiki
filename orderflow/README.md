# 🚀 OrderFlow — SaaS Omnicanal Multi-Tenant (v1.5.1 Stable Release)

[![Version](https://img.shields.io/badge/version-v1.5.1-blue.svg)](VERSION)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Deploy](https://img.shields.io/badge/deploy-staging%20%2B%20production-success)](https://github.com/marcelompz/orderflow/actions)
[![Tests Unitarios](https://img.shields.io/badge/tests_unitarios-498_passing-brightgreen.svg)](docs/05-testing-report.md)
[![Tests E2E](https://img.shields.io/badge/tests_e2e_playwright-14_passing-brightgreen.svg)](frontend/e2e/app.spec.ts)
[![Architecture](https://img.shields.io/badge/architecture-Multi--Tenant_Multi--Tier_Microservices-purple.svg)](docs/02-architecture.md)
[![Traefik](https://img.shields.io/badge/proxy-Traefik_v3.3-orange.svg)](/opt/traefik-orderflow)

> **Sistema Multi-Tenant de Gestión de Pedidos, E-commerce, POS & Bookings**
> - **Versión Actual:** `v1.5.1` (Stable Release)
> - **Última Actualización:** 2026-08-01
> - **Estado:** ✅ Comercial Operativo (Staging & Production) | OrderFlow Enterprise Tenant (DB Dedicada), Fixes Frontend/Routing, Multi-Tier Isolation, Microservicios Standalone & QA E2E Suite

Plataforma SaaS omnicanal de ventas de alta velocidad, agnóstica al ERP y multi-rubro (Spa/Wellness, Retail, Automotriz, Gastronomía). Ofrece e-commerce, catálogo interactivo por WhatsApp, Bio-Links, sistema de turnos/bookings, presupuestos con normativa DNIT/SET, sorteos (giveaways), programa de fidelización, punto de venta (POS) offline-first con pantalla de cocina (KDS) en tiempo real mediante WebSockets y arquitectura **Multi-Tier Tenant Isolation** con bases de datos PostgreSQL independientes por tenant Enterprise más microservicios **Standalone** desacoplados.

---

## 📋 Índice

1. [Descripción](#descripción)
2. [Características](#características)
3. [Arquitectura](#arquitectura)
4. [Inicio Rápido](#inicio-rápido)
5. [Documentación](#documentación)
6. [FAQ](#faq)
7. [Licencia](#licencia)

---

## Descripción

**OrderFlow** es una plataforma SaaS multi-tenant que puede funcionar de dos maneras:

1. **Standalone (Independiente):** Como el sistema principal (ERP y E-commerce) del negocio.
2. **Capa Agnóstica (Trojan Horse):** Como un acelerador de operaciones moderno que se conecta a sistemas pre-existentes (ERP, CRM, sistemas en Cbase/SQL) mediante su **Integration Engine**, sin forzar al cliente a reemplazar su sistema central de inmediato.

### Casos de Uso

| Rubro | Caso de Uso | Ejemplo |
|-------|-------------|---------|
| 🌿 **Spa/Wellness** | Venta de productos + reserva de turnos | SPA Wellness |
| 🚗 **Automotriz** | Repuestos y accesorios | Auto Repuestos |
| 🏪 **Retail** | Tienda online multi-categoría | Tiendas de barrio |
| 💊 **Farmacia** | Productos + delivery | Farmacias locales |
| 📦 **Cualquier negocio** | Sistema configurable | Tu negocio |

---

## Características

### Multi-Tenant SaaS
- ✅ Aislamiento de datos por API Key
- ✅ Branding personalizado por tenant
- ✅ Configuración independiente
- ✅ Base de datos compartida con aislamiento lógico
- ✅ **Gestión de tenants desde el Super Admin**: crear, deshabilitar (`active=false`, reversible), habilitar y eliminar directamente desde el dashboard.
- ✅ **Autorización por rol**: el `Super Admin` y los usuarios con rol `ADMIN` (vía `UserTenantAccess`) pueden gestionar los tenants a los que tienen acceso, sin depender del Super Admin en cada acción.
- ✅ **Tienda pública por subdominio**: cada tenant puede exponer su catálogo en `https://<tenant>.pesallaccia.com` (o `https://staging.<tenant>.pesallaccia.com` en staging) con su propio branding, servido automáticamente por Traefik + Cloudflare DNS.

### Super Admin Dashboard
- ✅ Listado de tenants con estado (activo/inactivo), industria y módulos habilitados.
- ✅ Acciones por tenant: Ver Dashboard, Configurar, Deshabilitar/Habilitar y Eliminar (con confirmación irreversible).
- ✅ Health check de servicios (Base de Datos, Integrador Odoo).
- ✅ Creación de tenants con generación y visualización de la API Key.

### E-commerce
- ✅ Catálogo de productos con filtros
- ✅ Carrito de compras persistente
- ✅ Checkout con cliente
- ✅ Múltiples tipos de pago
- ✅ Cálculo automático de rentabilidad

### Gestión de Inventario
- ✅ Descuento automático de stock
- ✅ Control de stock por producto
- ✅ Alertas de stock bajo
- ✅ Costos e impuestos configurables

### Análisis Financiero
- ✅ Costo de compra vs precio de venta
- ✅ Impuestos de compra y venta
- ✅ Ganancia bruta por producto
- ✅ Margen de rentabilidad (%)
- ✅ Dashboard de métricas

### Bookings (Turnos)
- ✅ Reserva de turnos por servicio
- ✅ Asignación de profesionales
- ✅ Asignación de recursos físicos
- ✅ Disponibilidad en tiempo real
- ✅ Buffers entre turnos

### Integration Engine (Omnicanal)
- ✅ Conexión con Odoo como integración base
- ✅ Addon nativo Odoo (`odoo-addons/orderflow_integration`) para sincronizar cambios desde Odoo hacia OrderFlow
- ✅ Clientes: alta/modificación en Odoo → OrderFlow
- ✅ Productos: alta/modificación en Odoo → OrderFlow
- ✅ Ventas: confirmación de pedido en Odoo → OrderFlow
- ✅ Diseño extensible por webhook/eventos para sumar más flujos sin hardcodear
- ⏳ MIDA / SAP: próxima extensión sobre la misma base

### 🏪 Punto de Venta (POS)
- ✅ Modo Mozo (agregar ítems a mesas activas)
- ✅ Modo Caja (cobro centralizado)
- ✅ Diseño offline-first (Dexie.js + Zustand sync queue)
- ✅ Búsqueda rápida de productos y categorías
- ✅ Integración con KDS en tiempo real

### 🍳 Pantalla de Cocina (KDS)
- ✅ WebSockets en tiempo real (Socket.io)
- ✅ Aislamiento por tenant (salas `tenant:<id>`)
- ✅ Semáforo de criticidad (verde/amarillo/rojo)
- ✅ Transición de estados: CONFIRMED → PREPARING → READY → DELIVERED

### 🎖️ Fidelización (Loyalty)
- ✅ Motor de acumulación automática de puntos en checkout
- ✅ Sistema de tiers: BRONZE → SILVER → GOLD → PLATINUM
- ✅ Canje de puntos con validación de saldo
- ✅ Auto-generación de tarjetas con código de barras único
- ✅ Panel de administración con reglas configurables por tenant

### 📱 App Móvil (React Native + Expo)
- ✅ App del Cliente: Catálogo, carrito, checkout, historial
- ✅ App de Administración: Dashboard, pedidos, productos, clientes
- ✅ Multi-tenant con autenticación segura
- ✅ Persistencia local con SecureStore

### ⚡ Bio-Links Transaccionales (Linktree 0% Comisión)
- ✅ **In-Bio Fast Checkout:** Los clientes compran productos o agendan turnos desde un *Drawer* flotante móvil dentro del propio navegador in-app de Instagram, TikTok o WhatsApp sin ser redirigidos.
- ✅ **0% de Comisión de Plataforma:** A diferencia de soluciones como Linktree (que cobra entre 12% y 9% de comisión por venta), OrderFlow ofrece 0% de comisión nativa en todos los planes.
- ✅ **Sincronización Operacional Instantánea:** Toda orden originada en la bio impacta en tiempo real el inventario y envía la comanda al POS y KDS vía WebSockets.
- ✅ **Live Preview Editor:** Panel administrativo en Refine.dev (`/admin/biolinks`) con previsualizador móvil (*smartphone mockup*) en tiempo real y gestor *Drag & Drop* de bloques (Productos, Reservas, Sorteos, Enlaces).
- ✅ **Tracking & Píxeles:** Inyección automática de píxeles de conversión de Meta (Facebook), Google Analytics (GA4) y TikTok.
- ✅ **Subdominios y CNAME:** Funciona en `orderflow.app/bio/:slug` o bajo dominio personalizado (`links.tu-marca.com`) con SSL dinámico en Cloudflare.

### 🖥️ Desktop POS (Tauri)
- ✅ Wrapper nativo del POS web con Tauri
- ✅ Impresión ESC/POS por dispositivo USB
- ✅ Shortcuts globales de teclado
- ✅ Control de ventana nativo (fullscreen, always-on-top)

### 🌐 Traefik Edge Gateway Subsystem (`/srv/traefik`)
- ✅ **Enrutamiento Perimetral Exclusivo:** Sustituto integral de Nginx. Traefik v3.3 actúa como la única puerta de entrada HTTP/HTTPS en los puertos 80 y 443 del servidor.
- ✅ **Certificados SSL Automáticos:** Gestión nativa de Let's Encrypt con desafío DNS-01 automatizado vía Cloudflare API.
- ✅ **Enrutamiento Dinámico Multi-Tenant:** Enruta tráfico por nombre de host e inspección de rutas hacia `orderflow-frontend-prod`, `orderflow-backend-prod` y subdominios dinámicos de tenants (`*.pesallaccia.com`).
- ✅ **Repositorio Integrado:** Controlado mediante el repositorio oficial [traefik-orderflow](https://github.com/marcelompz/traefik-orderflow.git) (ubicado localmente en `/opt/traefik-orderflow/` y en el VPS en `/srv/traefik/`).


---

## Arquitectura

### Stack Tecnológico

| Componente | Tecnologías |
|------------|-------------|
| **Backend** | NestJS 10, Prisma, PostgreSQL 15, JWT |
| **Frontend Web** | React 18, Refine.dev, Ant Design 5 (Servidor estático Node.js `serve`) |
| **Mobile App** | React Native, Expo, Zustand |
| **Desktop POS** | Tauri, Rust, ESC/POS |
| **Edge Proxy & SSL Gateway** | Traefik v3.3 (Certificados Let's Encrypt automáticos, DNS-01 Cloudflare) |
| **Subsistema Gateway** | [traefik-orderflow](https://github.com/marcelompz/traefik-orderflow.git) (`/srv/traefik`) |
| **DevOps** | Docker Compose, GitHub Actions, SSH Deploy |
| **Auth** | JWT (access + refresh tokens) + Master API Key |

### Multi-Tenant Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│              Traefik v3.3 Edge Gateway Subsystem                  │
│        (github.com/marcelompz/traefik-orderflow.git /srv/traefik) │
│            Ports 80/443 - SSL LetsEncrypt / Cloudflare            │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                     OrderFlow SaaS Platform                       │
│                     orderflow.pesallaccia.com                     │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │    Tenant A      │  │    Tenant B      │  │    Tenant C     │ │
│  │  SPA Wellness    │  │  Auto Repuestos  │  │  Provecchio     │ │
│  │  API Key: xxx    │  │  API Key: yyy    │  │  API Key: zzz   │ │
│  └──────────────────┘  └──────────────────┘  └─────────────────┘ │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                     PostgreSQL Database                      │ │
│  │  - Tenants (config, branding)                                │ │
│  │  - Products (tenant_id)                                      │ │
│  │  - Orders (tenant_id)                                        │ │
│  │  - Customers (tenant_id)                                     │ │
│  │  - Bookings (tenant_id)                                      │ │
│  │  - BioLinks (tenant_id)                                      │ │
│  └──────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

Ver [Arquitectura Completa](docs/02-architecture.md) para más detalles.

---

## Inicio Rápido

### 1. Iniciar el entorno de desarrollo

```bash
cd /opt/orderflow
docker compose up -d
```

### 2. Crear tu primer tenant

```bash
curl -X POST http://localhost:3010/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mi Empresa S.A.",
    "webhookOrderConfirmedUrl": "https://mi-erp.com/webhook"
  }'
```

### 3. Configurar el frontend

```bash
cd frontend
cp .env.example .env
# Editar .env y agregar VITE_API_KEY=tu-api-key
```

### 4. Acceder al sistema

- **Frontend:** http://localhost:3011
- **Backend API:** http://localhost:3010
- **Documentación API:** http://localhost:3010/api

Ver [Guía de Inicio Rápido](docs/01-quickstart.md) para instrucciones completas.

## 🧪 Testing

### Unit / Integration (426 tests passing)
- Backend: `cd backend && npm run test`
- Frontend: `cd frontend && npm run test`

### E2E (Playwright - 14 tests passing)
- `cd frontend && npm run test:e2e`
- Suite: páginas públicas, auth guards admin, checkout, POS, KDS y Bio-Links.

### Carga (k6)
- Smoke API & Productos: `scripts/k6-load-test.js`
- Smoke BioLinks público: `scripts/k6-biolinks-smoke.js`
- Resultado baseline backend dev: P95 ~15ms

Ver [docs/TESTING_E2E.md](docs/TESTING_E2E.md) para configuración avanzada.

---

## Documentación

La documentación está organizada en la carpeta `docs/`:

| Documento | Descripción |
|-----------|-------------|
| [🚀 Inicio Rápido](docs/01-quickstart.md) | Guía paso a paso para comenzar |
| [🏗️ Arquitectura](docs/02-architecture.md) | Arquitectura del sistema y diseño |
| [🏢 Multi-Tenant Demo](docs/03-multi-tenant-demo.md) | Demo de tenants configurados |
| [🔐 JWT Auth](docs/04-jwt-auth.md) | Autenticación y autorización |
| [📊 Testing Report](docs/05-testing-report.md) | Reporte de testing completo |
| [🏪 POS & KDS Integration](docs/06-pos-kds.md) | Integración de Punto de Venta y Pantalla de Cocina en tiempo real |
| [📊 UML Diagrams](docs/07-uml-diagrams.md) | Documentación UML completa (MER, Casos de Uso, Flujogramas) |
| [🎖️ Loyalty Module](docs/08-loyalty.md) | Motor de Fidelización y Acumulación de Puntos (Fase 1) |
| [⚡ Bio-Links Transaccionales](docs/BioLinks.md) | Módulo Bio-Links (Linktree 0% comisión, In-Bio Fast Checkout, Píxeles) |
| [🔌 Integración Odoo 19 CE](docs/ODOO_INTEGRATION_GUIDE.md) | Guía del conector orderflow_connector v19.0.2.0.0 (Sincronización Push/Pull e Importador de Datos) |
| [📱 Mobile App](mobile/README.md) | Guía de la app móvil |
| [🧪 Testing Scripts](docs/TESTING_SCRIPTS.md) | Scripts de test automatizados |
| [🧪 E2E & Load Testing](docs/TESTING_E2E.md) | Playwright, backend E2E y k6 |
| [📈 Planes Comerciales](docs/PLANES_COMERCIALES.md) | Planes y pricing del SaaS Omnicanal |
| [📘 Guía Comercial & Configuración Standalone](docs/GUIA_COMERCIAL_Y_CONFIGURACION_STANDALONE.md) | Manual de venta, pricing y setup de la suite de 6 Microservicios Standalone |
| [📚 Manuales de Usuario Operativos](docs/user-manuals/README.md) | Colección de manuales paso a paso por módulo (Diseñador, POS, KDS, Turnos, Catálogo WhatsApp, Fidelización) |
| [🔌 CI/CD Strategy](docs/CI_CD_TESTING_STRATEGY.md) | Estrategia de CI/CD |

---

## 🛠️ Troubleshooting & Diagnóstico de Errores

Para la resolución de incidencias técnicas y configuraciones avanzadas, consultá el índice centralizado en [`docs/troubleshooting/README.md`](docs/troubleshooting/README.md) y las guías específicas:

* **[🛠️ Enrutamiento Traefik & Caché SPA](docs/troubleshooting/01-traefik-routing-and-spa-cache.md):** Guía de resolución de problemas en Traefik v3.3, reglas de proxy inverso y limpieza de caché SPA.
* **[📦 Manifiestos Docker & SSL](docs/troubleshooting/02-production-docker-manifests-and-ssl-redirects.md):** Diagnóstico de App Store vacía, redirecciones HTTPS y configuración Cloudflare.
* **[🔌 Sincronización Odoo & Módulos Tenant](docs/troubleshooting/03-odoo-user-sync-and-tenant-modules-management.md):** Diagnóstico técnico de sincronización de usuarios Odoo 19 CE, módulo conector webhooks y gestión multi-tenant de módulos.
* **[🔑 Autenticación PostgreSQL (P1000) & Redis Fallback](docs/troubleshooting/04-prisma-p1000-db-auth-and-redis-fallback.md):** Diagnóstico y solución de rotación de credenciales PostgreSQL (`ALTER USER`), recuperación del error Prisma P1000 y prevención de caídas por autenticación Redis.
* **[🛒 WhatsApp Catalog: Instalación y Auth por API Key](docs/troubleshooting/05-whatsapp-catalog-install-and-api-key-auth.md):** Diagnóstico de bloqueos 404/403 al instalar el módulo WhatsApp Catalog y actualizar su configuración.
* **[🗄️ Nombres de Columnas camelCase en PostgreSQL](docs/troubleshooting/06-postgresql-camelcase-column-names.md):** Guía para evitar errores de sintaxis al ejecutar SQL directo contra Prisma ORM.

### Otras carpetas

- `backend/` - Backend NestJS con Prisma
- `frontend/` - Frontend React con Refine.dev
- `mobile/` - App móvil React Native + Expo
- `docs/` - Documentación técnica completa

---

## FAQ

### ¿Qué es OrderFlow?

OrderFlow es un sistema SaaS multi-tenant que te permite tener tu propia aplicación móvil y web para vender productos, sin desarrollar una app desde cero.

### ¿Qué es una API Key?

Tu API Key es tu espacio digital propio en la plataforma OrderFlow. Es como tener tu propio local en un centro comercial: tu branding, tus productos, tus clientes, tus datos 100% privados.

### ¿Cuánto cuesta?

| Plan | Precio | Ideal para |
|------|--------|------------|
| Startup | USD 29/mes | Emprendedores |
| Professional ⭐ | USD 79/mes | Negocios en crecimiento |
| Enterprise | USD 199/mes | Empresas establecidas |

**14 días de prueba gratis. Sin tarjeta de crédito.**

Ver [FAQ Completo](FAQ.md) para más preguntas frecuentes.

---

## Licencia

MIT License - Ver archivo [LICENSE](LICENSE) para más detalles.

---

## Repositorios del Proyecto OrderFlow

- **OrderFlow Core Platform:** https://github.com/marcelompz/orderflow.git
- **Traefik Edge Gateway Subsystem:** https://github.com/marcelompz/traefik-orderflow.git (`/srv/traefik` / `/opt/traefik-orderflow/`)

---

## Contacto

- **Email:** marcelo@pesallaccia.com
- **Teléfono:** +595 991 859105
- **Ubicación:** Ciudad del Este, Paraguay

---

**OrderFlow SaaS Platform** - High-Speed Omni-System

© 2026 OrderFlow. Todos los derechos reservados.

---

## 🚀 Deploy y Ambientes

### Ambientes Disponibles

| Ambiente | Host SSH | Ruta Remota | URL | Env File | Estado |
|----------|----------|-------------|-----|----------|--------|
| **Staging** | `hetzner-orderflow` (root@178.105.226.175) | `/srv/orderflow-staging` | `https://staging.pesallaccia.com` | `.env.staging` | ✅ Operativo |
| **Production** | `hetzner-orderflow` (root@178.105.226.175) | `/srv/orderflow` | `https://orderflow.pesallaccia.com` / `https://pesallaccia.com` | `.env.production` | ✅ Operativo |
| **Provecchio** | `hetzner-orderflow` (root@178.105.226.175) | `/srv/orderflow` | `https://provecchio.com` | `.env.prod` | ✅ Operativo |

### Requisitos Previos

- Ejecutar los scripts desde una máquina que tenga configuradas las **claves SSH locales** para acceder al servidor Hetzner (`hetzner-orderflow` / `root@178.105.226.175`).
- No es necesariologuearse manualmente; los scripts usan `ssh <host>` con la identidad configurada en `~/.ssh/`.
- Asegurarse de tener acceso de lectura/escritura a la ruta remota indicada (`/srv/orderflow` o `/srv/orderflow-staging`).

### Scripts de Deploy

```bash
 ./scripts/deploy-staging.sh
 ./scripts/deploy-production.sh production
 ./scripts/deploy-production.sh provecchio
 ./scripts/rollback-deploy.sh <env> <rollback-env-file>
```

- **Staging:** deploya sobre `/srv/orderflow-staging` usando `.env.staging` y la rama `staging`.
- **Production:** deploya sobre `/srv/orderflow` usando `.env.production` y la rama `main`.
- **Provecchio:** deploya sobre `/srv/orderflow` usando `.env.prod` y la rama `main`.

Los deploys se ejecutan remotamente por SSH, realizan backup de BD, build de imágenes, migraciones de Prisma, health checks y recarga de Traefik v3.3.

### Variables de Entorno

**`.env.staging`:**
```bash
VITE_API_URL=/api
VITE_APP_NAME=OrderFlow Staging
VITE_GOOGLE_CLIENT_ID=...
VITE_ENVIRONMENT=staging
VITE_DEBUG=true
```

**`.env.production`:**
```bash
VITE_API_URL=/api
VITE_APP_NAME=OrderFlow
VITE_GOOGLE_CLIENT_ID=...
VITE_ENVIRONMENT=production
VITE_DEBUG=false
```

**`.env.prod`:**
```bash
VITE_API_URL=/api
VITE_APP_NAME=OrderFlow
VITE_GOOGLE_CLIENT_ID=...
VITE_ENVIRONMENT=production
VITE_DEBUG=false
```

### Estructura Remota

```text
/srv/orderflow/
  ├── docker-compose.prod.yml
  ├── .env.production
  ├── .env.prod
  ├── backups/
  └── ...

/srv/orderflow-staging/
  ├── docker-compose.yml
  ├── .env.staging
  ├── backups/
  └── ...
```

### CI/CD con GitHub Actions

- **Push a `staging`** → Build y deploy a staging
- **Push a `main`** → Build y deploy a producción y provecchio

### Limpieza de Configuración Obsoleta

Las configuraciones legacy de NGINX/edge-proxy que fueron reemplazadas por Traefik v3.3 se encuentran en `old/`. Este directorio está excluido de `.gitignore` y se mantiene solo como referencia histórica.

**Política de retención:** `old/` se eliminará permanentemente cuando se cumpla **uno** de estos hitos:
1. Deploy de **v1.2.0** en producción con todos los módulos estables.
2. Próxima auditoría de producción programada (**2026-09-22**).
3. Finalización de la **Fase 1 del plan de maduración** (80% cobertura de tests).

No referenciar archivos de `old/` en configuraciones activas.

---

## 📦 Docker Compose

### Producción

El frontend en producción usa build estático con `serve`:

```yaml
frontend:
  environment:
    NODE_ENV: production
    VITE_API_URL: /api
  command: sh -c "npm install && npm run build && npx -y serve dist -l 80"
```

**Puertos:**
- Frontend: `3011` (produce build en puerto 80 del container)
- Backend: `3010`
- Database: `5433` (mapeado a 5432 interno)

---
