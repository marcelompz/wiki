# ROADMAP EJECUTIVO OMNIMANUFACTURING & PRODUCCIÓN

> **Proyecto:** OrderFlow / OmniFlow → OmniManufacturing (MRP & Producción Industrial)  
> **Versión Baseline:** v1.25.0  
> **Fecha:** 18 de Septiembre de 2026  
> **Área:** Recetas/Escandallos (BoM), Órdenes de Producción, Conversión UoM, Merma & Costos

---

## 1. VISIÓN EJECUTIVA

**OmniManufacturing** gestiona los procesos de transformación de materia prima en producto terminado o insumo procesado. Ofrece recetas dinámicas (Bill of Materials - BoM), cálculo de mermas, órdenes de producción (MRP) y costeo atómico por lote.

---

## 2. HOJA DE RUTA Y ENTREGABLES

```mermaid
gantt
    title Roadmap OmniManufacturing 2026
    dateFormat  YYYY-MM-DD
    section Fase 1 (BoM & Conversión UoM)
    Estructura de BoM, Recetas & Categorías UoM (FEAT-096)  :done, p1, 2026-07-01, 2026-08-15
    Factor de Merma & Conversión de Unidades                 :done, p1_uom, 2026-08-16, 2026-09-10
    section Fase 2 (Live Escandallo & Órdenes)
    Live Escandallo Engine para Gastronomía (FEAT-118)       :active, p2_esc, 2026-09-11, 2026-10-31
    Órdenes de Producción Batch & Kits Fantasma              :p2_mrp, 2026-10-15, 2026-11-30
    section Fase 3 (MRP Avanzado & Auditoría)
    Planificación de Requerimiento de Materiales (MRP)        :p3_mrp, 2026-11-15, 2026-12-15
    Auditoría de Mermas & Menu Engineering (FEAT-124)         :p3_audit, 2026-12-01, 2026-12-31
```

### Detalle por Fase

1. **Fase 1: Recetas & Conversión UoM (COMPLETED)**
   - Catálogo de insumos y materia prima con unidades de medida (kg, g, L, ml, unidad).
   - Definición de recetas base (BoM) y porcentaje de merma estándar.

2. **Fase 2: Live Escandallo & Órdenes Batch (IN_PROGRESS)**
   - Motor de explosión atómica de recetas en tiempo real con Redis caching (< 100 ms).
   - Generación automática de orden de descuento al despachar en cocina.

3. **Fase 3: MRP & Auditoría de Rendimientos (PLANNED)**
   - Cálculo automático de requerimientos de compras según ventas proyectadas.
   - Matriz de costo real vs costo teórico para detección de mermas e ineficiencias.
