# Resumen Ejecutivo y Técnico — Licenciamiento OmniFlow
## Community: plataforma open core (AGPLv3). Enterprise: capa de inteligencia / compliance / integración.

**Fecha:** 7 de septiembre de 2026

> **Documento fuente de verdad:** `Plan_de_Licenciamiento__Gobierno_y_Ecosistema_OmniFlow.md` (documento de trabajo para asesoría legal). Este archivo es un resumen técnico/operativo derivado de ese documento — no lo duplica. Para razonamiento jurídico completo, políticas de marca, Marketplace, Harness de certificación y las 18 preguntas para el abogado, referirse siempre al documento legal.

---

## 1. Decisiones ya cerradas (ver documento legal para el detalle completo)

| Decisión | Estado |
|---|---|
| Licencia Community | **AGPLv3** (cerrada) — prioriza que las mejoras al core permanezcan disponibles para el ecosistema |
| Licencia Enterprise | Propietaria, a redactar con abogado |
| Marca OmniFlow | Separada jurídicamente del código — un fork con AGPLv3 no da derecho a usar la marca ni a presentarse como "OmniFlow Certified"/oficial |
| IP Audit | **Fase 0, bloqueante** — no se publica código Community hasta completarlo |
| CLA vs DCO | Pendiente — depende de si alguna contribución de Community podría reutilizarse en Enterprise; regla de oro: ningún código externo entra a Enterprise sin verificar su cadena de titularidad primero |
| Ecosistema de terceros | Vía **OmniFlow Marketplace** (comercialización de módulos) + **OmniFlow Harness** (certificación técnica automatizada: seguridad, licencias, arquitectura, multi-tenancy, rendimiento) |

**Punto a confirmar con el abogado (no soy abogado, pero vale la pena remarcarlo):** la AGPLv3 no tiene una "excepción de linking" explícita como la LGPL, por lo que conviene que el asesor defina dónde pasa exactamente la línea de "obra combinada" en la arquitectura real (microservicio separado vs. paquete en el mismo proceso) — de eso depende si los desarrolladores del Marketplace pueden vender módulos propietarios con seguridad jurídica.

---

## 2. Mecanismo técnico de gating

1. **Microservicio privado completo** (mecanismo principal): un módulo entero nace directamente como repo privado, nunca se publica su código. Ejemplo confirmado: **OmniSites avanzado** (privado) vs **site-builder básico** (público).
2. **Paquetes/módulos privados dentro de un servicio compartido**: ej. OmniLedger — core en el repo Community, extensiones (fiscal, banking, adaptadores legacy) en paquetes privados.
3. **Feature flags / license keys**: solo para diferencias menores de UI/reporting, nunca como mecanismo principal de protección.

**Regla general:** si una funcionalidad completa nunca existió en el repo público, no hay riesgo de "cerrar código que ya era abierto".

---

## 3. División de módulos — Community (plataforma) vs Enterprise (inteligencia / compliance / integración)

**Principio de posicionamiento:** *"Community es la plataforma. Enterprise es la capa de inteligencia y operación empresarial."* Enterprise no se vende como "más funcionalidades desbloqueadas".

| Dominio | Community (plataforma) | Enterprise (inteligencia/compliance/integración) |
|---|---|---|
| Contabilidad | Libro mayor | Cumplimiento fiscal |
| POS | Operación de punto de venta | Operación multi-sucursal |
| Inventario | Stock y compras | Forecasting |
| CRM | Clientes y pedidos | Fuerza de ventas |
| OmniBI | Dashboards | Predictive BI |
| Mensajería | WhatsApp Web | Omnichannel |
| Manufacturing | MRP básico | MRP avanzado |
| Multi-tenant | Tenant compartido | SaaS empresarial |
| APIs | API abierta | Integraciones enterprise |

**Requisitos mínimos de Community como plataforma (no demo artificial):** instalar, operar en producción, desarrollar módulos, integrar vía API, crear verticales, modificar y contribuir — sin depender de Enterprise para nada de eso.

### 3.1 Core comercial y operación (OmniFlow)

| Módulo | Community | Enterprise |
|---|---|---|
| POS | ✅ Roles vendedor/cajero, KDS básico | Multi-sucursal avanzado, NFC (mesas/pagos/fidelización) |
| Ventas / CRM | ✅ CRM básico, clientes, pedidos | Fuerza de ventas B2B, franquicias/multiempresa |
| Inventario / Compras | ✅ Stock básico, compras | Reposición inteligente, forecasting de demanda |
| OmniManufacturing (MRP) | ✅ UoM, BoM simple, órdenes de fabricación | MRP multinivel, mermas, costeo MOD/costos fijos |
| Multi-tenancy | ✅ Tenant compartido básico | Tenant Tier con DB dedicada, portal SaaS self-service |

### 3.2 Contabilidad (OmniLedger)

| Módulo | Community | Enterprise |
|---|---|---|
| Libro mayor | ✅ Partida doble NIIF/NIC 2 puro | — |
| Informes fiscales por país | — | ✅ RG90, SIFEN/DNIT, informes dinámicos, integraciones bancarias |
| Adaptadores legacy (Odoo/SAP/Dynamics/NetSuite) | — | ✅ **OmniLedger Connect** — hub de interoperabilidad, capacidad comercial propia permanente |

### 3.3 Capital Humano

| Módulo | Community | Enterprise |
|---|---|---|
| Legajo digital, asistencia, vacaciones | ✅ | — |
| Nómina completa | — | ✅ |
| Integraciones IPS/REOP/DNIT, SST, firma electrónica, portal del colaborador | — | ✅ |

### 3.4 Microservicios standalone (patrón `*-standalone`)

| Servicio | Community | Enterprise |
|---|---|---|
| Site-builder | ✅ Básico (plantillas simples) | **OmniSites** avanzado (repo privado desde el inicio) |
| OmniCatalog (social-catalog) | ✅ Catálogo social, 1 canal | Bot conversacional omnicanal con IA, sync ERP |
| OmniBio (biolinks) | ✅ Página básica | Dominio propio, analítica avanzada, gestión de equipo |
| OmniMessaging | ✅ WhatsApp Web single-agent | Multi-agente, bandeja de equipo, campañas de broadcast |
| EventOps (Vivento) | — | ✅ Vertical específica, nace como Enterprise |

### 3.5 Inteligencia y estrategia

| Módulo | Community | Enterprise |
|---|---|---|
| OmniBI | ✅ Dashboards básicos, export XLSX | Forecasting, what-if, pricing dinámico (OmniPricing) |
| AxonEcosystem (BSC/OKR) | — | ✅ Completo — capa estratégica de valor agregado |

---

## 4. Principios rectores

1. **Community debe ser útil por sí misma** — plataforma real, no demo capada.
2. **Enterprise nunca debe depender de "ocultar" código Community** — la protección viene de la separación arquitectónica, no de esconder funciones.
3. **Las funcionalidades Enterprise nuevas nacen privadas desde el principio** — nunca se cierra código que ya fue público.
4. **Community debe ser una plataforma extensible para terceros** — instalar, integrar, modificar y contribuir sin depender de Enterprise.
5. **Enterprise aporta principalmente inteligencia, automatización, compliance, integración y escala** — no funciones básicas retenidas.

---

## 5. Orden de implementación (ver documento legal, Sección 25, para el detalle completo por fase)

- [ ] **Fase 0 — IP Audit (bloqueante)**
- [ ] Fase 1 — Propiedad intelectual (titular, copyright, marca, cesiones, contributors)
- [ ] Fase 2 — Licenciamiento (AGPLv3 Community, Enterprise License, términos SaaS, partner licensing)
- [ ] Fase 3 — Arquitectura de repositorios (públicos/privados, paquetes, CI/CD, anti-contaminación)
- [ ] Fase 4 — Governance (DCO/CLA, contribution policy, IP checks, dependency scanning)
- [ ] Fase 5 — Harness (certificación técnica automatizada)
- [ ] Fase 6 — Marketplace (onboarding, submission, billing, versioning)
- [ ] Fase 7 — Lanzamiento Community (solo después de todo lo anterior)
- [ ] Migrar/crear como privados los módulos ya identificados como Enterprise que hoy viven en el repo compartido (Sección 3)
