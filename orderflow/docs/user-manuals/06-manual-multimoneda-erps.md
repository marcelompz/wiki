# 📖 Manual de Usuario: Sistema Multimoneda e Integraciones ERP (OrderFlow v1.5.1)

> **Dirigido a:** Administradores de Tenant, Usuarios de Ventas/POS, Operadores de E-commerce y Contadores.  
> **Versión:** 1.3.0  
> **Fecha:** 2026-07-31  

---

## 📋 ÍNDICE

1. [Introducción](#1-introducción)
2. [Gestión de Divisas y Moneda Base del Tenant](#2-gestión-de-divisas-y-moneda-base-del-tenant)
3. [Catálogo de Productos Multimoneda](#3-catálogo-de-productos-multimoneda)
4. [Ventas, POS y Pedidos Multimoneda](#4-ventas-pos-y-pedidos-multimoneda)
5. [Integración con ERPs (Tango, Odoo, Contabilium, Xubio)](#5-integración-con-erps-tango-odoo-contabilium-xubio)
6. [Preguntas Frecuentes y Soporte](#6-preguntas-frecuentes-y-soporte)

---

## 1. Introducción

Bienvenido al manual de usuario de las características de **Soporte Multimoneda** e **Integraciones ERP Normalizadas** de **OrderFlow v1.5.1**.

Con esta versión, OrderFlow permite operar comercialmente en múltiples divisas (Guaraníes `PYG`, Pesos Argentinos `ARS`, Dólares `USD`, Reales `BRL`, Euros `EUR`), realizar la conversión automática de precios según la cotización del día y sincronizar todos los comprobantes y stock con tu sistema ERP central sin importar el país de tu negocio.

---

## 2. Gestión de Divisas y Moneda Base del Tenant

### Configuración Inicial

Por defecto, los nuevos tenants se configuran con la moneda nacional **`PYG` (Guaraní Paraguayo)** con un IVA estándar del 10%. No obstante, si tu empresa opera en Argentina u otro país de la región, el administrador puede modificar la divisa base.

1. Inicia sesión en el **Panel de Administración** (`/admin`).
2. Ve a **Ajustes ➔ Configuración de Empresa / Tenant**.
3. En la sección **Configuración de Negocio**:
   * **Moneda Principal / Base:** Selecciona la divisa contable principal de tu negocio (ej. `PYG`, `ARS` o `USD`).
   * **Monedas Admitidas (`supportedCurrencies`):** Selecciona las divisas secundarias en las que deseas emitir presupuestos o cobrar a tus clientes (ej. `PYG`, `ARS`, `USD`).
   * **Impuesto por Defecto (IVA):** Configura la tasa general (ej. `10%` para Paraguay, `21%` para Argentina).
4. Haz clic en **Guardar Cambios**.

> 💡 **Nota:** Todos los reportes consolidados y métricas del Dashboard principal se calcularán automáticamente en la **Moneda Principal** del Tenant.

---

## 3. Catálogo de Productos Multimoneda

OrderFlow te permite fijar precios en la divisa que mejor se adapte al costo de tus insumos o repuestos.

### Publicar un Producto en Divisa Alternativa (ej. USD)

1. Dirígete a **Inventario ➔ Productos** (`/admin/products`).
2. Haz clic en **`+ Nuevo Producto`** o edita un producto existente.
3. En el campo **Precio de Venta**, ingresa el monto numérico (ej. `150.00`).
4. En el desplegable **Moneda del Producto**, selecciona la divisa (ej. `USD`).
5. **Cotización y Equivalencia en Moneda Base:**
   * Si el producto se encuentra en `USD` y la moneda base de tu empresa es `PYG` o `ARS`, OrderFlow aplicará la cotización del día (vía *CurrencyService* o cotización manual configurada).
   * El sistema mostrará en pantalla la equivalencia estimada en la moneda base para fines contables.
6. Haz clic en **Guardar Producto**.

---

## 4. Ventas, POS y Pedidos Multimoneda

### Procesamiento de Pedidos desde el POS / Catálogo Público

1. Cuando un cliente realiza un pedido desde la Tienda Pública, el Catálogo de WhatsApp o el Punto de Venta (POS):
   * Se muestra el precio en la moneda elegida por el cliente o publicada en el producto.
   * Al confirmar la venta, OrderFlow congela el **Tipo de Cambio (`exchangeRate`)** de ese momento exacto.
2. **Registro de la Transacción:**
   * **`currency`:** Registra la divisa original del cobro (ej. `USD`).
   * **`totalAmount`:** Suma total en la divisa original (ej. `USD 150.00`).
   * **`exchangeRate`:** Cotización aplicada (ej. `1 USD = 7,500 PYG` o `1,250 ARS`).
   * **`totalAmountBase`:** Equivalente en la moneda base del tenant para asientos contables e informes consolidados.

---

## 5. Integración con ERPs (Tango, Odoo, Contabilium, Xubio)

OrderFlow actúa como un acelerador comercial que envía ventas y sincroniza stock automáticamente con tu ERP contable mediante los **DTOs Canónicos**.

### Configuración del Conector ERP

1. Ve al panel de **Integraciones** (`/admin/integrations`).
2. Selecciona tu proveedor de ERP:

#### A. **Tango ERP (Axoft)**
* **Configuración:** Ingresa el `Branch ID` (Sucursal) y `Warehouse ID` (Depósito).
* **Comportamiento Multimoneda:** OrderFlow envía la venta mapeando los campos `moneda` y `cotizacion` de forma transparente hacia la base de datos o API de Tango.

#### B. **Odoo 19 CE**
* **Configuración:** Instala el módulo oficial `orderflow_connector` en tu Odoo e ingresa la URL de Webhook y API Key.
* **Comportamiento Multimoneda:** Transmite el `currency_id` correspondiente al catálogo de divisas de Odoo (`res.currency`).

#### C. **Contabilium**
* **Configuración:** Activa el conector agregando tu `Client ID` y `Client Secret` generados en la API de Contabilium.
* **Comportamiento Multimoneda:** Traduce los pedidos automáticamente asignando la moneda de la factura (`ARS` / `USD`) y el tipo de cambio del día.

#### D. **Xubio**
* **Configuración:** Ingresa el API Key de tu cuenta de Xubio.
* **Comportamiento Multimoneda:** Los comprobantes de venta emitidos registran el medio de pago, tasa de IVA y la equivalencia en moneda nacional de forma automática.

---

## 6. Preguntas Frecuentes y Soporte

**¿Qué ocurre si se interrumpe la conexión con los servicios de cotización oficial (dolarapi)?**  
OrderFlow cuenta con un mecanismo de **Resiliency Fallback**. En caso de caída del proveedor externo de divisas, el sistema utiliza la última tasa conocida en su caché local (30 min) o el valor de respaldo fijado, garantizando que el punto de venta (POS) y el checkout nunca se detengan.

**¿Puedo cambiar la moneda principal de mi empresa una vez iniciada la operación?**  
Sí, desde `/admin/settings`. Sin embargo, se recomienda definir la moneda base durante la configuración inicial para mantener consistencia en los informes contables acumulados.

---

*Para soporte técnico o dudas sobre integraciones, contacta a tu ejecutivo de cuenta o escribe a `soporte@pesallaccia.com`.*
