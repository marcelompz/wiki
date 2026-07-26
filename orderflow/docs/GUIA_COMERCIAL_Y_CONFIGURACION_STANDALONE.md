# 📘 Guía Comercial y de Configuración: Suite de Microservicios Standalone (OrderFlow Micro-SaaS)

> **Documento Vivo Comercial y Técnico de Operaciones**  
> **Fecha de Emisión:** 2026-07-26  
> **Versión de la Suite:** v1.0.0 (6 Microservicios Standalone Operativos)

---

## 🎯 1. Filosofía Comercial de la Suite Standalone

OrderFlow permite empaquetar y vender sus 6 módulos de alto impacto de **forma 100% independiente** como micro-SaaS independientes (*Standalone Products*), o como parte de la suite omnicanal completa.

### 💡 Ventajas para la Venta:
1. **Menor Fricción de Entrada (Low Barrier to Entry):** Un cliente puede comenzar comprando *solo* el módulo de Sorteos por $15/mes o el Link-in-Bio por $9/mes sin necesidad de migrar toda su infraestructura.
2. **Upselling Progresivo (Land & Expand):** Una vez que el cliente utiliza un microservidor (ej. Bio-Links), se facilita la venta cruzada hacia la plataforma completa de POS/ERP.
3. **Despliegue Ultra-Rápido:** Cada microservicio corre en su propio contenedor Docker independiente con **subdominio dinámico automático** vía Traefik v3.3 y SSL Let's Encrypt.

---

## 🛍️ 2. Catálogo Comercial, Tarificación & Guía de Configuración

---

### 🎁 Microservicio 1: `giveaways-standalone` (Sorteos Virales)

* **Target:** Marcas, eCommerce, Influencers, Agencias de Marketing.
* **Pricing Sugerido:** `$15 / mes` (Hasta 3 sorteos activos) | `$35 / mes` (Ilimitado + Google OAuth).
* **Puerto Backend:** `:3020`
* **Dominio por Defecto:** `sorteos.pesallaccia.com` (o `sorteos.tudominio.com`)

#### ⚙️ Guía de Configuración del Cliente:
1. **Creación del Tenant:** Generar la API Key del cliente desde el SuperAdmin o pasándole su JWT token.
2. **Configuración de Variables (`.env`):**
   ```env
   PORT=3020
   JWT_SECRET=orderflow-secret-key
   GOOGLE_CLIENT_ID=su_google_client_id # Opcional para autocompletado OAuth
   ```
3. **Flujo de Uso del Cliente:**
   - Accede a `https://sorteos.tudominio.com/admin/login`
   - Configura el premio, portada (video/imagen), UTMs y formulario.
   - Publica la landing page pública en `https://sorteos.tudominio.com/sorteo/:id`

---

### 💬 Microservicio 2: `whatsapp-catalog-standalone` (Catálogo Rápido WhatsApp)

* **Target:** Gastronómicos, Tiendas de Ropa, Comercio de Barrio.
* **Pricing Sugerido:** `$19 / mes` (Hasta 200 productos) | `$39 / mes` (Productos ilimitados + Modificadores).
* **Puerto Backend:** `:3021`
* **Dominio por Defecto:** `catalogo.pesallaccia.com`

#### ⚙️ Guía de Configuración del Cliente:
1. **Configuración del Número WhatsApp:** En la administración del cliente, registrar el número telefónico receptor de pedidos (ej. `+595981123456`).
2. **Carga de Productos:** Importar masivamente vía CSV o mediante la API REST.
3. **Flujo de Uso del Cliente:**
   - El cliente final ingresa a `https://catalogo.tudominio.com/:tenantSlug`
   - Llena el carrito en 2 clics y presiona **"Enviar Pedido a WhatsApp"**.
   - Se abre la app de WhatsApp con el mensaje estructurado con productos, totales y ubicación.

---

### 🔗 Microservicio 3: `biolinks-standalone` (Link in Bio & Fast Checkout)

* **Target:** Marcas personales, Creadores de Contenido, Marcas de Moda.
* **Pricing Sugerido:** `$9 / mes` (Starter) | `$25 / mes` (Pro con checkout directo).
* **Puerto Backend:** `:3022`
* **Dominio por Defecto:** `bio.pesallaccia.com`

#### ⚙️ Guía de Configuración del Cliente:
1. **Personalización de Slug:** El cliente selecciona su alias único (ej. `bio.tudominio.com/mi-marca`).
2. **Editor de Bloques:** Añadir enlaces social media, botones de pago directo, catálogo destacado y temas de diseño personalizados.
3. **Flujo de Uso:**
   - El cliente coloca la URL en su bio de Instagram / TikTok / WhatsApp.
   - Recibe analíticas en tiempo real de clics, conversiones y ventas efectuadas.

---

### 📅 Microservicio 4: `bookings-standalone` (Turnos, Barberías & Spas)

* **Target:** Spas, Peluquerías, Consultorios Médicos, Canchas Deportivas.
* **Pricing Sugerido:** `$29 / mes` (1 Agenda) | `$69 / mes` (Agendas ilimitadas + Comisiones Staff).
* **Puerto Backend:** `:3023`
* **Dominio por Defecto:** `turnos.pesallaccia.com`

#### ⚙️ Guía de Configuración del Cliente:
1. **Definición de Servicios y Profesionales:** Configurar la duración (en minutos), el costo y las comisiones asignadas a los empleados.
2. **Cálculo Transaccional de Disponibilidad:** El motor bloquea automáticamente los horarios solapados y evita doble reserva (*overbooking*).
3. **Flujo de Uso:**
   - El usuario final selecciona fecha, hora y especialista en `https://turnos.tudominio.com`.
   - Recibe la confirmación por email / SMS / WhatsApp.

---

### 📄 Microservicio 5: `quotations-standalone` (Presupuestos & Cotizaciones B2B)

* **Target:** Mayoristas, Talleres, Proveedores de Servicios, Empresas B2B.
* **Pricing Sugerido:** `$25 / mes` (Hasta 100 cotizaciones) | `$59 / mes` (Ilimitado + PDF + Validez SET).
* **Puerto Backend:** `:3024`
* **Dominio por Defecto:** `presupuestos.pesallaccia.com`

#### ⚙️ Guía de Configuración del Cliente:
1. **Branding Corporativo:** Cargar el logotipo, RUC/NIT, pie de página legal y días de validez por defecto (ej. 15 días).
2. **Emisión e Impresión:** Generar cotizaciones en PDF con código QR y validez fiscal oficial (DNIT/SET).
3. **Flujo de Uso:**
   - Emitir presupuesto e invitar al cliente a aceptar/rechazar en línea.
   - Al ser aceptado, se puede convertir automáticamente en una orden de venta.

---

### 🏆 Microservicio 6: `loyalty-standalone` (Programa de Fidelización)

* **Target:** Cafeterías, Supermercados, Cadenas de Retail.
* **Pricing Sugerido:** `$39 / mes` (Hasta 1.000 clientes) | `$89 / mes` (Ilimitado + Niveles Tiers).
* **Puerto Backend:** `:3025`
* **Dominio por Defecto:** `fidelizacion.pesallaccia.com`

#### ⚙️ Guía de Configuración del Cliente:
1. **Reglas de Acumulación:** Definir la equivalencia (ej. $1 USD invertido = 10 Puntos).
2. **Configuración de Niveles (Tiers):**
   - `BRONZE`: 0 - 999 pts
   - `SILVER`: 1.000 - 4.999 pts
   - `GOLD`: 5.000 - 9.999 pts
   - `PLATINUM`: 10.000+ pts
3. **Escaneo de Código de Barras:** Integración nativa mediante lectores de código de barras USB/Bluetooth en el Punto de Venta o App Móvil.

---

## 🚀 3. Instrucciones Rápidas de Despliegue en VPS

Para levantar y actualizar el ecosistema standalone en producción:

```bash
# 1. Ingresar al directorio principal
cd /srv/orderflow

# 2. Desplegar los 6 microservicios en segundo plano
docker compose -f docker-compose.standalone.yml up -d --build

# 3. Verificar el estado de salud de todos los contenedores
docker compose -f docker-compose.standalone.yml ps
```

---

## 🔄 4. Facturación & Aprovisionamiento Automático

Todos los microservicios utilizan el endpoint unificado de cobro en el backend central:
- **Webhook de Pago:** `POST https://orderflow.pesallaccia.com/api/v1/billing/webhooks/payment`
- Al aprobarse un pago en **Stripe** o **Mercado Pago**, la suscripción del tenant se actualiza automáticamente y se extienden los permisos del microservicio contratado.
