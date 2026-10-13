# **OmniMessaging Hub & OmniCatalog — Plan Maestro de Arquitectura y Desarrollo Técnico**

**Documento Técnico Oficial — Especificación de Ingeniería y Despliegue**  
**Gobernanza:** FEAT-072 v1.1.0 (Arquitectura Desacoplada)  
**Ecosistema:** OmniFlow SaaS (NestJS 10, Prisma ORM, PostgreSQL 15, Redis, BullMQ, React 18 / Refine.dev, Traefik v3.3, Docker Compose)  
**Componentes:**

1. `OmniMessaging Hub` (Servicio de Infraestructura Horizontal Transversal)  
2. `OmniCatalog` (Módulo de Negocio Consumidor / Catálogo Conversacional)  
   **Fecha:** Agosto 2026  
   **Estado:** Aprobado y Vigente

---

## **1\. Resumen Ejecutivo y Cambio de Paradigma**

Para evitar la duplicación de código y permitir que todo el ecosistema de OmniFlow (el Tridente PLG compuesto por **OmniCatalog**, **OmniBookings** y **BioLinks**, junto con **OmniQuotations** y **OmniPOS**) interactúe con los clientes a través de mensajería, se establece una **separación arquitectónica estricta**:

1. **`OmniMessaging Hub` (Capa Horizontal):** Administra de forma centralizada la conectividad con canales externos (WhatsApp Cloud API, Telegram, Messenger, Instagram, WebChat), la seguridad y cifrado de credenciales, el aislamiento multi-tenant, las colas de despacho con *rate-limiting*, la auditoría histórica de mensajes y el control de gasto/cuotas de IA.  
2. **Módulos de Negocio Consumidores (Capa Vertical):** Implementan sus propias herramientas (*Tools*) y controladores de intención (*Intent Handlers*) sin conocer los detalles de conexión ni los payloads crudos de las plataformas de mensajería.

---

## **2\. Arquitectura General del Ecosistema**

┌─────────────────────────────────────────────────────────────────────────────────────────────┐

│                                    CANALES DE MENSAJERÍA                                    │

│             WhatsApp (Meta Cloud API / QR) · Telegram · Messenger · Instagram               │

└──────────────────────────────────────────────┬──────────────────────────────────────────────┘

                                               │

                                               ▼

┌─────────────────────────────────────────────────────────────────────────────────────────────┐

│                          OMNIMESSAGING HUB (Servicio Horizontal)                            │

│                                                                                             │

│  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐      │

│  │  ChannelAdapterFactory  │  │ CredentialsVaultService │  │  QuotaPlanGuard (Redis) │      │

│  │ (WhatsApp, TG, Meta)    │  │ (AES-256-GCM \+ HKDF)    │  │ (Límites tokens/mensajes)│      │

│  └────────────┬────────────┘  └─────────────────────────┘  └─────────────────────────┘      │

│               │                                                                             │

│               ▼                                                                             │

│  ┌─────────────────────────────────────────────────────────────────────────────────────┐    │

│  │                       Canonical Message Protocol & Event Bus                        │    │

│  │  • Normalización Inbound / Outbound          • Dispatcher en Colas (BullMQ)         │    │

│  │  • Persistencia de Sesión & Message Log      • Enrutador de Intenciones / Módulos   │    │

│  │  • Flujo HUMAN\_TAKEOVER                      • Hybrid AI Engine (Cloud / Edge RAG)  │    │

│  └──────────────────────────────────────┬──────────────────────────────────────────────┘    │

└─────────────────────────────────────────┼───────────────────────────────────────────────────┘

                                          │

                  ┌───────────────────────┼───────────────────────┐

                  │ (Eventos / RPC / Bus) │                       │

                  ▼                       ▼                       ▼

┌──────────────────────────────┐ ┌───────────────────┐ ┌──────────────────────┐

│         OMNICATALOG          │ │   OMNIBOOKINGS    │ │ OMNIQUOTATIONS / POS │

│ • Handler: Ventas / Catálogo │ │ • Handler: Turnos │ │ • Handler: Comprob.  │

│ • Tool: Stock en Odoo/Prisma │ │ • Tool: Agendas   │ │ • Tool: Presupuestos │

│ • Tool: Enlace de Catálogo   │ │ • Tool: Servicios │ │ • Tool: Facturas SET │

└──────────────────────────────┘ └───────────────────┘ └──────────────────────┘

---

## **3\. Seguridad, Cifrado y Aislamiento Multi-Tenant**

### ***3.1. Cifrado de Credenciales (`CredentialsVaultService`)***

* Las credenciales de canales (Tokens de Meta, Bot Tokens de Telegram, API Keys de IA) se cifran mediante **AES-256-GCM**.  
* Las claves de cifrado son derivadas por `tenantId` usando **HKDF** a partir de una clave maestra (`MASTER_KEY_SECRET`), garantizando que la exposición de un vector de inicialización no comprometa a otros tenants.  
* Las respuestas de la API administrativa nunca devuelven credenciales en texto plano (solo máscaras `***configurado***`).

### ***3.2. Aislamiento Multi-Tenant en Base de Datos y Caché***

* **Prisma Client Extensions:** Middleware/Extensión global que inyecta automáticamente el filtro `where: { tenantId }` en todas las consultas de lectura y mutación.  
* **Redis Namespacing:** Todas las claves en caché y streams respetan el prefijo `tenant:{tenantId}:...`.

---

## **4\. Modelo de Datos Prisma Unificado (`schema.prisma`)**

// Integración de Canales de Comunicación

model ChannelIntegration {

  id                  String             @id @default(cuid())

  tenantId            String

  tenant              Tenant             @relation(fields: \[tenantId\], references: \[id\], onDelete: Cascade)


  channelType         String             // "WHATSAPP\_CLOUD", "WHATSAPP\_QR", "TELEGRAM", etc.

  name                String             // Ej: "WhatsApp Principal"

  isEnabled           Boolean            @default(true)


  // Credenciales cifradas con AES-256-GCM

  encryptedCredentials String            @db.Text

  iv                  String

  tag                 String

  webhookSecret       String?


  rateLimitPerMinute  Int                @default(30)

  cooldownSeconds     Int                @default(2)


  conversations       OmniConversation\[\]


  createdAt           DateTime           @default(now())

  updatedAt           DateTime           @updatedAt

  @@unique(\[tenantId, channelType, name\])

  @@index(\[tenantId, isEnabled\])

}

// Configuración de IA y Cuotas por Tenant

model TenantBotConfig {

  id                  String             @id @default(cuid())

  tenantId            String             @unique

  tenant              Tenant             @relation(fields: \[tenantId\], references: \[id\], onDelete: Cascade)


  aiEngineMode        String             @default("CLOUD\_API") // "CLOUD\_API" | "LOCAL\_EDGE\_RAG"

  cloudProvider       String?            // "OPENAI", "GEMINI", "ANTHROPIC"

  encryptedApiKey     String?            @db.Text

  apiKeyIv            String?

  apiKeyTag           String?


  localEndpoint       String?            @default("http://localhost:11434")

  localModelName      String?            @default("qwen2.5:3b")


  botName             String             @default("Asistente Virtual")

  customGreeting      String?

  fallbackMessage     String?            @default("En breve un asesor te responderá.")

  systemPromptBase    String?            @db.Text


  // Control de Cuotas

  monthlyTokenQuota   Int                @default(500000)

  monthlyMessageQuota Int                @default(2000)

  autoShareCatalog    Boolean            @default(true)

  autoConfirmOrders   Boolean            @default(true)


  createdAt           DateTime           @default(now())

  updatedAt           DateTime           @updatedAt

  @@index(\[tenantId\])

}

// Sesiones Conversacionales

model OmniConversation {

  id                  String             @id @default(cuid())

  tenantId            String

  channelIntegrationId String

  channelIntegration ChannelIntegration @relation(fields: \[channelIntegrationId\], references: \[id\], onDelete: Cascade)


  externalSenderId    String             // E.164, Telegram Chat ID, PSID

  customerName        String?

  customerId          String?            // FK opcional con CRM


  status              String             @default("ACTIVE") // "ACTIVE", "BOT\_PAUSED", "HUMAN\_TAKEOVER"

  activeModuleContext String?            // "OMNICATALOG", "OMNIBOOKINGS", null

  lastInteractionAt   DateTime           @default(now())

  contextMemory       Json?              // Estado de la máquina de diálogo


  messages            Message\[\]


  createdAt           DateTime           @default(now())

  updatedAt           DateTime           @updatedAt

  @@unique(\[tenantId, channelIntegrationId, externalSenderId\])

  @@index(\[tenantId, externalSenderId\])

}

// Historial y Auditoría de Mensajes

model Message {

  id                  String             @id @default(cuid())

  conversationId      String

  conversation        OmniConversation   @relation(fields: \[conversationId\], references: \[id\], onDelete: Cascade)

  tenantId            String


  direction           String             // "INBOUND" | "OUTBOUND"

  channelType         String

  content             Json               // { text, mediaUrl, interactivePayload }

  aiGenerated         Boolean            @default(false)

  tokensConsumed      Int                @default(0)

  deliveryStatus      String             @default("DELIVERED") // "PENDING", "SENT", "DELIVERED", "FAILED"


  createdAt           DateTime           @default(now())

  @@index(\[tenantId, conversationId, createdAt\])

}

---

## **5\. Roadmap de Implementación Pragmático (MVP Fase 1\)**

| Sprint | Enfoque | Entregables Clave | Tecnologías |
| :---- | :---- | :---- | :---- |
| **Sprint 1** | **Infraestructura & Seguridad** | • Modelos Prisma (`ChannelIntegration`, `TenantBotConfig`, `OmniConversation`, `Message`). • `CredentialsVaultService` (cifrado AES-256-GCM \+ HKDF). • Interceptor Prisma de aislamiento multi-tenant. • Traefik v3.3 labels y configuración base Docker Compose. | NestJS 10, Prisma, PostgreSQL 15, Traefik v3.3 |
| **Sprint 2** | **Core de Mensajería & Canales** | • `ChannelAdapterFactory` con **WhatsApp Cloud API** y **Telegram**. • Normalización canónica (`CanonicalInboundMessage` / `CanonicalOutboundMessage`). • Colas BullMQ con rate-limiting y Dead Letter Queue (DLQ). | BullMQ, Redis, Meta Graph API, Telegram API |
| **Sprint 3** | **Motor de IA & Control de Cuotas** | • `CloudAIProvider` con Tool Calling nativo (OpenAI / Gemini / Claude). • `QuotaPlanGuard` (control de tokens y mensajes mensuales en Redis). • `IntentRouterService` para delegación dinámica a módulos de negocio. | TypeScript, OpenAI SDK, Gemini SDK, Redis |
| **Sprint 4** | **Consumidor OmniCatalog & ERP** | • `CatalogToolsService` (consulta de stock en Prisma y conector **Odoo** JSON-RPC). • Generador de URLs públicas del catálogo con UTMs. • Inyección de pedidos con idempotencia (`order_uuid`). | Odoo Connector, Prisma, Redis Cache |
| **Sprint 5** | **Admin UI, Human Takeover & Deploy** | • Panel administrativo en React/Refine (`/admin/messaging`, `/admin/bot-settings`). • Flujo visual en vivo de `HUMAN_TAKEOVER` con WebSockets. • CI/CD en Hetzner y pruebas en entorno real (Cafetería). | React 18, Refine.dev, GitHub Actions, Hetzner |

* **Fase 2 (Post-MVP):** Conector WhatsApp Web Engine (QR/Baileys), Instagram Direct, Facebook Messenger, conector SAP Business One y motor Edge Local RAG con Ollama.

