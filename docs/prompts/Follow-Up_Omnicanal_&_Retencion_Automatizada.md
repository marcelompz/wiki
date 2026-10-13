### ROL Y CONTEXTO
Actúa como un Desarrollador Full-Stack Senior especializado en NestJS, Prisma, Redis (BullMQ) y React (Refine.dev + Ant Design).

Estamos trabajando sobre la nueva arquitectura **FEAT-48 (Social Commerce Omnichannel Hub)** de OrderFlow, donde el catálogo y la mensajería están refactorizados bajo `backend/src/social-catalog/` con arquitectura Strategy Pattern y soporte omnicanal (`MessagingChannel`: `WHATSAPP`, `INSTAGRAM`, `MESSENGER`, `TELEGRAM`, `CUSTOM_WEBHOOK`).

### OBJETIVO DE LA FEATURE
Desarrollar el módulo de **"Follow-Up Omnicanal & Retención Automatizada"** integrado al nuevo hub social. El sistema debe detectar abandonos de carritos/citas procedentes de cualquier canal de mensajería configurado (`CatalogChannelConfig`) y ejecutar secuencias de seguimiento automático utilizando los adaptadores correspondientes (`IMessagingAdapter`).

---

### ESPECIFICACIONES TÉCNICAS Y REQUERIMIENTOS

#### 1. Backend (NestJS + Social Catalog Module + BullMQ)
- **Ubicación:** `backend/src/social-catalog/follow-up/`
- **Integración con Strategy Pattern:**
  - El worker de seguimiento **no debe acoplarse a WhatsApp Cloud API**. Debe inyectar y llamar al servicio adaptador correspondiente resolvedor de `IMessagingAdapter` (`WhatsappAdapter`, `InstagramAdapter`, `TelegramAdapter`, etc.) según el campo `channel` registrado en la sesión/orden.
- **Cola de Tareas (BullMQ sobre Redis):**
  - Cuando se inicie un checkout o intención de cita en `social-catalog` con estado `PENDING`, registra un *delayed job* en BullMQ pasando el `tenantId`, `channel` (`MessagingChannel`), `recipientId` (teléfono/psid/chat_id) y el `payload` del mensaje.
  - Al recibir un webhook de confirmación/pago en `/api/v1/social-catalog/webhooks/` (Stripe, MercadoPago o confirmación manual) con estado `CONFIRMED` o `CANCELLED`, el job debe ser removido inmediatamente de Redis (`job.remove()`).
  - Si el temporizador expira (ej: 120 minutos), el processor de BullMQ invoca `messagingAdapter.sendMessage(recipientId, templatePayload)`.

#### 2. Prisma Schema (`prisma/schema.prisma`)
Crea el modelo `SocialFollowUpRule` relacionado con `Tenant` y `CatalogChannelConfig`:

```prisma
model SocialFollowUpRule {
  id                   String           @id @default(uuid())
  tenantId             String
  tenant               Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  channel              MessagingChannel
  channelConfigId      String?
  channelConfig        CatalogChannelConfig? @relation(fields: [channelConfigId], references: [id])
  targetType           FollowUpTargetType    // Enum: CART_ABANDONED, BOOKING_PENDING
  delayInMinutes       Int                   @default(120)
  templateOrMessage    String                // ID de plantilla (Meta) o texto directo (Telegram/Custom)
  isActive             Boolean               @default(true)
  createdAt            DateTime              @default(now())
  updatedAt            DateTime              @updatedAt

  @@index([tenantId, channel])
}

enum FollowUpTargetType {
  CART_ABANDONED
  BOOKING_PENDING
}