# 📖 MANUAL DE USUARIO Y ADMINISTRACIÓN - ORDERFLOW SAAS PLATFORM

**Fecha:** 2026-06-28  
**Versión de Documentación:** v0.1.0-alpha.6  
**Público Objetivo:** Administradores de Comercio (Tenants), Operarios, Equipos de Ventas

---

## 1. 🌟 INTRODUCCIÓN A ORDERFLOW

OrderFlow es una plataforma de gestión de pedidos y reservas multi-tenant. Permite a los comercios gestionar su catálogo de productos, coordinar citas/turnos con profesionales, registrar clientes y automatizar la sincronización de sus ventas con sistemas administrativos (ERP Odoo), todo desde una interfaz unificada.

---

## 📱 2. CATÁLOGO DE WHATSAPP (CLIENTES)

El módulo de Catálogo de WhatsApp (estilo Pency) permite a tus clientes navegar por tu catálogo público de productos y servicios desde cualquier dispositivo móvil o de escritorio, armar un carrito de compras y enviarte el pedido directamente a tu número de WhatsApp.

### 🌐 Cómo Acceder al Catálogo
- Los clientes ingresan al catálogo público a través de la URL de tu tienda. En tu ambiente local, la dirección de acceso es:
  `http://localhost:3011/whatsapp-catalog` (o haciendo clic en el botón flotante **Pedir por WhatsApp** en la portada de la tienda).

### 🛒 Experiencia de Compra del Cliente
1. **Navegación:** Los clientes pueden visualizar la portada del comercio, su mensaje de bienvenida y buscar productos filtrándolos por categorías colapsables (acordeones).
2. **Armar el Carrito:** Los productos se agregan con el botón **(+)**. El sistema mantiene de forma permanente el carrito del cliente (incluso si cierra la pestaña del navegador).
3. **Checkout (Confirmación del Pedido):**
   Al hacer clic en **Ver Carrito** e ingresar a la pantalla de pago, el cliente completa sus detalles:
   - **Nombre Completo:** Identificación para el pedido.
   - **Método de Entrega:**
     * *Retirar en el comercio:* Muestra la dirección física configurada por el comercio.
     * *Envío a domicilio:* Despliega un campo para completar la dirección de envío. Suma dinámicamente el costo de delivery configurado.
   - **Forma de Pago:** Efectivo, Transferencia Bancaria o Tarjeta de crédito/débito.
   - **Aclaraciones (Opcional):** Comentarios adicionales (ej. "Entregar después de las 18hs").

### 💬 Redirección y Envío de Mensaje
* Al presionar **Completar Pedido en WhatsApp**, el sistema registra la compra en la base de datos de la plataforma y genera un código único de referencia.
* Inmediatamente, se abre una nueva pestaña redirigiendo al cliente a WhatsApp con un texto pre-redactado y estructurado con el desglose de productos, cantidades, subtotal, costo de envío y el total estimado. El cliente solo debe presionar "Enviar".

---

## ⚙️ 3. CONFIGURACIÓN DEL COMERCIO (ADMINISTRADORES)

Como administrador de tu tienda, puedes activar y parametrizar el funcionamiento de tu catálogo y canal de WhatsApp desde el panel de control.

### 🛠️ Acceder a la Configuración de Módulos
1. Inicia sesión en el portal administrativo (`http://localhost:3011/admin`).
2. Dirígete a la sección de **App Store** o gestión de módulos.
3. Busca el bloque **Catálogo de WhatsApp (Pency)** y presiona el botón **Configurar**.

### 📝 Campos de Configuración Disponibles

| Campo | Descripción | Ejemplo de Uso |
|---|---|---|
| **Número de WhatsApp** | Número telefónico de tu negocio que recibirá los mensajes de pedidos. Debe incluir código de país, sin espacios ni caracteres especiales. | `+595994860807` |
| **Mensaje de Bienvenida** | Texto o banner destacado que se visualiza en la parte superior del catálogo del cliente. | `"¡Gracias por elegirnos! Pedidos de lunes a sábados."` |
| **Dirección Física** | Ubicación de tu local. Este texto se renderizará automáticamente en las opciones de "Retirar en el comercio" en el checkout. | `"Villarrica ###, frente a la plaza principal."` |
| **Enlace de Google Maps** | URL de tu ubicación física para que los clientes puedan llegar fácilmente. | `https://maps.app.goo.gl/...` |
| **Enlaces de Redes Sociales** | Enlaces directos a tu perfil de Instagram y página de Facebook para fidelizar clientes. | `https://instagram.com/tucomercio` |
| **Costo de Envío** | Monto fijo en moneda local que se sumará automáticamente al total si el cliente elige "Envío a domicilio". | `15000` |

*Presiona **Guardar Configuración** para aplicar los cambios en tiempo real.*

---

## 🩺 4. MONITOREO DE INFRAESTRUCTURA (SÚPER ADMINISTRADORES)

Si gestionas la plataforma completa (Súper Administrador), tienes a tu disposición un panel de control técnico para verificar la salud del ecosistema SaaS.

### 📊 Semáforos de Salud
- Accediendo a la sección de Súper Administrador, verás una pantalla de salud del sistema que consulta la API cada 30 segundos de forma automática.
- **Database (PostgreSQL):** Muestra un semáforo verde si la base de datos responde de forma óptima.
- **Odoo Adapter:** Muestra un semáforo verde si el microservicio de sincronización con el ERP está en línea y en comunicación con el backend de OrderFlow.
- En caso de caída de algún servicio, el panel se tornará rojo de inmediato y mostrará detalles técnicos del error para facilitar la corrección antes de que afecte a los comercios.
