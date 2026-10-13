# ROADMAP EJECUTIVO INVENTARIO & MULTI-BODEGA (INVENTARIO)

> **Proyecto:** OrderFlow / OmniFlow → Inventario & Logística Multi-Sucursal  
> **Versión Baseline:** v1.25.0  
> **Fecha:** 18 de Septiembre de 2026  
> **Área:** Stock Quants, Bodegas, Ubicaciones internas, Transferencias & Valoración

---

## 1. VISIÓN EJECUTIVA

La vertical **Inventario** proporciona la trazabilidad atómica de existencias mediante el modelo `StockQuant` (Inspirado en Odoo stock.quant). Administra depósitos, pasillos, ubicaciones de stock, transferencias internas, recepción de compras y ajustes periódicos.

---

## 2. HOJA DE RUTA Y ENTREGABLES

```mermaid
gantt
    title Roadmap Inventario 2026
    dateFormat  YYYY-MM-DD
    section Fase 1 (StockQuants & Bodegas)
    Estructura de Warehouses, Locations & StockQuants (FEAT-096) :done, p1, 2026-06-01, 2026-07-31
    Ajustes de Inventario & Auditoría de Stock                  :done, p1_adj, 2026-07-15, 2026-08-30
    section Fase 2 (Transferencias & Lotes)
    Transferencias Internas entre Bodegas (StockMove)           :active, p2_tr, 2026-09-01, 2026-10-31
    Control de Lotes & Fechas de Vencimiento                    :p2_batch, 2026-10-15, 2026-11-30
    section Fase 3 (Valoración & Reabastecimiento)
    Valoración de Stock PPP (Precio Promedio Ponderado)         :p3_val, 2026-11-15, 2026-12-15
    Reglas de Reabastecimiento Automático (Min/Max)             :p3_reorder, 2026-12-01, 2026-12-31
```

### Detalle por Fase

1. **Fase 1: StockQuants & Bodegas (COMPLETED)**
   - Jerarquía de bodegas (`Warehouse`) y ubicaciones internas (`Location`).
   - Registro de existencias en tiempo real por ubicación (`StockQuant`).

2. **Fase 2: Transferencias Internas & Lotes (IN_PROGRESS)**
   - Movimientos de stock entre depósitos (`StockMove` origen/destino) con estado borrador/confirmado.
   - Seguimiento por número de lote y alertas de expiración.

3. **Fase 3: Valoración de Inventario & Reabastecimiento (PLANNED)**
   - Cálculo de costo promedio ponderado en entradas de stock.
   - Disparo automático de órdenes de compra/producción según stock mínimo.
