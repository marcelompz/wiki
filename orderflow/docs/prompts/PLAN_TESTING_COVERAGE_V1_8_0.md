# Plan de Aumento de Cobertura de Pruebas (v1.8.0)

**Última Actualización:** 2026-08-04
**Versión de Origen:** v1.7.0
**Objetivo:** v1.8.0+

## 1. Objetivo General

Elevar la cobertura de pruebas unitarias y de integración del backend de un estimado ~45% a un **objetivo del 70%**. Este sprint se enfoca exclusivamente en pagar deuda técnica para aumentar la estabilidad, confianza y mantenibilidad de la plataforma.

## 2. Estrategia

El foco principal estará en las **pruebas de servicio (`*.service.spec.ts`)**, ya que contienen la lógica de negocio más crítica y compleja. Se priorizarán los módulos que son centrales para la operación del SaaS y aquellos con interacciones complejas.

La estrategia se divide en tres frentes:
1.  **Servicios Core:** Asegurar que la lógica de negocio fundamental esté blindada.
2.  **Servicios de Integración:** Probar las interacciones con APIs externas (Odoo, FacturaSend).
3.  **Servicios Financieros:** Garantizar la precisión en los módulos de facturación y cotizaciones.

## 3. Módulos Prioritarios y Cobertura a Añadir

Se ha realizado un análisis de los módulos del backend para identificar las áreas con mayor necesidad de cobertura.

| Módulo de Servicio | Archivo | Prioridad | Justificación | Tests a Añadir (Estimado) |
|--------------------|---------|-----------|---------------|-----------------------------|
| **Órdenes** | `orders.service.ts` | 🔴 Alta | Lógica central del negocio (creación, confirmación, transiciones de estado). Crítico para POS/KDS. | `confirm()`, `updateStatus()`, `calculateTotals()`, manejo de errores de stock. |
| **Facturación (Billing)** | `billing.service.ts` | 🔴 Alta | Lógica de suscripciones, webhooks de pago (Stripe/MP), y cálculo de métricas (MRR/ARR). | `processWebhookEvent()` para todos los gateways y eventos, `createOrUpdateSubscription()` con cambios de plan. |
| **Contactos** | `contacts.service.ts` | 🟡 Media | Nuevo modelo unificado. Probar la creación/actualización de diferentes tipos (Customer, Supplier, User). | `create()`, `update()`, `findOrCreateFromSource()`, manejo de `parentId`. |
| **Integraciones** | `integrations.service.ts` | 🟡 Media | Lógica de sincronización con Odoo. Probar la resiliencia ante fallos del webhook. | `syncOrderToOdoo()`, `handleOdooWebhook()`, manejo de errores de conexión. |
| **Cotizaciones de Moneda** | `currency.service.ts` | 🟡 Media | Lógica compleja de chain de providers, cache (in-memory + DB) y fallbacks. | `getRate()` con fallos de providers, cache hits/misses, y uso de `currencyRateOverride`. |
| **Facturación Electrónica** | `facturasend.service.ts` | 🟡 Media | Aunque tiene 72 tests, se enfocarán en casos de borde: reintentos, timeouts, errores de mapeo. | `emitDocument()` con errores de API, `pollDocumentStatus()` para estados finales. |

## 4. Plan de Ejecución (Sprint v1.8.0)

1.  **Crear Archivos de Spec:** Para cualquier servicio que aún no tenga un archivo `*.spec.ts`, se creará la estructura base con mocks de dependencias (Prisma, otros servicios).
2.  **Implementar Pruebas Unitarias:** Se escribirán los casos de prueba para los escenarios de "camino feliz" (happy path) y los casos de error más comunes para cada función priorizada.
3.  **Mocks y Spies:** Se utilizará `jest.spyOn` y `jest.mock` para aislar el servicio bajo prueba y simular las respuestas de sus dependencias.
4.  **Ejecución Continua:** Se ejecutarán los tests continuamente (`npm run test -- --watch`) durante el desarrollo para asegurar que no se introduzcan regresiones.
5.  **Validación Final:** Antes de finalizar el sprint, se ejecutará el script `./scripts/init.sh` para validar que el 100% de la suite de pruebas (incluyendo los nuevos tests) pasa correctamente.

## 5. Métricas de Éxito

-   **Aumento del Conteo de Pruebas:** Incrementar el número total de tests del backend en al menos **+150 tests**.
-   **Reporte de Cobertura:** (Si se configura `jest --coverage`) alcanzar un `statements` y `branches` > 70% para los archivos modificados.
-   **`./scripts/init.sh` Pasa Exitosamente:** Cero regresiones en el build o en la suite de pruebas existente.

## 6. Estado Actual (v1.12.1)

- **OrdersService:** ampliado con tests para `confirm()` con descuento, stock configurable, `CashMovement` y manejo de concurrencia `P2025`.
- **Validación backend:** `npm run build` limpio y suite de orders pasa en `jest --runInBand`.
- **Pendiente:** elevar cobertura global al 70%+ y resolver errores preexistentes de build frontend en `MobileBottomNav.tsx`, `bookings.tsx`, `super-admin-dashboard.tsx` y `whatsapp-checkout.tsx`.