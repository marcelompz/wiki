# Loki — Configuración local

Archivo objetivo: `loki/local-config.yaml` dentro del contenedor.

Recomendaciones:
- Modo `ingester` para dev, `boltdb-shipper` para prod.
- Schema v13 con retention 14 días por defecto.
- Usar `promtail` para leer `logs/orderflow-*.log` y etiquetas de contenedor.
- Proteger el endpoint `/loki/api/v1/push` en producción.

Ejemplo mínimo de pipeline:
- Etiquetas: `tenant_id`, `service`, `container_name`, `env`.
- Etapas: `json` -> `label` -> `output`.
