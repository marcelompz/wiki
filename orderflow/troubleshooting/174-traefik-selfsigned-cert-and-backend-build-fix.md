# 174 — Traefik Self-Signed Cert Fallback + Backend Build Error

## Área
DevOps / Traefik / Backend / Docker

## Síntoma principal
- HTTPS a `https://provecchio.local/` retorna 200 pero con certificado `TRAEFIK DEFAULT CERT` (CN genérico) en lugar de un certificado self-signed específico para el dominio.
- Backend container unhealthy: `Cannot write file ... because it would overwrite input file` al compilar TypeScript.

## Causa raíz
1. **Traefik TLS:** `tls: { domains: [...] }` en un router HTTP sin `certResolver` no genera certificados self-signed. Traefik interpreta `tls.domains` solo para ACME (Let's Encrypt). Sin un cert en el TLS store para el dominio, cae al "internal generated certificate" (`TRAEFIK DEFAULT CERT`). Además, el file provider parseaba la config TLS pero el route creation usaba "TLS options default" (config no aplicada).
2. **Backend build:** `tsconfig.build.json` extendía `tsconfig.json` pero no excluía `dist`, por lo que NestJS trataba los `.ts` de `dist` como inputs y fallaba al intentar sobrescribirlos.

## Solución aplicada
- Generados certificados self-signed con `openssl` para `provecchio.local`/`*.provecchio.local` y `orderflow.local`/`*.orderflow.local` en `/opt/orderflow/traefik/certs/`.
- Creado `/opt/orderflow/traefik/dynamic/tls-store.yml` con `tls.certificates` apuntando a los cert files.
- Montado `./traefik/certs:/etc/traefik/certs:ro` en `docker-compose.yml` (servicio traefik).
- Revertido `provecchio-router.yml` y `frontend-router.yml` a `tls: {}` (sin `domains`), split HTTP/HTTPS routers.
- Agregado `"dist"` al `exclude` de `tsconfig.build.json`.
- Recreado contenedor traefik con `docker compose up -d --force-recreate traefik`.

## Verificación
- `openssl s_client -connect provecchio.local:443` → CN=provecchio.local, SAN: provecchio.local, *.provecchio.local.
- `npm run build` (backend) → éxito sin errores.

## Estado
✅ Resuelto
