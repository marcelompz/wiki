# Auditoría FEAT-196 — Cierre de turno con arqueo y relevo de cajero (Caja Gastro)

> **Fecha:** 2026-10-21
> **Versión:** v1.39.19
> **Módulo:** OmniGastro / Caja (`/admin/gastro/cashier`)
> **Origen:** reporte del cliente durante la prueba de FEAT-193

---

## 1. Requerimiento reportado

Tras abrir el turno con el PIN de **Natalia Bogado** en el panel de Caja Gastro, el cliente no encontraba:

- forma de **cerrar la sesión** de caja;
- forma de **cambiar de cajero** (relevo de turno).

El panel de caja solo exponía la apertura de turno (`Abrir Caja`). Una vez abierta, la sesión quedaba abierta indefinidamente y el administrador no podía ni liquidar el turno (Reporte Z) ni transferírselo a otro cajero.

---

## 2. Diagnóstico

| # | Hallazgo | Archivo |
|---|----------|---------|
| **1** | El endpoint `POST /api/v1/pos-sessions/:id/close` ya existía (con arqueo y Reporte Z), pero **ninguna vista lo invocaba**. | `backend/src/pos-sessions/pos-sessions.controller.ts:83` |
| **2** | No existía ningún endpoint de **relevo de cajero**: `openSessionWithPin` solo permite abrir sesión nueva y rechaza si el cajero ya tiene una abierta. | `backend/src/pos/cash-management.service.ts:75` |
| **3** | `activeSession` se derivaba dentro de un `setState` con **closure obsoleta**: el `useEffect` de montaje corría con `selectedCashRegister === null`, por lo que la sesión abierta **no se detectaba al recargar la página**. | `frontend/src/pages/admin/gastro-cashier.tsx` (`loadOpenSessions`) |
| **4** | El botón `Abrir Caja` quedaba deshabilitado hasta que el usuario elegía caja en el desplegable. | `frontend/src/pages/admin/gastro-cashier.tsx` |
| **5** | `closeSession` no incluía `cashRegister` en la respuesta, por lo que el mensaje de cierre no podía nombrar la caja. | `backend/src/pos-sessions/pos-sessions.service.ts:317` |

---

## 3. Solución implementada

### 3.1 Backend — relevo de cajero (nuevo endpoint)

`POST /api/v1/pos-sessions/:id/switch-cashier` → `CashManagementService.switchCashierByPin()`

Reglas de negocio:

1. La sesión debe existir, pertenecer al tenant y estar `OPENED`.
2. El PIN debe corresponder a un usuario activo del tenant.
3. El PIN no puede ser el del cajero que ya tiene el turno.
4. El nuevo cajero no debe tener otra sesión abierta.
5. Si la sesión está anclada a una caja física, el nuevo cajero debe tener
   permiso `can_open` en `cash_register_access` (misma validación que al abrir).
6. La transferencia **conserva** la misma `PosSession`: misma caja, mismo fondo
   inicial y mismos movimientos de efectivo. Solo cambia `userId`.
7. La trazabilidad queda en `notes`: `Relevo de cajero: <anterior> -> <nuevo>`.

Permiso requerido por el actor: `cash:open_session`.

### 3.2 Backend — arqueo en el cierre

- `closeSession` ahora incluye `cashRegister` en la respuesta.
- `GET /api/v1/pos-sessions/:id/report` ya devolvía `openingFloat`, `totalIn`,
  `totalOut` y `expectedCash`; el frontend lo usa para poblar el modal de cierre.

### 3.3 Frontend — panel de caja

- **Botón `Cerrar turno`** → modal "Cierre de Turno" con:
  - cajero, fondo inicial, ingresos de caja, egresos de caja y **efectivo esperado**;
  - campo **Efectivo contado en la caja** (default = efectivo esperado);
  - badge de **Faltante / Sobrante** calculado en vivo;
  - confirmación que persiste el Reporte Z.
- **Botón `Cambiar cajero`** → modal de relevo con el PIN del nuevo cajero.
- **`activeSession` derivado** con `useMemo` a partir de `openSessions` +
  `selectedCashRegister` (fin del closure obsoleto).
- **Auto-selección** de la primera caja activa al cargar (el botón "Abrir Caja"
  ya no arranca deshabilitado).
- **Bloqueo de apertura duplicada**: si la caja seleccionada ya tiene turno
  abierto, se informa que use "Cambiar cajero" o "Cerrar turno".

---

## 4. Validación

### 4.1 Unitarios — `backend/src/pos/cash-management.service.spec.ts` (20 casos, todos en verde)

Casos nuevos de `switchCashierByPin`:

| Caso | Resultado esperado |
|------|--------------------|
| Sesión inexistente | `NotFoundException` |
| Sesión ya cerrada | `BadRequestException` |
| PIN inválido / usuario inactivo | `BadRequestException` |
| PIN del mismo cajero | `BadRequestException` |
| Nuevo cajero con otra sesión abierta | `BadRequestException` |
| Nuevo cajero sin `can_open` sobre la caja | `ForbiddenException` |
| Transferencia válida | Mismo `id`, mismo `cashRegisterId`, mismo `cashOpeningBalance`, `userId` nuevo, `notes` con la trazabilidad |

### 4.2 Compilación

- `backend`: `nest build` OK · `tsc --noEmit` sin errores en código de negocio.
- `frontend`: `vite build` OK · `tsc --noEmit` sin errores.

### 4.3 E2E — `frontend/e2e/cashier-cash-register-flow.spec.ts` (5 casos, modo serial)

| Caso | Resultado |
|------|-----------|
| Lista las cajas registradoras del tenant | ✅ |
| La sesión abierta se ancla a la caja seleccionada | ✅ |
| No permite abrir una caja sin permiso de acceso | ✅ |
| **Cierra el turno desde la UI** con arqueo y Reporte Z | ✅ |
| **Releva el turno a otro cajero** conservando caja y fondo | ✅ |

> El `describe` quedó en **modo serial** porque los tests comparten el estado
> real de las cajas del tenant (una sesión abierta por caja): en paralelo un
> test cerraba la sesión que otro acababa de abrir.

### 4.4 Verificación manual en localhost

URL: `http://provecchio.local/admin/gastro/cashier` (Traefik → `orderflow_frontend`)

| Paso | Resultado |
|------|-----------|
| Abrir caja con PIN de Natalia (`123`) | `✅ Sesión activa en Caja Auxiliar` |
| Click **Cambiar cajero** + PIN `5678` (Giovanni) | La misma sesión pasa a Giovanni; `notes` = `Relevo de cajero: Natalia Bado -> Giovanni Benedetti` |
| Click **Cerrar turno** | Modal con arqueo; al confirmar, la sesión queda `CLOSED` con `cashClosingDelta` y `reportZData` persistidos |
| PIN inválido | `PIN inválido o usuario inactivo` |
| Relevo al mismo cajero | `El PIN corresponde al mismo cajero que ya tiene el turno` |

Estado en base de datos tras la prueba:

```
     name      | state  |                userId                |           cash_register_id           | cashClosingDelta
---------------+--------+--------------------------------------+--------------------------------------+------------------
 POS/2026/0006 | CLOSED | 7b6ca35c-02b1-4328-b254-225dac529e15 | c31ed9e6-334e-4271-9cc1-c654fd113c34 |          5000.00
```

---

## 5. Sin migraciones

No hay cambios de schema: `pos_sessions` ya tenía `userId`, `cash_register_id`,
`cash_closing_delta` y `report_z_data`.

---

## 6. Pendientes

- Imprimir el Reporte Z en el cierre (hoy solo se persiste en `report_z_data`).
- Historial de arqueos por caja y por día en el panel.
- FEAT-194 (POS de Mozo con bandera de empleado) sigue **pendiente** y es
  independiente de este cambio.

---

## 7. Validación en producción (v1.39.21, 2026-10-21)

Despliegue a `provecchio.com` (host `192.168.69.240`) con el protocolo completo:
backup de producción → restore en localhost → verificación de fidelidad →
`./scripts/deploy-production.sh provecchio` → verificación post-deploy.

### 7.1 Fidelidad del restore en localhost

| Métrica | Valor |
|---|---|
| Tablas | 168 |
| Tenants | 1 |
| Empleados | 6 |
| Cajas registradoras | 4 (Caja Auxiliar, Terraza, Barra, Caja Principal) |
| Mesas | 18 |
| Productos | 226 |
| Usuarios | 10 |

Persistencia verificada con un ciclo completo `docker compose down` → `up`:
los conteos se mantienen idénticos. Migraciones: **38 aplicadas, 0 pendientes**.

### 7.2 Validación manual del usuario (localhost)

El usuario probó el flujo completo en `https://provecchio.local`:
abrió sesión de caja, **cerró el turno** y **cambió de cajero**. Sin errores.

### 7.3 Flujo verificado por API en producción

| Paso | Endpoint | Resultado |
|---|---|---|
| Abrir turno con PIN | `POST /api/v1/pos-sessions/open-pin` | HTTP 201 · sesión anclada a Caja Auxiliar · cajero Natalia Bado |
| Reporte de sesión | `GET /api/v1/pos-sessions/:id/report` | HTTP 200 · `byPaymentType`, `cashier`, `closingCash`, `expectedCash`, `movementsCount` |
| **Relevo de cajero** | `POST /api/v1/pos-sessions/:id/switch-cashier` | HTTP 201 · nuevo cajero Giovanni Benedetti |
| **Cierre con arqueo** | `POST /api/v1/pos-sessions/:id/close` | HTTP 201 · `state=CLOSED` · `cashClosingDelta=0` · `reportZData` persistido |

Notas registradas por el backend en la sesión de verificación:

```
Relevo de cajero: Natalia Bado -> Giovanni Benedetti
Verificacion de deploy v1.39.21
```

`reportZData`: `closedAt`, `closedByUserId`, `closingCash`, `expectedCash`,
`movementsCount`, `netCashMovement`, `openingFloat`, `variance`.

### 7.4 Verificaciones post-deploy

- Health público: `https://provecchio.com/api/v1/health` → `{"version":"1.39.21","status":"ok"}`.
- Health desde dentro del contenedor: `1.39.21 ok`.
- Service worker: 1 registro activo y controlando, **84 entradas de precache sin `index.html`**.
- Panel de Caja Gastro: carga correctamente, muestra la caja seleccionada
  (Caja Auxiliar · CASHIER_4), el aviso de que no hay sesión abierta y el
  botón **Abrir Caja** con el campo de PIN.
- QA E2E post-deploy del script de deploy: catálogo público sin imágenes
  rotas, dominio sin errores JS, autenticación y consultas a DB sin HTTP 500,
  y las 7 rutas del panel de administración verificadas.
