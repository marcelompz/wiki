# Troubleshooting: Frontend Dockerfile Build Args Ignored

## Síntoma
El frontend en producción no reconoce `VITE_ROOT_DOMAIN` ni `VITE_SUBDOMAINS`, causando:
- Routing incorrecto en `provecchio.com` (cae en `pesallaccia.com` por defecto)
- Subdominios de tenant no resueltos correctamente
- Landing page muestra contenido equivocado

## Causa Raíz
`frontend/Dockerfile.prod` solo declaraba `ARG VITE_SENTRY_DSN`. Los demás `ARG` pasados en `docker-compose.prod.yml` eran silenciosamente ignorados por Docker.

## Solución
1. Declarar todos los `ARG` necesarios en `Dockerfile.prod`:
   ```dockerfile
   ARG VITE_API_URL
   ARG VITE_APP_NAME
   ARG VITE_SENTRY_DSN
   ARG VITE_ROOT_DOMAIN
   ARG VITE_SYSTEM_SUBDOMAINS
   ENV VITE_API_URL=$VITE_API_URL
   ENV VITE_APP_NAME=$VITE_APP_NAME
   ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
   ENV VITE_ROOT_DOMAIN=$VITE_ROOT_DOMAIN
   ENV VITE_SYSTEM_SUBDOMAINS=$VITE_SYSTEM_SUBDOMAINS
   ```
2. Asegurar que `docker-compose.prod.yml` pasa todos los build args

## Prevención
Verificar con `docker build --no-cache` después de modificar `Dockerfile.prod`.
