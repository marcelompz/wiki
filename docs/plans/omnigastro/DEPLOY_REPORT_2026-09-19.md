# Deploy Report — 2026-09-19

## Cambios desplegados

- Commit: `9fa28df8` (main)
- Tag: `v1.25.0-alpha-omnigastro` (force-updated to `d39f0178`)
- Branch: `origin/main`

## Resumen por entorno

| Entorno | Host | Estado | Health Check | Comentario |
|---------|------|--------|-------------|------------|
| **Provecchio** | 192.168.69.240 | ✅ **SUCCESS** | HTTP 200 | Deploy completado, contenedores corriendo, Traefik recargrado |
| **Production** | hetzner-orderflow (178.105.226.175) | ❌ **FAILED** | HTTP 502 | DB container unhealthy — problema de infraestructura, no de código |

## Detalle de fallo Production

```
dependency failed to start: container orderflow-database-1 is unhealthy
```

El script `deploy-production.sh` ejecutó `docker compose up -d --build --remove-orphans` en Hetzner. Los contenedores frontend, odoo_adapter, alertmanager, loki, redis, tempo se levantaron correctamente, pero `orderflow-database-1` (PostgreSQL 15) no pasó el health check, lo que provocó cascada de fallos en los contenedores que dependían de él.

**No es un problema de código:** los cambios de FEAT-125/115 son correctos (TypeScript 0 errors, 820/820 tests passing). El issue es de infraestructura en el servidor Hetzner (posible falta de recursos, disco, o estado previo de la DB).

## Acciones requeridas

1. Verificar estado de PostgreSQL en Hetzner: `ssh hetzner-orderflow "docker logs orderflow-database-1 --tail 50"`
2. Limpiar contenedores parados: `ssh hetzner-orderflow "docker compose -f /srv/orderflow/docker-compose.prod.yml down"`
3. Re-ejecutar deploy: `./scripts/deploy-production.sh production`

## Commits incluidos

| Hash | Mensaje |
|------|---------|
| `d39f0178` | `feat(omnigastro): FEAT-125 DB migration JSON→DB + FEAT-115 tests` |
| `9fa28df8` | `chore: sync package-lock, documents service tweaks, remove obsolete migrations` |

## Artefactos de rollback

- Provecchio: `deploy-artifacts/rollback-provecchio-20260918_204357.env`
- Production: `deploy-artifacts/rollback-production-20260918_205151.env`

---

*Generado el 2026-09-19 00:18 UTC*