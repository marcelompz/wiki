# OrderFlow - Flujo de Autenticación Multi-Tenant

**Fecha:** 2026-06-21  
**Estado:** ✅ Implementado y testeado

---

## Resumen

OrderFlow implementa un sistema de autenticación **multi-tenant** inspirado en Odoo, donde:

1. **Usuarios son globales** (email único en todo el sistema)
2. **Acceso a tenants es mediante tabla intermedia** (`UserTenantAccess`)
3. **JWT incluye contexto de tenant** después de seleccionar

---

## Flujo Completo

### Paso 1: Login Global (sin tenant)

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "juan@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "15m",
  "user": {
    "id": "user-uuid",
    "email": "juan@example.com",
    "name": "Juan Pérez",
    "isSuperAdmin": false
  },
  "tenants": [
    {
      "tenantId": "tenant-abc123",
      "role": "ADMIN",
      "contactId": "contact-xyz"
    },
    {
      "tenantId": "tenant-def456",
      "role": "VIEWER",
      "contactId": null
    }
  ]
}
```

**Notas:**
- ✅ El `accessToken` es **global** (sin contexto de tenant)
- ✅ Se retorna lista de tenants accesibles
- ✅ El usuario puede acceder a múltiples tenants con diferentes roles

---

### Paso 2: Seleccionar Tenant

```bash
POST /api/v1/auth/select-tenant
Content-Type: application/json
Authorization: Bearer <access_token_global>

{
  "tenantId": "tenant-abc123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "juan@example.com",
    "name": "Juan Pérez",
    "role": "ADMIN",
    "tenantId": "tenant-abc123",
    "contactId": "contact-xyz"
  }
}
```

**Notas:**
- ✅ El nuevo `accessToken` **incluye tenantId y role**
- ✅ Solo se puede seleccionar un tenant al que el usuario tiene acceso
- ✅ SuperAdmins pueden acceder a cualquier tenant (aunque no estén en `UserTenantAccess`)

---

### Paso 3: Usar API con Tenant

```bash
GET /api/v1/orders
Authorization: Bearer <access_token_con_tenant>
x-api-key: <api_key_del_tenant>
```

**Notas:**
- ✅ Se requieren **ambos tokens**: JWT + API Key
- ✅ JWT valida el usuario y su rol en el tenant
- ✅ API Key valida el tenant (inyectado en el request)

---

## JWT Payload

### Token Global (después del login)

```json
{
  "sub": "user-uuid",
  "email": "juan@example.com",
  "name": "Juan Pérez",
  "isSuperAdmin": false,
  "tenantId": null,
  "contactId": null,
  "role": "VIEWER",
  "iat": 1234567890,
  "exp": 1234568790
}
```

### Token con Contexto de Tenant (después de select-tenant)

```json
{
  "sub": "user-uuid",
  "email": "juan@example.com",
  "name": "Juan Pérez",
  "isSuperAdmin": false,
  "tenantId": "tenant-abc123",
  "contactId": "contact-xyz",
  "role": "ADMIN",
  "iat": 1234567890,
  "exp": 1234568790
}
```

---

## Endpoints de Autenticación

| Endpoint | Método | Auth Requerida | Descripción |
|----------|--------|----------------|-------------|
| `/auth/login` | POST | ❌ | Login global (email + password) |
| `/auth/select-tenant` | POST | ✅ (global) | Seleccionar tenant y obtener JWT contextual |
| `/auth/refresh` | POST | ❌ | Refresh token (obtener nuevo access_token) |
| `/auth/logout` | POST | ✅ | Logout (invalidar refresh token) |
| `/auth/me` | GET | ✅ | Obtener datos del usuario autenticado |

---

## Tabla `UserTenantAccess`

### Schema

```prisma
model UserTenantAccess {
  id        String   @id @default(uuid())
  userId    String
  tenantId  String
  role      UserRole @default(VIEWER)
  contactId String?  @unique
  active    Boolean  @default(true)
  
  user      User     @relation(fields: [userId], references: [id])
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  contact   Contact? @relation(fields: [contactId], references: [id])
  
  @@unique([userId, tenantId])
}
```

### Roles Disponibles

| Role | Permisos |
|------|----------|
| `ADMIN` | Acceso completo (CRUD total) |
| `MANAGER` | Gerente (puede gestionar productos, clientes, turnos) |
| `SELLER` | Vendedor (solo crear pedidos y ver clientes) |
| `VIEWER` | Solo lectura |

---

## SuperAdmin

Un usuario con `isSuperAdmin: true` tiene:

- ✅ Acceso a **todos los tenants** (aunque no esté en `UserTenantAccess`)
- ✅ Puede crear/eliminar usuarios globales
- ✅ Puede asignar/revocar accesos a tenants
- ✅ El rol se determina dinámicamente: `ADMIN` si no hay `UserTenantAccess`

### Ejemplo: SuperAdmin accediendo a tenant

```bash
# Login
POST /auth/login
{ "email": "admin@orderflow.app", "password": "..." }

# Response
{
  "tenants": []  # Puede estar vacío (no está en UserTenantAccess)
}

# Select tenant (cualquiera)
POST /auth/select-tenant
{ "tenantId": "cualquier-tenant-id" }

# Response (como es superadmin, le da ADMIN)
{
  "user": {
    "role": "ADMIN",
    "tenantId": "cualquier-tenant-id"
  }
}
```

---

## Refresh Token

### Funcionamiento

1. **Login** → retorna `accessToken` (15 min) + `refreshToken` (7 días)
2. **Access Token expira** → usar `refreshToken` para obtener nuevo
3. **Refresh Token** puede incluir `targetTenantId` para cambiar de tenant

### Ejemplo

```bash
POST /auth/refresh
{
  "refreshToken": "eyJhbGc...",
  "targetTenantId": "tenant-def456"  # Opcional
}
```

---

## Logout

```bash
POST /auth/logout
Authorization: Bearer <access_token>
```

**Efectos:**
- ❌ Invalida `refreshToken` (borra hash de la DB)
- ❌ El usuario debe hacer login nuevamente
- ✅ El `accessToken` sigue válido hasta expirar (15 min)

---

## Ejemplos de Uso (cURL)

### 1. Login y obtener tenants

```bash
curl -X POST http://localhost:3010/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@example.com",
    "password": "password123"
  }'
```

### 2. Seleccionar tenant

```bash
curl -X POST http://localhost:3010/api/v1/auth/select-tenant \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{
    "tenantId": "tenant-abc123"
  }'
```

### 3. Acceder a recurso protegido

```bash
curl -X GET http://localhost:3010/api/v1/orders \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "x-api-key: tenant-api-key-12345"
```

### 4. Refresh token

```bash
curl -X POST http://localhost:3010/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGc..."
  }'
```

---

## Testing

### Ejecutar Tests

```bash
# Desde backend/
./scripts/run-all-tests.sh

# O tests individuales
./scripts/test-auth-flow.sh
./scripts/test-users-flow.sh
```

### Variables de Entorno para Tests

```bash
export TEST_USER_EMAIL="juan@example.com"
export TEST_USER_PASSWORD="password123"
export TEST_API_KEY="test-api-key-12345"
export TEST_TENANT_ID="test-tenant-001"
export API_BASE_URL="http://localhost:3010"
export API_KEY_HEADER="x-api-key"
```

### Seed de Datos de Prueba

```bash
# Crear usuario y tenant de prueba
./scripts/seed-test-data.sh

# Datos creados:
# - Tenant: test-tenant-001
# - Usuario: juan@example.com / password123
# - API Key: test-api-key-12345
```

---

## Seguridad

### Best Practices Implementadas

1. ✅ **Passwords hasheados** con bcrypt (cost: 10)
2. ✅ **Refresh tokens** almacenados como hash en DB
3. ✅ **JWT con expiración** corta (15 min)
4. ✅ **Doble validación**: JWT + API Key en endpoints
5. ✅ **Aislamiento de tenants**: validación en cada request
6. ✅ **Logout invalida refresh tokens**

### Configuración Recomendada

```bash
# .env
JWT_SECRET=<generar_con_openssl_rand_-hex_32>
JWT_REFRESH_SECRET=<generar_con_openssl_rand_-hex_32>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

---

## Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────────┐
│                    Usuario                                      │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  POST /auth/login (email + password)                            │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Response:                                                      │
│  - accessToken (global, sin tenant)                             │
│  - refreshToken                                                 │
│  - tenants: [{tenantId, role, contactId}]                       │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  POST /auth/select-tenant (tenantId)                            │
│  Headers: Authorization: Bearer <access_token_global>           │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Response:                                                      │
│  - accessToken (con tenantId + role)                            │
│  - user: {id, email, name, role, tenantId, contactId}           │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  GET /api/v1/orders (u otro endpoint protegido)                 │
│  Headers:                                                       │
│  - Authorization: Bearer <access_token_con_tenant>              │
│  - x-api-key: <tenant_api_key>                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Referencias

- **Schema de Prisma:** `backend/prisma/schema.prisma`
- **AuthService:** `backend/src/auth/auth.service.ts`
- **UsersService:** `backend/src/users/services/users.service.ts`
- **UserTenantAccess:** `backend/src/users/services/user-tenant-access.service.ts`
- **Tests:** `backend/scripts/test-auth-flow.sh`

---

*Documento creado: 2026-06-21*  
*Estado: Implementado y testeado ✅*
