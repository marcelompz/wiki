# 🚀 PROMPT DE DESARROLLO: Trazabilidad e Atribución de Ventas (Seller Attribution Engine) en OrderFlow

## 📋 Contexto y Objetivo
El objetivo es implementar la capacidad de **Atribución e Identificación de Vendedor** (`Seller Attribution`) de forma implícita dentro de la arquitectura actual de **OrderFlow** (OrderFlow Sales, POS y Social Catalog / FEAT-48).

Esta funcionalidad debe permitir trazar el origen de una venta sin necesidad de construir un "módulo de comisiones" contable complejo. El sistema simplemente debe garantizar que la variable de identificación del vendedor (`sellerId`) viaje de extremo a extremo desde el punto de entrada (Link asistido por chat, QR de salón o POS presencial) hasta la persistencia en base de datos y la cola de retención (BullMQ + Redis).

---

## 🛠️ 1. Cambios en el Esquema de Base de Datos (`Prisma Schema`)

Actualizar la entidad `Order` e `OrderItem` (y en su defecto la entidad de persistencia del carrito provisional `Cart`) para almacenar de forma opcional el identificador del vendedor a nivel global y a nivel de ítem (para *upselling*).

## ⚙️ 2. Lógica de Captura y Persistencia (Frontend & Backend)
** *A. Captura en Tienda Web / Catálogo Social (Frontend) * **

   * Middleware / Listener de URL (?seller=...):

        Cuando un cliente ingresa a la tienda o catálogo con el parámetro de consulta ?seller=CARLOS01 o ?seller_id=CARLOS01, la aplicación debe persistir este valor en el sessionStorage o localStorage con una caducidad de sesión (ej. 24 horas).

    * Payload de Creación de Checkout:

        Al invocar la mutación/API de creación de pedido (POST /api/v1/orders), el frontend debe adjuntar automáticamente el sellerId almacenado en la sesión.

B. Venta Asistida desde Chat / CRM (OrderFlow Inbox)

    Cuando un agente de ventas genera un carrito desde la interfaz del chat de OrderFlow, el backend debe autocompletar el campo sellerId con el ID del usuario/vendedor autenticado en la plataforma y establecer trafficSource: "crm_assisted".

C. Módulo POS Presencial (Venta en Caja & Upselling)

    Selector Global de Vendedor: Opción rápida en la barra superior del POS para asignar un sellerId general a la transacción.

    Selector por Ítem (Upsell en Mostrador):

        Permitir que el cajero o atendedor vincule un sellerId específico únicamente a los ítems que fueron producto de una recomendación/upsell (ej. bolsa de grano, tratamiento extra), manteniendo el resto del carrito sin vendedor individual (sellerId: null).

🔄 3. Ajuste en el Motor de Colas (BullMQ + Redis / Módulo de Retención)

Al programar un evento diferido de carrito abandonado (CART_ABANDONED o BOOKING_PENDING):

    Persistencia en el Job Data:

        El servicio encargador de agregar la tarea a la cola de BullMQ debe incluir las variables de trazabilidad en el payload del Job:
    TypeScript

    await followUpQueue.add('CART_ABANDONED_JOB', {
      orderId: order.id,
      tenantId: order.tenantId,
      customerPhone: order.customerPhone,
      sellerId: order.sellerId, // <-- Preserva la firma original del vendedor
      checkoutUrl: `[https://orderflow.app/checkout/$](https://orderflow.app/checkout/$){order.id}?seller=${order.sellerId}`
    }, { delay: timeInMinutes * 60 * 1000 });

    Estructura del Mensaje de Salida:

        Cuando el adaptador (IMessagingAdapter) despache el mensaje de retención automático, el enlace de retorno ({{checkout_url}}) debe mantener el parámetro ?seller=CARLOS01 para asegurar que si el cliente recupera la compra tras el aviso, la comisión siga acreditándose al vendedor inicial.

📊 4. Exportación de Datos para Auditoría de Comisiones (CSV / Excel)

Ajustar el endpoint de exportación de reportes de ventas (GET /api/v1/orders/export):

Añadir las siguientes columnas al reporte CSV/Excel exportable de pedidos para que el dueño/administrador del comercio pueda liquidar comisiones de forma nativa en su hoja de cálculo:

    order_id

    created_at

    total_amount

    channel

    traffic_source (Inbound, CRM Assisted, POS Counter, POS Upsell)

    order_seller_id (Vendedor de la orden completa)

    item_upsell_seller_id (Vendedor asignado a ítems individuales extra)

    status

🛡️ 5. Criterios de Aceptación (Definition of Done)

    Venta Orgánica: Un pedido realizado sin parámetros de consulta guarda sellerId: NULL y se etiqueta como trafficSource: "organic_web".

    Venta Digital Asistida: El link con ?seller=CARLOS01 asigna la orden completa a CARLOS01 con trafficSource: "crm_assisted".

    Upsell Presencial: En el POS, es posible marcar un producto individual con sellerId: CARLOS01 mientras que el resto de la orden permanece neutra.

    Follow-Up Integrado: Si el motor de seguimiento automático recupera un carrito abandonado, la venta final mantiene la atribución original del vendedor.

    Exportación Correcta: El reporte de ventas incluye los campos de vendedor e ítems incrementales para auditoría en Excel.

```prisma
// schema.prisma

model Order {
  id              String         @id @default(uuid())
  tenantId        String
  customerPhone   String?
  customerEmail   String?
  totalAmount     Decimal        @db.Decimal(12, 2)
  currency        String         @default("PYG")
  status          OrderStatus    @default(PENDING)
  channel         OrderChannel   // e.g., WHATSAPP_QR, WHATSAPP_META, INSTAGRAM, POS, WEB
  
  // 🔹 NUEVO: Atribución de vendedor a nivel de Pedido Global (Venta Asistida por Chat / Link)
  sellerId        String?        @map("seller_id")
  trafficSource   String?        @map("traffic_source") // e.g., "crm_assisted", "organic_web", "pos_upsell"
  
  items           OrderItem[]
  metadata        Json?          // Trazabilidad adicional de sesión/UTMs
  
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  @@index([tenantId, sellerId])
  @@index([tenantId, createdAt])
  @@map("orders")
}

model OrderItem {
  id          String   @id @default(uuid())
  orderId     String   @map("order_id")
  productId   String   @map("product_id")
  quantity    Int      @default(1)
  unitPrice   Decimal  @map("unit_price") @db.Decimal(12, 2)
  
  // 🔹 NUEVO: Atribución de vendedor a nivel de Ítem Individual (Para Upselling/Cross-selling Presencial)
  sellerId    String?  @map("seller_id")
  
  order       Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@map("order_items")
}

enum OrderChannel {
  WHATSAPP_CLOUD_API
  WHATSAPP_WEB_QR
  INSTAGRAM
  MESSENGER
  TELEGRAM
  POS_COUNTER
  WEB_DIRECT
  CUSTOM_WEBHOOK
}

enum OrderStatus {
  PENDING
  PAID
  CANCELLED
  REFUNDED
}

