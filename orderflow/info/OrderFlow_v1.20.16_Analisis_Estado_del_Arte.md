# 🛡️ OrderFlow / OmniFlow v1.20.16 — Informe del Estado del Arte y Evaluación Técnica

> **Documento de Contexto Técnico Vivo & Análisis de Madurez**  
> **Fecha:** 2026-08-22  
> **Versión Core:** `v1.20.16`  
> **Marca Comercial:** OmniFlow | **Nombre Técnico:** OrderFlow  
> **Índice de Madurez:** 9.8 / 10  

---

## 1. 📊 Resumen Ejecutivo y Panorama General

El ecosistema **OmniFlow (OrderFlow)** se encuentra en su fase de máxima madurez operativa, habiendo completado con éxito la transición desde un monolito SaaS multi-tenant inicial hacia una **plataforma SaaS omnicanal modular de alta disponibilidad, con suite de microservicios standalone desacoplados, inteligencia analítica avanzada (OmniBI & OmniPulse) y gestión documental integrada.**

La plataforma atiende en producción a tenants en modo `community` (DB compartida multi-tier) y clientes `enterprise` (DB dedicada), sirviendo múltiples verticales de negocio (retail, gastronomía, spa/wellness, servicios y comercio social).

```mermaid
graph TD
    Client[Cliente / Navegador] -->|HTTPS / WSS| Traefik[Traefik v3.4 Proxy Gateway]
    Traefik --> Core[OrderFlow OmniCore NestJS :3010]
    Traefik --> MultiTierDB[(PostgreSQL 15 Shared / Dedicated DBs)]
    Traefik --> Standalone[Suite Microservicios Standalone :3020-3025]
    Traefik --> Collabora[Collabora Online CODE WOPI Viewer]
    Core --> Redis[(Redis Pub/Sub & BullMQ)]
    Core --> Odoo[Odoo 19 CE / Odoo 14 Adapter]
```

---

## 2. 🌐 Arquitectura de Infraestructura & Proxy Perimetral

* **Traefik v3.4 Exclusivo:** Sustituyó completamente a Nginx como único reverse proxy del ecosistema. Administra rutas dinámicas, SSL automático vía Let's Encrypt (desafío Cloudflare DNS-01) y enrutamiento por subdominio.
* **Estándar de Subdominios por Tenant:** Todo servicio y módulo expuesto responde al subdominio único del tenant (`<tenant.subdomain>.<ROOT_DOMAIN>`). Queda prohibida la creación de subdominios por categoría o servicio.
* **Separación Estricta de Entornos:**
  * `production` (Hetzner VPS) — Entorno principal multi-tenant.
  * `staging` (`staging.pesallaccia.com`) — Entorno de pruebas pre-deploy.
  * `provecchio` (`provecchio.com`) — Instancia física in-house con Traefik aislado en `/srv/traefik`.

---

## 3. 🏢 Dominio Core y Modelo Multi-Tenant / Multi-Tier

* **`tenantId` Inviolable:** Todas las entidades y consultas de negocio mantienen aislamiento estricto por `tenantId`.
* **Multi-Tier Isolation (`isolationTier`):**
  * `shared`: Instancia multi-tenant en base de datos común (`PrismaService` singleton).
  * `dedicated`: Base de datos aislada para clientes Enterprise, gestionada dinámicamente mediante `TenantConnectionManager` y el decorador `@TenantPrisma()`.
* **Modo de Operación (`ORDERFLOW_MODE`):** Soporta `community` (multi-tenant con `ApiKeyGuard`) y `enterprise` (single-tenant con `ENTERPRISE_TENANT_ID` inyectado), utilizando exactamente el mismo esquema de base de datos y servicios de negocio.

---

## 4. 🧩 Suite de Microservicios Standalone

La arquitectura cuenta con **6 microservicios standalone production-ready**, orquestados de forma independiente y comercializables por separado:

1. **`giveaways-standalone` (`:3020` / `sorteos.*`):** Sorteos y promociones omnicanal con Google OAuth.
2. **`omni-catalog` (`:3021` / `catalogo.*`):** Catálogo social, modificadores, GPS y tarifas por zona.
3. **`omni-bio` (`:3022` / `bio.*`):** Bio-Links 0% comisión con In-Bio Fast Checkout.
4. **`omni-bookings` (`:3023` / `turnos.*`):** Agendamiento, gestión de comisiones y sync con Google Calendar.
5. **`quotations-standalone` (`:3024` / `presupuestos.*`):** Cotizaciones y presupuestos vigentes DNIT/SET.
6. **`loyalty-standalone` (`:3025` / `fidelizacion.*`):** Fidelización por tarjetas virtuales y niveles (BRONZE → PLATINUM).

> **Seguridad Federada:** Autenticación unificada sin acoplamiento a base de datos monolítica mediante `@orderflow/auth-shared`.

---

## 5. 🔌 Integraciones, Facturación Electrónica y Multimoneda

* **Facturación Electrónica SIFEN (FacturaSend):** Emisión directa y vía Odoo de Documentos Electrónicos (DE), polling de estado SIFEN y recepción por webhooks.
* **Integración ERP (Odoo & Tango ERP):** Sincronización bidireccional de comprobantes (`account.move`), clientes (`res.partner`) y colas durables de eventos con BullMQ.
* **Motor Multimoneda Automatizado:** Moneda base PYG por defecto con actualización de cotizaciones cada 15 minutos mediante cron (BCP, Cambios Chaco, Bonanza, DólarApi) y fallback en memoria.

---

## 6. 📈 Intelligence & Visualización WOPI (OmniBI & OmniPulse)

* **OmniBI Analytics Hub (FEAT-071):** Ingesta histórica de Odoo 14 para comparativos YoY (Year-over-Year) de ventas, clientes e insumos sin impactar la operación en vivo.
* **OmniPulse (FEAT-072):** Inteligencia de campo, scoring de reputación de fuentes (*Source Reliability Engine*) y trampas canario defensivas (*Canary Trapping*).
* **Visor Collabora Online WOPI (FEAT-082):** Visualización embebida de reportes XLSX en vivo (Resumen KPI y Matriz de Productos) directamente en el panel sin descargar archivos, autenticada por tokens JWT efímeros.

---

## 7. 🛠️ Logros e Implementaciones del Sprint Actual (`v1.20.x`)

* ✅ **FEAT-080 (Sprint Fixes Producción Provecchio):** Resolución de 240 errores de compilación TS en catálogo social, fix de subdominio dinámico en códigos QR generator, ajuste de políticas CSP Traefik (`img-src blob:`) y migración DB `instance_key`.
* ✅ **FEAT-081 (Social Catalog UX & Inventario):** Badges de stock en tiempo real (Agotado/Pocas unidades), sistema de etiquetas editables por tenant sin alterar schema y ordenamiento manual de productos drag & drop.
* ✅ **FEAT-077 (OmniCatalog Jerárquico 3 Niveles):** Visualización recursiva en acordeón colapsado e importación masiva CSV con sincronización bidireccional a Odoo POS/Inventario (`pos.category` y `product.category`).
* ✅ **FEAT-075 (Generador QR Multipropósito):** Generación de QR dinámicos con branding por tenant y links embebibles para productos, catálogos y biolinks.

---

## 8. 🎯 Roadmap Prioritario Próximo (`v1.21.0` – `v1.22.0`)

| Ítem | Módulo / Categoría | Descripción y Objetivos Clave | Estado |
| :--- | :--- | :--- | :--- |
| **FEAT-078** | **OmniPOS & KDS WebSockets** | POS Offline-First (Dexie.js / Outbox), KDS Nativo WebSockets (<50ms latencia) y Motor BoM de escandallo atómico al cobro. | `planned` (v1.21.0) |
| **FEAT-079** | **Variantes & Importación Masiva** | Matriz `product.template / product.product` estilo Odoo, combinatoria cartesiana e importación asíncrona con BullMQ. | `planned` (v1.22.0) |
| **FEAT-083** | **OmniFlow Workspace Documental** | Módulo Documentos multi-tenant con Collabora Online (edición interactiva WOPI + locking Redis). | `planned` |

---

## 📌 Conclusión

OrderFlow / OmniFlow se consolida en su versión **v1.20.16** como un ecosistema SaaS altamente competitivo, caracterizado por una arquitectura resiliente, independencia modular, observabilidad de primer nivel y un ritmo de entrega continuo respaldado por la barrera de validación automatizada `./scripts/init.sh`.
