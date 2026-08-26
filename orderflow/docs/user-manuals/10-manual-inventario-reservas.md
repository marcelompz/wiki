# 📦 Manual de Usuario: Gestión de Inventario & Reservas de Stock (OrderFlow v1.20.24)

> **Módulos:** Inventario (`/admin/products`), API de Stock (`/api/v1/inventory`), Pedidos y POS  
> **Destinado a:** Administradores de Tienda, Encargados de Stock, Operadores de POS/Caja y Desarrolladores de Integraciones ERP  

---

## 📋 ÍNDICE

1. [Introducción](#1-introducción)
2. [Estructura del Inventario: Depósitos, Ubicaciones y Stocks](#2-estructura-del-inventario-depósitos-ubicaciones-y-stocks)
3. [Flujo Normal de Stock (Ventas, Devoluciones y Cancelaciones)](#3-flujo-normal-de-stock-ventas-devoluciones-y-cancelaciones)
4. [Nueva Funcionalidad: Reserva de Stock en Pedidos Pendientes](#4-nueva-funcionalidad-reserva-de-stock-en-pedidos-pendientes)
5. [Ajustes de Stock, Sincronización ERP e Importaciones](#5-ajustes-de-stock-sincronización-erp-e-importaciones)
6. [Consulta de Movimientos y Trazabilidad](#6-consulta-de-movimientos-y-trazabilidad)
7. [Preguntas Frecuentes y Soporte](#7-preguntas-frecuentes-y-soporte)

---

## 1. Introducción

OrderFlow incorpora un motor de inventario **multi-depósito y doble entrada**, diseñado para negocios con uno o varios puntos de venta físicos, depósitos centrales o tiendas online. A diferencia de sistemas simples que solo guardan un número de "stock disponible", OrderFlow registra:

- **Depósitos y ubicaciones físicas** (ej. `Depósito Central`, `Sucursal Norte`, `Consultorio 1`).
- **Stock físico por ubicación** (cuántas unidades existen realmente en cada lugar).
- **Stock reservado por pedido** (cuántas unidades están apartadas para clientes con pedidos pendientes).
- **Kardex / historial de movimientos** (trazabilidad completa de cada entrada, salida, ajuste o transferencia).

### Flujos que integran inventario
- **POS / Caja:** descuenta stock al confirmar una venta.
- **Catálogo WhatsApp / Tienda Online:** valida stock antes de permitir la compra.
- **Importaciones y ERP:** sincroniza cantidades desde sistemas externos (Odoo, Tango, etc.).
- **Reservas de turnos y servicios:** en futuras versiones, reservan capacidad por horario.

---

## 2. Estructura del Inventario: Depósitos, Ubicaciones y Stocks

### 2.1 Depósito (`Warehouse`)
Es el nivel más alto de la organización logística. Un tenant puede tener uno o varios depósitos.

- **Código:** identificador corto (ej. `WH-CENTRAL`, `WH-SUC1`).
- **Nombre:** nombre comercial del depósito.
- **Dirección:** opcional, para logística.

### 2.2 Ubicación (`Location`)
Cada depósito contiene una o varias ubicaciones. OrderFlow incluye ubicaciones predeterminadas que se crean automáticamente:

| Tipo | Código interno | Uso principal |
|------|----------------|---------------|
| `INTERNAL` | `Loc. interna` | Stock físico disponible para la venta. |
| `CUSTOMER` | `Loc. clientes` | Stock que ya fue vendido y entregado al cliente. |
| `INVENTORY_LOSS` | `Loc. ajuste` | Ajustes de corrección (roturas, mermas, correcciones de sistema). |
| `SUPPLIER` | `Loc. proveedor` | Entradas desde compras a proveedores. |

> 💡 **Nota:** No es obligatorio crear ubicaciones manualmente. OrderFlow crea automáticamente las ubicaciones `INTERNAL` y `CUSTOMER` cuando se necesitan por primera vez.

### 2.3 Stock por Ubicación (`StockQuant`)
Cada combinación de **Ubicación + Producto** tiene un registro `StockQuant` con:

| Campo | Descripción |
|-------|-------------|
| `quantity` | Stock físico real en esa ubicación. |
| `reservedQuantity` | Stock apartado para pedidos pendientes (no se puede vender por otro medio). |
| `disponible` | `quantity - reservedQuantity`. Es el stock que realmente se puede asignar a nuevas ventas. |

### 2.4 Stock Disponible del Producto (`Product.stockAvailable`)
OrderFlow mantiene un **cache** en la tabla `Product` llamado `stockAvailable`. Este valor se calcula automáticamente como la **suma de `quantity` de todas las ubicaciones de tipo `INTERNAL`** del tenant.

- **Ventaja:** consultas rápidas en catálogos, listados y búsquedas.
- **Regla de oro:** nunca modifiques `Product.stockAvailable` directamente desde el backend. Usá el servicio de inventario para garantizar que el cache coincida con los `StockQuant` reales.

---

## 3. Flujo Normal de Stock (Ventas, Devoluciones y Cancelaciones)

### 3.1 Confirmación de Venta (POS, Catálogo, WhatsApp)
Cuando un pedido pasa a estado `CONFIRMED`:

1. Si el flujo de reservas está activo, OrderFlow **confirma la reserva**: crea un movimiento de stock desde la ubicación `INTERNAL` hacia `CUSTOMER`.
2. El `Product.stockAvailable` se descuenta automáticamente según el movimiento.
3. Si el stock era insuficiente y el tenant permite stock negativo, la venta se registra con advertencia.

### 3.2 Cancelación de Pedido
Cuando se cancela un pedido en estados `CONFIRMED`, `PREPARING` o `READY`:

1. OrderFlow **libera la reserva** de stock (si estaba reservada) o **devuelve el stock** a la ubicación `INTERNAL`.
2. El cache `stockAvailable` se actualiza automáticamente.

### 3.3 Devolución de Cliente
Las devoluciones se registran como movimientos inversos (de `CUSTOMER` a `INTERNAL`). El stock vuelve a estar disponible para la venta.

---

## 4. Nueva Funcionalidad: Reserva de Stock en Pedidos Pendientes

A partir de **v1.20.24**, OrderFlow puede reservar stock automáticamente cuando se crea un pedido en estado `DRAFT` (pendiente de confirmación o pago). Esto evita que el mismo producto se venda dos veces por canales diferentes mientras el cliente decide concretar la compra.

### 4.1 Cómo funciona
1. El cliente genera un pedido desde el Catálogo WhatsApp, Tienda Online o POS.
2. OrderFlow **reserva** la cantidad solicitada en la ubicación `INTERNAL` del tenant.
3. Mientras el pedido esté abierto, ese stock **no está disponible** para otros pedidos.
4. Si el cliente confirma el pedido, la reserva se convierte en movimiento definitivo (`INTERNAL` → `CUSTOMER`).
5. Si el cliente cancela o expira el pedido, la reserva se libera automáticamente.

### 4.2 Regla de disponibilidad real
El sistema evalúa la disponibilidad así:

```
stockDisponible = quantity (StockQuant) - reservedQuantity (StockQuant)
```

Solo se permite reservar si `stockDisponible >= cantidadPedido`.

### 4.3 Activación por Feature Flag
Esta funcionalidad está controlada por la variable de entorno:

```
USE_DOUBLE_ENTRY_STOCK=true
```

- **Activada (`true`):** OrderFlow usa el flujo de reservas y movimientos dobles (`StockQuant` + `StockMove`).
- **Desactivada (`false` o ausente):** OrderFlow mantiene la lógica tradicional de decremento directo de `Product.stockAvailable` al confirmar la venta. Esto garantiza compatibilidad con flujos de pedidos admin existentes que no requieren reserva previa.

> ⚠️ **Importante:** Si planeas activar `USE_DOUBLE_ENTRY_STOCK` en producción, coordiná previamente con el equipo técnico para validar migraciones de datos y pruebas en staging.

---

## 5. Ajustes de Stock, Sincronización ERP e Importaciones

### 5.1 Ajustes manuales desde el panel de Productos
Cuando editas el stock de un producto desde `/admin/products`, OrderFlow registra un **movimiento de ajuste** automático en el kardex.

- **Aumento de stock:** movimiento desde ubicación `INVENTORY_LOSS` (ajuste) hacia `INTERNAL`.
- **Disminución de stock:** movimiento desde `INTERNAL` hacia `INVENTORY_LOSS`.

Esto garantiza que toda corrección manual quede auditada.

### 5.2 Sincronización con ERP
Los conectores ERP (Odoo, Tango, etc.) envían cantidades actualizadas de productos. OrderFlow recibe estos valores y ejecuta ajustes automáticos:

- Si el producto no existe en OrderFlow, se crea con el stock inicial indicado.
- Si el producto existe, se ajusta su stock al valor recibido.
- Referencia en el kardex: `Ajuste por sincronización externa`.

### 5.3 Importaciones masivas
Al cargar productos mediante Excel o CSV:

- Cada fila con stock inicial ejecuta un ajuste automático.
- Las variantes de producto (talle, color, etc.) ajustan el stock del producto base de forma consolidada.
- Referencia en el kardex: `Ajuste por sincronización externa`.

---

## 6. Consulta de Movimientos y Trazabilidad

### 6.1 Kardex de Stock
Cada `StockMove` registra:

| Campo | Descripción |
|-------|-------------|
| `productId` | Producto movido. |
| `sourceLocationId` | Ubicación de origen. |
| `destLocationId` | Ubicación de destino. |
| `quantity` | Cantidad movida. |
| `state` | Estado del movimiento (`DRAFT`, `CONFIRMED`, `DONE`, `CANCELLED`). |
| `reference` | Motivo o referencia (ej. `Pedido order-123`, `Ajuste por sincronización externa`). |
| `createdAt` | Fecha y hora del movimiento. |

Estos registros permiten responder preguntas como:
- ¿Cuándo y por qué se generó una diferencia de stock?
- ¿Qué pedido consumió stock de un producto?
- ¿Hubo movimientos no autorizados o errores de carga?

### 6.2 Endpoints disponibles
La API de inventario expone las siguientes rutas (bajo `ApiKeyGuard`):

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| `GET` | `/api/v1/inventory/warehouses` | `inventory:read` | Lista depósitos del tenant. |
| `POST` | `/api/v1/inventory/warehouses` | `inventory:manage` | Crea un depósito. |
| `GET` | `/api/v1/inventory/locations` | `inventory:read` | Lista ubicaciones, con filtro por depósito. |
| `POST` | `/api/v1/inventory/locations` | `inventory:manage` | Crea una ubicación en un depósito. |
| `GET` | `/api/v1/inventory/quants` | `inventory:read` | Lista stocks por producto o todos. |
| `POST` | `/api/v1/inventory/moves` | `inventory:manage` | Ejecuta un movimiento manual entre ubicaciones. |
| `POST` | `/api/v1/inventory/moves/reserve` | `inventory:manage` | Reserva stock para un pedido. |
| `POST` | `/api/v1/inventory/moves/release` | `inventory:manage` | Libera una reserva de stock. |
| `GET` | `/api/v1/inventory/moves/history` | `inventory:read` | Obtiene los últimos 100 movimientos. |

---

## 7. Preguntas Frecuentes y Soporte

### 7.1 ¿Por qué el stock del producto no coincide con lo que veo en la sucursal?
Verificá lo siguiente:
1. El stock físico está cargado en la **ubicación correcta** (`INTERNAL` de la sucursal correspondiente).
2. No hay pedidos pendientes en estado `DRAFT` que estén **reservando** ese stock sin confirmar.
3. Si usás el flag `USE_DOUBLE_ENTRY_STOCK`, recordá que el cache `stockAvailable` puede diferir momentáneamente durante transacciones concurrentes.

### 7.2 ¿Qué pasa si se vende más stock del que existe?
OrderFlow puede configurarse para permitir stock negativo por tenant (`allowNegativeStock`). En ese caso:
- La venta se registra igual.
- Se emite una advertencia en logs.
- El stock físico queda negativo hasta que se realice un ajuste manual o una entrada de compra.

### 7.3 ¿Cómo afecta la reserva de stock a los clientes?
- Los clientes no ven directamente la reserva; ven el **stock disponible real** (`quantity - reservedQuantity`).
- Si un producto tiene 10 unidades y 3 están reservadas, el cliente verá 7 disponibles.
- Si el cliente no confirma el pedido, la reserva se libera y el stock vuelve a estar disponible.

### 7.4 ¿Cómo sincronizo el stock con mi ERP?
Usá el endpoint `/api/v1/products/sync` (API Key del tenant) para enviar la lista de productos con sus cantidades actualizadas. OrderFlow ajustará el stock automáticamente y registrará cada cambio en el kardex.

### 7.5 ¿Dónde veo el historial completo de movimientos?
Actualmente el historial está disponible vía API en `/api/v1/inventory/moves/history`. El panel visual de kardex se incorporará en futuras versiones del frontend.

---

## 📌 Notas Técnicas para Integradores

- **`stockAvailable` es un cache:** No confíes en él como única fuente de verdad en integraciones. Consultá `/api/v1/inventory/quants` para auditorías precisas.
- **`tenantId` es obligatorio:** Todos los movimientos, depósitos y ubicaciones están aislados por tenant. Nunca compartas datos de inventario entre tenants.
- **Feature flag:** La migración a flujo de reservas es gradual y controlada por `USE_DOUBLE_ENTRY_STOCK`. Sin esta variable, el sistema mantiene compatibilidad con versiones anteriores.
- **Formato de archivos:** Usá `kebab-case` para nombres de archivos y rutas en integraciones personalizadas.

---

**Versión del manual:** 1.20.24  
**Última actualización:** 2026-08-25  
**Soporte:** Consultá la documentación técnica en `/opt/orderflow/docs/` o el repositorio Wiki en `/opt/wiki/orderflow/`.
