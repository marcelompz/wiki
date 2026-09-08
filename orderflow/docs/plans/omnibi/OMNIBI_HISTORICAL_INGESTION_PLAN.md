# Especificación Técnica: OmniBI Analytics Hub — Ingesta Histórica Multi-ERP

> **Fecha:** 2026-08-18 (revisión de auditoría)
> **Estado:** `in_progress` (FEAT-071 en `featurelist.json`)
> **Estrategia Comercial:** "Caballo de Troya OmniFlow"
> **Nota de revisión:** Esta versión corrige 3 vacíos detectados en auditoría contra el código real del monorepo (rutas inexistentes, ausencia de aislamiento por `tenantId`, y falta de decisión arquitectónica standalone vs. monorepo). Los cambios respecto al documento original están marcados con 🔧.

---

## 🎯 1. Concepto y Estrategia

### El Problema del Cliente
Al migrar de un ERP tradicional (ej. Odoo 14, Tango, SAP) a un ecosistema moderno como **Odoo 18 CE + OmniFlow**, los clientes se enfrentan al dilema de perder el histórico de transacciones o verse obligados a realizar una migración de datos costosa, compleja y propensa a errores.

### La Solución OmniBI ("Caballo de Troya")
OmniFlow no requiere migrar el ERP legacy. En su lugar:
1. **Instalación No Invasiva:** Se conecta al ERP preexistente (Odoo 14) en modo **Read-Only** a través de un adaptador dedicado.
2. **Ingesta de Histórico de Operaciones:** Extrae y almacena la historia de ventas, compras, recetas/costos y contactos en el Data Warehouse / Analytics Hub de OmniBI.
3. **Despliegue Operativo Limpio:** El cliente empieza a operar desde cero en Odoo 18 CE + OmniFlow POS/E-Commerce.
4. **Inteligencia Comparativa Unificada (YoY):** OmniBI consolida las fuentes y permite generar reportes comparativos *Año contra Año (Year-over-Year)*, análisis de márgenes e historial de clientes cruzando el ERP pasado con la operación actual.

---

## 🏗️ 2. Arquitectura de Ingesta & Almacenamiento

```
┌────────────────────────────────┐
│  Odoo 14 / ERP Legacy (Past)   │ ──(Ingesta Read-Only XML-RPC)──┐
└────────────────────────────────┘                                │
                                                                 ▼
┌────────────────────────────────┐                     ┌──────────────────────────┐
│  Odoo 18 CE Operativo (Live)   │ ──(Webhooks / Direct API)─► │ OmniBI Analytics Hub     │
└────────────────────────────────┘                               │ (Histórico + Live Data)  │
                                                                 │                          │
┌────────────────────────────────┐                               │ • Comparativos YoY       │
│  OmniFlow POS / E-Commerce     │ ──(Transacciones Core)────►   │ • Evolución de Recetas   │
└────────────────────────────────┘                               │ • LTV & Historia Contacto│
                                                                 └──────────────────────────┘
```

### 🔧 2.1 Decisión de arquitectura: OmniBI nace como microservicio standalone

La Regla 5 de `AGENTS.md` establece que un módulo con acoplamiento 0 respecto al core califica como candidato a la suite de Microservicios Standalone (mismo camino que ya siguieron Giveaways, Social Catalog, Bio-Links y WhatsApp Catalog vía `services/*-standalone/`). OmniBI cumple ese criterio: solo **lee** de Odoo (legacy y live) y de eventos del core vía webhook — no necesita escribir en el schema compartido de `backend/schema.prisma`.

**Decisión:** se implementa desde el día 1 como `services/omnibi-standalone/`, siguiendo exactamente el patrón ya validado en `services/giveaways-standalone/` (Prisma con `output` a un client aislado, `datasource` con su propia `*_DATABASE_URL`, `Dockerfile` y `docker-compose.yml` propios). Esto evita repetir el ciclo de "construir acoplado y desacoplar después" que ya se hizo con Schema Decoupling (FEAT-064/065).

**Consecuencia sobre rutas:** todas las rutas de `assigned_module` del documento original apuntaban al monorepo (`backend/src/bi/`, `odoo-adapter/src/plugins/...`). Se corrigen en la §4.

### 🔧 2.2 Aislamiento por `tenantId` en datos históricos

La Regla 1 de `AGENTS.md` declara `tenantId` "sagrado" en toda tabla y query — el documento original no lo mencionaba, y es el punto más riesgoso del plan: **Odoo no tiene concepto nativo de `tenantId`** (es un sistema single-company por instalación). Sin una regla de mapeo explícita, es fácil que un dataset histórico termine sin aislamiento o, peor, mezclado entre tenants si en el futuro más de un tenant usa el mismo conector de extracción.

**Regla de mapeo (obligatoria antes de implementar):**
- Cada ejecución del extractor recibe el `tenantId` de OmniFlow como parámetro obligatorio de entrada (no se infiere de los datos de Odoo).
- Todo registro insertado en `BI_Sales_History`, `BI_Contacts_History`, `BI_Purchases_History` y `BI_BOM_History` lleva `tenantId` como columna indexada — igual que cualquier tabla del core.
- El extractor rechaza correr sin `tenantId` explícito (falla rápido, no hay valor por defecto).

---

## 📊 3. Entidades & Modelos a Sincronizar

| Entidad | Modelo Origen (Odoo 14) | Destino OmniBI / Data Lake | Propósito Analítico |
|---|---|---|---|
| **Contactos** | `res.partner` | `BI_Contacts_History` | LTV (Lifetime Value) unificado cliente/proveedor |
| **Ventas / Pedidos** | `sale.order`, `account.move` | `BI_Sales_History` | Comparativo de ventas YoY, comportamiento por zona/canal |
| **Compras / Insumos** | `purchase.order` | `BI_Purchases_History` | Evolución de precios de compra e inflación de insumos |
| **Recetas / BoM** | `mrp.bom`, `mrp.production` | `BI_BOM_History` | Comparativo de costo de producción vs precio de venta |

🔧 Todas las tablas anteriores llevan `tenantId` (String, indexado) como columna obligatoria — ver §2.2. Ninguna existe todavía en `backend/schema.prisma` ni en ningún `schema.prisma` de `services/*-standalone/`; se crean desde cero en `services/omnibi-standalone/prisma/schema.prisma`.

### 🔧 3.1 Estrategia de ejecución: idempotencia e incrementalidad

El documento original no definía qué pasa si el extractor se corre más de una vez. Se fija la siguiente regla:

- **Primera corrida por tenant:** dump histórico completo, paginado (evita picos de carga en el servidor Odoo 14 legacy, que puede estar en hardware modesto de cliente).
- **Corridas siguientes:** modo incremental por `write_date` de Odoo (todos los modelos de Odoo lo tienen) — solo se traen registros modificados desde la última ejecución exitosa, registrada en una tabla `BI_SyncCheckpoint (tenantId, sourceModel, lastSyncedAt)`.
- **Upsert, no insert:** cada registro se identifica por `(tenantId, sourceModel, sourceId)` único — reejecutar el extractor no duplica filas.
- **Manejo de errores:** si la conexión a Odoo 14 se corta a mitad de una página, la corrida se reintenta desde el último checkpoint exitoso (no desde cero); se registra el fallo en logs con el rango de páginas afectado.

---

## ⚙️ 4. Hoja de Ruta de Implementación (FEAT-071)

1. **Crear el servicio `omnibi-standalone` (no existe todavía):**
   * 🔧 `services/omnibi-standalone/` con `Dockerfile`, `docker-compose.yml`, `prisma/schema.prisma` (aislado, con las 4 entidades de §3 + `BI_SyncCheckpoint`), siguiendo el patrón de `services/giveaways-standalone/`.
2. **Adaptador de extracción histórica Odoo 14 (no existe todavía):**
   * 🔧 `services/omnibi-standalone/src/extractors/odoo-historical-extractor.ts` — conector read-only vía XML-RPC a Odoo 14 (puerto 8081, tenant Provecchio), paginado, incremental por `write_date`, recibe `tenantId` obligatorio. *(El documento original asumía que existía `odoo-adapter/` en el monorepo; no está presente en el código auditado — se construye desde cero como parte de este servicio, no como plugin de algo preexistente.)*
3. **OmniBI Engine Backend:**
   * 🔧 `services/omnibi-standalone/src/bi/` con endpoints para consultar datasets consolidados por tenant, protegidos por el mismo esquema de auth que el resto de la suite standalone (`@orderflow/auth-shared`).
4. **Frontend Dashboards:**
   * 🔧 Vista `frontend/pages/admin/bi.tsx` (sin `src/`, según convención real del monorepo) con selectores de rango temporal y selector de fuentes (*Odoo 14 Legacy*, *Odoo 18 Live*, *OmniFlow POS*), consumiendo la API del servicio standalone.
5. **Sincronización de roadmap standalone:**
   * Registrar el nuevo servicio en `docs/guides/ROADMAP_MICROSERVICES.md` (Regla 6 de `AGENTS.md` — obligatorio para toda incorporación a la suite standalone).

---

*Documento registrado en la memoria del proyecto `featurelist.json` y sincronizado en el roadmap oficial. Revisión de rutas y arquitectura basada en auditoría del código real (paquete `orderflow_1_20_10`).*
