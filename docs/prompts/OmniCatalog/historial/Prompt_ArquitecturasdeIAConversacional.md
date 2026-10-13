Actúa como Tech Lead & Arquitecto Senior de Software en NestJS, TypeScript y Arquitecturas de IA Conversacional.

### Contexto del Proyecto:
Estamos desarrollando el microservicio `@orderflow/omni-catalog-standalone` (NestJS 10, Prisma ORM, TypeScript), parte del ecosistema OmniFlow. 
El microservicio debe incorporar una capa de **Asistente Conversacional Operativo** para canales de mensajería (WhatsApp, Instagram DM, Facebook Messenger) que automatice la atención al cliente, consulte el catálogo/inventario en tiempo real y gestione pedidos.

---

### Objetivo Técnico:
Diseñar e implementar el módulo `OmniBotModule` dentro de `src/omni-catalog/` con capacidades de:
1. **Consulta inteligente de disponibilidad y stock:** Determinar si un producto existe y cuántas unidades disponibles hay, consultando la base de datos de OmniFlow o sincronizando bajo demanda con el ERP legacy conectado (Odoo vía JSON-RPC/REST o SAP Business One vía Service Layer).
2. **Promoción activa del catálogo:** Responder dudas y siempre proveer el enlace directo al catálogo configurado para el comercio (ej. `https://catalog.omniflow.app/c/{tenant_slug}`).
3. **Procesamiento y confirmación de pedidos:** Detección de órdenes entrantes, saludo personalizado, creación/reserva en la BD de OmniCatalog/ERP y emisión del mensaje de confirmación estructurado.
4. **Capa dual de Inferencia de IA (Hybrid AI Engine):**
   - **Opción A (Cloud API):** Integración rápida mediante OpenAI / Gemini API / Claude con llamadas a Function Calling / Tools.
   - **Opción B (Local Edge RAG / Small LLM):** Soporte para correr sobre hardware modesto en las instalaciones del comercio (ej. Mini PC / Servidor local con Ollama, Qwen 2.5 3B/7B o Llama 3.2 3B) utilizando RAG con embeddings locales (o búsqueda semántica por pgvector / SQLite-vec).

---

### Requisitos y Componentes a Implementar:

#### 1. Orquestador de Mensajería (`OmniConversationEngine`):
- Procesar webhooks entrantes de mensajes entrantes.
- Mantener el contexto de conversación por `conversation_id` / `phone_number` con TTL en memoria o Redis.
- Identificar intenciones (*Intents*):
  * `CHECK_STOCK`: Consulta de precio/disponibilidad.
  * `REQUEST_CATALOG`: Solicitud del catálogo o lista general de productos.
  * `PLACE_ORDER`: Envío o confirmación de carrito/pedido.
  * `GENERAL_INQUIRY`: Consultas sobre horarios, ubicación, métodos de pago, etc.

#### 2. Definición de Herramientas / Function Calling (`CatalogTools`):
- `searchProductInventory(query: string, tenantId: string)`:
  * Paso 1: Busca en la base de datos local de OmniCatalog (`Prisma.product`).
  * Paso 2: Si el tenant tiene configurado ERP Sync (`OdooAdapter` o `SAPAdapter`), hace validación o refresco en caliente del stock disponible en el almacén asignado.
- `getCatalogUrl(tenantId: string)`: Devuelve la URL pública del catálogo optimizada con UTM tags.
- `confirmDraftOrder(tenantId: string, orderData: OrderPayload)`: Registra la orden en OmniFlow y emite el ID de seguimiento.

#### 3. Motor de Inferencia & RAG (`IAProviderInterface`):
- Crear la interfaz `IAProvider`:
  ```typescript
  export interface IAProvider {
    generateResponse(
      prompt: string,
      history: ChatMessage[],
      tools: FunctionTool[],
      contextDocs?: string[]
    ): Promise<BotResponse>;
  }