# Dashboards por tenant — Guía rápida

## Objetivo
Contar con vistas por tenant en Grafana para soporte y operación.

## Métricas base
- `http_requests_total` / `http_errors_total` por `tenant_id`
- `orders_created_total` por `tenant_id` y `channel`
- `bookings_created_total` por `tenant_id`
- `biolink_clicks_total` por `tenant_id` y `block_type`
- `webhooks_active_total` por `tenant_id` y `status`

## Variables recomendadas
- `tenant_id`: etiqueta única por tenant
- `service`: `backend`, `frontend`, `odoo_adapter`
- `env`: `production`, `staging`

## Instrucciones
1. Provisionar el dashboard JSON en `docs/observability/dashboards/tenant-overview.json`.
2. Configurar Prometheus/Loki como datasource en Grafana.
3. Aplicar filtros por `tenant_id` en paneles.

## Notas
- El endpoint `/metrics` debe protegerse en producción.
- Loki requiere logs JSON con `tenantId`, `requestId` y `traceId`.
