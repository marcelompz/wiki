# Prompts de Implementación — Alfa OmniGastro (48hs)

Cada prompt es autocontenido, basado en la auditoría real del repo (no en los documentos generados por IA). GASTRO-001 y GASTRO-004 se pueden ejecutar en paralelo. GASTRO-002 depende de GASTRO-001. GASTRO-003 es independiente.

---

## GASTRO-001 — Modelo mínimo de Mesas

```
Contexto: en el backend NestJS de OrderFlow (Prisma + PostgreSQL), hoy no
existe ningún modelo de Mesa. El frontend (frontend/pos.tsx) usa un campo
de texto libre (selectedTable) que se guarda como string dentro de
Order.metadata (metadata.table). Esto significa que no hay forma de listar
mesas ocupadas/libres, ni de evitar inconsistencias de nombre entre mozos.

Tarea:
1. Agregar a schema.prisma un modelo mínimo:

   model RestaurantTable {
     id        String   @id @default(uuid())
     tenantId  String
     name      String   // ej. "Mesa 1", "Barra 3"
     status    String   @default("FREE") // FREE | OCCUPIED
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt

     tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
     orders Order[]

     @@index([tenantId])
     @@map("restaurant_tables")
   }

   No agregues capacidad, mapa visual, ni posición x/y — no entra en el
   alfa. Solo id, nombre y estado.

2. Agregar tableId String? opcional al modelo Order (relación a
   RestaurantTable), manteniendo metadata.table como está por
   compatibilidad con datos existentes durante la transición.

3. Generar la migración con `prisma migrate dev --name add_restaurant_tables`
   (NO usar db push).

4. Crear un módulo NestJS simple `tables` (siguiendo el patrón de otros
   módulos del backend, ej. products o customers) con:
   - GET /api/v1/tables — lista todas las mesas del tenant con su status
   - POST /api/v1/tables — crea una mesa nueva (name)
   - PATCH /api/v1/tables/:id — actualiza name o status

5. En frontend/pos.tsx, reemplazar el <Input> de texto libre de
   selectedTable por un selector que consuma GET /api/v1/tables y permita
   elegir una mesa existente (o crear una nueva rápido desde el mismo
   selector, para no trabar el flujo del mozo).

Criterio de aceptación: un mozo puede ver la lista real de mesas del
local, elegir una, y el pedido queda asociado a tableId (no solo al
string libre en metadata).
```

---

## GASTRO-002 — Ciclo de vida de Cuenta Abierta

```
Contexto: depende de GASTRO-001 ya aplicado (modelo RestaurantTable y
Order.tableId existentes). Hoy el flujo de Order es DRAFT -> CONFIRMED
directo (ver OrderStatus enum en schema.prisma). No existe un estado
intermedio que permita a un mozo seguir agregando productos a la cuenta
de una mesa durante un rato antes de que el cajero cobre.

Tarea:
1. Al marcar una RestaurantTable como OCCUPIED (cuando se crea el primer
   pedido de esa mesa), la Order en estado DRAFT actúa como la "cuenta
   abierta" de esa mesa. No hace falta un modelo TableSession separado
   para el alfa — alcanza con:
   - Si ya existe una Order en DRAFT para esa RestaurantTable, agregar
     las nuevas líneas a esa misma Order en vez de crear una Order nueva.
   - Si no existe, crear la Order en DRAFT y marcar la mesa como OCCUPIED.
2. Agregar un endpoint GET /api/v1/tables/:id/active-order que devuelva
   la Order en DRAFT asociada a esa mesa (o null si no hay ninguna),
   para que el frontend sepa si está "agregando a una cuenta existente"
   o "abriendo una cuenta nueva".
3. En frontend/pos.tsx, en handleSendComanda: antes de crear una Order
   nueva, consultar GET /api/v1/tables/:id/active-order. Si existe,
   agregar las líneas del carrito actual a esa Order (vía un endpoint
   PATCH /api/v1/orders/:id/add-lines a crear, que haga push de nuevas
   OrderLine sin tocar el status) en vez de crear una Order nueva.
4. Al confirmar el pago (handleProcessPayment, ya existente), además de
   pasar la Order a CONFIRMED, marcar la RestaurantTable asociada como
   FREE de nuevo.
5. No implementar todavía: split-bill, transferencia de mesa, ni
   fusión de cuentas — eso queda para después del alfa.

Criterio de aceptación: un mozo puede mandar dos comandas separadas a la
misma mesa en momentos distintos de la noche, y ambas terminan en la
misma cuenta/Order, que se cobra una sola vez al final. Al cobrar, la
mesa vuelve a estar libre para el siguiente cliente.
```

---

## GASTRO-003 — Servicio de Caja (apertura/cierre básico)

```
Contexto: en schema.prisma ya existe el modelo CashMovement, completo y
listo para usar (type IN/OUT, amount, paymentType, posSessionId, etc.),
pero ningún service ni controller del backend lo usa todavía — es
schema sin lógica de negocio.

Tarea:
1. Crear un módulo NestJS `cash` con un CashMovementsService que exponga:
   - openRegister(tenantId, amount, registeredBy): crea un CashMovement
     con type: "IN", category: "OPENING_FLOAT", amount, paymentType:
     "cash". Este movimiento marca el inicio de un turno de caja.
   - registerSale(tenantId, orderId, amount, paymentType, registeredBy):
     crea un CashMovement con type: "IN", category: "SALE", orderId,
     amount, paymentType. Invocar esto automáticamente desde
     orders.service.ts en el método que confirma el pago (el mismo que
     ya llama OrdersGateway.emitOrderStatusUpdate), para no depender de
     que el frontend lo dispare aparte.
   - registerWithdrawal(tenantId, amount, notes, registeredBy): crea un
     CashMovement con type: "OUT", category: "OPERATIONAL_EXPENSE" o
     "WITHDRAWAL", amount, notes.
   - closeRegister(tenantId, since: Date): suma todos los CashMovement
     del tenant desde `since` (el momento de la última apertura),
     separando IN de OUT y agrupando por paymentType. Devuelve el
     resumen (no hace falta un Reporte X/Z formal ni PDF para el alfa,
     con un JSON con los totales alcanza).

2. Crear endpoints:
   - POST /api/v1/cash/open (amount)
   - POST /api/v1/cash/withdrawal (amount, notes)
   - GET /api/v1/cash/summary?since=<ISO date> (cierre/resumen del turno)

3. En frontend/pos.tsx (o una pantalla nueva simple si no encaja bien en
   la existente), agregar:
   - Un botón "Abrir caja" que pida el monto de fondo inicial y llame a
     POST /api/v1/cash/open.
   - Un botón "Cerrar caja" que llame a GET /api/v1/cash/summary?since=
     (el timestamp de la última apertura, guardado en el estado local o
     recuperado del último movimiento OPENING_FLOAT) y muestre el
     resumen en pantalla.

Criterio de aceptación: al final del turno, el cajero puede ver cuánto
efectivo/tarjeta se cobró desde la apertura, sin tener que sumarlo a
mano. No hace falta Reporte X/Z formal, tip pool, ni multi-caja
simultánea para el alfa.
```

---

## GASTRO-004 — UI de selección de modificadores en el POS

```
Contexto: el backend de OrderFlow ya soporta modificadores end-to-end:
existen los modelos ModifierGroup, ModifierOption, ModifierGroupCategory
y OrderLineModifier en schema.prisma, y orders.service.ts ya sabe
resolver modifierOption, calcular modifierPriceDeltaSum, y guardar los
OrderLineModifier al crear una Order (ver createOrderDto.lines[].modifiers
en orders.service.ts). El único gap es que frontend/pos.tsx no tiene
ninguna UI para seleccionar modificadores al agregar un producto al
carrito — hoy el payload que arma pos.tsx nunca incluye `modifiers`.

Tarea:
1. Al agregar un producto al carrito en pos.tsx, si ese producto tiene
   ModifierGroups asociados (vía ModifierGroupCategory, que vincula
   grupos de modificadores a categorías de producto), abrir un modal o
   panel que muestre los grupos y sus opciones antes de confirmar el
   agregado al carrito. Necesitarás un endpoint (o extender uno
   existente en products.controller.ts) que devuelva, dado un
   productId, los ModifierGroups aplicables con sus ModifierOptions.
2. Respetar selectionType (SINGLE/MULTIPLE ya está en el schema como
   ModifierSelectionType), required, minSelect y maxSelect de cada
   ModifierGroup al validar la selección del mozo antes de permitir
   agregar el producto al carrito.
3. Guardar en el estado del carrito (junto a product y quantity) la
   lista de modifiers seleccionados: [{ optionId }, ...].
4. Al armar el orderPayload en handleSendComanda, incluir por cada línea
   del carrito su array modifiers: item.modifiers?.map(m => ({
   optionId: m.optionId })) — el backend ya sabe procesarlo.
5. Mostrar los modificadores elegidos en el resumen del carrito (ej.
   "1x Café — Leche de almendras, Extra shot") y en el detalle de cobro
   del cajero (selectedOrder.orderLines[].modifiers ya viene incluido
   en la respuesta del backend, según orders.service.ts línea ~170
   donde include: { modifiers: true }).

Criterio de aceptación: un mozo puede agregar un producto con
modificadores seleccionados al carrito, mandarlo como comanda, y tanto
el KDS como el detalle de cobro del cajero muestran los modificadores
elegidos con su impacto correcto en el precio.
```
