**✅ Migración gradual a `@TenantPrisma()` implementada**

Archivos listos en:

`/home/workdir/artifacts/orderflow-migration/`

### Qué se hizo

| Archivo | Cambio |
|---------|--------|
| `common/tenant-prisma.decorator.ts` | Mejorado + type `TenantPrismaClient` + docs |
| `common/tenant-connection.manager.ts` | Documentado y listo |
| `app.module.ts` | **`TenantConnectionManager` registrado** (antes era solo `@Optional` y a veces no se inyectaba) |
| `products/products.service.ts` | **Migrado** — parámetro opcional `prisma?` en todos los métodos |
| `products/products.controller.ts` | Usa `@TenantPrisma()` y lo pasa al service |
| `products/sync-products.controller.ts` | Usa `@TenantPrisma()` (ya no inyecta `PrismaService` directo) |
| `MIGRACION_TENANT_PRISMA.md` | Guía completa del patrón |

### Patrón (zero breaking change)

```ts
// Service
private db(prisma?: TenantPrismaClient) {
  return prisma ?? this.prisma;  // fallback al singleton
}

async findAll(tenantId, filters, isPublic = false, prisma?: TenantPrismaClient) {
  const db = this.db(prisma);
  return db.product.findMany({ ... });
}

// Controller
async findAll(@Req() req, @Query() query, @TenantPrisma() prisma: PrismaClient) {
  return this.productsService.findAll(tenant.id, query, false, prisma);
}
```

Las llamadas antiguas **siguen funcionando** (el 4º argumento es opcional).

### Flujo en runtime

```
Request → ApiKeyGuard
            → TenantConnectionManager.getClient(tenant)
                 shared    → PrismaService
                 dedicated → PrismaClient cacheado
            → request.tenantPrisma = client

Controller → @TenantPrisma() → Service
```

### Próximos módulos a migrar (mismo patrón)

1. **orders** (crítico por KDS / POS)
2. **bookings**
3. **customers / contacts**
4. Resto (loyalty, quotations, biolinks…)

**No migrar** (o al final): `AuditService`, `RbacService`, `ApiKeyAuditService` — operan sobre tablas globales/shared.

---

**Cómo aplicar en tu repo:**

```bash
# Copiar los archivos modificados sobre tu backend/
cp orderflow-migration/backend/src/common/tenant-prisma.decorator.ts backend/src/common/
cp orderflow-migration/backend/src/common/tenant-connection.manager.ts backend/src/common/
cp orderflow-migration/backend/src/app.module.ts backend/src/
cp orderflow-migration/backend/src/products/products.service.ts backend/src/products/
cp orderflow-migration/backend/src/products/products.controller.ts backend/src/products/
cp orderflow-migration/backend/src/products/sync-products.controller.ts backend/src/products/
```

Luego:

```bash
cd backend && npm run build && npm test -- tenant-connection.manager.spec.ts
```
