# 📖 Wiki: Follow-Up Omnicanal & Retención Automatizada

> **Módulo:** `Social Commerce Omnichannel Hub` (FEAT-48)  
> **Versión:** 2.0.0 (Soporte Omnicanal: WhatsApp Meta API / Web QR, Instagram, Messenger, Telegram y Webhooks)  
> **Aplica a:** OrderFlow Sales, OrderFlow Bookings y Social Catalog

---

## 🎯 1. Introducción y Propósito del Módulo

El módulo de **Follow-Up Omnicanal & Retención Automatizada** permite a los comercios rescatar ventas inconclusas y confirmar reservas en espera (*carritos o citas abandonadas*) de forma totalmente automatizada.

El motor de retención monitorea las interacciones en la tienda o catálogo y ejecuta disparadores de comunicación a través de múltiples canales sociales, adaptándose al canal preferido del cliente o a los recursos disponibles por el comercio.

---

## 🔀 2. Matriz de Canales Disponibles

OrderFlow ofrece integración flexible para **5 canales de salida**, permitiendo operar tanto con APIs oficiales como con conectores gratuitos/directos:

| Canal | Tipo de Conexión | ¿Exige Plantilla Aprobada? | Costo por Envío | Ideal Para... |
| :--- | :--- | :---: | :---: | :--- |
| 🟢 **WhatsApp (Meta Cloud API)** | API Oficial Meta | **SÍ (HSM)** | Aplica tarifa Meta | Marcas medianas/grandes con cuenta verificada en Meta. |
| 🟢 **WhatsApp (Web Engine QR)** | Sesión QR (Baileys/Puppeteer) | **NO** | **$0 / Gratis** | PyMEs, tiendas locales o vendedores con WhatsApp normal/Business no verificado. |
| 🟣 **Instagram Direct** | Meta Graph API | **NO** *(ventana 24h)* | **$0 / Gratis** | Marcas con alta interacción y ventas por chat en Instagram. |
| 🔵 **Facebook Messenger** | Meta Graph API | **NO** *(ventana 24h)* | **$0 / Gratis** | Comercios con catálogo y fanpage activa en Facebook. |
| 🟦 **Telegram** | Bot API (`@BotFather`) | **NO** | **$0 / Gratis** | Automatización instantánea sin restricciones de Meta. |
| 🔌 **Custom Webhook** | Evento HTTP POST (JSON) | **NO** | Según proveedor | Integración con SMS locales, App Push, Zapier o Make. |

> ⚠️ **Nota Anti-Spam para Conexión QR (WhatsApp):**  
> Para proteger la línea telefónica del comercio al usar el conector QR, OrderFlow aplica un algoritmo de retardos (*delays*) y recomienda no superar los 100 envíos automáticos diarios en cuentas estándar.

---

## ⚙️ 3. Configuración Paso a Paso

### Paso 1: Activar Canales en OrderFlow

Navega al **Panel de Administración ➔ Social Catalog ➔ Configuración de Canales** y conecta las plataformas que utiliza tu negocio:

1. **WhatsApp (Meta Cloud API):** Ingresa `WABA ID`, `Phone Number ID` y el `Token Permanente`.
2. **WhatsApp (Web Engine QR):** Escanea el código QR desde la app de WhatsApp en tu smartphone (**Dispositivos Vinculados**).
3. **Instagram Direct / Messenger:** Conecta tu cuenta comercial de Meta mediante OAuth 2.0.
4. **Telegram:** Ingresa el `Bot Token` generado en Telegram con `@BotFather`.
5. **Custom Webhook:** Configura la `URL de destino` y el `Bearer Token` de autenticación.

---

### Paso 2: Crear una Regla de Follow-Up Omnicanal

Ingresa a **Social Catalog ➔ Reglas de Retención** y haz clic en **`+ Nueva Regla de Seguimiento`**:

| Campo | Descripción | Opciones / Ejemplo |
| :--- | :--- | :--- |
| **Canal Destino** | Selecciona el canal donde se despachará el mensaje. | `WHATSAPP_META`, `WHATSAPP_QR`, `INSTAGRAM`, `MESSENGER`, `TELEGRAM`, `WEBHOOK` |
| **Tipo de Evento** | Evento de abandono que monitorea OrderFlow. | • **`CART_ABANDONED`** (Carrito en espera)<br>• **`BOOKING_PENDING`** (Cita por confirmar) |
| **Tiempo de Espera** | Minutos de inactividad previos al envío del mensaje. | `30`, `60`, `120` minutos |
| **Plantilla / Mensaje** | Plantilla oficial (para WhatsApp Meta) o Texto Libre con variables (para el resto). | *Ver ejemplos en la Sección 4.* |
| **Estado** | Estado operativo de la regla. | `Activo` / `Inactivo` |

---

## 💬 4. Ejemplos de Configuración por Canal

### 🟢 WhatsApp Web QR / 🟣 Instagram Direct / 🟦 Telegram (Texto Libre)

```text
¡Hola {{cliente_nombre}}! 👋 Notamos que dejaste productos pendientes en tu carrito de {{comercio_nombre}}.

¡Tu stock sigue reservado por tiempo limitado! Toca el siguiente enlace para finalizar tu compra en 1-clic:
🔗 {{checkout_url}}

🟢 WhatsApp Cloud API Meta (Plantilla Oficial HSM)
YAML

Nombre de Plantilla: followup_cart_discount_v1
Categoría: UTILITY
Idioma: es

Cuerpo:
"Hola {{1}} 👋 Notamos que dejaste productos en tu carrito de {{2}}. ¡Tu stock sigue reservado! Toca el botón para finalizar:"

Botón CTA:
[ Finalizar mi Compra | {{3}} ]

🔌 Custom Webhook Payload (JSON)
JSON

{
  "event": "CART_ABANDONED",
  "tenantId": "comercio_123",
  "customer": {
    "name": "Carlos Gómez",
    "phone": "+595981123456",
    "email": "carlos@email.com"
  },
  "cart": {
    "total": 150000,
    "currency": "PYG",
    "checkoutUrl": "[https://orderflow.app/checkout/cart_98765](https://orderflow.app/checkout/cart_98765)"
  }
}

🔄 5. Arquitectura Interna del Motor de Retención

El ciclo de vida de una tarea de seguimiento en OrderFlow sigue un proceso desacoplado mediante colas de eventos en Redis (BullMQ):

[ Cliente inicia pedido o cita ]
               │
               ▼ (Estado: PENDING)
┌──────────────────────────────────────────────────────────┐
│ OrderFlow programa tarea silenciosa en Redis (BullMQ)     │
└──────────────────────────────────────────────────────────┘
               │
       ┌───────┴────────────────────────┐
       │                                │
 ¿El cliente completó            ¿Expiró el tiempo de
  el pago / turno?               espera programado?
       │                                │
       ▼ (Sí)                           ▼ (Sí)
┌────────────────────────────┐  ┌─────────────────────────────────────────┐
│ Tarea CANCELADA            │  │ OrderFlow consulta el IMessagingAdapter │
│ automáticamente en Redis   │  │ según el canal configurado en la regla: │
│ (Se evita envío reiterado) │  │                                         │
└────────────────────────────┘  │  ├─ WhatsAppCloudAdapter (Meta API)     │
                                │  ├─ WhatsAppWebEngineAdapter (QR Engine)│
                                │  ├─ InstagramDirectAdapter              │
                                │  ├─ TelegramAdapter                     │
                                │  └─ CustomWebhookAdapter                │
                                └─────────────────────────────────────────┘

🛡️ 6. Políticas Anti-Spam y Reportes de Impacto

    Cooldown Anti-Spam (24h): Un cliente no recibirá más de 1 mensaje de seguimiento automático en un periodo de 24 horas, independientemente de cuántos carritos o turnos abra.

    Cancelación Automática por Evento: Si el webhook de la pasarela de pago (Stripe, Mercado Pago, POS local) confirma la venta antes del vencimiento del tiempo de espera, la tarea en Redis se destruye de inmediato.

    Aislamiento Multi-Tenant: Cada regla y tarea se procesa en silos aislados por tenantId.

    Analytics en Tiempo Real (Social Catalog ➔ Analytics):

        Carritos Recuperados: Total de ventas completadas tras el envío del seguimiento.

        Tasa de Conversión de Retención (%): Efectividad sobre el total de mensajes enviados.

        Monto Recuperado (USD / PYG / BRL): Facturación total rescatada.
