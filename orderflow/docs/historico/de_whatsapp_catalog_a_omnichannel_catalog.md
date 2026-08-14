# 🚀 PROMPT DE EJECUCIÓN: EVOLUCIÓN A CATÁLOGO CONVERSACIONAL OMNICANAL (SOCIAL COMMERCE HUB)

## 📌 CONTEXTO DEL PROYECTO
Plataforma: OrderFlow SaaS Omnicanal (v1.16.0)
Stack Técnico: NestJS, TypeScript, Prisma ORM, PostgreSQL, Redis (BullMQ), React 18 (Vite + Refine.dev + Ant Design).
Objetivo: Refactorizar y evolucionar el módulo `whatsapp-catalog` (Catálogo WhatsApp) hacia un **Social Commerce Hub (Catálogo Conversacional Omnicanal)**. El sistema debe permitir el envío y formalización de pedidos no solo a WhatsApp, sino de manera agnóstica a Instagram Direct, Telegram, Facebook Messenger y webhooks/bots personalizados.

---

## 🎯 OBJETIVOS DE LA INTERVENCIÓN

1. **Actualización de Modelo de Datos (`schema.prisma`):**
   - Crear / extender la entidad de configuración de canales de mensajería (`CatalogChannelConfig`) vinculada al `Tenant`.
   - Definir enum `MessagingChannel` con opciones: `WHATSAPP`, `INSTAGRAM`, `MESSENGER`, `TELEGRAM`, `CUSTOM_WEBHOOK`.
   - Permitir la configuración de credenciales / identificadores por canal (teléfono, `@username`, `pageId`, `webhookUrl`).

2. **Backend NestJS (`orderflow-backend`):**
   - Implementar el patrón **Strategy / Adapter** en `MessagingAdapterService` para la generación unificada de enlaces profundos (Deep Links) y payloads conversacionales.
   - Proveer los siguientes adaptadores:
     - `WhatsAppAdapter`: genera URL `https://wa.me/{phone}?text={encoded_message}`.
     - `TelegramAdapter`: genera URL `https://t.me/{username}?start={order_hash}` o integración con Bot API.
     - `InstagramAdapter`: genera URL `https://ig.me/m/{username}?text={encoded_message}` o payload Meta Graph API.
     - `MessengerAdapter`: genera URL `https://m.me/{page_id}?text={encoded_message}`.
   - Refactorizar el controlador y servicio del módulo para responder con los canales activos y sus respectivos formateadores.

3. **Frontend React (`orderflow-frontend`):**
   - Actualizar la pantalla de Checkout (`CheckoutPage` / `PublicStorefrontPage`).
   - Implementar selector de canales dinámico en el drawer de confirmación según los canales habilitados por el comercio.
   - Inyectar utilidades de formateo en `src/utils/messaging-deep-links.ts`.
   - Actualizar el panel de administración en Refine (`src/pages/admin/catalog-config.tsx`) para gestionar los canales activos.

4. **Documentación y Roadmap (`ROADMAP.md` / Wiki):**
   - Registrar la función `Social Commerce Hub (Omnichannel Catalog)` como hito de versión.
   - Actualizar la tabla de módulos production-ready y los diagramas de flujo.

---

## 📝 INSTRUCCIONES PASO A PASO PARA LA IA / AGENTE DE CÓDIGO

### PASO 1: MIGRACIÓN PRISMA (`schema.prisma`)
Agrega la siguiente estructura respetando el soporte multi-tenant existente:

```prisma
enum MessagingChannel {
  WHATSAPP
  INSTAGRAM
  MESSENGER
  TELEGRAM
  CUSTOM_WEBHOOK
}

model CatalogChannelConfig {
  id          String           @id @default(uuid())
  tenantId    String
  channel     MessagingChannel
  active      Boolean          @default(true)
  isDefault   Boolean          @default(false)
  
  phoneNumber String?          // Para WhatsApp (+595...)
  username    String?          // Para Telegram (@bot) o Instagram (@tienda)
  pageId      String?          // Para Facebook Messenger
  webhookUrl  String?          // Para bots externos (n8n/ManyChat)

  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  tenant      Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, channel])
  @@index([tenantId])
  @@map("catalog_channel_configs")
}