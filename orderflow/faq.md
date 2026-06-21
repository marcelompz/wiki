# OrderFlow - Preguntas Frecuentes (FAQ)

**Última actualización:** 2026-06-21

---

## 📑 Índice

1. [General](#general)
2. [Precios y Planes](#precios-y-planes)
3. [Configuración](#configuración)
4. [Productos](#productos)
5. [Pedidos](#pedidos)
6. [Pagos](#pagos)
7. [Soporte Técnico](#soporte-técnico)

---

## General

### ¿Qué es OrderFlow?

OrderFlow es un sistema multi-tenant de gestión de pedidos que incluye:
- 🛒 E-commerce para tu tienda
- 📦 Gestión de pedidos y stock
- 💳 Punto de venta (POS)
- 📅 Turnos y bookings (según plan)
- 📊 Reportes y analytics

**Ideal para:** Spas, tiendas de retail, distribuidoras, y cualquier negocio que venda productos o servicios.

---

### ¿Necesito instalar algo?

**No, es 100% online.**

Solo necesitás:
- ✅ Una computadora con internet
- ✅ Un navegador (Chrome, Firefox, Edge)
- ✅ Tu usuario y contraseña

No hay software que instalar.

---

### ¿Puedo acceder desde el celular?

**Sí, OrderFlow es responsive.**

Podés acceder desde:
- 📱 Celular (iOS, Android)
- 💻 Tablet (iPad, Android)
- 🖥️ Computadora (Windows, Mac, Linux)

La interfaz se adapta automáticamente al tamaño de pantalla.

---

## Precios y Planes

### ¿Cuánto cuesta OrderFlow?

Tenemos 3 planes:

| Plan | Precio | Ideal para |
|------|--------|------------|
| **Starter** | $29/mes | Emprendedores, 1-10 productos |
| **Professional** | $149/mes | Negocios establecidos, 10-100 productos |
| **Enterprise** | $499/mes | Cadenas, múltiples depósitos |

[Ver comparativa completa de planes](https://orderflow.app/precios)

---

### ¿Hay período de prueba?

**Sí, 14 días gratis.**

- ✅ Sin tarjeta de crédito
- ✅ Todas las features del plan Professional
- ✅ Sin compromiso

Al finalizar, elegís el plan que más te convenga.

---

### ¿Puedo cambiar de plan después?

**Sí, cuando quieras.**

- **Upgrade:** Inmediato, se prorratea el costo
- **Downgrade:** Al próximo ciclo de facturación

---

### ¿Qué métodos de pago aceptan?

- 💳 Tarjeta de crédito (todos los planes)
- 🏦 Transferencia bancaria (Enterprise)
- 💰 Efectivo (solo en algunos países)

La facturación es mensual o anual (con 20% de descuento).

---

## Configuración

### ¿Cómo configuro mi API Key?

1. Entrá a **https://admin.orderflow.app**
2. Si es la primera vez, el admin te da la API Key
3. Ir a **Configuración → Mi Tenant**
4. Copiar API Key
5. Guardarla en un lugar seguro

> 🔐 **Importante:** No compartas tu API Key.

---

### ¿Puedo cambiar mi logo?

**Sí, desde Configuración → Branding.**

Requisitos del logo:
- Formato: PNG o SVG
- Tamaño: 200x50px (recomendado)
- Fondo: Transparente
- Peso: Máximo 500 KB

[Ver guía completa de branding](./configurar-tenant.md#branding)

---

### ¿Puedo usar mi propio dominio?

**Sí, con Plan Professional o Enterprise.**

Pasos:
1. Configurar en OrderFlow
2. Configurar CNAME en tu DNS
3. Esperar propagación (2-24 horas)
4. Verificar

[Ver guía completa de dominio](./configurar-tenant.md#dominio-personalizado)

---

## Productos

### ¿Cuántos productos puedo cargar?

Depende de tu plan:

| Plan | Límite de Productos |
|------|---------------------|
| **Starter** | 100 productos |
| **Professional** | Ilimitados |
| **Enterprise** | Ilimitados |

---

### ¿Puedo importar productos desde Excel?

**Sí, desde Productos → Importar.**

Pasos:
1. Descargar plantilla
2. Completar con tus productos
3. Subir archivo
4. Revisar preview
5. Confirmar

[Ver guía completa de importación](./guia-admin.md#importar-productos-desde-excel)

---

### ¿Los productos se sincronizan con Odoo?

**Sí, con Plan Enterprise.**

La sincronización es:
- ✅ Productos → Odoo (automático)
- ✅ Stock ← Odoo (cada 15 minutos)
- ✅ Precios ← Odoo (cada 15 minutos)

---

## Pedidos

### ¿Cómo recibo los pedidos?

Tenés 3 formas:

1. **Email:** Te llega un email con cada pedido
2. **Dashboard:** Ves los pedidos en tiempo real
3. **WhatsApp:** (Opcional) Te llega un WhatsApp

---

### ¿Puedo crear pedidos manuales?

**Sí, con Plan Professional o Enterprise.**

Ideal para:
- 📞 Ventas por teléfono
- 💬 Ventas por WhatsApp
- 🏪 Ventas en local físico (POS)

[Ver guía de creación de pedidos](./guia-admin.md#crear-pedido-manual-pos)

---

### ¿Cómo cambio el estado de un pedido?

1. Ir a **Pedidos → Lista**
2. Click en el número de pedido
3. Click en **"Cambiar Estado"**
4. Seleccionar nuevo estado
5. (Opcional) Agregar nota interna

Estados disponibles:
- Pendiente
- Confirmado
- En preparación
- Enviado
- Completado
- Cancelado

---

## Pagos

### ¿Qué métodos de pago puedo ofrecer?

Depende de tu plan:

| Método | Starter | Professional | Enterprise |
|--------|---------|--------------|------------|
| **Efectivo** | ✅ | ✅ | ✅ |
| **Tarjeta** | ✅ | ✅ | ✅ |
| **Transferencia** | ✅ | ✅ | ✅ |
| **QR (Mercado Pago)** | ❌ | ✅ | ✅ |
| **Tarjeta en el sitio** | ❌ | ✅ | ✅ |

---

### ¿Mercado Pago está integrado?

**Sí, con Plan Professional o superior.**

Ventajas:
- ✅ Acepta todas las tarjetas
- ✅ Cobro automático
- ✅ Menos riesgo de impago
- ✅ Integración con OrderFlow

[Ver guía de integración con Mercado Pago](./guia-admin.md#mercado-pago)

---

### ¿Puedo cobrar en cuotas?

**Sí, si usás Mercado Pago.**

Mercado Pago permite:
- ✅ Hasta 12 cuotas
- ✅ El cliente elige cuántas
- ✅ Vos cobrás todo junto (menos la comisión)

---

## Soporte Técnico

### ¿Cómo contacto a soporte?

Tenés varias opciones:

- 📧 **Email:** soporte@orderflow.app
- 💬 **Chat:** [Link al chat](#)
- 📚 **Base de conocimientos:** [Wiki](../README.md)
- 🐛 **Reportar bug:** [GitHub Issues](https://github.com/marcelompz/orderflow/issues)

---

### ¿Cuál es el horario de soporte?

Depende de tu plan:

| Plan | Horario de Soporte |
|------|---------------------|
| **Starter** | Lunes a Viernes, 9-18h |
| **Professional** | Lunes a Sábado, 9-20h |
| **Enterprise** | 24/7, todos los días |

---

### ¿Tienen teléfono de soporte?

**Solo para Plan Enterprise.**

Los otros planes pueden contactar por:
- Email
- Chat
- WhatsApp Business

---

## ¿No encontraste tu pregunta?

[Contactanos](../README.md#soporte) y te respondemos en menos de 24 horas.

---

*¿Te fue útil esta FAQ? [Dejanos tu feedback](https://forms.gle/ejemplo)*
