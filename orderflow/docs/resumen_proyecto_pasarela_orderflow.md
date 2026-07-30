# Proyecto OrderFlow: Pasarela de Pagos y Orquestación de Transacciones

## 1. Resumen Ejecutivo y Objetivos del Proyecto

**OrderFlow** es una plataforma integral de pasarela de pagos y orquestación de transacciones diseñada para simplificar, asegurar y optimizar el procesamiento de pagos para comercios y plataformas digitales. El proyecto combina un motor de flujo de órdenes en tiempo real con capacidades multi-adquirente, gestión de suscripciones, motor antifraude integrativo y conciliación contable automatizada.

### Objetivos Principales
* **Orquestación Inteligente de Pagos:** Rutear transacciones de manera dinámica entre múltiples adquirentes y procesadores para maximizar la tasa de aprobación (*Authorization Rate*) y minimizar costos.
* **Experiencia Developer-First:** Proveer APIs RESTful/GraphQL, SDKs (Python, Node.js, PHP, Mobile) y componentes de checkout incrustables (*Hosted Fields* / *iFrames*) con mínimo impacto de alcance PCI-DSS.
* **Cumplimiento Normativo Integrado:** Diseñado bajo los estándares de la **Resolución N° 25/2025 del BCP** (Proveedores de Servicios de Pago - PSP), estándares **PCI-DSS Level 1** y normativas de prevención de lavado de activos de la **SEPRELAD**.
* **Gestión de Riesgo y Fraude:** Integración de reglas de puntuación de riesgo en tiempo real, validación de huella digital del dispositivo (*device fingerprinting*) y soporte para 3D Secure 2.0 (3DS2).

---

## 2. Arquitectura Tecnológica y Componentes

La arquitectura adopta un enfoque de **Microservicios Guiados por Eventos (Event-Driven Architecture)** para garantizar alta disponibilidad, baja latencia y aislamiento de fallos.

```
                  +-----------------------------------+
                  |   Comercio / App Cliente / Web    |
                  +-----------------------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |    API Gateway & Rate Limiter     |
                  +-----------------------------------+
                                    |
          +-------------------------+-------------------------+
          |                         |                         |
          v                         v                         v
+-------------------+     +-------------------+     +-------------------+
|  Order Engine     |     | Payment Engine    |     | Merchant Portal   |
| (Gestión Ordenes) |     | (Procesamiento)   |     | (Dashboard UI)    |
+-------------------+     +-------------------+     +-------------------+
          |                         |                         |
          +-------------------------+-------------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |  Event Bus (Kafka / RabbitMQ)     |
                  +-----------------------------------+
                                    |
     +-----------------+------------+------------+-----------------+
     |                 |                         |                 |
     v                 v                         v                 v
+----------+    +--------------+          +--------------+   +-------------+
| Risk &   |    | Vault /      |          | Ledger &     |   | Webhook &   |
| Fraud    |    | Tokenizer    |          | Reconcile    |   | Notice      |
+----------+    +--------------+          +--------------+   +-------------+
                       |                         |
                       v                         v
               +---------------+         +---------------+
               |  Adquirentes  |         | Bancos /      |
               |  / Redes      |         | SIPAP         |
               +---------------+         +---------------+
```

### Componentes Clave

1. **API Gateway & Edge Protection:**
   * Control de tráfico, autenticación vía API Keys / JWT, restricción por IP y protección contra ataques DDoS y *rate limiting* por comercio.
2. **Order & Payment Engine (Orquestador):**
   * Mantiene el ciclo de vida de la orden (`created`, `processing`, `authorized`, `captured`, `failed`, `refunded`).
   * Aplica enrutamiento inteligente según tarjeta, banco emisor, tasa de comisión y salud de la red del adquirente.
3. **Vault / Tokenizador Seguro (PCI-DSS Zone):**
   * Ambiente aislado (Cardholder Data Environment - CDE) encargado de tokenizar PANs (Primary Account Numbers) y almacenar datos sensibles de tarjetas mediante cifrado AES-256 en HSM/KMS.
4. **Risk & Fraud Engine:**
   * Evaluación de riesgo previa a la autorización. Verificación de listas negras, patrones de comportamiento, geolocalización IP y velocidad de intentos de pago.
5. **Ledger & Reconciliation Engine (Libro Mayor):**
   * Sistema de contabilidad en partida doble que registra cada movimiento de fondos, comisiones del sistema, retenciones impositivas y saldos de comercios para asegurar la segregación absoluta de fondos.
6. **Webhook & Notification System:**
   * Motor resiliente de entrega de eventos a comercios con políticas de reintento exponencial (*exponential backoff*) y firmas criptográficas (HMAC-SHA256).

---

## 3. Flujo Operativo de la Transacción (OrderFlow Pipeline)

1. **Iniciación de la Orden:**
   * El comercio invoca `/v1/orders` enviando monto, moneda, referencia interna y datos del cliente. OrderFlow responde con un `order_id` y un token de checkout.
2. **Captura de Datos de Pago:**
   * El cliente final completa el formulario de pago renderizado mediante el SDK de OrderFlow (Hosted Fields). Los datos de la tarjeta viajan directamente al Vault de OrderFlow sin tocar los servidores del comercio.
3. **Análisis de Riesgo y Prevención de Fraude:**
   * Se ejecuta el motor de reglas de riesgo. Si se requiere, se dispara el desafío 3DS2 con el banco emisor.
4. **Enrutamiento y Autorización:**
   * Se selecciona la mejor pasarela/adquirente disponible y se transmite la solicitud de autorización.
5. **Registro en Libro Mayor (Ledger):**
   * Si es exitoso, se registran los asientos contables correspondientes (monto bruto, comisión pasarela, comisión adquirente, retención fiscal y saldo neto a abonar al comercio).
6. **Notificación síncrona y asíncrona:**
   * Se responde la transacción a la interfaz del usuario y se despacha un evento webhook `order.payment_succeeded` firmado hacia el servidor del comercio.

---

## 4. Marco Regulatorio, Seguridad y Cumplimiento

### A. Normativa Banco Central del Paraguay (Resolución N° 25/2025 PSP)
* **Inscripción Registro PSP:** Requisito formal de registro institucional ante la Superintendencia de Bancos/BCP.
* **Segregación de Fondos:** Los fondos de liquidación de comercios se mantienen en cuentas de recaudación exclusivas en entidades bancarias de plaza, completamente separadas del patrimonio de OrderFlow.
* **Sistema de Gestión de Seguridad de la Información (SGSI):** Implementación de controles proporcionales bajo lineamientos de ISO/IEC 27001.

### B. PCI-DSS Compliance
* Alcance minimizado mediante el uso exclusivo de **iFrames / Hosted Fields**.
* Cifrado en tránsito (TLS 1.3) y en reposo (AES-256-GCM) para todo dato financiero y personal (PII).

### C. Prevención de Lavado de Dinero (SEPRELAD)
* Monitoreo automatizado de montos y patrones inusuales.
* Registro KYC (*Know Your Customer*) para la alta de comercios (RUC, representantes legales, declaración de origen de fondos).

---

## 5. Plan de Implementación y Roadmap

| Fase | Duración Estimada | Hitos Principales |
| :--- | :--- | :--- |
| **Fase 1: Core Architecture & Vault** | Mes 1 - 2 | Diseño de base de datos, API Gateway, Vault de Tokenización y SDK de Checkout. |
| **Fase 2: Integraciones & Order Engine** | Mes 3 - 4 | Integración con 2 adquirentes locales principales, motor de órdenes y sistema de Webhooks. |
| **Fase 3: Ledger, Fraud & Risk** | Mes 5 | Libro mayor de partida doble, motor de reglas antifraude y módulo de reconciliación SIPAP. |
| **Fase 4: Portal Comercio & Analytics** | Mes 6 | Dashboard web para comercios (métricas, liquidaciones, gestión de API Keys y disputas). |
| **Fase 5: Certificación & Go-Live** | Mes 7 | Auditoría externa ISO 27001 / PCI-DSS, trámite de registro BCP y salida a producción. |

---

## 6. Métricas Clave de Rendimiento (KPIs)

* **Uptime del Sistema:** Target $\ge 99.99\%$ de disponibilidad global.
* **Latencia de API:** $< 200\text{ ms}$ para procesamiento directo y $< 1.5\text{ s}$ acumulado con respuesta del adquirente.
* **Tasa de Éxito de Pagos:** Target $> 88\%$ de transacciones legítimas aprobadas.
* **Tasa de Contracargos (Chargebacks):** Mantener $< 0.5\%$ del volumen total procesado.
