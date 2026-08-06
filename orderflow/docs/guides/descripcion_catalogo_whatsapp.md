# OrderFlow — Módulo Catálogo de WhatsApp

## Resumen Ejecutivo

El **Módulo Catálogo de WhatsApp** de OrderFlow habilita un portal web público, autogestionado y de alta conversión que permite a los clientes explorar el menú o catálogo del comercio, seleccionar productos organizados por categorías, completar sus datos de entrega y emitir el pedido formateado directamente hacia la cuenta de WhatsApp del comercio.

A diferencia de catálogos estáticos o conversaciones informales por chat, este módulo actúa como un **e-commerce ligero desacoplado**, registrando cada orden en la base de datos central de OrderFlow antes de iniciar el chat, garantizando trazabilidad, métricas y control operativo.

---

## 🚀 Características Principales

* 🛒 **Catálogo Visual Mobile-First:** Interfaz optimizada con barra horizontal de categorías sticky, scroll-spy, tarjetas compactas horizontales y controles de cantidad inline.
* 📱 **Checkout Express para WhatsApp:** Formulario fluido con sticky CTA en mobile, selección de método de entrega, zonas de envío, GPS, método de pago y validación completa antes del envío.
* 💾 **Registro previo en Backend (OrderFlow):** Guarda el pedido en la base de datos central antes del redireccionamiento, garantizando auditoría, análisis de ventas y control de stock.
* 🖼️ **Portada Adaptativa por Rubro:** Banners dinámicos por industria (Cafetería, Spa, Retail, Automotriz) que mantienen la estética visual aun si el comercio no ha subido una portada propia.
* ⏰ **Estado del Local:** Indicador dinámico de Abierto/Cerrado según `businessHours` configurado.
* 🔒 **API Pública Protegida:** Endpoint seguro para consultar la configuración e inventario público del catálogo utilizando subdominio o API key del Tenant.
* ⚙️ **Panel de Administración:** El Tenant Admin puede editar la página pública y administrar productos del catálogo.

---

## ⚙️ Estructura de Configuración (Manifiesto)

La configuración del portal se parametriza desde el panel de administración de OrderFlow mediante los siguientes campos:

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `whatsappNumber` | *String* | Número receptor de pedidos con código de país (ej. `+595994860807`). |
| `welcomeMessage` | *String* | Mensaje destacado o subtítulo de bienvenida visible en la cabecera. |
| `address` | *String* | Dirección física legible del local comercial. |
| `mapsUrl` | *String* | Enlace directo a Google Maps para retiro o referencias de delivery. |
| `instagramUrl` | *String* | Enlace al perfil oficial de Instagram. |
| `facebookUrl` | *String* | Enlace a la página oficial de Facebook. |
| `deliveryCost` | *Number* | Costo base fijo de envío/delivery (ej. `15000` PYG). |
| `bannerUrl` | *String* | URL de imagen personalizada para la portada del catálogo. |
| `logoUrl` | *String* | URL del logo del comercio. |
| `customMessageTemplate` | *String* | Plantilla personalizada para el mensaje de WhatsApp con variables: `{orderId}`, `{clientName}`, `{deliveryMethod}`, `{items}`, `{total}`. |
| `deliveryZones` | *Array* | Lista de zonas de envío con costo: `[{ zone: "Centro", cost: 5000 }, ...]`. |
| `active` | *Boolean* | Activa/desactiva el catálogo público. |
| `businessHours` | *Array* | Horarios de atención por día: `[{ day: 1, open: "08:00", close: "20:00" }, ...]`. |

---

## 🔥 Ventajas Comparativas vs. Catálogo Nativo de WhatsApp Business

| Dimensión | Catálogo Nativo WhatsApp | Módulo Catálogo OrderFlow |
| :--- | :--- | :--- |
| **Registro de Órdenes** | El pedido vive únicamente en el historial del chat. Sin trazabilidad centralizada. | **Persistencia en BD:** La orden se registra en OrderFlow antes del redireccionamiento al chat. |
| **Captura de Datos** | Requiere intercambio manual de mensajes para solicitar dirección, pago o datos de facturación. | **Checkout Express:** El pedido llega a WhatsApp 100% completo y listo para preparar o despachar. |
| **Cálculo de Costos** | No suma costos de envío ni cargos adicionales al total del carrito. | **Delivery Automatizado:** Calcula y añade `deliveryCost` al total general de forma automática. |
| **Experiencia de Usuario (UX)** | Listado vertical único que se vuelve denso en inventarios medianos o grandes. | **Categorías Sticky + Scroll-spy:** Barra horizontal sticky con scroll-spy, tarjetas compactas y controls de cantidad inline. |
| **Branding & Canal** | Limitado al formato estándar de Meta dentro del perfil. | **Portal Web Propio:** Dominio personalizado (`pedidos.tu-negocio.com`), branding y enlaces. |
| **Atención en Salón (QR)** | Diseñado principalmente para delivery/mensajería individual. | **Modo Mesa / Salón:** Ideal para QR en mesas; el cliente pide directamente sin agregar contactos. |
| **Administración** | Gestión limitada dentro de Meta Business Suite. | **Panel de Administración:** El Tenant Admin edita la página pública, banner, logo, textos y productos. |

---

## 🔐 Resolución de Tenant y Parámetros de Consulta

El endpoint público unificado soporta dos modos de resolución:

- **Por subdominio (preferido):** `?subdomain=wellness` o ruta `/:subdomain/products`. Usado cuando la página se accede desde un subdominio Traefik del tenant.
- **Por API key (fallback):** `?apiKey=<tenant-api-key>`. Usado cuando no hay subdominio disponible.

La página `/whatsapp-catalog` prioriza el subdominio resuelto por `BrandingProvider` o la configuración del tenant para evitar consultar productos de otros tenants. El backend expone el campo `subdomain` en la respuesta pública del tenant para que el frontend lo reutilice.

---

## 📌 Guía de Publicación e Integración

Para maximizar la conversión, se recomienda difundir la URL del catálogo (`https://pedidos.tu-negocio.com/whatsapp-catalog`) a través de los siguientes canales:

1. **Perfil de WhatsApp Business:** Configurar la URL en `Ajustes > Herramientas para la empresa > Perfil de la empresa > Sitio web`.
2. **Auto-respondedor / Saludo Automático:** Enviar la URL automáticamente en el mensaje de bienvenida inicial.
3. **Link en Biografía de Redes Sociales:** Agregar el enlace en Instagram y Facebook con llamadas a la acción claras (*"Haz tu pedido aquí 👇"*).
4. **Códigos QR en Mesas y Puntos de Venta:** Imprimir el QR en acrílicos o manteles individuales para pedidos rápidos en sitio.

---

## 🛠️ Panel de Administración

El Tenant Admin accede a la administración del catálogo desde el dashboard principal en la sección **Catálogo WhatsApp**.

### Página y Configuración

Permite editar:
- Datos de contacto: número de WhatsApp, mensaje de bienvenida, dirección, mapa.
- Redes sociales: Instagram, Facebook.
- Envíos: costo base y zonas de envío personalizadas.
- Personalización: URL de banner, logo, plantilla de mensaje personalizada.
- Activación/desactivación del catálogo.

### Administración de Productos

El Tenant Admin puede:
- **Crear** nuevos productos con nombre, descripción, precio, categoría, stock, SKU e imágenes.
- **Editar** productos existentes: precio, stock, categoría, imágenes, descripción, orden.
- **Eliminar** productos (soft delete).

Los productos se administran desde la pestaña **Productos** dentro del panel de administración del catálogo.

---

## 📐 Arquitectura Técnica

### Backend

| Componente | Ruta |
| :--- | :--- |
| Servicio | `backend/src/whatsapp-catalog/whatsapp-catalog.service.ts` |
| Controlador Público | `backend/src/whatsapp-catalog/whatsapp-catalog.controller.ts` |
| Controlador Admin | `backend/src/whatsapp-catalog/whatsapp-catalog-admin.controller.ts` |
| Controlador SuperAdmin | `backend/src/whatsapp-catalog/whatsapp-catalog-superadmin.controller.ts` |
| Endpoints Públicos | `backend/src/products/public-catalog.controller.ts` |
| Endpoints Pedidos | `backend/src/orders/public-orders.controller.ts` |

### Frontend

| Componente | Ruta |
| :--- | :--- |
| Catálogo Público | `frontend/src/pages/whatsapp-catalog.tsx` |
| Checkout | `frontend/src/pages/whatsapp-checkout.tsx` |
| Panel Admin | `frontend/src/pages/admin/whatsapp-catalog.tsx` |
| Store del Carrito | `frontend/src/store/public-cart-store.ts` |

### Endpoints Principales

```
# Públicos
GET /api/v1/public/catalog/config?subdomain=wellness
GET /api/v1/public/catalog/products?subdomain=wellness
POST /api/v1/public/orders

# Admin Tenant
GET /api/v1/whatsapp-catalog/config
PUT /api/v1/whatsapp-catalog/config
GET /api/v1/whatsapp-catalog/products
POST /api/v1/whatsapp-catalog/products
PUT /api/v1/whatsapp-catalog/products/:id
DELETE /api/v1/whatsapp-catalog/products/:id
```

---

## 🔄 Flujo de Pedido

1. Cliente navega por el catálogo público, filtra por categorías y agrega productos al carrito.
2. Al presionar **Ver Pedido**, se abre el drawer del carrito con el resumen.
3. El cliente completa el formulario de entrega y pago en el checkout.
4. Al enviar, se registra la orden en OrderFlow y se abre WhatsApp con el mensaje formateado listo para enviar.

---

## 📝 Changelog

Ver `CHANGELOG.md` para el historial de versiones.
