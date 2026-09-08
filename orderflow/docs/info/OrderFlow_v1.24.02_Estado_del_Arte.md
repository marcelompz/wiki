# Estado del Arte — OrderFlow/OmniFlow v1.24.02

**Fecha:** 2026-09-03
**Versión actual:** v1.24.02
**Marca pública:** OmniFlow
**Capa técnica interna:** OrderFlow
**Entornos operativos:** Hetzner (production) + Provecchio (staging/local production)

---

## 1. Resumen Ejecutivo

OrderFlow v1.24.02 es una plataforma SaaS multi-tenant madura con **microservicios standalone extraídos** (8 servicios independientes), **aislamiento multi-tier** (DB shared/dedicated), **integración Odoo** (versiones 14, 18 y 19 CE) y un **plan de blindaje de producción cerrado** (Fases 1-6 de 7).

**Hito destacado de este release:**
- **TenantRetentionService** (job cron diario, DRY-RUN por defecto) para cumplimiento de la ventana de retención de 30 días antes del hard-delete físico de tenants
- Cierre de las vulnerabilidades críticas arquitectónicas: `prisma db push --accept-data-loss`, hard-delete de Tenant sin soft-delete, y fuga multi-tier
- Endpoint manual de retención para validación en staging (`POST /api/v1/tenants/retention/run`)

---

## 2. Stack Tecnológico Vigente

| Capa | Tecnología | Versión |
|------|------------|---------|
| Backend | NestJS + Prisma | Node 22, Prisma 5.22 |
| Frontend | React 18 + Vite + Refine + Ant Design 5 | TS 5.x |
| Mobile | React Native + Expo | TS, Zustand |
| Database | PostgreSQL | 15 |
| Cache/Queue | Redis + BullMQ | 7.x |
| Proxy | Traefik v3.4 | Exclusivo (sin Nginx) |
| Observabilidad | Sentry + Winston + Prometheus + Grafana + Loki + Tempo | — |

---

## 3. Módulos Core Production-Ready

| Módulo | Estado | Standalone | Puerto | Notas |
|--------|--------|------------|--------|-------|
| **Auth & Multi-Tenant** | ✅ | — | — | JWT + API Key, JWT decodifica `tenantId` |
| **Tenants & Multi-Tier** | ✅ | — | — | `isolationTier: shared | dedicated`, soft-delete + retention 30d |
| **Products & Inventory** | ✅ | — | — | Variantes, atributos, Kardex atómico, PMP |
| **Orders & POS** | ✅ | — | — | WebSockets, KDS, cobro centralizado Mozo/Caja |
| **Customers & Contacts** | ✅ | — | — | Backfill `contactId` |
| **Bookings (Spa)** | ✅ | ✅ `:3023` | turnos.* | Comisiones, disponibilidad doble transaccional |
| **Quotations (B2B)** | ✅ | ✅ `:3024` | presupuestos.* | DNIT/SET, descuentos volumen |
| **Loyalty** | ✅ | ✅ `:3025` | fidelizacion.* | Tarjetas, tiers BRONZE→PLATINUM |
| **Giveaways** | ✅ | ✅ `:3020` | sorteos.* | Google OAuth |
| **WhatsApp Catalog** | ✅ | ✅ `:3021` | catalogo.* | Modificadores, GPS, plantillas |
| **BioLinks** | ✅ | ✅ `:3022` | bio.* | 0% comisión, In-Bio Fast Checkout |
| **OmniVector** | ✅ | ✅ `:3029` | vector.* | Editor SVG con IA Gemini |
| **OmniSites** | ✅ | ✅ `:3030` | sites.* | Diseñador web drag-and-drop con IA |
| **Storefront Builder** | 🔄 Planning | ⏳ `:3026` | — | Diseñador Drag & Drop |
| **OmniBI Analytics** | ✅ | ✅ `:3027` | — | Ingesta Odoo 14, comparativo YoY |
| **Homepage Builder** | ✅ | — | — | Marca blanca, persistencia JSON |
| **Social Catalog (Multi-instancia)** | ✅ | — | — | `instanceKey`, OmniCatalog |
| **QR Generator** | ✅ | — | — | Catálogo, producto, biolink, vCard, WiFi |
| **HR (Empleados/Asistencia)** | ✅ | — | — | Scan QR, asistencia |
| **BI (OmniFlow)** | ✅ | — | — | Analytics Hub (FEAT-071) |
| **Documents + Collabora** | ✅ | — | — | WOPI, locking Redis, visor |
| **Purchases (OC + Factura Proveedor)** | ✅ | — | — | Kardex, PMP, flujo caja |
| **Multi-Currency Engine** | ✅ | — | — | BCP/CambiosChaco/DolarApi, LRU |
| **Integrations (Odoo 14/18/19)** | ✅ | — | — | Webhooks, wizard pull, addons |
| **Deploy Manager** | ✅ | — | — | Wizard 1-Click Odoo en `/admin/deploy` |
| **Traefik + Cloudflare DNS** | ✅ | — | — | v3.4, sin Nginx |

**Total microservicios standalone production-ready:** 8 (giveaways, whatsapp-catalog, biolinks, bookings, quotations, loyalty, omnivector, omnisites)

---

## 4. Blindaje de Producción — Cumplimiento

Plan: [docs/planes/PLAN_BLINDAJE_ORDERFLOW.md](planes/PLAN_BLINDAJE_ORDERFLOW.md)

| Vulnerabilidad | Estado | Solución |
|---|---|---|
| `prisma db push --accept-data-loss` en entrypoint | ✅ Cerrado | `entrypoint.sh` y `deploy-production.sh` usan `prisma migrate deploy` |
| Hard Delete accidental de Tenant | ✅ Cerrado | `DELETE /:id` → soft delete; `POST /:id/restore`; ventana 30d |
| Job de retención 30 días | ✅ Cerrado | `TenantRetentionService` con cron `0 3 * * *` (America/Asuncion), DRY-RUN por defecto |
| Endpoint manual de retención | ✅ Cerrado | `POST /api/v1/tenants/retention/run` (SuperAdmin) |
| Auditoría `this.prisma` vs `@TenantPrisma()` | ✅ Cerrado | Inventario completo: 77 vs 16, plan priorizado |
| Migración a `@TenantPrisma()` | 🟡 Pendiente | Plan en `docs/audits/audit-this-prisma-usage-2026-09-02.md`, Sprint 1 (14 archivos alto riesgo) |

---

## 5. Métricas de Calidad

| Métrica | Valor | Notas |
|---------|-------|-------|
| Tests unitarios | 681 / 695 ✅ | 14 fallos pre-existentes (biolinks, quotations, purchases, webhook-event) — no introducidos por v1.24.02 |
| E2E Playwright | ✅ Pasa | Catálogo público, admin, login DB, 7 secciones admin |
| Build Backend | ✅ Sin errores | NestJS + tsc |
| Build Frontend | ✅ Sin errores | Vite + tsc |
| Builds Docker prod | ✅ | `docker-compose.prod.yml` |
| Servicios backend activos | 28 módulos | Cargados vía `modulesRegistry` |
| Despliegues validados | 2/2 | Hetzner (production) + Provecchio (staging/local) |

---

## 6. Despliegues Activos

| Entorno | Host | Rol | Versión | URL Pública |
|---------|------|-----|---------|-------------|
| **Hetzner** | hetzner-orderflow | production | v1.24.02 | `pesallaccia.com`, `*.pesallaccia.com` |
| **Provecchio** | dimoraserverlocal | staging/local | v1.24.02 | `provecchio.com`, `staging.provecchio.com` |
| Staging Hetzner | — | staging | v1.24.02 | `staging.pesallaccia.com` |

**Variable crítica activada en ambos:**
```bash
TENANT_HARD_DELETE_DRY_RUN=true
```

---

## 7. Documentación Sincronizada

- [VERSION](../VERSION): `1.24.02`
- [CHANGELOG.md](../CHANGELOG.md): entrada `[1.24.02] - 2026-09-02` completa
- [ROADMAP.md](../ROADMAP.md): actualizado a v1.24.02
- [backend/src/main.ts](../backend/src/main.ts): Swagger version `1.24.02`
- [backend/package.json](../backend/package.json): `1.24.02`
- [frontend/package.json](../frontend/package.json): `1.24.02`
- [docs/00-contexto-agentes.md](00-contexto-agentes.md): v1.20.24 (desactualizado, falta sync a v1.24.02)

---

## 8. Pendientes para v1.25.0

### Sprint 1 — Multi-Tier Isolation (Fase 7)
Migrar los 14 servicios de **riesgo ALTO** de `this.prisma` → `@TenantPrisma()`:
- `products.service.ts`, `orders.service.ts`, `customers.controller.ts`
- `bookings.service.ts`, `contacts.service.ts`, `biolinks.service.ts`
- `loyalty.service.ts`, `giveaways.service.ts`, `qr.service.ts`
- `inventory.service.ts`, `social-catalog.service.ts`, `tags.service.ts`
- `ribbons.service.ts`, `catalog.service.ts`

### Sprint 2 — Tests Pre-existentes
Reparar 14 tests jest fallidos en:
- `biolinks/biolinks.controller.spec.ts` (faltan deps en RootTestModule)
- `quotations/quotations.service.spec.ts` (B2B conversion signature drift)
- `purchases/purchases.service.spec.ts` (prisma undefined)
- `events/listeners/webhook-event.listener.spec.ts` (prisma undefined)

### Sprint 3 — Documentación
- Sincronizar `docs/00-contexto-agentes.md` a v1.24.02
- Actualizar `docs/architecture/tenant-subdomain-standard.md` si hay cambios
- Generar `INFORME_MADUREZ_OMNIFLOW_v1.24.02.md` (siguiente en la serie)

---

## 9. Riesgos Conocidos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| 77 servicios aún con `this.prisma` (fuga multi-tier) | 🟡 Media | Plan priorizado en docs/audits/, Sprint 1 planificado |
| 14 tests jest pre-existentes fallando | 🟡 Media | No bloqueante, reparar en sprint aparte |
| Odoo no desplegado en Provecchio actualmente | 🟢 Baja | Solo afecta health endpoint, no bloquea el flujo principal |
| `omnibi-standalone` en crash loop | 🟢 Baja | Endpoint público de BioLink funciona vía backend principal |
| Cron `ApiKeyRotationSchedulerService` warning | 🟢 Baja | Warning no bloqueante, provider no-static |

---

## 10. Próximo Release

**v1.25.0 (Fase 7 Sprint 1)** — Migración de los 14 servicios de riesgo ALTO a `@TenantPrisma()` con tests de regresión por servicio.

ETA: por definir tras priorización de la Fase 7.
