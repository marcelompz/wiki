# PROMPT: Implementación de Integración Híbrida de WhatsApp en OrderFlow (FEAT-48)

## 📋 Objetivo
Adaptar el módulo `Social Commerce Omnichannel Hub` de OrderFlow para que soporte dos esquemas de conexión a WhatsApp según la naturaleza del comercio cliente:
1. **Empresas Corporativas / Verificadas:** Integración oficial vía Meta Cloud API (requiere plantillas aprobadas HSM y pago por conversación).
2. **PyMEs / Vendedores Locales:** Integración rápida mediante WhatsApp Web Engine (código QR), permitiendo usar números personales o WhatsApp Business no verificados sin costo por plantilla.

---

## ⚙️ Directrices de Arquitectura (`IMessagingAdapter`)

### 1. Conector Meta Cloud API (`WhatsAppCloudApiAdapter`)
- Configuración: `WABA ID`, `Phone Number ID`, `Access Token`.
- Lógica: Consulta y valida plantillas oficializadas en Meta Business Manager.
- Formato de payload: Envío de parámetros interpolados sobre plantillas estandarizadas (`UTILITY` / `MARKETING`).

### 2. Conector WhatsApp Web Engine / QR (`WhatsAppWebEngineAdapter`)
- Configuración: Escaneo de Código QR en el panel `admin.orderflow.app`.
- Lógica: Emula una sesión de WhatsApp Web en el backend (vía Baileys/Puppeteer).
- Formato de payload: Permite **texto libre** con variables dinámicas (`{{cliente_nombre}}`, `{{checkout_url}}`, `{{monto}}`).
- Costo: **$0 / Gratuito** (sin cobro de Meta).
- Protección Anti-Spam: Aplicar delay aleatorio (1-3 segundos) entre mensajes y respetar estrictamente el límite de cooldown de 24 horas por usuario.

---

## 🎨 Cambios en la Interfaz de Usuario (`admin.orderflow.app`)

1. **Panel de Configuración de Canales:**
   - Agregar selector de tipo de conexión para WhatsApp:
     * `OFICIAL_META` (Meta Business Cloud API)
     * `QR_WEB_SESSION` (WhatsApp Web Engine)
   - Si se elige `QR_WEB_SESSION`, renderizar un componente de código QR en tiempo real para vinculación mediante la app de WhatsApp del comercio.

2. **Formulario de Reglas de Retención (`CART_ABANDONED` / `BOOKING_PENDING`):**
   - **Camino Meta:** Renderizar selector desplegable con las plantillas HSM aprobadas sincronizadas desde Meta.
   - **Camino QR / Telegram / Instagram:** Renderizar un área de texto enriquecido con soporte para variables dinámicas (`{{cliente_nombre}}`, `{{comercio_nombre}}`, `{{checkout_url}}`).

---

## 🔄 Lógica del Motor de Colas (BullMQ + Redis)
- El motor de tareas diferidas debe mantenerse agnóstico al canal seleccionado.
- Al vencer el temporizador de inactividad, la tarea evalúa el tipo de adaptador configurado para el `tenantId` y despacha el mensaje a través del conector correspondiente.
- Si el evento de pago o confirmación de cita se recibe antes de que expire el temporizador, la tarea en Redis se destruye de forma automática.