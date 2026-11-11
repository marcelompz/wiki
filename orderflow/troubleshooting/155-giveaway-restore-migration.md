# FEAT-155: Migración de datos giveaway desde restore_db a orderflow_db

## Fecha
2026-10-02

## Problema
Migrar datos de giveaways, contacts, registrations y winners desde la base de restore (`restore_db` en container `pg17-restore`) a la base de producción (`orderflow_db` en container `orderflow_db`) para que el admin panel en `provecchio.local` muestre datos reales.

## Contexto
- Backup creado con `./scripts/backup-production.sh provecchio` (1.9MB SQL + uploads tar.gz)
- Restore ejecutado con `./scripts/restore-provecchio.sh` populate `restore_db` con 1 giveaway, 163 contacts, 161 registrations, 1 winner
- Data structures idénticas entre restore_db y orderflow_db (mismo `tenantId` camelCase, mismas columnas)
- `provecchio.local` configurado en Traefik con routing `/api` y `/socket.io`

## Solución aplicada
Usar `pg_dump --data-only` por tabla desde `pg17-restore` y pipe directo a `psql` en `orderflow_db`:

```bash
# Ejemplo para giveaways
docker exec -i pg17-restore pg_dump -h /var/run/postgresql -U postgres -d restore_db -t giveaways --data-only > /tmp/migrate_giveaways.sql
docker exec -i orderflow_db psql -U orderflow -d orderflow_db < /tmp/migrate_giveaways.sql

# Repetir para: contacts, giveaway_registrations, giveaway_winners
```

## Resultado verificado
| Tabla | restore_db | orderflow_db |
|-------|-----------|--------------|
| giveaways | 1 | 1 |
| contacts | 163 | 163 |
| giveaway_registrations | 161 | 161 |
| giveaway_winners | 1 | 1 |

## Lecciones aprendidas
1. Cuando estructuras de BD son idénticas (mismo camelCase `tenantId`), `pg_dump --data-only` → `psql` funciona sin transformaciones
2. `pg_dump --data-only` omite el `COPY FROM STDIN` header issue que ocurría con `pg_dump | psql` directo
3. Hay que borrar registros de prueba previos antes de importar (INSERT con pk duplicada)

## Referencias
- scripts/backup-production.sh - Backup with provecchio remote SSH support
- scripts/restore-provecchio.sh - Restore with tenantId/tenantId convention
- Traefik routing: provecchio.local → orderflow-prod-frontend/back-end
</EOF>
echo "Document created"