# OmniLedger — Microservicio Standalone de Contabilidad

## Visión General

**OmniLedger** es el servicio de contabilidad de partida doble para OmniFlow SaaS, corriendo en el puerto `:3027` con enrutamiento Traefik `ledger.*`. Proporciona:

- Libro mayor general y libros auxiliares
- Asientos contables con validación atómica ($\sum\text{Débitos} = \sum\text{Créditos}$)
- Reportes fiscales DNIT (Libro Ventas / Libro Compras)
- Aislamiento multi-tenant por Row-Level Security (RLS)
- Inmutabilidad de asientos `posted` + reversiones

## Arquitectura

```
┌─────────────────────────────────────┐
│         Odoo CE / ERP               │
│  - Addon OrderFlow Integration        │
│  - Eventos a Redis Queue             │
└───────────────────────┬─────────────┘
                        │
                        ▼
                 Integration Worker (NestJS/BullMQ)
                        │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
  OrderFlow API    OmniLedger    OrderFlow API
  (:3010)          (:3027)       (event replies)
                        │
                        ▼
               PostgreSQL con RLS
```

## Selección Dinámica de Backend

La selección del backend contable es **dinámica por tenant** mediante la tabla `integrations`:

### Configuración por Tenant

Cada tenant puede tener activa una integración `OMNILEDGER`:

```json
{
  "tenantId": "uuid",
  "name": "Contabilidad OmniLedger",
  "type": "OMNILEDGER",
  "active": true,
  "config": {
    "url": "https://ledger.pesallaccia.com/api/v1",
    "apiKey": "sk_omniledger_xxx"
  }
}
```

### Flujo de Eventos

```
1. Odoo confirma factura
2. Addon envía evento a Redis queue
3. WebhookEventListener consume evento
4. Consulta integrations[tenantId] donde type=OMNILEDGER y active=true
5. Si existe: fan-out a OmniLedger /api/v1/moves
6. Siempre: envía a OrderFlow API (webhookOrderConfirmedUrl)
7. Ambos endpoints validan partida doble
```

### Modos de Operación

| Modo | Configuración | Comportamiento |
|---|---|---|
| **Solo OrderFlow** | Sin integración OMNILEDGER | Flujo histórico sin cambios |
| **Fan-out** | OMNILEDGER activo + webhookOrderConfirmedUrl | Envía a ambos backends |
| **Solo OmniLedger** | OMNILEDGER activo + webhookOrderConfirmedUrl vacío | Envía solo a OmniLedger |

## Configuración en OrderFlow

Para activar la integración con OmniLedger:

1. **Crear registro:** `POST /api/v1/integrations` con `type=OMNILEDGER`
2. **Configurar URL y API Key:** En el campo `config` JSON del registro
3. **Activar integración:** `active=true`
4. **Verificar routing:** El Integration Worker detecta automáticamente la configuración

## Endpoints Principales

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/moves` | Registrar asiento contable |
| `POST` | `/api/v1/moves/{id}/reverse` | Generar reversión |
| `GET` | `/api/v1/partners/{id}/ledger` | Estado de cuenta partner |
| `GET` | `/api/v1/accounts/{code}/balance` | Saldo cuenta en rango |
| `GET` | `/api/v1/reports/libro-ventas?periodo=YYYY-MM` | Libro ventas DNIT |
| `GET` | `/api/v1/reports/libro-compras?periodo=YYYY-MM` | Libro compras DNIT |

## Flujo de Factura (Odoo → OmniLedger)

```
1. Odoo crea/confirma factura
2. Addon dispara evento 'invoice-posted' a Redis
3. Integration Worker consume evento
4. Worker POST a OrderFlow API /api/v1/invoices (modo actual)
5. Worker POST a OmniLedger /api/v1/moves (modo fan-out)
6. Ambos endpoints validan ∑Débitos = ∑Créditos
7. Response loggeado en webhook-logs
```

## Migración de Odoo a OmniLedger

### Fase 1: Configuración Inicial
- Crear registro en tabla `integrations` con `type=OMNILEDGER` y `active=true`
- Aplicar migraciones Alembic (`uv run alembic upgrade head`)
- Verificar que el Integration Worker detecte la nueva integración

### Fase 2: Validación de Paridad
- Ejecutar checks por N días
- Comparar balances: `curl "http://localhost:3027/api/v1/accounts/{code}/balance?periodo=2024-01"`
- Verificar reportes fiscales consistentes

### Fase 3: Corte sobre Odoo
- Desactivar `webhookOrderConfirmedUrl` en tabla `tenants`
- Usar solo OmniLedger como fuente de verdad
- Datos históricos en OmniLedger persisten por tenant

## Troubleshooting

| Síntoma | Causa | Solución |
|---|---|---|
| `HTTP 422` al crear asiento | Partida desbalanceada | Revisar líneas DTO, ∑Débitos ≠ ∑Créditos |
| `403 Forbidden` en consultas | RLS tenant_id mismatch | Confirmar tenant_id en conexión DB y config |
| `502 Bad Gateway` | Traefik routing issue | Verificar `docker ps` y labels Traefik |
| `ECONNREFUSED` | OmniLedger no disponible | Reiniciar servicio: `uvicorn app.main:app --port 3027` |
| Eventos no llegan a OmniLedger | Integración no activa | Verificar `active=true` en tabla `integrations` |

## Comandos Útiles

```bash
# Ver logs del servicio
docker logs orderflow_omniledger_standalone -f

# Health check
curl -s http://localhost:3027/health

# Verificar RLS isolation
psql -U orderflow -d orderflow_db -c "SELECT tenant_id, count(*) FROM account_moves GROUP BY tenant_id;"

# Rotar API key (sincroniza automáticamente a integraciones Odoo)
curl -X POST "http://orderflow.pesallaccia.com/api/v1/tenants/{id}/api-key/rotate"
```