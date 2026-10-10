# ROADMAP EJECUTIVO POS & KDS (POS_KDS)

> **Proyecto:** OrderFlow / OmniFlow → Punto de Venta & Cocina (POS / KDS)  
> **Versión Baseline:** v1.25.0  
> **Fecha:** 18 de Septiembre de 2026  
> **Área:** Caja Retail, Comanderas, KDS Nativo y Conectividad Periféricos

---

## 1. VISIÓN EJECUTIVA

La vertical **POS & KDS** es el núcleo de captura de transacciones presenciales e interacción con cocina en tiempo real. Proporciona una arquitectura offline-first (IndexedDB + Dexie), sincronización reactiva vía WebSockets y un puente de hardware nativo (Tauri/Rust) para periféricos de caja.

---

## 2. FASES Y ROADMAP DE ENTREGABLES

```mermaid
gantt
    title Roadmap POS & KDS 2026
    dateFormat  YYYY-MM-DD
    section Fase 1 (Caja & POS Core)
    POS Sessions, Arqueos & Arqueo Variance (FEAT-097, FEAT-113) :done, p1, 2026-08-01, 2026-09-15
    section Fase 2 (KDS & Tiempos)
    KDS Real-time WebSockets & Stations (FEAT-117)             :active, p2, 2026-09-16, 2026-10-15
    Bump Bars & Sonidos de Alerta                              :p2_bump, 2026-10-01, 2026-10-30
    section Fase 3 (Hardware & Periféricos)
    Tauri Hardware Bridge (Báscula, Cajón RJ12, Datáfonos)    :p3_hw, 2026-10-15, 2026-11-15
    Pagos Offline Store-and-Forward (FEAT-121)                 :p3_off, 2026-11-01, 2026-12-15
```

### Detalle por Fase

1. **Fase 1: Caja & POS Core (COMPLETED)**
   - Sesiones POS reales (`OPENING_CONTROL`, `OPEN`, `CLOSING_CONTROL`, `CLOSED`).
   - Gestión de arqueo de caja con variaciones (`cashClosingDelta`).
   - Permisos de caja granularizados (`cash:open`, `cash:close`, `cash:movement`).

2. **Fase 2: KDS Nativo & Tiempos de Cocina (IN_PROGRESS)**
   - Pantalla KDS multiestación con tiempos de preparación y colores según urgencia.
   - Coursing por tiempos (Bebidas, Entradas, Principales, Postres).
   - Integración con dispositivos Bump Bar e impresión de comandas térmicas.

3. **Fase 3: Hardware Bridge & Operación Offline (PLANNED)**
   - Soporte nativo para básculas RS232, cajones RJ12 e impresoras ESC/POS mediante Tauri/Rust.
   - Algoritmo de pagos offline cifrado Store-and-Forward con re-intento automático.

---

## 3. KPIs DE NIVELES DE SERVICIO

| Métrica | Meta |
|---------|------|
| Latencia de actualización KDS | < 50 ms |
| Tiempo de apertura de pantalla POS | < 1,2 s |
| Sincronización de transacciones offline | 100% consistencia |
