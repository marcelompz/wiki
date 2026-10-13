# Tech Debt Plan: Migrar tabla `positions` a snake_case

> **Estado:** Propuesto  
> **Fecha:** 2026-10-03  
> **Creado por:** Solicitud de usuario (post-fix de 500 error en `/api/v1/positions`)  
> **Prioridad:** Medium  
> **Relacionado:** `docs/troubleshooting/06-postgresql-camelcase-column-names.md`, `docs/troubleshooting/132-rls-migration-snakecase-columns.md`

---

## 1. Contexto

La tabla `positions` es una **tabla legacy** que usa `camelCase` para sus columnas:
- `tenantId` → debería ser `tenant_id`
- `departmentId` → debería ser `department_id`
- `parentId` → debería ser `parent_id`
- `createdAt`, `updatedAt` → `created_at`, `updated_at`
- `baseRole` → `base_role`

Actualmente, el schema de Prisma tiene el model `Position` con estas columnas **sin** `@map()` (correcto para legacy), pero el user solicitó migrar a snake_case para alinearse con las nuevas tablas como `departments`.

## 2. Objetivo

Migrar la tabla `positions` de camelCase a snake_case en PostgreSQL, y actualizar el schema de Prisma correspondientemente, siguiendo las convenciones de AGENTS.md §2.4.

## 3. Cambios Requeridos

### 3.1. Migration SQL (`20261003180000_migrate_positions_to_snake_case`)

```sql
-- Rename columns in positions table (legacy camelCase → snake_case)
-- Per AGENTS.md rule #2.4: tables created before 2026-09-12 use camelCase,
-- but explicit user request allows migration. Use quoted identifiers.

ALTER TABLE "positions" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "positions" RENAME COLUMN "departmentId" TO "department_id";
ALTER TABLE "positions" RENAME COLUMN "parentId" TO "parent_id";
ALTER TABLE "positions" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "positions" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "positions" RENAME COLUMN "baseRole" TO "base_role";

-- Recreate indexes with new column names
DROP INDEX IF EXISTS "positions_departmentId_idx";
DROP INDEX IF EXISTS "positions_parentId_idx";
DROP INDEX IF EXISTS "positions_tenantId_code_key";
DROP INDEX IF EXISTS "positions_tenantId_idx";

CREATE UNIQUE INDEX "positions_tenant_id_code_key" ON "positions"("tenant_id", "code");
CREATE INDEX "positions_tenant_id_idx" ON "positions"("tenant_id");
CREATE INDEX "positions_department_id_idx" ON "positions"("department_id");
CREATE INDEX "positions_parent_id_idx" ON "positions"("parent_id");

-- Recreate foreign keys referencing renamed columns
ALTER TABLE "positions"
  DROP CONSTRAINT "positions_tenantId_fkey",
  DROP CONSTRAINT "positions_departmentId_fkey",
  DROP CONSTRAINT "positions_parentId_fkey";

ALTER TABLE "positions"
  ADD CONSTRAINT "positions_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "positions"
  ADD CONSTRAINT "positions_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "departments"("id")
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "positions"
  ADD CONSTRAINT "positions_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "positions"("id")
  ON UPDATE CASCADE ON DELETE SET NULL;
```

**Importante:** La tabla `user_tenant_access` también tiene una FK a `positions(id)`:
```sql
TABLE "user_tenant_access" CONSTRAINT "user_tenant_access_positionId_fkey"
  FOREIGN KEY ("positionId") REFERENCES positions(id) ON UPDATE CASCADE ON DELETE SET NULL
```
Esta FK referencia `positions.id` (no cambia, `id` permanece igual), por lo que no necesita modificación.

### 3.2. Schema Prisma (`backend/prisma/schema.prisma`)

Actualizar el model `Position`:

```prisma
model Position {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")
  name        String
  code        String
  description String?
  baseRole    UserRole @map("base_role")
  departmentId String?  @map("department_id")
  parentId    String?  @map("parent_id")
  active      Boolean  @default(true)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  tenant      Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  userAccess  UserTenantAccess[]
  employees   Employee[]          @relation("EmployeePosition")
  department  Department?         @relation("DepartmentPositions", fields: [departmentId], references: [id], onDelete: SetNull)
  parent      Position?           @relation("PositionHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  children    Position[]          @relation("PositionHierarchy")
  tipDistributions TipDistribution[]

  @@unique([tenantId, code])
  @@index([tenantId])
  @@index([departmentId])
  @@index([parentId])
  @@map("positions")
}
```

### 3.3. Código afectado

| Archivo | Línea | Cambio |
|---------|-------|--------|
| `backend/src/positions/position.service.ts` | ~33 | Usa `tenantId` como campo Prisma (CamelCase en código = OK, Prisma mapea internamente) |
| `backend/src/hr/hr.service.ts` | ~388 | `getOrganization` con `positions: true` (incluye en query) |
| `frontend/src/pages/admin/hr-organization.tsx` | ~varías | Llamadas API que envían/reciben `tenantId`, `departmentId`, `parentId` - estos campos en JSON mantienen camelCase en el API contract, no cambian |

**Nota clave:** Los campos en las APIs REST/JSON mantienen camelCase (`tenantId`, `departmentId`, `parentId`) por consistencia del contract de API. Este cambio solo afecta a las columnas de PostgreSQL por debajo.

### 3.4. Tabla `user_tenant_access`

```sql
-- La FK de user_tenant_access → positions(id) no cambia:
-- user_tenant_access.positionId → positions.id (id no se renombra)
```

No se requieren cambios en `user_tenant_access`.

## 4. Plan de Implementación (Fases)

### Fase 1: Preparación
- [ ] Crear branch: `feat/gastro-migration-positions-snake-case`
- [ ] Verificar respaldo de base de datos en todos los entornos

### Fase 2: Schema Prisma
- [ ] Actualizar model `Position` con `@map("tenant_id")`, `@map("department_id")`, `@map("parent_id")`, `@map("base_role")`, `@map("created_at")`, `@map("updated_at")`
- [ ] Regenerar Prisma client: `npx prisma generate`
- [ ] Verificar TypeScript compila: `npx tsc --noEmit`

### Fase 3: Migration SQL
- [ ] Crear archivo: `backend/prisma/migrations/20261003180000_migrate_positions_to_snake_case/migration.sql`
- [ ] Test en DB local

### Fase 4: Testing
- [ ] Ejecutar tests unitarios de positions: `npm run test -- --testPathPattern=position`
- [ ] Ejecutar tests E2E: `npx playwright test` (cobertura: HR Organization page)
- [ ] Verificar endpoints:
  - `GET /api/v1/positions` → 403 (sin permisos) o 200
  - `GET /api/v1/hr/organization` → 403 o 200
  - `GET /api/v1/hr/departments` → 403 o 200

### Fase 5: Deploy
- [ ] Commit y push a `origin/main`
- [ ] Ejecutar `./scripts/deploy-production.sh production` (con autorización del usuario)
- [ ] Verificar que `prisma migrate deploy` aplica la migración
- [ ] Health checks post-deploy

## 5. Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Lock de tabla durante rename (posiciones activas) | Ejecutar en ventana de mantenimiento |
| Migración fallida deja tabla en estado intermedio | Migration usa `RENAME COLUMN` (atómico por statement) |
| Código que hace SQL raw con columnas camelCase | Greppear `tenantId`, `departmentId`, `parentId` en scripts SQL |

## 6. Verificación Post-Migración

```sql
-- Verificar columnas renombradas
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'positions' ORDER BY ordinal_position;

-- Verificar FKs reconstruidas
SELECT conname, conrelid::regclass 
FROM pg_constraint 
WHERE conconfrelid = 'positions'::regclass;

-- Probar queries
SET app.tenant_id = 'provecchio-dimora-001';
SELECT id, "tenant_id", "department_id", "parent_id" FROM positions LIMIT 5;
```
