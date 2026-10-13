# **Master Prompt — Sprint 5: Panel de Administración (React/Refine), Flujo de Human Takeover y Despliegue en Hetzner**

**Objetivo:** Desarrollar la interfaz visual en el panel administrativo de OmniFlow para gestionar canales de mensajería y configuración del bot, implementar el flujo interactivo de toma de control humano (*Human Takeover*) en tiempo real vía WebSockets y configurar el despliegue a producción con Traefik v3.3 en Hetzner.

Actúa como Tech Lead & Desarrollador Full-Stack Senior en React 18, Refine.dev, Ant Design 5, NestJS WebSockets y DevOps (Docker / Hetzner).

\#\#\# Contexto del Proyecto:

Completamos el backend de \`OmniMessaging Hub\` y el consumidor \`OmniCatalog\`. En este sprint finalizamos la interfaz de usuario en el panel administrativo de OmniFlow, la gestión en vivo de conversaciones que requieren atención humana y la automatización del despliegue en producción.

\#\#\# Objetivo del Sprint 5:

1\. Construir las pantallas administrativas \`/admin/messaging\` (gestión de canales) y \`/admin/bot-settings\` (configuración del bot e IA).

2\. Implementar el flujo de \`HUMAN\_TAKEOVER\`: Alerta en vivo cuando el bot no puede responder o el cliente pide un humano, chat en tiempo real en el dashboard y botón para devolver el control al bot.

3\. Configurar el pipeline de CI/CD en GitHub Actions y verificación de health checks perimetrales tras el despliegue en VPS Hetzner.

\---

\#\#\# Requerimientos Técnicos y Entregables:

\#\#\#\# 1\. Panel de Canales de Mensajería (\`frontend/src/pages/admin/messaging-channels.tsx\`):

\- Tabla con canales activos por tenant (WhatsApp Cloud, Telegram).

\- Modal para agregar/editar canal con campos específicos (WABA ID, Phone Number ID, Access Token, Bot Token).

\- \*\*Seguridad en UI:\*\* Las credenciales ya guardadas se muestran enmascaradas como \`\*\*\*configurado\*\*\*\` (nunca se transmiten en texto plano desde el backend). Opción de "Modificar credenciales".

\- Switch interactivo para habilitar/deshabilitar canal (\`PATCH /api/v1/channels/:id/toggle\`).

\#\#\#\# 2\. Configuración de IA y Cuotas (\`frontend/src/pages/admin/bot-settings.tsx\`):

\- Selección de proveedor (Cloud API vs Local Edge).

\- Configuración de \`botName\`, \`customGreeting\`, \`fallbackMessage\` y \`systemPromptBase\`.

\- Visualizador de consumo de cuotas: Barra de progreso de tokens y mensajes utilizados en el mes en curso (\`tokensConsumed / monthlyTokenQuota\`).

\#\#\#\# 3\. Flujo en Tiempo Real de Human Takeover (\`frontend/src/pages/admin/conversations-live.tsx\`):

\- Lista de conversaciones activas con badges de estado: \`BOT\_ACTIVE\`, \`HUMAN\_TAKEOVER\`, \`RESOLVED\`.

\- Conexión vía WebSockets (\`MessagingGateway\` en NestJS) para recibir eventos \`conversation:takeover\_requested\` y \`message:new\`.

\- Ventana de chat interactiva para que el operador humano responda directamente al cliente (WhatsApp/Telegram) desde el navegador.

\- Botón de acción: \*\*"Devolver control al Asistente IA"\*\* que emite \`PATCH /api/v1/conversations/:id/resume-bot\`.

\#\#\#\# 4\. Automatización CI/CD & Deploy (\`scripts/deploy-omnimessaging.sh\`):

\- Script bash para ejecución en servidor Hetzner (\`/srv/orderflow\`).

\- Pasos: \`git pull\`, \`docker compose \-f docker-compose.standalone.yml build\`, \`docker compose up \-d\`, verificación de health check HTTP (\`GET /api/v1/health\` retornando 200 OK) y reload de configuración en Traefik v3.3.

Por favor, provee:

1\. El código de los componentes React con Refine y Ant Design (\`MessagingChannelsPage\`, \`BotSettingsPage\`, \`ConversationsLivePage\`).

2\. El Gateway de WebSockets en NestJS (\`MessagingLiveGateway\`).

3\. El script de despliegue en producción para Hetzner.

