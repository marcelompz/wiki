# PROMPT: Motor Omnicanal de Retención y Follow-Up en OrderFlow (FEAT-48)

## 📋 Objetivo
Implementar un motor omnicanal de retención (`CART_ABANDONED` y `BOOKING_PENDING`) desacoplado mediante el patrón `IMessagingAdapter`, permitiendo que el comercio configure múltiples canales de mensajería (WhatsApp, Instagram Direct, Messenger, Telegram o Custom Webhooks) según sus recursos tecnológicos y presupuesto.

---

## 🛠️ Arquitectura de Adaptadores (`IMessagingAdapter`)

El backend procesará las tareas programadas en Redis (BullMQ) e invocará el adaptador correspondiente al canal destino seleccionado en la regla:

1. **`WhatsAppCloudApiAdapter` (Oficial Meta):**
   - Requiere: `WABA ID`, `Phone Number ID`, `Token`.
   - Exige uso de plantillas de mensaje preaprobadas por Meta (HSM).

2. **`WhatsAppWebEngineAdapter` (WhatsApp Web vía QR):**
   - Requiere: Escaneo de QR en el panel admin.
   - Permite envío de **texto libre con variables dinámicas** sin costo por mensaje.

3. **`InstagramDirectAdapter` & `MessengerAdapter` (Meta Graph API):**
   - Requiere: Cuenta profesional / Fan Page vinculada.
   - Envío de texto libre sin costo dentro de la ventana de atención de 24 horas del usuario.

4. **`TelegramMessagingAdapter`:**
   - Requiere: `Bot Token` de Telegram (`@BotFather`).
   - Permite texto libre con HTML/Markdown, variables dinámicas y botones Inline (*Deep Links*).

5. **`CustomWebhookAdapter`:**
   - Requiere: `Webhook URL` y `Secret Key`.
   - Despacha un evento HTTP POST con el payload del pedido/cita para integraciones con SMS locales, Zapier, Make o notificaciones Push.

---

## 🎨 Lógica Adaptativa en el Frontend (`admin.orderflow.app`)

1. **Gestor de Canales (`Social Catalog ➔ Configuración de Canales`):**
   - Permitir registrar credenciales para WhatsApp (Meta API o QR), Instagram Direct, Messenger, Telegram Bot o Webhook URL.

2. **Formulario de Reglas de Retención:**
   - Si el canal seleccionado es `WHATSAPP_CLOUD_API`: Renderizar selector desplegable de plantillas HSM sincronizadas desde Meta.
   - Si el canal es `WHATSAPP_WEB_QR`, `INSTAGRAM`, `MESSENGER`, `TELEGRAM` o `WEBHOOK`: Ocultar el selector de plantillas Meta y habilitar el **editor de texto enriquecido con soporte para variables dinámicas** (`{{cliente_nombre}}`, `{{comercio_nombre}}`, `{{checkout_url}}`, `{{monto}}`).

3. **Garantía Anti-Spam y Cancelación Automática:**
   - Conservar la destrucción automática de la tarea en Redis si el webhook de pago confirma la transacción antes del vencimiento.
   - Aplicar límite de *cooldown* de 24 horas por cliente independientemente del canal utilizado.