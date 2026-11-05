# Troubleshooting: `init.sh` sincronizó config de provecchio a Hetzner sobrescribiendo `pesallaccia.com`

## Síntoma
- `https://pesallaccia.com/` retorna `404 page not found`.
- Traefik en Hetzner (`/srv/traefik/dynamic/services.yml`) contiene solo routers de `provecchio.com`/`provecchio.local`.

## Causa raíz
El paso `[5b/6] Syncing Traefik config to Hetzner` de `./scripts/init.sh` ejecutaba `rsync /opt/traefik-orderflow/ hetzner-orderflow:/srv/traefik/` por defecto. `/opt/traefik-orderflow` es la config de **provecchio**, no de Hetzner (pesallaccia). Esto sobrescribió el `services.yml` correcto del Hetzner (working tree modificado, no commiteado; el `HEAD` de git en `/srv/traefik` conservaba la config correcta).

## Solución aplicada
1. Restaurar en Hetzner: `cd /srv/traefik && git checkout -- docker-compose.yml dynamic/headers.yml dynamic/services.yml traefik.yml`.
2. Recargar Traefik: `docker kill -s HUP traefik`.
3. Verificar: `curl -sI https://pesallaccia.com/` → 200.

## Prevención
- `scripts/init.sh` ahora sincroniza a Hetzner solo si `SYNC_TRAEFIK_HETZNER=true` (opt-in). Por defecto se omite.
- Para sincronizar manualmente: `SYNC_TRAEFIK_HETZNER=true ./scripts/init.sh` o `./scripts/init.sh --sync-traefik-hetzner` (solo tras verificar que la config local corresponde al entorno Hetzner).
- Antes de cualquier sync, verificar `git -C /srv/traefik status` y hacer backup del `services.yml`.

## Fecha
2026-11-05
