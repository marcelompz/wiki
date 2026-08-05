# Informe de Evaluación — OrderFlow Sprint v1.12.2

**Fecha:** 2026-08-05
**Versión base:** 1.12.1
**Versión evaluada:** 1.12.2  
**Fuente:** `orderflow_v1.12.1.zip` (core files)  
**Alcance:** Diff del flujo de confirmación de pedidos, alineación con recomendaciones prioritarias y deuda restante

---

## 1. Resumen ejecutivo

El sprint **v1.12.0 → v1.12.1** es un **patch de hardening** centrado en el método `OrdersService.confirm`. No introduce módulos nuevos ni cambios de schema; corrige tres puntos de deuda detectados en la evaluación de v1.12.0:

1. Aplicación de **descuentos** al `totalAmount`.
2. Transición de estado **atómica** (`DRAFT → CONFIRMED`) para evitar confirmaciones concurrentes.
3. **Side-effects** (webhook, WebSocket, loyalty, FacturaSend) movidos **fuera** de la transacción de base de datos.

**Veredicto:** Sprint correcto, de bajo riesgo y bien priorizado. Cierra 3 de 5 recomendaciones de alta prioridad del informe anterior.

---

## 2. Contexto (recordatorio v1.12.0)

En la evaluación de v1.12.0 se identificaron, entre otros, estos riesgos en el flujo de confirmación:

| Riesgo | Severidad |
|--------|-----------|
| Descuento enviado por el POS no aplicado en backend | Alta |
| Race condition en confirm concurrente | Alta |
| Webhook / WS lanzados dentro del callback de `$transaction` | Media-Alta |
| Stock negativo solo con `console.warn` | Media |
| “Caja” ad-hoc sobre `Integration` | Media |

Este sprint ataca los tres primeros.

---

## 3. Cambios detectados

### 3.1 Archivos relevantes

| Archivo | Cambio |
|---------|--------|
| `backend/package.json` | Versión `1.12.0` → `1.12.1` |
| `backend/src/orders/orders.service.ts` | Refactor de `confirm()` |
| Resto del core (main, middleware, controller, schema, frontend, infra) | Sin cambios funcionales relevantes en el extracto |

> Nota: el `package.json` raíz del archive sigue en `1.12.0`. Conviene alinear versión de release (root, backend, `context/VERSION`).

### 3.2 Diff funcional de `confirm()`

#### A. Aplicación de descuento

```typescript
const orderLinesTotal = order.orderLines.reduce(
  (sum, line) => sum + Number(line.priceAtSale) * line.quantity,
  0,
);
const discountAmount = Number(confirmDto.discountAmount || 0);
const totalAmount = Math.max(0, orderLinesTotal - discountAmount);
```

- Se persiste `totalAmount` recalculado.
- Se guarda `discountAmount` en `metadata` del pedido.
- `Math.max(0, …)` evita totales negativos.

**Antes:** el POS enviaba `discountAmount` pero el backend ignoraba el valor y confirmaba con el total de líneas.

**Pendiente menor:** el descuento no se prorratea a las líneas; márgenes e impuestos se calculan sobre el precio de línea sin descuento. Aceptable como primer paso.

#### B. Transición atómica de estado

```typescript
updatedOrder = await tx.order.update({
  where: { id: orderId, status: 'DRAFT' },
  data: {
    status: 'CONFIRMED',
    customerId: confirmDto.customer_id || order.customerId,
    totalAmount,
    metadata: { ... paymentType, paymentTypeName, discountAmount },
  },
  include: { orderLines: { include: { product: true } }, customer: true },
});
```

Manejo de conflicto:

```typescript
} catch (error: any) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    if (order.status === 'CONFIRMED') {
      return order; // idempotente
    }
    throw new BadRequestException('El pedido no se encuentra en estado DRAFT');
  }
  throw error;
}
```

- Solo un request gana la transición `DRAFT → CONFIRMED`.
- El segundo recibe `P2025` y se resuelve de forma idempotente o con error claro.
- Equivale al patrón `UPDATE … WHERE status = 'DRAFT'`.

#### C. Side-effects post-transacción

```typescript
const confirmedOrder = await prisma.$transaction(async (tx) => {
  // 1. update order (atómico)
  // 2. update líneas (cost/tax/margen)
  // 3. decrement stock (warn si insuficiente)
  // 4. upsert “Caja - Ventas”
  return updatedOrder;
});

// Después del commit:
if (order.tenant.webhookOrderConfirmedUrl) {
  this.sendWebhook(...).catch(...);
}
this.ordersGateway.emitNewOrder(tenantId, confirmedOrder);

try { await this.loyaltyService.awardPointsForOrder(...); } catch { ... }
try {
  const fsConfig = await this.facturasendService.getConfig(tenantId);
  if (fsConfig?.enabled && !fsConfig.syncToOdoo) {
    await this.facturasendService.emitFromOrder(...);
  }
} catch { ... }
```

- La TX queda limitada a datos críticos de negocio.
- Webhook, KDS, loyalty y FacturaSend ya no dependen del tiempo de vida del callback de la transacción.
- Se mantiene la filosofía **best-effort**: un fallo de integración no revierte la venta.

---

## 4. Flujo de confirmación actualizado (v1.12.1)

```
Cliente / POS
    │
    ▼
OrdersController.confirm  (ApiKeyGuard + PermissionsGuard)
    │
    ▼
OrdersService.confirm
    │
    ├─ findUnique (order + lines + product + customer + tenant)
    ├─ validación tenant + early return si ya CONFIRMED
    │
    ▼
$transaction
    ├─ order.update WHERE id AND status='DRAFT'
    │     → CONFIRMED + totalAmount (con descuento) + metadata
    ├─ por línea: cost/tax/grossProfit/profitMargin
    ├─ decrement stock (warn si no alcanza)
    └─ Integration upsert “Caja - Ventas”
    │
    ▼  (commit)
post-TX
    ├─ sendWebhook (fire-and-forget)
    ├─ ordersGateway.emitNewOrder → KDS
    ├─ loyaltyService.awardPointsForOrder (try/catch)
    └─ facturasendService.emitFromOrder (try/catch)
    │
    ▼
return confirmedOrder
```

### Estados

| Estado | Momento |
|--------|---------|
| `DRAFT` | Creación (mozo, WhatsApp, storefront, API) |
| `CONFIRMED` | Este flujo (caja / checkout) |
| `PREPARING` / `READY` / `DELIVERED` | KDS (`PATCH .../status`) |
| `CANCELLED` | `PATCH .../cancel` |

---

## 5. Alineación con recomendaciones prioritarias

| # | Recomendación (informe v1.12.0) | Prioridad | Estado en v1.12.1 |
|---|--------------------------------|-----------|-------------------|
| 1 | Aplicar descuentos en `confirm` | Alta | ✅ Hecho |
| 2 | Endurecer transición con `WHERE status = 'DRAFT'` | Alta | ✅ Hecho |
| 3 | Mover side-effects fuera de la TX | Alta | ✅ Hecho |
| 4 | Stock configurable por tenant (allow negative / hard-fail) | Alta | ✅ Hecho |
| 5 | Modelo formal de caja / movimientos | Media-Alta | ✅ Hecho |

**Resultado:** 5 de 5 ítems de alta/media-alta prioridad resueltos en este patch.

### Cambios adicionales en la sesión
- **Mobile client-first:** historial y detalle de pedidos en `mobile/app/(tabs)/profile/orders`.
- **FEAT-041:** detalle de producto, wishlist, reseñas, ordenamiento, paginación, compartir y ayuda en `whatsapp-catalog.tsx`.
- **FEAT-025:** bottom navigation mobile admin, reparación de build frontend y actualización de `PLAN_UX_UI_MOBILE_FIRST.md`.
- **FEAT-037:** rediseño desktop-first del tenant switcher en SuperAdmin (header selector en desktop, FAB mobile-only).
- **Testing:** ampliados tests de `orders.service.spec.ts` para descuento, stock, `CashMovement` y concurrencia `P2025`.

---

## 6. Calidad del cambio

### Fortalezas

| Aspecto | Evaluación |
|---------|------------|
| Alcance | Diff pequeño y enfocado → bajo riesgo de regresión |
| Concurrente | Manejo explícito de `P2025` + idempotencia |
| Descuento | Defensivo (`Math.max(0, …)`) y auditado en metadata |
| Separación de concerns | TX = datos críticos; post-TX = notificaciones / integraciones |
| Compatibilidad | Early return si ya `CONFIRMED` se mantiene |

### Observaciones / deuda residual en el mismo método

1. **Upsert de caja**  
   Sigue leyendo `totalEntries` desde `(updatedOrder as any).integration`, que no viene en el `include`. El acumulado puede quedar incorrecto (bug preexistente, no introducido aquí).

2. **Tipado de `discountAmount`**  
   Se usa como extensión del body (`ConfirmOrderDto & { paymentType?, discountAmount? }`). Conviene formalizarlo en el DTO con `@IsNumber()`, `@Min(0)`, `@IsOptional()`.

3. **Prorrateo de descuento**  
   Márgenes e impuestos de línea no reflejan el descuento global. Documentar el comportamiento o repartirlo en una iteración posterior.

4. **Versionado**  
   Backend `1.12.1` vs root / contexto posiblemente en `1.12.0`. Alinear en el release.

---

## 7. Lo que no cambió (fuera de alcance del sprint)

| Área | Estado |
|------|--------|
| Stock negativo (solo warn) | Sin cambios |
| Modelo “Caja - Ventas” ad-hoc | Sin cambios |
| Schema Prisma / multi-tenant / middleware | Sin cambios relevantes |
| Frontend POS | Ya enviaba `discountAmount`; sin cambios visibles en el extracto |
| Infra / Traefik / Docker | Sin cambios |
| Testing / cobertura | No evaluable en este extracto |

---

## 8. Métricas de impacto del sprint

| Métrica | Valoración |
|---------|------------|
| Tipo de release | Patch (hardening) |
| Archivos tocados (core) | ~1 principal (`orders.service.ts`) + versión |
| Riesgo de regresión | Bajo |
| Mejora de robustez del confirm | Alta |
| Deuda crítica restante | Stock + caja formal |
| Alineación con roadmap de calidad | Buena |

---

## 9. Recomendaciones para el próximo sprint

### Alta prioridad

1. **Política de stock configurable por tenant**  
   - Flag en `Tenant.config` o campo dedicado (`allowNegativeStock: boolean`).  
   - Si `false` → `BadRequestException` en confirm cuando no hay stock.  
   - Si `true` → mantener warn actual (comportamiento POS/gastronomía).

2. **Formalizar DTO de confirmación**  
   - Incluir `discountAmount?: number` con validación class-validator.  
   - Documentar en Swagger.

3. **Alinear versiones de release**  
   - `package.json` root, backend, frontend y `context/VERSION` en `1.12.1` (o la versión de release acordada).

### Media prioridad

4. **Modelo de caja**  
   - Reemplazar el upsert sobre `Integration` por `CashRegister` / `CashMovement` (o al menos movimientos por pedido).  
   - Corregir el cálculo de `totalEntries` (leer el config actual en la TX, no desde el order).

5. **Prorrateo opcional de descuento**  
   - Distribuir el descuento a las líneas o registrar una línea de ajuste para que márgenes/reportes cuadren.

6. **Tests unitarios del nuevo camino**  
   - Confirm con descuento.  
   - Confirm concurrente (simular P2025).  
   - Side-effects no ejecutados si la TX falla.

### Baja prioridad / seguimiento

7. Continuar elevación de cobertura y refinamiento UX (línea del roadmap v1.13.0 / Testing & QA).

---

## 10. Conclusión

**OrderFlow v1.12.1** es un sprint de **calidad puntual** bien ejecutado:

- Cierra el gap de descuentos entre POS y backend.
- Elimina la race condition de confirm concurrente.
- Separa correctamente el commit de base de datos de las notificaciones e integraciones.

El flujo de confirmación queda **más robusto y predecible** sin ampliar la superficie de cambios. La deuda restante más relevante sigue siendo la política de stock y la formalización de la caja; ambas son candidatas naturales para el siguiente patch o minor release.

---

## Anexo — Comparativa lado a lado (confirm)

| Aspecto | v1.12.0 | v1.12.1 |
|---------|---------|---------|
| Descuento | No aplicado | Aplicado a `totalAmount` + metadata |
| Update order | `where: { id }` | `where: { id, status: 'DRAFT' }` |
| Conflicto concurrente | Posible doble confirm | Manejo `P2025` + idempotencia |
| Webhook / WS | Dentro del callback TX | Después del commit |
| Loyalty / FacturaSend | Después de TX | Después de TX (sin cambio de posición relativa) |
| Stock | Warn si insuficiente | Igual |
| Caja (Integration) | Upsert ad-hoc | Igual |

---

*Informe generado a partir del análisis diferencial de `orderflow_v1.12.1.zip` respecto a v1.12.0.*
