# OrderFlow v1.24.04 — Estado del Arte (Informe de Release)

**Fecha:** 2026-09-03
**Versión actual:** `v1.24.04`
**Versión anterior:** `v1.24.03`
**Marca pública:** OmniFlow
**Capa técnica interna:** OrderFlow

---

## 🎯 Resumen ejecutivo

En esta release se cerraron **dos hitos del Plan Comercial SaaS** (FEAT-112 y FEAT-113 del documento `docs/planes/comercial/OmniFlow_Plan_Comercial_v1.md`):

1. **FEAT-112 — Cerrar `POST /api/v1/tenants`** con `TenantCreationGuard`. Antes cualquiera podía crear un tenant y subdominio en Cloudflare sin pagar; ahora sólo SuperAdmin (JWT/master key) o un `provisioningJobId` válido y pagado pueden hacerlo.
2. **FEAT-113 — Wizard de signup público + EarlyAccess**. Nuevo `CommercialModule` con 5 endpoints públicos en `/api/v1/public/commercial/*` que permiten a un prospecto ver planes, validar subdominio, aplicar código `EARLY30` (30% off los primeros 30 días) y crear una `SignupSession` con el subdomain reservado por 24h mientras completa el pago.

Esto deja habilitada la **Fase 0 (Hardening)** y la **Fase A.1 (modelo de aprovisionamiento)** del plan comercial. El siguiente paso crítico es el **FEAT-114 (ProvisioningWorker)**: el componente que escucha los webhooks de las pasarelas de pago y crea el tenant + subdominio + módulos del plan una vez confirmado el pago.

---

## 📦 Lo que se entrega en v1.24.04

### Backend

| Componente | Estado | Detalle |
|---|---|---|
| `TenantCreationGuard` | ✅ nuevo | Acepta SuperAdmin o `provisioningJobId` válido (QUEUED/AUTO_PROCESSING, !requiresHuman, no consumido) |
| Modelo Prisma `ProvisioningJob` | ✅ nuevo | Cola de aprovisionamiento con enums `ProvisioningJobType` y `ProvisioningJobStatus` |
| `SubscriptionPlan` enriquecido | ✅ actualizado | Nuevas columnas: `planTier`, `isolationTier`, `setupFee`, `trialDays` |
| `EarlyAccessCode` | ✅ nuevo | Modelo para códigos promo (ej. `EARLY30`) |
| `SignupSession` | ✅ nuevo | Sesión del wizard con reserva de subdomain por 24h, payload del cliente, payment intent, provisioning job |
| `CommercialModule` | ✅ nuevo | `SignupService`, `EarlyAccessService`, `CommercialPublicController` |
| `seed-feat113.ts` | ✅ nuevo | Crea 3 planes (Starter $39, Pro $179, Ent $549) y el código `EARLY30` |

### Endpoints públicos nuevos

| Método | Path | Descripción |
|---|---|---|
| `GET` | `/api/v1/public/commercial/plans` | Lista planes activos con precios, features, limits, trial days |
| `GET` | `/api/v1/public/commercial/subdomain/:subdomain/check` | Valida disponibilidad del subdominio (incluye reserved list) |
| `POST` | `/api/v1/public/commercial/early-access/validate` | Valida un código de early access |
| `POST` | `/api/v1/public/commercial/signup` | Crea sesión, aplica descuento, reserva subdomain 24h |
| `GET` | `/api/v1/public/commercial/signup/:sessionId` | Estado de la sesión (polling) |

### Endpoints protegidos actualizados

- `POST /api/v1/tenants` ahora con `@UseGuards(TenantCreationGuard)`. Si la request viene de un `provisioningJob`, el job se vincula al tenant y se marca `DONE`.

### Datos sembrados

- 3 planes:
  - **Starter** — $39 USD/mes, shared, trial 14d, límites: 100 productos / 3 usuarios / 500 pedidos/mes / 5 GB
  - **Professional** — $179 USD/mes, shared, trial 14d, límites: 1000 productos / 15 usuarios / 5000 pedidos/mes / 50 GB
  - **Enterprise** — $549 USD/mes, dedicated (opcional), setup $999, trial 14d, límites ilimitados (excepto 500 GB storage)
- 1 código de early access:
  - **EARLY30** — 30% off, válido del 2026-09-03 al 2026-10-03 (30 días), aplicable a Starter y Professional

---

## 🧪 Cobertura de tests

| Suite | Tests | Estado |
|---|---|---|
| `tenants.controller.spec.ts` (existente) | 16 | ✅ pasando |
| `tenant-creation.guard.spec.ts` (nuevo FEAT-112) | 8 | ✅ pasando |
| `early-access.service.spec.ts` (nuevo FEAT-113) | 12 | ✅ pasando |
| `signup.service.spec.ts` (nuevo FEAT-113) | 16 | ✅ pasando |
| **Total** | **52** | **✅ todos pasando** |

---

## 🌐 UAT

### Hetzner (producción) — `https://api.pesallaccia.com`

**FEAT-112** (5/5 UAT):
- POST público sin auth → `403`
- provisioningJobId inválido → `403` "no encontrado"
- provisioningJobId válido (QUEUED, !requiresHuman) → `200` con tenant + apiKey + job DONE
- Reusar job DONE → `403` "ya tiene tenant asociado"
- Job con requiresHuman=true → `403` "requiere intervención humana"

**FEAT-113** (10/10 UAT):
- GET `/plans` → 3 planes correctos
- GET `/subdomain/admin/check` → `available:false` (reservado)
- POST `/early-access/validate EARLY30 + starter` → `valid:true, percentOff:30`
- POST `/early-access/validate EARLY30 + enterprise` → `400` (no aplica)
- POST `/signup` con Professional + EARLY30 → `finalPrice:125.3` ($179 × 0.7)
- POST `/signup` con subdomain duplicado → `409` Conflict
- GET `/signup/:id` → estado `in_progress`

### Provecchio (staging) — `https://orderflow.provecchio.com`

**FEAT-112** (3/3 UAT):
- POST público sin auth → `403`
- provisioningJobId válido → `200` con tenant creado
- Reusar job DONE → `403`

**FEAT-113** (3/3 UAT):
- GET `/plans` → 3 planes correctos
- GET `/subdomain/my-prov-uat/check` → `available:true`
- POST `/signup` con Starter + EARLY30 → `finalPrice:27.3` ($39 × 0.7)

> **Lección documentada en troubleshooting #98:** en Provecchio siempre se valida vía `orderflow.provecchio.com` (no `staging.pesallaccia.com`, que queda atrapado en Cloudflare + Traefik de Hetzner).

---

## 🛠️ Operaciones realizadas

### Hetzner (producción)

- `git pull origin main` ✓
- Migración `20260903_feat112_provisioning_job` aplicada manualmente vía `psql` (registrada en `_prisma_migrations`)
- Migración `20260903_feat113_signup_early_access` aplicada manualmente
- `docker compose -f docker-compose.prod.yml build --no-cache backend` ✓ (~30s)
- `docker compose -f docker-compose.prod.yml up -d --force-recreate backend` ✓
- `docker exec ... npx ts-node prisma/seed-feat113.ts` ✓ (3 planes + EARLY30)
- Plan legacy `basic` (PYG, 150000) desactivado (`UPDATE subscription_plans SET active=false WHERE slug='basic'`)
- Cleanup: signup_sessions de UAT eliminadas, `currentUses` de EARLY30 reseteado

### Provecchio (staging)

- Disco lleno al 100% (124M libres) → resuelto con `docker image prune -af` + `docker builder prune -af` (liberados 14G, ahora 29% uso)
- Misma secuencia de migración, build, seed
- Cleanup análogo

### Repositorio (`main`)

- 7 commits en este release: `a8b2a419`, `296e52cb`, `5fef014c`, `c555bb14`, `35314aa7`, `9853adb3`, `b9ac17b2` (FEAT-112) + `d2b1b6df`, `9cce65ea`, `dca8fc7c`, `83548294`, `5a86313e` (FEAT-113)
- `VERSION` bumped a `1.24.04`
- `backend/src/main.ts` Swagger bumped a `1.24.04`
- `ROADMAP.md` actualizado con v1.24.04 como versión actual
- `docs/troubleshooting/98-feat112-tenants-endpoint-protected.md` creado (con UAT evidence)
- `docs/troubleshooting/99-feat113-signup-wizard-public.md` creado (con UAT evidence)
- `docs/troubleshooting/README.md` actualizado con índice de #98 y #99

---

## ⚠️ Issues conocidos (no bloqueantes)

1. **`/api/docs` y `/api/docs-json` devuelven 404** incluso dentro del container backend. La ruta `POST /api/v1/tenants` funciona correctamente. Posible incompatibilidad con `@nestjs/swagger@7.x`. Investigar en sprint siguiente.
2. **`staging.pesallaccia.com` no se resuelve contra Provecchio** — Cloudflare bloquea porque el origin (IP de Provecchio) no está autorizado. Para UAT de backend en Provecchio, usar `orderflow.provecchio.com`.
3. **Cleanup manual del contador `currentUses`** de `EARLY30` después del UAT: actualmente se hace con `UPDATE` SQL; debería hacerse con un método del servicio (pendiente para FEAT-114).

---

## ⏭️ Próximos pasos (orden de prioridad)

1. **FEAT-114 — ProvisioningWorker** (crítico, bloqueante para venta 24/7)
   - Escuchar webhooks de Stripe / MercadoPago / Pagopar
   - Al confirmarse el pago, crear `ProvisioningJob` desde el `SignupSession`
   - Procesar el job: crear tenant, subdominio en Cloudflare, habilitar módulos del plan
   - Marcar `SignupSession.status = completed` y `ProvisioningJob.status = DONE`

2. **FEAT-115 — Landing + selector de planes** (frontend)
   - Página pública que consume `GET /api/v1/public/commercial/plans`
   - Cards para los 3 planes con CTA al wizard

3. **FEAT-116 — Wizard de compra** (frontend)
   - Multi-step: plan → subdomain check → early-access → signup → payment intent
   - Integración con las 3 pasarelas (Stripe, MercadoPago, Pagopar)

4. **FEAT-117 — Pantalla de estado post-compra** (frontend)
   - Polling `GET /signup/:sessionId` cada 3-5s
   - Mensaje claro si queda `AWAITING_HUMAN`

5. **v1.25.0 — Fase 7 del Plan de Blindaje** (bloqueante técnico)
   - Migración de servicios de alto riesgo a `@TenantPrisma()` (multi-tier dinámico)
   - Habilita `isolationTier = dedicated` para Enterprise

---

## 📂 Documentación vinculada

- [docs/00-contexto-agentes.md](../00-contexto-agentes.md) — contexto vivo del proyecto (pendiente actualizar a v1.24.04)
- [docs/planes/comercial/OmniFlow_Plan_Comercial_v1.md](../planes/comercial/OmniFlow_Plan_Comercial_v1.md) — plan comercial unificado
- [docs/planes/PLAN_BLINDAJE_ORDERFLOW.md](../planes/PLAN_BLINDAJE_ORDERFLOW.md) — Fases 1-6 cerradas, Fase 7 pendiente
- [docs/troubleshooting/98-feat112-tenants-endpoint-protected.md](../troubleshooting/98-feat112-tenants-endpoint-protected.md) — UAT FEAT-112
- [docs/troubleshooting/99-feat113-signup-wizard-public.md](../troubleshooting/99-feat113-signup-wizard-public.md) — UAT FEAT-113
- [ROADMAP.md](../../ROADMAP.md) — roadmap vivo
