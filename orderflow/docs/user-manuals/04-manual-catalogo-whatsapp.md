# 💬 Manual de Usuario: Catálogo Social & Menú Digital Omnicanal (`v1.20.85+`)

> **Módulos:** Catálogo Social / Menú Digital (`/admin/social-catalog` y `/admin/whatsapp-catalog`)  
> **Rutas Públicas:** Catálogo Web (`/tienda`, `/social-catalog/:instanceKey`, `<subdominio>.pesallaccia.com`, `provecchio.com`)  
> **Destinado a:** Administradores, Gerentes de Tienda, Vendedores y Clientes Finales  

---

## 1. Introducción

El **Catálogo Social & Menú Digital** es una plataforma interactiva omnicanal diseñada para exhibir productos, servicios y cartas de menú digital con estética moderna, rendimiento optimizado y adaptación automática a múltiples canales de venta (WhatsApp, Pasarela de Pagos online o Carta digital informativa).

---

## 2. Modos de Venta Disponibles (`saleMode`)

Desde la sección **🛒 Modo de Venta** en `/admin/social-catalog`, el administrador puede seleccionar la modalidad operativa del negocio:

| Modo de Venta | Descripción | Comportamiento del Carrito |
| :--- | :--- | :--- |
| **Free (WhatsApp)** | Pre-venta manual con redirección a WhatsApp comercial. | El cliente arma su pedido y lo envía formateado con 1-Click al WhatsApp del negocio. |
| **Premium (Online)** | Venta directa con checkout y pasarela de pago integrada. | Procesa pagos online (Stripe, Mercado Pago) y registra el pedido directamente en OrderFlow. |
| **Static (Menú Digital)** | Carta digital o catálogo informativo sin recepción de pedidos. | Deshabilita el envío de pedidos. El botón en el carrito muestra `🚫 Enviar Pedido Deshabilitado` y despliega un aviso informativo. |

> [!NOTE]
> **Modo Estático (Menú Digital):** En el modo `Static`, los clientes pueden explorar el catálogo, ver precios y simular su consumo, pero el sistema bloquea los intentos de checkout para adaptarse a restaurantes o locales físicos que utilizan el código QR exclusivamente como carta digital informativa.

---

## 3. Experiencia de Compra del Cliente y Controles en Tarjeta

### 3.1 Selector Dinámico de Cantidad en la Tarjeta (`[ - ] 1 [ + ]`)
- **Agregado con 1-Click:** Al presionar el botón `[ + Agregar ]` por primera vez en cualquier tarjeta (en vista Grid o Lista), el producto se añade al carrito y el botón se transforma inmediatamente en un selector dinámico de unidades:
  $$\text{Selector de Cantidad: } [\;\mathbf{-}\;] \quad \mathbf{N} \quad [\;\mathbf{+}\;]$$
- **Incrementar/Decrementar sin abrir el Carrito:** El cliente puede ajustar la cantidad deseada (`1`, `2`, `3`...) tocando los botones `+` o `-` directamente sobre la tarjeta del producto.
- **Remoción Automática:** Si la cantidad disminuye a `0`, el producto se elimina del carrito y la tarjeta retorna limpiamente a su estado inicial `[ + Agregar ]`.

### 3.2 Control Visual de Inventario y Stock (`showStock`)
- En `/admin/social-catalog` $\rightarrow$ *Página y configuración*, se puede activar o desactivar la casilla **Mostrar inventario (stock)**.
- **Cuando está activada (`showStock: true`):** El catálogo muestra las etiquetas de disponibilidad (*"Última unidad"*, *"En Stock"*) y bloquea la compra de ítems agotados con el texto *"Sin stock"*.
- **Cuando está desactivada (`showStock: false`):** Se ocultan todas las leyendas y avisos de *"Sin stock"*, permitiendo que el cliente visualice y arme su pedido sin bloqueos por inventario cero.

---

## 4. Gestión de Categorías y Jerarquías de Productos

### 4.1 Administración de Categorías (`/admin/products` / `/admin/social-catalog`)
- **Gestión Completa de Categorías:** Permite estructurar el menú en jerarquías de nivel padre/hijo (ejemplo: *"Para comer"* $\rightarrow$ *"Bruschettas"*, *"Mixtos"*, *"Croissants"*, y *"Para beber"* $\rightarrow$ *"Café"*, *"Jugos"*, *"Cerveza artesanal"*).
- **Iconografía y Fondos:** Cada categoría admite imágenes de fondo personalizadas y paleta de colores adaptable al tema visual del negocio.

### 4.2 Renombrado y Propagación Automática
- Al cambiar el nombre de una categoría (ej. de *"COMIDAS"* a *"Para comer"*), el sistema ejecuta una propagación masiva en segundo plano:
  1. Actualiza la columna `product.category` en todos los productos asociados del tenant.
  2. Actualiza los metadatos JSON (`posCategory`, `productCategory`, `posSubcategory`).
  3. Sincroniza la lista de inclusión de categorías (`includedCategoryIds`) en la configuración persistida del módulo para asegurar que el catálogo mantenga el 100% de la visibilidad sin requerir reconfiguraciones manuales.

---

## 5. Dominio Personalizado y Aislamiento Multi-Tenant

El sistema resuelve automáticamente el contexto del negocio a través de múltiples esquemas de acceso con aislamiento estricto nivel Row-Level Security (RLS):
- **Dominio Personalizado:** `https://provecchio.com`
- **Subdominio Exclusivo:** `https://dimora.pesallaccia.com`
- **Ruta Multitenant:** `https://pesallaccia.com/social-catalog/provecchio`

---

## 6. Personalización Visual del Catálogo

1. **Banner Promocional y Encabezado:** Selección de posición (`center`, `top`, `bottom`) y modo de ajuste (`cover` / `contain`).
2. **Paleta de Colores Dinámica:** Configuración de color primario, fondo de encabezado y fondo del cuerpo con soporte automático para tema claro y oscuro (*Dark Mode*).
3. **Botones de Redes Sociales:** Enlaces oficiales a WhatsApp, Instagram, Facebook, Telegram y Google Maps con íconos vectoriales de alta definición.
