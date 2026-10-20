# Manual: Caja Gastro & Cobro Centralizado (OmniGastro)

> **Para:** equipo de sala / cajeros de `provecchio.com`
> **Feature:** FEAT-190 (Cuenta abierta) · **Versión:** v1.39.16
> **Página:** `/admin/gastro/cashier` — 💵 Caja Gastro & Cobro Centralizado
> **Generado:** 2026-10-20 con Playwright (capturas reales contra `provecchio.com`)
> **No muta producción:** el spec solo navega y toma screenshots.

---

## 1. Estado actual (2026-10-20) — ✅ CAJAS CONFIGURADAS

Las 4 cajas reales están configuradas en `provecchio.com`:

| Caja | Code | Location | Cajeros con acceso |
|---|---|---|---|
| **Caja Principal** | `CASHIER_1` | Salón Principal | Natalia, Ninfa, Giovanni, Giuliana (todos con open+close+refund+discount) |
| **Barra** | `CASHIER_2` | Barra | Ninfa, Giovanni |
| **Terraza** | `CASHIER_3` | Terraza | Ninfa, Giuliana |
| **Caja Auxiliar** | `CASHIER_4` | Salón | Natalia, Giovanni |

**Cajeros (empleados + PIN):**

| Cajero | Employee ID | Contact ID | PIN | CI (nationalId) |
|---|---|---|---|---|
| Natalia Bogado | `cmubavw8b0003vop3i8h6oahw` | `5e13f755-794a-48ed-97be-0967ef281d97` | `9876` | (original) |
| Ninfa Lecoque | `cmvh4tbwp000113xkfecp1ne5` | `8fc58663-68b1-4830-8ebb-6dcab094c8f9` | `1234` | `3398859` |
| Giovanni Benedetti | `cmvh4tc5i000313xkdd80elzz` | `940d309c-1496-4437-9176-d87dbed970af` | `5678` | ⚠️ **PLACEHOLDER-GIOVANNI** (inventada, completar) |
| Giuliana Benedetti | `cmvh4tchk000513xk5q59xyfh` | `f3aa21d0-90cd-4ba5-91fb-ae8da58dcfe1` | `9012` | ⚠️ **PLACEHOLDER-GIULIANA** (inventada, completar) |

> ⚠️ Las CI de Giovanni y Giuliana son **placeholder** (la BD exige `@@unique([tenantId, nationalId])`). Completalas con las cédulas reales con `PUT /api/v1/hr/employees/:id` antes de que el sync a Odoo las use.

**Historial:** la tabla `cash_registers` estaba vacía (0 rows) antes de esta configuración — no había datos de prueba que eliminar.

---

## 2. Cómo crear las cajas reales

El endpoint existe (`POST /api/v1/cash-registers`, permiso `cash:manage`) pero **la UI no tiene botón de crear**. Crearlas se hace por API:

```
POST /api/v1/cash-registers
Authorization: Bearer <token>  +  x-tenant-id: provecchio-dimora-001
Content-Type: application/json

{
  "name": "Caja Principal",
  "code": "CASHIER_1",
  "location": "Salón Principal",
  "notes": "Caja del mozo de Turner"
}
```

**Campos:**
| Campo | Requerido | Descripción |
|---|---|---|
| `name` | ✅ | Nombre visible: "Caja Principal", "Barra", "Terraza" |
| `code` | ✅ | Código único por tenant (ej. `CASHIER_1`). La BD exige `@@unique([tenantId, code])` |
| `location` | ❌ | Ubicación: "Salón Principal", "Terraza", "Barra" |
| `notes` | ❌ | Libre |

**Respuesta:** `201 Created` con el objeto `CashRegister` (`{ id, tenantId, name, code, location, isActive, createdAt, updatedAt }`).

---

## 3. Flujo de apertura de caja (PIN de cajero)

1. En `/admin/gastro/cashier` seleccioná la caja en el **Select** ("Seleccioná una caja").
2. Ingresá el **PIN de 4 dígitos** del cajero.
3. Clic en **"Abrir Caja"** → abre una `PosSession` (`state: OPENED`) con el `openingBalance` que hayas cargado.
4. La barra verde **"✅ Sesión activa: <nombre>"** confirma que la caja está abierta.

> El `openingBalance` se guarda en `localStorage` clave `omniGastro_opening_<cashRegisterId>` (valor default 0).

---

## 4. Cobro de cuenta abierta (FEAT-190)

Con la sessión activa:

1. En la lista de **"Cuentas Pendientes"** aparecen los pedidos con cuenta abierta.
2. Clic en **"Cobrar"** → abre el modal de cobro.
3. Elegí **Forma de Pago** (efectivo / tarjeta / mixto), ingresá **Propina** (default 10%) y **Efectivo Recibido**.
4. Clic en **"Confirmar Cobro"** → imputa el pago como `CashMovement` en la sessión de caja y marca el pedido como pagado.

> **Bloqueo actual:** sin cajas configuradas no se puede abrir la sessión, por lo que el paso 1 falla con *"Abrí la sessión de caja antes de cobrar (PIN de cajero)"*.

---

## 5. Capturas del estado real

| Paso | Captura | Estado |
|---|---|---|
| 1. Listado de cajas | `screenshots/cashier-01-cajas-vacias.png` | 0 cajas, Select vacío |
| 2. Modal de PIN | `screenshots/cashier-02-modal-pin.png` | Sin caja seleccionable |
| 3. Modal de cobro | (no disponible sin sessión activa) | Flujo bloqueado |

---

## 6. Próximos pasos

1. ✅ **Crear las cajas reales** por API (ver §2) — **COMPLETADO 2026-10-20**: Caja Principal, Barra, Terraza, Caja Auxiliar.
2. ✅ **Asignar accessos** (`POST /api/v1/cash-registers/access`) a los 4 cajeros — **COMPLETADO**: 10 accessos (4 en Principal, 2 en Barra, 2 en Terraza, 2 en Auxiliar).
3. ⚠️ **Completar las CI placeholder** de Giovanni y Giuliana Benedetti con `PUT /api/v1/hr/employees/:id` (`nationalId`) antes de que el sync a Odoo las use.
4. Volver a correr el spec para regenerar las capturas con cajas configuradas y verificar el flujo completo de cobro.

---

## 7. Comando de regeneración

```bash
cd frontend
PLAYWRIGHT_BASE_URL=https://provecchio.com \
PLAYWRIGHT_API_URL=https://provecchio.com \
npx playwright test e2e/cashier-manual.spec.ts --project=chromium
```