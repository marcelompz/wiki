Actúa como Tech Lead y Desarrollador Full-Stack Senior en el ecosistema OmniFlow / OmniCatalog.

### Objetivo:
Implementar el motor de control de accesos, cuotas y características (Feature Flags / Plan Limiting Engine) dentro de **OmniCatalog** para gestionar los planes SaaS: **Básico ($5/mes)**, **Profesional ($12/mes)** y **Enterprise / Sync ($29/mes)**.

### Matriz de Features a Configurar:

1. **Plan Básico ($5 USD/mes):**
   - `max_products`: 50
   - `max_images_per_product`: 1
   - `inventory_management`: false (sin control de stock interno)
   - `discount_coupons`: false
   - `minimum_order_amount`: false
   - `online_checkout`: false (solo envío de pedido formateado a WhatsApp)
   - `erp_sync_enabled`: false
   - `analytics_pixels`: false

2. **Plan Profesional ($12 USD/mes):**
   - `max_products`: 200
   - `max_images_per_product`: 4
   - `inventory_management`: true (stock por producto/variante, editor masivo y alertas de quiebre de stock)
   - `discount_coupons`: true
   - `minimum_order_amount`: true
   - `online_checkout`: true (básico / pasarelas estándar)
   - `erp_sync_enabled`: false (solo importación/exportación CSV/Excel)
   - `analytics_pixels`: false

3. **Plan Enterprise / Sync ($29 USD/mes):**
   - `max_products`: Infinity (ilimitado)
   - `max_images_per_product`: 6 (galería HD)
   - `inventory_management`: true (multi-sucursal y multi-depósito)
   - `discount_coupons`: true
   - `minimum_order_amount`: true
   - `online_checkout`: true (pasarelas avanzadas + split de pagos)
   - `erp_sync_enabled`: true (conectores activos para Odoo, SAP Business One, MIDA y API personalizada)
   - `analytics_pixels`: true (Meta Pixel, Google Analytics 4, TikTok Pixel)

---

### Requerimientos Técnicos:

1. **Middleware / Service Layer de Verificación (`PlanGuard` / `QuotaService`):**
   - Crear validaciones a nivel backend (API/GraphQL) que intercepten mutaciones críticas:
     * Carga de nuevos productos (bloqueo HTTP 403 con código `PLAN_QUOTA_EXCEEDED` si supera el límite).
     * Subida de imágenes adicionales por producto.
     * Activación de conectores ERP (solo si `erp_sync_enabled === true`).
     * Creación de cupones de descuento y reglas de compra mínima.

2. **Esquema de Base de Datos / Configuración de Tenants:**
   - Diseñar o extender el modelo `TenantSubscription` para almacenar `current_plan`, `features_override` (para excepciones manuales) y contadores de uso en caché rápida (Redis o DB).

3. **Feedback en UI/UX (Frontend):**
   - Componente reutilizable `<FeatureGate feature="..." />` o hook `usePlanFeature(featureKey)` para deshabilitar botones u ocultar pantallas con un banner de *Upgrade to Pro/Enterprise*.
   - Medidores visuales de uso en el Dashboard (ej. "38 de 50 productos utilizados").

Por favor, entrega:
- Definición de tipos/interfaces (`PlanConfig`, `PlanFeatureKey`).
- Implementación del servicio de validación de cuotas (`QuotaValidatorService`).
- Ejemplo de middleware en el router para proteger la creación de productos y la conexión al ERP.
- Componente/Hook frontend para bloqueo visual y llamadas a upgrade.