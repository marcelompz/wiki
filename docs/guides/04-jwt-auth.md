# JWT Authentication Guide - OrderFlow

[🏠 Atrás (README)](../README.md) | [🚀 Inicio Rápido](01-quickstart.md) | [🏗️ Arquitectura](02-architecture.md) | [🏢 Multi-Tenant Demo](03-multi-tenant-demo.md) | [🔐 JWT Auth](04-jwt-auth.md) | [📊 Testing Report](05-testing-report.md) | [🏪 POS & KDS](06-pos-kds.md) | [📊 Diagramas UML](07-uml-diagrams.md) | [🎖️ Loyalty Module](08-loyalty.md)

---

## Overview

OrderFlow uses **JWT-based authentication** with an Odoo-style Contact-User relationship model. This provides:

- ✅ **User-level session control** (not just API key)
- ✅ **Multiple simultaneous roles** per contact (customer, supplier, user)
- ✅ **Token expiration** (15min access + 7day refresh)
- ✅ **Automatic token refresh** in mobile app
- ✅ **Contact-User link** (like Odoo's res.partner → res.users)

---

## Architecture

### Backend (NestJS)

```
┌─────────────────────────────────────────────────────────────┐
│                     OrderFlow Backend                        │
│                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌─────────────┐ │
│  │ Auth Module  │────▶│ Users Module │────▶│  Prisma DB  │ │
│  │  (JWT)       │     │  (Contact)   │     │             │ │
│  └──────────────┘     └──────────────┘     └─────────────┘ │
│         │                    │                    │          │
│         ▼                    ▼                    ▼          │
│  /api/v1/auth/login   User ↔ Contact      contact_roles     │
│  /api/v1/auth/refresh  (1:1 optional)     (multi-role)      │
│  /api/v1/auth/logout                                       │
│  /api/v1/auth/me                                           │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

```prisma
// Contact (like Odoo res.partner)
model Contact {
  id           String
  tenantId     String
  type         ContactType  // customer, supplier, user, lead
  email        String?
  name         String
  // ... address fields ...

  user         User?              // 1:1 link to User
  roles        ContactRole[]      // Multiple simultaneous roles
}

// User (like Odoo res.users)
model User {
  id               String
  tenantId         String
  contactId        String?  @unique  // FK to Contact
  email            String
  passwordHash     String
  role             UserRole
  refreshTokenHash String?
  tokenExpiresAt   DateTime?

  contact          Contact?
}

// ContactRole (multiple roles per contact)
model ContactRole {
  id         String
  contactId  String
  tenantId   String
  role       ContactRoleType  // customer, supplier, user, lead
  isPrimary  Boolean
  contact    Contact
}
```

---

## API Endpoints

### 1. Login

```http
POST /api/v1/auth/login
Headers:
  x-api-key: <tenant-api-key>
  Content-Type: application/json

Body:
{
  "email": "user@example.com",
  "password": "secret123"
}

Response (200 OK):
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "15m",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "ADMIN",
    "contactId": "uuid",
    "contact": {
      "id": "uuid",
      "name": "John Doe",
      "email": "user@example.com",
      "phone": "+595 981 123 456",
      "type": "USER"
    }
  }
}
```

### 2. Refresh Token

```http
POST /api/v1/auth/refresh
Headers:
  x-api-key: <tenant-api-key>
  Content-Type: application/json

Body:
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

Response (200 OK):
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "15m"
}
```

### 3. Logout

```http
POST /api/v1/auth/logout
Headers:
  Authorization: Bearer <access-token>
  x-api-key: <tenant-api-key>

Response (200 OK):
{
  "success": true
}
```

### 4. Get Current User

```http
GET /api/v1/auth/me
Headers:
  Authorization: Bearer <access-token>
  x-api-key: <tenant-api-key>

Response (200 OK):
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "ADMIN",
  "tenantId": "uuid",
  "contactId": "uuid"
}
```

---

## Mobile App Integration

### Auth Store (Zustand)

```typescript
// mobile/src/store/authStore.ts

const { login, logout, refreshToken, user, tokens } = useAuthStore();

// Login
await login(email, password);

// Auto refresh (handled by API interceptor)
// API automatically refreshes on 401

// Logout
await logout();
```

### API Client (Axios)

```typescript
// mobile/src/services/api.ts

// Set API key (multi-tenant)
setApiKey(tenant.apiKey);

// Set JWT token (after login)
setAuthToken(tokens.accessToken);

// Automatic refresh on 401
// Interceptor handles token refresh transparently
```

---

## User Roles

### Backend Roles (UserRole enum)

| Role | Permissions |
|------|-------------|
| `ADMIN` | Full access to tenant (users, products, orders, settings) |
| `MANAGER` | Manage products, orders, customers (no user management) |
| `SELLER` | Create orders, view customers (read-only products) |
| `VIEWER` | Read-only access |

### Contact Roles (ContactRoleType enum)

A contact can have **multiple simultaneous roles**:

```typescript
// Example: Contact with multiple roles
{
  id: "contact-123",
  name: "Juan Pérez",
  email: "juan@example.com",
  type: "USER",
  roles: [
    { role: "USER", isPrimary: true },
    { role: "CUSTOMER", isPrimary: false },
    { role: "SUPPLIER", isPrimary: false }
  ]
}
```

This mirrors Odoo's partner model where a single contact can be:
- A customer (makes purchases)
- A supplier (provides products)
- A user (can log into the system)

---

## Migration from API Key Auth

### Step 1: Run Database Migration

```bash
cd /opt/orderflow/backend

# Apply Prisma migration
npx prisma migrate deploy

# Or manually run the SQL migration
psql -U <user> -d <database> -f prisma/migrations/20260620_jwt_auth_contact_user/migration.sql
```

### Step 2: Migrate Existing Users

```bash
# Run migration script
npx ts-node scripts/migrate-users-to-contacts.ts
```

This script:
1. Finds all existing users
2. Creates contacts for users without one
3. Links users to their corresponding contacts
4. Creates USER roles for all contacts

### Step 3: Update Environment Variables

```bash
# Copy .env.example and update
cp .env.example .env

# Required JWT variables:
JWT_SECRET=<min-32-char-secret>
JWT_REFRESH_SECRET=<min-32-char-secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### Step 4: Restart Backend

```bash
npm run build
npm run start:prod
```

---

## Security Considerations

### Token Storage

- **Mobile**: SecureStore (encrypted, iOS Keychain / Android Keystore)
- **Backend**: Refresh token hash in database (bcrypt)

### Token Expiration

| Token Type | Expiration | Can Refresh |
|------------|-----------|-------------|
| Access Token | 15 minutes | Yes (with refresh token) |
| Refresh Token | 7 days | No (must re-login) |

### Best Practices

1. **HTTPS only** in production
2. **Rotate JWT secrets** periodically
3. **Invalidate refresh tokens** on logout
4. **Rate limit** login attempts
5. **Log failed auth** attempts for security audit

---

## Testing

### Create Test User

```bash
# Via API
curl -X POST http://localhost:3010/api/v1/auth/login \
  -H "x-api-key: 067059e2d6ae48d8a5f7c81b85fbf522" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@spa-demo.com",
    "password": "admin123"
  }'
```

### Test Token Refresh

```bash
curl -X POST http://localhost:3010/api/v1/auth/refresh \
  -H "x-api-key: 067059e2d6ae48d8a5f7c81b85fbf522" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refresh-token-from-login>"
  }'
```

---

## Troubleshooting

### "Invalid or expired token"

- Check JWT_SECRET matches between .env and running instance
- Verify system time is synchronized (JWT is time-sensitive)
- Check token hasn't expired (15min for access token)

### "User not found"

- Verify API key is correct for the tenant
- Check user exists in database: `SELECT * FROM users WHERE email = '...'`
- Verify user is active: `UPDATE users SET active = true WHERE id = '...'`

### "Refresh token not found"

- User may have logged out from another device
- Refresh token was invalidated (security)
- Must re-login with credentials

---

## Comparison: Before vs After

| Feature | Before (API Key) | After (JWT) |
|---------|-----------------|-------------|
| Authentication | API key only | API key + JWT |
| Session control | Tenant-level | User-level |
| Token expiration | ❌ None | ✅ 15min + 7day refresh |
| Multi-device | ❌ Same key | ✅ Different tokens |
| Revocation | ❌ All users affected | ✅ Individual tokens |
| Roles | ✅ Basic | ✅ Enhanced with Contact |
| Odoo-style | ❌ No | ✅ Contact-User model |

---

## Files Changed

### Backend

- `/opt/orderflow/backend/prisma/schema.prisma` - Contact-User relationship
- `/opt/orderflow/backend/src/auth/` - New JWT auth module
- `/opt/orderflow/backend/src/contacts/` - Contacts module (Odoo-style)
- `/opt/orderflow/backend/src/users/services/users.service.ts` - Updated for Contact link
- `/opt/orderflow/backend/scripts/migrate-users-to-contacts.ts` - Migration script

### Mobile

- `/opt/orderflow/mobile/src/store/authStore.ts` - JWT support
- `/opt/orderflow/mobile/src/services/api.ts` - Token refresh interceptor
- `/opt/orderflow/mobile/app/(auth)/login.tsx` - New login screen
- `/opt/orderflow/mobile/app/(auth)/tenant-select.tsx` - Redirects to login
- `/opt/orderflow/mobile/app/(tabs)/profile.tsx` - Shows user role

---

## Next Steps

1. ✅ Run database migration
2. ✅ Run user migration script
3. ✅ Test login flow in mobile app
4. ✅ Test automatic token refresh
5. ⏳ Add password reset functionality
6. ⏳ Add user management UI (admin panel)
7. ⏳ Add audit logging for auth events

---

## Ver también

- [Auth Flow](AUTH_FLOW.md)
- [Testing Scripts](TESTING_SCRIPTS.md)
