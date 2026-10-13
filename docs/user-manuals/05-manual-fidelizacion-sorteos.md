# 🎖️ Manual de Usuario: Fidelización de Clientes & Sorteos (Giveaways)

> **Módulos:** Programa de Fidelización (`/admin/loyalty`) y Sorteos (`/admin/giveaways`)  
> **Destinado a:** Administradores de Tienda y Encargados de Fidelización  

---

## 1. Introducción
OrderFlow integra dos herramientas de retención y marketing: el **Programa de Fidelización por Puntos (Loyalty Engine)** y el **Gestor de Sorteos (Giveaways)**.

---

## 2. Programa de Fidelización (`/admin/loyalty`)

### 2.1 Configuración de Reglas de Acumulación
1. Ingresa a `/admin/loyalty`.
2. Establece la tasa de conversión (ej. *Por cada 1.000 ₲ de compra, el cliente gana 1 punto*).
3. Configura el valor de redención de cada punto (ej. *1 punto = 10 ₲ de descuento*).

### 2.2 Niveles de Clientes (Tiers)
El sistema categoriza automáticamente a los clientes según su consumo acumulado:
- 🥉 **Bronze:** Nivel inicial.
- 🥈 **Silver:** Descuentos y beneficios estándar.
- 🥇 **Gold:** Puntos dobles en fechas especiales.
- 💎 **Platinum:** Beneficios VIP y atención prioritaria.

### 2.3 Redención en POS / Tienda
- Al cobrar una venta desde el POS o Checkout, el sistema mostrará los puntos acumulados del cliente mediante su número de teléfono o documento.
- El cliente puede decidir usar sus puntos como medio de pago parcial o total.

---

## 3. Gestor de Sorteos (`/admin/giveaways`)

### 3.1 Crear un Nuevo Sorteo
1. Ingresa a `/admin/giveaways` y haz clic en **+ Crear Sorteo**.
2. Configura el nombre del premio, fecha de inicio y cierre.
3. Sube la imagen del premio y define los requisitos de inscripción (ej. *Dejar email, teléfono o seguir en redes*).

### 3.2 Selección del Ganador
1. Una vez cerrada la fecha del sorteo, haz clic en **Realizar Sorteo**.
2. El algoritmo elegirá aleatoriamente al ganador de la base de inscriptos verificados.
3. Se generará un certificado con el enlace público del sorteo para transparencia en redes sociales.
