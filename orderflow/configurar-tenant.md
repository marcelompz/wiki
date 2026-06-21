# Configurar mi Tenant - OrderFlow

**Última actualización:** 2026-06-21  
**Tiempo de lectura:** 8 minutos

---

## 📑 Índice

1. [Primeros Pasos](#primeros-pasos)
2. [Branding](#branding)
3. [Dominio Personalizado](#dominio-personalizado)
4. [Features](#features)
5. [Integraciones](#integraciones)
6. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## Primeros Pasos

### ¿Qué es un Tenant?

Un **tenant** es tu espacio dentro de OrderFlow. Es como tu "alquiler" en la plataforma.

Cada tenant tiene:
- ✅ Sus propios productos
- ✅ Sus propios clientes
- ✅ Sus propios pedidos
- ✅ Su branding (logo, colores)
- ✅ Su configuración

**Totalmente separado** de otros tenants.

---

### Acceder a Configuración

1. Ingresar a **https://admin.orderflow.app**
2. Click en tu nombre (arriba a la derecha)
3. Click en **"Configuración"**

---

## Branding

### Logo

**Paso 1: Preparar tu Logo**

Requisitos:
- Formato: PNG o SVG
- Tamaño: 200x50px (recomendado)
- Fondo: Transparente (recomendado)
- Peso: Máximo 500 KB

**Herramientas gratuitas:**
- [Remove.bg](https://remove.bg) - Quitar fondo
- [Canva](https://canva.com) - Diseñar logo
- [TinyPNG](https://tinypng.com) - Comprimir imagen

**Paso 2: Subir Logo**

1. Ir a **Configuración → Branding**
2. Click en **"Subir Logo"**
3. Seleccionar archivo
4. Recortar si es necesario
5. Click en **"Guardar"**

![Subir logo](../images/upload-logo.png)

---

### Colores

**Paso 1: Elegir Colores**

Tu tenant tiene 2 colores principales:

1. **Color Primario:**
   - Botones principales
   - Headers
   - Links importantes

2. **Color Secundario:**
   - Botones secundarios
   - Acentos
   - Detalles

**Herramientas:**
- [Coolors.co](https://coolors.co) - Generar paletas
- [Color Hunt](https://colorhunt.co) - Paletas populares
- [Adobe Color](https://color.adobe.com) - Paletas avanzadas

**Paso 2: Configurar Colores**

1. Ir a **Configuración → Branding**
2. Click en el selector de color
3. Elegir color (o ingresar código HEX)
4. Preview en tiempo real (derecha)
5. Click en **"Guardar"**

![Configurar colores](../images/color-picker.png)

---

### Ejemplos de Configuración

#### Spa / Wellness

```
Primario: #8B7355 (Marrón tierra)
Secundario: #D4A574 (Dorado/bronce)
Acento: #F5E6D3 (Crema)
```

#### Repuestos / Automotriz

```
Primario: #E74C3C (Rojo intenso)
Secundario: #34495E (Gris oscuro)
Acento: #ECF0F1 (Gris claro)
```

#### Retail / Tienda

```
Primario: #3498DB (Azul)
Secundario: #2ECC71 (Verde)
Acento: #F39C12 (Naranja)
```

---

## Dominio Personalizado

**Requiere:** Plan Professional o Enterprise

### Paso 1: Configurar en OrderFlow

1. Ir a **Configuración → Dominio**
2. Ingresar tu dominio:
   - Subdominio: `tienda.midominio.com`
   - O dominio completo: `mitienda.com`
3. Click en **"Guardar"**

### Paso 2: Configurar en tu DNS

**Si usás subdominio:**

```
Tipo: CNAME
Nombre: tienda
Valor: orderflow.app
TTL: Automático
```

**Si usás dominio completo:**

```
Tipo: A
Nombre: @
Valor: [IP que te damos nosotros]
TTL: Automático
```

### Paso 3: Esperar Propagación

- ⏱️ **Tiempo:** 2-24 horas
- 🌍 **Por qué:** Los DNS tardan en propagarse globalmente

### Paso 4: Verificar

1. Ir a **Configuración → Dominio**
2. Click en **"Verificar"**
3. Si está OK, aparece ✅
4. Si no, esperar más tiempo

### Paso 5: SSL Automático

Una vez verificado:
- ✅ SSL se genera automáticamente
- ✅ HTTPS obligatorio
- ✅ Renovación automática

---

## Features

**Activá o desactivá según tu plan**

### E-commerce

**Incluido en:** Todos los planes

- ✅ Catálogo de productos
- ✅ Carrito de compras
- ✅ Checkout
- ✅ Pedidos online

---

### Bookings / Turnos

**Incluido en:** Professional, Enterprise

- ✅ Agenda de turnos
- ✅ Recursos (profesionales, cabinas)
- ✅ Duración configurable
- ✅ Recordatorios por WhatsApp

**Configurar:**
1. Ir a **Configuración → Features**
2. Activar "Bookings"
3. Click en **"Configurar"**
4. Configurar:
   - Duración por defecto (30, 60, 90 min)
   - Horarios de atención
   - Días no laborables
5. Click en **"Guardar"**

---

### POS (Punto de Venta)

**Incluido en:** Professional, Enterprise

- ✅ Crear pedidos manuales
- ✅ Imprimir tickets
- ✅ Múltiples métodos de pago
- ✅ Arqueo de caja

**Configurar:**
1. Ir a **Configuración → Features**
2. Activar "POS"
3. Click en **"Configurar"**
4. Configurar:
   - Métodos de pago habilitados
   - Permisos de usuarios
   - Tickets (logo, footer)
5. Click en **"Guardar"**

---

### Múltiples Depósitos

**Incluido en:** Enterprise

- ✅ Stock por depósito
- ✅ Transferencias entre depósitos
- ✅ Reportes por ubicación

**Configurar:**
1. Ir a **Configuración → Features**
2. Activar "Múltiples Depósitos"
3. Click en **"Configurar"**
4. Agregar depósitos:
   - Nombre (ej: "Depósito Central")
   - Dirección
   - Responsable
5. Click en **"Guardar"**

---

## Integraciones

### Odoo

**Requiere:** Plan Enterprise

[Ver guía completa de integración con Odoo](./integracion-odoo.md)

---

### Mercado Pago

**Requiere:** Plan Professional o superior

**Configurar:**
1. Ir a **Configuración → Integraciones**
2. Activar "Mercado Pago"
3. Click en **"Conectar"**
4. Iniciar sesión con Mercado Pago
5. Autorizar OrderFlow
6. Configurar comisiones
7. Click en **"Guardar"**

---

### WhatsApp Business

**Requiere:** Plan Professional o superior

**Configurar:**
1. Ir a **Configuración → Integraciones**
2. Activar "WhatsApp"
3. Ingresar número de WhatsApp Business
4. Configurar mensajes automáticos:
   - Confirmación de pedido
   - Recordatorio de turno
   - Envío en camino
5. Click en **"Guardar"**

---

## Preguntas Frecuentes

### ¿Puedo cambiar mi logo después?

**Sí, en cualquier momento.**

1. Ir a **Configuración → Branding**
2. Click en **"Cambiar Logo"**
3. Subir nuevo logo
4. Click en **"Guardar"**

El cambio es inmediato.

---

### ¿Puedo tener múltiples dominios?

**Sí, con Plan Enterprise.**

Podés tener:
- `mitienda.com` (dominio principal)
- `tienda2.com` (segundo dominio)
- Ambos apuntan al mismo tenant

---

### ¿Cómo veo cómo queda mi tienda?

1. Ir a **Configuración → Branding**
2. Ver preview en tiempo real (derecha)
3. O ir a **https://tu-tenant.orderflow.app**

---

### ¿Cuánto tarda en aplicarse un cambio de colores?

**Inmediato.**

En cuanto hacés click en "Guardar", los colores se aplican en:
- ✅ Tu tienda online
- ✅ Tu admin panel
- ✅ Emails automáticos

---

### ¿Puedo volver a la configuración anterior?

**Sí, pero no hay "deshacer".**

Si querés volver:
1. Ir a **Configuración → Branding**
2. Cambiar manualmente los colores
3. Click en **"Guardar"**

**Recomendación:** Anotá los colores anteriores antes de cambiar.

---

*¿Necesitás ayuda? [Contactá a soporte](../README.md#soporte)*
