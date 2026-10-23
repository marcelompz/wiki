# Auditoría bug #8b — El cobro en `/admin/gastro/tables` pide PIN y devuelve HTTP 400

> **Punto:** 8b del [backlog del cliente](./BACKLOG_CLIENTE_20261019.md) (v1.39.9)
> **Rama:** `fix/gastro-tables-payment-pin-400`
> **Versión:** v1.39.12
> **Fecha:** 2026-10-20

---

## 1. Reporte del cliente

> At the endpoint `https://provecchio.com/admin/gastro/tables`, I am unable to process
> payments; for example, table **G5** has an order ready for payment, but when
> attempting to process it, the system requests a PIN and then returns an error:
>
> ```
> XHR POST https://provecchio.com/api/v1/public/hr/kiosk/pin/verify
> [HTTP/2 400  231ms]
> ```

## 2. Causa raíz

`HrKioskPublicController` resolvía el tenant **exclusivamente** a partir del
encabezado `x-tenant-id`:

```ts
const tenantId = req.headers['x-tenant-id'] as string;
if (!tenantId) {
  throw new BadRequestException('Falta el encabezado x-tenant-id');   // <-- HTTP 400
}
```

Pero el cliente HTTP del frontend **nunca envía ese encabezado**: el
interceptor de `frontend/src/services/api.ts` solo añade `Authorization: Bearer`
(o `x-api-key` en rutas no públicas). Para `/api/v1/public/**` ni siquiera envía
la API key, por ser una ruta "pública".

El tenant **ya estaba resuelto** por el `ApiKeyGuard` (que lo deja en
`request.tenant` a partir del JWT o de la API key): el controlador simplemente no
lo consultaba. El mismo antipatrón estaba en los dos endpoints del kiosco
(`pin/verify` y `pin/mark-attendance`); el resto del módulo HR ya usaba la cadena
correcta (`req.tenantId || req.tenant?.id || req.headers['x-tenant-id'] || req.user?.tenantId`).

**El 400 era, por tanto, un falso "falta el encabezado": el tenant estaba disponible.**

## 3. Correcciones aplicadas

| # | Archivo | Cambio |
|---|---|---|
| 1 | `backend/src/hr/hr-kiosk-public.controller.ts` | `resolveTenantId()` usa el contexto de la petición (`req.tenantId` → `req.tenant?.id` → `req.user?.tenantId`) y deja `x-tenant-id` como último recurso (override explícito). Aplica a `pin/verify` y `pin/mark-attendance`. |
| 2 | `frontend/src/services/api.ts` | Las rutas `/api/v1/public/hr/kiosk/**` sí envían la `x-api-key`: son endpoints públicos **por tenant** (tablets del salón sin sesión iniciada). Con la key, el `ApiKeyGuard` valida el tenant y el kiosco funciona sin login. |
| 3 | `frontend/src/pages/admin/gastro-tables.tsx` | El mensaje usaba `employee.name`, que el endpoint no devuelve (responde `firstName`/`lastName`) → "Mesa asignada a undefined". Ahora compone el nombre real. |
| 4 | `backend/src/orders/orders.service.ts` | `guestPending` (cola de la caja) expone `paymentPreconfirmedAt` y `paymentPreconfirmData`. El dato **se escribía pero nadie lo leía**: la caja no tenía forma de saber que el mozo ya había cobrado en mesa. |
| 5 | `frontend/src/pages/admin/gastro-cashier.tsx` | La caja muestra una etiqueta verde "Cobro preconfirmado: <mozo> · <hora>" en la cuenta pendiente. |

### Flujo resultante

```text
/admin/gastro/tables → [Cobrar] → modal PIN
   → POST /api/v1/public/hr/kiosk/pin/verify      (200, empleado)   <-- antes 400
   → POST /api/v1/orders/:id/payment-preconfirm   (200, preconfirmación)
   → el pedido aparece en /admin/gastro/cashier con la etiqueta "Cobro preconfirmado"
```

## 4. Validación

**Local** (`provecchio.local`, backend reconstruido con el fix):

```text
POST /api/v1/public/hr/kiosk/pin/verify  (Bearer, SIN x-tenant-id)
→ 200 {"id":"cmu498yae…","firstName":"Ivan","lastName":"Castillo","position":"Mozo",…}

POST /api/v1/orders/:id/payment-preconfirm {"method":"CASH","amount":18000}
→ 200 {"ok":true,"orderId":"62fb6a7a-…","meta":{…}}
```

- `tsc --noEmit` (backend y frontend): sin errores.
- Suite completa: **129 suites / 960 tests** en verde.

## 5. Relación con el punto 7

Este punto es independiente del sync a Odoo, pero ambos convergen en la misma
pantalla: con la v1.39.12 el cobro en mesa quedó además **configurable por tenant**
(`waiter_can_collect_payment`, por defecto `false` en Provecchio: el pago se
gestiona desde la caja). El frontend oculta la opción "Cobrar en mesa" cuando el
tenant la tiene deshabilitada.

## 6. Pendiente

- El mensaje "Cobro preconfirmado. **Mesa libre en breve.**" es una promesa del
  frontend que el backend no cumple por sí solo: la mesa queda liberada cuando la
  caja confirma el cobro (el estado de la mesa solo se actualiza en el traspaso).
  Revisar con el cliente si la mesa debe liberarse en el momento de la
  preconfirmación o al confirmar la caja.
