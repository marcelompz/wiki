# **Master Prompt — Sprint 4: Consumidor de Negocio OmniCatalog, Herramientas de Catálogo y Conector Odoo**

**Objetivo:** Desarrollar el módulo de negocio `OmniCatalog` que consume `OmniMessaging Hub`, implementando las herramientas operativas de consulta de stock en tiempo real (Prisma \+ Odoo), generación de enlaces parametrizados e inyección de pedidos de venta al ERP con resiliencia en colas.

Actúa como Tech Lead & Desarrollador Senior Full-Stack en NestJS 10, Prisma ORM, JSON-RPC Odoo y Arquitecturas de Integración ERP.

\#\#\# Contexto del Proyecto:

\`OmniCatalog\` es un consumidor de negocio que se registra ante \`OmniMessaging Hub\`. Cuando un cliente consulta sobre disponibilidad o envía un pedido, \`OmniCatalog\` provee las herramientas ejecutables (\*tools\*) y gestiona la sincronización con la base de datos local y el ERP Odoo del comercio.

\#\#\# Objetivo del Sprint 4:

1\. Implementar \`CatalogToolsService\` con herramientas de consulta de stock, catálogo y confirmación de pedidos.

2\. Construir \`OdooAdapter\` para interactuar vía JSON-RPC/REST con Odoo Community/Enterprise (v16 a v19).

3\. Configurar la cola BullMQ \`order-erp-injection\` con reintentos exponenciales y DLQ para garantizar que ninguna orden se pierda si el ERP está temporalmente fuera de línea.

4\. Integrar el flujo completo: Mensaje entrante \-\> Intención \-\> Tool Calling de Catálogo \-\> Respuesta enriquecida con URL y stock verificado.

\---

\#\#\# Requerimientos Técnicos y Entregables:

\#\#\#\# 1\. Herramientas Operativas de Catálogo (\`src/catalog/catalog-tools.service.ts\`):

Implementar los siguientes métodos expuestos como \*Tools\* para la IA:

\- \`checkStockAvailability({ query, tenantId })\`:

  \* Paso 1: Busca en la base de datos local de OmniCatalog (\`Prisma.productVariant\` y \`Prisma.product\`).

  \* Paso 2: Si el tenant tiene configurado Odoo (\`erp\_sync\_enabled \=== true\`), consulta el stock en caliente en \`stock.quant\` / \`product.product\`.

  \* Retorno: Objeto con { exists: boolean, name: string, availableQty: number, price: number, variantsSummary: string\[\] }.

\- \`getCatalogLink({ tenantId, channelType })\`:

  \* Retorna la URL pública formateada: \`https://catalogo.omniflow.app/c/{tenantSlug}?utm\_source={channelType}\&utm\_medium=bot\`.

\- \`processIncomingOrder({ tenantId, orderPayload, externalSenderId })\`:

  \* Registra la orden preliminar en \`Prisma.order\` con estado \`PENDING\_CONFIRMATION\`.

  \* Genera el identificador único e idempotente \`order\_uuid\` para evitar duplicación.

  \* Encola la tarea en \`order-erp-injection\` y genera el ticket/resumen de confirmación para el cliente.

\#\#\#\# 2\. Adaptador Odoo (\`src/integrations/odoo/odoo.adapter.ts\`):

\- Conexión vía protocolo JSON-RPC (\`/jsonrpc\` o \`/web/dataset/call\_kw\`).

\- Autenticación con credenciales cifradas (URL, DB, Usuario, API Key / Password).

\- Métodos requeridos:

  \* \`getStockLevels(skuList: string\[\]): Promise\<Record\<string, number\>\>\`

  \* \`createSaleOrder(orderData: ERPOrderPayload): Promise\<{ odooOrderId: number; odooOrderName: string }\>\` (crea \`sale.order\` y sus correspondientes \`sale.order.line\`).

  \* \`searchOrCreatePartner(customerData: CustomerPayload): Promise\<number\>\` (busca por teléfono/RUC o crea el \`res.partner\`).

\#\#\#\# 3\. Worker de Inyección ERP (\`src/catalog/queues/erp-injection.processor.ts\`):

\- Procesador BullMQ con reintentos automáticos (Backoff: 1m, 5m, 15m, 1h).

\- Idempotencia: Verificar en Odoo si ya existe una orden con \`client\_order\_ref \= order\_uuid\` antes de insertar.

\- Dead Letter Queue (\`queue:erp-injection-failed\`) con alerta a telemetría si falla tras agotar reintentos.

Por favor, provee:

1\. La implementación completa de \`CatalogToolsService\` con definición de esquemas de parámetros para el Tool Calling.

2\. La implementación completa de \`OdooAdapter\` con manejo de errores y timeouts.

3\. El procesador de cola BullMQ (\`ErpInjectionProcessor\`).

4\. Ejemplo de test de integración simulando una consulta de stock y una inyección de pedido.

