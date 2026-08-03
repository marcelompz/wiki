# 🎯 Plan de Sprint v1.9.0 — Calidad, Integración y Evolución

**Versión de Origen:** v1.8.0  
**Objetivo:** v1.9.0  
**Foco del Sprint:** Pagar deuda técnica crítica en frontend, finalizar integraciones clave y evolucionar la arquitectura de microservicios.

---

## 1. Resumen Ejecutivo

Basado en el [Informe de Madurez v1.8.0](INFORME_MADUREZ_ORDERFLOW.md), este sprint se enfoca en tres pilares estratégicos para preparar a OrderFlow para la fase v2.0.0 (Kubernetes). Abordaremos las áreas con mayor deuda técnica y potencial de crecimiento.

---

## 2. Prioridades Estratégicas del Sprint

### 🔴 Prioridad 1: Establecer una Base Sólida de Pruebas Unitarias en el Frontend

**Justificación:** El informe de madurez identifica la falta de pruebas unitarias en el frontend como el principal punto débil en la calidad del producto. Abordar esto es crucial para prevenir regresiones y garantizar una experiencia de usuario estable.

**Tareas Clave:**
-   **[FEAT-1.1] Configurar el Entorno de Pruebas:**
    -   Instalar y configurar `Vitest` o `Jest` con `React Testing Library` en el proyecto `frontend/`.
    -   Configurar scripts en `package.json` (`test`, `test:watch`, `test:coverage`).
    -   Establecer un pipeline en GitHub Actions para ejecutar los tests del frontend en cada PR.
-   **[FEAT-1.2] Pruebas para Componentes Críticos:**
    -   Escribir pruebas unitarias para el componente de `Checkout` (`/pages/checkout.tsx`), validando cálculos de totales, descuentos y envío.
    -   Crear pruebas para componentes del `POS` (`/pages/admin/pos.tsx`), simulando la adición de productos al carrito y el cierre de ventas.
    -   Probar la lógica del `BrandingProvider` para asegurar la correcta resolución de tenants por subdominio.
-   **[FEAT-1.3] Establecer Línea Base de Cobertura:**
    -   Generar el primer reporte de cobertura.
    -   **Meta:** Alcanzar un 15-20% de cobertura inicial en los componentes críticos seleccionados.

---

### 🟠 Prioridad 2: Completar la Integración con Odoo (Facturación y Cola Durable)

**Justificación:** La sincronización con Odoo es una característica `Enterprise` clave. La falta de sincronización de facturas (`account.move`) y una cola de webhooks no durable son los dos gaps funcionales restantes.

**Tareas Clave:**
-   **[FEAT-2.1] Sincronización de Facturas (`account.move`):**
    -   Ampliar el `odoo-adapter` para manejar la creación y actualización de facturas en Odoo cuando un pedido se marca como pagado en OrderFlow.
    -   Investigar el mapeo de impuestos y líneas de factura entre OrderFlow y Odoo.
-   **[FEAT-2.2] Implementar Cola de Webhooks Durable:**
    -   **Opción A (BullMQ + Redis):** Integrar BullMQ para encolar los webhooks salientes hacia Odoo. Esto proporciona persistencia, reintentos automáticos con backoff exponencial y un dashboard de monitoreo.
    -   **Opción B (DB-based Queue):** Crear una tabla simple `WebhookQueue` en Prisma para encolar los trabajos. Un cron job (`@Cron`) se encargaría de procesar la cola y reintentar en caso de fallo.
    -   **Decisión:** Iniciar con la Opción B por ser más rápida de implementar y no introducir nuevas dependencias pesadas, con miras a migrar a BullMQ en v2.0.0.
-   **[FEAT-2.3] Pruebas de Integración:**
    -   Crear pruebas unitarias en el `integrations.service.spec.ts` que simulen fallos de red y verifiquen que los reintentos se encolan correctamente.

---

### 🟡 Prioridad 3: Profundizar la Funcionalidad de los Microservicios

**Justificación:** Con la infraestructura de microservicios ya establecida, el siguiente paso es agregarles más valor y autonomía para fortalecer su oferta como productos `standalone`.

**Tareas Clave:**
-   **[FEAT-3.1] Investigación: Pasarelas de Pago Autónomas:**
    -   Analizar la viabilidad de que microservicios como `biolinks-standalone` o `whatsapp-catalog-standalone` tengan su propia integración con Stripe/Mercado Pago, sin depender del `BillingModule` del monolito.
    -   Diseñar el flujo de configuración de credenciales de pago por tenant para un microservicio específico.
-   **[FEAT-3.2] Diseño: Microservicio de Notificaciones Avanzadas:**
    -   Diseñar la arquitectura de un nuevo microservicio (`notifications-standalone`) que centralice el envío de emails, SMS y notificaciones push.
    -   El objetivo es que otros servicios (monolito y microservicios) se comuniquen con él a través de eventos en Redis Pub/Sub o llamadas API directas.
-   **[FEAT-3.3] Refactorización de un Módulo Existente:**
    -   Seleccionar un módulo (ej. `Giveaways`) y realizar una auditoría de su acoplamiento con el core.
    -   Refactorizar cualquier dependencia restante para que funcione de forma 100% independiente, listo para ser vendido como un producto Micro-SaaS.

---

## 4. Criterios de Aceptación del Sprint

-   La suite de pruebas del frontend se ejecuta exitosamente en CI.
-   Un pedido pagado en OrderFlow genera una factura borrador en Odoo.
-   Un webhook fallido a Odoo se reintenta al menos 3 veces antes de ser marcado como fallido.
-   Se entrega un documento de diseño para el microservicio de notificaciones.
-   El `ROADMAP.md` es actualizado para reflejar los objetivos de la v1.9.0.