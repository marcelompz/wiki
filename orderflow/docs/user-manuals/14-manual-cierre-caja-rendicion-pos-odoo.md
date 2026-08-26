# 📘 Manual de Usuario: Cierre de Caja Híbrido y Rendición POS ➔ Odoo (`FEAT-093`)

> **Módulo:** POS / Rendición & Cierre de Caja  
> **Ubicación del Documento:** `docs/user-manuals/14-manual-cierre-caja-rendicion-pos-odoo.md`  
> **Versión de OrderFlow:** v1.20.28+  
> **Versión de Odoo Soportada:** Odoo CE (v14, v18, v19)  
> **Fecha:** 25 de Agosto de 2026

---

## 1. INTRODUCCIÓN Y PROPÓSITO

![Resumen de Cierre de Caja y Rendición de Turno en POS](/home/marcelompz/.gemini/antigravity-cli/brain/81248e19-f485-437b-aa12-83861e977a30/pos_cash_closure_summary_1787705844658.jpg)

Este manual explica el proceso de **arqueo de caja de turno y rendición de ventas** desde la aplicación POS de OrderFlow hacia los diarios contables y sesiones de caja de Odoo CE (`pos.session` / `account.journal`) (`FEAT-093`).

El cierre de turno consolida el volumen de ventas por medio de pago (Efectivo, Tarjeta, Transferencia, Venta a Crédito) y calcula el efectivo neto esperado en el cajón de la registradora.

---

## 2. PROCEDIMIENTO DE CIERRE EN EL POS

1. En la app POS de OrderFlow, el cajero selecciona la opción **Cierre de Turno / Arqueo de Caja**.
2. El sistema invoca el endpoint `POST /api/v1/orders/pos/session-close`.
3. Se genera un informe consolidado en pantalla e impreso en la ticketera térmica.

---

## 3. ESTRUCTURA DEL RESUMEN DE ARQUEO

```json
{
  "tenantId": "provecchio-dimora-001",
  "sessionId": "POS-provecch-178768000",
  "closedAt": "2026-08-25T20:30:00.000Z",
  "closedBy": "user-cajero-01",
  "summary": {
    "totalOrders": 32,
    "totalSalesAmount": 6500000,
    "breakdown": {
      "cash": 2500000,
      "card": 2000000,
      "transfer": 1000000,
      "credit": 1000000
    },
    "cashIn": 2500000,
    "cashOut": 300000,
    "netCashInDrawer": 2200000
  },
  "odooSync": {
    "synced": true,
    "status": "QUEUED_FOR_ODOO_JOURNAL"
  }
}
```

---

## 4. CONCILIACIÓN CONTABLE EN ODOO CE

Al cerrarse el turno:
- Se despacha la rendición hacia Odoo CE.
- Se genera el registro de sesión (`pos.session`) y el asiento contable en el diario de caja (`account.journal`).
- El departamento contable en Odoo puede auditar las diferencias entre el efectivo declarado y los movimientos en banco/tarjeta.
