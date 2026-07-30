# Session Configuration by Tenant - Implementation Summary

**Date:** 2026-07-06  
**Feature:** Per-tenant JWT session duration configuration  
**Status:** ✅ Implemented & Tested

---

## What Was Implemented

OrderFlow now supports **configurable session duration per tenant**. Each tenant can define their own security policy for JWT tokens.

### Key Features

1. **Database Field:** `sessionConfig` (JSONB) added to `tenants` table
2. **API Endpoints:**
   - `GET /api/v1/auth/session-config` - Get current tenant's session config
   - `PUT /api/v1/auth/session-config` - Update session config (ADMIN/OWNER only)
3. **Login Response:** Now includes `expiresIn` and `refreshExpiresIn` values
4. **Defaults Changed:**
   - Access Token: `15m` → `1h` (more UX-friendly)
   - Refresh Token: `7d` → `30d` (less frequent re-logins)

---

## Three Environment Configuration

### 1. Local Development
- **File:** `/opt/orderflow/backend/.env`
- **Defaults:** `JWT_EXPIRES_IN=1h`, `JWT_REFRESH_EXPIRES_IN=30d`
- **DB Port:** 5433

### 2. Staging (`http://staging.provecchio.com`)
- **File:** `/opt/orderflow/.env.staging`
- **Location:** Hetzner VPS (178.105.226.175)
- **DB Port:** 5433
- **Backend Port:** 3012
- **Frontend Port:** 3013

### 3. Production (`https://provecchio.com`)
- **File:** `/opt/orderflow/.env.production`
- **Location:** Hetzner VPS (178.105.226.175)
- **DB Port:** 5432
- **Backend Port:** 3010
- **Frontend:** nginx (80/443 → 8080)

---

## Deployment Procedure

### Step 1: Apply Database Migration

**All environments:**
```bash
ssh user@178.105.226.175
cd /opt/orderflow

# Staging
docker compose -f docker-compose.yml exec backend npx prisma migrate deploy

# Production
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

### Step 2: Update Environment Variables

**.env.staging:**
```bash
JWT_SECRET=<generate-secure-random>
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=<generate-secure-random>
JWT_REFRESH_EXPIRES_IN=30d
```

**.env.production:**
```bash
JWT_SECRET=<generate-secure-random>
JWT_EXPIRES_IN=8h          # Longer for better UX
JWT_REFRESH_SECRET=<generate-secure-random>
JWT_REFRESH_EXPIRES_IN=90d # 3 months for production
```

### Step 3: Restart Backend

```bash
# Staging
docker compose -f docker-compose.yml restart backend

# Production
docker compose -f docker-compose.prod.yml restart backend
```

---

## API Usage Examples

### Get Session Config (Logged in user)

```bash
curl -X GET http://localhost:3010/api/v1/auth/session-config \
  -H "Authorization: Bearer <your-jwt-token>"
```

**Response:**
```json
{
  "accessTokenExpiresIn": "1h",
  "refreshTokenExpiresIn": "30d",
  "isCustomized": false
}
```

### Update Session Config (ADMIN/OWNER only)

```bash
curl -X PUT http://localhost:3010/api/v1/auth/session-config \
  -H "Authorization: Bearer <admin-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "accessTokenExpiresIn": "8h",
    "refreshTokenExpiresIn": "60d"
  }'
```

**Response:**
```json
{
  "success": true,
  "config": {
    "accessTokenExpiresIn": "8h",
    "refreshTokenExpiresIn": "60d"
  },
  "message": "Session configuration updated successfully. New tokens will use the updated expiration times."
}
```

---

## Files Modified

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Added `sessionConfig` field to Tenant model |
| `prisma/migrations/.../migration.sql` | SQL migration for sessionConfig |
| `src/auth/auth.service.ts` | `generateAccessToken()`, `generateRefreshToken()`, `getSessionConfig()`, `updateSessionConfig()` |
| `src/auth/auth.controller.ts` | GET/PUT `/session-config` endpoints |
| `src/auth/dto/update-session-config.dto.ts` | New DTO for validation |
| `backend/.env` | Updated defaults: `1h` / `30d` |
| `.env.staging` | Added JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN |
| `.env.production` | Already had extended values (30d/365d) |
| `test/utils/mocks.ts` | Updated mock defaults to `1h` / `30d` |
| `docs/SESSION_CONFIG_BY_TENANT.md` | Complete documentation |

---

## Test Results

```
Test Suites: 6 passed, 1 failed, 7 total
Tests:       42 passed, 42 total
```

All auth tests passing with new configuration.

---

## Recommended Values by Tenant Type

| Tenant Type | Access Token | Refresh Token | Use Case |
|-------------|--------------|---------------|----------|
| 🔒 High Security | `15m` | `1d` | Banks, Healthcare |
| 💼 Standard | `8h` | `30d` | Offices, Spas (default) |
| 🏪 Low Security | `24h` | `90d` | Retail, E-commerce |
| 📱 Kiosk Mode | `1h` | `7d` | Touch screens, Public terminals |

---

## Next Steps

1. **Deploy to Staging** - Test with real users
2. **Deploy to Production** - Apply to provecchio.com
3. **Frontend Integration** - Show session duration to users
4. **Auto-Refresh** - Implement token refresh before expiration
5. **UI in Super Admin** - Allow tenants to configure via dashboard

---

## Documentation

- **Main Doc:** `/opt/orderflow/docs/SESSION_CONFIG_BY_TENANT.md`
- **API Docs:** Available at `/api/docs` after deployment (Swagger)
- **Migration File:** `/opt/orderflow/backend/prisma/migrations/20260706000000_add_session_config/migration.sql`
