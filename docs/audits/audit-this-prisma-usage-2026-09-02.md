# Auditoría: `this.prisma` vs `@TenantPrisma()`

**Fecha:** 2026-09-02
**Script de auditoría:**
```bash
cd backend
grep -rln "this\.prisma\." src/ --include="*.ts" | grep -v ".spec.ts" | sort
grep -rln "@TenantPrisma" src/ --include="*.ts" | grep -v ".spec.ts" | sort
```

**Resultado:**
- **77 archivos** usan `this.prisma` (riesgo: leakage entre tenants con DB dedicada)
- **16 archivos** ya usan `@TenantPrisma()` (correctos para multi-tier)

---

## Clasificación por riesgo

### 🔴 Riesgo ALTO — Aislar inmediatamente (módulos de negocio con datos de tenant)
- `src/products/products.service.ts`
- `src/orders/orders.service.ts`
- `src/customers/customers.controller.ts`
- `src/bookings/services/bookings.service.ts`
- `src/contacts/contacts.service.ts`
- `src/biolinks/biolinks.service.ts`
- `src/loyalty/loyalty.service.ts`
- `src/giveaways/giveaways.service.ts`
- `src/qr/qr.service.ts`
- `src/inventory/inventory.service.ts`
- `src/social-catalog/social-catalog.service.ts`
- `src/tags/tags.service.ts`
- `src/ribbons/ribbons.service.ts`
- `src/catalog/catalog.service.ts`

### 🟡 Riesgo MEDIO — Módulos core / integraciones
- `src/auth/auth.service.ts`
- `src/billing/billing.service.ts`
- `src/billing/invoices.service.ts`
- `src/billing/subscription-plans.service.ts`
- `src/billing/subscriptions.service.ts`
- `src/hr/hr.service.ts`
- `src/notifications/notifications.service.ts`
- `src/marketplace/marketplace.service.ts`
- `src/users/services/users.service.ts`
- `src/users/services/user-tenant-access.service.ts`
- `src/system-modules/system-modules.service.ts`
- `src/follow-up/follow-up.service.ts`
- `src/backups/backups.service.ts`
- `src/integrations/*` (varios)

### 🟢 Riesgo BAJO — Admin, infra, guards, jobs
- `src/common/*` (guards, middleware, audit)
- `src/tenants/tenants.controller.ts` (es admin)
- `src/deploy-manager/*`
- `src/queues/*` (procesan jobs con `tenantId` explícito)
- `src/currency/*` (cron, no tocan datos de tenant)
- `src/events/*` (listeners)
- `src/health/*`

---

## Plan de migración gradual (Fase 7)

### Sprint 1 (inmediato) — Riesgo ALTO
Migrar los 14 servicios listados arriba, empezando por `products` y `orders` (los más críticos).

### Sprint 2 — Riesgo MEDIO
Los 14 archivos restantes con datos de tenant.

### Sprint 3 — Resto
Admin / infra / jobs que tocan datos con `tenantId` explícito en el `where`.

### Regla de lint/CI (post migración)
Agregar regla ESLint que prohíba `private readonly prisma: PrismaService` en servicios fuera de `common/`.

---

## Acción inmediata recomendada
1. **No bloquear** el desarrollo de features nuevas por esta migración
2. **Migrar primero** los servicios que **ya atienden tenants con DB dedicada** (enterprise)
3. **Agregar test de regresión** antes de cada migración: el `tenantId` resuelto debe ser el del JWT/API key, no el singleton
