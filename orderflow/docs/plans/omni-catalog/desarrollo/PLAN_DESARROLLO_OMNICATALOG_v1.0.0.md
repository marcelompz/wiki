# **OmniCatalog — Plan Maestro de Arquitectura, Desarrollo y Despliegue Técnico**

**Documento Técnico Oficial — Especificación de Ingeniería y Despliegue**  
**Gobernanza:** FEAT-072 v1.0.0  
**Ecosistema:** OmniFlow SaaS (NestJS 10, Prisma ORM, PostgreSQL 15, Redis, BullMQ, React 18 / Refine.dev, Traefik v3.3, Docker Compose)  
**Módulo:** OmniCatalog Standalone / OmniBot Conversacional Omnicanal  
**Fecha:** Agosto 2026  
**Estado:** Aprobado y Vigente

---

## **1\. Resumen Ejecutivo y Visión Estratégica**

OmniCatalog evoluciona el catálogo interactivo para redes sociales de OmniFlow hacia un **portal de comercio conversacional de alta velocidad potenciado por IA**. Su objetivo es permitir que cualquier comercio digitalice su catálogo, atienda consultas de disponibilidad y procese pedidos de manera 100% automatizada a través de cualquier canal de mensajería (WhatsApp Cloud API, WhatsApp Web Engine con QR, Telegram, Facebook Messenger, Instagram Direct o WebChat).

### ***Principios Fundamentales***

1. **Omnicanalidad Real y Desacoplada (Channel-Agnostic):** El núcleo conversacional y el motor de IA operan exclusivamente sobre un *Protocolo de Mensajería Canónica*, delegando la especificidad de cada red a adaptadores intercambiables.  
2. **Consultas de Inventario en Tiempo Real:** Validación de stock contra la base de datos de OmniCatalog con capacidad de sincronización y refresco en caliente contra ERPs tradicionales (Odoo, SAP Business One, MIDA o APIs propietarias).  
3. **Motor Dual de Inteligencia Artificial (Hybrid AI Engine):**  
   - *Modo Cloud API:* Inferencia rápida con herramientas nativas (*Tool Calling*) vía OpenAI, Gemini o Claude.  
   - *Modo Edge Local RAG (Hardware Modesto):* Inferencia local sobre Mini PCs o servidores on-premise del comercio mediante Ollama (Qwen 2.5 3B/7B o Llama 3.2 3B) con embeddings/contexto compacto para operar sin costos de nube y con total privacidad de datos.  
4. **Multi-Tenancy y Aislamiento Estricto:** Toda transacción, sesión, caché y cola está rigurosamente particionada por `tenantId`, compatible con los tiers de aislamiento `shared` y `dedicated`.  
5. **Infraestructura con Traefik v3.3 Exclusivo:** Reverse proxy dinámico con SSL Let's Encrypt automático y DNS Cloudflare en modo *DNS Only* (`proxied: false`) desplegado sobre VPS Hetzner.

---

## **2\. Arquitectura General del Sistema**

┌─────────────────────────────────────────────────────────────────────────────┐

│                          TRAEFIK v3.3 (Edge Proxy)                          │

│               catalogo.omniflow.app  /  catalogo.pesallaccia.com            │

└──────────────────────────────────────┬──────────────────────────────────────┘

                                       │ (Red Docker: traefik-public)

┌──────────────────────────────────────▼──────────────────────────────────────┐

│       @orderflow/omni-catalog-standalone (NestJS 10 \+ Prisma Service)       │

│                                                                             │

│  ┌─────────────────────────┐  ┌───────────────────┐  ┌───────────────────┐  │

│  │ OmniConversationEngine  │  │   CatalogTools    │  │  QuotaPlanGuard   │  │

│  │ (State Machine / Hooks) │  │ (Stock / URLs)    │  │ (Tier Validation) │  │

│  └────────────┬────────────┘  └─────────┬─────────┘  └───────────────────┘  │

│               │                         │                                   │

│  ┌────────────▼─────────────────────────▼────────────────────────────────┐  │

│  │                     Hybrid AI Engine Layer                            │  │

│  │   • CloudAIProvider (OpenAI / Gemini / Claude API \+ Tool Calling)     │  │

│  │   • OllamaLocalRAGProvider (Qwen 2.5 / Llama 3.2 en Hardware Local)   │  │

│  └──────────────────────────────────────┬────────────────────────────────┘  │

└─────────────────────────────────────────┼───────────────────────────────────┘

                                          │

            ┌─────────────────────────────┼─────────────────────────────┐

            ▼                             ▼                             ▼

┌───────────────────────┐   ┌──────────────────────────┐   ┌─────────────────────────┐

│   PostgreSQL / Redis  │   │  Messaging Connectors    │   │  ERP Adapters Layer     │

│ • Catálogo & Variantes│   │ • Meta Cloud API (HSM)   │   │ • Odoo (JSON-RPC/REST)  │

│ • Sesiones & Colas    │   │ • WhatsApp Web Engine QR │   │ • SAP B1 (Service Layer)│

│ • isolationTier Check │   │ • Instagram / Telegram   │   │ • Webhooks Genéricos    │

└───────────────────────┘   └──────────────────────────┘   └─────────────────────────┘

---

## **3\. Protocolo de Mensajería Canónica y Gateway Omnicanal**

### ***3.1. Tipos y Modelos Canónicos (`Canonical Message Protocol`)***

export enum ChannelType {

  WHATSAPP\_CLOUD \= 'WHATSAPP\_CLOUD',     // Meta Cloud API oficial

  WHATSAPP\_QR \= 'WHATSAPP\_QR',           // Conexión Web/Baileys por QR

  TELEGRAM \= 'TELEGRAM',                 // Telegram Bot API

  MESSENGER \= 'MESSENGER',               // Facebook Messenger

  INSTAGRAM\_DIRECT \= 'INSTAGRAM\_DIRECT', // Instagram Messaging API

  WEBCHAT \= 'WEBCHAT',                   // Widget web embebido

  CUSTOM\_WEBHOOK \= 'CUSTOM\_WEBHOOK',     // API para canales propios

}

export interface CanonicalInboundMessage {

  tenantId: string;

  channelType: ChannelType;

  channelInstanceId: string;

  externalSenderId: string;    // Teléfono E.164, Telegram ChatID, PSID

  senderDisplayName?: string;

  messageId: string;

  content: {

    text?: string;

    mediaUrl?: string;

    mediaType?: 'IMAGE' | 'AUDIO' | 'DOCUMENT' | 'LOCATION';

    selectedButtonPayload?: string;

  };

  metadata: {

    timestamp: Date;

    rawPayload: any;

  };

}

export interface CanonicalOutboundMessage {

  tenantId: string;

  channelType: ChannelType;

  channelInstanceId: string;

  recipientId: string;

  text: string;

  interactiveElements?: {

    type: 'BUTTONS' | 'LIST\_OPTIONS' | 'URL\_ACTION';

    title?: string;

    options: Array\<{

      id: string;

      label: string;

      url?: string;

    }\>;

  };

  mediaUrl?: string;

}

### ***3.2. Interfaz del Adaptador (`IMessagingAdapter`)***

export interface IMessagingAdapter {

  readonly channelType: ChannelType;

  verifyWebhook(req: any): boolean;

  parseInbound(req: any): Promise\<CanonicalInboundMessage | null\>;

  sendMessage(message: CanonicalOutboundMessage): Promise\<DeliveryResult\>;

  sendTypingIndicator?(recipientId: string): Promise\<void\>;

}

### ***3.3. Matriz de Degradación de Componentes Interactivos***

| Componente Canónico | Telegram | WhatsApp Cloud API | WhatsApp QR (Web Engine) | Facebook / Instagram | WebChat del Catálogo |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **Enlace al Catálogo** | Botón *WebApp* o inline link | Mensaje con botón CTA interactivo | Texto libre con link \+ vista previa | Botón URL en webview | Botón flotante directo |
| **Botones de Opciones** | *Inline Keyboards* | Mensajes interactivos de lista/botones | Menú numerado con emojis (*"1. Opción A"*) | *Quick Replies* horizontales | Botones de selección rápida |
| **Confirmación de Pedido** | Tarjeta con resumen y botón de pago | Mensaje estructurado con botón de tracking | Mensaje de texto formateado con ticket | Tarjeta con imagen de recibo | Resumen interactivo en pantalla |

---

## **4\. Motor de Inteligencia Artificial Híbrido (`Hybrid AI Engine`)**

export interface IAProvider {

  generateResponse(

    prompt: string,

    history: ChatMessage\[\],

    tools: FunctionTool\[\],

    contextDocs?: string\[\]

  ): Promise\<BotResponse\>;

}

### ***4.1. Proveedor Cloud (`CloudAIProvider`)***

* Soporte para OpenAI (GPT-4o/Mini), Google Gemini (2.0 Flash) y Anthropic Claude (3.5 Sonnet).  
* Uso de *Function Calling* / *Tool Use* para delegar consultas de stock y enlaces a herramientas seguras.

### ***4.2. Proveedor Local Edge RAG (`OllamaLocalRAGProvider`)***

* Diseñado para hardware modesto en instalaciones locales (Intel N100, Core i3/i5 con 8GB–16GB RAM, sin GPUs dedicadas).  
* Conexión HTTP hacia endpoint local de Ollama (`http://localhost:11434/api/chat`).  
* Modelos optimizados: `qwen2.5:3b`, `qwen2.5:7b`, `llama3.2:3b`.  
* Inyección de RAG compacto: Ingesta dinámica de categorías activas, top productos y reglas del negocio en el System Prompt para evitar latencias de búsqueda vectorial pesada.

### ***4.3. Herramientas Operativas de Catálogo (`CatalogToolsService`)***

1. `checkStockAvailability(query, tenantId)`: Busca en la tabla local `ProductVariant` y, si el tenant tiene activo `erp_sync_enabled`, consulta en caliente el saldo disponible en el almacén de Odoo o SAP.  
2. `getCatalogLink(tenantId, trackingParams)`: Retorna la URL pública optimizada del catálogo (`https://catalogo.omniflow.app/c/{tenant_slug}?utm_source={channel}`).  
3. `processIncomingOrder(tenantId, orderPayload)`: Registra la orden borrador, genera el identificador idempotente `order_uuid` y encola la inyección hacia el ERP.

---

## **5\. Sincronización con Sistemas ERP Legacy**

### ***5.1. Conector Odoo (`OdooAdapter`)***

* Conexión vía JSON-RPC / REST hacia Odoo Community o Enterprise (v16 a v19).  
* Mapeo de modelos:  
  * Consulta de stock: `stock.quant` / `product.product`.  
  * Inyección de pedidos: `sale.order` y `sale.order.line` en estado `draft` (presupuesto) o `sale` (confirmado).

### ***5.2. Conector SAP Business One (`SAPAdapter`)***

* Conexión mediante Service Layer HTTPS (`/b1s/v2/Items`, `/b1s/v2/Orders`, `/b1s/v2/BusinessPartners`).

### ***5.3. Motor de Resiliencia en Colas (BullMQ \+ Redis)***

* Cola `order-erp-injection`: Reintentos exponenciales con *backoff* (1m, 5m, 15m, 1h) y Dead Letter Queue (DLQ) para garantizar que las caídas de red o servidor en el ERP nunca pierdan órdenes.  
* Cola `messaging-outbound`: Control de flujo con *rate-limiting* estricto para canales no oficiales (WhatsApp QR), evitando bloqueos preventivos de Meta.

---

## **6\. Modelo de Datos Integral en Prisma (`schema.prisma`)**

// Configuración de Canales de Mensajería

model ChannelIntegration {

  id                  String             @id @default(cuid())

  tenantId            String

  tenant              Tenant             @relation(fields: \[tenantId\], references: \[id\], onDelete: Cascade)


  channelType         String             // "WHATSAPP\_CLOUD", "WHATSAPP\_QR", "TELEGRAM", "MESSENGER", etc.

  name                String             // Ej: "WhatsApp Ventas \- Casa Central"

  isEnabled           Boolean            @default(true)


  credentials         Json               // Tokens, Phone ID, API Keys (cifrados)

  webhookSecret       String?


  rateLimitPerMinute  Int                @default(30)

  cooldownSeconds     Int                @default(2)


  conversations       OmniConversation\[\]


  createdAt           DateTime           @default(now())

  updatedAt           DateTime           @updatedAt

  @@unique(\[tenantId, channelType, name\])

  @@index(\[tenantId, isEnabled\])

}

// Configuración del Motor de IA y Bot por Tenant

model TenantBotConfig {

  id                  String             @id @default(cuid())

  tenantId            String             @unique

  tenant              Tenant             @relation(fields: \[tenantId\], references: \[id\], onDelete: Cascade)


  aiEngineMode        String             @default("CLOUD\_API") // "CLOUD\_API" | "LOCAL\_EDGE\_RAG"

  cloudProvider       String?            // "OPENAI", "GEMINI", "ANTHROPIC"

  cloudApiKey         String?

  localEndpoint       String?            @default("http://localhost:11434")

  localModelName      String?            @default("qwen2.5:3b")


  botName             String             @default("Asistente Virtual")

  customGreeting      String?

  fallbackMessage     String?

  systemPromptBase    String?            @db.Text

  autoShareCatalog    Boolean            @default(true)

  autoConfirmOrders   Boolean            @default(true)


  createdAt           DateTime           @default(now())

  updatedAt           DateTime           @updatedAt

  @@index(\[tenantId\])

}

// Conversaciones y Sesiones Unificadas

model OmniConversation {

  id                  String             @id @default(cuid())

  tenantId            String

  channelIntegrationId String

  channelIntegration ChannelIntegration @relation(fields: \[channelIntegrationId\], references: \[id\], onDelete: Cascade)


  externalSenderId    String             // Teléfono o ID externo

  customerName        String?

  customerId          String?            // FK opcional con CRM


  status              String             @default("ACTIVE") // ACTIVE, BOT\_PAUSED, HUMAN\_TAKEOVER

  lastInteractionAt   DateTime           @default(now())

  contextMemory       Json?              // Historial y estado de diálogo


  createdAt           DateTime           @default(now())

  updatedAt           DateTime           @updatedAt

  @@unique(\[tenantId, channelIntegrationId, externalSenderId\])

  @@index(\[tenantId, externalSenderId\])

}

---

## **7\. Despliegue con Traefik v3.3 en Hetzner VPS**

### ***7.1. Orquestación Docker Compose (`docker-compose.standalone.yml`)***

services:

  omni-catalog-standalone:

    image: orderflow/omni-catalog-standalone:v1.0.0

    container\_name: orderflow-omni-catalog

    restart: unless-stopped

    networks:

      \- traefik-public

      \- internal-net

    environment:

      \- PORT=3020

      \- DATABASE\_URL=${DATABASE\_URL}

      \- REDIS\_URL=${REDIS\_URL}

      \- ORDERFLOW\_MODE=community

      \- OLLAMA\_HOST=http://host.docker.internal:11434

    labels:

      \- "traefik.enable=true"

      \- "traefik.docker.network=traefik-public"

      \# Enrutamiento HTTPS

      \- "traefik.http.routers.omnicatalog-https.rule=Host(\`catalogo.omniflow.app\`) || Host(\`catalogo.pesallaccia.com\`)"

      \- "traefik.http.routers.omnicatalog-https.entrypoints=websecure"

      \- "traefik.http.routers.omnicatalog-https.tls=true"

      \- "traefik.http.routers.omnicatalog-https.tls.certresolver=letsencrypt"

      \# Servicio y balanceador

      \- "traefik.http.services.omnicatalog.loadbalancer.server.port=3020"

### ***7.2. Automatización DNS con Cloudflare***

* El microservicio utiliza la API de Cloudflare (`CLOUDFLARE_API_TOKEN`) para registrar subdominios con `proxied: false` (DNS Only / Nube Gris), permitiendo que Traefik v3.3 emita certificados SSL Let's Encrypt para subdominios sin limitaciones de handshake.

---

## **8\. Roadmap de Desarrollo Técnico (Sprints)**

| Fase | Sprint | Entregables Clave | Tecnologías |
| :---- | :---- | :---- | :---- |
| **Fase 1** | **Sprint 1 (Semana 1\)** | • Modelos Prisma (`ChannelIntegration`, `TenantBotConfig`, `OmniConversation`). • `omnicatalog.manifest.json` y registro en Core. • Configuración base en Traefik v3.3 y Docker Compose. | NestJS 10, Prisma, PostgreSQL 15, Traefik v3.3 |
| **Fase 2** | **Sprint 2 (Semana 2\)** | • Herramientas de Catálogo (`CatalogToolsService`). • Adaptadores ERP para validación de stock (Odoo JSON-RPC y SAP B1). • Caché de catálogo y estado conversacional en Redis. | NestJS, Redis, Odoo Connector, Prisma |
| **Fase 3** | **Sprint 3 (Semana 3\)** | • Implementación de `CloudAIProvider` con Tool Calling. • Implementación de `OllamaLocalRAGProvider` (Edge Local). • `OmniConversationEngine` con máquina de estados y prompts. | TypeScript, OpenAI/Gemini SDK, Ollama API |
| **Fase 4** | **Sprint 4 (Semana 4\)** | • Webhook receiver unificado y `ChannelAdapterFactory`. • Adaptadores WhatsApp (Cloud/QR) y Telegram. • Colas BullMQ con políticas de rate-limiting y DLQ. | BullMQ, Redis, Baileys / Meta / Telegram APIs |
| **Fase 5** | **Sprint 5 (Semana 5\)** | • Interfaz administrativa en React \+ Refine (`/admin/bot-settings`). • Validación en entorno real (Laboratorio Cafetería / Tienda). • Pipeline de CI/CD hacia VPS Hetzner con health checks. | React 18, Refine.dev, GitHub Actions, Hetzner |

---

## **9\. Criterios de Aceptación y SLAs Técnicos**

1. **Latencia de Respuesta:** Menor a 1.5s en Cloud API y menor a 2.5s en hardware modesto local con Ollama (3B).  
2. **Disponibilidad y Resiliencia:** Tasa de entrega de órdenes \>99.9% incluso ante caídas temporales del ERP legacy (mediante cola DLQ).  
3. **Aislamiento Multi-Tenant:** 100% de aislamiento verificado por `tenantId` en PostgreSQL, Redis y Colas.  
4. **Degradación Elegante:** Funcionamiento fluido e intuitivo en todos los canales soportados sin rotura de formato.

