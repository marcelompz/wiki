# Plan de Maduración — OrderFlow v1.1.0 → v1.2.0

## Objetivo

Cerrar los 3 gaps de madurez más impactantes identificados en el [análisis del estado del arte](file:///home/marcelompz/.gemini/antigravity-ide/brain/9de142ac-8759-4c17-b0ca-a3e240ee8c54/estado_del_arte_analisis.md):

1. **Testing** — Agregar service specs faltantes + controller specs faltantes (~+40 tests)
2. **RBAC** — Proteger los 4 controllers que deberían tener permisos granulares
3. **Documentación** — Sincronizar ROADMAP, featurelist.json y métricas con la realidad v1.1.0

---

## Fase 1: Service Specs Faltantes (~+35 tests)

5 services carecen de tests unitarios:

### [NEW] `backups.service.spec.ts`
- `triggerManualBackup()` — instala mock de Prisma y exec, valida flujo feliz y error sin config
- `testConnection()` — mock de ssh2-sftp-client, valida conexión exitosa y fallida
- `scheduleDynamicBackups()` — valida creación de cron jobs dinámicos
- **~7 tests estimados**

### [NEW] `billing.service.spec.ts`
- `getSubscriptionStatus()` — tenant válido, tenant no encontrado
- `createOrUpdateSubscription()` — actualización de plan, tenant inexistente
- `processWebhookEvent()` — Stripe checkout.session.completed, MercadoPago payment approved, gateway desconocido, tenant no encontrado
- `getMrrArrMetrics()` — cálculo MRR/ARR con mix de planes
- **~10 tests estimados**

### [NEW] `marketplace.service.spec.ts`
- `getMarketplacePlugins()` — retorna catálogo
- `installPlugin()` — instalación exitosa, plugin no encontrado, plugin ya instalado, tenant no encontrado
- `registerPlugin()` — registro exitoso, ID duplicado
- **~7 tests estimados**

### [NEW] `notifications.service.spec.ts`
- `registerToken()` — upsert exitoso
- `sendPush()` — envío con tokens encontrados, sin tokens, chunking >100
- **~5 tests estimados**

### [NEW] `product-imports.controller.spec.ts`
- Controller spec con mocks del service (listSuppliers, createSupplier, listJobs, runJob)
- **~6 tests estimados**

---

## Fase 2: RBAC en Controllers Restantes

4 controllers que **deberían** tener permisos granulares pero no los tienen:

| Controller | Permisos propuestos | Notas |
|------------|---------------------|-------|
| [analytics.controller.ts](file:///opt/orderflow/backend/src/analytics/analytics.controller.ts) | `analytics:read` en `@Get('summary')` | Datos sensibles de revenue |
| [backups.controller.ts](file:///opt/orderflow/backend/src/backups/backups.controller.ts) | `backups:trigger` en POST trigger, `backups:manage` en POST test-connection | Operación crítica |
| [notifications.controller.ts](file:///opt/orderflow/backend/src/notifications/notifications.controller.ts) | `notifications:register` y `notifications:send` | Ya tiene JwtAuthGuard + ApiKeyGuard; agregar granularidad |
| [whatsapp-catalog.controller.ts](file:///opt/orderflow/backend/src/whatsapp-catalog/whatsapp-catalog.controller.ts) | `whatsapp-catalog:read` en GET config | Endpoint público-ish pero con ApiKeyGuard |

> [!NOTE]
> Los controllers de `auth`, `health`, `metrics`, `tenants` y los `public-*` controllers son **intencionalmente** sin RBAC (endpoints públicos o con auth propia).

---

## Fase 3: Sincronización de Documentación

### [MODIFY] [ROADMAP.md](file:///opt/orderflow/ROADMAP.md)

1. **Sección "Sprint Actual" (L259-312)**: Marcar como `[x]` las tareas que ya están completadas (L307-311: `isolationTier`, `TenantConnectionManager`, `auth-shared`, `giveaways-standalone`, `whatsapp-catalog-standalone`)
2. **Métricas (L315-329)**: Actualizar a 348 tests / 45 suites, 16+ módulos, 6 microservicios standalone
3. **Deudas Técnicas (L372-399)**: Actualizar estados de:
   - E2E Playwright: ⏳ → ✅ Hecho (14 tests)
   - Carga continua k6: ⏳ → ✅ Integrado en CI
   - Seguridad enterprise: Parcial → ✅ RBAC en 15/18 controllers
   - Multi-Tier Isolation: ⏳ → ✅ Completado v0.7.0
   - Microservicios standalone: ⏳ → ✅ 6 microservicios listos
   - Billing SaaS: ⏳ → ✅ Completado v0.7.0
   - Marketplace / Plugin SDK: ⏳ → ✅ Completado v0.8.0
   - White-label: ⏳ → ✅ Completado v0.8.0
   - MIDA/SAP: ⏳ → ✅ Completado v0.8.0
   - i18n: ⚠️ → ✅ Completado v0.8.0 (ES/EN/PT)
   - Odoo variantes/inventario: ⚠️ → ✅ Variantes e inventario completados
4. **Rol OWNER (L41)**: Corregir a `ADMIN, MANAGER, SELLER, VIEWER`

### [MODIFY] [featurelist.json](file:///opt/orderflow/featurelist.json)
- Actualizar `version` de `1.0.0` → `1.1.0`
- Actualizar `last_updated` a `2026-07-27`

---

## Fase 4: Validación Integral

```bash
./scripts/init.sh
```

- ✅ Compilación limpia NestJS
- ✅ Generación cliente Prisma
- ✅ 100% unit tests passing (~388+ tests)
- ✅ Compilación limpia frontend

---

## Verificación de Impacto

| Métrica | Antes (v1.1.0) | Después (v1.2.0-dev) |
|---------|----------------|----------------------|
| Tests backend | 348 / 45 suites | **~388 / 50 suites** |
| Services sin spec | 5 | **0** |
| Controllers sin spec | 2 | **0** (product-imports agregado) |
| RBAC coverage | 15/18 controllers | **19/22** (4 intencionales) |
| ROADMAP inconsistencias | 8 issues | **0** |
| featurelist.json version | 1.0.0 | **1.1.0** |

> [!IMPORTANT]
> Este plan **no incluye** tests unitarios de frontend (sigue siendo el gap más largo de resolver y requiere configurar Jest + React Testing Library en el frontend, lo cual es un sprint dedicado). Se enfoca en maximizar impacto con mínimo riesgo.
