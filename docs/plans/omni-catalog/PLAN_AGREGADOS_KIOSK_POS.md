# PLAN_AGREGADOS_KIOSK_POS.md

**Módulos afectados:** `social-catalog`, `products`, `orders`, `inventory`, POS/KDS (`frontend/pos.tsx` + backend orders/pos), `nfc-standalone` (futuro, ver `PLAN_OMNINFC.md`), `loyalty-standalone`
**Depende de / se integra con:** `PLAN_OMNIDINEIN.md` (RestaurantTable, roles mozo/cajero), `PLAN_OMNINFC.md` (NfcTag/NfcScanLog)
**Feature IDs:** FEAT-109 a FEAT-118 (last_id actual: FEAT-108)
**Estado:** planned

---

## 1. Contexto

Tres piezas que se diseñaron en conjunto porque comparten modelo de datos y flujo:

1. **Agregados**: extras/modificadores de producto (ej. "Extra queso", "Sin cebolla"), configurables como grupos reutilizables asignables a `ProductCategory`, con impacto real en consumo de insumos (BoM reactiva) y Kardex — no solo un ajuste de precio cosmético.
2. **Canal kiosk**: nuevo canal de `social-catalog` (junto a whatsapp/telegram/instagram/messenger/generic/static) para pedidos por autoservicio: el cliente escanea QR o NFC en su mesa (celular propio o tablet fija compartida), se identifica (cliente registrado vía tarjeta de fidelización, o alta rápida por nombre/teléfono), arma su pedido con agregados incluidos, y lo envía — pero el pedido no va directo a KDS: pasa por una cola de aprobación del cajero.
3. **POS/KDS UX/UI**: `frontend/pos.tsx` está desactualizado (mesa fija "Mesa 1" hardcodeada, sin soporte de agregados, sin estética unificada) — se rediseña con estética inspirada en Odoo POS (grilla táctil de productos, panel de categorías, carrito persistente a la derecha) y se integra con `RestaurantTable`, agregados y la nueva cola de aprobación kiosk.

Las tres partes comparten el modelo `ModifierGroup`/`ModifierOption` (agregados se cargan una vez, se usan en social-catalog y en POS) y el modelo `RestaurantTable` extendido con token de mesa (kiosk).

---

## 2. Modelo de datos (Prisma)

### 2.1 Agregados

```prisma
enum ModifierSelectionType {
  SINGLE
  MULTIPLE
}

model ModifierGroup {
  id             String    @id @default(uuid())
  tenantId       String
  name           String                    // "Extras de pizza"
  selectionType  ModifierSelectionType @default(SINGLE)
  required       Boolean   @default(false)
  minSelect      Int       @default(0)
  maxSelect      Int?                      // null = sin límite (selectionType MULTIPLE)
  active         Boolean   @default(true)
  order          Int       @default(0)
  tenant         Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  options        ModifierOption[]
  categories     ModifierGroupCategory[]

  @@index([tenantId, active])
  @@map("modifier_groups")
}

model ModifierOption {
  id                  String   @id @default(uuid())
  tenantId            String
  groupId             String
  name                String                  // "Extra muzzarella"
  priceDelta          Decimal  @db.Decimal(10, 2) @default(0)
  ingredientVariantId String?                 // insumo que suma consumo (ProductVariant de materia prima)
  replacesVariantId   String?                 // insumo que se anula del BoM base del producto
  qtyDelta            Decimal  @db.Decimal(10, 3) @default(0)  // ej: +150ml, +1 unidad
  active              Boolean  @default(true)
  order               Int      @default(0)
  group               ModifierGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@index([groupId, active])
  @@map("modifier_options")
}

model ModifierGroupCategory {
  groupId     String
  categoryId  String
  group       ModifierGroup    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  category    ProductCategory  @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@id([groupId, categoryId])
  @@index([categoryId])
  @@map("modifier_group_categories")
}

// Extensión de OrderLine (snapshot al momento de venta, mismo patrón que priceAtSale/costAtSale)
model OrderLineModifier {
  id                  String   @id @default(uuid())
  orderLineId         String
  optionId            String?               // referencia informativa, puede quedar null si se borra la opción original
  name                String                // snapshot del nombre
  priceDelta          Decimal  @db.Decimal(10, 2)
  ingredientVariantId String?
  replacesVariantId   String?
  qtyDelta            Decimal  @db.Decimal(10, 3)
  orderLine           OrderLine @relation(fields: [orderLineId], references: [id], onDelete: Cascade)

  @@index([orderLineId])
  @@map("order_line_modifiers")
}
```

`ProductCategory` gana relación inversa `modifierGroups ModifierGroupCategory[]`. `OrderLine` gana relación inversa `modifiers OrderLineModifier[]`.

### 2.2 Canal kiosk (extiende `RestaurantTable` de `PLAN_OMNIDINEIN.md`)

```prisma
enum TableTokenMode {
  STATIC
  ROTATING
}

// Campos nuevos sobre el modelo RestaurantTable ya planificado en PLAN_OMNIDINEIN.md
model RestaurantTable {
  // ...campos existentes (id, tenantId, name, zone, capacity, posX, posY, status, ownerId, currentOrderId)...
  kioskEnabled     Boolean         @default(false)
  tableToken       String?         @unique   // token STATIC vigente (null si se usa ROTATING puro)
  tokenMode        TableTokenMode  @default(STATIC)
  tokenExpiresAt   DateTime?                 // solo aplica si tokenMode = ROTATING
}

// Config a nivel tenant (se guarda junto a la config existente de social-catalog, no tabla nueva)
// SocialCatalogConfig.metadata.kioskMode: {
//   enabled: boolean,
//   tableTokenMode: 'static' | 'rotating',
//   requireApprovalBeforeKDS: boolean,        // default true
//   requirePaymentProof: boolean,             // FASE 2 (ver sección 5), default false
// }
```

`Order` gana un valor posible de `status`: `pending_review` (pedido kiosk esperando aprobación del cajero, distinto de `draft`/`confirmed` ya existentes) y un campo `metadata.subChannel: 'kiosk'` para distinguirlo de un pedido `catalog` normal por mensajería.

---

## 3. Fases e IDs de feature

### FASE A — Agregados (base, sin la cual kiosk no tiene sentido pleno)

**FEAT-109 — Schema + admin CRUD de agregados**
> Implementar en `backend/schema.prisma` los modelos `ModifierGroup`, `ModifierOption`, `ModifierGroupCategory` y `OrderLineModifier` tal como se definen en la sección 2.1 de este plan. Generar la migración. Crear `ModifierGroupsController`/`ModifierGroupsService` dentro de `backend/products/` (mismo patrón que el resto del módulo) con CRUD completo de grupos y opciones, y endpoints para asignar/desasignar un grupo a una o varias `ProductCategory`. Respetar `tenantId` en todas las queries y usar `@TenantPrisma()`, nunca `PrismaClient` directo (regla de `AGENTS.md`).

**FEAT-110 — Integración en social-catalog público**
> Extender `social-catalog.service.ts` para que, al resolver un producto (`getProducts`, `getFeatured`, detalle), incluya los `ModifierGroup` aplicables según la `categoryId` del producto (join vía `ModifierGroupCategory`). En `frontend/social-catalog.tsx`, agregar al Drawer de detalle de producto (línea ~1624) un bloque de selección por cada grupo aplicable: `Radio.Group` si `selectionType SINGLE`, `Checkbox.Group` si `MULTIPLE`, validando `required`/`minSelect`/`maxSelect` antes de habilitar "Agregar al carrito". El botón rápido de `ProductCard` debe abrir el Drawer de detalle en vez de agregar directo cuando el producto tenga al menos un grupo `required`. Usar `usePublicCartStore.addItem(product, quantity, undefined, selectedOptions, unitPriceWithModifiers)` — el store y `CartDrawer` ya soportan `selectedOptions`/`unitPriceWithModifiers`, no requieren cambios.

**FEAT-111 — Impacto en orden y stock**
> Extender `CreateOrderLineDto` (`backend/orders/dto/create-order.dto.ts`) con `modifiers?: { optionId: string }[]`. En `OrdersService.create`, al calcular `linesWithPrice`, sumar el `priceDelta` de cada modificador seleccionado a `priceAtSale`, y crear el `OrderLineModifier` correspondiente (snapshot de `name`/`priceDelta`/`ingredientVariantId`/`replacesVariantId`/`qtyDelta`) por cada línea. En el punto donde hoy se llama `inventoryService.executeStockMove`/`confirmReservationAsMove` para descontar el insumo base del producto, agregar: por cada modificador con `ingredientVariantId`, un stock move adicional por `qtyDelta`; por cada modificador con `replacesVariantId`, omitir/anular el consumo de ese insumo base específico en vez del consumo estándar del producto. Reutilizar `InventoryService` existente, no crear un servicio paralelo.

### FASE B — Canal kiosk

**FEAT-112 — Token de mesa y endpoint de resolución**
> Agregar a `RestaurantTable` (definido en `PLAN_OMNIDINEIN.md`, aún no implementado en el repo real — verificar si ya se implementó antes de este FEAT) los campos `kioskEnabled`, `tableToken`, `tokenMode`, `tokenExpiresAt` de la sección 2.2. Crear endpoint público `GET /api/v1/public/social-catalog/kiosk/resolve?token=` que: si `tokenMode STATIC`, busca `RestaurantTable` por `tableToken` exacto; si `ROTATING`, valida JWT firmado y `tokenExpiresAt`. Nunca exponer el `id` interno de la mesa ni el `NfcTag.entityId` crudo en la respuesta — devolver solo un `sessionToken` de corta vida que el frontend usa para el resto de la sesión kiosk. Para el caso NFC (celular del cliente con NFC o tablet fija), el mismo endpoint acepta `?nfcUid=` y delega en `nfc-standalone` (`POST /api/v1/nfc/scan`, ver `PLAN_OMNINFC.md`) para resolver `entityType TABLE`.

**FEAT-113 — Identificación de cliente en kiosk**
> En el flujo kiosk de `frontend/social-catalog.tsx` (nueva variante de entrada, ej. ruta `/social-catalog/kiosk/:sessionToken`), antes de permitir armar el pedido: ofrecer identificarse por tarjeta de fidelización (tap NFC si el dispositivo lo soporta, resolviendo `NfcTag entityType CUSTOMER` vía `nfc-standalone`) o alta rápida por nombre + teléfono si es cliente nuevo (crear/reutilizar registro en `loyalty-standalone` o el modelo de `Contact` existente, a confirmar cuál es la fuente de verdad de clientes hoy en el repo real). Persistir la identificación en la sesión kiosk (no en localStorage plano — usar el `sessionToken` de FEAT-112 como llave).

**FEAT-114 — Cola de aprobación del cajero**
> Al confirmar un pedido en canal kiosk, crear la orden con `status: 'pending_review'` y `metadata.subChannel: 'kiosk'` en vez de pasar a `confirmed` directo. Construir vista en el POS (rol cajero) que liste las órdenes `pending_review`, permita aprobarlas (pasan a `confirmed`, disparan a KDS igual que un pedido de mozo) o rechazarlas (con motivo, libera cualquier reserva de stock ya hecha). Reusar el patrón de `reserveStock`/`releaseStockReservation` de `InventoryService` que ya usa `OrdersService` para pedidos `draft`.

**FEAT-115 — Configuración admin del modo kiosk**
> En el panel admin de `social-catalog` (`frontend/social-catalog-admin.tsx`), agregar sección "Modo Kiosk" con los toggles definidos en la sección 2.2 (`enabled`, `tableTokenMode` static/rotating, `requireApprovalBeforeKDS`). Guardar en la config existente del tenant (mismo lugar donde ya vive el resto de la config de `social-catalog`, no crear tabla nueva). Incluir en esta pantalla, deshabilitado y marcado como "Próximamente", el toggle `requirePaymentProof` de la Fase 2 (sección 5 de este plan) — visible para que el cliente sepa que existe, sin funcionalidad real todavía.

### FASE C — POS/KDS UX/UI

**FEAT-116 — Rediseño visual estilo Odoo POS**
> Reescribir `frontend/pos.tsx` (hoy: grilla AntD básica, mesa hardcodeada como string libre "Mesa 1", sin categorías, sin estética unificada) con un layout de tres columnas fijo, inspirado en la referencia visual de Odoo POS: (1) panel izquierdo angosto de categorías como chips/tabs verticales u horizontales scrolleables; (2) grilla central de productos en tiles grandes táctiles (imagen, nombre, precio — sin descripciones largas, pensado para dedo/touch, no mouse de precisión); (3) panel derecho fijo con el pedido actual (mesa seleccionada real desde `RestaurantTable`, no string libre — usar el mapa de mesas del plan `PLAN_OMNIDINEIN.md`), stepper de cantidades grande, total destacado y botón de acción principal grande abajo (enviar comanda / cobrar según modo mozo/cajero). Aplicar los tokens de tema ya existentes (`frontend/theme/theme.ts`, mismos usados en `social-catalog`) en vez de estilos inline sueltos como tiene hoy el archivo.

**FEAT-117 — Selector de agregados en POS**
> Al tocar un producto con `ModifierGroup` aplicables (mismo dato que ya expone `social-catalog` desde FEAT-110), abrir un modal/panel de selección táctil equivalente al del catálogo público (reusar el mismo componente de selección si es viable extraerlo a `frontend/components/catalog/ModifierSelector.tsx` compartido entre `social-catalog.tsx` y `pos.tsx`, en vez de duplicar la lógica). Enviar los `modifiers` seleccionados en el `CreateOrderLineDto` igual que hace el catálogo público (FEAT-111).

**FEAT-118 — Vista de aprobación de pedidos kiosk en POS**
> Integrar la cola de `pending_review` de FEAT-114 como una vista/tab dentro de `pos.tsx` en modo cajero, con la misma estética de FEAT-116 (tiles/lista táctil), mostrando mesa, cliente identificado (si aplica) y el detalle del pedido con sus agregados antes de aprobar.

---

## 4. Orden de implementación sugerido

FASE A (109→111) es prerequisito de FASE B y de FEAT-117. FASE C (116) es independiente de A y B en su base (puede arrancar en paralelo), pero FEAT-117 y FEAT-118 dependen de A y B respectivamente. Orden recomendado: **109 → 110 → 111 → 116 (en paralelo desde el inicio) → 112 → 113 → 114 → 117 → 115 → 118**.

---

## 5. Fase 2 diferida — Comprobante de pago electrónico obligatorio

Para el caso de restaurante totalmente autónomo (sin cajero humano supervisando), la comanda no debe llegar a KDS hasta que exista un comprobante de pago electrónico válido asociado al pedido kiosk. Queda **fuera de alcance de este plan**, documentado para una iteración futura:

- Requiere enlazar el pedido kiosk a un intent de pago de la pasarela que use `orderflow` (a confirmar cuál está integrada en el repo real al momento de abordar esta fase).
- El trigger que mueve la orden de `pending_review` a `confirmed` deja de ser una acción humana (aprobación del cajero) y pasa a ser un webhook de confirmación de pago.
- `tokenMode ROTATING` pasa a ser obligatorio en este modo (no opcional): sin cajero presente, un token estático filtrado permitiría generar comandas fantasma indefinidamente sobre una mesa.
- El toggle `requirePaymentProof` ya queda reservado en el modelo de configuración (sección 2.2) y visible-deshabilitado en el admin (FEAT-115) para no requerir otra migración de config cuando se implemente.
