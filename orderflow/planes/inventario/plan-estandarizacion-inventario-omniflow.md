# Plan de Estandarización de Gestión de Inventario — OmniFlow

**Contexto:** OmniFlow no está en producción. Se aplica una migración directa (big-bang), sin fases de convivencia entre sistemas ni reconciliación gradual.

**Diagnóstico previo:** existen dos sistemas de stock paralelos y desconectados:
- **Sistema A (en uso real):** `Product.stockAvailable` — un `Int` plano, decrementado directamente en `orders.service.ts`, leído por catálogo/social-catalog/sync.
- **Sistema B (construido pero huérfano):** `Warehouse → Location → StockQuant/StockMove`, con `InventoryService.executeStockMove()` (movimiento de doble entrada) y `reserveStock()`/`releaseStockReservation()`. Nunca invocado desde ventas.

**Decisión de arquitectura:** `StockQuant`/`StockMove` pasa a ser la única fuente de verdad. `Product.stockAvailable` se convierte en un campo cacheado, actualizado síncronamente por `InventoryService` dentro de la misma transacción que cada `StockMove` (mismo patrón que `qty_available` en Odoo).

---

## Paso 1 — Auditoría de escritores y lectores de `stockAvailable`

**Objetivo:** mapear todos los puntos de código que leen o escriben `Product.stockAvailable`, antes de tocar nada, para no dejar ningún camino colgado.

**Prompt para desarrollo:**
```
Buscá en todo el repositorio (backend/) todas las referencias a `stockAvailable`
en el modelo Product. Para cada archivo que aparezca, indicá:
1. Si lee o escribe el campo (o ambos).
2. La línea de código exacta.
3. Si escribe: si es un decrement/increment relativo o un set absoluto.
4. El flujo de negocio al que pertenece (venta, ajuste manual, import externo,
   catálogo, sync, otro).

Presentá el resultado como una tabla: archivo | línea | lectura/escritura | flujo.
No modifiques ningún archivo todavía, esto es solo diagnóstico.
```

---

## Paso 2 — Extender `InventoryService.executeStockMove()` para mantener el cache

**Objetivo:** que cada `StockMove` actualice automáticamente `Product.stockAvailable` como campo cacheado, dentro de la misma transacción atómica.

**Prompt para desarrollo:**
```
En backend/inventory/inventory.service.ts, modificá `executeStockMove()` para que,
dentro de la misma transacción de Prisma que crea el StockMove y actualiza los
StockQuant de origen y destino, también recalcule y actualice
Product.stockAvailable para el producto afectado, sumando las cantidades de
StockQuant de ese producto en locations de tipo "interno" (excluyendo locations
de tipo cliente/proveedor) para el tenant correspondiente.

Requisitos:
- La actualización de Product.stockAvailable debe ir en la MISMA transacción
  Prisma que el resto del movimiento, para que no puedan quedar desincronizados.
- Si el producto tiene stock en múltiples warehouses/locations internas, el
  campo cacheado es la suma total (no por warehouse).
- Agregá un test que verifique que después de executeStockMove(), 
  Product.stockAvailable coincide con SUM(StockQuant.quantity) en locations
  internas para ese producto.
```

---

## Paso 3 — Migrar `orders.service.ts` para usar `executeStockMove()`

**Objetivo:** reemplazar el decrement/increment directo sobre `Product.stockAvailable` por una llamada al motor de doble entrada.

**Prompt para desarrollo:**
```
En backend/orders/orders.service.ts, ubicá todos los puntos donde se modifica
stockAvailable directamente (ej: `stockAvailable: { decrement: line.quantity }`
o `{ increment: ... }` en casos de cancelación/devolución).

Reemplazá cada uno por una llamada a InventoryService.executeStockMove() con:
- Location origen: la location interna del warehouse correspondiente al tenant
  (o al warehouse específico si el pedido lo especifica).
- Location destino: una location de tipo "cliente" (crear una location genérica
  de tipo "customer" por tenant si no existe todavía).
- Cantidad: line.quantity.
- Reference: el ID del pedido (orderId), para trazabilidad en el kardex.
- Para cancelaciones o devoluciones: el movimiento inverso (Cliente → Interno).

Ya no debe quedar ningún `update` directo sobre Product.stockAvailable en este
archivo — todo pasa por executeStockMove(), que ya actualiza el cache
internamente (Paso 2).

Verificá que las transacciones existentes de creación de pedido sigan siendo
atómicas: si executeStockMove() falla (ej: stock insuficiente), la creación
del pedido debe revertirse completa.
```

---

## Paso 4 — Migrar los demás escritores identificados en el Paso 1

**Objetivo:** que absolutamente ningún flujo escriba `stockAvailable` fuera de `InventoryService`.

**Prompt para desarrollo:**
```
Usando la tabla de escritores generada en el Paso 1, para cada archivo que
escribe stockAvailable fuera de orders.service.ts (por ejemplo ajustes
manuales desde POS, o sync-products.controller.ts):

1. Si es un ajuste manual de stock (ej: conteo físico, corrección): reemplazar
   por una llamada a InventoryService con un tipo de movimiento "ajuste"
   (Location interna ↔ Location de tipo "ajuste/pérdida", según sea positivo
   o negativo), para que quede registrado en StockMove con motivo "ajuste
   manual".

2. Si es sync-products.controller.ts (import desde ERP externo): reemplazar el
   override directo del campo por un movimiento de tipo "ajuste por
   sincronización externa", calculando la diferencia entre el stock actual
   (StockQuant sumado) y el valor importado, y generando un StockMove por esa
   diferencia. Esto deja auditado en el kardex cada vez que el ERP externo
   corrige una cantidad.

Al terminar, hacé un grep final de `stockAvailable.*:` en backend/ para
confirmar que no queda ningún `update`/`increment`/`decrement` directo fuera
de inventory.service.ts.
```

---

## Paso 5 — Migrar lecturas a confiar en el campo cacheado (sin cambios funcionales, solo limpieza)

**Objetivo:** dejar explícito en el código que `Product.stockAvailable` es un valor derivado, no editable directamente desde otros módulos.

**Prompt para desarrollo:**
```
En backend/products/products.service.ts, backend/catalog (o donde esté
catalog.service.ts) y backend/social-catalog/social-catalog.service.ts:

Las lecturas de Product.stockAvailable pueden quedar como están (ya que ahora
el campo siempre está sincronizado por InventoryService). Agregá un comentario
en el modelo Product del schema.prisma dejando explícito que stockAvailable es
un campo cacheado, de solo lectura desde fuera de inventory.service.ts, y que
la fuente de verdad es StockQuant.

Opcional pero recomendado: agregá un constraint a nivel de code review /
lint (o un test de integración) que falle si aparece un `prisma.product.update`
que incluya `stockAvailable` fuera de backend/inventory/.
```

---

## Paso 6 — Activar reservas de stock

**Objetivo:** que un pedido pendiente de pago/confirmación en e-commerce o B2B reserve stock sin moverlo físicamente hasta el despacho.

**Prompt para desarrollo:**
```
En el flujo de creación de pedido pendiente (e-commerce y B2B, antes de la
confirmación/pago), llamá a InventoryService.reserveStock() en vez de mover
stock directamente. Al confirmarse el pedido (pago aprobado o aprobación B2B),
convertí la reserva en un movimiento real vía executeStockMove() y liberá la
reserva con releaseStockReservation().

Si el pedido se cancela o expira sin confirmarse, llamá a
releaseStockReservation() para devolver la cantidad reservada a disponible.

Asegurate de que Product.stockAvailable (cacheado) refleje "disponible para
vender" = stock físico - reservas activas, no solo el stock físico total.
Puede requerir un segundo campo cacheado (ej: stockReserved) o ajustar el
cálculo del Paso 2 para restar reservas.
```

---

## Paso 7 — Definir política de `BillOfMaterials` y reordering rules (backlog, no bloqueante)

**Objetivo:** dejar registrado que quedan fuera de este alcance inmediato.

**Prompt para desarrollo (a futuro, no ejecutar ahora):**
```
BillOfMaterials no tiene service. Cuando se aborde manufactura/consumo de
insumos, el consumo de cada componente debe generar también un StockMove
(Location interna de insumos → Location de "consumo de producción"), siguiendo
el mismo motor de doble entrada ya construido — no un contador aparte.

Reordering rules (alertas o compras automáticas cuando StockQuant cae bajo un
mínimo) requieren un job programado nuevo que no existe hoy. No implementar
hasta que el resto de este plan esté validado en uso real.
```

---

## Paso 8 — Costo en destino (landed cost) e impuestos de importación atados al producto

**Objetivo:** que el costo real de la mercadería (compra + flete internacional + aduana + impuestos de importación + flete interno + estibaje) viaje pegado a cada unidad física a lo largo de toda su vida — incluyendo transferencias entre sucursales y ventas ya registradas — corrigiendo el problema detectado en Odoo, donde el costo en destino se perdía al trasladar mercadería entre depósitos.

**Principio de diseño:** el costo unitario se guarda a nivel de `StockQuant` (no solo como promedio en `Product`), y se identifica por un `receiptId` (recepción de compra) que lo acompaña sin importar en qué `Location` esté hoy. Las transferencias internas heredan el costo del quant de origen; nunca lo recalculan contra un promedio general.

### 8.1 — Agregar costo unitario a `StockQuant` y modelo de recepción

**Prompt para desarrollo:**
```
En backend/schema.prisma:

1. Agregá un modelo PurchaseReceipt (o similar) con: id, tenantId, supplierId,
   fecha, moneda, y un campo status (abierto/cerrado para ajustes de costo).

2. Agregá a StockQuant: receiptId (FK opcional a PurchaseReceipt, nullable
   para stock que no tiene trazabilidad de compra, ej. ajustes históricos) y
   unitCost (Decimal, costo unitario vigente de esa cantidad específica).

3. Agregá un modelo CostAdjustment con: id, receiptId (FK), tipo (enum:
   flete_internacional, derechos_aduana, impuesto_no_recuperable,
   impuesto_recuperable, flete_interno, estibaje, otro), monto, moneda,
   fecha, esRecuperable (Boolean — ver punto 8.3 sobre impuestos), y una
   relación a los productos/líneas de esa recepción si el ajuste no aplica
   parejo a todo (ej. flete que se prorratea distinto por peso vs. aduana
   que se prorratea por valor).

No migres datos todavía, esto es solo el modelo.
```

### 8.2 — Registrar la compra con costo en destino prorrateado

**Prompt para desarrollo:**
```
Creá un service backend/inventory/landed-cost.service.ts con una función
registerPurchaseReceipt() que reciba:
- Las líneas de compra (producto, cantidad, costo de compra unitario en
  moneda de origen).
- Los CostAdjustment del embarque (flete internacional, aduana, impuestos,
  flete interno, estibaje), cada uno con su monto y una base de prorrateo
  (por valor de compra, por cantidad, o por peso/volumen — tomalo como
  parámetro configurable por tipo de ajuste, no hardcodeado).

La función debe:
1. Crear el PurchaseReceipt y los CostAdjustment.
2. Prorratear cada CostAdjustment entre las líneas de compra según su base
   (ej: aduana se prorratea por valor de compra; flete interno por peso si
   el producto tiene ese dato, si no por cantidad).
3. Calcular el unitCost final de cada línea = costo de compra unitario +
   suma de ajustes prorrateados / cantidad.
4. Llamar a InventoryService.executeStockMove() para dar entrada al stock
   (Location proveedor → Location interna), pasando el unitCost calculado
   y el receiptId, para que el StockQuant resultante quede con ambos.

Agregá un test que verifique que la suma de (unitCost * cantidad) de todas
las líneas coincide con el costo de compra total + todos los CostAdjustment
del receiptId (a menos de redondeo).
```

### 8.3 — Impuestos: separar recuperables de no recuperables

**Objetivo:** aunque los impuestos se calculan aparte (ej. en el proceso de despacho aduanero), deben quedar asociados al producto para que el costeo sea correcto — pero no todos impactan el costo de inventario de la misma forma.

**Prompt para desarrollo:**
```
En landed-cost.service.ts, al procesar los CostAdjustment de tipo impuesto:

- Si esRecuperable = true (ej. IVA crédito fiscal recuperable): el monto NO
  se suma al unitCost de valuación de inventario, pero igual se registra
  asociado al receiptId/producto para trazabilidad fiscal y reportes (no
  afecta el precio de venta ni el margen).

- Si esRecuperable = false (ej. derechos de aduana, impuestos no
  recuperables en el régimen del tenant): el monto SÍ se prorratea y suma
  al unitCost, igual que flete o estibaje.

Este flag debe ser configurable por tenant y por tipo de impuesto (algunos
tenants pueden recuperar IVA importación, otros no, según su régimen fiscal).
Agregá el campo esRecuperable como parámetro obligatorio al crear un
CostAdjustment de tipo impuesto — no debe quedar como default implícito.
```

### 8.4 — Heredar costo en transferencias internas (el fix al bug de Odoo)

**Prompt para desarrollo:**
```
En InventoryService.executeStockMove(), cuando el tipo de movimiento es una
transferencia interna (Location interna → Location interna, ej. depósito
central → sucursal):

El StockQuant que se crea/incrementa en la location destino debe heredar el
unitCost y el receiptId del StockQuant de origen — NUNCA recalcularlo contra
Product.costPricePmp ni ningún promedio general.

Si el movimiento junta cantidades de distintos receiptId (ej. se transfieren
20 unidades pero corresponden a 2 recepciones distintas con costos
distintos), el movimiento debe generar StockQuant separados por receiptId en
destino, no un solo quant con costo promediado — para no perder trazabilidad.

Agregá un test: comprar con landed cost, transferir a otra sucursal, y
verificar que el unitCost en la sucursal destino es idéntico al de origen.
```

### 8.5 — Ajuste retroactivo cuando el costo en destino llega tarde

**Objetivo:** resolver el caso real que rompía en Odoo — la factura de aduana o flete llega después de que la mercadería ya se movió o se vendió.

**Prompt para desarrollo:**
```
Agregá a landed-cost.service.ts una función applyLateCostAdjustment() que
reciba un receiptId y un nuevo CostAdjustment (ej. la factura de aduana que
llegó tarde).

La función debe:
1. Buscar TODOS los StockQuant activos con ese receiptId, sin importar en
   qué Location estén ahora (pueden estar en el depósito original o ya
   transferidos a una sucursal).
2. Recalcular y actualizar el unitCost de cada uno, prorrateando el nuevo
   ajuste igual que en el registro original (8.2).
3. Buscar también los StockMove de tipo "venta" (salida a cliente) que se
   originaron de ese receiptId pero ya no tienen StockQuant activo (se
   vendieron): para esos, generar un registro de "ajuste de costo de venta
   histórico" (no modifica stock, solo el COGS reportado de ese pedido) para
   que el margen reportado de ventas pasadas se corrija.
4. Actualizar Product.stockAvailable / el costo cacheado en Product para que
   catálogo y pricing reflejen el nuevo costo promedio del producto.

Este es el caso que fallaba en Odoo: ahí el ajuste se buscaba por location de
origen, entonces si el stock ya se había movido, el ajuste no llegaba. Acá se
busca por receiptId, que es independiente de la location.
```

### 8.6 — Pricing sobre costo real

**Prompt para desarrollo:**
```
En el service de pricing (o donde se calcule el precio de venta sugerido),
agregá una opción para calcular el margen sobre el unitCost del StockQuant
específico que se va a vender (siguiendo la lógica FIFO: el quant más
antiguo con receiptId asociado), en vez de sobre Product.costPricePmp
(promedio general).

Dejalo como configuración por tenant o por producto: "margen sobre costo
real (FIFO)" vs "margen sobre costo promedio (PMP)" — algunos rubros
(commodities de rotación rápida) prefieren PMP por simplicidad, otros
(importación con landed cost variable) necesitan costo real para no vender
por debajo del costo efectivo de ese lote.
```

---

## Orden de ejecución recomendado

1. Paso 1 (auditoría) — sin código, solo diagnóstico.
2. Paso 2 (extender `executeStockMove()` con el cache).
3. Paso 3 (migrar `orders.service.ts`).
4. Paso 4 (migrar el resto de escritores detectados en el Paso 1).
5. Paso 5 (limpieza/documentación de lecturas).
6. Paso 6 (activar reservas).
7. Paso 8 (landed cost e impuestos) — depende de que el motor de doble entrada (Pasos 2-3) ya esté en pie, ya que el costo se guarda a nivel de StockQuant y se hereda en cada StockMove. Se puede implementar en paralelo a los Pasos 5-6.
8. Paso 7 (BOM/manufactura y reordering rules) queda en backlog, no bloquea el resto.

Cada paso es un commit/PR independiente y probable de testear por separado, aunque no haya producción de por medio — conviene mantener el historial claro para revertir un paso puntual si algo no funciona como se espera.
