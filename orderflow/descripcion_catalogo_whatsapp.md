# OrderFlow — Módulo Catálogo de WhatsApp (Pency Style)

## Resumen Ejecutivo

El **Módulo Catálogo de WhatsApp** de OrderFlow habilita un portal web público, autogestionado y de alta conversión que permite a los clientes explorar el menú o catálogo del comercio, seleccionar productos organizados por categorías, completar sus datos de entrega y emitir el pedido formateado directamente hacia la cuenta de WhatsApp del comercio.

A diferencia de catálogos estáticos o conversaciones informales por chat, este módulo actúa como un **e-commerce ligero desacoplado**, registrando cada orden en la base de datos central de OrderFlow antes de iniciar el chat, garantizando trazabilidad, métricas y control operativo.

---

## 🚀 Características Principales

* 🛒 **Catálogo Visual de Alta Conversión:** Interfaz *mobile-first* optimizada con acordeones interactivos y colapsables agrupados por categorías para facilitar la navegación rápida en menús amplios.
* 📱 **Checkout Express para WhatsApp:** Formulario fluido para la captura estandarizada de datos de entrega (dirección, mesa, retiro), método de pago y observaciones antes del envío.
* 💾 **Registro previo en Backend (OrderFlow):** Guarda el pedido en la base de datos central antes del redireccionamiento, garantizando auditoría, análisis de ventas y control de stock.
* 🖼️ **Portada Adaptativa por Rubro:** Banners dinámicos por industria (Cafetería, Spa, Retail, Automotriz) que mantienen la estética visual aun si el comercio no ha subido una portada propia.
* 🔒 **API Pública Protegida:** Endpoint seguro para consultar la configuración e inventario público del catálogo utilizando la clave API del Tenant.

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

---

## 🔥 Ventajas Comparativas vs. Catálogo Nativo de WhatsApp Business

| Dimensión | Catálogo Nativo WhatsApp | Módulo Catálogo OrderFlow |
| :--- | :--- | :--- |
| **Registro de Órdenes** | El pedido vive únicamente en el historial del chat. Sin trazabilidad centralizada. | **Persistencia en BD:** La orden se registra en OrderFlow antes del redireccionamiento al chat. |
| **Captura de Datos** | Requiere intercambio manual de mensajes para solicitar dirección, pago o datos de facturación. | **Checkout Express:** El pedido llega a WhatsApp 100% completo y listo para preparar o despachar. |
| **Cálculo de Costos** | No suma costos de envío ni cargos adicionales al total del carrito. | **Delivery Automatizado:** Calcula y añade `deliveryCost` al total general de forma automática. |
| **Experiencia de Usuario (UX)** | Listado vertical único que se vuelve denso en inventarios medianos o grandes. | **Categorías Colapsables:** Acordeones interactivos que agilizan la búsqueda visual. |
| **Branding & Canal** | Limitado al formato estándar de Meta dentro del perfil. | **Portal Web Propio:** Dominio personalizado (`pedidos.tu-negocio.com`), branding y enlaces. |
| **Atención en Salón (QR)** | Diseñado principalmente para delivery/mensajería individual. | **Modo Mesa / Salón:** Ideal para QR en mesas; el cliente pide directamente sin agregar contactos. |

---

## 📌 Guía de Publicación e Integración

Para maximizar la conversión, se recomienda difundir la URL del catálogo (`https://pedidos.tu-negocio.com/whatsapp-catalog`) a través de los siguientes canales:

1. **Perfil de WhatsApp Business:** Configurar la URL en `Ajustes > Herramientas para la empresa > Perfil de la empresa > Sitio web`.
2. **Auto-respondedor / Saludo Automático:** Enviar la URL automáticamente en el mensaje de bienvenida inicial.
3. **Link en Biografía de Redes Sociales:** Agregar el enlace en Instagram y Facebook con llamadas a la acción claras (*"Haz tu pedido aquí 👇"*).
4. **Códigos QR en Mesas y Puntos de Venta:** Imprimir el QR en acrílicos o manteles individuales para pedidos rápidos en sitio.
