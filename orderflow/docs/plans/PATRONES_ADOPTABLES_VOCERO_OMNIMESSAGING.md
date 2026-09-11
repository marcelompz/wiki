# Patrones adoptables de Vocero CRM para OmniMessaging Hub

**Fuente de referencia:** `/opt/vocero-crm` (proyecto Next.js 15 / Drizzle / Postgres, no forma parte del stack de OrderFlow — se usa solo como guía de diseño, no se porta código ni dependencias).

**Destino:** `OmniMessaging Hub` (capa horizontal de canales, cifrado, cuotas, colas y auditoría) y su consumo vía `IntentRouterService` desde módulos verticales (OmniCatalog, OmniBookings, OmniQuotations/POS).

**Alcance de este documento:** four patrones de diseño con impacto directo en gaps ya identificados en `OMNICATALOG_STANDALONE_TUNING.md` (guards vacíos, falta de vault de credenciales) y en la construcción del Hub. No incluye el Laboratorio de evaluación de agentes (tema aparte, fuera de alcance del Hub).

---

## FEAT-XXX-A — Webhook receiver de doble capa (prioridad crítica)

**Problema que ataca:** `OMNICATALOG_STANDALONE_TUNING.md` marcó los guards de autenticación del webhook receiver como `@UseGuards()` vacíos, sin protección real — bloqueante explícito antes de construir el vault de credenciales del gateway.

**Referencia en Vocero:**
- `src/server/inbox/webhook.ts` — funciones puras `isValidWebhookToken`, `isValidSignature`, `safeEqual` (sin dependencia de BD, 100% testeable unitariamente)
- `src/app/api/webhooks/wa/[webhookToken]/route.ts` — uso de esas funciones en el handler HTTP

**Patrón:**

1. **Capa 1 — token en la ruta.** Cada conexión de canal (WhatsApp, Telegram, Instagram, Messenger, Custom Webhook) recibe un segmento de URL secreto y único, generado al crear la integración (ej. `openssl rand -hex 32`). Si el segmento no coincide con el guardado → **404 silencioso**, no 401/403 (no revela que el endpoint existe).
2. **Capa 2 — firma HMAC sobre el body crudo.** Cuando el proveedor la soporta (Meta: `x-hub-signature-256`), se valida el HMAC-SHA256 del body *sin parsear* contra un secreto de la app. Esta capa es **opcional y activable por integración** — clave para migración gradual canal por canal sin romper las que aún no tienen secreto cargado.
3. **Comparación en tiempo constante siempre.** Ambas capas usan `timingSafeEqual` sobre buffers de longitud fija (hasheando ambos lados primero con HMAC, para no filtrar la longitud del string original vía timing). Nunca `===` ni comparación de string directa sobre un secreto.
4. **Responder 200 antes de procesar.** El handler valida, responde `200` de inmediato, y el procesamiento real va diferido (en Vocero usa `after()` de Next.js; en NestJS el equivalente natural es encolar en BullMQ — `order-erp-injection`/`messaging-outbound` o una cola dedicada — y responder antes de encolar). Esto evita que Meta reintente por timeout y evita acoplar la latencia del canal a la latencia del procesamiento interno.

**Adaptación al stack OrderFlow (NestJS + Prisma):**
- Middleware/guard reutilizable por canal, no un guard por endpoint copiado y pegado: `WebhookSignatureGuard` parametrizable con el nombre del proveedor (cada canal define su propio esquema de firma).
- El body crudo debe capturarse **antes** de que cualquier `BodyParser`/`ValidationPipe` lo transforme — en Nest esto requiere configurar `rawBody: true` en el adapter HTTP o un middleware que preserve el buffer original antes del JSON parsing.
- El token de ruta y el secreto de firma por canal viven en la tabla de integraciones (mismo lugar donde hoy vive el `X-OmniLedger-Tenant-Id` para el fan-out de OmniLedger), no en variables de entorno — porque acá son *por canal por tenant*, no globales.

---

## FEAT-XXX-B — Tenant scoping forzado a nivel de función, no de convención

**Problema que ataca:** hoy la regla "tenantId nunca se elimina de queries" vive en AGENTS.md como convención documentada + `@TenantPrisma()`. Es fuerte, pero depende de que cada desarrollador (o agente IA) recuerde usarla.

**Referencia en Vocero:** `src/lib/db/tenant.ts` — función `scoped()`:

```ts
export function scoped(organizationColumn, organizationId, ...conditions) {
  if (!organizationId) {
    throw new Error("scoped(): organizationId vacío — query sin tenant");
  }
  return and(eq(organizationColumn, organizationId), ...conditions);
}
```

**Patrón:** la función de bajo nivel **se niega a construir la condición WHERE** si no recibe un `organizationId`/`tenantId` no vacío. No es una convención de "acordate de filtrar" — es imposible llamarla sin el tenant sin que explote en desarrollo/tests.

**Adaptación al stack OrderFlow:** revisar si las Prisma Client Extensions del Hub (mencionadas en `PLAN_DESARROLLO_OMNIMESSAGING_Y_OMNICATALOG_v1.1.0.md`) hacen esto mismo de forma *fail-fast*, o si solo inyectan el `tenantId` cuando está presente y dejan pasar queries sin él. Si es lo segundo, vale la pena que la extensión de Prisma lance en el hook `query` cuando el `where` no incluye `tenantId`, en vez de solo agregarlo condicionalmente — mismo espíritu que `scoped()`, aplicado a nivel de extensión global en vez de helper opcional.

---

## FEAT-XXX-C — Códigos de error tipados en el contrato del Hub

**Problema que ataca:** `IntentRouterService` y los adaptadores consumidores (OmniCatalog, OmniBookings, OmniQuotations) necesitan saber **qué hacer** ante un fallo del Hub, no solo que algo falló.

**Referencia en Vocero:** contrato `/api/bot/*` — devuelve `409` con código tipado (`ai_paused`, `window_closed`, `sandbox_violation`) en vez de un 409 genérico, documentado en `tests/e2e/us-bot-api.md`.

**Patrón:** cada error de negocio (no de validación) del Hub lleva un `code` de un enum cerrado y documentado, para que quien lo consume pueda ramificar sin parsear el mensaje:

```json
{ "error": { "code": "window_closed", "message": "..." } }
```

**Adaptación al stack OrderFlow:** definir el enum de códigos del Hub antes de escribir el primer endpoint (ej. `CHANNEL_UNAVAILABLE`, `QUOTA_EXCEEDED`, `WINDOW_CLOSED`, `SIGNATURE_INVALID`, `ADAPTER_TIMEOUT`), documentarlo en la Wiki junto al resto de contratos, y que el `IntentRouterService` lo use para decidir reintento/fallback/alerta — igual que ya se hace con los modos de operación de OmniLedger (`solo OrderFlow` / `fan-out` / `solo OmniLedger`).

---

## FEAT-XXX-D — Rate limiting con ventana deslizante (adaptar backend, no el código)

**Problema que ataca:** el `QuotaPlanGuard` planificado necesita una implementación concreta de ventana deslizante, no solo el concepto.

**Referencia en Vocero:** `src/lib/rate-limit.ts` — `checkRateLimit(key, { windowMs, max })` → `{ allowed, remaining }`, con buckets de timestamps filtrados por corte de ventana.

**Patrón:** la interfaz es simple y agnóstica del backend de almacenamiento — eso es lo reutilizable, **no** la implementación in-memory (que en Vocero es intencional para un monolito de una sola instancia, documentado como tal — no sirve para OrderFlow, que corre múltiples instancias detrás de Traefik).

**Adaptación al stack OrderFlow:** reimplementar la misma firma (`checkRateLimit(key, opts) → {allowed, remaining}`) sobre Redis (ej. `ZADD`/`ZREMRANGEBYSCORE` para ventana deslizante real, o `INCR` + `EXPIRE` si alcanza con ventana fija), de forma que el `QuotaPlanGuard` y cualquier límite por canal/tenant compartan una sola función, sin duplicar lógica de ventana en cada guard.

---

## Fuera de alcance de este documento

- **El Laboratorio** (personas simuladas + juez LLM con salida Zod estructurada, `src/server/lab/`) — patrón interesante para evaluar la calidad de un agente antes de producción, pero es una feature completa de evaluación, no un patrón puntual del Hub. Si se decide explorarlo, amerita su propio documento y probablemente se relacione más con el agente de OmniCatalog que con el Hub de mensajería en sí.

---

## Siguiente paso sugerido

Verificar contra `featurelist.json` real el próximo Feature ID libre antes de asignar los `FEAT-XXX-A..D` de este documento (aquí quedaron como marcadores de orden, no como IDs confirmados), y secuenciarlos según la prioridad ya establecida: primero A (bloqueante de seguridad ya señalado en el tuning doc), luego B (endurece una regla ya vigente), y C/D en paralelo con el desarrollo del Hub.
