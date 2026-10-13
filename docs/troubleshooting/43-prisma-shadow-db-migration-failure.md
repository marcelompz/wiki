# 🛠️ Troubleshooting #43 — `migrate dev` Falla en Shadow DB (P3006 / P1014)

## 📅 Fecha
2026-08-19

## 🎯 Síntoma
```bash
npx prisma migrate dev --name add_product_category
Error: P3006
Migration `20260808124500_normalize_biolink_tenantid` failed to apply cleanly to the shadow database.
Error code: P1014
The underlying table for model `bio_links` does not exist.
```

- `prisma migrate dev` falla aunque la tabla `bio_links` **sí existe** en la BD principal
- `prisma migrate deploy` dice "No pending migrations to apply"
- `prisma migrate resolve --applied` dice "already recorded as applied"

## 🔍 Causa Raíz
`prisma migrate dev` crea una **shadow database** temporal para testear migraciones. Esta shadow DB se crea vacía y aplica **todas las migraciones del historial en orden**. 

Si el historial tiene migraciones que dependen de tablas creadas en migraciones previas que **no se aplicaron correctamente en la shadow DB** (p.ej., por fallos previos, resets manuales, o BD restaurada sin historial), la shadow DB falla al aplicar esa migración aunque la BD principal esté OK.

En este caso:
- Migración `20260808124500_normalize_biolink_tenantid` modifica `bio_links`
- Shadow DB no tiene `bio_links` porque la migración que la crea (`20260806223000_add-social-catalog-channels` o anterior) no se aplicó limpiamente en la shadow DB

## ✅ Solución Aplicada
**Usar `prisma db push` en producción** para sincronizar schema sin migraciones:

```bash
docker compose -f docker-compose.prod.yml run --rm --entrypoint 'npx prisma db push --accept-data-loss' backend
```

Esto sincroniza el schema Prisma actual directamente con la BD principal, creando tablas/columnas faltantes sin usar migraciones ni shadow DB.

## 🔧 Para Reparar el Historial de Migraciones (post-push)
Si se quiere mantener el historial limpio:

```bash
# 1. Marcar migración problemática como "aplicada manualmente" (si ya está en BD principal)
npx prisma migrate resolve --applied 20260808124500_normalize_biolink_tenantid

# 2. Crear migración formal para los cambios pendientes
npx prisma migrate dev --name add_product_category

# 3. Verificar
npx prisma migrate status
```

## ⚠️ Cuándo Usar Cada Comando
| Comando | Uso |
|---------|-----|
| `migrate deploy` | Producción: aplica migraciones pendientes del historial |
| `migrate dev` | Desarrollo: crea shadow DB, testea, crea migración nueva |
| `db push` | **Emergencia/Producción**: sincroniza schema directo sin migraciones |
| `migrate resolve` | Reparar historial desincronizado |

## 🔗 Referencias
- Relacionado: #42 (gap de migración ProductCategory)
- Docs Prisma: [Migrate dev vs db push](https://www.prisma.io/docs/orm/prisma-migrate/workflows/prototyping-your-schema)
