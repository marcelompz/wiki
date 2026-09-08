# FEAT-125 — Master Test Plan: Guest Digital Menu + Table Claim + Waiter Call

**Módulo:** OmniDineIn / Gastro Core  
**Feature ID:** `FEAT-125`  
**Versión:** `v1.25.0-alpha-omnigastro`  
**Entorno:** `https://demo-omnigastro.pesallaccia.com`  
**Referencia Técnica:** [FEAT-125_gastro.md](FEAT-125_gastro.md)

---

## 🎯 1. Introducción y Propósito

El propósito de este plan de pruebas es garantizar que los flujos de **OmniDineIn / OmniGastro** satisfagan tanto los requisitos técnicos de la arquitectura multi-tenant como la realidad operativa diaria de un restaurante. Se busca validar la sinergia entre el cliente en mesa (Web App Guest), el mozo (Tablet `/admin/gastro`), la cocina/barra y la caja.

---

## 📐 2. Estructura de Escenarios Evaluados

El plan cubre 5 Escenarios Principales de Operación y 1 Bloque Excepcional:

1. **Escenario A — Flujo Estándar en Mesa (`serviceMode: TABLE`):** Escaneo QR, carrito guest, emisión `GUEST_DRAFT`, reclamo mozo, comandado a cocina y cierre de mesa.
2. **Escenario B — Atenciones Presenciales sin Pedido App:** Cliente llama al mozo con la opción `"📝 Quiero pedir"` y el mozo toma la comanda en su tablet.
3. **Escenario C — Solicitud de Asistencia Intermedia:** Llamadas operativas como `"🍞 Más pan"` o `"❓ Ayuda"`.
4. **Escenario D — Solicitud y Gestión de Cuenta:** Flujo de cierre con las 3 modalidades (`WITHOUT_PAYMENT`, `WAITER_CUSTODY`, `GATEWAY`).
5. **Escenario E — Pedidos Para Llevar / Barra (`serviceMode: BAR`):** Flujo directo a la cola de barra sin mozo asignado.
6. **Escenario Excepcional — Edge Cases:** Manejo de reclamos concurrentes, stock en estado draft y re-llamadas.

---

## 🛠️ 3. Estrategia y Herramientas de Pruebas

- **Pruebas Automatizadas E2E:** Scripts de Playwright (`qa_e2e_check.py` / `generate_user_manual.py`) para validación de renderizado, captura de screenshots y verificación de HTTP 200/201.
- **Roll-play Operativo Manual:** Evaluación cualitativa y cuantitativa mediante la [evaluation-sheet.md](evaluation-sheet.md) en restaurante real o simulación de sala.
- **Pruebas de Invariantes de Negocio:**
  - `tenantId` obligatorio en todas las queries.
  - El estado inicial debe ser siempre `DRAFT`.
  - El descuento de stock NO ocurre en el borrador guest (ocurre en la fase de envío a cocina/confirmación).

---

## 📊 4. Criterios de Entrada y Salida (Entry & Exit Criteria)

### Criterios de Entrada
- Entorno demo desplegado con subdominio y tenant activo (`demo-omnigastro-001`).
- Semilla de base de datos cargada con productos (Milanesa, Ensalada, Coca-Cola, etc.) y mesas preconfiguradas (`MESA-01`).
- Usuarios de prueba creados (`admin@demo.omnigastro`, `mozo@demo.omnigastro`).

### Criterios de Salida (Aprobación Alfa)
- 100% de los casos de uso definidos en [test-cases.md](test-cases.md) ejecutados con resultado `PASSED`.
- Cero excepciones JS en consola durante el flujo guest y panel admin.
- Completamiento de la [evaluation-sheet.md](evaluation-sheet.md) con calificación promedio >= 4/5 en todos los escenarios.
