# OrderFlow Session Configuration - Deploy Summary

**Date:** 2026-07-06  
**Feature:** Per-tenant JWT session duration configuration  
**Status:** ✅ Ready to Deploy

---

## Server Information

**Hetzner Cloud VPS**
- **IP:** `178.105.226.175`
- **SSH:** `ssh root@178.105.226.175`
- **Environments:** Staging + Production (same server, different ports)

---

## Environment Configuration

### Staging
- **URL:** `http://staging.provecchio.com`
- **DB Port:** 5433
- **Backend Port:** 3012
- **Frontend Port:** 3013
- **Session Duration:** `1h` access / `30d` refresh
- **Env File:** `/opt/orderflow/.env.staging`

### Production
- **URL:** `https://provecchio.com`
- **DB Port:** 5432
- **Backend Port:** 3010
- **Frontend:** nginx (80/443 → 8080)
- **Session Duration:** `8h` access / `90d` refresh
- **Env File:** `/opt/orderflow/.env.production`

---

## Deploy Commands (Copy & Paste)

### Option 1: Automated Script

```bash
# SSH to server
ssh root@178.105.226.175

# Run migration script
cd /opt/orderflow
bash scripts/apply-session-config-migration.sh
```

### Option 2: Manual Steps

```bash
# SSH to server
ssh root@178.105.226.175
cd /opt/orderflow

# Apply migration to staging
docker compose -f docker-compose.yml exec backend npx prisma migrate deploy

# Apply migration to production
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Update .env.staging
echo -e "\n# JWT Session Config (2026-07-06)\nJWT_EXPIRES_IN=1h\nJWT_REFRESH_EXPIRES_IN=30d" >> .env.staging

# Update .env.production
echo -e "\n# JWT Session Config (2026-07-06)\nJWT_EXPIRES_IN=8h\nJWT_REFRESH_EXPIRES_IN=90d" >> .env.production

# Restart services
docker compose -f docker-compose.yml restart backend
docker compose -f docker-compose.prod.yml restart backend

# Verify health
curl http://localhost:3012/api/v1/health  # Staging
curl http://localhost:3010/api/v1/health  # Production
```

---

## Post-Deploy Verification

### Test Login (Staging)

```bash
curl -X POST http://localhost:3012/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@staging.com", "password": "Test123!"}' | jq
```

**Expected:**
```json
{
  "expiresIn": "1h",
  "refreshExpiresIn": "30d",
  ...
}
```

### Test Login (Production)

```bash
curl -X POST https://provecchio.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "marcelo@pesallaccia.com", "password": "SuperAdmin123!"}' | jq
```

**Expected:**
```json
{
  "expiresIn": "8h",
  "refreshExpiresIn": "90d",
  ...
}
```

---

## Files Modified

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Added `sessionConfig` field |
| `prisma/migrations/.../migration.sql` | Database migration |
| `src/auth/auth.service.ts` | Session config logic |
| `src/auth/auth.controller.ts` | API endpoints |
| `src/auth/dto/update-session-config.dto.ts` | DTO validation |
| `backend/.env` | Local defaults (1h/30d) |
| `.env.staging` | Staging config (1h/30d) |
| `.env.production` | Production config (8h/90d) |
| `test/utils/mocks.ts` | Test mocks updated |

---

## API Endpoints

### Get Session Config
```bash
GET /api/v1/auth/session-config
Authorization: Bearer <token>
```

### Update Session Config (ADMIN/OWNER only)
```bash
PUT /api/v1/auth/session-config
Authorization: Bearer <token>
Content-Type: application/json

{
  "accessTokenExpiresIn": "2h",
  "refreshTokenExpiresIn": "60d"
}
```

---

## Documentation

- [`SESSION_CONFIG_BY_TENANT.md`](./SESSION_CONFIG_BY_TENANT.md) - Full feature documentation
- [`DEPLOY_SESSION_CONFIG.md`](./DEPLOY_SESSION_CONFIG.md) - Detailed deployment guide
- [`SESSION_CONFIG_IMPLEMENTATION_SUMMARY.md`](./SESSION_CONFIG_IMPLEMENTATION_SUMMARY.md) - Technical summary

---

## Rollback

If needed:

```bash
ssh root@178.105.226.175
cd /opt/orderflow

# Revert migration
docker compose -f docker-compose.yml exec backend npx prisma migrate revert
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate revert

# Restart services
docker compose -f docker-compose.yml restart backend
docker compose -f docker-compose.prod.yml restart backend
```

---

## Next Steps

1. ✅ Deploy to server
2. ✅ Test staging login
3. ✅ Test production login
4. ⏳ Update frontend to show session duration
5. ⏳ Add UI in Super Admin Dashboard for tenant configuration
