Implementación de RLS lista en:

**`/home/workdir/artifacts/rls/`**

### Estructura

| Archivo | Propósito |
|---------|-----------|
| `sql/001_enable_rls.sql` | Policies + funciones `app_current_tenant_id()` / `app_is_superadmin()` |
| `sql/002_roles_and_grants.sql` | Roles `orderflow_app` (sin bypass) y `orderflow_migrator` (BYPASSRLS) |
| `sql/003_verify_rls.sql` | Smoke test de aislamiento entre tenants |
| `sql/999_disable_rls.sql` | Rollback de emergencia |
| `nestjs/tenant-rls.interceptor.ts` | Interceptor + helper `withTenantRls()` para jobs |
| `nestjs/rls.module.snippet.ts` | Cómo registrarlo en NestJS |
| `README.md` | Guía de despliegue completa |

### Diseño

1. **Tablas con `"tenantId"`** → policy directa  
2. **Hijas sin `tenantId`** (`order_lines`, `services`, etc.) → policy vía FK al padre  
3. **Catálogos globales** (plans, permissions) → lectura abierta, escritura solo superadmin  
4. **`FORCE ROW LEVEL SECURITY`** → el owner de la tabla también queda sujeto a las policies  

### Flujo en runtime

```
Tenant middleware → Auth → TenantRlsInterceptor
  set_config('app.tenant_id', uuid, true)
→ Prisma queries filtradas por PostgreSQL
```

### Orden de aplicación

```bash
psql "$MIGRATE_DATABASE_URL" -f sql/002_roles_and_grants.sql
psql "$MIGRATE_DATABASE_URL" -f sql/001_enable_rls.sql
psql "$MIGRATE_DATABASE_URL" -f sql/003_verify_rls.sql
```

**Importante:** la app debe usar el rol `orderflow_app` (sin `BYPASSRLS`); las migraciones Prisma, el rol `orderflow_migrator`.

Si alguna FK del schema real tiene otro nombre de columna, hay que ajustar ese bloque en `001` antes de aplicar en producción.
