# Troubleshooting #80 — Retardo Transitorio en Healthcheck de Contenedor PostgreSQL durante Reinicio de Stack

## 📋 Síntoma
Durante la fase `[UP] Reiniciando servicios con docker-compose...` en el despliegue automático, Docker emitió:
`dependency failed to start: container orderflow-database-1 is unhealthy`

## 🔍 Causa Raíz
Al reiniciar simultáneamente los contenedores de la pila, la base de datos PostgreSQL tardó unos milisegundos adicionales en responder a las sondas de salud (`pg_isready`), provocando que Docker Compose reportara temporalmente `unhealthy` en el primer intento.

## 🛠️ Solución Aplicada
Se re-ejecutó el script de despliegue `./scripts/deploy-production.sh production`. La verificación de salud confirmó que la base de datos PostgreSQL, Redis, Backend, Frontend y Traefik v3.4 alcanzaron el estado `Healthy` y `Running`. La suite de QA Playwright verificó de forma automatizada todas las rutas administrativas sin errores.
