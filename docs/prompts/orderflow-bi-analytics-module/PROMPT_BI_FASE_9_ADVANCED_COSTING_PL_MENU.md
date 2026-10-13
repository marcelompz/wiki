---

# `PROMPT_BI_FASE_9_ADVANCED_COSTING_PL_MENU.md`

```markdown
# PROMPT: MÓDULO BI — FASE 9: INDUSTRIAL COSTING, ADVANCED P&L & MENU ENGINEERING

## 1. Contexto y Objetivos

Esta fase implementa la capa de **Rentabilidad Integral**, permitiendo pasar de un análisis superficial de ingresos a un desglose real de rentabilidad industrial y comercial. Cubre el costeo avanzado mediante recetas/BOM, desvíos por mermas, mano de obra directa (MOD), el Estado de Resultados Dinámico (P&L Multinivel), la Matriz de Menu Engineering y KPIs de utilización de capacidad física (RevPASH).

---

## 2. Dependencias y Pre-requisitos

* **Fase 0 (Data Foundation):** Entidades `Order`, `OrderLine`, `Location` (campo `capacity`), `costAtSale` nullable en DB.
* **Fase 1 (Backend Core):** Patrón `$queryRaw` seguro, filtros dinámicos mediante whitelists.
* **Fase 5 (ERP & Inventory):** Costeo PMP (`costPricePmp`), movimientos de stock y valorización de inventario.

---

## 3. Especificaciones Técnicas

### 3.1 Extensiones al Schema de Base de Datos (Prisma)

Añadir modelos para Bill of Materials (BOM) / Recetas y Costos Operativos Fijos/Variables:

```prisma
model BillOfMaterials {
  id              String       @id @default(uuid())
  tenantId        String
  productId       String       // Producto terminado
  rawMaterialId   String       // Insumo / Materia prima
  grossQuantity   Decimal      @db.Decimal(10, 4) // Cantidad bruta requerida
  wastePercentage Decimal      @default(0) @db.Decimal(5, 2) // % Merma esperada
  unitOfMeasure   String

  @@unique([tenantId, productId, rawMaterialId])
  @@map("bill_of_materials")
}

model OperationalCostAllocation {
  id              String    @id @default(uuid())
  tenantId        String
  locationId      String?
  period          DateTime  @db.Date // Ej. 2026-08-01
  laborCostDirect Decimal   @db.Decimal(12, 2) // Mano de Obra Directa (MOD)
  fixedOverhead   Decimal   @db.Decimal(12, 2) // Alquileres, Luz, Servicios
  otherOpex       Decimal   @db.Decimal(12, 2)

  @@unique([tenantId, locationId, period])
  @@map("operational_cost_allocations")
}
### 3.2 Lógica de Cálculo y Algoritmos

#### A. P&L Dinámico Multinivel
El desglose financiero responderá a la siguiente estructura matemática:

$$
\begin{aligned}
\text{Ingresos Brutos} &= \sum (\text{Líneas de Venta}) \\
\text{Ingresos Netos} &= \text{Ingresos Brutos} - \text{Descuentos} - \text{Impuestos Directos} \\
\text{Margen de Contribución 1 (MC1)} &= \text{Ingresos Netos} - \text{COGS Directo (PMP / Receta)} \\
\text{Margen de Contribución 2 (MC2)} &= \text{MC1} - \text{Mermas Reales} - \text{MOD Asignada} \\
\text{EBITDA / Resultado Operativo} &= \text{MC2} - \text{Costos Fijos Asignados}
\end{aligned}
$$

#### B. Menu Engineering Matrix (Matriz BCG Gastronómica)
Cada producto se clasificará cruzando su Índice de Popularidad (Volumen vendido vs. Promedio) y su Margen de Contribución Unitario ($MC = \text{Precio} - \text{Costo}$):

| Clasificación | Popularidad | Margen de Contribución | Acción Estratégica |
| --- | --- | --- | --- |
| **STARS (Estrellas)** | Alta ($\ge \text{Promedio}$) | Alto ($\ge \text{Promedio}$) | Mantener calidad, visibilidad prioritaria. |
| **PLOWHORSES (Caballos de Batalla)** | Alta ($\ge \text{Promedio}$) | Bajo ($< \text{Promedio}$) | Incrementar margen (reducir porciones o subir precio). |
| **PUZZLES (Rompecabezas)** | Baja ($< \text{Promedio}$) | Alto ($\ge \text{Promedio}$) | Marketing, cambio de nombre/ubicación en carta. |
| **DOGS (Perros)** | Baja ($< \text{Promedio}$) | Bajo ($< \text{Promedio}$) | Eliminar de la carta o rediseñar por completo. |

#### C. RevPASH (Revenue Per Available Seat Hour)
Para locales físicos (canal POS Restaurante):

$$
\text{RevPASH} = \frac{\text{Ventas Netas del Período}}{\text{Asientos Disponibles (Location.capacity)} \times \text{Horas Abiertas}}
$$

### 3.3 Endpoints Requeridos (AdvancedProfitabilityController)

1. `GET /api/v1/bi/profitability/pl-statement`
   - **Query Params:** `startDate`, `endDate`, `locationId?`
   - **Response DTO:**

```typescript
interface DynamicPlDto {
  grossRevenue: number;
  discounts: number;
  netRevenue: number;
  cogsDirect: number;
  contributionMargin1: { amount: number; percentage: number };
  wasteAmount: number;
  laborDirect: number;
  contributionMargin2: { amount: number; percentage: number };
  fixedCosts: number;
  operatingProfit: { amount: number; percentage: number };
}
```

2. `GET /api/v1/bi/profitability/menu-engineering`
   - **Query Params:** `startDate`, `endDate`, `categoryId?`
   - **Response DTO:** Lista de productos catalogados con:
     - `volume`: Cantidad vendida
     - `unitMargin`: Margen unitario en moneda
     - `classification`: 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG'
     - `suggestedAction`: Recomendación automatizada

3. `GET /api/v1/bi/operations/revpash`
   - **Query Params:** `startDate`, `endDate`, `locationId` (obligatorio)
   - **Response DTO:** Serie temporal (por hora/día) del índice RevPASH comparado con la tasa de rotación de mesas.

### 4. Criterios de Aceptación

- **Cálculo Robusto de Mermas:** El desvío de costo debe contemplar tanto la merma estándar configurada en el BOM como los ajustes manuales de stock por rotura/vencimiento provenientes de Fase 5.
- **Manejo de Costos Nulos:** Si un producto histórico carece de BOM o de `costAtSale`, el servicio debe reportarlo como "Costo no parametrizado" en el Data Quality Score en lugar de fallar con división por cero.
- **Consistencia de Tipos:** Todo valor monetario debe procesarse usando `Decimal` de Prisma/PostgreSQL sin pérdida de precisión de punto flotante.
