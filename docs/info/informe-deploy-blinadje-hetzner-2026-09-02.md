# Informe de Despliegue — Plan de Blindaje en Hetzner

**Fecha:** 2026-09-02
**Entorno:** production (hetzner-orderflow:/srv/orderflow)
**Versión backend desplegada:** 1.24.02
**Objetivo:** cerrar la brecha del `PLAN_BLINDAJE_ORDERFLOW.md` (Fases 1-6) y validar el job de retención de 30 días en Hetzner antes de aplicar en Provecchio.

---

## Resumen ejecutivo

| Item | Estado |
|---|---|
| Código commiteado y pusheado a `origin/main` | ✅ Commit `0c16dfb7` |
| Backend reconstruido y desplegado en Hetzner | ✅ |
| Variable `TENANT_HARD_DELETE_DRY_RUN=true` activa | ✅ |
| Endpoint manual de retención operativo | ✅ `POST /api/v1/tenants/retention/run` (SuperAdmin) |
| Job cron agendado (`@Cron('0 3 * * *')`) | ✅ Activo |
| Validación end-to-end con tenant de prueba | ✅ OK |
| DRY-RUN impide borrado físico accidental | ✅ Verificado |
| Pendiente: aplicar en Provecchio | ⏳ Tras validación Hetzner |

---

## Commits desplegados

| SHA | Mensaje |
|---|---|
| `07dde39e` | feat(backend): tenant retention service + close PLAN_BLINDAJE phases 1-6 |
| `aee88f94` | fix(docker): inject TENANT_HARD_DELETE_DRY_RUN env var to backend |
| `0c16dfb7` | feat(tenants): add manual retention trigger endpoint for SuperAdmin |

---

## Archivos clave creados/modificados

### Nuevos
- `backend/src/tenants/tenant-retention.service.ts` — Servicio con `@Cron('0 3 * * *', { timeZone: 'America/Asuncion' })`, lógica de purga con DRY-RUN por defecto
- `docs/audits/audit-this-prisma-usage-2026-09-02.md` — Auditoría Fase 6 (77 vs 16)

### Modificados
- `backend/src/tenants/tenants.module.ts` — Registro del provider
- `backend/src/tenants/tenants.controller.ts` — Endpoint manual `POST /retention/run` (SuperAdmin only)
- `backend/entrypoint.sh` — Comentario actualizado (sin `db push` en producción)
- `docker-compose.prod.yml` — Inyección de `TENANT_HARD_DELETE_DRY_RUN=${...:-true}`
- `docs/planes/PLAN_BLINDAJE_ORDERFLOW.md` — Cierre de Fases 1-6

---

## Despliegue paso a paso

### 1. Configuración de variable de entorno
```bash
# Hetzner
echo "TENANT_HARD_DELETE_DRY_RUN=true" >> /srv/orderflow/.env
```

### 2. Pull del código
```bash
ssh hetzner-orderflow "cd /srv/orderflow && git pull origin main"
# Output: 07dde39e..0c16dfb7  main       -> origin/main
```

### 3. Rebuild de imagen backend
```bash
ssh hetzner-orderflow "cd /srv/orderflow && docker compose -f docker-compose.prod.yml build --no-cache backend"
# Output: Image orderflow-backend Built
```

### 4. Recreate del contenedor
```bash
ssh hetzner-orderflow "cd /srv/orderflow && docker compose -f docker-compose.prod.yml up -d --force-recreate backend"
```

### 5. Verificación de variable propagada
```bash
CID=$(ssh hetzner-orderflow "docker ps -q --filter name=orderflow-backend-prod | head -1")
ssh hetzner-orderflow "docker exec $CID env | grep TENANT"
# Output: TENANT_HARD_DELETE_DRY_RUN=true
```

---

## Validación end-to-end

### Test 1: Sin tenants expirados
```bash
curl -X POST -H "x-api-key: $MASTER_API_KEY" \
  http://localhost:3010/api/v1/tenants/retention/run
# Response: {"status":"ok","dryRun":true}
```
**Logs:**
```
[LOG] [TenantRetentionService] DRY_RUN=true retentionDays=30
[LOG] [TenantRetention] No hay tenants expirados (cutoff=2026-08-03T23:52:56.239Z)
```

### Test 2: Tenant de prueba con `deletedAt` viejo
```sql
-- Insertar tenant soft-deleted hace 31 días
INSERT INTO tenants (id, name, "apiKeySecret", "currency", "taxRateDefault", active, "softDeleted", "deletedAt", "createdAt", "updatedAt")
VALUES (
  'test-retention-001', 'Test Retention', 'sk_test_retention_001_do_not_use',
  'PYG', 10, false, true,
  NOW() - INTERVAL '31 days',
  NOW() - INTERVAL '60 days',
  NOW() - INTERVAL '31 days'
);
```
```bash
curl -X POST -H "x-api-key: $MASTER_API_KEY" \
  http://localhost:3010/api/v1/tenants/retention/run
# Response: {"status":"ok","dryRun":true}
```
**Logs:**
```
[LOG]  [TenantRetentionService] DRY_RUN=true retentionDays=30
[WARN] [TenantRetentionService] 1 tenant(s) expiraron el periodo de 30 días
[WARN] [TenantRetentionService] PURGE tenantId=test-retention-001 subdomain=null deletedAt=2026-08-02T23:54:33.048Z
[WARN] [TenantRetentionService] DRY-RUN activo (TENANT_HARD_DELETE_DRY_RUN != 'false'). No se ejecuta delete físico.
```

✅ **Verificado:** el servicio detecta el tenant expirado, loguea el PURGE con todos los datos, pero NO ejecuta el `prisma.tenant.delete()` físico ni la limpieza de DNS ni el audit log (correcto en DRY-RUN).

### Test 3: Seguridad del endpoint
```bash
curl -X POST -H "x-api-key: sk_invalid_xxx" \
  http://localhost:3010/api/v1/tenants/retention/run
# Response: HTTP 401 Unauthorized
```
✅ El endpoint rechaza requests sin autenticación válida (cualquier API key que no sea master key válida → no `isSuperAdmin`).

### Limpieza
```sql
DELETE FROM tenants WHERE id = 'test-retention-001';
```

---

## Estado final del job

- **Cron activo:** todos los días a las 03:00 (hora de Asunción, UTC-4)
- **DRY-RUN:** activado por defecto (`TENANT_HARD_DELETE_DRY_RUN=true` en `.env`)
- **Borrado físico:** DESHABILITADO hasta que se cambie explícitamente a `false`
- **Para activar el borrado real:**
  ```bash
  # Hetzner
  sed -i 's/^TENANT_HARD_DELETE_DRY_RUN=true$/TENANT_HARD_DELETE_DRY_RUN=false/' /srv/orderflow/.env
  cd /srv/orderflow && docker compose -f docker-compose.prod.yml restart backend
  ```

---

## Verificación post-deploy

| Check | Resultado |
|---|---|
| Backend health endpoint | `{"status":"error",...}` por timeout de Odoo adapter (no relacionado) |
| Variable `TENANT_HARD_DELETE_DRY_RUN` en contenedor | ✅ `true` |
| `TenantRetentionService` cargado en módulo | ✅ Provider registrado en `dist/src/tenants/tenants.module.js` |
| Endpoint manual accesible | ✅ HTTP 200 con master key, 401 sin auth |
| Logs del servicio | ✅ Aparecen con tag `[TenantRetentionService]` |

---

## Pendiente

1. **Aplicar en Provecchio** (cuando se decida):
   - `git pull` del repo
   - `echo "TENANT_HARD_DELETE_DRY_RUN=true" >> .env.prod`
   - Reconstruir imagen y recreate contenedor
   - Validar endpoint manual con master key de Provecchio

2. **Fase 7 — Sprint 1:** migrar los 14 servicios de riesgo ALTO (`products`, `orders`, `customers`, `bookings`, etc.) de `this.prisma` a `@TenantPrisma()`. Plan completo en `docs/audits/audit-this-prisma-usage-2026-09-02.md`.

3. **Reparar 14 tests jest pre-existentes** (biolinks, quotations, purchases, webhook-event) — no introducidos por este plan, reparar en sprint aparte.

---

## Comando de rollback

Si algo falla, restaurar el commit anterior:
```bash
ssh hetzner-orderflow "cd /srv/orderflow && git reset --hard 07dde39e && docker compose -f docker-compose.prod.yml up -d --force-recreate backend"
```
(El compose ya no tendrá la variable `TENANT_HARD_DELETE_DRY_RUN`, pero el servicio la toma como DRY-RUN por defecto, así que no hay riesgo de borrado accidental).
