# Flujo detallado de Split Payments  
## OmniGastro / FEAT-116 + FEAT-125

**Proyecto:** OrderFlow / OmniFlow → OmniGastro  
**Módulos:** OmniDineIn – Split Billing + Guest Experience  
**Fecha:** 3 de septiembre 2026  
**Documento:** `docs/planes/pos-kds/Flujo_Split_Payments_OmniGastro.md`

---

## 1. Objetivo

Permitir cerrar una cuenta (mesa o pedido) dividiendo el pago de forma flexible, manteniendo:

- Integridad de caja (`PosSession`)
- Trazabilidad por comensal / ítem
- Compatibilidad con cobro en mesa (Waiter Custody) y pago digital
- Posibilidad de tips por parte
- Prorrateo automático de ítems compartidos (`seatNumber = 0` / `isShared = true`)

---

## 2. Métodos de división soportados

| Método | Código | Descripción | Quién define las partes |
|--------|--------|-------------|-------------------------|
| **Por asiento / comensal** | `BY_SEAT` | Agrupa automáticamente las `OrderLine` por `guestId` / `seatNumber` y prorratea ítems compartidos | Sistema |
| **Por ítem** | `BY_ITEM` | El mozo/cajero asigna manualmente cada línea a un pagador | Mozo / cajero |
| **Partes iguales** | `EQUAL_PARTS` | Divide el total neto entre N personas | Mozo indica `parts` |
| **Montos libres** | `CUSTOM_AMOUNT` | Cada pagador indica cuánto paga (debe sumar el total) | Mozo / cliente |

---

## 3. Modelo de datos

```prisma
model BillSplit {
  id            String         @id @default(uuid())
  tenantId      String
  orderId       String
  method        String         // BY_SEAT | BY_ITEM | EQUAL_PARTS | CUSTOM_AMOUNT
  parts         Int?
  createdById   String
  createdAt     DateTime       @default(now())
  isDeleted     Boolean        @default(false)
  deletedAt     DateTime?

  splitPayments SplitPayment[]

  @@index([orderId])
  @@map("bill_splits")
}

model SplitPayment {
  id            String    @id @default(uuid())
  billSplitId   String
  billSplit     BillSplit @relation(fields: [billSplitId], references: [id], onDelete: Restrict)
  guestId       String?
  amount        Decimal   @db.Decimal(15, 2)
  tipPortion    Decimal   @default(0) @db.Decimal(15, 2)
  paymentType   String    // CASH | CARD | QR | TRANSFER | PENDING
  status        String    @default("pending") // pending | paid | voided
  paidAt        DateTime?
  isDeleted     Boolean   @default(false)
  deletedAt     DateTime?

  @@map("split_payments")
}
```

**Regla de cierre:**  
La `Order` solo pasa a `paymentStatus: paid` cuando **todos** los `SplitPayment` del `BillSplit` activo están en estado `paid`.

---

## 4. Flujo paso a paso

### Fase A — Crear el split

```
POST /api/v1/orders/:orderId/split
{
  "method": "BY_SEAT" | "BY_ITEM" | "EQUAL_PARTS" | "CUSTOM_AMOUNT",
  "parts": 3,                    // solo EQUAL_PARTS
  "assignments": [               // BY_ITEM o CUSTOM_AMOUNT
    {
      "guestId": "...",
      "label": "Comensal 1",
      "orderLineIds": ["..."],   // BY_ITEM
      "amount": 85000            // CUSTOM_AMOUNT
    }
  ],
  "sharedStrategy": "EQUAL"      // opcional: EQUAL | ASSIGN_TO_HOST | EXCLUDE
}
```

#### Lógica por método

**BY_SEAT**
- Agrupa `OrderLine` por `guestId` (o `seatNumber` si no hay guest).
- Ítems compartidos (`seatNumber = 0` o `isShared = true`) se prorratean equitativamente entre los comensales activos (ver sección 5).
- Genera un `SplitPayment` por comensal.

**BY_ITEM**
- El body trae explícitamente qué `orderLineIds` van a cada parte.
- Validación: todas las líneas de la orden deben estar asignadas exactamente una vez.

**EQUAL_PARTS**
- `amount_i = totalAmount / parts`.
- La última parte absorbe el residual de redondeo.
- No requiere `guestId`.

**CUSTOM_AMOUNT**
- Montos libres indicados por el mozo/cliente.
- Validación: `sum(amounts) === order.totalAmount` (tolerancia de 1 unidad de moneda base).

**Resultado de la Fase A**
- Se crea un `BillSplit` + N `SplitPayment` en estado `pending`.
- La orden pasa a `SPLIT_PENDING`.

---

### Fase B — Cobrar cada parte

```
POST /api/v1/orders/split-payments/:splitPaymentId/pay
{
  "paymentType": "CASH" | "CARD" | "QR" | "TRANSFER",
  "tipPortion": 5000,
  "custody": true,
  "tendered": 100000,
  "authCode": "..."
}
```

**Reglas al pagar una parte**

1. Exige permiso `cash:collect` + `PosSession` en estado `OPEN`.
2. Crea el `CashMovement` vinculado a la sesión activa y a `registeredById`.
3. Si `custody: true` → el movimiento queda en custodia del mozo hasta el handover.
4. Marca el `SplitPayment` como `paid` + `paidAt = now()`.
5. Si era el **último** `SplitPayment` pendiente:
   - `Order.paymentStatus = paid`
   - `Order.status` → `SETTLED_BY_WAITER` (si hubo custody) o `FULLY_CLOSED` / `PAID`
   - Mesa → `CLEANING` o `FREE` (según política)
   - Posible emisión de factura electrónica (SIFEN / FacturaSend)

---

### Fase C — Casos especiales

| Caso | Tratamiento |
|------|-------------|
| **Pagos mixtos en una misma parte** | Varios sub-pagos o varios `SplitPayment` CUSTOM para el mismo guest |
| **Tip por parte** | Campo `tipPortion`; consolidable en tip-pool del turno |
| **Cliente paga su parte desde el menú digital** | Pay-link / Preference solo por el `amount` de ese `SplitPayment`; webhook marca `paid` |
| **Cambiar el split después de cobrar alguna parte** | No permitido. Solo void (supervisor) + recrear |
| **Ítems compartidos** | Ver sección 5 (prorrateo) |

---

## 5. Lógica de prorrateo de ítems compartidos (BY_SEAT)

### 5.1 Principio

- Líneas con `guestId` o `seatNumber > 0` y `isShared = false` → van **enteras** a ese comensal.
- Líneas con `seatNumber = 0` o `isShared = true` → se **dividen equitativamente** entre los comensales activos.
- El residual de redondeo se asigna a la **última parte**.

### 5.2 Estrategias configurables (`sharedStrategy`)

| Valor | Comportamiento |
|-------|----------------|
| `EQUAL` (default) | Prorrateo equitativo entre todos los comensales activos |
| `ASSIGN_TO_HOST` | Todo lo compartido se asigna a la silla 1 (punto pivote) |
| `EXCLUDE` | Las líneas compartidas no entran al split automático; el mozo las asigna a mano con `BY_ITEM` |

### 5.3 Implementación de referencia

```ts
import { Decimal } from '@prisma/client/runtime/library';

type OrderLineForSplit = {
  id: string;
  guestId: string | null;
  seatNumber: number;
  isShared: boolean;
  subtotal: Decimal;
};

type GuestPart = {
  guestId: string | null;
  seatNumber: number;
  label: string;
  lineIds: string[];
  amount: Decimal;
};

export function prorationBySeat(
  lines: OrderLineForSplit[],
  activeGuests: { guestId: string | null; seatNumber: number; label: string }[],
  currencyDecimals = 0, // PYG = 0; USD = 2
): { parts: GuestPart[]; sharedTotal: Decimal; residual: Decimal } {
  if (activeGuests.length === 0) {
    throw new Error('No hay comensales activos para prorratear');
  }

  const n = activeGuests.length;
  const factor = new Decimal(10).pow(currencyDecimals);

  const owned = new Map<string, { lineIds: string[]; amount: Decimal }>();
  let sharedTotal = new Decimal(0);
  const sharedLineIds: string[] = [];

  for (const line of lines) {
    const isShared = line.isShared || line.seatNumber === 0 || !line.guestId;

    if (isShared) {
      sharedTotal = sharedTotal.plus(line.subtotal);
      sharedLineIds.push(line.id);
      continue;
    }

    const key = line.guestId ?? `seat:${line.seatNumber}`;
    const prev = owned.get(key) ?? { lineIds: [], amount: new Decimal(0) };
    prev.lineIds.push(line.id);
    prev.amount = prev.amount.plus(line.subtotal);
    owned.set(key, prev);
  }

  const rawShare = sharedTotal.div(n);
  const shareTrunc = rawShare.mul(factor).floor().div(factor);

  const parts: GuestPart[] = [];
  let assignedShared = new Decimal(0);

  activeGuests.forEach((guest, index) => {
    const key = guest.guestId ?? `seat:${guest.seatNumber}`;
    const own = owned.get(key) ?? { lineIds: [], amount: new Decimal(0) };
    const isLast = index === n - 1;

    const sharedForThis = isLast
      ? sharedTotal.minus(assignedShared)
      : shareTrunc;

    if (!isLast) {
      assignedShared = assignedShared.plus(shareTrunc);
    }

    parts.push({
      guestId: guest.guestId,
      seatNumber: guest.seatNumber,
      label: guest.label,
      lineIds: [...own.lineIds, ...sharedLineIds],
      amount: own.amount.plus(sharedForThis),
    });
  });

  const residual = sharedTotal.minus(shareTrunc.mul(n - 1));

  return { parts, sharedTotal, residual };
}
```

### 5.4 Ejemplo numérico (PYG)

| Línea | seatNumber | isShared | Subtotal |
|-------|------------|----------|----------|
| Bife | 1 | false | 120.000 |
| Ensalada | 2 | false | 45.000 |
| Café | 3 | false | 15.000 |
| Picada (compartida) | 0 | true | 90.000 |

3 comensales → cuota compartida = 30.000

| Parte | Propio | Prorrateo | Total a pagar |
|-------|--------|-----------|---------------|
| Silla 1 | 120.000 | 30.000 | **150.000** |
| Silla 2 | 45.000 | 30.000 | **75.000** |
| Silla 3 | 15.000 | 30.000 | **45.000** |
| **Suma** | | | **270.000** |

Si el compartido no es divisible exacto (ej. 100.000 / 3):
- Partes 1 y 2 → 33.333  
- Parte 3 (última) → 33.334 (absorbe residual)

---

## 6. Diagrama de estados

```
Order OPEN / CLAIMED
        │
        ▼  POST /split
Order SPLIT_PENDING
  └── BillSplit
        ├── SplitPayment 1  pending ──► paid
        ├── SplitPayment 2  pending ──► paid
        └── SplitPayment N  pending ──► paid
                │
                ▼ (último paid)
Order SETTLED_BY_WAITER  o  PAID / FULLY_CLOSED
        │
        ▼ (si custody)
Handover a caja central
        │
        ▼
Order FULLY_CLOSED + factura electrónica
```

---

## 7. Integración con Claim y Guest Menu (FEAT-125)

- Un pedido `GUEST_DRAFT` **no se puede splitear** hasta que el mozo haga `claim`.
- Después del claim el mozo puede:
  1. Editar líneas / asientos
  2. Crear el split
  3. Cobrar parte por parte (en mesa o generando pay-links)
- El cliente, desde el menú digital, puede ver “Tu parte: ₲ X – Pagar” si se le generó un link de su `SplitPayment`.

---

## 8. Validaciones críticas

| Validación | Error si falla |
|------------|----------------|
| Suma de `SplitPayment.amount` = `Order.totalAmount` | 400 – montos no cuadran |
| Todas las líneas asignadas (`BY_ITEM`) | 400 – líneas sin asignar |
| Sesión de caja abierta al pagar | 400 – debe abrir caja |
| Re-split con partes ya pagadas | 409 – split ya parcialmente cobrado |
| Void de parte pagada | Requiere supervisor + `PosOrderAuditLog` |
| Split sobre `GUEST_DRAFT` sin claim | 400 – debe reclamar primero |

---

## 9. Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/orders/:id/split` | Crear BillSplit + SplitPayments |
| GET | `/api/v1/orders/:id/split` | Ver split actual |
| POST | `/api/v1/orders/split-payments/:id/pay` | Cobrar una parte |
| POST | `/api/v1/orders/split-payments/:id/pay-link` | Generar link/QR de pago para el cliente |
| POST | `/api/v1/orders/split-payments/:id/void` | Anular una parte (supervisor) |
| DELETE | `/api/v1/orders/:id/split` | Eliminar split (solo si ningún pago está `paid`) |

---

## 10. Pagos en mesa y custodia (resumen)

| Escenario | Quién cobra | Impacto en caja |
|-----------|-------------|-----------------|
| Mozo cobra en mesa | Mozo con `cash:collect` | Waiter Custody → handover a caja central |
| Cliente paga desde menú digital | Pasarela | CashMovement al confirmar webhook |
| Cajero en caja fija | Cajero con sesión abierta | CashMovement directo en su PosSession |
| Split + pagos mixtos | Combinación | Cada SplitPayment genera su movimiento |

**Regla:** no se cierra una `PosSession` si existen pagos en custodia (`SETTLED_BY_WAITER`) sin rendir.

---

## 11. Ejemplo completo de flujo

**Mesa 7 – 3 comensales – Total ₲ 270.000**

1. Mozo reclama el pedido (`CLAIMED`).
2. `POST /orders/{id}/split` con `method: "BY_SEAT"`.
3. Sistema crea 3 `SplitPayment`: 150.000 / 75.000 / 45.000.
4. Comensal 1 paga con tarjeta en mesa → `pay` (custody opcional).
5. Comensal 2 paga con QR desde el celular (pay-link).
6. Comensal 3 paga efectivo al mozo.
7. Al pagarse el último:
   - Orden → `SETTLED_BY_WAITER` o `FULLY_CLOSED`
   - Mesa → `CLEANING`
   - Si hubo custody → pendiente de handover a caja
   - Factura electrónica si corresponde

---

## 12. Criterios de aceptación

- [ ] `BY_SEAT` prorratea correctamente ítems compartidos y absorbe residual en la última parte
- [ ] `BY_ITEM`, `EQUAL_PARTS` y `CUSTOM_AMOUNT` validan integridad de montos y líneas
- [ ] No se puede splitear un `GUEST_DRAFT` sin claim previo
- [ ] No se puede modificar/eliminar un split con partes ya pagadas
- [ ] Cada pago de parte exige sesión de caja abierta y genera `CashMovement`
- [ ] El último pago cierra la orden y libera la mesa
- [ ] Custody + handover funcionan con splits parciales
- [ ] Pay-link por parte funciona desde el menú digital del cliente
- [ ] Todo queda registrado en `PosOrderAuditLog`

---

*Fin del documento — Flujo detallado de Split Payments (OmniGastro / FEAT-116 + FEAT-125)*
