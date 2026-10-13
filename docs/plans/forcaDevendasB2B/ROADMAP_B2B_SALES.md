# ROADMAP EJECUTIVO FUERZA DE VENTAS B2B (B2B_SALES)

> **Proyecto:** OrderFlow / OmniFlow → B2B Sales & Venta Asistida  
> **Versión Baseline:** v1.25.0  
> **Fecha:** 18 de Septiembre de 2026  
> **Área:** Portal Mayorista, Cotizaciones, Rutas de Vendedores & Créditos B2B

---

## 1. VISIÓN EJECUTIVA

La vertical **Fuerza de Ventas B2B** optimiza la canalización de pedidos mayoristas y venta en ruta. Incluye un portal autogestionado para clientes distribuidores, catálogo con precios según volumen, gestión de límites de crédito y presupuestos con aprobación.

---

## 2. HOJA DE RUTA Y ENTREGABLES

```mermaid
gantt
    title Roadmap Fuerza de Ventas B2B 2026
    dateFormat  YYYY-MM-DD
    section Fase 1 (Portal Mayorista & Cotizaciones)
    Portal B2B Autogestionado & Precios por Volumen     :done, p1, 2026-06-01, 2026-07-31
    Módulo de Cotizaciones & Presupuestos (FEAT-085)    :done, p1_quot, 2026-07-15, 2026-08-30
    section Fase 2 (Venta en Ruta & Créditos)
    App Mobile de Vendedores en Ruta                    :active, p2_mob, 2026-09-01, 2026-10-31
    Evaluación de Crédito, Riesgo & Cobranzas          :p2_cred, 2026-10-15, 2026-11-30
    section Fase 3 (Descuentos Complejos & EDI)
    Descuentos por Escala & Promociones B2B             :p3_disc, 2026-11-15, 2026-12-15
    Integración EDI / ERP Facturación Masiva           :p3_edi, 2026-12-01, 2026-12-31
```

### Detalle por Fase

1. **Fase 1: Portal Mayorista & Cotizaciones (COMPLETED)**
   - Autenticación B2B por empresa con catálogo personalizado.
   - Emisión de presupuestos con validez y conversión directa a pedido.

2. **Fase 2: Venta en Ruta & Gestión de Crédito (IN_PROGRESS)**
   - Aplicación para preventistas en ruta con toma de pedido offline.
   - Verificación de saldo disponible y bloqueo por mora.

3. **Fase 3: Promociones Avanzadas & EDI (PLANNED)**
   - Reglas comerciales avanzadas (bonificaciones por volumen, mix de productos).
   - Integración EDI para intercambio electrónico de documentos con cadenas mayoristas.
