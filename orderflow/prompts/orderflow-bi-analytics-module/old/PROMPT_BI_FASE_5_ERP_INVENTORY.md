# PROMPT – FEAT-067 · Fase 5: Integración de Terceros (ERP/Fiscal) + Inventory Intelligence

**Gobernanza:** FEAT-067 v1.21.0  
**Fase:** 5 – Integración de Terceros (ERP/Fiscal) + Inventory Intelligence  
**Documento padre:** `PLAN_DESARROLLO_MODULO_BI_v1.21.0_CORREGIDO.md`  
**Dependencias:** Fase 0 (Data Foundation) + Fase 1 (Backend Core)  
**Prioridad:** Media-Alta  
**Stack:** NestJS · Prisma · PostgreSQL · Conectores ERP (Odoo 18/19, Tango, FacturaSend/SIFEN) · Multi-tenant

---

## 1. Rol y Contexto

Eres un ingeniero senior de backend especializado en integraciones ERP, sincronización de datos fiscales/contables y analítica de inventarios.  
Tu tarea es implementar la **Fase 5 – Integración de Terceros (ERP/Fiscal) + Inventory Intelligence** del módulo OmniFlow BI (FEAT-067).

Esta fase extiende el motor de BI más allá de las ventas puras de OrderFlow, incorporando:

- Datos de costos reales y valorización (PMP) provenientes de ERPs.
- Reconciliación operativa vs fiscal (FacturaSend / SIFEN).
- Métricas de inventario (rotación, cobertura, stock crítico, etc.).

Debes respetar:
- El modelo multi-tenant / multi-tier.
- El contrato `analytics.manifest.json`.
- La arquitectura de agregación de la Fase 1 (reutilizar patrones de `$queryRaw` + servicios).
- No romper los endpoints ya existentes de ventas/KPIs.

---

## 2. Objetivo de la Fase

1. Definir e implementar el **ERP Pre-processor** (capa de normalización de datos externos).
2. Incorporar al modelo de BI los datos necesarios para:
   - Costos reales / PMP
   - Ventas B2B y facturación directa desde ERP
   - Lead time de proveedores
   - Estado fiscal de documentos electrónicos (SIFEN)
3. Entregar **Inventory Intelligence**:
   - Rotación de stock
   - Cobertura (días)
   - Stock crítico / puntos de reorden
   - Slow moving & overstock
4. Exponer endpoints de analytics que combinen datos de OrderFlow + ERP + Inventario.
5. Actualizar `analytics.manifest.json` con los nuevos módulos y campos.

---

## 3. Alcance Detallado

### 3.1 ERP Pre-processor – Contrato de datos

Extender / crear el contrato en `analytics.manifest.json` para el módulo ERP:

```json
"erp": {
  "requiredFields": ["cost_price_pmp", "sifen_fiscal_status"],
  "optionalFields": ["account_move_id", "b2b_sales_amount", "supplier_lead_time"],
  "sources": ["odoo_18", "odoo_19", "tango", "facturasend"]
}
```

#### Campos ERP a soportar (mapeo conceptual)

| Campo BI              | Origen típico (Odoo / Tango / FacturaSend)      | Uso en analytics                          |
|-----------------------|--------------------------------------------------|-------------------------------------------|
| `cost_price_pmp`      | `standard_price` / movimientos `stock.move`      | Margen real, COGS, rentabilidad           |
| `account_move_id`     | `account.move`                                   | Trazabilidad fiscal / contable            |
| `b2b_sales_amount`    | Facturas / ventas directas ERP                   | Visión unificada B2B + retail             |
| `supplier_lead_time`  | `purchase.order` / `stock.picking`               | Alertas predictivas de quiebre            |
| `sifen_fiscal_status` | FacturaSend / SIFEN (`APPROVED`, `PENDING`…)     | Reconciliación operativa vs fiscal        |

> **Nota:** No es necesario implementar los conectores completos de sincronización en esta fase si ya existen en el sistema. El foco es **normalizar y consumir** los datos ya disponibles (o dejar la interfaz lista) para el motor de BI.

### 3.2 Modelos / Tablas de soporte

Asegurar (o crear de forma aditiva) las estructuras necesarias:

- Movimientos de inventario (`stock_movements` / `inventory_movements`) con: producto, cantidad, costo, tipo (entrada/salida), fecha, `tenantId`.
- Posible tabla o vista de **costos históricos** o snapshot de PMP por producto/fecha.
- Campos de reconciliación fiscal en órdenes o en una tabla de documentos electrónicos.

Si los modelos ya existen, documentar el mapeo. Si no, crear migraciones mínimas aditivas.

### 3.3 Inventory Intelligence – Métricas y endpoints

Implementar al menos los siguientes cálculos (usando `$queryRaw` o agregaciones Prisma según convenga):

| KPI / Métrica          | Fórmula / Lógica principal                                                                 | Endpoint sugerido |
|------------------------|---------------------------------------------------------------------------------------------|-------------------|
| **Rotación de Stock**  | `COGS / Stock promedio` (Stock promedio = (inicial + final) / 2)                            | `GET /analytics/inventory/rotation` |
| **Cobertura (días)**   | `Stock actual / Consumo promedio diario`                                                    | `GET /analytics/inventory/coverage` |
| **Stock Crítico**      | Productos donde `stock_actual ≤ punto_de_reorden` (o umbral configurable)                   | `GET /analytics/inventory/critical` |
| **Slow Moving**        | Productos con rotación muy baja o sin movimientos en X días                                 | `GET /analytics/inventory/slow-moving` |
| **Overstock**          | Productos con cobertura excesiva                                                            | `GET /analytics/inventory/overstock` |
| **Valorización**       | `SUM(stock_actual * cost_pmp)`                                                              | Incluido en resumen |

**Query parameters comunes:** `locationId?`, `category?`, `asOfDate?`, `daysThreshold?`.

### 3.4 Endpoints de Analytics ampliados

Además de los de inventario, extender o crear:

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`  | `/analytics/inventory/summary`     | Resumen ejecutivo de inventario (valorización, % crítico, rotación promedio…) |
| `GET`  | `/analytics/erp/reconciliation`    | Comparativa ventas OrderFlow vs documentos fiscales aprobados (SIFEN) |
| `GET`  | `/analytics/margins/real`          | Márgenes usando `cost_price_pmp` en lugar de costo estándar (si aplica) |

Todos deben:
- Filtrar por `tenantId`.
- Soportar `dbClient?: any`.
- Reutilizar patrones de DTOs, validación y respuesta de la Fase 1.

### 3.5 Actualización de `analytics.manifest.json`

Agregar las secciones:

- `inventory`
- `erp`
- Dimensiones adicionales si es necesario (`supplier`, `warehouse`…)
- Fact tables nuevas (`inventory_movements`, etc.)

### 3.6 Integración con el modelo de rentabilidad (preparación)

Dejar listo (aunque sea de forma parcial) el uso de `cost_price_pmp` y costos de mermas/packaging para que las fases posteriores de Decision Intelligence y P&L puedan consumirlos sin nuevos cambios de schema.

---

## 4. Restricciones Técnicas Inviolables

1. **Multi-tenant estricto** – todo filtrado por `tenantId`.
2. **No asumir que los conectores ERP ya sincronizan en tiempo real** – diseñar la capa de lectura de forma tolerante a datos eventualmente consistentes.
3. No modificar el comportamiento de los endpoints de ventas/KPIs de la Fase 1.
4. Migraciones aditivas y seguras.
5. No implementar la UI de inventario en esta fase (solo backend + contratos). La visualización puede ir en una iteración posterior de la Fase 3 o en un prompt de extensión.
6. No implementar aún Insights automáticos ni alertas proactivas (Fase 6).

---

## 5. Entregables Esperados

1. Actualización de `analytics.manifest.json` con módulos `erp` e `inventory`.
2. Migraciones / ajustes de schema necesarios para costos PMP, movimientos de inventario y estado fiscal.
3. Servicios de Inventory Intelligence (rotation, coverage, critical, etc.).
4. Endpoints listados en la sección 3.4.
5. (Si aplica) Interfaz o adaptadores mínimos del ERP Pre-processor para normalizar los campos del contrato.
6. Tests de integración:
   - Cálculo correcto de rotación y cobertura con datos de prueba.
   - Filtro `tenantId` y exclusión de datos de otros tenants.
   - Reconciliación básica operativa vs fiscal (mock o datos de prueba).
7. Documentación del mapeo de campos ERP → BI y de las nuevas métricas.

---

## 6. Criterios de Aceptación (Definition of Done)

- [ ] `analytics.manifest.json` incluye las secciones `erp` e `inventory` con los campos definidos.
- [ ] Existen endpoints funcionales de resumen de inventario, stock crítico y al menos rotación o cobertura.
- [ ] Se puede obtener un margen “real” usando costo PMP cuando el dato está disponible.
- [ ] Existe al menos un endpoint o método de reconciliación operativa vs fiscal (SIFEN).
- [ ] Todas las consultas respetan `tenantId` y funcionan con `dbClient` inyectado.
- [ ] Tests pasan y el build del backend es exitoso.
- [ ] No se rompieron los endpoints de la Fase 1.

---

## 7. Fuera de Alcance (explícito)

- Implementación completa de los conectores de sincronización Odoo/Tango/FacturaSend (solo la capa de consumo/normalización para BI).
- Frontend de Inventory Intelligence o de reconciliación fiscal (puede quedar para extensión de Fase 3).
- Alertas proactivas de quiebre de stock o insights automáticos (Fase 6).
- Cálculo completo de rentabilidad neta industrial con MOD, mermas y prorrateo de fijos (se prepara el terreno, la orquestación completa puede vivir en Decision Intelligence o en un prompt posterior).
- Live Stream de inventario (no requerido).

---

## 8. Orden de Trabajo Recomendado

1. Revisar el schema actual de inventario, productos y cualquier integración ERP ya existente.
2. Actualizar `analytics.manifest.json`.
3. Diseñar / ajustar los modelos necesarios (movimientos, costos PMP, estado fiscal).
4. Implementar los servicios de cálculo de Inventory Intelligence.
5. Crear los endpoints de analytics de inventario y reconciliación.
6. Integrar el uso de `cost_price_pmp` en al menos un cálculo de margen.
7. Escribir tests.
8. Documentar mapeos y decisiones.
9. Verificar que la Fase 1 sigue intacta.

---

## 9. Ejemplo de respuesta – Inventory Summary

```json
{
  "asOfDate": "2026-08-17",
  "totalValuation": 284500.00,
  "averageRotation": 4.2,
  "criticalItemsCount": 12,
  "slowMovingCount": 27,
  "overstockCount": 8,
  "coverageDaysAverage": 18.5,
  "byCategory": [
    {
      "category": "Bebidas",
      "valuation": 45200.00,
      "rotation": 6.1,
      "criticalCount": 2
    }
  ]
}
```

---

## 10. Referencias

- Plan oficial corregido: `PLAN_DESARROLLO_MODULO_BI_v1.21.0_CORREGIDO.md` (Secciones 5, 6, 7 – Fuentes, KPIs de Inventario y Producción)
- Plan original (anexo): `OmniBI — Plan de Implementación.md` (ERP Pre-processor + Inventory Intelligence + Fase 5/5B)
- Prompt Fase 0: `PROMPT_BI_FASE_0_DATA_FOUNDATION.md`
- Prompt Fase 1: `PROMPT_BI_FASE_1_BACKEND_CORE.md`
- Contrato: `analytics.manifest.json`

---

**Instrucción final:**  
Implementa la capa de Integración ERP + Inventory Intelligence descrita en este prompt.  
Prioriza la normalización de datos, los cálculos de inventario y la no-regresión de la Fase 1.  
Al terminar, reporta:  
1) cambios en `analytics.manifest.json`,  
2) nuevos endpoints,  
3) mapeo de campos ERP utilizados,  
4) resultados de los tests de rotación/cobertura/críticos y de aislamiento multi-tenant.
