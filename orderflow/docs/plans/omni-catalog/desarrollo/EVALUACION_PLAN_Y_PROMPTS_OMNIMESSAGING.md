# Evaluación del Plan y Prompts — OmniMessaging Hub & OmniCatalog

**Documento de evaluación técnica**  
**Ecosistema:** OmniFlow SaaS  
**Fecha:** Agosto 2026  
**Fuentes evaluadas:**
- `PROMPTS_MAESTROS_DESARROLLO_COMPLETO.md`
- `PROMPT_SPRINT_1_INFRA_SEGURIDAD.md`
- `PROMPT_SPRINT_2_CANALES_Y_COLAS.md`
- `PROMPT_SPRINT_3_IA_Y_CUOTAS.md`
- `PROMPT_SPRINT_4_CONSUMIDOR_OMNICATALOG.md`
- `PROMPT_SPRINT_5_ADMIN_UI_Y_TAKEOVER.md`
- `PROMPTS_IMPLEMENTACION_OMNICATALOG.md`

---

## 1. Resumen ejecutivo

| Aspecto | Calificación | Comentario |
|---------|--------------|------------|
| Visión de arquitectura | Alta | Desacoplamiento gateway ↔ consumidores, protocolo canónico, multi-tenant estricto y cifrado de credenciales son correctos y alineados con un SaaS horizontal. |
| Alineación con código real | Media-Baja | Los master prompts (Sprints 1-5) asumen construcción *greenfield*. El documento de implementación corrige esto: es **extracción** de `social-catalog-standalone` (FEAT-080/081). |
| Seguridad y multi-tenancy | Alta | AES-256-GCM + HKDF por tenant + interceptor Prisma + no filtrar credenciales en API son sólidos. |
| Complejidad / riesgo de ejecución | Alto | 5 sprints ambiciosos; el plan original mezcla gateway nuevo + bot + Odoo + UI + CI/CD sin priorizar hardening. |
| Consistencia entre documentos | Media | Hay divergencias de nombres, puertos, Traefik version, modelos y alcance (WhatsApp QR, Instagram, etc.). |
| Definition of Done y gobernanza | Buena en implementación | El doc de implementación (AGENTS.md) es más maduro: featurelist, no `./scripts/init.sh` sin permiso, sincronización de VERSION/CHANGELOG, etc. |

**Conclusión principal:** el plan de *implementación* (`PROMPTS_IMPLEMENTACION_OMNICATALOG.md`) es el que debe gobernar. Los master prompts de sprints 1-5 son una especificación de *diseño deseado*, pero no deben ejecutarse tal cual porque contradicen el estado real del repo (adaptadores ya existentes desde v1.15.0, schema decoupling de v1.20.5, featurelist en v1.20.15).

---

## 2. Fortalezas del plan

1. **Separación de concerns clara**
   - Gateway de mensajería agnóstico (FEAT-080) + consumidor OmniCatalog (FEAT-081).
   - Protocolo canónico (`CanonicalInboundMessage` / `CanonicalOutboundMessage` + `IMessagingAdapter`).
   - Colas BullMQ con rate-limit + DLQ (crítico para no quemar la cuenta de Meta).

2. **Seguridad bien pensada**
   - `CredentialsVaultService` con AES-256-GCM + HKDF por `tenantId`.
   - Credenciales nunca en claro en respuestas de API ni en la UI (`***configurado***`).
   - Aislamiento forzado por `tenantId` (interceptor/extensión Prisma).

3. **Control de costos de IA**
   - `QuotaPlanGuard` con contadores mensuales en Redis + degradación a `fallbackMessage`.
   - Cache de respuestas frecuentes (horarios, medios de pago, etc.).

4. **Resiliencia ERP**
   - Cola `order-erp-injection` con backoff exponencial + idempotencia por `client_order_ref` / `order_uuid`.

5. **Human Takeover**
   - Estado de conversación + WebSocket + UI de operador. Es un requisito de producción real, no un “nice to have”.

6. **Gobernanza del doc de implementación**
   - Corrige IDs de features (FEAT-080/081).
   - Obliga a leer `docs/00-contexto-agentes.md`, `featurelist.json`, `docker-compose.standalone.yml` y el código real de adaptadores **antes** de escribir nada.
   - Prohíbe commits/PRs y `./scripts/init.sh` sin autorización explícita.

---

## 3. Problemas y riesgos críticos

### 3.1 Desalineación “greenfield” vs “extracción”

Los master prompts (especialmente Sprint 1 y 2) piden:

- Crear modelos Prisma, `IMessagingAdapter`, adaptadores WhatsApp/Telegram, factory, etc. **desde cero**.

El doc de implementación es explícito:

> “ESTE SPRINT ES UNA EXTRACCIÓN de ese código existente, no una construcción desde cero.”

**Riesgo:** si un implementador sigue los master prompts, duplicará lógica, romperá el schema decoupling (v1.20.5) y generará deuda técnica inmediata.

**Recomendación:** los master prompts deben reescribirse o etiquetarse como “especificación de comportamiento / contrato”, no como “instrucciones de implementación”.

### 3.2 Modelos de datos inconsistentes

| Concepto | Master prompts | Doc de implementación / realidad |
|----------|----------------|----------------------------------|
| Modelos de canal | `ChannelIntegration`, `TenantBotConfig`, `OmniConversation`, `Message` | Extraer lo que ya existe; confirmar dónde quedó la lógica post-schema decoupling |
| Consumer | No aparece claramente | `ConsumerSubscription` (channelInstanceId → módulo consumidor) |
| Puerto gateway | 3025 | Propuesto 3027 (verificar contra compose real) |
| Traefik | v3.3 | v3.4 en el doc de implementación |
| Subdominio | `mensajeria.omniflow.app` | Alineado, pero hay que confirmar con el patrón real de los standalone |

### 3.3 Alcance de canales y ERP

- Master prompts se centran en WhatsApp Cloud + Telegram.
- El código real ya tiene (o tuvo) WhatsApp QR, Messenger, Instagram, Custom Webhook.
- El doc de implementación dice: migrar lo que ya exista; el resto a Fase 2.
- SAP Business One y Ollama Local Edge se dejan correctamente fuera del MVP.

### 3.4 Complejidad del Sprint 1 original

El Sprint 1 de los master prompts mezcla:

- Schema completo
- Vault criptográfico
- Extensión multi-tenant Prisma
- Docker Compose + Traefik

En un monorepo real con código legacy de mensajería, eso es demasiado para una semana si además hay que extraer y no romper `social-catalog-standalone`.

El plan de implementación lo reparte mejor (extracción + vault + endpoints mínimos en Sprint 1; bot + tools en Sprint 2; IA en Sprint 3; hardening + E2E en Sprint 4; UI + takeover + deploy en Sprint 5).

### 3.5 Falta de contratos de API explícitos entre gateway y consumidores

Se menciona `ConsumerSubscription` y que el catálogo consuma por API/cola, pero no hay:

- Contrato OpenAPI / tipos compartidos del evento de mensaje entrante.
- Estrategia de auth entre servicios (API key interna, mTLS, JWT de servicio).
- Política de fan-out (hoy “un canal → un consumidor”; futuro fan-out).

Esto debe definirse en Sprint 1 o como ADR antes de implementar.

### 3.6 Tests y Definition of Done

- Master prompts piden tests unitarios (vault, adapters, etc.).
- El doc de implementación es más estricto y realista (Prisma generate limpio, tests en verde, E2E documentado, no correr init.sh sin permiso, sincronización de VERSION/CHANGELOG/ROADMAP/Wiki).

Falta un criterio claro de **cobertura mínima** y de **smoke E2E** automatizado (aunque sea un test de integración con mocks de Meta/Telegram).

### 3.7 UI y ownership del panel admin

- Master Sprint 5 habla de `/admin/messaging` y `/admin/bot-settings` como si fueran páginas nuevas.
- Doc de implementación: extender el panel **ya existente** de `social-catalog-standalone`.

Correcto. Hay que evitar un segundo panel admin paralelo.

---

## 4. Evaluación por sprint (síntesis)

| Sprint | Master prompt | Doc de implementación | Veredicto |
|--------|---------------|------------------------|-----------|
| 1 | Infra + vault + schema + Traefik | Extracción de adaptadores + vault + modelos mínimos del gateway + endpoints | Seguir **implementación**. Reducir alcance del master. |
| 2 | Canónicos + adapters WA/TG + factory + colas | Base del bot en social-catalog + CatalogTools + OdooAdapter + cliente al gateway | Los adapters ya deberían existir; el trabajo real es el bot + tools. |
| 3 | IA híbrida + quotas + intent router | CloudAIProvider + OmniConversationEngine + QuotaPlanGuard + cache | Alineados; buen foco. Ollama fuera. |
| 4 | Catalog tools + Odoo + cola ERP | Hardening gateway (BullMQ) + cola ERP + E2E + factory unificada | El master mete demasiado del bot aquí; el doc lo reparte mejor. |
| 5 | Admin UI + takeover + deploy | Admin dentro del panel existente + takeover + piloto + CI/CD + cierre de features | Alineados en espíritu; el doc es más disciplinado en release. |

---

## 5. Recomendaciones concretas (prioridad)

1. **Fuente de verdad única**  
   Declarar que `PROMPTS_IMPLEMENTACION_OMNICATALOG.md` + `featurelist.json` + código real de `social-catalog-standalone` mandan sobre los master prompts de sprints 1-5.

2. **Reescribir / anotar los master prompts**  
   - Añadir al inicio de cada uno: “Esto es especificación de comportamiento. La implementación es extracción/evolución según PROMPTS_IMPLEMENTACION…”.  
   - Eliminar o marcar como “ya existe” la creación de `IMessagingAdapter` y adaptadores.

3. **Antes de Sprint 1 (rol Líder)**  
   Ejecutar tal cual el prompt del Líder/Planificador:
   - Confirmar FEAT-080/081 libres.
   - Confirmar puertos reales en `docker-compose.standalone.yml`.
   - Localizar el código actual de adaptadores y modelos post-schema decoupling.
   - Registrar decisión de puerto (propuesto 3027) y Traefik (v3.4).

4. **Contrato gateway ↔ consumidores**  
   Definir en Sprint 1 (aunque sea un ADR corto):
   - Payload del mensaje entrante entregado al consumidor.
   - Auth entre servicios.
   - Comportamiento de `ConsumerSubscription` (1:1 por ahora).

5. **Orden de implementación recomendado (ajustado)**
   - **Sprint 1:** extracción gateway + vault + modelos mínimos + webhooks/send + tests del vault.
   - **Sprint 2:** CatalogTools + Odoo + Message model + cliente HTTP al gateway.
   - **Sprint 3:** IA + quotas + conversation engine + cache.
   - **Sprint 4:** BullMQ (outbound + ERP) + factory unificada + E2E documentado.
   - **Sprint 5:** UI en panel existente + human takeover + piloto + CI/CD + cierre FEAT-080/081.

6. **Riesgos a mitigar explícitamente**
   - Rate limits de Meta (rate limiter por tenant/canal desde el día 1 de colas).
   - Idempotencia de pedidos (order_uuid / client_order_ref).
   - No filtrar secrets (tests que fallen si el valor plano aparece en cualquier response).
   - No romper el schema decoupling existente.

7. **Documentación viva**
   - Tras cada sprint: actualizar `docs/planes/omnicatalog/` (o carpeta equivalente) y el troubleshooting si se toca un patrón nuevo (middleware Prisma automático, etc.).

---

## 6. Veredicto final

El plan es **arquitectónicamente sólido** y el enfoque de gateway horizontal + consumidor de negocio es el correcto para un ecosistema OmniFlow.

Sin embargo, los **master prompts de sprints 1-5 están desfasados** respecto al código y al featurelist reales. Ejecutarlos sin el filtro del documento de implementación generaría trabajo duplicado, inconsistencias de schema y posible regresión en `social-catalog-standalone`.

### Prioridad inmediata

1. Ejecutar el prompt del **Líder/Planificador** (confirmación de features, puertos y ubicación del código de adaptadores).
2. Tratar los master prompts como **especificación de comportamiento**, no como instrucciones de código.
3. Seguir la secuencia y las reglas inviolables de `PROMPTS_IMPLEMENTACION_OMNICATALOG.md`.

---

## 7. Próximos pasos sugeridos

- Generar un checklist de “pre-Sprint 1” (comandos y lecturas concretas).
- Producir una versión reconciliada de los 5 master prompts ya alineada con la extracción y FEAT-080/081.
- Definir un ADR corto de contrato gateway ↔ consumidores antes de tocar código.

---

*Informe generado a partir de la evaluación técnica del plan y prompts de desarrollo de OmniMessaging Hub & OmniCatalog.*
