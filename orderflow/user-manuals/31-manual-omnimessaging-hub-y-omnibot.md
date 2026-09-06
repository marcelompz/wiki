# 📘 Manual de Usuario: Hub de Mensajería Omnicanal & OmniBot (`v1.26.00`)

> **Módulo:** Hub de Mensajería Omnicanal (`OmniMessaging`), OmniBot AI (Ollama Local / Cloud AI) & App Store WhatsApp Web QR  
> **Ubicación del Documento:** `docs/user-manuals/31-manual-omnimessaging-hub-y-omnibot.md`  
> **Versión de OrderFlow / OmniFlow:** v1.26.00+  
> **Fecha:** 05 de Septiembre de 2026  

---

## 1. INTRODUCCIÓN Y PROPÓSITO

El **Hub de Mensajería Omnicanal (`OmniMessaging`)** integra los canales de atención al cliente (WhatsApp Cloud API, Telegram Bot API y WhatsApp Web QR de sesión directa) dentro de un único tablero centralizado en el panel de administración (`/admin/messaging`).

Este sistema cuenta con el respaldo de **OmniBot AI**, un agente conversacional inteligente capaz de ejecutarse con **proveedores Cloud (OpenAI/Anthropic)** o mediante **IA Local (Ollama / `LocalOllamaProviderService`)** sin costo de API y con almacenamiento privado de datos en el servidor local.

---

## 2. ARQUITECTURA DEL HUB Y CANALES

```mermaid
graph TD
    Client["Cliente (WhatsApp / Telegram)"]
    Webhook["OmniMessaging Webhook Controller"]
    Queue["OmniMessaging Queue Producer / Outbound Processor"]
    Router["Intent Router Service"]
    BotEngine["OmniBot AI Engine"]
    LocalOllama["Local Ollama LLM (http://localhost:11434)"]
    CloudAI["Cloud AI Provider (Tool Calling)"]
    Tools["CatalogToolsService & OrderInjectorService"]
    AdminUI["Admin UI Panel (/admin/messaging)"]

    Client -->|1. Mensaje Entrante| Webhook
    Webhook -->|2. Encola Mensaje| Queue
    Queue -->|3. Procesa Conversación| Router
    Router -->|4. Modo Bot Activo| BotEngine
    BotEngine -->|A. IA Local| LocalOllama
    BotEngine -->|B. Cloud AI| CloudAI
    BotEngine -->|5. Búsqueda Menú / Inyección Pedido| Tools
    Router -->|6. Takeover Humano| AdminUI
```

---

## 3. CONFIGURACIÓN Y MÓDULOS EN APP STORE

### 3.1 WhatsApp Web QR (`whatsapp-qr.manifest.json`)
Permite conectar una cuenta de WhatsApp mediante la escaneo de un código QR directamente desde la interfaz, sin requerir la aprobación previa de Meta Cloud API.

1. Navegar a **`/admin/modules`** (App Store de OmniFlow).
2. Seleccionar el módulo **WhatsApp Web QR**.
3. Hacer clic en **Instalar / Conectar**.
4. Escanear el código QR presentado en pantalla utilizando la aplicación móvil de WhatsApp (**Dispositivos Vinculados**).

### 3.2 Canales Cloud API & Telegram
- **WhatsApp Cloud API:** Configura tu `Phone Number ID`, `WABA ID` y `Access Token` cifrados con AES-256-GCM.
- **Telegram Bot:** Registra el token provisto por `@BotFather` para vincular el bot de Telegram a tu tenant.

---

## 4. BASE DE CONOCIMIENTOS Y ENTRENAMIENTO DE IA LOCAL

### 4.1 Catálogo de Productos Dinámico
La IA Local consulta automáticamente el menú del tenant mediante `CatalogToolsService`. No requiere reentrenamiento manual para productos:
- Búsqueda de platos por palabras clave.
- Precios y variantes en tiempo real.
- Generación de links de compra directa con UTMs.

### 4.2 Reglas de Negocio, FAQs y Tiempos de Entrega
Desde **`/admin/messaging`** -> **Configuración del Bot**:

1. **System Prompt / Instrucciones Personalizadas:**
   Escribe en lenguaje natural las reglas operativas de tu establecimiento:
   ```text
   - Tiempos de preparación: 20-35 minutos en salón, 35-50 minutos en delivery.
   - Costo de envío: Gratis en zona centro, 15.000 PYG fuera de zona.
   - Agregados disponibles: Queso extra (+5.000 PYG), Salsa especial (+3.000 PYG).
   ```

2. **Base de Conocimientos (Knowledge Base JSON / FAQs):**
   Estructura preguntas frecuentes y datos estáticos específicos:
   ```json
   {
     "faqs": [
       {
         "keywords": ["envio", "delivery", "cobertura"],
         "answer": "Realizamos envíos dentro de un radio de 5km de 11:30 a 23:00 hs."
       },
       {
         "keywords": ["demora", "tiempo", "tarda"],
         "answer": "El tiempo promedio de preparación para delivery es de 40 minutos."
       }
     ]
   }
   ```

---

## 5. PANEL DE CONTROL DE MENSAJERÍA (`/admin/messaging`)

El panel incluye:
- **Vista Multicanal de Conversaciones:** Filtra chats activos por canal (WhatsApp QR, WhatsApp Cloud, Telegram).
- **Intervención Humana (Human Takeover):** Botón para pausar el bot en un chat específico y tomar el control manual de la conversación.
- **Inyección Idempotente de Pedidos:** Confirmación y creación de pedidos directamente desde el chat asignándoles un `orderUuid`.
- **Métricas de Rendimiento:** Total de mensajes procesados, tasa de conversión del bot y consumo de cuotas.

---

## 6. GUÍA DE OPERACIÓN DIARIA & CASOS DE USO

### 6.1 Atención Automatizada con Inteligencia Artificial
1. Cuando un cliente ingresa un mensaje por WhatsApp o Telegram, el sistema evalúa su `tenantId` y verifica si el bot está activado.
2. La IA responde dudas sobre el menú, ingredientes, precios, tiempos de espera y políticas de envío.
3. Si el cliente solicita armar un pedido, la IA genera el resumen del carrito con el desglose de productos y la URL directa para completar el pago/confirmación.

### 6.2 Tomar Control Manual de una Conversación (Human Takeover)
1. Ingrese a **`/admin/messaging`**.
2. En la lista de chats a la izquierda, seleccione la conversación activa.
3. En el encabezado del chat, presione el botón **"Tomar Control Manual"** (Human Takeover).
4. El estado del chat pasará a `HUMAN_TAKEOVER`, pausando las respuestas automáticas de OmniBot en ese hilo para evitar interrupciones mientras el operador conversa con el cliente.
5. Una vez resuelta la duda del cliente, presione **"Reactivar OmniBot"** para devolver la atención automatizada al canal.

### 6.3 Inyección Directa e Idempotente de Pedidos (`OrderInjectorService`)
Cuando un cliente confirma la compra a través del chat:
1. OmniBot invoca la herramienta `OrderInjectorService`.
2. Se genera un `orderUuid` único e idempotente para evitar duplicación de comanda ante reintentos de red.
3. El pedido se registra automáticamente en estado `CONFIRMED` dentro del módulo de ventas y cocina (POS / KDS) asociado al tenant.

---

## 7. RESOLUCIÓN DE PROBLEMAS (TROUBLESHOOTING)

| Síntoma | Causa Posible | Solución Sugerida |
| :--- | :--- | :--- |
| **Error 502 / Caída de respuestas en IA Local** | El servicio Ollama local no está respondiendo en `http://localhost:11434`. | Ejecute `ollama serve` en el servidor o verifique con `curl http://localhost:11434/api/tags`. |
| **Desconexión de WhatsApp Web QR** | La sesión del dispositivo vinculado caducó o el celular perdió conexión. | Ingrese a `/admin/modules`, seleccione **WhatsApp Web QR** y escanee nuevamente el código QR generado. |
| **La IA ofrece productos agotados o desactualizados** | La caché local de catálogo o sincronización de productos necesita actualizarse. | Verifique que el estado del producto en `/admin/products` esté como `disponible` y refresque el menú. |
| **El bot responde en un chat en intervención humana** | El estado de la conversación no cambió a `HUMAN_TAKEOVER`. | Verifique que en `/admin/messaging` el toggle de intervención humana figure como **Pausado/Manual**. |

---

## 8. SEGURIDAD Y CONTROL DE CUOTAS (`QuotaPlanGuardService`)

- **Cifrado de Credenciales:** Todas las claves API (tokens de WhatsApp Cloud y Telegram) se almacenan encriptadas con algoritmos **AES-256-GCM** e **HKDF** a través de `CredentialsVaultService`.
- **Aislamiento Multi-Tenant:** La ejecución de herramientas y consultas a la base de datos están estrictamente delimitadas por `tenantId`, imposibilitando el cruce de datos entre comercios.
- **Guardia de Cuotas:** Cada plan asigna una cuota mensual de mensajes. El bot responde informando amablemente al cliente o derivando a un humano si el tenant alcanza el 100% de su cuota contratada.
