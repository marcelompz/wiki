# Troubleshooting #164 — Login en Provecchio bloqueado por VITE_API_URL con puerto/host público

- **Fecha:** 2026-09-28
- **Área:** Frontend / Deploy / Traefik
- **Síntoma:** El login en `https://provecchio.com` no funciona. En consola aparece:
  - `Cross-Origin Request Blocked` al llamar a `https://provecchio.com:3010/api/v1/auth/login`
  - Request con `Host: provecchio.com:3010` y `Origin: https://provecchio.com`
- **Causa raíz:** El build arg `VITE_API_URL` estaba seteado como `https://provecchio.com:3010/api` en `.env.provecchio` y `.env.provecchio.example`. Eso hace que el frontend envíe las requests al puerto `3010` explícitamente, rompiendo el mismo origen y generando un problema de CORS/HTTPS mismatch en producción. Traefik ya sirve el backend bajo el mismo dominio y puerto 443/80, por lo que no hace falta exponer el puerto interno en la URL del API.
- **Solución aplicada:**
  1. Cambiar `VITE_API_URL` a `/api` (ruta relativa) en:
     - `.env.provecchio`
     - `.env.provecchio.example`
     - `.env.production.example`
  2. Rebuild del frontend con `--no-cache` para forzar reinyección del valor.
  3. Reiniciar contenedor `orderflow-frontend-prod`.
- **Archivos afectados:**
  - `docker-compose.provecchio.yml`
  - `docker-compose.prod.yml`
  - `.env.provecchio.example`
  - `.env.production.example`
  - `scripts/pre-deploy-diagnostic.sh`
  - `docs/troubleshooting/164-provecchio-login-blocked-by-vite-api-url.md`

## Prevención

El script `scripts/pre-deploy-diagnostic.sh` ahora valida que `VITE_API_URL` no contenga `http://`, `https://` ni el dominio del tenant en targets de producción. Esto evita que un valor incorrecto llegue a deploy.
