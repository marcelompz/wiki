# #206 — Migración snake_case + campo Prisma sin `@map`: `The column "bills.totalAmount" does not exist` (500 en toda query de bills)

> **Fecha:** 2026-10-26 · **Vertical:** OmniGastro / Bills + Table Sessions · **Relacionados:** #06, #132, #151, §2.4 de AGENTS · **Impacto:** 500 en producción en todos los flujos de facturación desde el 23-oct (externo al health-check)

## Síntoma

`POST /api/v1/table-sessions/:id/close` (force) respondió **500** con:

```
Invalid `prisma.bill.findMany()` invocation:
The column `bills.totalAmount` does not exist in the current database.
```

Reproducible en TODA query del modelo `Bill` (y potencialmente en `BillSplit.query`).

## Causa raíz

La migración `20261023120000_gastro_table_sessions_bills` (FEAT-203/204/205) creó `bills` y `table_sessions` íntegramente en **snake_case** (correcto según §2.4) y agregó `bill_id` a `orders`/`bill_splits`. El `schema.prisma` quedó con 2 campos **sin `@map`**:

```prisma
model Bill {
  totalAmount Decimal @default(0) @db.Decimal(15, 2)      // ❌ sin @map("total_amount")
}
model BillSplit {
  billId String?   // ❌ sin @map("bill_id")
}
```

El cliente Prisma genera `"totalAmount"` (camel) para esas columnas → nunca matchiean con la DB real → `PrismaClientKnownRequestError P2022`. El health-check no lo destapa (no consulta bills).

**Red flag de la diagnosis:** `information_schema.columns` listaba `totalAmount` "existente" — era ruido de la tabla `orders` (legacy, camel y correcta) porque la query no filtraba `table_schema`. Regla: filtrar SIEMPRE por `table_schema='public'`.

## Solución aplicada (2026-10-26, v1.43.4)

```prisma
totalAmount Decimal @default(0) @map("total_amount") @db.Decimal(15, 2)
billId      String? @map("bill_id")
```

- `npx prisma validate` + `npx prisma generate` (regeneración de cliente; **sin DDL**, no requiere migración).
- Verificación end-to-end local: force-close de la sesión de mesa G8 → 200, mesa `FREE`, sesion `CLOSED` con telemetría t11/t12 en metadata.

## Prevención (checklist para todo modelo/tabla nueva, obligatorio pre-deploy)

1. **Cada campo del modelo debe tener `@map` explícito** (excepto `id`, `currency` y campos 1:1 ten camel(columna) legacy/documentado).
2. Verificación automática de campo ↔ columna (agregar al pre-deploy-diagnostic):
   ```sql
   -- Para cada modelo nuevo: comparar los column_name reales vs los @map del schema.prisma
   SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='<tabla>';
   ```
3. `npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-migrations prisma/migrations` debe ser **vacío** (schema=estado de migraciones) — un diff no vacío con mappings cambia solo debe saldarse antes del build.
4. Smoke mínimo de verticales que incluya **un insert/select real de la tabla nueva** vía API (no solo health).
