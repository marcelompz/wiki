# 🎖️ Módulo de Loyalty & Fidelización (Fase 1)

[🏠 Atrás (README)](../README.md) | [🚀 Inicio Rápido](01-quickstart.md) | [🏗️ Arquitectura](02-architecture.md) | [🏢 Multi-Tenant Demo](03-multi-tenant-demo.md) | [🔐 JWT Auth](04-jwt-auth.md) | [📊 Testing Report](05-testing-report.md) | [🏪 POS & KDS](06-pos-kds.md) | [📊 Diagramas UML](07-uml-diagrams.md) | [🎖️ Loyalty Module](08-loyalty.md)

---

Este documento detalla la implementación de la **Fase 1 del Módulo de Loyalty (Fidelización)** en la plataforma OrderFlow, que incluye el motor de acumulación de puntos, el control de categorías de clientes (tiers), la administración de reglas multi-tenant y la integración con las confirmaciones de venta del POS.

---

## 🏗️ Modelos de Base de Datos (Core)

El motor de lealtad está soportado en PostgreSQL a través de tres tablas principales con aislamiento lógico multi-tenant:

1. **`LoyaltyCard` (Tarjeta de Fidelidad):**
   * Vinculada en relación `1:1` con el cliente (`Customer`).
   * Almacena el saldo de puntos acumulado y el nivel actual de fidelización.
   * Genera un código de barras único con el formato `LC-[CUSTOMER_PREFIX]-[RANDOM_HASH]` para escaneo físico en sucursales.
2. **`LoyaltyTransaction` (Historial de Puntos):**
   * Registra cada movimiento de suma o resta de puntos.
   * Tipos de transacciones: `EARNED` (ganados por compra), `REDEEMED` (canjeados por beneficios/descuentos), `EXPIRED` (puntos vencidos) o `ADJUSTED` (ajustes manuales del administrador).
3. **`LoyaltyRule` (Reglas de Acumulación/Canje):**
   * Permite configurar cómo se ganan o canjean puntos en cada Tenant de forma independiente.
   * Tipos: `EARNING` (regla de acumulación) o `REDEMPTION` (regla de canje).
   * El campo `ratio` determina el factor de conversión. Ejemplo: Un ratio `0.001` en `EARNING` acumula 1 punto por cada $1,000 PYG gastados.

---

## 🔧 Categorización de Clientes (Tiers)

El sistema calcula dinámicamente el estatus del cliente basado en su balance total acumulado en su `LoyaltyCard`:

| Nivel (Tier) | Umbral de Puntos (PYG Equivalente a ratio 0.001) | Beneficios Clave |
|--------------|-----------------------------------|------------------|
| **BRONZE**   | Baseline (0 puntos) | Acumulación básica de puntos. |
| **SILVER**   | $\ge$ 500 puntos (gasto de $500,000 PYG) | Multiplicador de puntos básico. |
| **GOLD**     | $\ge$ 2,000 puntos (gasto de $2,000,000 PYG) | Prioridad en reservas y promociones. |
| **PLATINUM** | $\ge$ 5,000 puntos (gasto de $5,000,000 PYG) | Acceso a beneficios premium VIP. |

---

## 🔌 Referencia de la API REST

Todos los endpoints están expuestos bajo el prefijo `/api/v1/loyalty` y requieren autenticación mediante API Key (`x-api-key`) y opcionalmente tokens JWT.

### 1. Obtener Tarjeta de Fidelidad
* **Endpoint:** `GET /api/v1/loyalty/card/:customerId`
* **Descripción:** Devuelve la tarjeta de fidelidad del cliente con su saldo, categoría y el historial de las últimas 50 transacciones. Si el cliente no poseía una tarjeta previa, el sistema la auto-genera en el momento de la consulta.
* **Respuesta exitosa (200 OK):**
```json
{
  "id": "e4b1a8d0-512c-47bc-967b-12d8a6efb9f4",
  "pointsBalance": 1250,
  "tier": "SILVER",
  "barcodeValue": "LC-GAIAS-B98FA2",
  "transactions": [
    {
      "id": "cf1b9a84-012b-47cc-bb91-11d87aefb990",
      "type": "EARNED",
      "points": 250,
      "notes": "Puntos ganados por compra #3a8f9c10",
      "createdAt": "2026-07-14T14:48:32.000Z"
    }
  ]
}
```

### 2. Obtener Reglas Activas
* **Endpoint:** `GET /api/v1/loyalty/rules`
* **Descripción:** Lista todas las reglas de fidelización configuradas y activas para el tenant.

### 3. Crear Regla de Fidelidad
* **Endpoint:** `POST /api/v1/loyalty/rules`
* **Cuerpo de la Petición:**
```json
{
  "name": "Acumulación Estándar 10%",
  "type": "EARNING",
  "ratio": 0.001
}
```

### 4. Habilitar/Deshabilitar Regla
* **Endpoint:** `PATCH /api/v1/loyalty/rules/:id`
* **Cuerpo de la Petición:**
```json
{
  "active": false
}
```

### 5. Canjear Puntos
* **Endpoint:** `POST /api/v1/loyalty/redeem`
* **Cuerpo de la Petición:**
```json
{
  "customerId": "customerId-uuid",
  "points": 100,
  "notes": "Descuento de $10.000 PYG aplicado en caja"
}
```

---

## 🔄 Integración con el Checkout y POS

El flujo de acreditación de puntos está acoplado de forma **asíncrona** a la confirmación de la venta en el backend para evitar bloqueos operativos:

1. El Cajero procesa el cobro en el POS y NestJS ejecuta la transacción de base de datos (`OrdersService.confirm`).
2. Una vez que la transacción del cobro ha sido confirmada y escrita exitosamente en la base de datos, se invoca de forma segura a `LoyaltyService.awardPointsForOrder(tenantId, orderId)`.
3. El motor de lealtad busca la regla de acumulación activa del tenant, calcula los puntos resultantes (redondeando hacia abajo), inicializa la tarjeta de fidelidad si es la primera compra del cliente, y le acredita los puntos.
4. Si la acreditación de puntos falla (por ejemplo, porque el cliente no estaba registrado en el pedido o la regla de fidelidad está inactiva), el backend registra el log del error pero **no afecta en absoluto el cierre de caja de la venta original**.
