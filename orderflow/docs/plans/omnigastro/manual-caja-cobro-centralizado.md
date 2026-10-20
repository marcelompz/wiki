# Manual: Caja Gastro & Cobro Centralizado (OmniGastro)

> **Para:** equipo de sala / cajeros de `provecchio.com`
> **Feature:** FEAT-190 (Cuenta abierta) · **Versión:** v1.39.16
> **Página:** `/admin/gastro/cashier` — 💵 Caja Gastro & Cobro Centralizado
> **Generado:** 2026-10-20 con Playwright (capturas reales contra `provecchio.com`)
> **No muta producción:** el spec solo navega y toma screenshots.

---

## 1. Estado actual (2026-10-20)

La tabla `cash_registers` está **vacía** en producción:

```sql
SELECT count(*) FROM cash_registers;  -- 0
```

Por lo tanto:
- El Select de "Seleccioná una caja" muestra **0 opciones**.
- El botón **"Abrir Caja"** no puede usarse (no hay caja que abrir).
- El cobro de la cuenta abierta **queda bloqueado**: el mozo no puede imputar el pago a ninguna caja.

No hay datos de prueba que eliminar — ya no hay nada.

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

1. **Creator las cajas reales** por API (ver §2) — ejemplo: "Caja Principal" (`CASHIER_1`), "Barra" (`CASHIER_2`), "Terraza" (`CASHIER_3`).
2. **Asignar accessos** (`POST /api/v1/cash-registers/access`) a los cajeros con `canOpen`/`canClose`/`canRefund`/`canDiscount`.
3. **Revisar el permiso `cash:manage`** del usuario admin si el POST falla con 403.
4. Volver a correr el spec para regenerar las capturas con cajas configuradas y verificar el flujo completo de cobro.

---

## 7. Comando de regeneración

```bash
cd frontend
PLAYWRIGHT_BASE_URL=https://provecchio.com \
PLAYWRIGHT_API_URL=https://provecchio.com \
npx playwright test e2e/cashier-manual.spec.ts --project=chromium
```