# CLOUDFLARE_API_TOKEN Eliminada de OrderFlow — Responsabilidad de Traefik

## Síntoma

Al revisar el entorno de OrderFlow, se encuentra referencia a `CLOUDFLARE_API_TOKEN` o `CF_DNS_API_TOKEN` en `.env.production`, `.env.production.example` o `docker-compose.prod.yml`.

## Causa

OrderFlow **no debe** gestionar el token de Cloudflare para DNS-01. Esa responsabilidad es exclusiva de Traefik, configurado en `/opt/traefik-orderflow` y desplegado en `/srv/traefik` (servidor `178.105.226.175`).

El backend de OrderFlow **no requiere** `CLOUDFLARE_API_TOKEN` ni `CF_DNS_API_TOKEN` para funcionar. El `CloudflareDnsService` puede usar el token cuando esté disponible, pero su ausencia no bloquea el inicio ni el login.

## Solución

1. **Eliminar `CLOUDFLARE_API_TOKEN` y `CF_DNS_API_TOKEN` de `.env.production`**
2. **Eliminar las inyecciones de `CLOUDFLARE_API_TOKEN` y `CF_DNS_API_TOKEN` de `docker-compose.prod.yml`**
3. **Eliminar la referencia de `CLOUDFLARE_API_TOKEN` de `.env.production.example`**
4. Traefik gestiona el token exclusivamente en `/srv/traefik/.env` como `CF_DNS_API_TOKEN`
5. Redeployar backend si se modificó el compose:

   ```bash
   docker compose -f docker-compose.prod.yml up -d backend
   ```

## Nota sobre `CloudflareDnsService`

El servicio `backend/src/cloudflare/cloudflare-dns.service.ts` intenta resolver el token en este orden:

```typescript
this.apiToken = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_DNS_API_TOKEN || '';
```

Si el token no está disponible, el servicio retorna cadena vacía y las operaciones DNS fallan silenciosamente. Eso es esperado; la gestión de DNS para certificados SSL corresponde a Traefik, no al backend de OrderFlow.

## Referencias cruzadas

- **Traefik DNS-01:** `CF_DNS_API_TOKEN` en `/srv/traefik/.env` (gestionado por `/opt/traefik-orderflow`)
- **AGENTS.md:** Regla 4 — Infraestructura Proxy Exclusive Traefik v3.4
- **AGENTS.md:** Regla 7 — Sincronización de Documentación con Wiki