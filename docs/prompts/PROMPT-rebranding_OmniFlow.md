# Prompt de Ejecución: Refactoring & Migración Completa de Rebranding (OrderFlow -> OmniFlow)

## Contexto y Objetivo
Se requiere realizar una migración y refactorización técnica integral para actualizar el nombre, la arquitectura de nombres, dominios, componentes visuales e infraestructura del sistema conocido anteriormente como **OrderFlow** a su nuevo nombre definitivo: **OmniFlow**.

El objetivo es renombrar todas las referencias manteniendo la retrocompatibilidad en entornos de producción cuando sea necesario, actualizando proxies inversos, bases de datos, código fuente y la interfaz de usuario con la nueva identidad de marca.

---

## 1. Infraestructura y Proxy Inverso (Traefik & Docker)
1. **Traefik Configuration:**
   - Actualizar los *entrypoints*, *routers*, y *services* de `traefik-orderflow` a `traefik-omniflow`.
   - Modificar las reglas Host en las etiquetas de Docker (`traefik.http.routers...Host(...)`) para apuntar a los nuevos dominios `omniflow.*`.
   - Implementar redirecciones HTTP 301 permanentes desde los dominios/rutas antiguas (`orderflow.*`) hacia las nuevas (`omniflow.*`) para evitar interrupciones de servicio.
2. **Docker / Docker Compose:**
   - Renombrar imágenes, nombres de contenedores, redes Docker y volúmenes persistentes de `orderflow-*` a `omniflow-*`.
   - Modificar las variables de entorno relacionadas (ej. `ORDERFLOW_ENV` -> `OMNIFLOW_ENV`).

---

## 2. Base de Datos y Almacenamiento
1. **Estructura y Esquemas:**
   - Si la base de datos se llama `orderflow_db`, generar un script de migración/dump para renombrarla a `omniflow_db`.
   - Auditar tablas, secuencias, funciones almacenadas o triggers que contengan el prefijo o nombre `orderflow` y renombrarlos a `omniflow`.
2. **Datos Existentes:**
   - Actualizar registros de configuración del sistema, plantillas de correo, metadatos y Webhooks donde se exponga la URL antigua o el nombre anterior.

---

## 3. Código Fuente (Backend & Frontend)
1. **Backend (APIs, Servicios y Cron Jobs):**
   - Buscar y reemplazar globalmente en el repositorio las variantes del nombre:
     - `OrderFlow` / `orderflow` / `order_flow` / `ORDER_FLOW` -> `OmniFlow` / `omniflow` / `omni_flow` / `OMNI_FLOW`.
   - Renombrar espacios de nombres (namespaces), paquetes, clases base, endpoints API y archivos de configuración.
   - Revisar colas de mensajes (Redis/RabbitMQ) y nombres de tareas programadas.
2. **Frontend & Diseño:**
   - Reemplazar isotipos, logos y favicons por los nuevos activos visuales de OmniFlow.
   - Actualizar la paleta de colores CSS/Tailwind según el manual:
     - **Púrpura Primario:** `#4B1E6B`
     - **Teal Accesible (Modo Claro):** `#007A72`
     - **Teal Original (Acentos / Modo Oscuro):** `#00B4A6`
     - **Fondo Oscuro:** `#0F0F1A`
   - Actualizar variables tipográficas (`Plus Jakarta Sans` / `Satoshi` / `Inter`).
   - Cambiar los títulos HTML, meta-tags OpenGraph, y el Tagline corporativo a: `"HIGH-SPEED OMNI-SYSTEM"`.

---

## 4. Integraciones de Terceros & Servicios Externos
1. **OAuth / Proveedores de Autenticación:**
   - Actualizar las URLs de redirección (Redirect URIs) y el nombre de la app en Google Auth, Meta for Developers, WhatsApp Business API, etc.
2. **Webhooks:**
   - Mantener temporalmente endpoints antiguos de recepción de webhooks con alias/redirección para no perder eventos entrantes de gateways de pago o integraciones externas.
3. **Servicios de Email / Notificaciones:**
   - Actualizar el remitente de correos (ej. `soporte@omniflow.com`), firmas de plantilla y canales de notificación (Slack/Discord/Telegram bots).

---

## Entregables Solicitados
1. Plan paso a paso con los scripts necesarios (`bash`, `sql`, o `sed`) para ejecutar el refactor masivo de forma segura.
2. Lista de verificación (Checklist) posterior a la migración para validar que no haya referencias huérfanas en el sistema.