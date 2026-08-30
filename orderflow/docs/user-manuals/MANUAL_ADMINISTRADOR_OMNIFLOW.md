# 👑 Guía Maestra del Administrador: OmniFlow SaaS (`v1.20.38`)

> **Ubicación:** `docs/user-manuals/MANUAL_ADMINISTRADOR_OMNIFLOW.md`  
> **Versión:** `v1.20.38+`  
> **Fecha:** 26 de Agosto de 2026  
> **Perfil:** Administradores, Gerentes de Operaciones, Directores Financieros y Superusuarios.

---

## 📌 1. BIENVENIDA Y VISIÓN GENERAL DEL PANEL ADMIN

Como Administrador de **OmniFlow**, tienes acceso al control total y centralizado de la operación omnicanal de tu empresa. El panel de administración te permite gestionar desde un solo lugar la presencia digital, las ventas en tienda (POS), la producción en cocina/fábrica (KDS/MRP), el inventario en múltiples bodegas, las compras, la tesorería y la sincronización nativa con Odoo ERP.

---

## 🛠️ 2. MÓDULOS DE ADMINISTRACIÓN Y GUÍAS DE OPERACIÓN

### 1. 🛍️ Gestión de Catálogo, Menú Digital y Productos (Carga Masiva)
- **Creación y Edición de Productos:** Configuración de precios, imágenes, código de barras, SKU y variantes.
- **Modos de Venta (Free, Premium, Static):** Selección de modalidad operativa (pre-venta WhatsApp, pasarela de pago online o Menú Digital Informativo con checkout deshabilitado).
- **Selector Dinámico de Cantidad:** Selección interactiva `[ - ] count [ + ]` directamente desde las tarjetas del catálogo sin requerir apertura del carrito.
- **Control de Inventario (`showStock`):** Visualización u ocultamiento de banderas y avisos de stock sin bloqueos a la venta.
- **Carga y Actualización Masiva por Excel:** Importación/exportación de productos por UUID e `skuInterno` sin duplicados.
- **Recetas y Escandallos (POS BoM):** Configuración de productos compuestos que descuentan insumos atómicamente al venderse.
- 📖 *Manuales vinculados:* [Manual 04: Catálogo Social & Menú Digital](04-manual-catalogo-whatsapp.md), [Manual 18: POS BoM Recetas](18-manual-omnipos-kds-recetas-bom.md).

### 2. 🖥️ Punto de Venta (POS) & Pantallas de Cocina (KDS)
- **Apertura y Cierre de Turnos POS:** Control de fondo fijo de caja, arqueos y rendiciones de ventas.
- **Enrutamiento de KDS por Estaciones:** Asignación de comanda a pantallas de Cocina, Bar o Parrilla con semáforo SLA de tiempos (Verde, Amarillo, Rojo).
- 📖 *Manuales vinculados:* [Manual 02: POS & KDS](02-manual-pos-kds.md), [Manual 14: Arqueos de Caja](14-manual-cierre-caja-rendicion-pos-odoo.md), [Manual 18: KDS SLA](18-manual-omnipos-kds-recetas-bom.md).

### 3. 🏬 Inventario Multibodega, Reservas & Manufactura (MRP)
- **Transferencias entre Bodegas:** Albaranes y transferencias internas con actualización inmediata del Kardex.
- **Control de Stock de Doble Entrada:** Movimientos atómicos `StockMove`/`StockQuant` y conversión de unidades ($g \leftrightarrow kg$).
- **Órdenes de Fabricación (MRP):** Consumo de materia prima y entrada de producto terminado con control de mermas.
- 📖 *Manuales vinculados:* [Manual 10: Inventario & Reservas](10-manual-inventario-reservas.md), [Manual 15: Transferencias Multibodega](15-manual-inventario-multibodega-albaranes-odoo.md), [Manual 17: MRP Manufactura](17-manual-manufactura-mrp-escandallos-uom.md).

### 4. 🛍️ Compras (Purchases) y Finanzas Operativas Multi-Moneda
- **Proveedores & Órdenes de Compra:** Emisión de OC con congelamiento de tasa de cambio multi-divisa (PYG, USD, BRL, ARS).
- **Recepción de Mercaderías & Facturas AP:** Impacto automático en Kardex al recibir OC y creación de Factura de Proveedor (`SupplierBill`).
- **Tesorería & Flujo de Caja:** Registro de egresos, pagos a proveedores y balance consolidado de caja (`CashFlow`).
- 📖 *Manuales vinculados:* [Manual 22: Motor Multimoneda](22-manual-motor-multimoneda-dinamico.md), [Manual 23: Compras & Finanzas Multi-Moneda](23-manual-compras-y-finanzas-multimoneda.md).

### 5. 💼 Fuerza de Ventas B2B & Cotizaciones
- **Listas de Precios Mayoristas:** Precios por categoría de cliente y cotizaciones formales B2B.
- **Descuentos por Volumen:** Escalas de precios automáticas por volumen de compra y conversión directa a pedido de venta.
- 📖 *Manuales vinculados:* [Manual 19: Fuerza de Ventas B2B](19-manual-fuerza-de-ventas-b2b-presupuestos.md).

### 6. 💳 Cartera de Clientes, Crédito & Facturación Legal
- **Límites de Crédito:** Asignación de líneas de crédito en cuenta corriente y bloqueo automático ante mora.
- **Facturación Electrónica SISET/KUDE:** Generación e integración de facturas legales con envío automático de KUDE por WhatsApp.
- 📖 *Manuales vinculados:* [Manual 12: Crédito de Clientes](12-manual-cartera-clientes-limite-credito-odoo.md), [Manual 13: KUDE & WhatsApp](13-manual-facturacion-legal-notificacion-sifen-whatsapp.md).

### 7. 🎨 Storefront, Diseñador Visual & Marketing Viral
- **Diseñador Drag & Drop:** Personalización visual de la Landing Page, catálogo web y Bio-Links.
- **Fidelización Virales & Sorteos:** Campañas de puntos por compra y captación de leads en redes sociales.
- 📖 *Manuales vinculados:* [Manual 01: Diseñador Portada](01-manual-disenador-portada.md), [Manual 05: Sorteos Virales](05-manual-fidelizacion-sorteos.md), [Manual 20: Storefront Builder](20-manual-storefront-builder-standalone.md).

### 8. 📊 Analítica de Negocios OmniBI
- **Dashboard Comparativo YoY:** Mapeo de ventas comparando año a año y rentabilidad omnicanal.
- 📖 *Manuales vinculados:* [Manual 21: OmniBI Analytics YoY](21-manual-omnibi-analytics-yoy.md).

### 9. 🔌 Integraciones Odoo ERP & Autenticación SSO
- **Sincronización Odoo CE (v14/v18/v19):** Webhooks bidireccionales de ventas, inventario y productos.
- **Autenticación Unificada SSO:** Inicio de sesión único con credenciales Odoo OAuth2.
- 📖 *Manuales vinculados:* [Manual 08: Deploy Manager](08-manual-deploy-manager-odoo.md), [Manual 11: Odoo Webhooks](11-manual-sincronizacion-webhooks-odoo.md), [Manual 16: SSO OAuth2](16-manual-autenticacion-sso-odoo-oauth2.md).

---

## 📚 3. ÍNDICE COMPLETO DE LOS 23 MANUALES PASO A PASO

Para consultar el detalle paso a paso de cualquier módulo específico, puedes revisar el índice principal:

👉 **[Índice General de Manuales de Usuario (README.md)](README.md)**
