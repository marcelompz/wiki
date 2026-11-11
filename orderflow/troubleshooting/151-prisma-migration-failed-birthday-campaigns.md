# Troubleshooting 151: Prisma Migration Fallida `20260916_add_birthday_campaigns`

## 🎯 Síntoma
`npx prisma migrate status` reporta:
```
Following migration have failed: 20260916_add_birthday_campaigns
ERROR: relation "Tenant" does exist
```
Ninguna tabla de cumpleaños (`birthday_campaigns`, `birthday_logs`) existe en la base de datos.

## 🔍 Causa Raíz
El archivo `backend/prisma/migrations/20260916_add_birthday_campaigns/migration.sql` referenciaba `"Tenant"` (con T mayúscula) en las foreign keys en vez de `"tenants"` (minúscula). Todas las demás migraciones usan `"tenants"`. PostgreSQL trata `"Tenant"` como una tabla literal con mayúsculas, que no existe.

## 🛠️ Solución Aplicada
1. Corregir SQL: `"Tenant"` → `"tenants"` en ambas FK del migration.sql
2. `npx prisma migrate resolve --rolled-back "20260916_add_birthday_campaigns"`
3. `npx prisma migrate deploy` (migración aplicada exitosamente)

## ⚠️ Nota
Las tablas `birthday_campaigns` y `birthday_logs` fueron creadas correctamente tras la corrección.
