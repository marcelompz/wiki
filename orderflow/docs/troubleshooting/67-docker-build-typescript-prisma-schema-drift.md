# 67 - Docker Build Backend: 20 errores TypeScript por desajuste Prisma/schema y missing imports

**Fecha:** 2026-08-26  
**Área:** Backend / Docker / TypeScript / Prisma  
**Estado:** ✅ Resuelto

---

## Síntoma

Al ejecutar el build de producción del backend dentro de Docker:

```text
Error: nest build --config tsconfig.build.json
Found 20 error(s).

src/auth/auth.service.ts:549:17 - error TS2304: Cannot find name 'NotFoundException'.
src/auth/auth.service.ts:575:11 - error TS2353: Object literal may only specify known properties, and 'password' does not exist in type ...
src/customers/customers.controller.ts:364:31 - error TS2339: Property 'odooPartnerId' does not exist on type ...
src/integrations/odoo/odoo-webhooks.service.ts:286:28 - error TS2353: Object literal may only specify known properties, and 'odooPartnerId' does not exist ...
...
src/orders/orders.service.ts:753:18 - error TS2353: Object literal may only specify known properties, and 'lines' does not exist ...
src/quotations/quotations.service.ts:131:9 - error TS2322: Type 'string | undefined' is not assignable to type 'string'.
...
```

El build fallaba en el paso `npm run build` del `Dockerfile.prod`, impidiendo generar la imagen de producción.

---

## Causa raíz

1. **Import faltante en `auth.service.ts`:** se usaba `NotFoundException` sin importarlo desde `@nestjs/common`.
2. **Schema Prisma desactualizado vs código:** el modelo `User` define `passwordHash`, pero el código de auth intentaba escribir `password` en el create.
3. **Campos legacy en `Customer`:** el código usaba `odooPartnerId`, `ruc` y `documentNumber` como si existieran en el modelo `Customer`, pero el schema actual solo tiene `taxId`.
4. **Campos legacy en `ElectronicDocument`:** el código intentaba escribir `estadoSifen` y `kudeUrl`, pero el schema actual tiene `estado` y `pdfUrl`.
5. **Relación `Order` / `OrderLine`:** el código usaba `include: { lines: true }` y `order.lines`, pero el modelo `Order` se relaciona con `orderLines`, no `lines`.
6. **Tipos nulables en `Quotation`:** `customerId` y `validUntil` pueden ser `undefined`/`null`, pero el código los pasaba directamente a Prisma sin validar.

---

## Solución aplicada

### 1. `auth.service.ts`
- Agregar `NotFoundException` al import de `@nestjs/common`.
- Cambiar `password:` por `passwordHash:` en el `create` de `User`.

### 2. `customers.controller.ts`
- Reemplazar `customer.odooPartnerId` por `meta.odooId` (lee desde `metadata`).
- Eliminar referencias a `odooPartnerId` en el DTO de respuesta.

### 3. `odoo-webhooks.service.ts`
- Reescribir búsquedas y updates para usar `metadata` en lugar de campos inexistentes:
  - `where: { tenantId, odooPartnerId: String(odooId) }` → buscar por `metadata` o crear/actualizar con `metadata.odooId`.
  - Eliminar `ruc` y `documentNumber` de queries de `Customer`; usar `taxId` o `metadata`.
  - En `ElectronicDocument`, cambiar `estadoSifen` por `estado` y `kudeUrl` por `pdfUrl`.

### 4. `orders.service.ts`
- Reemplazar `include: { lines: true }` por `include: { orderLines: true }`.
- Acceder a `order.orderLines` en lugar de `order.lines`.

### 5. `quotations.service.ts`
- Validar `data.customerId` antes de crear la cotización.
- Verificar que `quotation.validUntil` exista antes de comparar fechas.
- Usar `orderLines` en lugar de `lines` en el `include` de `Order`.

---

## Lección aprendida

Cuando se modifica el schema de Prisma (`schema.prisma`), hay que actualizar **todos** los servicios, controllers y DTOs que tocan esos modelos. El build local de NestJS puede no detectar errores de tipos hasta compilar con `tsconfig.build.json` en modo estricto dentro del contenedor Docker.

**Regla:** después de cualquier cambio en `schema.prisma`, ejecutar:

```bash
cd backend && npx prisma generate && npm run build
```

antes de hacer deploy o build Docker.

---

## Archivos modificados

- `backend/src/auth/auth.service.ts`
- `backend/src/customers/customers.controller.ts`
- `backend/src/integrations/odoo/odoo-webhooks.service.ts`
- `backend/src/orders/orders.service.ts`
- `backend/src/quotations/quotations.service.ts`
