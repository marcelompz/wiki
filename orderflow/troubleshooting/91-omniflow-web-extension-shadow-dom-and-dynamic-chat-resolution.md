# 🛠️ Troubleshooting 91: Extensión Web OmniFlow para WhatsApp Web (Manifest V3) — Eventos Shadow DOM & Extracción Dinámica

> **Área:** Frontend / Extensiones Browser / Shadow DOM / Multi-Tenant
> **Síntoma Principal:** El modal de configuración ⚙️ no abría desde la TopBar, la información del tenant/operador se mostraba en estado simulado (`tenant_latam_asuncion_01`) y las tarjetas de contactos flotaban fijas sin aislarse sobre WhatsApp Web.
> **Estado:** ✅ Resuelto (re-fix completo)
> **Fecha:** 2026-09-07

---

## 🛑 Síntomas Observados

1. **Modal de Configuración Inaccesible:** Al presionar el botón ⚙️ en la barra superior inyectada (`OmniFlowTopBar`), no se desplegaba la ventana flotante de ajustes.
2. **Credenciales Estáticas o Vacías:** La extensión presentaba datos estáticos de demostración en la barra superior en lugar de solicitar la configuración inicial del usuario (`Sin tenant` / `Sin sesión`), o mostraba valores previamente guardados en el popup pero no reflejados en la TopBar de WhatsApp Web.
3. **Superposición Fija de Contactos de Prueba:** En WhatsApp Web, la interfaz mostraba fichas simuladas (Lic. Andrea González, Dr. Rodrigo Alarcón) que no correspondían con el chat activo ni respondían a la alternancia del panel lateral.

---

## 🔍 Causa Raíz (Diagnóstico Revisado)

1. **Aislamiento de `localStorage` entre contextos de extensión:**
   `storageService` utilizaba `localStorage` directamente. En un *content script* inyectado en `web.whatsapp.com`, `localStorage` apunta al *storage* de la **página web** (origen `https://web.whatsapp.com`), no al *storage* de la **extensión**. Cuando el operador guardaba la configuración desde el *popup* de la extensión (contexto de página de extensión), los datos se escribían en un `localStorage` distinto al que leía el *content script*. Por tanto, la TopBar nunca veía los valores guardados.

2. **TopBar sin modal autónomo:**
   El botón ⚙️ en `OmniFlowTopBar` solo disparaba eventos (`window.postMessage` + `CustomEvent`) hacia el componente `App` en el *sidebar* (otro *shadow root* separado). La propagación entre *shadow DOMs* distintos a través de `window` era frágil y no garantizada — especialmente en la segunda renderización (listener de `storage` event) donde se omitía el `CustomEvent`, dejando el botón sin respuesta.

3. **Falta de reactividad al cambiar la configuración:**
   No existía un listener sobre `chrome.storage.onChanged` que actualizara la TopBar en tiempo real cuando el operador guardaba o modificaba los datos desde el *popup* o desde el propio modal de la TopBar.

4. **Valores Predeterminados en `storageService`:**
   La configuración base `DEFAULT_CONFIG` devolvía un `tenantId` y `operatorToken` pre-cargados de prueba, evitando que el usuario fuera advertido de la falta de autenticación.

5. **Falta de Observer DOM en el Encabezado de WhatsApp Web:**
   No existía un `MutationObserver` sobre `#main header` para extraer dinámicamente el contacto abierto en el navegador e invocar las APIs reales por número E.164.

---

## 🛠️ Solución Aplicada (v2.5.0 — re-fix)

1. **Migración de `storageService` a `chrome.storage.local` (API asíncrona con caché):**
   - `storageService.getConfig()` ahora lee de un caché en memoria (`_cache`) poblado asíncronamente por `initAsync()` al cargar el módulo.
   - `storageService.saveConfig()` escribe a `chrome.storage.local` (o `browser.storage.local` en Firefox) y actualiza el caché + notifica suscriptores.
   - Fallback a `localStorage` solo para entornos de desarrollo (preview local / `server.cjs`).
   - Se añadieron `subscribe()` / `unsubscribe()` para reactividad y el listener `chrome.storage.onChanged` que actualiza el caché automáticamente cuando otro contexto (popup) guarda cambios.
   - **Fix adicional (v2.5.1):** `DEFAULT_CONFIG.baseUrl` cambió de `"https://api.omniflow.cloud"` a `""`, ya que el dominio `api.omniflow.cloud` no es propiedad de OrderFlow/OmniFlow. Los usuarios deben obtener la API URL correcta desde `/admin/tokens` (provecchio.com o pesallaccia.com según el entorno).

2. **Modal de Configuración autónomo en la TopBar (`ConfigModal`):**
   - `OmniFlowTopBar` ahora es un componente con estado (`useState<isConfigOpen>`) que renderiza internamente `ConfigModal` dentro del mismo *shadow DOM*.
   - El botón ⚙️ abre directamente el modal, sin depender de la propagación de eventos al componente `App`.
   - El modal persiste `baseUrl`, `tenantId`, `operatorName`, `operatorToken` y `autoTakeoverOnType` vía `storageService.saveConfig()`.

3. **Reactividad en la TopBar:**
   - `OmniFlowTopBar` se suscribe a `storageService.subscribe()` y actualiza su estado visual (tenant, operador, estado de conexión) en tiempo real.
   - Indicador visual de conexión: ✅ verde (`Wifi`) cuando está configurado, 🟡 ámbar (`WifiOff`) cuando falta configuración.

4. **Limpieza de Credenciales Base & Estado No Autenticado:**
   - `DEFAULT_CONFIG` inicia con `tenantId: ""` y `operatorToken: ""`, mostrando `🟡 Sin tenant / Sin sesión` en la TopBar.
   - `DEFAULT_CONFIG.baseUrl` inicia como `""` (vacío), requiriendo configuración explícita del usuario.
   - `systemPromptBase` se añadió al `OmniFlowConfig` para soportar el prompt del OmniBot.

5. **Detector Dinámico de Chat Activo (`whatsappDom.ts`):**
   - `getActiveChatInfo()` extrae el nombre y teléfono E.164 del contacto activo desde `#main header`.
   - `MutationObserver` conectado a `#main header` para actualizar al cambiar de conversación.

6. **Simplificación del `content-script.ts`:**
   - Eliminado el listener de `storage` event (reemplazado por `chrome.storage.onChanged` interno en `storageService`).
   - La TopBar maneja su propia reactividad; el `content-script` ya no re-renderiza manualmente la barra.
   - **Fix adicional (v2.5.1):** `domActiveChat` declarado antes de su uso (corregido temporal dead zone).

7. **`getApiBaseUrl()` fix en frontend:**
   - El método `getApiBaseUrl()` en `frontend/src/services/api.ts` retornaba string vacío cuando `VITE_API_URL=/api` (el fallback `/api` era stripeado dejando `""`). Ahora verifica que el resultado no sea vacío ni comience con `/` antes de usarlo, cayendo correctamente al `window.location.origin` (`https://provecchio.com` o `https://pesallaccia.com`). Este fix garantiza que la página `/admin/tokens` muestre la API URL correcta para la extensión.

7. **Corrección de bugs en `App.tsx`:**
   - `domActiveChat` se declaraba después de su uso (temporal dead zone) — se reordenó la lógica.
   - `setActiveCustomer` (no existía) → reemplazado por `setCustomers` con actualización correcta del registro.
   - `handleGenerateCopilot` definido (faltaba).
   - `saveConfig` ahora es `async` y se `await` en todos los call sites.

---

## 📌 Verificación & Rutas de Desarrollo

- **Proyecto Base:** `/opt/omnimessaging` (compilado con `npm run build`).
- **Paquete Chrome Descomprimido:** `/home/marcelompz/Downloads/omnibot-chrome`
- **Paquete Firefox Empaquetado `.zip`:** `/home/marcelompz/Downloads/omnibot-firefox.zip`
- **Paquete Firefox Descomprimido:** `/home/marcelompz/Downloads/omnibot-firefox`
- **Archivos Públicos Servidos en Web:** `/opt/orderflow/frontend/public/downloads/omnibot-chrome.zip` y `omnibot-firefox.zip`
