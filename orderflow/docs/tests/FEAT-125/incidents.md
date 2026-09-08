# FEAT-125 — Incident & Observation Log

**Feature ID:** `FEAT-125`  

---

## 📌 Incidencias Registradas

| ID | Fecha | Gravedad | Descripción | Estado | Solución / Observación |
|---|---|---|---|---|---|
| **INC-125-01** | 2026-09-04 | Media | El stock se descontaba al crear el `GUEST_DRAFT` | Resuelto | Se ajustó el backend para posponer el descuento de stock a la fase de confirmación/cocina (post-FEAT-113). |
| **INC-125-02** | 2026-09-04 | Baja | La opción de cobro en el mozo exigía procesamiento de pago digital directo | Resuelto | Se implementó el Dropdown de 3 opciones de cierre (`WITHOUT_PAYMENT`, `WAITER_CUSTODY`, `GATEWAY`). |

---

## 📝 Observaciones para Versión Beta (Post-Alfa)

1. En la versión alfa, los datos de `WaiterCall` se gestionan en la configuración JSON del tenant (`Tenant.config.gastro.waiterCalls`). En la fase beta se migrará a la tabla relacional `WaiterCall` de Prisma.
2. El cobro en mesa en modo `WAITER_CUSTODY` generará movimientos de caja atómicos (`CashMovement`) integrados con la sesión POS activa.
