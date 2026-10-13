# Troubleshooting #98 — FEAT-112: `POST /api/v1/tenants` ahora protegido

## 📋 Síntomas

1. **El endpoint público `POST /api/v1/tenants` devolvía `403 Forbidden`** después del deploy de v1.24.03.
2. **Antes:** cualquiera podía crear un tenant y disparar el aprovisionamiento de subdominio en Cloudflare sin pagar.
3. **Después (v1.24.03):** el endpoint exige autenticación de SuperAdmin **o** un `provisioningJobId` válido y pagado.

---

## 🔍 Causa Raíz

FEAT-112 cierra una vulnerabilidad arquitectónica crítica del plan comercial:
- El endpoint estaba sin `@UseGuards`, sin pago, sin plan
- Cualquiera podía llamar `POST /api/v1/tenants` con un body mínimo y obtener una `apiKeySecret` + subdominio de Cloudflare gratis
- Bloqueaba la comercialización 24/7 del SaaS

### Cambios aplicados (commit `a8b2a419`)

1. **Nuevo `TenantCreationGuard`** (`backend/src/common/tenant-creation.guard.ts`):
   - Permite requests con `isSuperAdmin: true` (JWT o master key)
   - Permite requests con `provisioningJobId` válido (body o header `x-provisioning-job-id`)
   - Rechaza todo lo demás con `403 Forbidden`

2. **Nuevo modelo Prisma `ProvisioningJob`** + enums `ProvisioningJobType` y `ProvisioningJobStatus`:
   - Tabla `provisioning_jobs` con estados `QUEUED`, `AUTO_PROCESSING`, `AWAITING_HUMAN`, `DONE`, `FAILED`
   - Vinculado a `Tenant` por `tenantId` opcional
   - Listo para que FEAT-114 (ProvisioningWorker) lo procese

3. **`POST /api/v1/tenants`** ahora:
   - Tiene `@UseGuards(TenantCreationGuard)`
   - Si viene de un provisioningJob, lo vincula al nuevo tenant y lo marca `DONE`

---

## 🛠️ Solución para clientes que rompieron flujo

### Si el script / integración usaba `POST /api/v1/tenants` sin auth

**Opción A — Master key (uso interno / soporte):**
```bash
curl -X POST https://pesallaccia.com/api/v1/tenants \
  -H "x-api-key: $MASTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Nuevo Tenant", "subdomain": "nuevo-tenant"}'
```

**Opción B — provisioningJobId (flujo comercial):**
```bash
# 1. Crear el provisioningJob en la DB (o esperar al wizard FEAT-115)
# 2. Usar el ID devuelto:
curl -X POST https://pesallaccia.com/api/v1/tenants \
  -H "Content-Type: application/json" \
  -H "x-provisioning-job-id: $JOB_ID" \
  -d '{"name": "Nuevo Tenant", "subdomain": "nuevo-tenant", "provisioningJobId": "'$JOB_ID'"}'
```

### Si el script usaba el endpoint desde el panel admin

No hay cambio: el panel admin usa la master key de SuperAdmin automáticamente.

---

## 🧪 Verificación post-deploy

| Test | Resultado esperado |
|------|--------------------|
| `POST /tenants` sin headers ni body extra | `403 Forbidden` con mensaje "Se requiere autenticación de SuperAdmin o un provisioningJobId válido" |
| `POST /tenants` con `x-api-key: $MASTER_API_KEY` | `200 OK`, tenant creado |
| `POST /tenants` con `provisioningJobId` válido en body o header | `200 OK`, tenant creado + job marcado DONE |
| `POST /tenants` con `provisioningJobId` inválido / DONE / FAILED | `403 Forbidden` |
| `POST /tenants` con `provisioningJobId` de un job con `requiresHuman: true` | `403 Forbidden` con mensaje "requiere intervención humana" |

---

## 📌 Nota para FEAT-114 (ProvisioningWorker)

Cuando se implemente el worker que crea provisioningJobs automáticamente desde los webhooks de Stripe/MercadoPago/Pagopar, el endpoint `POST /tenants` será invocado por el worker pasando el `provisioningJobId` en el header `x-provisioning-job-id`. Esto cierra el ciclo de provisioning atómico desde el pago hasta el tenant operativo.

---

## ✅ UAT Hetzner (2026-09-03)

Tabla `provisioning_jobs` creada en producción. Endpoint desplegado en `api.pesallaccia.com`.

| Test | Request | Resultado | Estado |
|---|---|---|---|
| UAT 1: público sin auth | `POST /api/v1/tenants` body `{"name":"hack"}` | `403` "Se requiere autenticación de SuperAdmin o un provisioningJobId válido" | ✅ |
| UAT 2: jobId inválido | `POST` con `x-provisioning-job-id: id-falso-1234` | `403` "provisioningJobId no encontrado" | ✅ |
| UAT 3: jobId válido (QUEUED, !requiresHuman) | job `job-uat-test-001` insertado en DB; `POST` con `x-provisioning-job-id` | `200` con `apiKey` + `provisioningJobId: "job-uat-test-001"` | ✅ |
| UAT 3.1: job marcado DONE | `SELECT * FROM provisioning_jobs WHERE id=...` | `status=DONE`, `tenantId` linkeado, `completed_at` set | ✅ |
| UAT 4: reusar job DONE | mismo `x-provisioning-job-id: job-uat-test-001` | `403` "ya tiene un tenant asociado" | ✅ |
| UAT 5: job requiresHuman=true | job `job-uat-human-001` (TENANT_DEDICATED, requiresHuman=true) | `403` "requiere intervención humana" | ✅ |

**Cleanup:** los tenants y jobs de UAT se borraron de la DB de producción.

---

## ✅ UAT Provecchio (2026-09-03)

Migración aplicada en staging. Endpoint desplegado. **Importante: el endpoint UAT en Provecchio se valida contra `orderflow.provecchio.com`, NO contra `staging.pesallaccia.com`**. Esto es porque `staging.pesallaccia.com` es un subdominio de Hetzner (que ya está enrutado a través de Cloudflare + Traefik de Hetzner) y **no se resuelve contra Provecchio**; las requests a `staging.pesallaccia.com` se quedan en Cloudflare con 403.

| Test | Request | Resultado | Estado |
|---|---|---|---|
| UAT 1: público sin auth | `POST https://orderflow.provecchio.com/api/v1/tenants` body `{"name":"hack"}` | `403` "Se requiere autenticación de SuperAdmin o un provisioningJobId válido" | ✅ |
| UAT 3: jobId válido (QUEUED, !requiresHuman) | job `job-final-prov` insertado en DB; `POST` con `x-provisioning-job-id` | `200` con `apiKey` + `provisioningJobId: "job-final-prov"` | ✅ |
| UAT 4: reusar job DONE | mismo `x-provisioning-job-id: job-final-prov` | `403` "ya tiene un tenant asociado" | ✅ |

**Cleanup:** los tenants y jobs de UAT se borraron de la DB de staging.

**Lección aprendida:** para UAT del backend en Provecchio, usar siempre `orderflow.provecchio.com`. El subdominio `staging.pesallaccia.com` es **para Provecchio pero ruteado por Traefik de Hetzner** (no por el de Provecchio), lo que devuelve 403 de Cloudflare si Cloudflare bloquea ese origen. Revisar config de Cloudflare para `staging.pesallaccia.com` antes del próximo UAT si se necesita usar ese host.

---

**Issue pre-existente detectado (no relacionado con FEAT-112):** `/api/docs` y `/api/docs-json` devuelven 404 incluso dentro del container backend. Swagger UI/JSON no se está sirviendo. La ruta `POST /api/v1/tenants` funciona correctamente. Investigar en sprint siguiente — probablemente la versión 7.x de `@nestjs/swagger` cambió el path por defecto.
