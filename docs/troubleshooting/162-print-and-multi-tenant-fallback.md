# Troubleshooting #162 — KDS Printing & Multi-Tenant Fallback

> **Área:** Backend / KDS / Multi-Tenant / Waiters  
> **Síntoma:** Dos regresiones de aislamiento tenant en código nuevo de FEAT-151/152:
> 1. `waiter-calls.controller.ts` resuelve `acknowledgedById` sin `tenantId` cuando falta JWT user.
> 2. `kitchen-print.service.ts` actualiza `KitchenTicket` sin `tenantId` en el `where`.
>
> **Fecha:** 2026-09-27  
> **Estado:** Documentado — fix pendiente de merge seguro.

---

## 1. Hallazgo CRITICAL — Fallback de `acknowledgedById` sin tenant scope

**Archivo:** `backend/src/waiter/waiter-calls.controller.ts:103`

### Síntoma
Cuando el endpoint `PATCH /api/v1/waiter/calls/:id/take-order` se llama sin JWT user pero con `body.claimedBy`, el fallback busca un `User` por nombre/email sin filtrar por `tenantId`.

```ts
const waiter = await prisma.user.findFirst({
  where: {
    OR: [
      { name: { equals: body.claimedBy, mode: 'insensitive' } },
      { email: { equals: body.claimedBy, mode: 'insensitive' } },
    ],
  },
  select: { id: true },
});
```

### Causa raíz
En este codebase, `User` es **global** (`email` único global) y **no tiene `tenantId`** en el modelo Prisma. Por eso:
- No se puede filtrar la búsqueda por tenant.
- En modo `community`, un `claimedBy` compartido entre tenants puede matchear un usuario de otro tenant.
- En modo `enterprise`, el riesgo es menor porque el tenant es fijo, pero igual se viola la regla general de scopeo.

### Solución evaluada y descartada
Agregar `tenantId: tenant.id` al `where` **no compila**:
```
TS2353: Object literal may only specify known properties, and 'tenantId' does not exist in type 'UserWhereInput'.
```

Esto confirma que `User` no posee `tenantId` en el schema actual.

### Opciones de remediación
1. **Búsqueda por `UserTenantAccess`** (recomendada):
   - Buscar primero `UserTenantAccess` por tenant y rol Mozo, luego filtrar por `userId`/`name`/`email`.
   - Garantiza aislamiento porque cruza por tenant explícitamente.
2. **No resolver `acknowledgedById` en fallback**:
   - Dejar `acknowledgedById = null` cuando no haya JWT user.
   - Evita asociar equivocadamente un usuario cross-tenant.
3. **Resolver por dominio de email** (solo si se fuerza naming por tenant):
   - Ej: `mozo@tenant1.empresa.com`. Requiere convención y no es generalizable.

### Precedente
Este patrón ya existía antes de FEAT-151/152; no fue introducido por la nueva feature, pero el code review lo expuso. Documentarlo evita “soluciones” parciales como agregar `tenantId` donde el modelo no lo soporta.

---

## 2. Hallazgo WARNING — `kitchenTicket.update()` sin `tenantId`

**Archivo:** `backend/src/kds/kitchen-print.service.ts:28`

### Síntoma
Después de imprimir, el servicio actualiza el ticket solo por `id`:

```ts
await this.prisma.kitchenTicket.update({
  where: { id: ticketId },
  data: { ... },
});
```

### Causa raíz
Omisión directa del scopeo `tenantId` en el `where`. Si por algún bug de routing o caller un ticket ID colisionara entre tenants, se actualizaría el ticket de otro tenant.

### Solución
Incluir `tenantId` en el `where`:

```ts
await this.prisma.kitchenTicket.update({
  where: { id: ticketId, tenantId },
  data: { ... },
});
```

> Nota: `tenantId` **sí existe** en `KitchenTicket` model y en `KitchenTicketWhereInput`, por lo que este fix compila sin problemas.

---

## 3. Acciones tomadas / pendientes

| # | Acción | Estado |
|---|--------|--------|
| 1 | Documentar que `User` es global y no tiene `tenantId` | ✅ Este doc |
| 2 | Eliminar fallback `waiter-calls.controller.ts` que resuelve `acknowledgedById` por nombre/email sin scopeo | ✅ Fix aplicado en `e0e5c3f6` |
| 3 | Agregar `tenantId` en `kitchen-print.service.ts` | ✅ Fix aplicado en `e0e5c3f6` |
| 4 | Bloquear merges que agreguen `tenantId` en queries contra modelos globales sin FK de tenant | 🟡 Pendiente — agregar regla al linter/CI |
| 5 | Mejora futura: resolver `acknowledgedById` por `UserTenantAccess` si se requiere auditoría del mozo sin JWT | 🟡 Pendiente |

---

## 4. Referencias

- Modelo `User`: `backend/prisma/schema.prisma` — sin `tenantId`.
- Modelo `UserTenantAccess`: acceso por tenant y rol.
- FEAT-151/152 branch: `feat/gastro-kds-multi-station-print`.
- Regla del proyecto: **`tenantId` es sagrado**; si un modelo no lo tiene, usar la tabla de acceso intermedia correspondiente.
