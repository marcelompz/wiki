# Plan de Implementación — Sprint v1.11.0 / v1.12.0

**Fecha:** 4 de agosto de 2026  
**Base:** `main` (v1.10.0)  
**Objetivo:** Ejecutar los pendientes de alta y media prioridad del ROADMAP hasta llegar a estado pre-v2.0.0.

---

## 1. Alcance y exclusiones

### Incluido (alta/media prioridad)
- Frontend: base de pruebas unitarias Vitest + RTL
- Odoo: facturación `account.move` + cola durable
- FacturaSend: finalización Odoo addon, odoo-adapter plugin, webhook receiver, frontend admin, cron retry + SIFEN polling
- UX/UI: One-Page Checkout Express, navegación móvil adaptativa, transformación de tablas admin a tarjetas responsive, SuperAdmin tenant switcher flotante
- Backoffice: refactor dashboard multi-columna
- Testing: aumentar cobertura backend a 80%

### Excluido (baja prioridad / depende de ≥10 clientes)
- Publicación App Store / Google Play
- v2.0.0 Kubernetes / Helm / autoscaling / DB-per-tenant / Redis Cluster / Service Mesh / multi-región

---

## 2. Hitos y secuenciación

| Hito | Fecha objetivo | Entregas |
|------|----------------|----------|
| **v1.11.0** | +2 semanas | Odoo facturación + cola durable, FacturaSend completado, base pruebas frontend |
| **v1.12.0** | +4 semanas | UX/UI mobile checkout + navegación + tablas responsive + tenant switcher táctil + dashboard multi-columna |
| **v1.13.0** | +6 semanas | Testing backend 80%, FacturaSend E2E Playwright, mejoras finales |

---

## 3. Sprint v1.11.0 — Odoo + FacturaSend + Testing Frontend

### 3.1 Odoo: facturación `account.move` + cola durable

**Objetivo:** sincronizar facturas entre Odoo 19 CE y OrderFlow con reintentos.

**Cambios en Odoo addon (`odoo19CE/addons/orderflow_connector/`):**
- Agregar listener en `account.move` (post) que publique `invoice.created` / `invoice.paid` en la cola.
- Usar la misma cola/worker existente o reintroducir un worker durable con `python-celery` o cola Redis.

**Cambios en `odoo-adapter`:**
- Consumir eventos de factura y mapear a `ElectronicDocument` en OrderFlow.
- Reintentos exponenciales y dead-letter queue.

**Cambios en backend (`backend/src/integrations/facturasend/`):**
- Extender `FacturasendService` con método `emitFromInvoicePayload`.
- Crear `InvoiceSyncService` que escuche eventos de factura y delegue a FacturaSend.

**Schema:**
- Verificar que `ElectronicDocument` soporta tipo `INVOICE` y estado `paid`.

**Criterios de aceptación:**
- `account.move` en Odoo genera `ElectronicDocument` en OrderFlow.
- Si el worker falla, reintenta 3 veces y luego entra a DLQ.
- No se pierden facturas ante caídas del adaptador.

### 3.2 FacturaSend: completar tramos pendientes

**Odoo addon:**
- Webhook `sale-order-confirmed` con tax breakdown.
- Plugin `facturasend-invoice`.

**Backend:**
- `FacturasendController.webhook`: recibir estados DE desde FacturaSend.
- `FacturasendService`: método `syncStatus` + polling SIFEN.
- `CronService`: reintentos cada 5 minutos para DE fallidas.

**Frontend admin:**
- Ruta `/admin/facturasend` con tabs: Config, Emitir, Documentos, Webhook.
- Tabla de DE con filtros y detalle XML/KuDE/PDF.

**E2E Playwright:**
- Validar ruta `/admin/facturasend` HTTP 200, cero errores JS, cero 502/404.

**Criterios de aceptación:**
- DE emitida y consultada con estados `PENDING` → `ACCEPTED` / `REJECTED`.
- Frontend carga sin errores y permite configurar tenant.

### 3.3 Base de pruebas unitarias Frontend (Vitest + RTL)

**Objetivo:** tener un set inicial de tests de componentes y hooks críticos.

**Cambios en `frontend/`:**
- Instalar `vitest`, `@testing-library/react`, `jsdom`.
- Configurar `vitest.config.ts`.
- Agregar scripts en `package.json`: `test`, `test:ui`, `test:coverage`.

**Tests iniciales (mínimo viable):**
- Componentes: `AdminApp.tsx` render, `BrandingProvider`, formularios de login.
- Hooks: `useMultiTenant`, `useApi`.
- Páginas críticas: `whatsapp-catalog.tsx` render + filtros.

**Criterios de aceptación:**
- `npm run test` pasa en CI.
- Cobertura de componentes críticos > 60%.
- No romper build existente.

---

## 4. Sprint v1.12.0 — UX/UI Mobile + Backoffice Desktop

### 4.1 One-Page Checkout Express

**Cambios en frontend:**
- `whatsapp-checkout.tsx`: flujo one-page con geolocalización + autocompletado.
- Usar `navigator.geolocation` para zonas de entrega.
- Validación inline y submit en un solo paso.

**Backend:**
- Endpoint `/api/v1/public/catalog/checkout/express` valida stock, crea order y retorna `checkoutUrl` para pago.

**Criterios de aceptación:**
- Checkout completable en < 3 pasos desde catálogo WhatsApp.
- Validación de stock y zonas en tiempo real.

### 4.2 Navegación móvil adaptativa backoffice

**Cambios en frontend:**
- `AdminApp.tsx`: agregar `BottomNavigationBar` en breakpoint `< 768px`.
- Menú lateral se colapsa en bottom nav con iconos.
- Mantener filtros y acciones accesibles.

**Criterios de aceptación:**
- En mobile, navegación principal por bottom nav.
- No se pierden rutas ni breadcrumbs.

### 4.3 Transformación de tablas admin a tarjetas responsive

**Cambios en frontend:**
- Componente `ResponsiveCards`: recibe tabla y renderiza cards en mobile.
- Aplicar en `products.tsx`, `customers.tsx`, `bookings.tsx`.
- Mantener vista tabla en desktop.

**Criterios de aceptación:**
- En mobile, tablas se transforman en cards sin pérdida de información.
- En desktop, se mantiene tabla con orden y filtros.

### 4.4 SuperAdmin tenant switcher flotante táctil

**Cambios en frontend:**
- `super-admin-dashboard.tsx`: agregar FAB (Floating Action Button) para switcher de tenants.
- Al hacer clic, modal con búsqueda y selector de tenant.
- Estilo táctil: hit area ≥ 44px, sin hover-dependent interactions.

**Criterios de aceptación:**
- Switcher accesible en mobile sin scroll horizontal.
- Cambio de tenant reflejado en datos y branding.

### 4.5 Refactor dashboard multi-columna

**Cambios en frontend:**
- `dashboard.tsx`: rediseñar layout en 3 columnas en desktop (stats, activity, quick actions).
- En mobile, apilar verticalmente.

**Criterios de aceptación:**
- Mejora Lighthouse performance score en dashboard.
- No romper widgets existentes.

---

## 5. Sprint v1.13.0 — Testing Backend 80% + E2E FacturaSend + Mejoras finales

### 5.1 Cobertura backend a 80%

**Plan de acción:**
- Identificar módulos con menor cobertura con `jest --coverage`.
- Agregar specs faltantes priorizando: `orders`, `billing`, `integrations`, `bookings`, `products`.
- Cubrir escenarios: errores, validaciones, transacciones, mocks.

**Criterios de aceptación:**
- `jest --coverage` reporta ≥ 80% en líneas, ramas, funciones.
- `./scripts/init.sh` pasa con nuevos tests.

### 5.2 E2E Playwright FacturaSend

**Rutas a cubrir:**
- `/admin/facturasend/config`
- `/admin/facturasend/documents`
- `/admin/facturasend/webhook`

**Criterios de aceptación:**
- Playwright pasa por todas las rutas sin errores JS ni HTTP 4xx/5xx.
- Incluido en `scripts/qa_e2e_check.py`.

### 5.3 Mejoras finales

- Actualizar `docs/02-architecture.md` con nueva arquitectura post-v1.12.
- Sincronizar wiki (`/opt/wiki/orderflow/`) con docs nuevas.
- Bump de versión a v1.13.0 y tag.

---

## 6. Estimación por tarea

| Tarea | Complejidad | Esfuerzo (días) |
|-------|-------------|-----------------|
| Odoo facturación + cola durable | Alta | 3 |
| FacturaSend completado | Media | 2 |
| Base pruebas frontend | Media | 2 |
| One-Page Checkout Express | Alta | 2 |
| Navegación móvil backoffice | Media | 1 |
| Tablas → Cards responsive | Media | 2 |
| Tenant switcher flotante | Baja | 1 |
| Dashboard multi-columna | Baja | 1 |
| Testing backend 80% | Alta | 3 |
| E2E FacturaSend + docs | Baja | 1 |

**Total:** ~18 días hombre

---

## 7. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Odoo addon requiere cambios en producción | Alto | Probar primero en staging; feature flag en addon. |
| Cola durable introduce latencia | Medio | Medir P95 antes/después; usar Redis como broker rápido. |
| Vitest rompe build existente | Medio | Configurar en modo `include` parcial primero. |
| Cambios UI afectan performance | Medio | Medir Lighthouse antes y después; code splitting. |

---

## 8. Próximos pasos

1. Asignar `v1.11.0` a desarrollador backend para Odoo + FacturaSend.
2. Asignar `v1.11.0` a desarrollador frontend para base de pruebas Vitest.
3. Crear ramas: `feat/v1.11.0-odoo-invoicing`, `feat/v1.11.0-facturasend-final`, `feat/v1.11.0-frontend-tests`.
4. Ejecutar `./scripts/init.sh` antes y después de cada sprint.
5. Al finalizar sprint: sync wiki, actualizar `featurelist.json`, tag y push.
