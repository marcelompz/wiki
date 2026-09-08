# Historial — OmniGastro

> **Este directorio NO es fuente de verdad.** Contiene versiones previas de planes y análisis estratégicos/competitivos que fueron consolidados o reemplazados por [`PLAN_MAESTRO.md`](../PLAN_MAESTRO.md) y los prompts en [`features/`](../features/).

---

## 📋 Justificación de archivo

La reorganización de `docs/planes/omnigastro/` (2026-09-03) movió aquí los siguientes documentos por las razones indicadas:

### Documentos que eran planes previos (reemplazados por el plan consolidado)

| Archivo | Motivo de archivo |
|---|---|
| `Plan_Maestro_Transicion_Toast_v1.md` | Primera versión del plan maestro con esquema FEAT-112 como "pendiente" y modelo de datos `DiningArea/RestaurantTable/TableSession/OrderRound/GastroItem/ModifierGroup/...` con nombres y enums distintos a los actuales. **Reemplazado** por [`PLAN_MAESTRO.md`](../PLAN_MAESTRO.md) que consolida FEAT-112 a FEAT-125 con un único modelo unificado (`RestaurantTable` + `TableGuest` + `Order` extendido). Se conserva como referencia de la primera visión tipo Toast. |
| `PLAN_OMNIDINEIN_v1_FEAT-105-110.md` | Numeración vieja FEAT-105 a FEAT-110. Esos IDs ya están ocupados por otros módulos (OmniLedger, DataView, Capital Humano, Asistencia, Modifiers). **Reemplazado** por el plan consolidado con FEAT-112+ que respeta el `featurelist.json` real. Conservado por el detalle de prompts individuales por fase y el análisis de redundancia con FEAT-078. |

### Documentos que son análisis estratégicos/competitivos (referencia, no specs)

| Archivo | Motivo de archivo |
|---|---|
| `analisis-toast-vs-odoo.md` | Análisis técnico de la arquitectura (modelo de datos, motor de escandallo, KDS, offline-first, BI). Excelente referencia de decisiones de diseño (Live Escandallo atómico, Dexie.js, WebSockets puros, `costAtSale` snapshot). **No es spec**; es el rationale detrás de OmniGastro. |
| `comparativa-omni-vs-odoo.md` | Matriz comparativa exhaustiva OmniFlow vs Odoo. Sirve para explicar a terceros por qué OmniFlow es "Sistema de Acción" vs "Sistema de Registro". **No es spec**. |
| `plan-arquitectura-pos-kds-bom.md` | Plan técnico detallado de los 3 subsistemas (POS, KDS, BoM) con sus entidades. **Superseded** por el esquema unificado de [`PLAN_MAESTRO.md`](../PLAN_MAESTRO.md) §3 + [`schema/omnigastro_core.prisma`](../schema/omnigastro_core.prisma). Conservado como referencia de los modelos `PosConfig/PosSession/PreparationStation/KitchenTicket` y el motor BoM recursivo. |
| `analisis-tecnico-estrategico.md` | Análisis por capas (modelo de datos, BoM, KDS, offline, BI). **Superseded**; consolidar las recomendaciones con [`PLAN_MAESTRO.md`](../PLAN_MAESTRO.md). |

---

## 🔄 Por qué el plan consolidado es el actual

1. **Numeración coherente con `featurelist.json`:** FEAT-105 a FEAT-111 ya estaban ocupados; los IDs FEAT-112+ son los siguientes libres y respetan el versionado del repositorio.
2. **Modelo de datos unificado:** el plan v1 tenía `TableSession/OrderRound/GastroItem` separados del modelo `Order` core; el plan consolidado **extiende** `Order/OrderLine` con campos (`tableId`, `seatNumber`, `isShared`, `isGift`, `source`, `guestSessionId`, `claimedAt`, `course`, `costAtSale`) en vez de duplicar entidades. Esto preserva la conciliación con Odoo (FEAT-093) y evita reescribir el motor de stock.
3. **Fases 0 → 4 con dependencias lineales:** FEAT-112 (Safeguards) ya está completed; las siguientes fases se construyen encima.
4. **Integra Guest Digital Menu (FEAT-125)** y **Live Escandallo (FEAT-118)** con su modelo de datos y endpoints definidos.
5. **Incluye decisiones de negocio validadas** (sección 6 del `PLAN_MAESTRO.md`): QR estático en Fase 1, múltiples cuentas por mesa, pago en mesa con Waiter Custody, etc.

---

## ⚠️ Regla de uso

- **Si vas a implementar**, lee primero [`PLAN_MAESTRO.md`](../PLAN_MAESTRO.md) y el prompt específico de la feature en [`features/`](../features/).
- **Si querés entender el rationale** de una decisión de diseño (por qué Live Escandallo y no descuento diferido, por qué Dexie.js, etc.), consultá los análisis de este directorio.
- **NO mezcles** los modelos del plan v1 (`TableSession/OrderRound/GastroItem/ModifierGroup`) con el modelo unificado. Son **incompatibles**.

---

*Última actualización: 2026-09-03 — Reorganización post-FEAT-112 completed.*
