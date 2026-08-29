# **🗺️ PLAN MAESTRO DE TRANSICIÓN: ODOO CE ➔ FORK FASTAPI LEDGER**

> **Documento:** `docs/planes/ROADMAP_ODOO_TO_FASTAPI_TRANSITION.md`  
> **Extensión de:** `ROADMAP_ODOO_BACKEND_ADOPTION.md (v3.0)`  
> **Versión:** 3.5  
> **Fecha:** 26 de Agosto de 2026  
> **Objetivo:** Ejecutar una migración transparente desde Odoo CE como backend contable temporal hacia un microservicio propio en **FastAPI (Python)** de ultra-alto rendimiento, desbloqueando funciones restringidas de Odoo CE (como crédito directo en PDV) y reduciendo el footprint de infraestructura a una fracción mínima.

---

## **1\. RESUMEN EJECUTIVO Y JUSTIFICACIÓN ARQUITECTÓNICA**

┌─────────────────────────────────────────────────────────────────────────┐

│                           FRONT-OFFICE OMNIFLOW                         │

│  \- POS Offline-First (Tauri \+ Dexie.js)                                │

│  \- Catálogo Social & Fuerza de Ventas B2B (React \+ WebP Sharp)          │

│  \- Facturación Electrónica SIFEN/DNIT nativa vía FacturaSend API        │

└────────────────────────────────────┬────────────────────────────────────┘

                                     │

                        (Eventos JSON vía BullMQ / Redis)

                                     ▼

┌─────────────────────────────────────────────────────────────────────────┐

│                     INTEGRATION WORKER (Agnóstico)                      │

│        (Consume eventos de venta, cobro, compras y transferencias)      │

└──────────────────┬──────────────────────────────────┬───────────────────┘

                   │                                  │

      \[ FASE 1: PUENTE TEMPORAL \]        \[ FASE 2: REEMPLAZO DEFINITIVO \]

                   ▼                                  ▼

┌─────────────────────────────────────┐  ┌────────────────────────────────┐

│           ODOO CE BACKEND           │  │      FASTAPI LEDGER FORK       │

│  \- Instancia pesada (Gevent/ORM)    │  │  \- AsyncPG \+ SQLModel \+ Pydantic│

│  \- Restricciones en POS nativo      │  │  \- Latencia \<10ms por asiento   │

│  \- Consumo: 600MB-1GB RAM/tenant    │  │  \- Consumo: \~150MB multi-tenant │

│  \- XML-RPC / JSON-RPC legacy        │  │  \- Crédito en PDV Desbloqueado  │

└─────────────────────────────────────┘  └────────────────────────────────┘

### ***Objetivos Principales:***

1. **Desacoplamiento Fiscal Resuelto:** Dado que **FacturaSend** asume toda la complejidad criptográfica y normativa de SIFEN (XML, firmas, CDC, QR, KUDE), el backend contable se reduce estrictamente a un **Libro Mayor de Partida Doble (Pure Double-Entry Ledger)**.  
2. **Eliminación del Overhead de Servidor:** Pasar de aprovisionar múltiples contenedores pesados de Python/Odoo a un solo microservicio asíncrono multi-tenant en FastAPI.  
3. **Desbloqueo de Capacidades de Odoo Enterprise:** Incorporar directamente en el motor FastAPI la contabilización en tiempo real de ventas a crédito desde el POS, analítica por JSONB y gestión ágil de cuentas corrientes de clientes (`partner_id`).

---

## **2\. EL CONTRATO CANÓNICO (EL PUENTE TRANSPARENTE)**

Para que el cambio de Odoo CE a FastAPI ocurra sin tocar el frontend ni el core de OmniFlow, el worker de BullMQ utilizará un **DTO Agnóstico**.

### ***DTO Canónico: Venta a Crédito en POS (`CREATE_INVOICE_MOVE`)***

{

  "event": "CREATE\_INVOICE\_MOVE",

  "version": "1.0",

  "tenant\_id": "empresa\_cde\_01",

  "payload": {

    "partner\_id": 1042,

    "partner\_name": "Distribuidora del Este S.A.",

    "partner\_tax\_id": "80012345-6",

    "journal\_code": "POS\_INV",

    "move\_type": "out\_invoice",

    "date": "2026-08-26",

    "invoice\_date\_due": "2026-09-25",

    "payment\_type": "credit",

    "currency\_code": "PYG",

    "fiscal\_number": "001-001-0004589",

    "sifen\_cdc": "01800123456001001000458912026082612345678901",

    "lines": \[

      {

        "account\_code": "4.1.1.01",

        "description": "Venta de Mercaderías \- Salón",

        "debit": 0,

        "credit": 1000000,

        "tax\_code": "IVA\_10",

        "tax\_amount": 90909

      }

    \],

    "receivable\_line": {

      "account\_code": "1.1.2.01",

      "debit": 1000000,

      "credit": 0

    }

  }

}

* **Comportamiento en Fase 1 (Odoo CE):** El adaptador transforma este DTO en una llamada XML-RPC para crear y validar un `account.move`.  
* **Comportamiento en Fase 2 (FastAPI):** El adaptador hace un `POST /api/v1/moves` directo hacia el servicio FastAPI, que inserta el asiento en PostgreSQL en milisegundos.

---

## **3\. ESPECIFICACIÓN DEL MOTOR FASTAPI ("OMNILEDGER")**

El microservicio se construirá manteniendo los nombres y principios de diseño probados del modelo contable de Odoo, eliminando todo el código innecesario.

### ***3.1. Stack Técnico***

* **Lenguaje:** Python 3.12+ (Async I/O nativo).  
* **Framework:** FastAPI \+ Pydantic v2 (validación estricta y serialización ultra-rápida).  
* **Capa de Datos:** SQLAlchemy 2.0 (Async) / SQLModel \+ AsyncPG.  
* **Migraciones:** Alembic con versionado compatible con esquemas de Odoo (`v18-compat`, `v19-compat`).  
* **Multi-Tenancy:** Esquemas aislados por tenant en PostgreSQL (`tenant_id.schema`) o Row-Level Security (RLS).

### ***3.2. Mapeo Canónico de Entidades (Odoo ➔ FastAPI)***

| Entidad Odoo | Tabla FastAPI (PostgreSQL) | Responsabilidad |
| :---- | :---- | :---- |
| `account.account` | `account_accounts` | Plan de cuentas jerárquico (Activo, Pasivo, Patrimonio, Ingresos, Gastos). |
| `account.journal` | `account_journals` | Diarios contables (Ventas, Compras, Banco, Efectivo POS, Operaciones Varias). |
| `account.move` | `account_moves` | Cabecera del asiento/factura (Fecha, Estado: `draft`/`posted`, Ref Fiscal). |
| `account.move.line` | `account_move_lines` | Apuntes contables individuales (Débito, Crédito, Balance, Partner). |
| `account.tax` | `account_taxes` | Reglas y porcentajes de impuestos (IVA 10%, IVA 5%, Exentas). |
| `res.partner` (Ledger) | `partner_ledgers` | Estado de cuenta, límite de crédito y saldo pendiente por cliente/proveedor. |

---

## **4\. CASO DE USO CRÍTICO: VENTAS A CRÉDITO EN PDV (POS)**

Superando la limitación nativa de Odoo CE, donde el POS tradicional no maneja cuentas corrientes fluidas sin cerrar sesión:

### ***Flujo Operativo y Asiento Contable Automático:***

1. **En OmniFlow POS:**  
   * El cajero selecciona al cliente, verifica su saldo/límite de crédito disponible y selecciona método de pago: **"Crédito a 30 días"**.  
   * Se emite la factura electrónica legal vía **FacturaSend API**.  
2. **Encolado en BullMQ:**  
   * Se emite de inmediato el evento `CREATE_INVOICE_MOVE` con `payment_type="credit"`.  
3. **Impacto en el Ledger (FastAPI / Odoo):**  
   * Se asienta de forma atómica e inmediata:  
     * **DÉBITO:** `1.1.2.01` (Cuentas por Cobrar Clientes \- \[Partner ID\]) ➔ 1.000.000 ₲  
     * **CRÉDITO:** `4.1.1.01` (Ventas de Mercaderías) ➔ 909.091 ₲  
     * **CRÉDITO:** `2.1.1.01` (IVA Débito Fiscal 10%) ➔ 90.909 ₲  
4. **Cobro Posterior de la Cuota (Amortización):**  
   * Cuando el cliente paga en caja, OmniFlow emite `CREATE_PAYMENT_MOVE`:  
     * **DÉBITO:** `1.1.1.01` (Caja Central / Recaudaciones a Depositar) ➔ 1.000.000 ₲  
     * **CRÉDITO:** `1.1.2.01` (Cuentas por Cobrar Clientes \- \[Partner ID\]) ➔ 1.000.000 ₲

*El saldo de la cuenta corriente del cliente se actualiza en tiempo real en la base de datos sin depender de cierres de caja diarios.*

---

## **5\. ROADMAP Y FASES DE EJECUCIÓN (2026 \- 2027\)**

gantt

    title Plan de Transición Odoo CE \-\> FastAPI Ledger

    dateFormat  YYYY-MM-DD

    section Fase 1: Puente Odoo CE

    Estandarización DTO Canónico BullMQ       :done, p1, 2026-09-01, 2026-09-15

    Asientos de Crédito POS vía Odoo CE Adapt :active, p2, 2026-09-16, 2026-10-10

    section Fase 2: Desarrollo FastAPI

    Scaffolding FastAPI \+ AsyncPG \+ Alembic   :p3, 2026-10-11, 2026-11-05

    Modelos Move/Line/Tax \+ Validación Partida:p4, 2026-11-06, 2026-12-05

    Suite Pytest portando tests de Odoo       :p5, 2026-12-06, 2026-12-25

    section Fase 3: Shadow / Dual-Write

    Dual-Write (Odoo CE \+ FastAPI en paralelo):p6, 2027-01-05, 2027-02-05

    Verificación de Balances e IVA (Paridad)  :p7, 2027-02-06, 2027-02-25

    section Fase 4: Switch-off

    Desconexión de Odoo CE y Rollout FastAPI  :p8, 2027-03-01, 2027-03-15

### ***Detalle de Fases:***

* **Fase 1 (Puente Activo con Odoo CE):**  
  * Salir a producción con OmniFlow \+ FacturaSend \+ Odoo CE.  
  * Todo evento comercial se envía a través del DTO canónico en BullMQ.  
* **Fase 2 (Construcción del Fork FastAPI):**  
  * Desarrollo del microservicio `omni-ledger` en FastAPI.  
  * Implementación de endpoints de balance, estado de cuenta por partner y libros fiscales (Libro Ventas / Compras).  
* **Fase 3 (Modo Dual-Write / Shadow Testing):**  
  * El worker de BullMQ escribe transacciones simultáneamente en Odoo CE y en FastAPI.  
  * Se ejecutan scripts automatizados de auditoría para verificar que los balances y reportes contables den resultados idénticos en ambos motores.  
* **Fase 4 (Desconexión Definitiva de Odoo CE):**  
  * Se apagan los contenedores de Odoo CE.  
  * El worker apunta al 100% al endpoint de FastAPI.

---

## **6\. MATRIZ DE RIESGOS Y MITIGACIÓN**

| Riesgo | Probabilidad | Impacto | Estrategia de Mitigación |
| :---- | :---: | :---: | :---- |
| **Discrepancias en redondeos de IVA / Moneda** | Media | Alto | Portar la suite de tests de precisión monetaria de Odoo (`test_account_move.py`) directamente a Pytest. |
| **Pérdida de asientos durante la transición** | Baja | Crítico | Buffer persistente en colas Redis (BullMQ) con reintentos exponenciales y Dead-Letter Queues (DLQ). |
| **Migración de datos históricos acumulados** | Baja | Medio | Al utilizar la misma estructura relacional (`account_move`, `account_move_line`), la migración de datos desde PostgreSQL de Odoo a PostgreSQL de FastAPI es directa vía scripts SQL. |

---

## **7\. REGLAS DE ORO DE LA TRANSICIÓN (HARNESS PROTOCOL)**

1. **FacturaSend es Soberano en Fiscalidad:** Ninguna lógica de firma digital, CDC o timbrado se programa en FastAPI; este servicio es exclusivamente contable/financiero.  
2. **Validación Atómica Inquebrantable:** El endpoint de FastAPI debe rechazar cualquier asiento donde $\\sum \\text{Débitos} \\neq \\sum \\text{Créditos}$ con error HTTP 422 antes de escribir en disco.  
3. **Inmutabilidad Contable:** Una vez que un asiento pasa a estado `posted`, sus líneas no se editan; cualquier corrección se realiza mediante un asiento de reversión (*reversal move*), respetando los estándares de auditoría contable.

