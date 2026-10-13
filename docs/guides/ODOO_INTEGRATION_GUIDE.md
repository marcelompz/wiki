# Guía de Integración Odoo 19 CE — OrderFlow Connector (v19.0.2.0.0)

> **OrderFlow Connector** es el módulo oficial de Odoo 19 CE (`orderflow_connector`) para la sincronización bidireccional en tiempo real y a demanda entre Odoo 19 CE y la plataforma OrderFlow SaaS.

---

## 1. Características Principales

* **Sincronización Push (Odoo ➔ OrderFlow):** Notificación automática en segundo plano mediante Webhooks al crear o modificar Clientes (`res.partner`), Catálogo de Productos (`product.template`) o confirmar Pedidos de Venta (`sale.order`).
* **Sincronización Pull (OrderFlow ➔ Odoo):** Importador interactivo seleccional (`orderflow.import.wizard`) para consultar datos en OrderFlow, visualizarlos en tabla con filtros y checkboxes, y realizar la ingesta directa a la base de datos de Odoo.
* **Panel de Gestión Gráfico:** Acceso directo desde el menú principal de Odoo o vía **Ajustes ➔ Ventas ➔ OrderFlow**.
* **Prueba de Conexión Live:** Botón con diagnóstico de respuesta HTTP 200/201 en vivo.

---

## 2. Configuración de la Conexión

Desde **Odoo ➔ Ajustes ➔ OrderFlow** o el menú **OrderFlow ➔ Panel de Gestión**:

1. **Habilitar Integración con OrderFlow:** Marcar la casilla.
2. **URL de Webhook OrderFlow:**
   * URL Principal: `https://pesallaccia.com/api/v1/integrations/orderflow/webhook`
   * Alias de compatibilidad: `https://pesallaccia.com/api/v1/integrations/webhook/odoo`
3. **API Key de Tenant OrderFlow:**
   * Ingresar el secreto de la API Key del tenant asignado (ej. `sk_cdb58700aac8479a9f9327cc8cb9e24d`).
4. **Probar Conexión:** Hacer clic en **`⚡ Probar Conexión con OrderFlow`** para recibir la confirmación `✓ Conexión Exitosa (HTTP 200)`.

---

## 3. Selección de Datos a Compartir (Push: Odoo ➔ OrderFlow)

En la sección **Selección de Datos a Compartir**, se pueden activar/desactivar de forma granular qué eventos de Odoo emiten Webhooks hacia OrderFlow:

* **👥 Clientes y Contactos:** Envía automáticamente clientes creados o modificados a OrderFlow CRM.
* **📦 Catálogo de Productos y Precios:** Sincroniza las altas y cambios de precio/nombre con la tienda OrderFlow.
* **🛒 Pedidos de Venta:** Envía los pedidos de venta confirmados a OrderFlow POS / KDS.
* **📦 Inventario y Stock:** Envía actualizaciones de stock disponible a OrderFlow.

---

## 4. Importador Seleccionable de Datos (Pull: OrderFlow ➔ Odoo)

Permite consultar la base de datos de OrderFlow SaaS y seleccionar exactamente qué registros importar hacia Odoo.

### Pasos de Uso:

1. Abrir el menú **`OrderFlow` ➔ `📥 Importador de Datos`** (o clic en **`📥 Consultar e Importar Datos`** en Ajustes).
2. **Seleccionar Tipo de Registro:**
   * 👥 **Clientes y Contactos** (`res.partner`)
   * 📦 **Catálogo de Productos** (`product.template`)
   * 🛒 **Pedidos de Venta** (`sale.order`)
3. **Consultar Registros:** Hacer clic en **`🔍 Consultar Datos en OrderFlow`**. Odoo realizará una llamada `GET` a la API de OrderFlow con la API Key configurada.
4. **Revisión y Marcado:**
   * La tabla desplegará los registros encontrados con su Nombre, Email/SKU y Detalle.
   * Utilizar el switch **`Importar`** para marcar o desmarcar individual o masivamente los elementos deseados.
5. **Ejecutar Ingesta:** Hacer clic en **`📥 Importar Seleccionados a Odoo`**.
   * Si el registro ya existe en Odoo (por Email, SKU o Referencia de Pedido), **se actualiza**.
   * Si es un registro nuevo, **se crea** de forma transparente.
   * Al finalizar se muestra una notificación toast con el total de registros procesados.

---

## 5. Estructura Técnica y Archivos

* **Manifiesto:** `/opt/odoo/odoo8084/addons/orderflow_connector/__manifest__.py`
* **Modelo Wizard:** `/opt/odoo/odoo8084/addons/orderflow_connector/models/orderflow_import_wizard.py`
* **Vista XML Wizard:** `/opt/odoo/odoo8084/addons/orderflow_connector/views/orderflow_import_wizard_views.xml`
* **Vistas de Ajustes:** `/opt/odoo/odoo8084/addons/orderflow_connector/views/res_config_settings_views.xml`
* **Repositorio Git:** `git@github.com:marcelompz/odoo19CE.git`

---

## 6. Rotación Automática de API Key

OrderFlow rota la API key de un tenant mediante los endpoints:

- `POST /api/v1/tenants/:id/api-key/rotate`
- `POST /api/v1/tenants/:id/api-key/revoke`

Cuando esto ocurre, OrderFlow **sincroniza automáticamente** la nueva API key en todas las integraciones Odoo activas del tenant, a través del servicio `odoo-adapter`.

### Flujo post-rotación

1. El administrador rota la API key desde OrderFlow.
2. OrderFlow actualiza `apiKeySecret` en la tabla `Tenant`.
3. OrderFlow busca integraciones activas de tipo `ODOO` para ese tenant.
4. Por cada integración, OrderFlow envía la nueva API key a `odoo-adapter` mediante `POST /odoo/update-connector-api-key`.
5. `odoo-adapter` se autentica en Odoo y actualiza el parámetro `orderflow_connector.api_key` en `ir.config_parameter`.

### Requisitos

- El servicio `odoo-adapter` debe estar accesible desde OrderFlow (`ODOO_ADAPTER_URL`).
- La integración Odoo debe estar configurada con `host`, `port`, `database`, `username` y `password` válidos.
- El módulo `orderflow_connector` debe estar instalado en Odoo 19 CE.

### Verificación

Después de rotar la API key, podés verificar en Odoo:

1. Ir a **Ajustes ➔ Técnico ➔ Parámetros ➔ Parámetros del Sistema**.
2. Buscar la clave `orderflow_connector.api_key`.
3. Confirmar que el valor coincida con la nueva API key mostrada en OrderFlow.

> Nota: Si la sincronización falla, el endpoint de rotación devuelve la nueva clave de todas formas. El administrador debe actualizarla manualmente en Odoo.

