# **OmniManufacturing — Plan Maestro de Arquitectura y Desarrollo Técnico: MRP, Unidades de Medida y Producción Gastronómica**

**Documento Técnico Oficial — Especificación de Ingeniería y Arquitectura**  
**Ecosistema:** OmniFlow SaaS (NestJS, Prisma ORM, PostgreSQL, Redis/BullMQ, React 18 / Refine.dev)  
**Módulo:** OmniManufacturing / MRP & Cocina (Producción por Lotes y Escandallos)  
**Fecha:** Agosto 2026  
**Estado:** Aprobado para Desarrollo

---

## **1\. Resumen Ejecutivo y Visión Arquitectónica**

El módulo **OmniManufacturing (MRP)** dota a OmniFlow de la capacidad de transformar materias primas e insumos adquiridos mediante Compras en nuevos productos terminados o semi-elaborados de origen **Fabricación**, garantizando la exactitud del inventario (Kardex) y la correcta valoración de costos en tiempo real.

En los sectores gastronómico, panadería y manufactura liviana, la gestión de inventario fracasa tradicionalmente debido a tres limitaciones estructurales de los ERPs convencionales:

1. **Falta de flexibilidad en Unidades de Medida (UoM):** Imposibilidad de comprar a granel (ej. bolsas de 50 Kg de Harina, bidones de 20 L de Aceite) y consumir en recetas en medidas pequeñas (gramos, mililitros) sin desfasar el costo ni el stock.  
2. **Inexistencia de costeo real por lote de producción:** Los productos elaborados ingresan con costos teóricos o estándar que no reflejan el costo real ponderado de los insumos consumidos ni las mermas del proceso (evaporación, cocción, manipulación).  
3. **Confusión entre Producción por Lote y Escandallo de Venta:** Necesidad de separar la producción anticipada para stock (ej. hornear 200 panes por la mañana) del ensamble al vuelo en comanda de salón (ej. preparar un sándwich en el POS).

OmniManufacturing adopta el estándar de industria establecido por **Odoo MRP** (`mrp.production`, `mrp.bom`, `uom.uom`, `stock.move`, `stock.valuation.layer`), perfeccionándolo para operar bajo el paradigma de **Sistema de Acción en Tiempo Real** de OmniFlow.

---

## **2\. Principios de Diseño y Rutas de Abastecimiento**

### ***2.1. Desacoplamiento de Origen (Compra vs. Fabricación)***

Cada producto y variante en OmniFlow define sus rutas de abastecimiento (`SupplyRoute`):

* **Ruta COMPRA (`canBePurchased: true`, `canBeManufactured: false`):** Insumos y materias primas (Harina 000, Levadura, Sal, Aceite, Café en grano, Leche). Su stock se incrementa exclusivamente mediante Órdenes de Compra y Recepciones de Proveedor (`purchase.order`).  
* **Ruta FABRICACIÓN (`canBePurchased: false`, `canBeManufactured: true`):** Productos terminados (Pan Francés, Baguette, Medialunas, Tartas) o semi-elaborados (Masa Madre, Salsa Base, Relleno). Su stock se incrementa **únicamente** mediante la ejecución de una **Orden de Fabricación (`ManufacturingOrder`)** o explosión de BoM.  
* **Ruta HÍBRIDA (`canBePurchased: true`, `canBeManufactured: true`):** Productos que el negocio puede elaborar internamente o adquirir a terceros según demanda o capacidad instalada.

┌────────────────────────────────────────────────────────────────────────────────────────┐

│                                   FLUJO DE MATERIALES                                  │

└────────────────────────────────────────────────────────────────────────────────────────┘

  \[PROVEEDOR\] ──(Factura/Remisión)──\> \[STOCK MATERIAS PRIMAS\] (Harina 100 Kg @ ₲ 4.500/Kg)

                                                  │

                                                  ▼ (Orden de Fabricación: OF-2026-001)

                                      \[UBICACIÓN VIRTUAL PRODUCCIÓN\]

                                       ├── Consume: 10 Kg Harina (10.000 g) \= ₲ 45.000

                                       ├── Consume: 200 g Levadura          \= ₲  4.000

                                       ├── Consume: 180 g Sal               \= ₲    600

                                       ├── Consume: 6 L Agua (6.000 ml)     \= ₲      0

                                       └── Merma Horneado: 12% (Evaporación)

                                                  │

                                                  ▼ (Entrada de Producto Terminado)

  \[VENTAS / POS\] \<──(Despacho)────── \[STOCK PRODUCTOS TERMINADOS\] (200 Panes @ ₲ 248 c/u)

---

## **3\. Motor de Unidades de Medida (UoM Engine)**

El subsistema de UoM permite la interoperabilidad total entre compras, almacenamiento y formulación de recetas, evitando redondeos destructivos y garantizando conversiones bidireccionales con precisión de hasta 6 decimales (`Decimal(12, 6)`).

### ***3.1. Categorías Homogéneas***

Las conversiones solo están permitidas dentro de la misma categoría de medida:

* **PESO (`WEIGHT`):** Gramo ($g$ \- Unidad Base de Referencia, ratio \= 1.0).  
* **VOLUMEN (`VOLUME`):** Mililitro ($ml$ \- Unidad Base de Referencia, ratio \= 1.0).  
* **UNIDAD (`UNIT`):** Unidad ($u$ \- Unidad Base de Referencia, ratio \= 1.0).

### ***3.2. Tabla de Conversión Estándar (Seed Inicial por Tenant)***

| Categoría | Unidad de Medida | Símbolo | Ratio a Base | ¿Es Base? | Tipo de Uso Típico |
| :---- | :---- | :---: | :---: | :---: | :---- |
| **WEIGHT** | Gramo | `g` | 1.000000 | **Sí** | Formulación de recetas y escandallos |
| **WEIGHT** | Kilogramo | `kg` | 1000.000000 | No | Almacenamiento e inventario en cocina |
| **WEIGHT** | Miligramo | `mg` | 0.001000 | No | Especias de alta precisión / químicos |
| **WEIGHT** | Bolsa / Saco 50 Kg | `sac-50` | 50000.000000 | No | Compras a molinos / distribuidores |
| **WEIGHT** | Bolsa / Saco 100 Kg | `sac-100` | 100000.000000 | No | Compras mayoristas |
| **WEIGHT** | Libra | `lb` | 453.592370 | No | Recetas anglosajonas / insumos importados |
| **VOLUME** | Mililitro | `ml` | 1.000000 | **Sí** | Recetas de cafetería, salsas y cocina |
| **VOLUME** | Litro | `l` | 1000.000000 | No | Almacén y compras generales |
| **VOLUME** | Centímetro Cúbico | `cm3` | 1.000000 | No | Equivalente exacto a ml |
| **VOLUME** | Galón (US) | `gal` | 3785.411784 | No | Insumos de limpieza / aceites |
| **VOLUME** | Bidón 20 L | `bid-20` | 20000.000000 | No | Aceites y lácteos mayoristas |
| **UNIT** | Unidad | `u` | 1.000000 | **Sí** | Conteo individual de panes, porciones |
| **UNIT** | Docena | `doc` | 12.000000 | No | Venta y empaque de pastelería |
| **UNIT** | Pack x6 | `pk-6` | 6.000000 | No | Empaques medianos |
| **UNIT** | Caja x24 | `cj-24` | 24.000000 | No | Compras de descartables |

### ***3.3. Algoritmo de Conversión Exacta***

$$\\text{Cantidad en Unidad Base} \= \\text{Cantidad Origen} \\times \\text{UomOrigen.ratioToBase}$$

$$\\text{Cantidad en Unidad Destino} \= \\frac{\\text{Cantidad en Unidad Base}}{\\text{UomDestino.ratioToBase}} \= \\frac{\\text{Cantidad Origen} \\times \\text{UomOrigen.ratioToBase}}{\\text{UomDestino.ratioToBase}}$$

*Ejemplo:* Si se compran 2 Bolsas de 50 Kg de Harina ($2 \\times 50.000 \= 100.000\\text{ g}$) y la receta solicita $2.500\\text{ g}$, el Kardex descuenta exactamente $2.500\\text{ g}$ (equivalente a $0.025$ bolsas o $2.5\\text{ kg}$) sin desfasar el costo de adquisición.

---

## **4\. Estructura de Listas de Materiales / Fichas Técnicas (Product BoM)**

La Lista de Materiales (`ProductBom`) define la "receta maestra" para elaborar una cantidad determinada de producto terminado o semi-elaborado.

### ***4.1. Tipos de Lista de Materiales (`BomType`)***

1. **`MANUFACTURE` (Orden de Fabricación por Lote):**  
   * Se utiliza para productos que se elaboran en tandas/lotes antes de su comercialización (ej. Panadería matutina, salsas base, postres).  
   * Requiere emitir y completar una `ManufacturingOrder`.  
   * Incrementa el stock del producto terminado y disminuye el stock de las materias primas al confirmar el cierre del lote.  
2. **`KIT_PHANTOM` (Escandallo Reactivo / Live POS BoM):**  
   * Se utiliza para platos y bebidas elaboradas en tiempo real a pedido del cliente (ej. Cappuccino, Hamburguesa con papas, Tragos de barra).  
   * No requiere orden de fabricación formal; el motor de comanda descuenta los insumos atómicamente en el Kardex al momento de cobrar o enviar al KDS.

### ***4.2. Rendimiento (Yield) y Mermas (Scrap / Waste Factor)***

En gastronomía, 1.000 gramos de masa cruda no equivalen a 1.000 gramos de pan horneado debido a la evaporación de agua en el horno (merma por cocción), o al desperdicio inevitable en pelado/manipulación (merma de preparación).

* **`yieldQuantity`:** Cantidad de unidades o volumen neto resultante de la receta (ej. $100\\text{ u}$ de pan o $10\\text{ kg}$ de masa).  
* **`wastePercentage`:** Porcentaje de pérdida inherente al insumo en la receta. $$\\text{Cantidad Bruta a Consumir} \= \\text{Cantidad Neta} \\times \\left(1 \+ \\frac{\\text{wastePercentage}}{100}\\right)$$

### ***4.3. Listas de Materiales Multinivel (Semi-elaborados)***

OmniManufacturing soporta recetas anidadas mediante el campo `subBomId` en `BomLine`:

* **Nivel 0 (Insumos Base):** Harina, Agua, Levadura.  
* **Nivel 1 (Semi-elaborado / LdM 1):** *Masa Madre* (Ruta: Fabricación $\\rightarrow$ Stock de cocina).  
* **Nivel 2 (Producto Terminado / LdM 2):** *Pan de Campo con Masa Madre* (Consume Masa Madre \+ Harina \+ Semillas).

---

## **5\. Ciclo de Vida de la Orden de Fabricación (`ManufacturingOrder`)**

La Orden de Fabricación (OF / `mrp.production`) es el documento transaccional que coordina la transformación física de materias primas en producto terminado.

┌─────────────────────────────────────────────────────────────────────────────┐

│                   MÁQUINA DE ESTADOS: ManufacturingOrder                     │

└─────────────────────────────────────────────────────────────────────────────┘

       \[DRAFT\] (Planificación: selección de BoM y cantidad deseada)

          │

          ▼  (Acción: Confirmar / Reservar Insumos)

     \[CONFIRMED\] ──(Falta Stock)──\> \[WAITING\_COMPONENTS\] (Alerta de Compras)

          │

          ▼  (Acción: Iniciar Cocción / Producción)

    \[IN\_PROGRESS\] (Insumos en mesa de trabajo / Horno)

          │

          ▼  (Acción: Declarar Producción Real y Desechos)

        \[DONE\] (Liquidación contable atómica en Kardex)

          │

          ├──\> Movimiento 1..N: Materias Primas \-\> Ubicación Virtual Producción (-)

          ├──\> Movimiento N+1: Ubicación Virtual Producción \-\> Producto Terminado (+)

          └──\> Actualización de ProductVariant.cost (Costo Real de Fabricación)

### ***5.1. Detalle de Estados***

1. **`DRAFT` (Borrador):**  
   * El jefe de cocina o panadero indica qué producto desea fabricar (ej. *Pan Francés 50g*) y la cantidad objetivo (ej. $200\\text{ u}$).  
   * El sistema calcula las cantidades teóricas requeridas de cada ingrediente según la LdM activa.  
2. **`CONFIRMED` (Confirmada / Planificada):**  
   * Se verifica la disponibilidad física de las materias primas en la ubicación de stock origen.  
   * Se reservan los insumos para evitar que otra orden o comanda del POS los consuma.  
3. **`IN_PROGRESS` (En Preparación):**  
   * Los insumos salen del almacén y entran al proceso de mezclado/horneado.  
4. **`DONE` (Producido y Liquidado):**  
   * Se registran las cantidades reales producidas (ej. se planearon 200 panes pero salieron 195 panes de calidad y 5 quemados/desecho).  
   * **Atomicidad Transaccional (`prisma.$transaction`):**  
     1. Disminución de stock de insumos en `StockMove` (Razón: `MANUFACTURING_CONSUMPTION`).  
     2. Aumento de stock del producto terminado en `StockMove` (Razón: `MANUFACTURING_FINISHED_GOOD`).  
     3. Registro de mermas/desechos no recuperables si hubiere (`MANUFACTURING_SCRAP`).  
     4. Cálculo del costo unitario final y actualización en el maestro de variantes.  
5. **`CANCELLED` (Cancelada):**  
   * Se liberan las reservas de insumos sin impactar el Kardex.

---

## **6\. Modelo de Datos Integral en Prisma (`schema.prisma`)**

// \==========================================

// 1\. UNIDADES DE MEDIDA (UoM Engine)

// \==========================================

enum UomCategory {

  WEIGHT

  VOLUME

  UNIT

}

model UnitOfMeasure {

  id               String                 @id @default(cuid())

  tenantId         String

  name             String                 // "Kilogramo", "Gramo", "Litro", "Unidad"

  symbol           String                 // "kg", "g", "l", "u"

  category         UomCategory

  ratioToBase      Decimal                @db.Decimal(12, 6\) // Ratio respecto a la unidad base de su categoría

  isBase           Boolean                @default(false)

  active           Boolean                @default(true)

  // Relaciones

  productsUom      Product\[\]              @relation("ProductDefaultUom")

  productsPurchase Product\[\]              @relation("ProductPurchaseUom")

  bomHeaders       ProductBom\[\]           @relation("BomYieldUom")

  bomLines         BomLine\[\]              @relation("BomLineUom")

  moLines          ManufacturingOrderLine\[\]

  createdAt        DateTime               @default(now())

  updatedAt        DateTime               @updatedAt

  @@unique(\[tenantId, name\])

  @@unique(\[tenantId, symbol\])

  @@index(\[tenantId, category\])

}

// \==========================================

// 2\. EXTENSIÓN DE PRODUCTOS Y VARIANTES

// \==========================================

enum SupplyRoute {

  BUY           // Origen Compras (Materia Prima pura)

  MANUFACTURE   // Origen Fabricación (Elaborado en cocina/taller)

  HYBRID        // Comprable o Fabricable según demanda

}

// Los modelos Product y ProductVariant existentes se enriquecen con:

/\*

model Product {

  // ... campos existentes (id, handle, name, basePrice, specs, photos, etc.)


  supplyRoute       SupplyRoute   @default(BUY)

  uomId             String?

  uom               UnitOfMeasure? @relation("ProductDefaultUom", fields: \[uomId\], references: \[id\])

  purchaseUomId     String?

  purchaseUom       UnitOfMeasure? @relation("ProductPurchaseUom", fields: \[purchaseUomId\], references: \[id\])


  boms              ProductBom\[\]

  manufacturingOrders ManufacturingOrder\[\]

}

model ProductVariant {

  // ... campos existentes (id, sku, barcode, priceDelta, stock, cost, photos)


  cost              Decimal       @default(0) @db.Decimal(12, 2\) // Costo PMP de compra o de fabricación liquidado

  boms              ProductBom\[\]  @relation("VariantBoms")

  consumedInBom     BomLine\[\]     @relation("BomComponentVariant")

  producedInMo      ManufacturingOrder\[\] @relation("MoFinishedVariant")

  moConsumedLines   ManufacturingOrderLine\[\]

}

\*/

// \==========================================

// 3\. FICHAS TÉCNICAS / LISTAS DE MATERIALES (BoM)

// \==========================================

enum BomType {

  MANUFACTURE    // Producción por lotes / Órdenes de Fabricación

  KIT\_PHANTOM    // Escandallo reactivo en caliente (POS / Delivery)

}

model ProductBom {

  id               String               @id @default(cuid())

  tenantId         String

  code             String?              // Código receta, ej: "REC-PAN-001"

  name             String               // "Ficha Técnica Pan Francés Tradicional"

  type             BomType              @default(MANUFACTURE)


  // Producto o Variante resultante

  productId        String

  product          Product              @relation(fields: \[productId\], references: \[id\], onDelete: Cascade)

  variantId        String?

  variant          ProductVariant?      @relation("VariantBoms", fields: \[variantId\], references: \[id\], onDelete: SetNull)


  yieldQuantity    Decimal              @default(1) @db.Decimal(12, 4\) // Cantidad resultante de la receta

  yieldUomId       String

  yieldUom         UnitOfMeasure        @relation("BomYieldUom", fields: \[yieldUomId\], references: \[id\])


  estimatedLaborCost Decimal            @default(0) @db.Decimal(12, 2\) // Costo estimado de mano de obra/horno

  notes            String?              @db.Text

  isActive         Boolean              @default(true)

  version          Int                  @default(1)

  lines            BomLine\[\]

  manufacturingOrders ManufacturingOrder\[\]

  createdAt        DateTime             @default(now())

  updatedAt        DateTime             @updatedAt

  @@index(\[tenantId, productId, variantId\])

}

model BomLine {

  id                 String           @id @default(cuid())

  tenantId           String

  bomId              String

  bom                ProductBom       @relation(fields: \[bomId\], references: \[id\], onDelete: Cascade)


  componentVariantId String

  componentVariant   ProductVariant   @relation("BomComponentVariant", fields: \[componentVariantId\], references: \[id\])


  subBomId           String?          // Si el componente es un semi-elaborado con su propia receta

  quantity           Decimal          @db.Decimal(12, 4\) // Cantidad neta requerida

  uomId              String

  uom                UnitOfMeasure    @relation("BomLineUom", fields: \[uomId\], references: \[id\])


  wastePercentage    Decimal          @default(0) @db.Decimal(5, 2\) // Merma porcentual esperada (% scrap)

  sequence           Int              @default(0)

  createdAt          DateTime         @default(now())

  @@index(\[tenantId, bomId, componentVariantId\])

}

// \==========================================

// 4\. ÓRDENES DE FABRICACIÓN (ManufacturingOrder)

// \==========================================

enum ManufacturingStatus {

  DRAFT

  CONFIRMED

  WAITING\_COMPONENTS

  IN\_PROGRESS

  DONE

  CANCELLED

}

model ManufacturingOrder {

  id                 String                 @id @default(cuid())

  tenantId           String

  orderNumber        String                 // Ej: "OF-20260825-0001"


  // Producto final a obtener

  productId          String

  product            Product                @relation(fields: \[productId\], references: \[id\])

  variantId          String

  variant            ProductVariant         @relation("MoFinishedVariant", fields: \[variantId\], references: \[id\])


  bomId              String

  bom                ProductBom             @relation(fields: \[bomId\], references: \[id\])


  status             ManufacturingStatus    @default(DRAFT)


  // Cantidades planificadas vs reales

  targetQuantity     Decimal                @db.Decimal(12, 4\) // Cantidad que se planificó fabricar

  producedQuantity   Decimal?               @db.Decimal(12, 4\) // Cantidad real final obtenida

  scrappedQuantity   Decimal?               @default(0) @db.Decimal(12, 4\) // Unidades defectuosas/quemadas


  // Ubicaciones de Inventario

  rawLocationId      String                 // Ubicación origen materias primas (ej. "Almacén Cocina")

  finishedLocationId String                 // Ubicación destino producto final (ej. "Estantería Salón")


  // Costeo Liquidado

  totalComponentsCost Decimal               @default(0) @db.Decimal(12, 2\)

  additionalCost     Decimal                @default(0) @db.Decimal(12, 2\) // Horno, gas, mano de obra

  totalProductionCost Decimal               @default(0) @db.Decimal(12, 2\)

  unitCostCalculated Decimal                @default(0) @db.Decimal(12, 2\) // totalProductionCost / producedQuantity


  responsibleUserId  String?                // Operador/Cocinero responsable

  scheduledStartDate DateTime?

  startedAt          DateTime?

  completedAt        DateTime?


  lines              ManufacturingOrderLine\[\]

  stockMoves         StockMove\[\]


  notes              String?                @db.Text

  createdAt          DateTime               @default(now())

  updatedAt          DateTime               @updatedAt

  @@unique(\[tenantId, orderNumber\])

  @@index(\[tenantId, status, createdAt\])

}

model ManufacturingOrderLine {

  id                 String             @id @default(cuid())

  tenantId           String

  orderId            String

  order              ManufacturingOrder @relation(fields: \[orderId\], references: \[id\], onDelete: Cascade)


  componentVariantId String

  componentVariant   ProductVariant     @relation(fields: \[componentVariantId\], references: \[id\])


  requiredQuantity   Decimal            @db.Decimal(12, 4\) // Cantidad teórica según BoM

  consumedQuantity   Decimal            @db.Decimal(12, 4\) // Cantidad real consumida

  uomId              String

  uom                UnitOfMeasure      @relation(fields: \[uomId\], references: \[id\])


  unitCostAtMoment   Decimal            @db.Decimal(12, 2\) // Snapshot de costo del insumo al procesar

  totalCost          Decimal            @db.Decimal(12, 2\) // consumedQuantity en base \* unitCost


  createdAt          DateTime           @default(now())

  @@index(\[tenantId, orderId, componentVariantId\])

}

// \==========================================

// 5\. MOVIMIENTOS DE STOCK (Kardex de Producción)

// \==========================================

enum StockMoveType {

  PURCHASE\_RECEIPT

  POS\_SALE

  POS\_BOM\_CONSUMPTION

  MANUFACTURING\_CONSUMPTION   // Salida de materia prima a producción

  MANUFACTURING\_FINISHED\_GOOD // Entrada de producto terminado al almacén

  MANUFACTURING\_SCRAP         // Merma extraordinaria registrada

  INVENTORY\_ADJUSTMENT

}

// Extensión del modelo StockMove existente para vincular a la orden de fabricación

/\*

model StockMove {

  // ... campos existentes

  manufacturingOrderId String?

  manufacturingOrder   ManufacturingOrder? @relation(fields: \[manufacturingOrderId\], references: \[id\], onDelete: SetNull)

  moveType             StockMoveType       @default(MANUFACTURING\_FINISHED\_GOOD)

}

\*/

---

## **7\. Caso Práctico Detallado: Elaboración de Pan Francés**

### ***7.1. Configuración de Insumos y Unidades de Medida***

* **Harina 000:** Comprada en bolsa de $100\\text{ kg}$ a $\\text{₲ } 450.000$ ($\\text{₲ } 4.500/\\text{kg} \= \\text{₲ } 4,5/\\text{g}$). UoM compra: `sac-100`, UoM almacén: `kg`, UoM consumo: `g`.  
* **Levadura Fresca:** Comprada en bloque de $500\\text{ g}$ a $\\text{₲ } 10.000$ ($\\text{₲ } 20/\\text{g}$).  
* **Sal Fina:** Comprada en paquete de $1\\text{ kg}$ a $\\text{₲ } 3.500$ ($\\text{₲ } 3,5/\\text{g}$).  
* **Aceite Vegetal:** Comprado en bidón de $5\\text{ l}$ a $\\text{₲ } 50.000$ ($\\text{₲ } 10/\\text{ml}$).  
* **Agua Potable:** Costo marginal asumido $\\text{₲ } 0$.

### ***7.2. Ficha Técnica Maestra (`ProductBom`)***

* **Producto Resultante:** *Pan Francés Tradicional (Variante 50g)*.  
* **Cantidad Resultante (*Yield*):** $100\\text{ unidades}$ de pan.  
* **Líneas de la Receta:**  
  1. Harina 000: $5.000\\text{ g}$ ($5\\text{ kg}$) — Merma: $0%$.  
  2. Agua: $3.000\\text{ ml}$ ($3\\text{ l}$) — Merma: $0%$.  
  3. Levadura Fresca: $100\\text{ g}$ — Merma: $0%$.  
  4. Sal Fina: $90\\text{ g}$ — Merma: $0%$.  
  5. Aceite Vegetal: $100\\text{ ml}$ — Merma: $0%$.  
  6. **Merma global de horneado (evaporación de masa):** $12%$ (considerada en el pesaje del bollo crudo de $57\\text{ g}$ para obtener $50\\text{ g}$ cocido).

### ***7.3. Ejecución de la Orden de Fabricación por 200 Panes***

1. **Creación de la OF:** `targetQuantity = 200 u` (multiplica la BoM por factor $2.0$).  
2. **Explosión de Necesidades:**  
   * Harina: $10.000\\text{ g}$ ($10\\text{ kg}$) $\\rightarrow \\text{Costo: } 10.000 \\times 4,5 \= \\text{₲ } 45.000$.  
   * Levadura: $200\\text{ g}$ $\\rightarrow \\text{Costo: } 200 \\times 20 \= \\text{₲ } 4.000$.  
   * Sal: $180\\text{ g}$ $\\rightarrow \\text{Costo: } 180 \\times 3,5 \= \\text{₲ } 630$.  
   * Aceite: $200\\text{ ml}$ $\\rightarrow \\text{Costo: } 200 \\times 10 \= \\text{₲ } 2.000$.  
   * Agua: $6.000\\text{ ml}$ $\\rightarrow \\text{₲ } 0$.  
   * **Subtotal Materias Primas:** $\\text{₲ } 51.630$.  
   * **Costo Adicional (Energía Horno):** $\\text{₲ } 5.000$.  
   * **Costo Total del Lote:** $\\text{₲ } 56.630$.  
3. **Cierre de Producción (`DONE`):**  
   * Se obtienen $200\\text{ unidades}$ de Pan Francés.  
   * **Kardex:** Se descuentan $10\\text{ kg}$ de Harina de la bolsa de $100\\text{ kg}$ (quedan $90\\text{ kg}$).  
   * **Kardex:** Ingresan $+200\\text{ u}$ de Pan Francés al inventario de salón.  
   * **Costo Unitario Liquidado:** $$\\text{Costo Unitario} \= \\frac{\\text{₲ } 56.630}{200} \= \\text{₲ } 283,15 \\text{ por pan}$$  
   * La variante *Pan Francés* actualiza su `ProductVariant.cost = 283.15`, garantizando que cuando el POS venda el pan a $\\text{₲ } 1.000$, el reporte de rentabilidad de **OmniBI** calcule un margen bruto exacto del $71,68%$.

---

## **8\. Especificación de Endpoints REST (`/api/v1/mrp/`)**

### ***8.1. Unidades de Medida (`/api/v1/mrp/uom`)***

| Método | Ruta | Descripción | Payload / Response |
| :---- | :---- | :---- | :---- |
| `GET` | `/categories` | Listar categorías de UoM | \[{ id, name: "WEIGHT" | "VOLUME" | "UNIT" }\] |
| `GET` | `/units` | Listar unidades de medida del tenant | `[{ id, name, symbol, category, ratioToBase, isBase }]` |
| `POST` | `/units` | Crear nueva unidad de medida | `{ name, symbol, category, ratioToBase, isBase }` |
| `POST` | `/convert` | Simular conversión entre dos UoM | `{ fromUomId, toUomId, quantity } -> { convertedQuantity }` |

### ***8.2. Fichas Técnicas / Escandallos (`/api/v1/mrp/boms`)***

| Método | Ruta | Descripción | Payload / Response |
| :---- | :---- | :---- | :---- |
| `GET` | `/` | Listar fichas técnicas con filtros | `[{ id, code, name, type, productId, yieldQuantity }]` |
| `POST` | `/` | Crear nueva ficha técnica con líneas | `{ name, type, productId, variantId?, yieldQuantity, yieldUomId, lines: [...] }` |
| `GET` | `/:id` | Obtener detalle completo de receta | `{ id, name, lines: [{ componentVariantId, quantity, uom, wastePercentage }], subBoms }` |
| `PATCH` | `/:id` | Modificar ingredientes o rendimientos | `{ yieldQuantity?, lines?: [...] }` |
| `POST` | `/:id/calculate-cost` | Simular costo teórico actual según Kardex | `{ theoreticalCost, costPerUnit, linesBreakdown: [...] }` |

### ***8.3. Órdenes de Fabricación (`/api/v1/mrp/orders`)***

| Método | Ruta | Descripción | Payload / Response |
| :---- | :---- | :---- | :---- |
| `GET` | `/` | Listar órdenes de fabricación | `[{ id, orderNumber, status, productName, targetQuantity, createdAt }]` |
| `POST` | `/` | Crear orden de fabricación en borrador | `{ productId, variantId, bomId, targetQuantity, rawLocationId, finishedLocationId }` |
| `POST` | `/:id/confirm` | Confirmar y reservar materias primas | { id, status: "CONFIRMED" | "WAITING\_COMPONENTS" } |
| `POST` | `/:id/start` | Iniciar proceso de preparación | `{ id, status: "IN_PROGRESS", startedAt }` |
| `POST` | `/:id/produce` | Declarar producción y liquidar lote | `{ producedQuantity, scrappedQuantity?, additionalCost?, linesConsumed?: [...] }` |
| `POST` | `/:id/cancel` | Cancelar orden y liberar reservas | `{ id, status: "CANCELLED" }` |

---

## **9\. Roadmap de Desarrollo Técnico (Sprints de Implementación)**

┌─────────────────────────────────────────────────────────────────────────────┐

│                       ROADMAP DE DESARROLLO (5 SPRINTS)                     │

└─────────────────────────────────────────────────────────────────────────────┘

  Sprint 1 (Sem 1-2): Motor de UoM y Conversor Aritmético Exacto

  Sprint 2 (Sem 3-4): Módulo BoM, Rendimientos, Mermas y Sub-recetas

  Sprint 3 (Sem 5-6): Órdenes de Fabricación, Ubicaciones y Transacciones Kardex

  Sprint 4 (Sem 7-8): Motor de Liquidación de Costos y Enlace con POS / OmniBI

  Sprint 5 (Sem 9):   UI en Refine.dev / Ant Design y Validación en Cocina Real

| Fase | Sprint | Entregables Principales | Stack / Componentes |
| :---- | :---- | :---- | :---- |
| **Fase 1** | Sprint 1 (Sem 1-2) | Migraciones Prisma para `UnitOfMeasure`, Seeds de UoM estándar y servicio `UomConverterService`. | NestJS, Prisma, PostgreSQL |
| **Fase 2** | Sprint 2 (Sem 3-4) | CRUD de `ProductBom` y `BomLine`, algoritmo de explosión recursiva para sub-recetas y simulador de costos. | NestJS, Prisma Transactions |
| **Fase 3** | Sprint 3 (Sem 5-6) | Máquina de estados de `ManufacturingOrder`, gestión de reservas y asientos atómicos en `StockMove`. | Prisma `$transaction`, Stock Service |
| **Fase 4** | Sprint 4 (Sem 7-8) | Liquidación de costo de lote, actualización de `ProductVariant.cost` e inyección a tablas de hechos de OmniBI. | NestJS, BullMQ, OmniBI Engine |
| **Fase 5** | Sprint 5 (Sem 9\) | Vistas en panel administrativo (Refine.dev \+ Ant Design): formulario de recetas tipo matriz y wizard de orden de fabricación. | React 18, Refine.dev, Ant Design 5 |

---

## **10\. Conclusión y Valor Diferencial**

Con la implementación de **OmniManufacturing**, OmniFlow cierra el círculo operativo completo para negocios gastronómicos y de manufactura liviana:

1. **Precisión Total:** Permite comprar al por mayor en unidades logísticas (bolsas, bidones) y formular recetas en gramos y mililitros exactos.  
2. **Cero Stock Fantasma:** La materia prima se deduce formalmente al fabricar tandas de producción, evitando descalces en la heladera o almacén.  
3. **Rentabilidad Real:** El producto elaborado ingresa con un costo unitario matemático exacto derivado de los insumos reales consumidos, dotando al POS y a OmniBI de información fidedigna para la toma de decisiones.

