# Evaluación del Plan OmniCatalog v1.0.0

**Documento evaluado:** PLAN_DESARROLLO_OMNICATALOG_v1_0_0.md (FEAT-072)
**Fecha de evaluación:** Agosto 2026
**Estado propuesto:** De "Aprobado y Vigente" a **v0.9 — pendiente de ajustes antes de aprobación final**

---

## 1. Resumen de la evaluación

El plan original tiene una arquitectura de fondo sólida: protocolo de mensajería canónico, patrón de adaptador por canal, y motor de IA híbrido (Cloud + Ollama local edge). Esa base vale la pena construirla tal como está planteada.

Sin embargo, el documento tiene vacíos que no deberían pasar a un estado "Vigente" sin resolverse: seguridad de credenciales tratada como comentario y no como diseño, una afirmación de aislamiento multi-tenant sin mecanismo explicado, un roadmap de 5 sprints que mete demasiadas integraciones en paralelo, y ausencia de control de costo de IA y de un modelo de mensajes para auditoría.

---

## 2. Fortalezas del plan original

- **Patrón de adaptador para canales** (`IMessagingAdapter` + `CanonicalMessage`): desacopla el motor conversacional de cada API de mensajería, permite agregar canales sin tocar el core. La matriz de degradación de componentes interactivos (sección 3.3) es un detalle que muchos planes omiten.
- **Motor de IA híbrido (Cloud vs. Ollama local)**: ventaja competitiva real para comercios que no quieren pagar tokens de nube por volumen o que priorizan privacidad de datos.
- **Consistencia con el resto de OmniFlow**: reutiliza Prisma/Postgres/Redis/BullMQ, respeta el patrón multi-tenant, y la configuración de Traefik sigue la convención ya usada en el ecosistema (dominios, DNS-only en Cloudflare).
- **DLQ y backoff exponencial** para la inyección de pedidos al ERP: resuelve justo el punto donde una integración suele perder pedidos silenciosamente.

---

## 3. Vacíos y riesgos identificados

1. **Cifrado de credenciales no especificado.** `credentials Json` dice "(cifrados)" entre paréntesis y `cloudApiKey String?` no dice nada. No se define el mecanismo de cifrado.
2. **"100% de aislamiento multi-tenant" sin mecanismo técnico descrito** en el resto del documento (¿RLS de Postgres? ¿middleware? ¿solo disciplina de código?).
3. **Roadmap muy optimista**: 5 sprints de 1 semana para 2 ERPs, 5 canales, IA dual, colas, UI admin y CI/CD a producción. El Sprint 4 en particular concentra demasiado riesgo.
4. **SAP Business One como posible scope creep** sin cliente concreto que lo pida, compitiendo por tiempo con Odoo (el ERP de referencia en el resto del ecosistema OmniFlow).
5. **WhatsApp QR (Baileys) como canal de producción** es un riesgo de negocio, no solo técnico: cliente no oficial, riesgo de baneo de número por Meta.
6. **Sin modelo `Message` individual**: solo existe `contextMemory` (Json) en `OmniConversation`, lo que impide auditoría, debugging de respuestas del bot y analítica posterior.
7. **Sin control de costo de tokens por tenant**: `QuotaPlanGuard` aparece en el diagrama pero no tiene sección propia ni lógica definida.
8. **Flujo de `HUMAN_TAKEOVER` no descrito**: el estado existe en el modelo de datos, pero no hay definición de cómo un humano se entera, dónde ve la conversación, o cómo la devuelve al bot.

---

## 4. Roadmap ajustado (MVP recortado)

Se retiran SAP B1, WhatsApp QR, Messenger e Instagram Direct del alcance inicial (pasan a una Fase 2 post-lanzamiento), y se agrega una capa de "endurecimiento" que el plan original no tenía tiempo asignado.

| Fase | Sprint | Entregables | Cambio vs. plan original |
|---|---|---|---|
| **Fase 1** | Sprint 1 (Semana 1) | Modelos Prisma + modelo `Message` (nuevo) + manifest + Traefik/Compose base + diseño de cifrado de credenciales | Se agrega `Message` y el cifrado como entregables, no como nota al margen |
| **Fase 2** | Sprint 2 (Semana 2) | `CatalogToolsService` + **solo** Odoo Adapter + caché Redis + middleware de aislamiento por `tenantId` (RLS o interceptor) | SAP B1 sale del sprint; se explicita el mecanismo de aislamiento |
| **Fase 3** | Sprint 3 (Semana 3) | `CloudAIProvider` con Tool Calling + `OmniConversationEngine` + `QuotaPlanGuard` con límites de tokens/mensajes por tenant | Ollama Local Edge RAG se mueve a Fase 2; se prioriza control de costo desde el día 1 |
| **Fase 4** | Sprint 4 (Semana 4) | Webhook unificado + **solo** WhatsApp Cloud API + Telegram + colas BullMQ (DLQ, rate-limit) | WhatsApp QR, Messenger e Instagram Direct salen del MVP |
| **Fase 5** | Sprint 5 (Semana 5) | Admin UI (`/admin/bot-settings`) + flujo básico de `HUMAN_TAKEOVER` (notificación + botón de reasignar) + validación en piloto real + CI/CD | Se agrega el takeover humano como entregable explícito |

**Fase 2 (post-MVP, sin fecha fija):** WhatsApp QR (Baileys), Messenger, Instagram Direct, SAP B1, Ollama Local Edge RAG, tabla de analítica de conversaciones.

Esto mantiene las 5 semanas pero reparte mejor el riesgo: cada sprint agrega un solo canal/ERP nuevo en vez de dos o tres en paralelo, y el trabajo de seguridad/aislamiento/cuotas queda distribuido en vez de asumido implícitamente.

---

## 5. Profundización técnica

### 5.1. Cifrado de credenciales

**Opción recomendada para la escala actual:** cifrado a nivel de aplicación con clave por tenant.

- Usar `node:crypto` (AES-256-GCM) en NestJS, con una clave maestra en variable de entorno (o secret manager) que deriva una subclave por `tenantId` vía HKDF.
- El ciphertext se guarda tal cual en el campo `Json`/`String` existente — no requiere cambios de esquema.
- Se implementa como un servicio `CredentialsVaultService` con `encrypt()`/`decrypt()`, llamado antes de cualquier `create`/`update` de Prisma y después de cualquier `findUnique`.
- El campo crudo nunca se devuelve en ninguna respuesta de API, ni siquiera al panel admin — mostrar `***configurado***` con opción de rotar.

**Alternativas evaluadas:**
- `pgcrypto` de Postgres (`pgp_sym_encrypt`): menos código en la app, pero la clave termina viviendo cerca de la base.
- Secret manager externo (Vault, AWS Secrets Manager): más robusto, pero sobre-ingeniería para el volumen actual — reservar para cuando haya más tenants o un requisito de compliance concreto.

### 5.2. Aislamiento multi-tenant real

- **Row-Level Security (RLS) de Postgres** sobre cada tabla con `tenantId`: policy que compara `tenantId` contra una variable de sesión (`current_setting('app.tenant_id')`), seteada por NestJS al inicio de cada transacción. Así un bug de código que omita el filtro `where: { tenantId }` no puede filtrar datos de otro tenant — la base lo bloquea igual.
- Si RLS es demasiado para la fase actual, el mínimo aceptable es un **interceptor global de Prisma** (`$use`) que inyecte automáticamente `tenantId` en todo query, en vez de confiar en que cada desarrollador lo agregue a mano.
- Para Redis y BullMQ: prefijar *todas* las keys y nombres de cola con `tenantId` (`tenant:{id}:conv:{...}`, cola `order-erp-injection:{tenantId}`) en vez de dejarlo solo dentro del payload.

### 5.3. Control de costo de IA por tenant (`QuotaPlanGuard`)

- Agregar a `TenantBotConfig` campos de cuota (`monthlyTokenLimit`, `monthlyMessageLimit`) o llevar el contador en Redis con reset mensual (más liviano que escribir en Postgres por cada mensaje).
- Antes de cada llamada al `CloudAIProvider`, `QuotaPlanGuard` chequea el contador; si se excede, cae a `fallbackMessage` o degrada a un modo sin IA.
- Cachear respuestas frecuentes (delivery, métodos de pago, horarios) con TTL corto — probablemente el mayor ahorro de tokens en un caso de uso de catálogo/FAQ.
- Si el tenant usa su propia `cloudApiKey`, igual conviene loguear el uso estimado, para poder diagnosticar fallas sin adivinar.

### 5.4. Modelo `Message` (auditoría e historial)

```prisma
model Message {
  id             String   @id @default(cuid())
  conversationId String
  conversation   OmniConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  direction      String   // "INBOUND" | "OUTBOUND"
  content        Json     // texto, media, botones usados
  aiGenerated    Boolean  @default(false)
  createdAt      DateTime @default(now())

  @@index([conversationId, createdAt])
}
```

`contextMemory` en `OmniConversation` se mantiene para el estado de la máquina de diálogo (liviano, se puede podar). `Message` provee el historial completo para debugging, analítica y cumplimiento ante reclamos de clientes.

---

## 6. Próximos pasos sugeridos

1. Definir el mecanismo de cifrado de credenciales antes de escribir el modelo `TenantBotConfig` en Sprint 1.
2. Decidir entre RLS o interceptor de Prisma para aislamiento — impacta el diseño de todos los servicios desde el Sprint 2.
3. Confirmar si hay demanda real de SAP B1 antes de reincorporarlo al roadmap.
4. Validar con el equipo si WhatsApp QR se mantiene como canal de respaldo documentado con advertencia de riesgo, o se descarta del todo.
