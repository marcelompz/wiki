# **Master Prompt — Sprint 3: Motor de IA Híbrido, Tool Calling, Control de Cuotas y Enrutador de Intenciones**

**Objetivo:** Desarrollar el proveedor de IA Cloud con llamadas a herramientas nativas (*Function Calling*), el sistema de control estricto de gasto de tokens (`QuotaPlanGuard`) en Redis y el enrutador de intenciones para derivar la atención al módulo de negocio correcto.

Actúa como Tech Lead & Especialista Senior en Arquitecturas de IA Conversacional (TypeScript, NestJS 10, OpenAI SDK, Google Gemini SDK, Redis).

\#\#\# Contexto del Proyecto:

\`OmniMessaging Hub\` necesita interpretar los mensajes canónicos entrantes, evaluar si el tenant dispone de saldo/cuota de IA, ejecutar llamadas a herramientas seguras (\*Tool Calling\*) y enrutar la conversación al módulo de negocio correspondiente (\`OmniCatalog\`, \`OmniBookings\`, etc.).

\#\#\# Objetivo del Sprint 3:

1\. Implementar la interfaz \`IAProvider\` y el conector \`CloudAIProvider\` con soporte de Tool Calling para OpenAI (GPT-4o/Mini), Gemini (2.0 Flash) y Claude (3.5 Sonnet).

2\. Construir \`QuotaPlanGuard\` para monitorear el consumo mensual de tokens y mensajes por tenant en Redis con corte preventivo y degradación a fallback.

3\. Crear \`IntentRouterService\` para clasificar intenciones y mantener el contexto de sesión (\`activeModuleContext\`).

4\. Implementar la gestión de memoria conversacional en Redis con TTL de sesión.

\---

\#\#\# Requerimientos Técnicos y Entregables:

\#\#\#\# 1\. Interfaz y Proveedor Cloud de IA (\`src/ai/\`):

\- \`IAProvider\`:

  \`\`\`typescript

  export interface IAProvider {

    generateResponse(

      prompt: string,

      history: ChatMessage\[\],

      tools: FunctionTool\[\],

      systemContext?: string

    ): Promise\<{

      replyText: string;

      toolCalls?: Array\<{ id: string; name: string; args: any }\>;

      tokensUsed: number;

    }\>;

  }

- `CloudAIProvider`:  
  * Soporte dinámico para proveedores OpenAI (`openai`), Gemini (`@google/genai`) y Anthropic (`@anthropic-ai/sdk`).  
  * Inyección segura de la API Key descifrada por `CredentialsVaultService`.  
  * Ciclo de ejecución de *Tool Calling*: Si el modelo devuelve llamadas a herramientas, invocar la función correspondiente en el módulo consumidor y reenviar el resultado al modelo para generar la respuesta final.

#### **2\. Guardián de Cuotas y Control de Costos (`src/ai/quota-plan.guard.ts`):**

- Gestión atómica en Redis con claves:  
  * `tenant:{tenantId}:usage:tokens:{YYYY-MM}`  
  * `tenant:{tenantId}:usage:messages:{YYYY-MM}`  
- Verificación previa a la inferencia (`canProcessMessage(tenantId: string): Promise<boolean>`):  
  * Si el tenant superó `monthlyTokenQuota` o `monthlyMessageQuota`, bloquear la llamada a la IA y retornar inmediatamente `fallbackMessage` (o menú estático sin costo).  
- Registro post-inferencia (`recordUsage(tenantId: string, tokens: number): Promise<void>`).  
- Caché de respuestas frecuentes (horarios, ubicación, medios de pago) con TTL de 24h para reducir consultas redundantes a la IA.

#### **3\. Enrutador de Intenciones y Orquestador de Sesión (`src/conversation/`):**

- `OmniConversationEngine`:  
  * Carga o inicializa la sesión en Redis (`tenant:{tenantId}:session:{senderId}`).  
  * Si la conversación ya tiene un `activeModuleContext` (ej. armando un pedido en `OMNICATALOG` o agendando un turno en `OMNIBOOKINGS`), enruta directamente al handler de ese módulo.  
  * Si no hay contexto activo, clasifica la intención (`CHECK_STOCK`, `REQUEST_CATALOG`, `BOOK_APPOINTMENT`, `HUMAN_HELP`, `GENERAL_INQUIRY`).  
  * Si se detecta solicitud de agente humano o frustración reiterada, transiciona el estado a `HUMAN_TAKEOVER`.

Por favor, provee:

1. La implementación completa de `CloudAIProvider` con soporte de herramientas (*tools*).  
2. El servicio `QuotaPlanGuard` con manejo de cuotas en Redis.  
3. El servicio `OmniConversationEngine` con la máquina de estados de diálogo.  
4. Definición de tipos para `FunctionTool` y `ChatMessage`.

