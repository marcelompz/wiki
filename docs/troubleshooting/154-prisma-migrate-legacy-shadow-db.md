# Prisma migrate dev falla en migraciones legacy con tablas preexistentes

## Síntoma
`npx prisma migrate dev` falla con:
```
P3006 Migration `YYYYMMDDHHMMSS_...` failed to apply cleanly to the shadow database.
P1014 The underlying table for model `employees` does not exist.
```

## Causa raíz
El proyecto tiene dos generaciones de schema conviviendo:
- **Legacy**: tablas core (`employees`, `departments`, etc.) existían antes del sistema de migraciones Prisma actual.
- **Nuevo**: tablas creadas desde 2026-09-12 en adelante con migraciones gestionadas por Prisma.

Cuando Prisma crea el shadow DB para `migrate dev`, aplica **todas** las migraciones en orden. Las migraciones legacy (ej: `20260920210000_sync_hr_schema`) asumen que tablas como `employees` ya existen y solo agregan columnas/FKs. En el shadow DB vacío, eso no es cierto, por lo que el `DO $$ ... ADD CONSTRAINT ... REFERENCES "employees"` falla porque la tabla aún no fue creada por ninguna migración anterior.

## Solución aplicada
1. **No retroceder a `migrate dev`** cuando el bloqueo venga de migraciones legacy.
2. Usar `npx prisma db push --accept-data-loss` para sincronizar schema nuevo directamente cuando ya se perdió la trazabilidad de migraciones aplicadas.
3. Para nuevas features, crear el SQL manualmente en `prisma/migrations/YYYYMMDDHHMMSS_descripcion/migration.sql` y marcarlo como aplicado:
   ```bash
   npx prisma migrate resolve --applied "YYYYMMDDHHMMSS_descripcion"
   ```
4. Mantener `migration_lock.toml` actualizado con las migraciones efectivamente aplicadas.

## Prevención
- Toda migración nueva debe ser idempotente (`IF NOT EXISTS`) y no depender de tablas legacy sin crearlas primero en la misma migración.
- Revisar `docs/troubleshooting/132-rls-migration-snakecase-columns.md` antes de escribir SQL cross-cutting.
- Nunca asumir que `prisma migrate dev` funciona en entornos donde `_prisma_migrations` no existe o está desfasado.
