# Observabilidad avanzada — OrderFlow

Objetivo: contar con un stack completo de observabilidad sin modificar el comportamiento actual de producción.

## Estado actual

- Logs: Winston + daily rotate file (`logs/orderflow-*.log`)
- Métricas: Prometheus `prom-client` en `/metrics`
- Traces: Sentry básico en `instrument.ts`
- Health checks: `/api/v1/health`

## Stack objetivo

- Loki: agregación de logs JSON
- Tempo: traces distribuidos
- Grafana: dashboards unificados
- Alertmanager: alertas por tenant y por servicio

## Guía de deployment

Ver `docker-compose.observability.yml` para stack local/override.
Ver `docs/observability/loki-config.md` y `docs/observability/grafana-dashboards.md` para configuración detallada.

## Convenciones

- Logs deben incluir `tenantId`, `requestId`, `traceId`.
- Métricas deben incluir `tenant_id` cuando corresponda.
- El endpoint `/metrics` debe protegerse en producción.
