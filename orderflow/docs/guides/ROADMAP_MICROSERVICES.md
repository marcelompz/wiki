## 🗺️ ROADMAP DE MICROSERVICIOS STANDALONE (OrderFlow Suite)

> **Documento Vivo de Arquitectura & Estrategia de Crecimiento Horizontal → Verticals**  
> **Última Actualización:** 2026-08-19  
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
| **7. OmniBI Standalone** | `services/omnibi-standalone` | `:3027` | `bi.pesallaccia.com` | ✅ **LISTO (v1.20.15)** | Ingesta histórica read-only XML-RPC (Odoo 14) + Analytics YoY unificado + persistencia aislada Prisma. |
| **8. Storefront & Web Builder Standalone** | `services/storefront-builder-standalone` | `:3026` | `diseno.pesallaccia.com` | ✅ **LISTO (v1.20.34)** | Diseñador web desacoplado y personalizador omnicanal Drag & Drop (Portada, Catálogo WA y Bio-Links). |
| **9. OmniCapitalHumano & OmniAsistencia Standalone** | `services/hr-standalone` | `:3028` | `rrhh.pesallaccia.com` | 🔄 **EN DESARROLLO (v1.0.0 / FEAT-107, FEAT-108)** | Suite de Legajo Digital (`Employee`), Nómina parametrizable, Ausencias, Vacaciones y Marcador de Asistencia Standalone (NFC/QR/Biometría/Kiosko). |
| **10. OmniVector Standalone** | `services/omnivector-standalone` | `:3029` | `vector.pesallaccia.com` | ✅ **LISTO (v1.0.0)** | Editor gráfico vectorial interactivo con herramientas de dibujo, formas, capas, IA Gemini y exportación SVG/PNG. |
| **11. OmniSites Standalone** | `services/omnisites-standalone` | `:3030` | `sites.pesallaccia.com` | ✅ **LISTO (v1.0.0)** | Diseñador web drag-and-drop SiteCraft Studio con generación asistida por IA Gemini y exportación responsive. |
| **12. OmniFlow Data Editor Standalone** | `services/data-editor-standalone` | `:3029` | `data-editor.pesallaccia.com` | ✅ **LISTO (v1.0.0)** | Editor y validador universal de datos (JSON/CSV/XLSX) con tabla estilo Excel, vista de árbol, código raw y validación de esquemas Odoo (`res.partner`, `product.template`, `sale.order`). |

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

---

## 📋 5. Roadmap de Features del Core Monolítico (v1.19+)

### 🎯 v1.19.0 — OmniPOS + KDS + Motor BoM Atómico (FEAT-078)
**Target:** Q3 2026 | **Prioridad:** HIGH | **Dependencias:** FEAT-077, FEAT-064

**Scope Completo (FEAT-078):**
- **Terminal POS Offline-First:** IndexedDB + Outbox Pattern + Dexie.js, arquitectura resiliente, apertura <1s, sync >99.9%.
- **KDS Nativo Multi-Estación:** WebSockets + Redis Pub/Sub (<50ms latency), enrutamiento automático por `PreparationStation`, semáforo SLA visual (Verde→Amarillo→Rojo parpadeante), soporte Bump Bars físicas (REST `PATCH /kds/tickets/:id/status`), Recall de tickets completados, alerta sonido/visual.
- **Motor BoM Atómico (Live Escandallo Engine):** Deducción insumos en tiempo real dentro de transacción atómica, modificadores dinámicos (`replacesVariantId`, `qtyDelta`), factor de merma (`wastePercentage`), snapshot `costAtSale` para BI rentabilidad (Menu Engineering).
- **Ventaja vs Odoo:** Stock tiempo real vs diferido, KDS WebSockets vs polling, offline nativo, modificadores reactivos, costeo unitario en venta.

**Entregables:**
- `backend/src/pos/`, `backend/src/kds/`, `backend/src/bom/`
- `frontend/src/pages/admin/pos.tsx`, `frontend/src/pages/admin/kds.tsx`
- `mobile/src/screens/POSScreen.tsx` (React Native Expo)
- `docs/planes/pos-kds/` (documentación técnica completa)

**Métricas QA:**
- POS apertura <1s | KDS WebSocket latency <50ms | BoM processing <100ms
- Offline sync >99.9% | Stock error rate <0.1% | Margen por plato calculado <1s

**Documentación fuente:** `docs/planes/pos-kds/` (Análisis Técnico-Estratégico + Informe Comparativo vs Odoo)

---

### 🎯 v1.20.0 — Sistema de Productos con Variantes + Importación Masiva (FEAT-079)
**Target:** Q4 2026 | **Prioridad:** HIGH | **Dependencias:** FEAT-064, FEAT-077

**Scope Completo (FEAT-079):**
- **Modelo Odoo Estándar:** `product.template` ↔ `Product`, `product.product` ↔ `ProductVariant`
- **Ficha Enriquecida:** `Product` (template) con handle único, specs JSON, galería fotos con fallback `variant.photo || template.photo[0]`, precio base.
- **Atributos Globales Reutilizables:** `Attribute` → `AttributeValue` (Talla, Color, Material), `ProductAttributeLine` por producto.
- **Generación Cartesiana:** Motor cartesiano de variantes con materialización selectiva.
- **Precio Desacoplado:** `basePrice` (Template) + `priceDelta` (Variant) = Precio Final.
- **Importación/Exportación Masiva CSV/XLSX Asíncrona:** BullMQ jobs (`import-products-process`, `regenerate-variant-matrix`, `recalculate-template-aggregates`), Dry-run validación, procesamiento por `handle`, cálculo automático `priceDelta`, transaccionalidad por producto.
- **Frontend:** Gestor atributos dinámico, matriz variante hoja de cálculo, wizard importación con mapeo columnas + preview errores.
- **Integración Odoo:** `product.template` ↔ `Product`, `product.product` ↔ `ProductVariant`, ajuste POS/Inventario para consumo variantes.

**Entregables:**
- Prisma Schema: `Product`, `ProductVariant`, `Attribute`, `AttributeValue`, `ProductAttributeLine`, `VariantAttributeValue`, `Photo`, `ImportBatch`
- Backend: `ProductsModule`, `AttributesModule`, `VariantsModule`, `CatalogModule`, BullMQ queues
- Frontend: `VariantMatrix.tsx` (matriz hoja cálculo), `ImportWizard.tsx` (wizard mapeo + preview), `ProductsModule` admin
- BullMQ Jobs: `import-products-process`, `regenerate-variant-matrix`, `recalculate-template-aggregates`

**Métricas QA:**
- Prisma validate/generate OK | Variantes cartesianas correctas | Import CSV/XLSX dry-run + ejecución
- Precio base + delta correcto | Fallback fotos variant→template | Jobs BullMQ procesan importaciones
- E2E: matriz variantes + importación masiva

**Documentación fuente:** `docs/planes/productos/` (PLAN_productos-variantes-con-importacion-masiva.md + v2)

---

### 🎯 v1.21.0 — Profundización Vertical (Fase 7+)

- [ ] **Fase 7:** Recordatorios WhatsApp + Google Calendar Sync bidireccional en Bookings/Loyalty
- [ ] **Fase 8:** Pasarelas Stripe/MercadoPago independientes en cada micro-SaaS standalone
- [ ] **Fase 9:** Migración a VPS Secundario (Staging aislado + réplica read-only DB)

---

## 🔄 3. Arquitectura Compartida & Orquestación

* **Autenticación Unificada:** `@orderflow/auth-shared` (validación ligera de JWT y API Keys sin acoplamiento a base de datos monolítica).
* **Orquestación Docker:** [docker-compose.standalone.yml](file:///opt/orderflow/docker-compose.standalone.yml)
* **Proxy Perimetral:** Traefik v3.4 con Let's Encrypt Wildcard y subdominios dinámicos por producto.

---

## 📋 4. Referencias de Documentación Técnica

| Feature | Documentación Fuente | Ubicación |
|---------|---------------------|-----------|
| FEAT-078 (POS-KDS) | Análisis Técnico-Estratégico + Informe vs Odoo | `docs/planes/pos-kds/` |
| FEAT-079 (Variantes) | PLAN Productos Variantes + v2 | `docs/planes/productos/` |
| FEAT-077 | OmniCatalog Jerárquico | `docs/guides/OMNICATALOG_HIERARCHICAL.md` |
| FEAT-071 | OmniBI Ingesta Histórica | `docs/planes/OMNIBI_HISTORICAL_INGESTION_PLAN.md` |

---

## 📋 5. Estado Actual de Microservicios (Resumen)

| Microservicio | Estado | Puerto | Subdominio | Próximos Pasos |
|--------------|--------|--------|------------|----------------|
| Giveaways | ✅ v1.0.0 | 3020 | sorteos | - |
| WhatsApp Catalog | ✅ v1.1.3 | 3021 | catalogo | Profundizar pagos autónomos |
| Bio-Links | ✅ v1.0.0 | 3022 | bio | Selector redes + badge |
| Bookings | ✅ v1.0.0 | 3023 | turnos | WhatsApp reminders + GCal sync |
| Quotations | ✅ v1.0.0 | 3024 | presupuestos | - |
| Loyalty | ✅ v1.0.0 | 3025 | fidelizacion | - |
| OmniBI | 🚀 v1.20.11 | 3027 | bi | Ingesta histórica Odoo 14 |
| Storefront Builder | 🚧 v1.2.0 | 3026 | diseno | Planning |

---

*Última actualización: 2026-08-19*
