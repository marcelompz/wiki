# 213 — Columna `order_lines.deliveredAt` faltante (schema drift FEAT-211)

## Área
Backend / Prisma / Migraciones / Guest Orders

## Síntoma
`POST /api/v1/guest/orders` retorna HTTP 500 en producción (provecchio.com) con:

```
PrismaClientKnownRequestError: Invalid `prisma.order.create()` invocation:
The column `order_lines.deliveredAt` does not exist in the current database.
```

Reportado en QA v1.46.0 (docs/info/OmniGastro.md, 2026-11-04).

## Causa raíz
El campo `OrderLine.deliveredAt` (telemetría de entrega por línea, FEAT-211
"Entrega parcial por línea en POS de Mozo", v1.45.4) se agregó a
`prisma/schema.prisma` y al código (`guest-orders.controller.ts` crea
`OrderLine` con `deliveredAt`), pero **nunca se generó ni desplegó la
migración SQL** que agrega la columna a la tabla `order_lines`. La base de
producción quedó con el schema anterior (22 columnas, sin `deliveredAt`),
mientras el Prisma Client del backend esperaba la columna → schema drift.

`prisma migrate deploy` reportaba "No pending migrations" porque no había
migración registrada; por eso el deploy no fallaba pero el endpoint 500.

## Solución aplicada (v1.46.0 hotfix)
1. Migración `backend/prisma/migrations/20261104120000_add_order_line_delivered_at/migration.sql`:
   ```sql
   ALTER TABLE "order_lines" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
   CREATE INDEX IF NOT EXISTS "order_lines_deliveredAt_idx" ON "order_lines"("deliveredAt");
   ```
2. Aplicada manualmente en producción vía `psql` (columna + índice).
3. Registrada en `_prisma_migrations` (checksum sha256 del SQL).
4. Verificado: `POST /api/v1/guest/orders` → 200 con `orderId`.

## Prevención
- Toda modificación de `schema.prisma` debe ir acompañada de su migración
  (`npx prisma migrate dev` / carpeta `migrations/<timestamp>_<desc>/migration.sql`)
  antes de commitear. Ver AGENTS.md §2.4.
- `prisma migrate deploy` en el deploy detectará migraciones pendientes si la
  carpeta está sincronizada con la imagen.

## Estado
✅ Resuelto (2026-11-04).
