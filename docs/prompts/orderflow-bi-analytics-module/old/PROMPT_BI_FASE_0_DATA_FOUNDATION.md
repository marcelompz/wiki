# PROMPT – FEAT-067 · Fase 0: Data Foundation

**Gobernanza:** FEAT-067 v1.21.0  
**Fase:** 0 – Data Foundation (Esquemas y Modelado)  
**Documento padre:** `PLAN_DESARROLLO_MODULO_BI_v1.21.0_CORREGIDO.md`  
**Prioridad:** Crítica (bloqueante para el resto de fases)  
**Stack:** NestJS · Prisma · PostgreSQL · Multi-tenant / Multi-tier

---

## 1. Rol y Contexto

Eres un ingeniero senior de backend especializado en Prisma, PostgreSQL y arquitecturas multi-tenant.  
Tu tarea es implementar la **Fase 0 – Data Foundation** del módulo OmniFlow BI (FEAT-067).

Esta fase **no entrega pantallas ni endpoints de analytics**. Su único objetivo es dejar la base de datos y los modelos listos para que todas las fases posteriores (agregaciones SQL, Live Stream, Cache, Frontend, ERP, Insights, etc.) puedan funcionar con datos consistentes, completos y bien tipados.

Debes respetar estrictamente:
- El esquema real existente de OrderFlow (`order_lines`, `"priceAtSale"`, `"tenantId"`, etc.).
- El aislamiento multi-tenant (filtro `tenantId` + soporte `@TenantPrisma` / tiers Shared y Dedicated).
- El contrato formal que se definirá en `analytics.manifest.json`.

---

## 2. Objetivo de la Fase

Preparar toda la plataforma para que **todos los módulos generen datos compatibles con el motor de BI**.

Al finalizar esta fase se debe cumplir:

1. Timestamps unificados y consistentes.
2. Campos críticos de captura presentes y tipados correctamente.
3. Estados de orden normalizados (enum).
4. Dimensiones analíticas mínimas disponibles.
5. Contrato de datos inicial definido en `analytics.manifest.json`.
6. Cero rupturas en el código existente (migraciones seguras + tests de regresión).

---

## 3. Alcance Detallado

### 3.1 Campos y cambios obligatorios en el schema Prisma

#### A. Modelo `Order` (cabecera)

Asegurar / agregar los siguientes campos (si no existen, crearlos; si existen con otro nombre, documentar el mapeo):

| Campo Prisma          | Tipo                  | Obligatorio | Notas |
|-----------------------|-----------------------|-------------|-------|
| `tenantId`            | `String` (UUID)       | Sí          | Ya debe existir. Índice compuesto obligatorio. |
| `createdAt`           | `DateTime`            | Sí          | Timestamp de creación. |
| `updatedAt`           | `DateTime`            | Sí          | |
| `paidAt`              | `DateTime?`           | Recomendado | Momento exacto del pago. |
| `servedAt`            | `DateTime?`           | Opcional    | Especialmente útil en restaurante. |
| `channel`             | `ChannelType` (enum)  | Sí          | POS, WEB, WHATSAPP, MARKETPLACE, APP, CALL_CENTER, MANUAL… Ver enum abajo. |
| `locationId`          | `String?` (UUID)      | Sí*         | *Obligatorio cuando el tenant tiene múltiples locales. FK a `Location`. |
| `tableNumber`         | `String?`             | Recomendado | Restaurante. |
| `dinersCount`         | `Int?`                | Recomendado | Restaurante (Spend per Diner, RevPASH). Nombre canónico: `dinersCount`. |
| `status`              | `OrderStatus` (enum)  | Sí          | Debe excluir de BI: `DRAFT`, `CANCELLED`. |
| `totalAmount`         | `Decimal`             | Sí          | Ya existe (no usar `total`). |
| `employeeId`          | `String?`             | Recomendado | Camarero / vendedor. |

**Enum `ChannelType`** (nuevo, para consistencia en heatmap y análisis omnicanal):
```prisma
enum ChannelType {
  POS
  WEB
  WHATSAPP
  MARKETPLACE
  APP
  CALL_CENTER
  MANUAL
}
```

**Enum `OrderStatus`** (normalizar si aún no está unificado):
```prisma
enum OrderStatus {
  DRAFT
  PENDING
  CONFIRMED
  PREPARING
  READY
  SERVED
  DELIVERED
  PAID
  CANCELLED
  REFUNDED
  PARTIALLY_PAID
  PARTIALLY_REFUNDED
}
```

#### B. Modelo `OrderLine` (detalle) – **nombre real de la tabla**

| Campo Prisma     | Tipo        | Obligatorio | Notas |
|------------------|-------------|-------------|-------|
| `orderId`        | `String`    | Sí          | FK. |
| `productId`      | `String`    | Sí          | FK. |
| `quantity`       | `Decimal` o `Int` | Sí    | |
| `priceAtSale`    | `Decimal`   | **Sí**      | Precio unitario al momento de la venta (crítico para BI). |
| `costAtSale`     | `Decimal`   | **Sí**      | Costo al momento de la venta (permite márgenes históricos reales). **Obligatorio por plan corregido**. |
| `discountAmount` | `Decimal?`  | Opcional    | |
| `notes`          | `String?`   | Opcional    | |

> **Importante:** En SQL raw siempre se debe usar `"priceAtSale"` y `"costAtSale"` (camelCase entre comillas dobles). Nunca `unit_price`, `price`, `cost` ni `unit_cost`.

#### C. Modelo `Product`

| Campo          | Tipo     | Notas |
|----------------|----------|-------|
| `category`     | `String?`| En el esquema actual es un campo directo (no necesariamente relación a tabla `categories`). Usar `p.category`. |
| `cost`         | `Decimal?` | Costo estándar actual. |

#### D. Modelo `Location` / `Store` (si no existe)

Si el tenant maneja múltiples locales, crear modelo mínimo:
```prisma
model Location {
  id        String   @id @default(uuid())
  tenantId  String
  name      String
  address   String?
  capacity  Int?     // Asientos/mesas para RevPASH
  timezone  String   @default("America/Argentina/Buenos_Aires")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
}
```

#### E. Stubs para fases futuras (comentados o modelos mínimos)

Preparar el terreno para Fase 5+ sin implementar lógica:
```prisma
// model Recipe { ... }
// model RecipeItem { ... }
// model WasteRecord { ... }
// model PackagingCost { ... }
// model FixedCostAllocation { ... }
```

### 3.2 Índices obligatorios (Shared tier)

Crear o verificar índices compuestos que empiecen por `tenantId`:

```prisma
// En Order
@@index([tenantId, createdAt])
@@index([tenantId, status, createdAt])
@@index([tenantId, channel, createdAt])
@@index([tenantId, locationId, createdAt])

// En OrderLine
@@index([orderId])
@@index([productId])
@@index([orderId, productId])  // Para matriz producto-período
```

### 3.3 Contrato de datos – `analytics.manifest.json`

Crear (o actualizar) el archivo `analytics.manifest.json` en la raíz del backend o en `docs/` con al menos la siguiente estructura inicial (incluye stubs vacíos para módulos futuros):

```json
{
  "version": "1.21.0",
  "feature": "FEAT-067",
  "modules": {
    "orders": {
      "requiredFields": ["tenantId", "createdAt", "channel", "status", "totalAmount"],
      "recommendedFields": ["paidAt", "locationId", "tableNumber", "dinersCount", "employeeId"],
      "excludedStatuses": ["DRAFT", "CANCELLED"]
    },
    "orderLines": {
      "requiredFields": ["orderId", "productId", "quantity", "priceAtSale", "costAtSale"],
      "recommendedFields": ["discountAmount"]
    },
    "products": {
      "requiredFields": ["id", "name"],
      "recommendedFields": ["category", "cost"]
    },
    "locations": {
      "requiredFields": ["id", "tenantId", "name"],
      "recommendedFields": ["capacity", "timezone"]
    },
    "production": {
      "requiredFields": [],
      "recommendedFields": []
    },
    "purchases": {
      "requiredFields": [],
      "recommendedFields": []
    },
    "inventory": {
      "requiredFields": [],
      "recommendedFields": []
    },
    "hr": {
      "requiredFields": [],
      "recommendedFields": []
    },
    "fixedCosts": {
      "requiredFields": [],
      "recommendedFields": []
    }
  },
  "dimensions": ["time", "channel", "product", "category", "location", "tenant", "employee"],
  "factTables": ["order_lines", "orders"]
}
```

### 3.4 Validaciones y Data Quality (preparación)

Implementar (o dejar listo) un servicio o utilidad mínima que pueda calcular el **Data Quality Score** básico:

- % de órdenes que tienen `channel` informado.
- % de órdenes de restaurante que tienen `dinersCount` / `tableNumber`.
- % de `order_lines` que tienen `priceAtSale` no nulo.
- % de `order_lines` que tienen `costAtSale` no nulo.
- % de órdenes con timestamps coherentes (`paidAt >= createdAt`, `servedAt >= createdAt` si existen).

No es necesario exponer aún un endpoint público; solo la lógica interna y tests.

---

## 4. Restricciones Técnicas Inviolables

1. **Multi-tenant:** Toda consulta futura usará `WHERE "tenantId" = $tenantId`. No romper este contrato.
2. **Multi-tier:** El código debe seguir funcionando tanto en bases Shared como Dedicated. Servicios futuros usarán inyección dinámica:
   ```typescript
   const prisma = dbClient || this.prisma;  // Patrón @TenantPrisma
   ```
3. **Nombres reales del schema:**
   - Tabla de detalle = `order_lines` (no `order_items`)
   - Precio = `"priceAtSale"`
   - Costo = `"costAtSale"`
   - Total cabecera = `"totalAmount"`
   - Fechas = `"createdAt"`, `"paidAt"`, `"servedAt"`, etc.
4. **Migraciones Prisma:** Deben ser seguras (no destructivas). Usar `@default`, `?` y migraciones aditivas.
5. **Exclusión de BI:** Todas las agregaciones deben filtrar `status NOT IN ('DRAFT', 'CANCELLED')`.
6. **No implementar aún:** endpoints de analytics, cache Redis, WebSockets, frontend, exportación Excel, conectores ERP.
7. **Modelos completos de BOM, Waste, Packaging, FixedCost:** Solo preparar el terreno (stubs/comentarios) si es trivial.

---

## 5. Entregables Esperados

1. Migración(es) Prisma que agreguen/ajusten los campos e índices necesarios.
2. Actualización de los modelos en `schema.prisma` (enums, campos, Location, stubs).
3. Archivo `analytics.manifest.json` (versión inicial 1.21.0 con stubs).
4. Utilidad o servicio mínimo de Data Quality Score (puede ser interno).
5. Tests unitarios / de integración que verifiquen:
   - Existencia de los campos críticos.
   - Que las órdenes `DRAFT` y `CANCELLED` puedan identificarse correctamente.
   - Que `priceAtSale` y `costAtSale` estén presentes en `order_lines`.
   - Que `channel` use el enum `ChannelType`.
   - Que los índices compuestos existan.
6. Documentación breve de los cambios realizados (README de la fase o comentarios en el PR).

---

## 6. Criterios de Aceptación (Definition of Done)

- [ ] Todos los campos listados en la sección 3.1 existen y están tipados correctamente.
- [ ] Enum `OrderStatus` y `ChannelType` están normalizados y documentados.
- [ ] Índices compuestos por `tenantId` creados (incluyendo `OrderLine [orderId, productId]`).
- [ ] `analytics.manifest.json` existe, es válido y contiene stubs para módulos futuros.
- [ ] `npm run build` (backend) pasa sin errores.
- [ ] Tests existentes siguen pasando (cero regresiones).
- [ ] Se puede escribir una query de prueba del estilo:
  ```sql
  SELECT ol."priceAtSale", ol."costAtSale", o."channel", o."dinersCount", o."locationId"
  FROM order_lines ol
  JOIN orders o ON o.id = ol."orderId"
  WHERE o."tenantId" = $1
    AND o.status NOT IN ('DRAFT', 'CANCELLED')
  ```
  sin errores de columna.
- [ ] Data Quality utility compila y tests pasan.

---

## 7. Fuera de Alcance (explícito)

- Cualquier endpoint REST o GraphQL de analytics.
- Implementación de caché Redis.
- WebSockets / Live Stream.
- Frontend / Refine.
- Conectores Odoo / Tango / FacturaSend.
- Cálculo real de KPIs o matrices YoY.
- Modelos completos de BOM, Waste, Packaging, FixedCost (solo stubs).

---

## 8. Orden de Trabajo Recomendado

1. Revisar el `schema.prisma` actual y mapear qué campos ya existen.
2. Diseñar la migración aditiva (campos nuevos + enums + índices).
3. Actualizar el schema y generar la migración (`npx prisma migrate dev`).
4. Crear / actualizar `analytics.manifest.json`.
5. Implementar la utilidad mínima de Data Quality.
6. Escribir tests.
7. Ejecutar build + test suite completa.
8. Documentar los cambios.

---

## 9. Referencias

- Plan oficial corregido: `PLAN_DESARROLLO_MODULO_BI_v1.21.0_CORREGIDO.md`
- Análisis técnico de schema: `analisis_modulo_bi_analytics.md`
- Plan original de diseño (anexo): `OmniBI — Plan de Implementación.md`

---

## 10. Instrucción final

Implementa únicamente lo definido en este prompt. Si encuentras ambigüedades en el schema actual, documenta las decisiones tomadas y prioriza la compatibilidad hacia atrás. Al terminar, reporta un resumen de los campos agregados, los índices creados y el estado del `analytics.manifest.json`.
