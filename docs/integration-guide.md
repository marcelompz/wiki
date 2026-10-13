# 📖 Guía de Integración — Conexión a Backend Contable

## Arquitectura de Integración

OmniFlow soporta dos backends contables:

1. **Odoo CE** — El backend histórico (v14/v18/v19)
2. **OmniLedger** — El nuevo microservicio standalone (port :3027)

Ambos usan el mismo patrón de integración a través del **Integration Worker** (Node.js + BullMQ).

---

## 🔄 Flujo de Integración Actual

```
Odoo CE
   │
   ▼
Addon OrderFlow Integration
   │
   ▼
Redis Queue (orderflow-invoice-events, etc.)
   │
   ▼
Integration Worker (NestJS + BullMQ)
   │
   ├──▶ OrderFlow API (REST) — :3010
   └──▶ ↳ NEW: OmniLedger API — :3027 (fan-out)
```

---

## 📦 Integración con Odoo CE (Actual)

### Configuración

En Odoo: `OrderFlow → Configuration`

| Campo | Descripción | Ejemplo |
|---|---|---|
| `api_url` | URL base OrderFlow | `https://pesallaccia.com` |
| `api_key` | API Key del tenant | `sk_live_abc123` |
| `tenant_id` | ID del tenant en OrderFlow | `1` |

### Eventos sincronizados

| Odoo Evento | Destino OrderFlow | Formato |
|---|---|---|
| `contact-upsert` | `res.partner` | POST `/api/v1/integrations/orderflow/webhook` |
| `invoice-posted` | `account.move` | Publicado a Redis queue |
| `invoice-paid` | `account.move.payment` | Publicado a Redis queue |

### Flujo de factura

1. Odoo crea/confirma factura
2. Addon dispara `action_post()` 
3. Se publica evento a Redis queue
4. Integration Worker consume evento
5. Worker POST a OrderFlow API `/api/v1/invoices`
6. Response guardado en log de webhooks

---

## 🆕 Integración con OmniLedger (Migración Dinámica)

### Selección Dinámica de Backend

OmniFlow soporta selección dinámica del backend contable por tenant mediante la tabla `integrations`:

| Tipo Backend | IntegrationType | Cuándo usar |
|---|---|---|
| **OrderFlow API** (actual) | `ODOO` / `CUSTOM` | Flujo histórico |
| **OmniLedger** (nuevo) | `OMNILEDGER` | Libros mayores, RLS, reportes DNIT |
| **Ambos** (fan-out) | Ambos activos | Migración gradual |

### Configuración Dinámica (por tenant)

Cada tenant puede tener una integración `OMNILEDGER` activa en la tabla `integrations`:

```json
{
  "tenantId": "uuid-tenant",
  "name": "OmniLedger Contabilidad",
  "type": "OMNILEDGER",
  "active": true,
  "config": {
    "url": "https://ledger.pesallaccia.com/api/v1",
    "apiKey": "sk_omniledger_abc123"
  }
}
```

### Flujo de Factura con OmniLedger

```
Odoo CE
   │
   ▼
Addon OrderFlow Integration
   │
   ▼
Redis Queue
   │
   ▼
WebhookEventListener (NestJS)
   │
   ├──▶ Consulta integrations[tenantId] donde type=OMNILEDGER y active=true
   │
   ├──▶ Si existe OMNILEDGER activo:
   │      └──▶ dispatchWebhook(targetUrl=config.url, payload)
   │
   ├──▶ Siempre: dispatchWebhook(targetUrl=tenant.webhookOrderConfirmedUrl)
   │
   ▼
WebhookQueueProcessor (BullMQ)
   │
   ├──▶ POST a OrderFlow API (si webhookOrderConfirmedUrl existe)
   └──▶ POST a OmniLedger :3027/api/v1/moves (si integration OMNILEDGER existe)
```

### DTO Contract — Indistinguible

El Integration Worker envía el mismo DTO canónico a ambos destinos:

```json
{
  "event": "order.created",
  "tenant_id": "uuid-tenant",
  "payload": {
    "orderId": "123",
    "orderNumber": "ORD-2024-001",
    "total": 500.00,
    "customerId": "456",
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "integration_config": {
    "apiKey": "sk_omniledger_abc123",
    "omniledgerUrl": "https://ledger.pesallaccia.com/api/v1"
  }
}
```

**Nota:** El Integration Worker no requiere cambios estructurales — solo se agrega una segunda llamada HTTP cuando la integración OMNILEDGER está activa para el tenant (según plan FEAT-088).

---

## 🔧 Migración de Odoo a OmniLedger

### Pasos de migración

1. **Phase 1:** Crear registro en tabla `integrations` con `type=OMNILEDGER` y `active=true`
2. **Phase 2:** Integration Worker detecta la integración activa y comienza fan-out automáticamente
3. **Phase 3:** Validar paridad de balances durante N días
4. **Phase 4:** Desactivar `webhookOrderConfirmedUrl` en `tenants` para cortar flujo a OrderFlow
5. **Phase 5:** Usar solo OmniLedger como fuente de verdad

### Verificación de paridad

Después de la migración, ejecutar checks periódicos:

```bash
# Consultar saldos en OmniLedger
curl -H "X-OmniLedger-Tenant-Id: <tenant_id>" \
  "http://localhost:3027/api/v1/accounts/{code}/balance?periodo=2024-01"
# Comparar con reporte contable Odoo
```

### Rollback

Si es necesario, cambiar `active=false` en la integración OMNILEDGER. El Integration Worker deja de enviar a OmniLedger automáticamente y sigue enviando solo a OrderFlow API. Los datos en OmniLedger persisten por tenant.

---

## �ubleshooting Integración

### Errores comunes

| Síntoma | Causa | Solución |
|---|---|---|
| `HTTP 422` en OmniLedger | Partida desbalanceada | Revisar líneas de asiento en DTO |
| `404 Not Found` en `/health` | OmniLedger caído | Verificar servicio y Traefik routing |
| `403 Forbidden` | `tenant_id` mismatch | Confirmar tenant_id en config y DB |
| `ECONNREFUSED` | Integration Worker no alcanza OmniLedger | Verificar red y puerto :3027 |

### Registros de depuración

- `GET /api/v1/webhook-logs` — Logs de webhooks persistidos
- Revisar `failed_logs.txt` en raíz de OrderFlow para errores históricos

---