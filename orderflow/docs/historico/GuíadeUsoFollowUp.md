# 📖 Guía de Uso: Follow-Up Omnicanal & Retención Automatizada

**Módulo:** `Social Commerce Omnichannel Hub` (FEAT-48)

**Versión:** 1.0.0

**Aplica a:** OrderFlow Sales, OrderFlow Bookings y Social Catalog

---

## 🎯 1. Introducción y Objetivo

El módulo de **Follow-Up Omnicanal** permite a los comercios automatizar el seguimiento de clientes que iniciaron un pedido o una reserva de turno pero no completaron la compra/confirmación (*carritos o citas abandonadas*).

Gracias a la integración con el **Social Commerce Hub**, este motor de retención funciona de manera unificada a través de múltiples canales de mensajería:

* 🟢 **WhatsApp** (vía WhatsApp Cloud API / Meta)
* 🟣 **Instagram Direct**
* 🔵 **Messenger**
* 🟦 **Telegram**
* 🔌 **Custom Webhooks**

---

## 🛠️ 2. Requisitos Previos

Antes de configurar reglas de seguimiento, asegúrate de tener:

1. Al menos un canal activo configurado en **Panel de Administración ➔ Social Catalog ➔ Configuración de Canales** (ej. número de WhatsApp vinculado o cuenta de Instagram conectada).
2. Si utilizas **WhatsApp**, debes contar con plantillas de mensajes aprobadas previamente en el Business Manager de Meta.

---

## ⚙️ 3. Paso a Paso: Configurar una Regla de Follow-Up

### Paso 1: Ingresar al Módulo

1. Inicia sesión en el **Panel de Administración de OrderFlow** (`admin.orderflow.app`).
2. En el menú lateral izquierdo, dirígete a **Social Catalog ➔ Reglas de Retención (Follow-Up)**.

---

### Paso 2: Crear una Nueva Regla

Haz clic en el botón **`+ Nueva Regla de Seguimiento`** para abrir el formulario de configuración.

 *(Vista previa UI)*

Completa los siguientes campos:

| Campo | Descripción | Ejemplo / Opciones |
| --- | --- | --- |
| **Canal Destino** | Selecciona el canal social donde aplicará esta regla utilizando el selector omnicanal. | `WHATSAPP`, `INSTAGRAM`, `TELEGRAM` |
| **Tipo de Evento** | Define el evento desencadenante que el sistema debe monitorear. | • **`CART_ABANDONED`** (Carrito en espera)<br>

<br>• **`BOOKING_PENDING`** (Cita por confirmar) |
| **Tiempo de Espera (Minutos)** | Minutos de inactividad que deben transcurrir antes de enviar el mensaje. | `120` *(2 horas)* |
| **Plantilla / Mensaje** | Identificador de la plantilla oficial (Meta) o texto personalizado (Telegram/Webhook). | `followup_cart_discount_v1` |
| **Estado** | Interruptor para activar o pausar la regla globalmente. | `Activo` / `Inactivo` |

---

### Paso 3: Guardar y Validar

1. Haz clic en **`Guardar Regla`**.
2. La regla aparecerá en el listado indicando el canal, el ícono representativo y el tiempo de disparo configurado.

---

## 🔄 4. ¿Cómo funciona el Flujo Automático?

El ciclo de vida de un seguimiento automatizado sigue tres fases transparentes:

```
[ Cliente inicia pedido/cita ]
             │
             ▼ (Estado: PENDING)
┌────────────────────────────────────────┐
│  OrderFlow programa una tarea silenciosa│
│  en la cola de Redis (BullMQ)          │
└────────────────────────────────────────┘
             │
     ┌───────┴──────────────────────┐
     │                              │
¿El cliente pagó /          ¿Expiró el tiempo
confirmó la cita?           de espera?
     │                              │
     ▼ (Sí)                         ▼ (Sí)
┌─────────────────────────┐  ┌─────────────────────────────┐
│ Tarea CANCELADA         │  │ OrderFlow invoca el         │
│ automáticamene de Redis │  │ IMessagingAdapter del canal │
│ (No se envía spam)      │  │ y despacha el mensaje.     │
└─────────────────────────┘  └─────────────────────────────┘

```

---

## 💡 5. Casos de Uso Recomendados por Canal

### 🟢 Caso 1: Carrito Abandonado en WhatsApp

* **Tiempo sugerido:** 120 minutos (2 horas).
* **Estrategia:** Enviar una plantilla con un enlace directo para retomar la compra en 1-clic (*Social Checkout*).
* **Ejemplo de Plantilla:**
> *"Hola {{1}} 👋 Notamos que dejaste productos en tu carrito de {{2}}. ¡Tu stock sigue reservado por tiempo limitado! Toca el botón para completar tu pedido:"* > `[ CTA: Finalizar mi Compra ]`



---

### 🟣 Caso 2: Intención de Cita en Instagram Direct

* **Tiempo sugerido:** 30 a 60 minutos.
* **Estrategia:** Ofrecer un recordatorio amable dentro de la ventana de conversación de 24 horas.
* **Ejemplo de Mensaje:**
> *"¡Hola! ✨ Vimos que seleccionaste un turno para Spa de Manos. ¿Te quedó alguna duda con la ubicación o los medios de pago? Respondeme por acá y te ayudo a confirmarlo."*



---

### 🟦 Caso 3: Recuperación de Venta con Descuento (Telegram)

* **Tiempo sugerido:** 24 horas (1440 minutos).
* **Estrategia:** Ofrecer un incentivo adicional si el cliente no reaccionó al primer aviso.
* **Ejemplo de Mensaje:**
> *"¡No te quedes sin tus productos! Usá el cupón **RETENCION10** en las próximas 3 horas y obtené un 10% OFF en tu compra. 🚀"*



---

## 🛡️ 6. Políticas Anti-Spam y Protección de Marca

Para garantizar el cumplimiento de las políticas de uso de Meta/Telegram y evitar bloqueos en las cuentas del negocio, OrderFlow aplica reglas internas de protección:

1. **Límite de Cooldown (24h):** Un mismo cliente no recibirá más de **1 mensaje de seguimiento automático en un periodo de 24 horas**, independientemente de cuántos carritos abra.
2. **Cancelación Automática por Evento:** Si el webhook de pago (Stripe, Mercado Pago o POS) confirma la transacción antes de que venza el tiempo, la tarea se destruye en milisegundos sin intervenir con el cliente.
3. **Aislamiento Multi-Tenant:** Cada regla y tarea se procesa en silos totalmente aislados por `tenantId`.

---

## 📊 7. Reportes y Métricas de Impacto

En el panel principal de **Social Catalog ➔ Analytics**, podrás visualizar el rendimiento del módulo en tiempo real:

* **Carritos Recuperados:** Total de compras completadas tras el envío del seguimiento.
* **Tasa de Conversión de Retención (%):** Porcentaje de conversión sobre el total de mensajes enviados.
* **Monto Recuperado (USD / PYG):** Facturación total rescatada gracias a las secuencias de Follow-Up.
