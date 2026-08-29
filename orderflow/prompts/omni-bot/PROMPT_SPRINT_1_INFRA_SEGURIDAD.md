# **Master Prompt — Sprint 1: Infraestructura, Seguridad, Cifrado y Modelos de Datos**

**Objetivo:** Implementar la base de datos, el servicio de cifrado seguro de credenciales con derivación de claves por tenant, el interceptor de aislamiento multi-tenant en Prisma y la infraestructura perimetral en Traefik v3.3.

Actúa como Tech Lead & Arquitecto Senior de Software especializado en NestJS 10, TypeScript, Prisma ORM, Criptografía y Traefik v3.3.

\#\#\# Contexto del Proyecto:

Estamos construyendo el microservicio horizontal \`OmniMessaging Hub\` (dentro del monorepo OmniFlow / OrderFlow), el cual proveerá conectividad omnicanal desacoplada para todos los módulos de negocio (OmniCatalog, OmniBookings, OmniPOS).

\#\#\# Objetivo del Sprint 1:

1\. Crear los modelos de Prisma para la gestión de canales, configuración del bot, conversaciones y mensajes auditables.

2\. Implementar el servicio \`CredentialsVaultService\` para cifrado simétrico AES-256-GCM con derivación de subclaves por tenant vía HKDF.

3\. Configurar la extensión/interceptor global de Prisma Client para forzar el aislamiento estricto por \`tenantId\`.

4\. Definir la orquestación Docker Compose y el enrutamiento perimetral en Traefik v3.3.

\---

\#\#\# Requerimientos Técnicos y Entregables:

\#\#\#\# 1\. Modelos en Prisma (\`prisma/schema.prisma\`):

Implementar o extender el schema con:

\- \`ChannelIntegration\`: Almacena el canal (WHATSAPP\_CLOUD, TELEGRAM, etc.), nombre, estado activo, credenciales cifradas (\`encryptedCredentials\`, \`iv\`, \`tag\`), webhookSecret y límites de velocidad (\`rateLimitPerMinute\`, \`cooldownSeconds\`). Relación con \`Tenant\` (onDelete: Cascade).

\- \`TenantBotConfig\`: Configuración del bot por tenant (aiEngineMode, cloudProvider, encryptedApiKey, apiKeyIv, apiKeyTag, botName, customGreeting, fallbackMessage, systemPromptBase, monthlyTokenQuota, monthlyMessageQuota). Relación 1:1 con \`Tenant\`.

\- \`OmniConversation\`: Almacena la sesión por cliente (\`tenantId\`, \`channelIntegrationId\`, \`externalSenderId\`), customerName, customerId, status (ACTIVE, BOT\_PAUSED, HUMAN\_TAKEOVER), activeModuleContext, contextMemory (Json). Índice único compuesto \`\[tenantId, channelIntegrationId, externalSenderId\]\`.

\- \`Message\`: Registro inmutable de cada mensaje (\`conversationId\`, \`tenantId\`, \`direction\`: INBOUND/OUTBOUND, \`channelType\`, \`content\`: Json, \`aiGenerated\`, \`tokensConsumed\`, \`deliveryStatus\`, \`createdAt\`).

\#\#\#\# 2\. Servicio de Cifrado (\`src/security/credentials-vault.service.ts\`):

\- Utilizar el módulo nativo \`node:crypto\`.

\- Algoritmo: \`aes-256-gcm\`.

\- Función de derivación: \`crypto.hkdfSync('sha256', MASTER\_KEY\_SECRET, tenantId, 'omnimessaging-vault-v1', 32)\`.

\- Métodos requeridos:

  \* \`encrypt(tenantId: string, plainText: string | object): { encrypted: string; iv: string; tag: string }\`

  \* \`decrypt(tenantId: string, encrypted: string, iv: string, tag: string): string\`

  \* \`maskSecret(plainText?: string): string\` (retorna \`\*\*\*configurado\*\*\*\` o \`no\_configurado\`).

\#\#\#\# 3\. Interceptor / Extensión Multi-Tenant de Prisma (\`src/prisma/tenant-prisma.extension.ts\`):

\- Crear un cliente extendido de Prisma (\`prisma.$extends\`) o middleware que intercepte operaciones \`findMany\`, \`findFirst\`, \`update\`, \`delete\`, \`create\` sobre modelos con \`tenantId\`.

\- Inyectar o validar automáticamente que \`where.tenantId\` coincida con el contexto del request resuelto por \`ApiKeyGuard\` o JWT, lanzando \`UnauthorizedException\` si falta o no coincide.

\#\#\#\# 4\. Docker Compose & Traefik v3.3 (\`docker-compose.standalone.yml\`):

\- Servicio \`omnimessaging-standalone\` en el puerto interno 3025\.

\- Redes: \`traefik-public\` (externa) e \`internal-net\`.

\- Labels de Traefik v3.3 con router HTTPS \`Host(\\\`mensajeria.omniflow.app\\\`)\`, entrypoint \`websecure\`, tls certresolver \`letsencrypt\`.

Por favor, provee:

1\. El bloque de código completo para \`prisma/schema.prisma\`.

2\. La implementación completa con tests unitarios (Jest) para \`CredentialsVaultService\`.

3\. El middleware/extensión de Prisma con ejemplo de inyección en \`PrismaService\`.

4\. El archivo \`docker-compose.standalone.yml\` listo para producción.

