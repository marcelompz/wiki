# Prompts de Implementación — OmniCatalog Conversacional + Gateway de Mensajería

**Basado en:** PLAN_DESARROLLO_OMNICATALOG_v1_0_0.md + evaluación técnica + contexto real de `featurelist.json` (v1.20.15)
**Protocolo:** AGENTS.md — Harness Engineering v2.2.1

---

## 0. Correcciones aplicadas antes de generar estos prompts

El `ROADMAP.md` que se compartió estaba desactualizado (v1.20.10). El `featurelist.json` real está en **v1.20.15**, con `last_id: FEAT-079`. Esto cambió el plan en tres puntos:

1. **Feature IDs correctos:** el plan original pedía FEAT-072, ya usado por OmniPulse (que además ya está `completed`, no `in_progress`). Se asignan dos IDs nuevos, libres a partir de FEAT-080:
   - **FEAT-080** — Omni Messaging Gateway (standalone, agnóstico de módulo consumidor)
   - **FEAT-081** — OmniCatalog: Bot Conversacional Omnicanal (`depends_on: [FEAT-080]`)
2. **No se crea un servicio nuevo `omni-catalog-standalone`.** "OmniCatalog" ya es el nombre comercial del catálogo social existente (FEAT-066, rebranding), extraído como `services/social-catalog-standalone/` (FEAT-065) y con su fase de categorías jerárquicas ya completa (FEAT-077). Estos prompts **evolucionan ese servicio existente**, no crean uno paralelo.
3. **El motor de mensajería se extrae aparte** (FEAT-080) para que OmniPulse y cualquier otro módulo puedan reutilizar los mismos adaptadores de canal sin duplicar integraciones contra Meta/Telegram.
4. **El Sprint 1 no construye `IMessagingAdapter` desde cero.** El ROADMAP.md completo confirma que ese patrón (WhatsApp, Telegram, Instagram, Messenger, Custom Webhook) ya está en producción desde v1.15.0, dentro de `social-catalog-standalone`. FEAT-080 es una **extracción** de ese código hacia el nuevo servicio compartido — se ajustó el prompt del Sprint 1 en consecuencia.

**Asunción a confirmar con el equipo:** el puerto exacto que usa hoy `social-catalog-standalone` (el contexto compartido lo listaba como `:3021`, pero puede haber cambiado desde el rebranding de FEAT-066). El gateway nuevo se propone en `:3027` (siguiente libre después de `storefront-builder-standalone :3026`). Verificar ambos contra `docker-compose.standalone.yml` real antes del Sprint 1.

---

## 1. Prompt — Líder/Planificador (ejecutar primero, una sola vez)

```
Rol: Líder/Planificador (protocolo AGENTS.md sección 5.1)

Antes de cualquier cambio de código:
1. Leé docs/00-contexto-agentes.md completo.
2. Leé featurelist.json y confirmá que FEAT-080 y FEAT-081 no están tomados
   (si lo están, usá el próximo par de IDs libres y actualizá este documento).
3. Verificá en docker-compose.standalone.yml el puerto real de
   social-catalog-standalone y el próximo puerto libre para el nuevo
   servicio de gateway.
4. Agregá las entradas FEAT-080 y FEAT-081 a featurelist.json con
   status "pending", category, title, description, assigned_module,
   depends_on: ["FEAT-080"] para FEAT-081, siguiendo el formato exacto
   de las entradas existentes (ver FEAT-077 y FEAT-079 como referencia
   de nivel de detalle esperado).
5. NO modifiques código de negocio en este paso. Entregá el plan de
   sprints confirmado (ver sección 2 de este documento) para pasar al
   rol Implementador.
```

---

## 2. Prompt — Sprint 1 (Semana 1): Gateway de mensajería (FEAT-080, base)

```
Rol: Implementador (protocolo AGENTS.md)
Feature: FEAT-080 — Omni Messaging Gateway
Estado al iniciar: cambiar a "in_progress" en featurelist.json

Contexto obligatorio antes de tocar código:
- docs/00-contexto-agentes.md
- docs/troubleshooting/README.md (buscar si ya existe algo relacionado
  a adaptadores de mensajería o Baileys antes de investigar desde cero)
- services/social-catalog-standalone/ COMPLETO, en particular el código
  real del Strategy Pattern IMessagingAdapter y los adaptadores de
  WhatsApp/Telegram/Instagram/Messenger/Custom Webhook que ya están
  en producción desde v1.15.0 (Social Commerce Omnichannel Hub) —
  ESTE SPRINT ES UNA EXTRACCIÓN de ese código existente, no una
  construcción desde cero. Revisar también el historial de
  v1.20.5 (Schema Decoupling), que eliminó el enum MessagingChannel
  y el modelo CatalogChannelConfig del schema monolítico: confirmar
  dónde quedó esa lógica hoy antes de mover nada.

Objetivo del sprint:
Extraer a un nuevo microservicio services/omni-messaging-gateway-standalone/,
agnóstico de cualquier módulo consumidor, lo que hoy vive dentro de
social-catalog-standalone:
1. El protocolo de mensajería canónico ya implementado (tipos
   equivalentes a ChannelType, CanonicalInboundMessage,
   CanonicalOutboundMessage — usar los nombres/tipos reales del código
   existente, no reinventarlos; el plan original en
   PLAN_DESARROLLO_OMNICATALOG_v1_0_0.md sección 3.1 es solo
   referencia de forma, no de verdad de código).
2. La interfaz IMessagingAdapter y los adaptadores YA IMPLEMENTADOS de
   WhatsApp Cloud API y Telegram (moverlos, no reescribirlos). WhatsApp
   QR, Messenger e Instagram Direct: si ya existen adaptadores para
   ellos en el código actual, migrarlos también en este sprint (no
   hay motivo para dejarlos afuera si el trabajo ya está hecho);
   si no existen todavía, quedan para la fase posterior como estaba
   planeado.
3. Verificar que social-catalog-standalone quede consumiendo el nuevo
   gateway por API/cola en vez de tener el adaptador embebido —
   actualizar sus imports y su schema.prisma para no duplicar los
   modelos que se llevan al gateway.
3. Modelos Prisma propios del gateway: ChannelIntegration (credenciales
   cifradas, no en texto plano — ver punto 4 abajo) y un modelo nuevo
   ConsumerSubscription que asocia channelInstanceId → módulo
   consumidor (ej. "omnicatalog", "omnipulse"), de forma que un canal
   solo entrega mensajes a UN consumidor por tenant en esta fase
   (sin fan-out todavía).
4. Cifrado de credenciales: implementar CredentialsVaultService con
   AES-256-GCM, clave maestra desde variable de entorno, subclave
   derivada por tenantId vía HKDF. El campo credentials nunca se
   devuelve en texto plano en ninguna respuesta de API.
5. Endpoints mínimos: POST /webhooks/:channelType (recepción, con
   verifyWebhook por adaptador), POST /send (envío saliente),
   GET /channels (config por tenant, sin exponer credenciales).

Reglas inviolables a respetar (AGENTS.md sección 2):
- tenantId en TODAS las tablas y queries, sin excepción.
- Prohibido `new PrismaClient()` — usar this.prisma o @TenantPrisma().
- Prohibido cualquier referencia a Nginx; el servicio se expone vía
  Traefik v3.4 (subdominio sugerido: mensajeria.omniflow.app /
  mensajeria.pesallaccia.com, siguiendo el patrón de los demás
  standalone).
- Axios como cliente HTTP para las llamadas salientes a Meta/Telegram
  (no fetch).
- No comentar código salvo que se pida explícitamente.
- No commitear secrets. No hacer commit/push/PR sin autorización
  explícita del usuario.

Entregables:
- services/omni-messaging-gateway-standalone/ con schema.prisma propio,
  manifest.json (versión semántica independiente, ej. 0.1.0-alpha.1,
  con coreCompatibility apuntando a la versión actual del Core),
  Dockerfile, y entrada correspondiente en
  docker-compose.standalone.yml con el puerto confirmado en el paso
  del Líder.
- Adaptadores WhatsAppCloudAdapter y TelegramAdapter implementando
  IMessagingAdapter.
- Tests unitarios de CredentialsVaultService (cifrado/descifrado,
  y que nunca se filtre el valor crudo).

Definition of Done:
- Prisma generate limpio.
- Tests unitarios del gateway en verde.
- NO ejecutar ./scripts/init.sh sin pedir confirmación explícita al
  usuario primero (consume CPU/RAM alto).
- Actualizar featurelist.json: FEAT-080 status pasa a "in_progress"
  al empezar; queda en "in_progress" al cerrar este sprint (se marca
  "completed" recién cuando termine la Fase de hardening en el
  Sprint 4).
```

---

## 3. Prompt — Sprint 2 (Semana 2): Base del bot en social-catalog-standalone (FEAT-081)

```
Rol: Implementador (protocolo AGENTS.md)
Feature: FEAT-081 — OmniCatalog: Bot Conversacional Omnicanal
Depende de: FEAT-080 (gateway, del Sprint 1)
Estado al iniciar: cambiar a "in_progress" en featurelist.json

Contexto obligatorio antes de tocar código:
- docs/00-contexto-agentes.md
- services/social-catalog-standalone/ completo (schema.prisma actual,
  estructura de módulos) — este sprint EXTIENDE este servicio, no crea
  uno nuevo.
- FEAT-077 (OmniCatalog Jerárquico: CategoryAccordion + sync Odoo
  POS/Product Categories) y FEAT-079 (Productos con Variantes,
  patrón product.template/product.product) — el CatalogToolsService de
  este sprint debe consultar sobre este modelo de datos ya existente,
  no reinventar la estructura de categorías/variantes.

Objetivo del sprint:
1. CatalogToolsService con las 3 herramientas del plan original
   (sección 4.3): checkStockAvailability, getCatalogLink,
   processIncomingOrder — pero implementadas contra el schema real
   de social-catalog-standalone (categorías, variantes, precio base +
   priceDelta), no contra el schema genérico propuesto en el plan.
2. OdooAdapter para checkStockAvailability (JSON-RPC/REST, mapeo a
   stock.quant / product.product). SAP Business One queda fuera de
   este sprint — no lo implementes salvo que haya un cliente concreto
   que lo requiera.
3. Middleware/interceptor de aislamiento explícito por tenantId (no
   solo el filtro manual en cada query): evaluar Prisma middleware
   ($use) que inyecte tenantId automáticamente, o Row-Level Security
   si el equipo lo prefiere — documentar la decisión en
   docs/troubleshooting/ o docs/planes/ si implica un cambio de
   patrón respecto a lo que ya usa social-catalog-standalone.
4. Modelo Message (historial de conversación, separado de cualquier
   campo contextMemory que ya exista), con dirección INBOUND/OUTBOUND
   y flag aiGenerated.
5. Cliente HTTP (Axios) hacia omni-messaging-gateway-standalone para
   consumir mensajes entrantes (vía la ConsumerSubscription creada en
   Sprint 1 con consumerModule="omnicatalog") y enviar salientes.

Reglas inviolables: las mismas del Sprint 1 (tenantId sagrado, sin
PrismaClient directo, Traefik v3.4 exclusivo, Axios, sin comentarios
no solicitados, sin commits no autorizados).

Definition of Done:
- Prisma generate limpio en social-catalog-standalone.
- Tests unitarios de CatalogToolsService y OdooAdapter.
- Confirmar con el usuario antes de correr ./scripts/init.sh.
- featurelist.json: FEAT-081 sigue "in_progress".
```

---

## 4. Prompt — Sprint 3 (Semana 3): Motor de IA y máquina de estados (FEAT-081)

```
Rol: Implementador (protocolo AGENTS.md)
Feature: FEAT-081 (continuación)

Contexto obligatorio: lo ya construido en Sprint 2, más
docs/troubleshooting/README.md antes de investigar cualquier falla de
integración con proveedores de IA.

Objetivo del sprint:
1. CloudAIProvider con Tool Calling para OpenAI/Gemini/Claude
   (sección 4.1 del plan original), usando Axios para las llamadas.
2. OmniConversationEngine: máquina de estados que orquesta
   CatalogToolsService + CloudAIProvider, con manejo del estado
   ACTIVE / BOT_PAUSED / HUMAN_TAKEOVER en OmniConversation.
3. QuotaPlanGuard: NUEVO respecto al plan original. Antes de cada
   llamada al proveedor de IA, chequear contador de uso (Redis, TTL
   mensual) contra monthlyTokenLimit / monthlyMessageLimit definidos
   en TenantBotConfig. Si se excede, degradar a fallbackMessage sin
   llamar al modelo.
4. Cache de respuestas frecuentes (TTL corto) para preguntas
   repetitivas (delivery, métodos de pago, horarios) antes de llamar
   al modelo — reduce costo de tokens.
5. Ollama Local Edge RAG (sección 4.2 del plan) queda para la Fase 2
   post-MVP — NO lo implementes en este sprint.

Reglas inviolables: mismas de sprints anteriores.

Definition of Done:
- Tests unitarios de OmniConversationEngine cubriendo transición de
  estados y el corte por QuotaPlanGuard.
- Confirmar con el usuario antes de ./scripts/init.sh.
- featurelist.json: FEAT-081 sigue "in_progress".
```

---

## 5. Prompt — Sprint 4 (Semana 4): Hardening del gateway + integración end-to-end

```
Rol: Implementador (protocolo AGENTS.md)
Features: FEAT-080 (cierre) + FEAT-081 (continuación)

Objetivo del sprint:
1. En omni-messaging-gateway-standalone: colas BullMQ
   messaging-outbound (rate-limiting estricto para evitar bloqueos de
   Meta) y webhook-processing con reintentos.
2. Cola order-erp-injection en social-catalog-standalone: reintentos
   exponenciales (1m, 5m, 15m, 1h) + Dead Letter Queue, para que una
   caída del ERP no pierda pedidos.
3. Prueba de integración end-to-end: mensaje entrante en WhatsApp
   Cloud → gateway → social-catalog-standalone (bot) → respuesta →
   gateway → salida. Documentar el flujo en
   docs/planes/omnicatalog/ (si no existe la carpeta, crearla).
4. Webhook receiver unificado con ChannelAdapterFactory en el gateway
   (selección de adaptador según channelType).

Reglas inviolables: mismas de sprints anteriores. Recordá la regla de
sincronización: si este sprint cierra FEAT-080, hay que actualizar
VERSION, ambos package.json, README.md, ROADMAP.md, CHANGELOG.md,
manifiestos, y la Wiki en /opt/wiki/orderflow/ en el mismo paso —
no dejarlo para después.

Definition of Done:
- Prueba end-to-end documentada y en verde.
- featurelist.json: FEAT-080 pasa a "completed" con qa_validation
  describiendo qué se probó (siguiendo el formato de FEAT-077/FEAT-079).
- Confirmar con el usuario antes de ./scripts/init.sh.
```

---

## 6. Prompt — Sprint 5 (Semana 5): Admin UI, takeover humano y piloto

```
Rol: Implementador (protocolo AGENTS.md)
Feature: FEAT-081 (cierre)

Objetivo del sprint:
1. Interfaz admin en React + Refine: /admin/bot-settings dentro del
   panel ya existente de social-catalog-standalone (no un panel
   nuevo aislado).
2. Flujo de HUMAN_TAKEOVER: notificación visible en el admin cuando
   una conversación pasa a ese estado, botón para reasignarla al bot.
   Este punto no estaba desarrollado en el plan original — es
   obligatorio para este sprint, no opcional.
3. Validación en piloto real (tenant de prueba, ej. Provecchio Di
   Mora si el equipo lo autoriza) contra el laboratorio, sin afectar
   la operación en vivo.
4. Pipeline CI/CD hacia el VPS Hetzner con health checks para ambos
   servicios (gateway + social-catalog-standalone actualizado).

Reglas inviolables: mismas de sprints anteriores, más la
verificación de git status y commit/push a origin/main ANTES de
cualquier despliegue (AGENTS.md sección 3.1) — nunca asumir que el
servidor tiene el mismo código que el repo local.

Definition of Done (Rol Revisor/Auditor, protocolo AGENTS.md sección 5.3):
- ./scripts/init.sh corrido con autorización explícita del usuario,
  100% de tests en verde, build backend y frontend limpios, E2E
  Playwright sin excepciones JS ni errores 502/404.
- Versión sincronizada en TODOS los archivos obligatorios (VERSION,
  package.json x2, README.md, ROADMAP.md, CHANGELOG.md,
  docs/02-architecture.md, manifiestos, Wiki).
- Tag de versión creado y pusheado (git tag vX.Y.Z && git push --tags).
- featurelist.json: FEAT-081 pasa a "completed" con qa_validation
  detallada.
- Wiki (/opt/wiki/orderflow/) sincronizada y pusheada.
```

---

## 7. Resumen de dependencias

```
FEAT-080 (Gateway)  →  Sprint 1 (base) → Sprint 4 (hardening, cierre)
FEAT-081 (OmniCatalog Bot)  depends_on FEAT-080
                    →  Sprint 2 (base) → Sprint 3 (IA) → Sprint 4 (integración) → Sprint 5 (cierre)

Fase 2 (post-MVP, sin fecha):
  WhatsApp QR (Baileys), Messenger, Instagram Direct — se agregan al
  gateway como adaptadores nuevos, sin tocar el core del bot.
  SAP Business One — se agrega como adaptador ERP nuevo si aparece
  demanda real.
  Ollama Local Edge RAG — se agrega como segundo AIProvider.
```
