## 🗺️ ROADMAP DE MICROSERVICIOS STANDALONE (OrderFlow Suite)

> **Documento Vivo de Arquitectura & Estrategia de Crecimiento Horizontal → Verticals**  
> **Última Actualización:** 2026-08-02  
> **Estado:** 🚀 6 Microservicios Standalone Operativos en Producción | v1.1.9 Unificación de Navegación & QA E2E Integral

---

## 🎯 1. Visión Estratégica: Crecimiento Horizontal → Profundización Vertical

OrderFlow opera con un modelo híbrido:
1. **Monolito Omnicanal (Core Platform):** Suite completa SaaS multi-tenant con POS, KDS, ERP Odoo, checkout y gestión de datos.
2. **Microservicios Standalone (Productos Vendibles por Separado):** Aplicaciones independientes de baja/nula dependencia que se venden como micro-SaaS standalone (ej. solo Sorteos, solo Link-in-Bio, solo Catálogo WhatsApp), compartiendo `@orderflow/auth-shared`.

---

## 📊 2. Matriz de Estado de Microservicios Standalone

| Microservicio Standalone | Repositorio / Ruta | Puerto | Routing Traefik | Estado | Target Comercial & Novedades |
|--------------------------|-------------------|--------|-----------------|--------|------------------|
| **1. Giveaways Standalone** | `services/giveaways-standalone` | `:3020` | `sorteos.pesallaccia.com` | ✅ **LISTO (v1.0.0)** | Sorteos virales, captación de leads, Google OAuth. |
| **2. WhatsApp Catalog Standalone** | `services/whatsapp-catalog-standalone` | `:3021` | `catalogo.pesallaccia.com` | ✅ **LISTO (v1.1.3)** | Modificadores/Sabores, ⚡ Compra 1-Clic, Geolocalización GPS, Tarifas por Zona, Plantillas WhatsApp, Admin Completo y File Store Unificado por Tenant. Modo Free: pre-venta manual por WhatsApp. Modo Premium: gestión completa con pasarela de pagos. |
| **3. Bio-Links Standalone** | `services/biolinks-standalone` | `:3022` | `bio.pesallaccia.com` | ✅ **LISTO (v1.0.0)** | "Link in Bio" premium con checkout rápido. |
| **4. Bookings Standalone** | `services/bookings-standalone` | `:3023` | `turnos.pesallaccia.com` | ✅ **LISTO (v1.0.0)** | Agendamiento de turnos, comisiones, agendas Barbería/Spa. |
| **5. Quotations Standalone** | `services/quotations-standalone` | `:3024` | `presupuestos.pesallaccia.com` | ✅ **LISTO (v1.0.0)** | Presupuestos y cotizaciones B2B con validez DNIT/SET. |
| **6. Loyalty Standalone** | `services/loyalty-standalone` | `:3025` | `fidelizacion.pesallaccia.com` | ✅ **LISTO (v1.0.0)** | Tarjetas de puntos, recompensas y niveles BRONZE→PLATINUM. |
| **7. OmniBI Standalone** | `services/omnibi-standalone` | `:3027` | `bi.pesallaccia.com` | 🚀 **EN DESARROLLO (v1.20.11)** | Ingesta histórica read-only XML-RPC (Odoo 14) + Analytics YoY unificado. |
| **8. Storefront & Web Builder Standalone** | `services/storefront-builder-standalone` | `:3026` | `diseno.pesallaccia.com` | 🚧 **PLANNING (v1.2.0)** | Diseñador web desacoplado y personalizador omnicanal (Portada, Catálogo WA y Bio-Links). |

---

## 🔄 3. Arquitectura Compartida & Orquestación

* **Autenticación Unificada:** `@orderflow/auth-shared` (validación ligera de JWT y API Keys sin acoplamiento a base de datos monolítica).
* **Orquestación Docker:** [docker-compose.standalone.yml](file:///opt/orderflow/docker-compose.standalone.yml)
* **Proxy Perimetral:** Traefik v3.4 con Let's Encrypt Wildcard y subdominios dinámicos por producto.

---

## 📋 4. Plan de Ejecución & Roadmap de Objetivos

- [x] **Fase 1 (Completada):** Trío inicial de microservicios (`giveaways`, `whatsapp-catalog`, `biolinks`) con Dockerfiles y paquetes compartidos.
- [x] **Fase 2 (Completada):** Extraer `bookings-standalone` (Turnos & Agendas Spa).
- [x] **Fase 3 (Completada):** Extraer `quotations-standalone` (Presupuestos & Cotizaciones).
- [x] **Fase 4 (Completada):** Extraer `loyalty-standalone` (Programa de Fidelización).
- [x] **Fase 5 (Completada - WhatsApp Catalog v1.1.3):** Modificadores/Talles, Compra Rápida 1-Clic, Ubicación GPS, Zonas de Envío, Plantillas WhatsApp, Resolución Dinámica por Subdominio Traefik, File Store Unificado por Tenant y Backups de Uploads.
- [x] **Fase 6 (Completada - Multi-Tenant Autogestionado):** Generación automática de subdominios normalizados en Wizard y registro automático CNAME en Cloudflare DNS.
- [ ] **Fase 7 (Pendiente - Profundización Bookings & Loyalty):** Recordatorios automáticos por WhatsApp y sincronización bidireccional con Google Calendar.
- [ ] **Fase 8 (Pendiente - Cobros Autónomos en Micro-SaaS):** Pasarelas de pago independientes Stripe/MercadoPago en cada microservicio standalone.
- [ ] **Fase 9 (Pendiente - Escalabilidad Físico-Infraestructura):** Migración a Servidor VPS Secundario (desacoplamiento de Staging y réplica de lectura DB).

