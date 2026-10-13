# Decisiones Pendientes — Plan Comercial OmniFlow v1.24.02

> **Documento vivo** para resolver las decisiones que bloquean el inicio del Sprint A (motor comercial).
> Origen: [OmniFlow_Plan_Comercial_v1.md PARTE I](OmniFlow_Plan_Comercial_v1.md#parte-i).
> Cada decisión se firma individualmente con fecha y autor. Marcar con ✅ cuando esté resuelta.

---

## Resumen ejecutivo

| # | Decisión | Estado | Bloquea | Recomendación |
|---|----------|--------|--------|----------------|
| 1 | Precios finales USD/PYG por plan + add-ons prioritarios | ✅ Resuelta | Sprint A (seeding de planes) | Matriz inicial sugerida (Starter $39, Pro $179, Ent $549) + **CRUD admin de precios** |
| 2 | Trial: 14 días con tarjeta | ✅ Resuelta | Sprint A (flujo de checkout) | 14 días con tarjeta |
| 3 | Prioridad de go-to-market | ✅ Resuelta | Plan de marketing Fase 1 | Tenant shared primero, BioLinks como gancho de entrada |
| 4 | Tier dedicated día 1: self-service vs asistido | ✅ Resuelta | Diseño UX del wizard | Asistido (consultivo) con provisioning semi-automatizado |
| 5 | Oferta Early Access: % y duración | ✅ Resuelta | Landing page | 30% off primeros 3 meses (cupón `EARLY30`) |
| 6 | Pasarela por mercado | ✅ Resuelta | Sprint A (integración) | Pagopar PY + Stripe/MP resto |
| 7 | FEAT-112: cierre antes de Sprint A o excepción temporal | ✅ Resuelta | **TODO el plan comercial** | Cerrar en sprint 0 (1-2 días) |

**Leyenda:** ✅ Resuelta · 🟢 Aceptada · 🟡 Pendiente · 🔴 Crítico/bloqueante

---

## ADR-001: Precios finales por plan

**Fecha:** 2026-09-03
**Estado:** ✅ Resuelta (2026-09-03)
**Bloquea:** Sprint A (no se pueden seedear `SubscriptionPlan` sin precios)
**Owner:** Finanzas + Producto
**Decisión final:**
- Se acepta la **Opción A** como matriz de precios inicial (Starter $39, Professional $179, Enterprise $549 USD).
- Multiplicador PYG se calculará desde `CurrencyService` con la tasa del día.
- Anual: 17% off (sugerido).
- **Requisito nuevo (FEAT-120):** el SuperAdmin debe poder **modificar los precios de los planes y add-ons** desde el panel admin (CRUD sobre `SubscriptionPlan` y `SubscriptionAddon`). Esto es crítico para poder ajustar pricing sin redeploy.
- Setup fee de Enterprise: $999–$2.499 (rango aprobado por dirección).

**Impacto técnico:**
- FEAT-120 (nuevo): CRUD admin de planes/add-ons → entra en **Sprint B** junto con el portal del cliente
- Seed inicial con precios hardcodeados en Sprint A, antes de exponer nada al público
- `SubscriptionPlan.price` editable vía endpoint `PATCH /api/v1/admin/subscription-plans/:id` (SuperAdmin only)

---

## ADR-002: Política de trial

**Fecha:** 2026-09-03
**Estado:** ✅ Resuelta (2026-09-03)
**Bloquea:** Sprint A (flujo de checkout con captura de tarjeta)
**Owner:** Producto + Finanzas
**Decisión final:** **Opción A: 14 días con tarjeta**. Captura de tarjeta obligatoria, cobro al día 15 si no cancela. Mayor conversión esperada (25-40%) y menor riesgo de fraude vs trial sin tarjeta.

---

## ADR-003: Prioridad de go-to-market

**Fecha:** 2026-09-03
**Estado:** ✅ Resuelta (2026-09-03)
**Bloquea:** Plan de marketing Fase 1 (Soft Launch)
**Owner:** Producto + Comercial
**Decisión final:** **Opción A+B en paralelo, con foco en A.** ERP completo (Tenant shared) es el producto principal por ARPU y lock-in. BioLinks/Bookings funcionan como gancho de bajo costo para descubir OmniFlow y luego upgradear. La página de pricing debe mostrar ambos claramente, pero el outreach apunta primero a Tenant shared.

---

## ADR-004: Tier dedicated en el día 1

**Fecha:** 2026-09-03
**Estado:** ✅ Resuelta (2026-09-03)
**Bloquea:** Diseño UX del wizard + decisión sobre `ProvisioningJob.requiresHuman`
**Owner:** Producto + Infraestructura
**Decisión final:** **Opción A: Asistido en el día 1.** El wizard oculta el botón "DB dedicada" detrás de un "Contactar ventas" con SLA 24-48h. FEAT-114 (ProvisioningWorker) automatiza el provisioning en Sprint A; hasta entonces, equipo de OrderFlow hace el setup manual usando `provision-orderflow-company.sh`.

---

## ADR-005: Oferta Early Access

**Fecha:** 2026-09-03
**Estado:** ✅ Resuelta (2026-09-03)
**Bloquea:** Landing page de Fase 1
**Owner:** Comercial + Marketing
**Decisión final:** **Opción B: 30% off los primeros 3 meses** con cupón `EARLY30`. Aplica solo a planes nuevos durante el soft launch (4 semanas). Mensaje: "Estás entre los primeros 50 clientes. Precio Early Access por 3 meses, después se cobra tarifa estándar."

---

## ADR-006: Pasarelas de pago por mercado

**Fecha:** 2026-09-03
**Estado:** ✅ Resuelta (2026-09-03)
**Bloquea:** Sprint A (integración de webhooks)
**Owner:** Finanzas + Producto
**Decisión final:** Tabla por mercado confirmada:
- **Paraguay (PY)** → **Pagopar** (comisión baja, bancos locales, ya implementado)
- **Resto LATAM** → **Mercado Pago** (cobertura amplia, ya implementado)
- **USA/Europa** → **Stripe** (estándar internacional, ya implementado)

Implementación: `PaymentOrchestrator.getGatewayForMarket(country)` con webhooks idempotentes en las 3 pasarelas. UI de checkout muestra la pasarela según país detectado.

---

## ADR-007: FEAT-112 — Cerrar `POST /api/v1/tenants` (BLOQUEANTE)

**Fecha:** 2026-09-03
**Estado:** ✅ Resuelta (2026-09-03)
**Bloquea:** **TODO el plan comercial** (sin esto no se puede exponer nada al público)
**Owner:** Backend Lead
**Decisión final:** **Opción A: Cerrar FEAT-112 como Sprint 0** (1-2 días), antes de empezar Sprint A. Es trabajo de bajo riesgo y alto valor. Se rechaza la excepción temporal.

**Trabajo concreto:**
- Agregar `@UseGuards(ApiKeyGuard)` + `PermissionsGuard` a `POST /api/v1/tenants`
- Permitir solo requests que incluyan un `provisioningJobId` válido y `paid: true` (o `isSuperAdmin` para uso interno)
- Actualizar tests del controller

**Criterio de aceptación:**
- [ ] `POST /api/v1/tenants` rechaza requests sin `isSuperAdmin` o sin `provisioningJobId` válido
- [ ] Test E2E que valida que un request sin auth devuelve 401/403
- [ ] Documentado en `docs/troubleshooting/` si se rompe algún flujo existente

---

## Cómo firmar una decisión

Cuando se resuelve una decisión, actualizar este documento con:

```markdown
### ADR-NNN: [Título] ✅ RESUELTA

**Fecha resolución:** YYYY-MM-DD
**Decisión final:** [texto corto]
**Aprobado por:** [nombre/rol]
**Impacto en el plan:** [cambios necesarios en código o docs]
```

Y commitear con mensaje `docs(comercial): resolver ADR-NNN`.

---

## Historial de cambios

| Fecha | Cambio |
|-------|--------|
| 2026-09-03 | Creación del documento con 7 ADRs pendientes |
| 2026-09-03 | **7 ADRs resueltas** — matriz inicial de precios + FEAT-120 (CRUD admin de precios), trial 14d con tarjeta, GTM Tenant shared + BioLinks, dedicated asistido, Early Access 30% off, Pagopar/MP/Stripe por mercado, FEAT-112 en Sprint 0 |
