# **🗺️ PLAN MAESTRO: ADAPTADORES LEGACY COMO ACELERADOR COMERCIAL**

> **Documento:** `docs/planes/ROADMAP_LEGACY_ADAPTERS.md`
> **Relación:** Generaliza el patrón nacido en `ROADMAP_ODOO_TO_FASTAPI_TRANSITION.md` (v3.5)
> **Versión:** 1.0
> **Fecha:** 26 de agosto de 2026
> **Objetivo:** Convertir el adaptador Odoo CE ↔ OmniLedger de "puente temporal de migración" a **producto permanente**: un patrón reutilizable que permite a OmniFlow conectarse a cualquier sistema legacy de un cliente, operar en modo híbrido durante la transición comercial, y migrarlo paulatinamente hacia OmniFlow sin interrumpir su operación.

---

## **1. PRINCIPIO RECTOR**

El adaptador de Odoo CE ya no es deuda técnica de la Fase 1 de OmniLedger. Es la primera instancia de una categoría de producto: **Legacy Bridge**, el mecanismo por el cual OmniFlow entra a una empresa que ya opera con otro sistema (Odoo, SAP B1, un ERP local, planillas) sin exigirle un "big bang" de migración.

```
┌────────────────────────────────────────────────────────────┐
│                    FRONT-OFFICE OMNIFLOW                    │
│   POS / Catálogo / Citas / B2B / WhatsApp Bot (OmniCatalog) │
└──────────────────────────────┬───────────────────────────────┘
                               │ (Eventos JSON vía BullMQ/Redis)
                               ▼
┌────────────────────────────────────────────────────────────┐
│              INTEGRATION WORKER (Agnóstico)                 │
│         Consume el DTO Canónico, enruta por tenant           │
└───────┬───────────────┬───────────────┬──────────────────────┘
       │               │               │
       ▼               ▼               ▼
 ┌───────────┐   ┌───────────┐   ┌──────────────┐
 │ Odoo CE   │   │  SAP B1   │   │ OmniLedger    │
 │ Adapter   │   │  Adapter  │   │ (nativo)      │
 └───────────┘   └───────────┘   └──────────────┘
     LEGACY BRIDGES (temporales por tenant)   DESTINO FINAL
```

**Regla de oro:** ningún adaptador legacy conoce al frontend, y el frontend nunca sabe qué adaptador está activo para un tenant dado. Solo el Integration Worker lo sabe, vía configuración de tenant.

---

## **2. CATÁLOGO DE ADAPTADORES**

| Adaptador | Estado | Protocolo | Prioridad comercial |
|---|---|---|---|
| **Odoo CE / Enterprise** | En producción (sync bidireccional) | XML-RPC / JSON-RPC | Alta — ya validado |
| **OmniLedger (nativo)** | En desarrollo (roadmap FastAPI) | REST interno | Destino final por defecto |
| **SAP Business One** | Mencionado en integración OmniCatalog (FEAT-072) | DI API / Service Layer | Media — clientes corporativos |
| **Sistemas contables locales PY** | No iniciado | A definir por caso | Baja — bajo demanda |
| **Planillas / sin sistema** | No iniciado | Importación batch (XLSX vía OmniBI) | Alta — onboarding de micro-PyMEs |

Cada fila nueva de esta tabla implica: (a) un adaptador que traduce el DTO canónico a las llamadas nativas del sistema destino, y (b) un mapeo de catálogo de cuentas/entidades específico de ese sistema.

---

## **3. EL DTO CANÓNICO, GENERALIZADO**

El contrato ya probado con Odoo (`CREATE_INVOICE_MOVE`, `CREATE_PAYMENT_MOVE`) se mantiene como la interfaz única entre OmniFlow y *cualquier* backend contable. Generalizar implica:

- **Namespace de eventos estable**: `CREATE_INVOICE_MOVE`, `CREATE_PAYMENT_MOVE`, `CREATE_STOCK_MOVE`, `CREATE_PARTNER`, etc. — un adaptador nuevo solo necesita implementar los eventos que su sistema legacy soporte; el resto se puede rechazar explícitamente o encolar como pendiente.
- **Idempotencia por tenant + evento**: crítico cuando un mismo tenant puede tener más de un backend activo durante la transición (ver sección 4).
- **Versión de contrato en el DTO** (`"version": "1.0"`): permite evolucionar el contrato sin romper adaptadores viejos que sigan en uso en clientes que aún no migraron.

---

## **4. MODO DE TRANSICIÓN DEL TENANT (ESTADO HÍBRIDO EXPLÍCITO)**

A diferencia de la Fase 3 de dual-write de OmniLedger (que es una migración *interna* controlada por vos), acá el dual-write depende de **decisiones del cliente**, que puede seguir operando parcialmente en su sistema viejo. Esto exige modelar el estado de transición como un dato de negocio, no como una fase temporal de despliegue:

| Estado del tenant | Comportamiento |
|---|---|
| `legacy_only` | Todo el tráfico contable va al adaptador legacy (Odoo/SAP/etc.). OmniFlow es solo front-office. |
| `hybrid_shadow` | El evento se envía al legacy (fuente de verdad) y se replica en OmniLedger solo para comparación/auditoría, sin exponerse aún al cliente. |
| `hybrid_active` | Ciertos flujos (ej. crédito en POS, algo que el legacy no soporta bien) ya corren en OmniLedger; el resto sigue en el legacy. Requiere reconciliación periódica explícita. |
| `omniledger_only` | Migración completa. El adaptador legacy queda desconectado pero no eliminado del código (puede reactivarse si el cliente da marcha atrás). |

**Implicación de diseño:** el Integration Worker necesita una tabla de enrutamiento por tenant y por tipo de evento, no un simple flag global "usa Odoo sí/no".

---

## **5. MAPEO DE PLAN DE CUENTAS (EL VERDADERO CUELLO DE BOTELLA)**

Cada legacy trae su propio plan de cuentas, códigos de impuestos y estructura de partners. Antes de conectar un tenant nuevo:

1. **Tabla de mapeo por tenant**: `external_account_code → omniflow_canonical_account_code`, versionada y auditable (si el cliente reclasifica una cuenta, hay que saber qué mapeo estaba vigente en cada fecha).
2. **Validación de cobertura al onboarding**: antes de activar un tenant en modo híbrido, correr un chequeo que confirme que todo movimiento que el legacy puede generar tiene un mapeo definido — si no, el evento debe quedar en cola de revisión manual, nunca perderse silenciosamente.
3. **Reutilización con OmniBI**: esta misma tabla de mapeo es la que permite que la importación de históricos hacia OmniBI (para análisis financiero) use las cuentas canónicas y no los códigos crudos de cada legacy, evitando que cada cliente requiera dashboards a medida.

---

## **6. SEPARACIÓN: HISTÓRICO PARA ANÁLISIS vs. HISTÓRICO OPERABLE**

Dos pipelines distintos, aunque compartan el mapeo de cuentas de la sección 5:

- **Para análisis (OmniBI)**: importación batch, de solo lectura, a tablas de hechos/dimensiones. Errores de mapeo afectan un reporte, no una operación real — tolerancia más alta.
- **Para operar (OmniLedger)**: migración de saldos vivos (cuentas por cobrar abiertas, stock actual, límites de crédito). Requiere el mismo rigor de validación atómica que ya definiste para OmniLedger (débito = crédito, estado `posted` inmutable). Un error acá rompe la operación del cliente, no solo un gráfico.

Nunca deben compartir el mismo job de importación, aunque reutilicen el mismo mapeo de cuentas.

---

## **7. MATRIZ DE RIESGOS**

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Mapeo de cuentas incompleto al activar un tenant nuevo | Alta | Alto | Checklist de cobertura obligatorio antes de pasar a `hybrid_active` |
| Divergencia entre legacy y OmniLedger en `hybrid_active` sin reconciliación | Media | Alto | Job de reconciliación periódico + alertas de discrepancia por tenant |
| Adaptador nuevo (SAP B1, etc.) no soporta un evento del DTO canónico | Media | Medio | Contrato de "eventos soportados" explícito por adaptador; rechazo controlado, no silencioso |
| Cliente retrocede de `omniledger_only` a legacy | Baja | Medio | Mantener el adaptador legacy desactivado pero no eliminado, con reactivación probada |

---

## **8. PRÓXIMOS PASOS SUGERIDOS**

1. Formalizar el estado `tenant.integration_mode` (los 4 valores de la sección 4) en el modelo de datos de OrderFlow.
2. Extraer la tabla de mapeo de cuentas del adaptador Odoo actual a una estructura genérica reutilizable por futuros adaptadores.
3. Definir el "contrato de adaptador" (interfaz mínima que todo Legacy Bridge debe implementar) antes de construir el segundo adaptador (SAP B1), para no terminar generalizando en retrospectiva.
4. Evaluar si el pipeline de importación batch para micro-PyMEs sin sistema previo (planillas → OmniBI/OmniLedger) puede ser el caso más simple para validar el patrón de mapeo antes de atacar un ERP complejo como SAP B1.
