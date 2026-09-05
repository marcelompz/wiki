# Troubleshooting #99 — FEAT-113: Public Signup Wizard & Early Access

## 📋 Síntomas (después del deploy)

1. **El endpoint público `POST /api/v1/public/commercial/signup` no existe** después de un deploy v1.24.x — el frontend no puede iniciar el wizard de compra.
2. **El endpoint `GET /api/v1/public/commercial/plans` no responde** con la lista de planes disponibles para mostrar en la landing.

---

## 🔍 Causa Raíz

FEAT-113 introduce el módulo `CommercialModule` con el wizard de signup público. Es el primer paso para que el SaaS se pueda vender 24/7 sin intervención de un operador.

### Cambios aplicados (commits `d2b1b6df` + `9cce65ea`)

1. **Migración Prisma `20260903_feat113_signup_early_access`:**
   - Nuevas columnas en `subscription_plans`: `planTier`, `isolationTier`, `setupFee`, `trialDays`
   - Backfill de `planTier` desde `slug` para planes legacy
   - Nueva tabla `early_access_codes` (code, percentOff, validFrom, validUntil, maxUses, currentUses, applicablePlans[])
   - Nueva tabla `signup_sessions` (sessionId, planId, customerEmail, subdomain, paymentIntentId, expiresAt, status, etc.)

2. **Nuevo `CommercialModule`:**
   - `SignupService`: lista planes, valida subdominios (incluye reserved list), crea SignupSession con descuento aplicado
   - `EarlyAccessService`: valida códigos, calcula descuento, registra uso
   - `CommercialPublicController`: 5 endpoints públicos (ver tabla UAT)

3. **Seed script `prisma/seed-feat113.ts`:**
   - 3 planes base: Starter ($39), Professional ($179), Enterprise ($549)
   - Código `EARLY30`: 30% off, válido 30 días desde el lanzamiento, aplicable a Starter/Professional

4. **Tests unitarios:** 28/28 pasando (EarlyAccessService + SignupService)

---

## 🧪 UAT Hetzner (2026-09-03)

| Test | Resultado | Estado |
|---|---|---|
| `GET /api/v1/public/commercial/plans` → 3 planes | `200 OK` con planes Starter/Pro/Ent con `price=39/179/549` USD, `trialDays=14` | ✅ |
| `GET .../subdomain/my-acme-uat/check` | `{"available":true}` | ✅ |
| `GET .../subdomain/admin/check` (reservado) | `{"available":false,"reason":"reservado"}` | ✅ |
| `POST .../early-access/validate {code:EARLY30, planSlug:starter}` | `{"valid":true,"percentOff":30}` | ✅ |
| `POST .../early-access/validate {code:EARLY30, planSlug:enterprise}` | `400` "no aplica al plan enterprise" | ✅ |
| `POST .../early-access/validate {code:FAKE50}` | `404` "Código FAKE50 no existe" | ✅ |
| `POST .../signup {planSlug:professional, ... EARLY30}` | `201` con `finalPrice=125.3` ($179 × 0.7) | ✅ |
| `currentUses` de EARLY30 incrementó a 1 en DB | Verificado en psql | ✅ |
| `POST .../signup` con subdomain duplicado (otro signup en curso) | `409 Conflict` | ✅ |
| `GET .../signup/:sessionId` | `200` con estado `in_progress` | ✅ |

## 🧪 UAT Provecchio (2026-09-03) — vía `orderflow.provecchio.com`

| Test | Resultado | Estado |
|---|---|---|
| `GET /api/v1/public/commercial/plans` | 3 planes correctos | ✅ |
| `GET .../subdomain/my-prov-uat/check` | `available:true` | ✅ |
| `POST .../signup {planSlug:starter, EARLY30}` | `201` con `finalPrice=27.3` ($39 × 0.7) | ✅ |

**Cleanup:** UAT data removida de ambas DBs (`signup_sessions` y `currentUses` decrementado en `early_access_codes`).

---

## 📌 Para el frontend (FEAT-115/116)

Cuando se implemente el wizard, debe llamar en este orden:

1. `GET /api/v1/public/commercial/plans` → renderizar 3 cards (Starter/Pro/Ent)
2. (cliente elige plan) `GET /api/v1/public/commercial/subdomain/:subdomain/check` mientras el usuario tipea
3. (cliente aplica código) `POST /api/v1/public/commercial/early-access/validate` → mostrar `% off` y `finalPrice`
4. (cliente confirma datos) `POST /api/v1/public/commercial/signup` con todos los datos → devuelve `sessionId`
5. (frontend) `POST /api/v1/public/billing/payment-intent/:gateway` con `metadata.sessionId=...`
6. (cliente paga en la pasarela)
7. (webhook confirma pago) crea `ProvisioningJob` y vincula al `SignupSession` → `status=completed`
8. (frontend) `GET /api/v1/public/commercial/signup/:sessionId` cada 3-5s para polling del estado

---

## 📌 Para FEAT-114 (ProvisioningWorker)

El worker debe:
1. Escuchar webhooks de Stripe/MercadoPago/Pagopar
2. Cuando un pago es confirmado, buscar el `SignupSession` por `metadata.sessionId`
3. Crear un `ProvisioningJob` con `type=TENANT_SHARED` o `TENANT_DEDICATED` según el `plan.isolationTier`
4. Vincular el job al `SignupSession` (`provisioningJobId`)
5. Marcar el `SignupSession.status=completed`
6. Procesar el job (crear tenant, subdominio, etc.)
