# Troubleshooting #159: 500 Error en /api/v1/positions y /api/v1/hr/organization — Schema Prisma camelCase vs snake_case

> **Fecha:** 2026-10-03  
> **Módulo / Área:** Backend / Prisma ORM / PostgreSQL / HR Module (Positions)  
> **Severidad:** Alta (500 Internal Server Error en endpoints críticos)  
> **Estado:** ✅ **RESUELTO**

---

## 1. Síntoma / Problema

Los endpoints `/api/v1/positions` y `/api/v1/hr/organization` retornaban **500 Internal Server Error**.

Los logs mostraban errores de PostgreSQL:
```
ERROR: column "tenant_id" does not exist
HINT: Perhaps you meant to reference the column "tenantId".
```

---

## 2. Causa Raíz

La tabla `positions` es una **tabla legacy** (creada antes del 2026-09-12) que usa columnas en `camelCase`:
- `tenantId`, `departmentId`, `parentId`, `createdAt`, `updatedAt`, `baseRole`

El modelo `Position` en `backend/prisma/schema.prisma` tenía:
```prisma
tenantId    String @map("tenant_id")  // ❌ INCORRECTO: la columna real es "tenantId"
```

El `@map("tenant_id")` le decía a Prisma que buscara la columna `tenant_id` en PostgreSQL, pero la columna real era `tenantId` (legacy, sin `@map`). Esto causaba el error 500 al ejecutar queries que incluían `positions` (especialmente `getOrganization` en `hr.service.ts` que usa `include: { positions: true }`).

### Segundo problema: Stale Prisma Client

Adicionalmente, el contenedor Docker tenía un volumen anónimo `node_modules` con una versión antigua del cliente Prisma que incluía un campo `type` en `BirthdayLogUncheckedCreateInput`, causando fallos de compilación TypeScript.

---

## 3. Solución Aplicada

### Paso 1: Fix de schema.prisma

```prisma
model Position {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")  // ✅ Correcto después de migración
  ...
}
```

### Paso 2: Migración a snake_case (AGENTS.md §2.4)

Creada la migración `20261003180000_migrate_positions_to_snake_case`:
```sql
ALTER TABLE "positions" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "positions" RENAME COLUMN "departmentId" TO "department_id";
ALTER TABLE "positions" RENAME COLUMN "parentId" TO "parent_id";
ALTER TABLE "positions" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "positions" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "positions" RENAME COLUMN "baseRole" TO "base_role";
```

### Paso 3: Stale Docker volume cleanup

```bash
docker compose stop backend
docker rm -f orderflow_backend
docker volume rm <anonymous_volume_id>
docker compose up -d --force-recreate backend
```

### Paso 4: Registrar migración en DB

```bash
npx prisma migrate resolve --applied "20261003180000_migrate_positions_to_snake_case"
```

---

## 4. Verificación

```bash
# Endpoints ya no retornan 500
curl -s -H "x-api-key: <tenant-key>" http://localhost:3010/api/v1/hr/departments?tenantId=super-admin-global
# Resultado: 200 con lista de departamentos

curl -s -H "x-api-key: <tenant-key>" http://localhost:3010/api/v1/hr/organization?tenantId=super-admin-global
# Resultado: 200 con organización incluyendo departamentos y positions

curl -s http://localhost:3010/api/v1/health
# Resultado: {"version":"1.38.1","status":"ok"}
```

---

## 5. Regeneración del Cliente Prisma (Fix Específico)

El problema clave fue que el cliente Prisma dentro del contenedor Docker estaba desactualizado (stale). Aunque `schema.prisma` y la migración SQL estaban actualizados, el contenedor usaba un volumen anónimo de `node_modules` con una versión antigua del cliente Prisma que aún hacía referencia a las columnas `camelCase` (`positions.departmentId`, `positions.tenantId`).

### Comandos aplicados:

```bash
# 1. Regenerar Prisma Client dentro del contenedor (el código fuente está montado via bind mount)
docker exec orderflow_backend npx prisma generate

# 2. Reiniciar el backend para que cargue el cliente Prisma actualizado
docker compose restart backend
```

> **Nota:** El contenedor `orderflow_backend` usa `Dockerfile.dev` con bind mount `./backend:/app` y volumen anónimo para `/app/node_modules`. Cuando se cambia `schema.prisma`, el cliente Prisma debe regenerarse en el contenedor; el bind mount no actualiza automáticamente `node_modules`.

---

## 6. Lecciones Aprendidas

1. **Schema Prisma vs DB deben estar alineados**: Usar `@map()` cuando la columna DB usa snake_case. Para tablas legacy camelCase, NO usar `@map()`.
2. **Stale Docker volumes**: Los volúmenes anónimos de Docker persisten entre recreaciones. Siempre usar `--force-recreate` o eliminar volúmenes antiguos.
3. **`prisma migrate resolve`**: Cuando una migración se aplica manualmente, usar `--applied` para registrarla y evitar conflictos.

---

## 6. Comandos de Verificación Rápidos

```bash
# Ver columnas de positions
docker exec orderflow_db psql -U orderflow -d orderflow_db \
  -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'positions' ORDER BY ordinal_position;"

# Ver migraciones aplicadas
SELECT migration_name FROM _prisma_migrations ORDER BY started_at;

# Reset completar si algo falla
docker compose stop backend
docker rm -f orderflow_backend
docker volume rm $(docker volume ls -q --filter "name=9247acc")
docker compose build --no-cache backend
docker compose up -d backend
```

---

**Firma:** OrderFlow Engineering Team  
**Archivo:** `docs/troubleshooting/159-positions-schema-500-error.md`

---

## 7. Variante: 500 en POST /api/v1/hr/departments (Unique Constraint)

### Síntoma (2026-10-04)
`POST /api/v1/hr/departments` retornaba **500 Internal Server Error** con:
```
Unique constraint failed on the fields: ('tenant_id','code')
```

### Causa
La función `createDepartment()` en `backend/src/hr/hr.service.ts` no tenía manejo de errores para violaciones de constraints únicos (`P2002`). Prisma lanza `PrismaClientKnownRequestError` que NestJS no capturaba, resultando en un 500.

### Fix
```typescript
async createDepartment(tenantId: string, dto: CreateDepartmentDto) {
  await this.validateDepartmentReferences(tenantId, dto.parentId, dto.headEmployeeId);
  try {
    return await this.prisma.department.create({ data: { tenantId, ...dto } });
  } catch (err) {
    if (err.code === 'P2002') {
      throw new ConflictException(`El código "${dto.code}" ya existe en este tenant`);
    }
    throw err;
  }
}
```

### Verificación
- `POST` con código duplicado → **409 Conflict** (antes: 500)
- `POST` con código único → **201 Created**
- `PATCH` (update) con código conflictivo → **409 Conflict** (antes: 500)

### Variante: super-admin-global tenant inexistente (POST /positions 500)

#### Síntoma (2026-10-04)
`POST /api/v1/positions` retornaba **500 Internal Server Error** con:
```
Foreign key constraint violated: `positions_tenant_id_fkey (index)`
```

#### Causa
El `ApiKeyGuard` crea un tenant virtual `super-admin-global` para el master API key, pero este tenant **no existe en la base de datos**. La tabla `positions` tiene una FK constraint `positions_tenant_id_fkey → tenants.id`, mientras que `departments` no tiene FK. Por eso POST `/departments` funcionaba pero POST `/positions` fallaba.

#### Fix
1. **Crear el tenant virtual en la base de datos:**
```sql
INSERT INTO tenants (id, name, "active", "apiKeySecret", "currency", "updatedAt", "isolationTier") 
VALUES ('super-admin-global', 'Super Admin', true, 'sk_master_dy_dtImtW39jXa7RroYjQgkro', 'PYG', NOW(), 'shared')
ON CONFLICT (id) DO NOTHING;
```

2. **`backend/src/positions/position.service.ts:33`** — Saltar validación de tenant para `super-admin-global`:
```typescript
if (tenantId !== 'super-admin-global') {
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId } });
  if (!tenant) throw new BadRequestException('El tenant no existe');
}
```

#### Verificación
- `POST /positions` con master API key → **201 Created**
- `POST /hr/departments` con master API key → **201 Created** (sin cambios)

### Variante: POST/PUT en frontend siempre usa POST (400 Bad Request al editar)

#### Síntoma (2026-10-04)
Al intentar editar un cargo (position) o departamento desde la UI de `/admin/hr-organization`, el endpoint retornaba **400 Bad Request** con `"Código ${dto.code} ya existe en este tenant"`.

#### Causa
El componente `HrOrganizationPage` en `frontend/src/pages/admin/hr-organization.tsx` tenía dos modales separados ("Nuevo cargo" y "Editar cargo") que compartían el mismo estado `positionModal` y ambos usaban `savePosition` que **siempre hacía `POST`** (nunca `PATCH`). Al editar, el frontend enviaba un `POST` con el mismo `code`, y el backend lanzaba `BadRequestException` por código duplicado.

Adicionalmente, ambos modales estaban abiertos simultáneamente (misma prop `open={positionModal}`), causando superposición visual.

#### Fix
1. **`savePosition`** — Verificación de `editingPositionId`: si existe → `PATCH /api/v1/positions/:id`, si no → `POST /api/v1/positions`
2. **`saveDepartment`** — Mismo patrón con `editingDepartmentId`
3. **Consolidar modales** — Un solo modal con título dinámico: `editingPositionId ? "Editar cargo / puesto" : "Nuevo cargo / puesto"`
4. **Campo `code` disabled en edición** — `<Input disabled={!!editingPositionId} />` para prevenir cambios de código
5. **Botón "Nuevo cargo" limpia `editingPositionId`** — `onClick={() => { setEditingPositionId(null); setPositionModal(true); }}`
6. **Rebuilt frontend** — `docker build --no-cache` + `docker compose up --build -d --force-recreate frontend`

#### Verificación
- Editar cargo: frontend envía `PATCH /positions/:id` → 200 ✅
- Crear cargo: frontend envía `POST /positions` → 201 ✅
- Editar departamento: frontend envía `PATCH /hr/departments/:id` → 200 ✅

### Variante: PATCH /hr/departments → 400 "property code should not exist"

#### Síntoma (2026-10-04)
Al editar un departamento y cambiar su `parentId` (p.ej. "Barra" → bajo "Administracion"), el POST retornaba **400 Bad Request** con:
```
{"message":["property code should not exist","error":"Bad Request","statusCode":400}
```

#### Causa
`UpdateDepartmentDto` (backend) no incluye el campo `code` (no se debe cambiar el código de un departamento existente). El middleware de validación (`ValidationPipe` con `whitelist: true`) rechaza cualquier propiedad no declarada en el DTO. El formulario frontend enviaba `code` en el cuerpo del PATCH, causando el 400.

#### Fix
**`frontend/src/pages/admin/hr-organization.tsx` — `saveDepartment`**: Destructuring para eliminar `code` antes de enviar PATCH:
```typescript
const { code, ...updateData } = values;
await api.patch(`/api/v1/hr/departments/${editingDepartmentId}`, updateData);
```

#### Verificación
- PATCH `/api/v1/hr/departments/:id` con `parentId` → **200** ✅
- POST `/api/v1/hr/departments` con `code` → **201** ✅ (create still sends code)

### Variante: PATCH departamento no actualiza parentId a null al limpiar Select

#### Síntoma (2026-10-04)
Al editar un departamento y limpiar el campo "Departamento padre" (Select con `allowClear`), la UI confirmaba el guardado pero el departamento **permanecía como hijo** del departamento anterior.

#### Causa
Cuando el usuario hace clic en el ícono de limpiar (X) del Select de Ant Design, el valor del formulario se establece en `undefined`. Al enviar el PATCH vía axios, los valores `undefined` se **eliminen del JSON** (no se envían como `null`). Por lo tanto:
- El cuerpo del PATCH no incluía `parentId`
- El backend no actualizaba el campo
- `parentId` mantenía su valor anterior

#### Fix
**`frontend/src/pages/admin/hr-organization.tsx` — `saveDepartment` y `savePosition`**:
```typescript
if (updateData.parentId === undefined) {
  updateData.parentId = null;
}
if (updateData.departmentId === undefined) {
  updateData.departmentId = null;
}
```

#### Verificación
- PATCH con `parentId: null` (limpiar Select) → **200**, `parentId` se establece a `null` ✅
- PATCH con `departmentId: null` en posiciones → **200**, `departmentId` a `null` ✅
- POST (crear) con `parentId` → **201** ✅
