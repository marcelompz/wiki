# **Master Prompt — Sprint 2: Core de Mensajería, Canales Base (WhatsApp Cloud & Telegram) y Colas de Despacho**

**Objetivo:** Desarrollar la capa agnóstica de mensajería canónica, la factoría de adaptadores, los conectores de WhatsApp Cloud API oficial y Telegram Bot API, y el sistema de colas de despacho asíncrono con BullMQ y Redis.

Actúa como Tech Lead & Desarrollador Senior Backend en NestJS 10, TypeScript, Meta Graph API, Telegram Bot API y BullMQ.

\#\#\# Contexto del Proyecto:

En el microservicio \`OmniMessaging Hub\`, necesitamos procesar mensajes entrantes y salientes de forma completamente desacoplada del proveedor de mensajería, normalizando el tráfico a través del \*Protocolo Canónico\*.

\#\#\# Objetivo del Sprint 2:

1\. Definir los contratos de datos canónicos (\`CanonicalInboundMessage\`, \`CanonicalOutboundMessage\`) y la interfaz \`IMessagingAdapter\`.

2\. Implementar \`WhatsAppCloudAdapter\` para Meta Cloud API (Graph API v20+).

3\. Implementar \`TelegramAdapter\` para Telegram Bot API.

4\. Construir \`ChannelAdapterFactory\` para instanciación dinámica basada en la configuración activa del tenant.

5\. Configurar el despachador de mensajes salientes con colas BullMQ (\`queue:messaging-outbound\`), control de \*rate limiting\* y Dead Letter Queue (DLQ).

\---

\#\#\# Requerimientos Técnicos y Entregables:

\#\#\#\# 1\. Tipos y Contratos Canónicos (\`src/messaging/canonical/\`):

\- \`CanonicalInboundMessage\`: Identificador normalizado de remitente (\`externalSenderId\`), tenantId, channelType, channelInstanceId, messageId, content (text, mediaUrl, mediaType, selectedButtonPayload), metadata (timestamp, rawPayload).

\- \`CanonicalOutboundMessage\`: Destinatario (\`recipientId\`), tenantId, channelType, channelInstanceId, text, interactiveElements (BUTTONS, LIST\_OPTIONS, URL\_ACTION), mediaUrl.

\- \`IMessagingAdapter\`:

  \`\`\`typescript

  export interface IMessagingAdapter {

    readonly channelType: ChannelType;

    verifyWebhook(req: any): boolean;

    parseInbound(req: any): Promise\<CanonicalInboundMessage | null\>;

    sendMessage(message: CanonicalOutboundMessage): Promise\<DeliveryResult\>;

    sendTypingIndicator?(recipientId: string): Promise\<void\>;

  }

#### **2\. Adaptador WhatsApp Cloud API (`src/messaging/adapters/whatsapp-cloud.adapter.ts`):**

- Endpoint Webhook GET: Verificación de `hub.challenge` con `webhookSecret`.  
- Endpoint Webhook POST: Validación de firma HMAC SHA-256 (`x-hub-signature-256`).  
- Parser Inbound: Extracción de mensajes de texto, respuestas a botones interactivos, selección de listas y notas de voz.  
- Sender Outbound: Envío mediante llamada HTTPS a `https://graph.facebook.com/v20.0/{phone_number_id}/messages` soportando mensajes interactivos (botones/listas) o texto plano.

#### **3\. Adaptador Telegram (`src/messaging/adapters/telegram.adapter.ts`):**

- Parser Inbound: Extracción de mensajes directos, comandos y eventos de callback en *Inline Keyboards*.  
- Sender Outbound: Envío mediante `sendMessage` con parse\_mode `MarkdownV2` (con escape seguro de caracteres especiales) e *Inline Keyboards* con botones URL/Callback.

#### **4\. Factoría de Adaptadores (`src/messaging/channel-adapter.factory.ts`):**

- Servicio `@Injectable()` que recibe un `channelIntegrationId` o `channelType` y las credenciales descifradas por `CredentialsVaultService`, retornando la instancia configurada del adaptador correspondiente.

#### **5\. Colas de Despacho Asíncrono (`src/messaging/queues/outbound-dispatch.processor.ts`):**

- Configuración de cola BullMQ `queue:messaging-outbound` sobre Redis.  
- Políticas de limitación: *Rate Limiter* por tenant y canal (ej. máx 30 msg/min).  
- Resiliencia: 3 reintentos con backoff exponencial y derivación a DLQ (`queue:messaging-outbound-failed`) para auditoría de errores.

Por favor, provee:

1. Las interfaces y tipos canónicos en TypeScript.  
2. La implementación completa de `WhatsAppCloudAdapter` y `TelegramAdapter`.  
3. El servicio `ChannelAdapterFactory` con resolución dinámica.  
4. El controlador de webhooks unificado (`WebhooksController`) bajo la ruta `/api/v1/webhooks/:channelType/:instanceId`.  
5. La configuración del Processor de BullMQ y el servicio de despacho.

