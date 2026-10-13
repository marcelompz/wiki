# FIX URGENTE — Retirar router público de giveaways-standalone

**Motivo:** `giveaways-standalone` es una versión desactualizada de `backend/giveaways`
(0 checks de `@RequirePermissions`, sin `@TenantPrisma`) que sigue públicamente
alcanzable en producción vía `PathPrefix(/standalone/giveaways)`, en paralelo a la
versión endurecida que sirve el core por `/api`. No depende de `forwardAuth` ni de
ninguna otra fase del plan de arquitectura — es un cierre de brecha independiente.

**Repo:** `traefik-orderflow` (NO el repo de OrderFlow backend).
**Archivo:** `dynamic/services.yml`

## Cambio

Quitar los routers `giveaways-standalone` y `giveaways-standalone-http` (líneas
147-158 en la versión auditada) y el service `giveaways-standalone-svc` (líneas
400-403) — o comentarlos si preferís mantenerlos documentados por si hace falta
revertir rápido.

```yaml
# ANTES (retirar este bloque completo):
    giveaways-standalone:
      rule: "(Host(`orderflow.pesallaccia.com`) || Host(`pesallaccia.com`)) && PathPrefix(`/standalone/giveaways`)"
      priority: 120
      entryPoints: [websecure]
      tls:
        certResolver: letsencrypt
      service: giveaways-standalone-svc
    giveaways-standalone-http:
      rule: "(Host(`orderflow.pesallaccia.com`) || Host(`pesallaccia.com`)) && PathPrefix(`/standalone/giveaways`)"
      priority: 120
      entryPoints: [web]
      service: giveaways-standalone-svc
```

Y en la sección `services:`:
```yaml
# ANTES (retirar):
    giveaways-standalone-svc:
      loadBalancer:
        servers:
          - url: "http://orderflow_giveaways_standalone:3020"
```

## Validación post-cambio
1. `docker exec traefik traefik healthcheck` (o esperar el `watch: true` del provider file) para confirmar que Traefik recargó sin errores.
2. Confirmar que `curl -I https://orderflow.pesallaccia.com/standalone/giveaways` ya no resuelve (404 o el fallback que corresponda), y que `https://orderflow.pesallaccia.com/api/giveaways` (el core) sigue funcionando normal.
3. **No tocar** ningún otro router de este archivo (axon-*, orderflow-prod*, odoo-*, aieer-*, capacitaciones, demo-odoo, vaultwarden*, vitalog*, nanduti-prod, omnisites-standalone, omnivector-standalone, whatsapp-catalog-standalone) — son ajenos a este fix.

## No borrar todavía
El contenedor `orderflow_giveaways_standalone` y el código en `services/giveaways-standalone/`
pueden quedar como están por ahora — este fix solo cierra el acceso público. El borrado
del directorio (mismo tratamiento que `hr-standalone`) es un paso aparte, después de
confirmar con el resto de la Fase 0.2 (bookings/loyalty/quotations/social-catalog) que
no hay nada más que rescatar de las standalone antes de eliminarlas.
