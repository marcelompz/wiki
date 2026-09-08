# FEAT-113 — Prompt de Implementación

**Título:** OmniDineIn Cimientos: PosSession real + rol WAITER + permisos `cash:*` / `tables:*`  
**Status objetivo:** `completed`  
**Depende de:** FEAT-093, FEAT-097, FEAT-112 (completed)  
**Rama sugerida:** `feat/gastro-01-pos-session-roles`

---

## Rol y reglas

Rol: **Implementador** (seguir `AGENTS.md` / `docs/00-contexto-agentes.md`).

Reglas obligatorias:
- `tenantId` nunca se omite de ninguna query.
- Prohibido instanciar `PrismaClient` directamente → usar `@TenantPrisma()` o el cliente resuelto por `TenantConnectionManager`.
- No modificar lógica según `ORDERFLOW_MODE`.
- No comentar código salvo pedido explícito.
- No hacer commit/push sin confirmación.

Antes de tocar código, revisar:
- `backend/prisma/schema.prisma` (Order, OrderLine, CashMovement, User, Permission, RolePermission, UserTenantPermission)
- `backend/src/common/rbac.service.ts`
- `backend/src/orders/orders.service.ts` (especialmente `closePosSession` de FEAT-093)

---

## 1. Cambios en schema.prisma

```prisma
enum UserRole {
  ADMIN
  MANAGER
  SELLER
  WAITER          // NUEVO
  VIEWER
}

enum PosSessionStatus {
  OPENING_CONTROL
  OPEN
  CLOSING_CONTROL
  CLOSED
}

model PosConfig {
  id              String             @id @default(uuid())
  tenantId        String
  name            String
  stockLocationId String?
  allowPriceEdit  Boolean            @default(false)
  allowDiscount   Boolean            @default(true)
  isActive        Boolean            @default(true)
  isDeleted       Boolean            @default(false)
  deletedAt       DateTime?
  sessions        PosSession[]
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  @@index([tenantId])
  @@map("pos_configs")
}

model PosSession {
  id              String             @id @default(uuid())
  tenantId        String
  configId        String?
  config          PosConfig?         @relation(fields: [configId], references: [id], onDelete: Restrict)
  cashierId       String
  deviceLabel     String?
  status          PosSessionStatus   @default(OPEN)
  openingFloat    Decimal            @db.Decimal(15, 2)
  expectedCash    Decimal?           @db.Decimal(15, 2)
  closingCash     Decimal?           @db.Decimal(15, 2)
  variance        Decimal?           @db.Decimal(15, 2)
  reportXData     Json?
  reportZData     Json?
  openedAt        DateTime           @default(now())
  closedAt        DateTime?
  isActive        Boolean            @default(true)
  isDeleted       Boolean            @default(false)
  deletedAt       DateTime?

  cashMovements   CashMovement[]

  @@index([tenantId, status])
  @@index([cashierId])
  @@map("pos_sessions")
}

model PaymentMethod {
  id        String   @id @default(uuid())
  tenantId  String
  name      String
  code      String
  isActive  Boolean  @default(true)
  isDeleted Boolean  @default(false)
  deletedAt DateTime?

  @@index([tenantId])
  @@map("payment_methods")
}

model PosOrderAuditLog {
  id            String   @id @default(uuid())
  tenantId      String
  orderId       String
  userId        String
  supervisorId  String?
  action        String
  reason        String?
  metadata      Json?
  createdAt     DateTime @default(now())

  @@index([tenantId, orderId, createdAt])
  @@map("pos_order_audit_logs")
}
```

**Ajustes sobre CashMovement existente:**
- Convertir `registeredBy` (String?) → `registeredById String?` con FK a `User`.
- Relacionar `posSessionId` formalmente con `PosSession`.

Generar migración:
```bash
npx prisma migrate dev --name omnigastro_feat113_pos_session_roles
```

---

## 2. rbac.service.ts

Añadir a `PERMISSION_SEED`:

```ts
{ name: 'cash:collect',       module: 'cash' },
{ name: 'cash:open_session',  module: 'cash' },
{ name: 'cash:close_session', module: 'cash' },
{ name: 'cash:audit',         module: 'cash' },
{ name: 'tables:own',         module: 'tables' },
{ name: 'tables:transfer',    module: 'tables' },
{ name: 'tables:reassign',    module: 'tables' },
{ name: 'tables:manage',      module: 'tables' },
```

Ejecutar el seed de permisos existente.

---

## 3. Módulo pos-sessions

Ubicación sugerida: `backend/src/pos-sessions/`

Archivos:
- `pos-sessions.module.ts`
- `pos-sessions.controller.ts`
- `pos-sessions.service.ts`
- `pos-sessions.manifest.json`

### Métodos obligatorios del service

```ts
openSession(tenantId: string, cashierId: string, openingFloat: Decimal, deviceLabel?: string): Promise<PosSession>

closeSession(sessionId: string, closingCash: Decimal): Promise<PosSession>
// - Suma CashMovement de la sesión (type IN - OUT)
// - Calcula expectedCash y variance = closingCash - expectedCash
// - Guarda reportZData
// - status = CLOSED, closedAt = now()

getActiveSession(tenantId: string, userId: string): Promise<PosSession | null>

getSessionReport(sessionId: string): Promise<SessionReport>
// breakdown por paymentType, openingFloat, expectedCash, closingCash, variance, movimientos
```

### Endpoints

```
POST   /api/v1/pos-sessions/open          (cash:open_session)
POST   /api/v1/pos-sessions/:id/close     (cash:close_session)
GET    /api/v1/pos-sessions/active        (cash:collect o cash:audit)
GET    /api/v1/pos-sessions/:id/report    (cash:audit o propio cashierId)
```

Registrar el módulo en `modules.registry.ts`.

---

## 4. orders.controller.ts + orders.service.ts

En el endpoint de **confirmación / cobro**:

1. Extraer el usuario autenticado (`req.user`).
2. Cambiar el permiso requerido a `cash:collect`.
3. Validar que exista una `PosSession` en estado `OPEN` para ese `userId` + `tenantId`.  
   Si no existe → `BadRequestException('Debe abrir caja antes de cobrar')`.
4. Al crear el `CashMovement`, completar:
   - `registeredById = user.id`
   - `posSessionId = activeSession.id`

No romper la sincronización existente con Odoo (FEAT-093). El nuevo `PosSession` debe poder alimentar el mismo evento de cierre.

---

## 5. Criterios de aceptación

- [ ] Se puede abrir una sesión de caja con fondo inicial.
- [ ] No se puede cobrar sin sesión abierta.
- [ ] Al cerrar, se calcula `expectedCash` y `variance` correctamente.
- [ ] El rol `WAITER` existe y los 8 permisos nuevos están sembrados.
- [ ] `CashMovement` queda vinculado a `PosSession` y a `User`.
- [ ] Tests unitarios del service de sesiones pasan.
- [ ] `init.sh` / build limpio (cuando el Revisor lo ejecute).

---

## 6. Al terminar

Informar archivos tocados.  
Dejar pendiente para el Revisor:
- Correr `./scripts/init.sh` (solo con confirmación explícita del usuario).
- Actualizar `featurelist.json` → FEAT-113 status `completed`.
- Actualizar VERSION, package.json, ROADMAP.md, CHANGELOG.md, docs/02-architecture.md.
