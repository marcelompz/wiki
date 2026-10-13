# OmniFlow — Plan Comercial, Técnico y de Lanzamiento SaaS

**Versión del documento:** 1.0 (unificado)
**Fecha:** 2026-09-03
**Producto de referencia:** OmniFlow / OrderFlow **v1.24.02**
**Horizonte:** 4–6 semanas para lanzamiento comercial
**Estado:** planned (FEAT-112 en adelante, last_id actual: FEAT-111)

---

## Índice

- [PARTE A — Modelo Comercial Unificado](#parte-a)
- [PARTE B — Pricing y Add-ons](#parte-b)
- [PARTE C — Auditoría Técnica y Modelo de Datos](#parte-c)
- [PARTE D — Portal de Autogestión y Wizard](#parte-d)
- [PARTE E — Reglas de Negocio y Entitlement Engine](#parte-e)
- [PARTE F — Componentes Técnicos a Implementar](#parte-f)
- [PARTE G — Fases de Implementación (FEAT-112 a 119)](#parte-g)
- [PARTE H — Estrategia de Lanzamiento (Go-to-Market)](#parte-h)
- [PARTE I — Decisiones Pendientes](#parte-i)
- [PARTE J — Resultado Esperado](#parte-j)

---

<a name="parte-a"></a>
# PARTE A — Modelo Comercial Unificado

OmniFlow ya dispone de la base técnica necesaria (multi-tenant + multi-tier, billing con Stripe/MercadoPago/Pagopar, scripts de provisioning, Traefik, suite de microservicios standalone). Lo que falta para **comercializar y operar 24/7** es la capa comercial autogestionada.

El cliente elige uno de **tres caminos** (el wizard debe guiarlos claramente):

| Camino | Qué compra el cliente | Aislamiento | Cómo se provisiona |
|--------|------------------------|-------------|--------------------|
| **Servicios / Micro-SaaS** | Uno o más módulos standalone (Giveaways, BioLinks, Social Catalog, Bookings, Loyalty, POS, etc.) | Shared o por servicio | Feature flags + `ModuleInstallation` (+ deploy standalone si aplica) |
| **ERP como Tenant** | OmniFlow completo sobre base compartida | `isolationTier = "shared"` | Tenant + schema/RLS + seed + subdominio |
| **ERP como Tier** | OmniFlow completo + base de datos independiente | `isolationTier = "dedicated"` + `dedicatedDatabaseUrl` | Tenant + script de DB dedicada + Traefik |

### Mapeo con planes comerciales

| Plan | Target | Aislamiento típico | Rango de precio orientativo |
|------|--------|--------------------|-----------------------------|
| **Starter** | PyMEs / emprendedores | Shared | Bajo (ej. $39/mes) |
| **Professional** | Negocios establecidos | Shared + RLS reforzado | Medio (ej. $179/mes) |
| **Enterprise** | Corporaciones / cadenas | Shared reforzado o **Dedicated** | Alto (ej. $549+/mes) + setup |

Los **add-ons** (`SubscriptionAddon`) cubren: usuarios extra, almacenamiento, módulos sueltos, API calls, etc.

---

<a name="parte-b"></a>
# PARTE B — Pricing y Add-ons

## B.1 Principios

| Principio | Aplicación |
|-----------|------------|
| Valor percibido > coste | Cobrar por resultados (pedidos, canales, aislamiento, compliance) |
| Simple de entender | Máximo 3 planes + add-ons claros |
| Land & Expand | Entrada barata → upsell a Pro/Enterprise y add-ons |
| Aislamiento = premium | Shared = estándar; Dedicated = precio y setup altos |
| Anual con descuento | 15–20 % off → mejor cash flow y menor churn |
| Límites transparentes | Productos, usuarios, pedidos/mes, storage visibles |

## B.2 Planes base (referencia USD; adaptar a PYG)

| Plan | Mensual | Anual (≈17 % off) | Target | Aislamiento |
|------|---------|-------------------|--------|-------------|
| **Starter** | $39 | $390/año ($32.5/mes) | Emprendedores, <500 pedidos/mes | Shared |
| **Professional** | $179 | $1.790/año ($149/mes) | Negocios 10–50 personas, hasta ~5.000 pedidos/mes | Shared + RLS |
| **Enterprise** | desde $549 | desde $5.490/año | Corporativos, compliance, alto volumen | Shared reforzado o **Dedicated** |

**Setup one-time:**
- Starter: $0 (self-service)
- Professional: $0–$199 (onboarding opcional)
- Enterprise: $999–$2.499 (migración + training + dedicated)

### Contenido de valor por plan

**Starter**  
Catálogo + pedidos + clientes básicos, subdominio `*.omniflow.app`, límites de SKUs/usuarios/pedidos/storage. Bookings como add-on o incluido en variante superior.

**Professional**  
Todo Starter + POS/KDS, integraciones ERP, analytics, bookings, más usuarios/productos, API, más storage e integraciones, soporte prioritario.

**Enterprise**  
Todo Professional + white-label, SSO, SLA, audit avanzado, opción Database-per-Tenant, soporte 24/7, custom domain.

## B.3 Add-ons (expand revenue)

| Add-on | Precio orientativo | Notas |
|--------|--------------------|-------|
| Usuario admin extra | $8–12 / usuario / mes | Tras límite del plan |
| Storage +10 GB | $5–8 / mes | |
| Módulo standalone | $15–49 / mes | BioLinks, Giveaways, Loyalty, etc. |
| Pack pedidos +1.000 | $19–29 / mes | O overage |
| API calls elevados | Según volumen | |
| Dominio custom | Incluido Pro/Ent o $9/mes en Starter | |
| Onboarding / migración | $199–999 one-time | |

**Regla:** el add-on no debe ser más barato que el upgrade al plan siguiente.

## B.4 Precio del Tier dedicated

- Enterprise shared: precio base (ej. $549)
- Enterprise + DB dedicada: **+$300 a +$500/mes** (floor ~$999)
- Setup dedicado: $999–$2.499

Valor justificado: compliance, performance, backup propio, VPC/SSO/IP whitelist.

## B.5 Trial y descuentos

| Tema | Decisión recomendada |
|------|---------------------|
| Trial | 14 días **con tarjeta** (Starter/Pro). Enterprise: POC asistido |
| Anual | 15–20 % de descuento |
| Partners / agencias | 20–30 % margen o precio especial |
| Moneda | USD + PYG (Pagopar prioritario en Paraguay) |
| Descuentos públicos permanentes | Evitar; usar cupones temporales |

## B.6 Métricas que gobiernan el pricing

| Métrica | Objetivo orientativo |
|---------|----------------------|
| Conversión trial → paid | ≥ 25–40 % (con tarjeta) |
| Churn mensual logo | < 3–5 % |
| Net Revenue Retention (NRR) | > 110–120 % |
| ARPU | Creciente vía Pro + Enterprise + add-ons |
| Time to first value | < 15–30 min en Starter |
| % ingresos por expand | Creciente |

## B.7 Fases de madurez del pricing

1. **Lanzamiento:** 3 planes + 4–6 add-ons, trial con tarjeta, wizard por camino.
2. **Optimización (50–100 clientes de pago):** ajustar límites/precios, overages, partners.
3. **Madurez:** usage-based híbrido si aplica, precios por vertical, Enterprise custom.

---

<a name="parte-c"></a>
# PARTE C — Auditoría Técnica y Modelo de Datos

## C.1 Auditoría — qué ya existe vs qué falta

| Pieza | Estado |
|---|---|
| `SubscriptionPlan` (precio, intervalo, `features: Json[]`, `limits: Json`) | ✅ Existe |
| `Subscription` (tenant ↔ plan, `status`, período) | ✅ Existe |
| `SubscriptionAddon` (extras atados a un plan) | ✅ Existe, pero no sirve para "servicio standalone independiente" |
| Gateways de pago (MercadoPago, Pagopar, Stripe) + `payment-intent`/`webhooks` | ✅ Existe (`billing-public.controller.ts`) |
| `Tenant.isolationTier`: `'shared'` vs `'dedicated'` | ✅ Ya modela la distinción Tenant/Tier |
| `CloudflareDnsService.ensureSubdomain()` | ✅ Ya automatiza el subdominio al crear tenant |
| `Permission` / `RolePermission` / `UserTenantPermission` + `UserRole` (ADMIN/MANAGER/SELLER/VIEWER) | ✅ Existe a nivel de datos |
| `ModulesRegistry` (catálogo con `depends`, orden topológico) | ⚠️ Existe pero **no persiste habilitación por tenant** — el propio código comenta "en el futuro, esto consultará la base de datos para cada tenant" |
| `provision-orderflow-company.sh` (crear DB dedicada) | ⚠️ Existe pero es **100% manual**: pide password de DB por parámetro de shell, lo corre un humano en el servidor |
| `POST /api/v1/tenants` | 🔴 **Sin guard, sin pago, sin plan** — cualquiera puede crear un tenant y disparar aprovisionamiento de subdominio hoy mismo |
| Portal público de compra / wizard | 🔴 No existe — todo lo anterior son endpoints, no experiencia de compra |
| Compra de un servicio individual standalone (fuera del ERP) | 🔴 No existe ningún modelo para esto |

**Conclusión:** la mayoría de las piezas de backend ya están; falta la **orquestación** (wizard, checkout atómico, motor de aprovisionamiento condicional) y **cerrar el agujero de seguridad** del endpoint de tenants.

## C.2 Modelo de datos nuevo

```prisma
// Habilitación de módulos por tenant — resuelve el TODO de modules.registry.ts
model TenantModule {
  id         String   @id @default(uuid())
  tenantId   String
  moduleSlug String                    // debe existir en ModulesRegistry
  enabled    Boolean  @default(true)
  enabledAt  DateTime @default(now())
  source     String   @default("plan") // "plan" | "addon" | "manual"
  tenant     Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, moduleSlug])
  @@index([tenantId])
  @@map("tenant_modules")
}

// Compra de un microservicio standalone independiente (no atado a Tenant ERP completo)
model ServiceOffering {
  id           String   @id @default(uuid())
  slug         String   @unique          // "biolinks", "giveaways", "bookings"...
  name         String
  description  String?
  price        Decimal  @db.Decimal(10, 2)
  currency     String   @default("PYG")
  interval     String   @default("month")
  active       Boolean  @default(true)
  metadata     Json?
  subscriptions ServiceSubscription[]

  @@map("service_offerings")
}

model ServiceSubscription {
  id             String   @id @default(uuid())
  offeringId     String
  tenantId       String?               // null si es standalone puro sin tenant ERP asociado
  customerEmail  String                // dueño de la suscripción cuando no hay Tenant todavía
  status         String   @default("pending_provision")
  subdomain      String?  @unique       // subdominio propio del microservicio (ej. bio.midominio.com)
  provisionedAt  DateTime?
  offering       ServiceOffering @relation(fields: [offeringId], references: [id])

  @@index([tenantId])
  @@map("service_subscriptions")
}

// Cola de aprovisionamiento — automático o manual según el plan
enum ProvisioningJobType {
  TENANT_SHARED
  TENANT_DEDICATED
  SERVICE_STANDALONE
}

enum ProvisioningJobStatus {
  QUEUED
  AUTO_PROCESSING
  AWAITING_HUMAN
  DONE
  FAILED
}

model ProvisioningJob {
  id            String   @id @default(uuid())
  type          ProvisioningJobType
  status        ProvisioningJobStatus @default(QUEUED)
  tenantId      String?
  serviceSubId  String?
  planId        String?
  requiresHuman Boolean  @default(false)  // true si el plan es enterprise grande
  payload       Json                      // datos del wizard (subdominio, isolationTier, etc.)
  assignedTo    String?                   // userId del operador si requiresHuman
  createdAt     DateTime @default(now())
  completedAt   DateTime?
  errorLog      String?

  @@index([status])
  @@map("provisioning_jobs")
}
```

`Tenant` gana relación inversa `modules TenantModule[]`. `SubscriptionPlan` gana un campo opcional `autoProvision Boolean @default(true)` para distinguir qué planes disparan aprovisionamiento automático vs cola manual.

## C.3 Las 3 rutas del wizard

El wizard público converge en un único paso de checkout (mismo `payment-intent` existente) pero bifurca antes según lo elegido:

1. **Servicio individual** → puede resolver en dos sub-casos:
   - **Standalone aparte**: crea `ServiceSubscription` con su propio `subdomain`, dispara `ProvisioningJob(type: SERVICE_STANDALONE)` que levanta el microservicio `services/<slug>-standalone` correspondiente.
   - **Módulo dentro de un tenant compartido**: si el cliente ya tiene o crea un `Tenant(isolationTier: shared)`, se crea un `TenantModule(source: 'addon')` sobre ese tenant.
2. **ERP como Tenant** (compartido) → `Tenant(isolationTier: 'shared')` + `Subscription` al plan elegido + `TenantModule` por cada slug en `plan.features` + `ProvisioningJob(type: TENANT_SHARED, requiresHuman: false)`.
3. **ERP como Tier** (DB dedicada) → `Tenant(isolationTier: 'dedicated')` + `ProvisioningJob(type: TENANT_DEDICATED, requiresHuman: plan.autoProvision === false)`. Si es chico, el job corre solo; si es enterprise, queda `AWAITING_HUMAN`.

---

<a name="parte-d"></a>
# PARTE D — Portal de Autogestión y Wizard

## D.1 Zona pública (sin login)

- **Página de Pricing / Planes**: comparación clara Starter / Professional / Enterprise + módulos a la carta.
- **Wizard de compra** (flujo principal):
  1. ¿Qué necesitas? → servicio / ERP Tenant / ERP Tier
  2. Selección de plan + add-ons + ciclo (mensual/anual)
  3. Datos de empresa (razón social, RUC/taxId, industria, moneda, subdominio)
  4. Pago (Stripe / Mercado Pago / Pagopar)
  5. Confirmación + onboarding o "provisionando…" con polling
- **Landings de cada microservicio** con CTA "Activar en minutos".

## D.2 Zona del cliente (post-login)

- Dashboard de suscripción (estado, próximo cobro, facturas)
- Habilitación de servicios/módulos (respetando límites del plan)
- Configuración de negocio (branding, moneda, impuestos, subdominio, dominio custom)
- Gestión de usuarios y permisos granulares (RBAC)
- Upgrade / downgrade / cancelación self-service
- Facturas y métodos de pago
- Acceso a soporte / tickets (opcional)

---

<a name="parte-e"></a>
# PARTE E — Reglas de Negocio y Entitlement Engine

Centralizar la lógica en un motor de entitlements (puede vivir en `backend/billing` o en un nuevo módulo `entitlements`).

## E.1 Fuentes de verdad

- `SubscriptionPlan.features` + `limits` (JSON) → qué módulos y cuotas incluye el plan
- `Tenant` + `TenantSettings` + `ModuleInstallation` → estado real del tenant
- `isolationTier` + `dedicatedDatabaseUrl` → modo de aislamiento
- `Subscription.status` → ciclo de vida comercial

## E.2 Reglas críticas

| Evento | Acción de negocio |
|--------|-------------------|
| Pago exitoso de un plan | Crear/activar `Subscription` + aplicar features/limits + habilitar módulos del plan |
| Elección "ERP Tier" | Lanzar provisioning de DB dedicada y actualizar `isolationTier` |
| Uso de recursos | Enforce de límites (productos, usuarios admin, pedidos/mes, storage, API calls) en guards/services |
| Fallo de cobro | Pasar a `past_due` + grace period (3–7 días) |
| Fin de grace period | Suspender (`Tenant.active = false` o feature flags off) |
| Cancelación | `cancelAtPeriodEnd = true` → al llegar `currentPeriodEnd` deshabilitar módulos |
| Add-on comprado | Sumar límites/features al plan base |
| Trial | `status = "trialing"` sin cobro hasta el final del período de prueba |

## E.3 Provisioning automático post-pago (núcleo 24/7)

Flujo idempotente disparado por webhook de pasarela:

1. Validar pago (idempotencia por `gatewayTxId` / `hash`).
2. Crear o actualizar `Tenant` + `Subscription` + `Invoice`.
3. Según camino elegido:
   - **Tenant shared**: schema/RLS, seed, API key, subdominio, módulos del plan.
   - **Tier dedicated**: invocar script/servicio de DB dedicada, registrar `dedicatedDatabaseUrl`, migrar schema, seed.
   - **Solo servicio**: activar `ModuleInstallation` y, si aplica, configurar endpoint del standalone.
4. Enviar email de bienvenida + enlace al portal + credenciales temporales.
5. Registrar evento de auditoría.

Debe soportar reintentos y un job de reconciliación para casos fallidos.

---

<a name="parte-f"></a>
# PARTE F — Componentes Técnicos a Implementar

## F.1 Backend

| Componente | Estado actual | Acción requerida |
|------------|---------------|------------------|
| Modelos `Subscription*` / `Invoice` / `PaymentTransaction` | Existen | Usarlos como fuente de verdad (reducir dependencia de JSONB legacy) |
| Gateways Stripe / Mercado Pago / Pagopar | Existen | Unificar en `PaymentOrchestrator` + webhooks robustos e idempotentes |
| `POST /billing/subscribe` + Checkout | Parcial | Completar flujo + soporte de trial |
| Webhooks renovación / fallo / cancelación | Parcial | Completar e integrar con entitlements |
| Cron facturación recurrente + past_due + suspensión | Incompleto / faltante | Implementar |
| Provisioning service (shared + dedicated) | Scripts existen | Convertir en servicio orquestado invocable post-pago |
| Entitlement / Feature Guard | Base RBAC + flags | Guard que lea plan + add-ons + `ModuleInstallation` |
| API pública de planes y checkout | Parcial (`billing-public`) | Exponer catálogo + inicio de checkout sin autenticación |

## F.2 Frontend

- Wizard multi-paso de compra (público)
- Portal del cliente (suscripción, módulos, usuarios/permisos, branding, facturas)
- SuperAdmin: CRUD de planes y add-ons, overrides manuales, promoción a dedicated, métricas MRR/churn

## F.3 Infraestructura

- Traefik: generación automática de regla de subdominio al crear tenant
- Script/servicio de DB dedicada invocable de forma segura (cola de jobs recomendada)
- Health checks + alertas (Sentry) para fallos de provisioning o webhooks

---

<a name="parte-g"></a>
# PARTE G — Fases de Implementación (FEAT-112 a 119)

## G.0 FASE 0 — Hardening (bloqueante, antes de exponer nada al público)

**FEAT-112 — Cerrar `POST /api/v1/tenants`**
> Agregar guard a `TenantsController.create`: debe rechazar la creación directa de un tenant si no viene acompañada de un `ProvisioningJob` válido y ya pagado (o, para uso interno/soporte, requerir `ApiKeyGuard` de admin como ya usan otros endpoints del controller). **Ningún tenant se crea sin pasar por el flujo de compra o por un operador autenticado.**

## G.1 FASE A — Modelo y motor de aprovisionamiento

**FEAT-113 — Schema: `TenantModule`, `ServiceOffering`, `ServiceSubscription`, `ProvisioningJob`**
> Implementar los modelos de la PARTE C.2, migración incluida. Extender `ModulesRegistry.getInstalledModules()` para que ahora sí consulte `TenantModule` por tenant (resolviendo el TODO existente en el código) en vez de devolver el catálogo completo fijo.

**FEAT-114 — `ProvisioningWorker`**
> Nuevo servicio interno que procesa `ProvisioningJob` en estado `QUEUED`: para `TENANT_SHARED` y `TENANT_DEDICATED` con `autoProvision: true`, ejecuta la creación del tenant + (si dedicated) la lógica hoy manual de `provision-orderflow-company.sh` convertida a llamadas de código (Docker API o Prisma `CREATE DATABASE` según corresponda); para jobs con `requiresHuman: true`, los deja en `AWAITING_HUMAN` y notifica al equipo. Reusa `CloudflareDnsService.ensureSubdomain()` ya existente.

## G.2 FASE B — Portal público y wizard

**FEAT-115 — Landing + selector de planes**
> Página pública nueva (`frontend/pages/saas-portal/landing.tsx` o similar) que lista `SubscriptionPlan.active` y `ServiceOffering.active` desde un endpoint público nuevo (`GET /api/v1/public/plans`, `GET /api/v1/public/service-offerings`).

**FEAT-116 — Wizard de compra (3 pasos)**
> Wizard multi-step: paso 1 elige entre las 3 rutas de la PARTE C.3; paso 2 pide datos específicos; paso 3 dispara `payment-intent` (endpoint ya existente en `billing-public.controller.ts`) y al confirmarse el pago (webhook) recién ahí se crea el `ProvisioningJob` correspondiente — **nunca antes del pago confirmado**.

**FEAT-117 — Pantalla de estado post-compra**
> Tras el pago, pantalla que consulta `ProvisioningJob.status` (polling simple) y muestra progreso; si queda `AWAITING_HUMAN`, mensaje claro de "tu cuenta enterprise está siendo configurada por nuestro equipo" con tiempo estimado.

## G.3 FASE C — Permisos self-service + panel interno

**FEAT-118 — Portal self-service de usuarios/permisos**
> Dentro del panel admin del tenant, pantalla para que el propio cliente invite usuarios, les asigne `UserRole` (ADMIN/MANAGER/SELLER/VIEWER) y ajuste `UserTenantPermission` puntuales (grant/deny sobre `Permission` específicos) sin tocar el rol base.

**FEAT-119 — Panel interno de OrderFlow**
> Vista interna (no visible a tenants) para que el equipo de OrderFlow vea/edite permisos y `TenantModule` de cualquier tenant, y gestione la cola `AWAITING_HUMAN` de `ProvisioningJob` (Fase A).

## G.4 Orden sugerido

**Sprint 0 (1-2 días) — FEAT-112 → 113 → 114 → 115 → 116 → 117 → 118 → 119.**

La **Fase 0 no es negociable**: no tiene sentido construir el wizard mientras el endpoint de creación de tenants siga abierto sin pago de por medio.

---

<a name="parte-h"></a>
# PARTE H — Estrategia de Lanzamiento (Go-to-Market)

## H.1 Objetivo

Poner en el mercado un SaaS **comprable y operable 24/7** en un horizonte de **4–6 semanas**, con:
- Wizard y portal mínimos viables
- 3 planes vendibles + add-ons clave
- Provisioning automático para Tenant shared (Tier dedicated puede ser semi-asistido al inicio)
- Primeros clientes de pago y métricas básicas

## H.2 Fases del lanzamiento

### Fase 0 — Preparación (semana 0–1)

**Producto / técnico**
- Cerrar Sprint A (motor comercial): entitlements, webhooks, provisioning shared, API pública de planes.
- Definir y seedear los 3 planes + add-ons en `SubscriptionPlan` / `SubscriptionAddon`.
- Pasarelas listas: Pagopar (PY), Stripe + Mercado Pago (resto).
- Trial 14 días con captura de tarjeta.

**Comercial**
- Precios finales en USD y PYG.
- Textos de valor para pricing page y wizard.
- Política de reembolso / cancelación simple.

**Legal / ops**
- Términos de servicio y política de privacidad actualizados (SaaS).
- Emails transaccionales: bienvenida, pago exitoso, fallo de cobro, fin de trial.

**Criterio de salida:** se puede crear un tenant Starter de extremo a extremo vía checkout de prueba.

### Fase 1 — Soft Launch / Early Access (semana 1–3)

- 20–50 contactos calientes (clientes actuales, partners, red cercana).
- Early Access: 20–30 % off los primeros 3 meses o setup bonificado.
- Onboarding asistido ligero (call de 30 min) para los primeros 10–15.
- **Métricas:** trials iniciados, conversión trial→paid, time to first value, feedback.
- **Criterio de salida:** ≥ 8–12 clientes de pago o evidencia clara de que el wizard + provisioning funcionan sin intervención manual en el camino "Tenant shared".

### Fase 2 — Lanzamiento público (semana 3–5)

- Wizard público usable, portal del cliente básico.
- Pricing page pública y landings de 1–2 microservicios estrella (Social Catalog / Bookings).
- Tier dedicated disponible en modo "solicitud + provisioning asistido".
- Anuncio en canales propios + partners / agencias piloto.
- **Métricas:** trials/semana, conversión, MRR, churn temprano, upgrades Starter→Pro.
- **Criterio de salida:** MRR inicial estable, churn controlado, compra mayoritariamente self-service.

### Fase 3 — Post-lanzamiento y escala (semana 5+)

- Grace periods, emails de dunning, dashboard SuperAdmin (MRR, churn, tenants en riesgo).
- Automatizar más el camino Enterprise / Tier dedicated.
- Programa de referidos, casos de éxito públicos.
- **Operación 24/7:** runbook de incidentes, alertas de webhooks fallidos, revisión quincenal de pricing.

## H.3 Prioridad de productos en el lanzamiento

1. **ERP como Tenant (shared)** — Starter y Professional (mayor ticket que un módulo suelto).
2. **1–2 microservicios standalone** con demanda clara (Social Catalog / Bookings / BioLinks) como puerta de entrada y upsell posterior al ERP.
3. **ERP como Tier (dedicated)** — disponible, pero con venta consultiva y setup fee al inicio; automatización total en fase posterior.

## H.4 Mensaje central de lanzamiento

> **"OmniFlow: tu operación omnicanal lista en minutos. Empezá en plan compartido o con base de datos propia. Activá solo lo que necesitás: catálogo, pedidos, POS, reservas, WhatsApp y más — sin instalar servidores."**

Variantes por audiencia:
- **Emprendedor:** "De la idea a la primera venta sin complejidad técnica."
- **Negocio establecido:** "Unificá canales y dejá de pelear con planillas e integraciones frágiles."
- **Enterprise:** "Aislamiento real, white-label y SLA para operar en serio."

## H.5 Comunicación de valor (pricing)

| En vez de… | Comunicar… |
|------------|------------|
| Multi-tenant shared | "Empezá en minutos, sin instalar nada" |
| isolationTier dedicated | "Tus datos en base exclusiva, con SLA" |
| ModuleInstallation | "Activá POS, reservas o catálogo WhatsApp cuando lo necesites" |
| 100 SKUs | "Ideal para catálogos de hasta 100 productos" |
| API access | "Conectá con tu ERP o herramientas propias" |

## H.6 Riesgos de lanzamiento y mitigación

| Riesgo | Mitigación |
|--------|------------|
| Provisioning falla en producción | Soft launch con monitoreo; job de reconciliación; fallback manual documentado |
| Baja conversión del trial | Revisar time-to-value y fricción del wizard; onboarding asistido en Early Access |
| Churn alto en Starter | Ajustar límites o precio; mejorar activación de módulos clave en la primera semana |
| Complejidad del Tier dedicated | Venderlo como consultivo al inicio; no prometer 100 % self-service hasta automatizar |
| Confusión de planes | Pricing page y wizard con 3 caminos claros; evitar demasiados add-ons al día 1 |
| Soporte desbordado | Early Access limitado; FAQs + portal de ayuda mínimo |

## H.7 Checklist "listo para lanzar"

- [ ] 3 planes + add-ons seedados y visibles en pricing
- [ ] Checkout de prueba completo (pago → tenant → login)
- [ ] Webhooks de pago y fallo funcionando e idempotentes
- [ ] Trial 14 días con tarjeta
- [ ] Emails de bienvenida y fallo de cobro
- [ ] Términos y privacidad actualizados
- [ ] Wizard público usable en camino "ERP Tenant"
- [ ] Portal cliente: ver suscripción + facturas + cancelar
- [ ] Monitoreo básico (errores, webhooks, tenants past_due)
- [ ] Al menos 1 caso de uso documentado y 1 demo corta

---

<a name="parte-i"></a>
# PARTE I — Decisiones Resueltas (2026-09-03)

> **Las 7 decisiones fueron resueltas el 2026-09-03.** Ver documento dedicado con el detalle y criterio de cada una: [DECISIONES_PENDIENTES.md](DECISIONES_PENDIENTES.md).

| # | Decisión | Resolución |
|---|----------|------------|
| 1 | Precios finales | Starter $39, Professional $179, Enterprise $549 USD. **CRUD admin de precios** (FEAT-120, nuevo) para ajustar sin redeploy |
| 2 | Trial | 14 días con tarjeta obligatoria |
| 3 | Prioridad GTM | Tenant shared primero, BioLinks/Bookings como gancho de entrada |
| 4 | Tier dedicated día 1 | Asistido (SLA 24-48h, FEAT-114 automatiza en Sprint A) |
| 5 | Early Access | 30% off los primeros 3 meses (cupón `EARLY30`) |
| 6 | Pasarela por mercado | Pagopar PY · Mercado Pago LATAM · Stripe USA/Europa |
| 7 | FEAT-112 bloqueante | **Sprint 0** (1-2 días) — cerrar `POST /tenants` antes de Sprint A |

---

<a name="parte-j"></a>
# PARTE J — Resultado Esperado

## A 90 días
- SaaS comprable 24/7 en caminos Starter y Professional (Tenant shared).
- Wizard + portal del cliente operativos.
- Primer cohort de clientes de pago con métricas de conversión y churn.
- Expand revenue visible (add-ons y upgrades).
- Enterprise / Tier dedicated vendible (asistido o semi-automatizado).
- Base para iterar precios y producto con datos reales.

## Principios de diseño a respetar
- **No reinventar el núcleo**: multi-tier, billing, feature flags y scripts de provisioning ya existen.
- **Idempotencia** en todos los webhooks y jobs de provisioning.
- **tenantId es sagrado** y la lógica de negocio no se condiciona por `ORDERFLOW_MODE`.
- **Self-service primero**: el cliente debe poder comprar, activar, configurar y gestionar sin intervención manual del equipo.
- **Observabilidad**: todo fallo de cobro o provisioning debe ser visible y alertable.

---

## Roadmap de implementación por sprints

| Sprint | Alcance | Duración orientativa | Dependencias |
|--------|---------|----------------------|--------------|
| **A — Motor comercial** | Entitlements, webhooks, cron, provisioning post-pago, API pública | 1–1.5 semanas | FEAT-112 cerrado |
| **B — Portal y Wizard** | Wizard público, portal cliente, upgrade/cancel self-service | 1–1.5 semanas | Sprint A |
| **C — Operación 24/7** | Grace periods, emails, dashboard MRR/churn, runbooks | 1 semana | Sprint B |

**Dependencia previa (v1.25.0):** Migración de los 14 servicios de riesgo ALTO de `this.prisma` a `@TenantPrisma()` (Fase 7 del `PLAN_BLINDAJE_ORDERFLOW.md`) — **bloqueante técnico** para garantizar que los nuevos tenants se aprovisionen con el PrismaClient correcto desde el día 1.

---

**Documento unificado — OmniFlow Comercial + Técnico + Pricing + Lanzamiento**  
**Versión:** 1.0 (consolidación de `PLAN_OMNIFLOW_SAAS.md` + `OmniFlow_Plan_Comercializacion_SaaS.md` + `OmniFlow_Plan_Comercial_Pricing_Lanzamiento.md`)  
**Última actualización:** 2026-09-03  
**Referencia técnica:** OrderFlow v1.24.02 (Hetzner + Provecchio operativos)
