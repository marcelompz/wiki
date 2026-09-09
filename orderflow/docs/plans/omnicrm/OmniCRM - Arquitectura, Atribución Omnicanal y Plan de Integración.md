# **OmniCRM: Arquitectura, Atribución Omnicanal y Plan de Integración con OmniFlow**

# **1\. Resumen Ejecutivo y Propósito Arquitectónico**

OmniCRM se posiciona dentro del ecosistema OmniFlow como un módulo desacoplado de inteligencia comercial, atribución y CRM diseñado específicamente para los sectores de gastronomía y retail, basándose en el modelo validado en Provecchio. Su propósito fundamental es resolver la desconexión crítica que existe entre los esfuerzos de marketing digital (ejecutados en Meta Ads, Google Ads y Google Search Console) y las conversiones que ocurren físicamente en el mostrador o sistemas de Punto de Venta (POS).

La arquitectura propuesta introduce una capa de ingesta de marketing robusta combinada con un motor de resolución de identidad (Identity Stitching). Esto permite realizar un cálculo determinístico del Retorno de la Inversión Publicitaria (ROAS) real, cerrando el bucle de datos mediante la retroalimentación automática hacia Meta CAPI y Google Offline Conversions.

# **2\. Ingesta de Datos de Adquisición Digital**

El sistema implementa conectores específicos para las principales plataformas de adquisición de tráfico y leads:

* **Meta Marketing API:** Utiliza la Graph API (endpoint `/insights`) para extraer métricas de rendimiento a nivel de campañas, adsets y anuncios, incluyendo gasto (spend), impresiones, clics y CTR. Se prioriza la captura de parámetros `fbclid` y el identificador de clic de WhatsApp `ctwa_clid`.  
* **Google Ads API:** Implementación vía v17+ (REST/gRPC) para la extracción de métricas de búsqueda y display. Captura y vinculación de parámetros de seguimiento como `gclid`, `wbraid` y `gbraid`.  
* **Google Search Console API & GA4 Data API:** Extracción de datos orgánicos mediante `searchanalytics.query` para monitorear clics, impresiones, posición media y consultas clave vinculadas al dominio (provecchio.com). Estos datos se enriquecen con eventos específicos provenientes de la API de GA4 para una visión holística del comportamiento del usuario.

# **3\. Modelo de Atribución y Cruce con Ventas Físicas (POS)**

Para garantizar la precisión en el reporte de ingresos, se aplican cuatro estrategias de atribución:

* **Estrategia A: Atribución Determinística por Lead, Reserva o Pedido Web:** Captura exhaustiva de UTMs, `gclid` y `fbclid` en el frontend y en OmniCatalog. Estos datos persisten a través del ciclo de vida de la transacción hasta el cierre del ticket en el sistema central.  
* **Estrategia B: Ventas Directas vía WhatsApp:** Integración con Click-to-WhatsApp Ads. Se utiliza la metadata de referencia (referral metadata) a través de la WhatsApp Cloud API, cruzándola directamente con el número de teléfono del cliente registrado en la comanda del POS.  
* **Estrategia C: Cupones y Códigos QR Dinámicos:** Seguimiento de incentivos digitales escaneados físicamente en el mostrador o caja, vinculando la oferta digital con la transacción presencial.  
* **Estrategia D: Correlación Macro y Marketing Mix Modeling (MMM):** Análisis de tendencias para tráfico orgánico mediante la comparación de datos de Search Console contra el flujo horario y diario de emisión de tickets, identificando patrones de influencia indirecta.

# **4\. Retroalimentación hacia Plataformas Publicitarias (Offline Conversions)**

Una vez validada la conversión física, OmniCRM actúa como un orquestador de datos hacia las plataformas publicitarias para optimizar los algoritmos de puja:

* **Meta Conversions API (CAPI):** Envío de eventos "Purchase" basados en la transacción real del POS. Incluye el valor exacto del ticket, la moneda (PYG) y datos de identidad del cliente hasheados mediante SHA256 (email y teléfono) para garantizar la privacidad y mejorar la tasa de emparejamiento (Match Rate).  
* **Google Ads Offline Conversion Import:** Ejecución de subidas de transacciones validadas en salón utilizando Enhanced Conversions for Leads, permitiendo a Google Ads atribuir la conversión a un clic previo.

# **5\. Esquema de Datos Relacional de OmniCRM (PostgreSQL)**

La persistencia de datos se organiza en un esquema relacional diseñado para el análisis de alta performance:

| Tabla | Descripción | Claves Principales / Índices |
| :---- | :---- | :---- |
| `crm_customers` | Perfil unificado del cliente con datos de identidad. | `customer_id` (PK), `phone_hash`, `email_hash` |
| `crm_touchpoints` | Registro de interacciones digitales (clics, UTMs, clids). | `touchpoint_id` (PK), `fbclid`, `gclid` |
| `crm_pos_orders` | Datos de transacciones importados desde OmniFlow. | `order_id` (PK), `total_amount`, `timestamp` |
| `crm_attributions` | Tabla de cruce que vincula touchpoints con órdenes. | `attribution_id` (PK), `fk_order`, `fk_touchpoint` |
| `crm_daily_marketing_metrics` | Agregados diarios de gasto y rendimiento por canal. | `date` (PK), `channel`, `total_spend` |

Los índices se configuran específicamente sobre los hashes de contacto y los identificadores de clics para optimizar las consultas de resolución de identidad.

# **6\. Diagrama de Flujo de Datos y Eventos**

El flujo operativo de OmniCRM se define en los siguientes pasos:

1. **Interacción Digital:** El usuario interactúa con un anuncio o búsqueda (Meta/Google).  
2. **Captura de Señal:** OmniCRM registra el `touchpoint` y el identificador de clic (`fbclid`/`gclid`) junto con los datos del `lead` o la sesión.  
3. **Venta POS:** Se genera una transacción en el sistema de ventas físico de OmniFlow.  
4. **Lógica de Atribución:** El motor de OmniCRM busca coincidencias entre el teléfono/email del ticket y los `touchpoints` previos.  
5. **Cierre de ROAS:** Se calcula el valor de conversión real.  
6. **Bucle de Feedback:** El sistema envía la señal de conversión procesada a Meta CAPI y Google Ads.

## **Conclusiones y Roadmap de Implementación**

La implementación de este plan de integración permitirá a los usuarios de OmniFlow pasar de una visión basada en métricas vanidosas (clics) a una gestión basada en ingresos reales (Revenue). El roadmap inicia con la configuración de la ingesta de Meta API, seguido de la integración del esquema de tablas en PostgreSQL, finalizando con la automatización del envío de conversiones offline.

# **7\. Motor de Reglas de Seguimiento y Retención (Follow-Up Rules \- /admin/follow-up-rules)**

El motor de reglas automatiza la interacción posventa para maximizar la rentabilidad del cliente:

* **Propósito e integración con provecchio.com/admin/follow-up-rules:** Automatizar la interacción posventa posterior al cierre del ticket en OmniFlow POS para maximizar la tasa de recompra, el LTV y reducir el CAC publicitario.  
* **Tipos de reglas configurables:**  
  * **1\. Feedback & Reseñas inmediatas:** Disparo de encuesta NPS y solicitud de reseña en Google Maps / Local Guides a las 2 horas de liquidar la comanda en POS.  
  * **2\. Prevención de Churn (Re-engagement):** Mensaje automático vía WhatsApp a los 21 o 30 días sin visitas al restaurante con incentivo de retorno (ej. copa de bienvenida o postre de cortesía).  
  * **3\. Seguimiento a Clientes de Alto Valor (VIP):** Alertas y atenciones automáticas cuando un cliente supera cierto umbral de gasto acumulado en salón.  
  * **4\. Reactivación de Leads Publicitarios:** Si un usuario interactuó con un anuncio de Meta o reserva web pero no asistió, seguimiento personalizado de reactivación.  
* **Bucle de retroalimentación con la atribución:** Cada recompra generada por una regla de follow-up se marca como 'retention\_followup', permitiendo a OmniCRM calcular el LTV incremental atribuible al motor de retención vs. inversión inicial en adquisición.

Fecha de revisión técnica: Date  
Responsable de arquitectura: Person