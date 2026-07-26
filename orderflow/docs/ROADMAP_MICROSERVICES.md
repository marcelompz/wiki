# 🗺️ ROADMAP DE MICROSERVICIOS STANDALONE (OrderFlow Suite)

> **Documento Vivo de Arquitectura & Estrategia de Crecimiento Horizontal → Verticals**  
> **Última Actualización:** 2026-07-26  
> **Estado:** 🚀 3 Microservicios Standalone Operativos | 3 Microservicios en Fase de Extracción

---

## 🎯 1. Visión Estratégica: Crecimiento Horizontal → Profundización Vertical

OrderFlow opera con un modelo híbrido:
1. **Monolito Omnicanal (Core Platform):** Suite completa SaaS multi-tenant con POS, KDS, ERP Odoo, checkout y gestión de datos.
2. **Microservicios Standalone (Productos Vendibles por Separado):** Aplicaciones independientes de baja/nula dependencia que se venden como micro-SaaS standalone (ej. solo Sorteos, solo Link-in-Bio, solo Catálogo WhatsApp), compartiendo `@orderflow/auth-shared`.

---

## 📊 2. Matriz de Estado de Microservicios Standalone

| Microservicio Standalone | Repositorio / Ruta | Puerto | Routing Traefik | Estado | Target Comercial |
|--------------------------|-------------------|--------|-----------------|--------|------------------|
| **1. Giveaways Standalone** | `services/giveaways-standalone` | `:3020` | `sorteos.pesallaccia.com` | ✅ **LISTO (v1.0.0)** | Sorteos virales, captación de leads, Google OAuth. |
| **2. WhatsApp Catalog Standalone** | `services/whatsapp-catalog-standalone` | `:3021` | `catalogo.pesallaccia.com` | ✅ **LISTO (v1.0.0)** | Catálogo rápido, carrito sin fricción y pedido a WhatsApp. |
| **3. Bio-Links Standalone** | `services/biolinks-standalone` | `:3022` | `bio.pesallaccia.com` | ✅ **LISTO (v1.0.0)** | "Link in Bio" premium estilo Linktree con checkout rápido. |
| **4. Bookings Standalone** | `services/bookings-standalone` | `:3023` | `turnos.pesallaccia.com` | ✅ **LISTO (v1.0.0)** | Agendamiento de turnos, comisiones, agendas Barbería/Spa. |
| **5. Quotations Standalone** | `services/quotations-standalone` | `:3024` | `presupuestos.pesallaccia.com` | 🚧 **EN FASE DE EXTRACCIÓN** | Presupuestos y cotizaciones B2B con validez DNIT/SET. |
| **6. Loyalty Standalone** | `services/loyalty-standalone` | `:3025` | `fidelizacion.pesallaccia.com` | 🚧 **EN FASE DE EXTRACCIÓN** | Tarjetas de puntos, recompensas y niveles BRONZE→PLATINUM. |

---

## 🔄 3. Arquitectura Compartida & Orquestación

* **Autenticación Unificada:** `@orderflow/auth-shared` (validación ligera de JWT y API Keys sin acoplamiento a base de datos monolítica).
* **Orquestación Docker:** [docker-compose.standalone.yml](file:///opt/orderflow/docker-compose.standalone.yml)
* **Proxy Perimetral:** Traefik v3.3 con Let's Encrypt Wildcard y subdominios dinámicos por producto.

---

## 📋 4. Plan de Ejecución

- [x] **Fase 1 (Completada):** Trío inicial de microservicios (`giveaways`, `whatsapp-catalog`, `biolinks`) con Dockerfiles y paquetes compartidos.
- [x] **Fase 2 (Completada):** Extraer `bookings-standalone` (Turnos & Agendas Spa).
- [ ] **Fase 3 (Pendiente):** Extraer `quotations-standalone` (Presupuestos & Cotizaciones).
- [ ] **Fase 4 (Pendiente):** Extraer `loyalty-standalone` (Programa de Fidelización).
- [ ] **Fase 5 (Profundización Vertical):** Agregar pasarelas de pago independientes Stripe/MercadoPago en cada micro-SaaS.
