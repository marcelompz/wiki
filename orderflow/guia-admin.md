# Guía de Administración - OrderFlow

**Última actualización:** 2026-06-21  
**Tiempo de lectura:** 15 minutos

---

## 📑 Índice

1. [Primeros Pasos](#primeros-pasos)
2. [Configurar mi Tenant](#configurar-mi-tenant)
3. [Gestionar Productos](#gestionar-productos)
4. [Gestionar Pedidos](#gestionar-pedidos)
5. [Gestionar Clientes](#gestionar-clientes)
6. [Reportes y Analytics](#reportes-y-analytics)
7. [Integraciones](#integraciones)
8. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## Primeros Pasos

### 1. Acceder al Panel de Administración

1. Entrá a **https://admin.orderflow.app**
2. Ingresá tu **API Key** (te la debería haber dado el administrador del sistema)
3. Hacé click en **"Ingresar"**

![Login screen](../images/orderflow-login.png)

> 💡 **Consejo:** Si no tenés tu API Key, contactá a soporte.

---

### 2. Configurar mi Tenant (Primera Vez)

La primera vez que ingresás, vas a querer configurar tu tenant:

1. Ir a **Configuración → Mi Tenant**
2. Completar:
   - **Nombre del negocio** (ej: "Repuestos Enciso")
   - **Logo** (PNG, 200x50px, fondo transparente)
   - **Colores de marca:**
     - Color primario (botones, headers)
     - Color secundario (acentos, links)
3. Click en **"Guardar"**

![Configuración de tenant](../images/tenant-config.png)

> ⏱️ **Tiempo estimado:** 5 minutos

---

## Configurar mi Tenant

### Branding y Personalización

#### Logo

- **Formato:** PNG o SVG
- **Tamaño recomendado:** 200x50px
- **Fondo:** Transparente (recomendado)
- **Peso máximo:** 500 KB

#### Colores

**Herramientas útiles:**
- [Coolors.co](https://coolors.co) - Generador de paletas
- [Color Hunt](https://colorhunt.co) - Paletas populares

**Ejemplos de configuración:**

| Negocio | Primario | Secundario |
|---------|----------|------------|
| **Spa/Wellness** | #8B7355 (Marrón) | #D4A574 (Dorado) |
| **Repuestos** | #E74C3C (Rojo) | #34495E (Gris) |
| **Retail** | #3498DB (Azul) | #2ECC71 (Verde) |

---

### Dominio Personalizado

**Plan Professional y Enterprise**

Si tenés un plan que lo incluye, podés usar tu propio dominio:

1. Ir a **Configuración → Dominio**
2. Ingresar tu dominio (ej: `tienda.midominio.com`)
3. Configurar el CNAME en tu DNS:
   ```
   tienda CNAME orderflow.app
   ```
4. Esperar propagación (2-24 horas)
5. Click en **"Verificar"**

> 📧 **Importante:** Una vez verificado, el SSL se genera automáticamente.

---

### Features Activas

Activá o desactivá features según tu plan:

| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| E-commerce | ✅ | ✅ | ✅ |
| Bookings/Turnos | ❌ | ✅ | ✅ |
| POS (Punto de venta) | ❌ | ✅ | ✅ |
| Múltiples depósitos | ❌ | ❌ | ✅ |
| Dominio personalizado | ❌ | ✅ | ✅ |
| Integración Odoo | ❌ | ❌ | ✅ |
| Soporte 24/7 | ❌ | ❌ | ✅ |

Para activar/desactivar:
1. Ir a **Configuración → Features**
2. Toggle de las features que querés
3. Click en **"Guardar"**

---

## Gestionar Productos

### Agregar Producto Manualmente

1. Ir a **Productos → Nuevo Producto**
2. Completar campos:

#### Campos Obligatorios
- **Nombre:** Nombre del producto (ej: "Aceite Esencial de Lavanda")
- **Precio:** Precio de venta (ej: 180000)
- **Stock:** Cantidad disponible (ej: 50)

#### Campos Opcionales
- **SKU:** Código interno (se genera automático si no ponés)
- **Categoría:** Para organizar (ej: "Aceites Esenciales")
- **Descripción:** Para mostrar en el catálogo
- **Imágenes:** Subir fotos del producto (PNG, JPG, máximo 5)
- **Metadata:**
  - Marca
  - Modelo
  - Peso/dimensiones
  - Tags para búsqueda

3. Click en **"Guardar"**

![Nuevo producto](../images/product-new.png)

> ⏱️ **Tiempo estimado:** 2-3 minutos por producto

---

### Importar Productos desde Excel

**Ideal para:** Cargar muchos productos de una vez (50+)

#### Paso 1: Descargar Plantilla

1. Ir a **Productos → Importar**
2. Click en **"Descargar Plantilla"**
3. Se descarga un archivo Excel/CSV

#### Paso 2: Completar Plantilla

Columnas requeridas:
```
| name | price | stock | category | sku | description |
|------|-------|-------|----------|-----|-------------|
| Aceite de Lavanda | 180000 | 50 | Aceites | LAV-001 | ... |
| Aceite de Menta | 150000 | 30 | Aceites | MEN-001 | ... |
```

#### Paso 3: Subir y Verificar

1. Ir a **Productos → Importar**
2. Click en **"Subir Archivo"**
3. Seleccionar tu archivo Excel/CSV
4. Revisar el preview (te muestra cómo quedarían)
5. Click en **"Confirmar Importación"**

> ⚠️ **Importante:** Si un producto con ese SKU ya existe, se actualiza.

---

### Editar Producto

1. Ir a **Productos → Lista de Productos**
2. Buscar el producto (podés usar el buscador)
3. Click en el lápiz (✏️) al lado del producto
4. Editar los campos que necesites
5. Click en **"Guardar"**

> 💡 **Tip:** Podés editar el precio y stock directamente desde la lista (inline editing).

---

### Productos Inactivos

Para ocultar un producto sin borrarlo:

1. Ir a **Productos → Lista de Productos**
2. Buscar el producto
3. Desactivar el switch "Activo"
4. El producto desaparece del catálogo pero sigue en tu base

**¿Por qué desactivar en vez de borrar?**
- ✅ Mantenés el historial de pedidos
- ✅ No rompés pedidos existentes
- ✅ Podés reactivarlo después

---

## Gestionar Pedidos

### Ver Pedidos

1. Ir a **Pedidos → Todos los Pedidos**
2. Ver lista con:
   - Número de pedido
   - Cliente
   - Fecha
   - Estado (Pendiente, Confirmado, Enviado, Completado)
   - Total

![Lista de pedidos](../images/orders-list.png)

---

### Estados de Pedido

| Estado | Descripción | ¿Qué hacer? |
|--------|-------------|-------------|
| **Pendiente** | Pedido nuevo, sin procesar | Revisar y confirmar |
| **Confirmado** | Pedido aprobado, en preparación | Preparar productos |
| **Enviado** | Pedido despachado | Enviar tracking al cliente |
| **Completado** | Pedido entregado | ¡Listo! |
| **Cancelado** | Pedido cancelado | Reembolsar si corresponde |

---

### Cambiar Estado de Pedido

1. Ir a **Pedidos → Todos los Pedidos**
2. Click en el número de pedido
3. Ver detalle completo
4. Click en **"Cambiar Estado"**
5. Seleccionar nuevo estado
6. (Opcional) Agregar nota interna
7. Click en **"Guardar"**

> 📧 **Automático:** El cliente recibe un email cuando cambia el estado.

---

### Crear Pedido Manual (POS)

**Ideal para:** Ventas por teléfono, WhatsApp, o en local físico.

1. Ir a **Pedidos → Nuevo Pedido**
2. Seleccionar o crear cliente:
   - Buscar por teléfono/email
   - O crear nuevo cliente rápido
3. Agregar productos:
   - Buscar por nombre o SKU
   - Seleccionar cantidad
4. Revisar total
5. Seleccionar método de pago:
   - Efectivo
   - Tarjeta
   - Transferencia
   - QR (Mercado Pago, etc.)
6. Click en **"Crear Pedido"**

> 🖨️ **Opcional:** Podés imprimir el pedido o enviarlo por WhatsApp.

---

## Gestionar Clientes

### Ver Clientes

1. Ir a **Clientes → Lista de Clientes**
2. Ver lista con:
   - Nombre
   - Email
   - Teléfono
   - Cantidad de pedidos
   - Total gastado

---

### Agregar Cliente

1. Ir a **Clientes → Nuevo Cliente**
2. Completar:
   - Nombre (obligatorio)
   - Email (opcional pero recomendado)
   - Teléfono (opcional)
   - Tipo: Persona o Empresa
   - Documentos:
     - CI/RUC (para empresas)
     - Dirección de facturación
     - Dirección de envío
3. Click en **"Guardar"**

---

### Segmentar Clientes

**Plan Professional y Enterprise**

Podés crear segmentos para marketing:

1. Ir a **Clientes → Segmentos**
2. Click en **"Nuevo Segmento"**
3. Definir criterios:
   - Clientes que compraron más de $X
   - Clientes que no compran hace X días
   - Clientes con X pedidos o más
4. Guardar segmento
5. Usar para enviar emails promocionales

---

## Reportes y Analytics

### Dashboard Principal

**Ir a:** `Dashboard` (menú lateral)

**Métricas que ves:**
- 📊 Ventas del día/mes/año
- 🛒 Cantidad de pedidos
- 👥 Clientes nuevos
- 📦 Productos más vendidos
- 📈 Gráfico de ventas (últimos 30 días)

---

### Reporte de Ventas

1. Ir a **Reportes → Ventas**
2. Seleccionar rango de fechas
3. Ver:
   - Total vendido
   - Cantidad de pedidos
   - Ticket promedio
   - Ventas por día
4. Exportar a Excel (botón arriba a la derecha)

---

### Reporte de Productos

1. Ir a **Reportes → Productos**
2. Ver:
   - Productos más vendidos
   - Productos con menos stock
   - Productos nunca vendidos
3. Exportar a Excel

> 💡 **Tip:** Usá el reporte de "menos stock" para reponer antes de quedarte sin productos.

---

## Integraciones

### Odoo (Enterprise)

**Requiere:** Plan Enterprise

Para integrar con Odoo:

1. Ir a **Configuración → Integraciones**
2. Activar "Odoo"
3. Completar:
   - URL de tu Odoo (ej: https://odoo.midominio.com)
   - API Key de Odoo
   - Base de datos
4. Click en **"Conectar"**
5. Mapear campos (productos, clientes, pedidos)
6. Click en **"Guardar"**

**¿Qué se sincroniza?**
- ✅ Productos → Odoo (como productos de venta)
- ✅ Pedidos → Odoo (como pedidos de venta)
- ✅ Clientes → Odoo (como clientes)
- ✅ Facturas ← Odoo (cuando se factura)

---

### Mercado Pago

**Requiere:** Plan Professional o superior

1. Ir a **Configuración → Integraciones**
2. Activar "Mercado Pago"
3. Click en **"Conectar con Mercado Pago"**
4. Iniciar sesión con tu cuenta de Mercado Pago
5. Autorizar OrderFlow
6. Configurar:
   - Tipo de cuenta (Personal, Business)
   - Comisión (si cobrás extra por MP)
7. Click en **"Guardar"**

---

### WhatsApp Business

**Requiere:** Plan Professional o superior

Para enviar pedidos por WhatsApp:

1. Ir a **Configuración → Integraciones**
2. Activar "WhatsApp"
3. Ingresar número de WhatsApp Business
4. Configurar mensajes:
   - Mensaje de confirmación de pedido
   - Mensaje de envío
   - Mensaje de entrega
5. Click en **"Guardar"**

---

## Preguntas Frecuentes

### ¿Cómo cambio mi contraseña?

1. Ir a **Configuración → Mi Cuenta**
2. Click en **"Cambiar Contraseña"**
3. Ingresar contraseña actual
4. Ingresar nueva contraseña (2 veces)
5. Click en **"Guardar"**

---

### ¿Puedo tener múltiples usuarios en mi tenant?

**Sí, con Plan Professional o Enterprise.**

1. Ir a **Configuración → Usuarios**
2. Click en **"Nuevo Usuario"**
3. Completar:
   - Email
   - Nombre
   - Rol (Admin, Vendedor, Viewer)
4. Click en **"Guardar"**

El usuario recibe un email para activar su cuenta.

---

### ¿Cómo borro mi tenant?

**Importante:** Esta acción es irreversible.

1. Ir a **Configuración → Peligro**
2. Click en **"Eliminar Tenant"**
3. Escribir "ELIMINAR" para confirmar
4. Click en **"Eliminar Permanentemente"**

> ⚠️ **Advertencia:** Se borran todos los productos, pedidos, clientes. No hay vuelta atrás.

---

### ¿Puedo exportar mis datos?

**Sí, en cualquier momento.**

1. Ir a **Configuración → Exportar Datos**
2. Seleccionar qué exportar:
   - Productos
   - Clientes
   - Pedidos
   - Todo
3. Click en **"Exportar"**
4. Se descarga un ZIP con todo en CSV/Excel

---

## 🆘 Soporte

¿Problemas? Contactanos:

- 📧 Email: soporte@orderflow.app
- 💬 Chat: [Link al chat]
- 📚 Base de conocimientos: [Link a la wiki]

---

*¿Te fue útil esta guía? [Dejanos tu feedback](https://forms.gle/ejemplo)*
