# OrderFlow Session Configuration - Deployment Report

**Date:** 2026-07-06  
**Status:** ✅ **STAGING DEPLOYED** | ⏳ **PRODUCTION PENDING**

---

## Deployment Summary

### ✅ **Staging Environment** - DEPLOYED

**Server:** Hetzner VPS (`178.105.226.175`)  
**Directory:** `/srv/orderflow-staging`  
**URL:** `http://staging.provecchio.com`

**Changes Applied:**
1. ✅ Moved from `/srv/orderflow` to `/srv/orderflow-staging`
2. ✅ Applied database migration (`sessionConfig` column added to `tenants` table)
3. ✅ Backend restarted and healthy
4. ✅ JWT configuration verified (1h / 30d)

**Health Check:**
```bash
curl http://localhost:3010/api/v1/health
# Response: {"status":"ok","services":{"database":{"status":"ok"},"odoo_adapter":{"status":"ok"}}}
```

---

### ⏳ **Production Environment** - PENDING MANUAL DEPLOY

**Server:** dimoraserver1 (`38.52.135.227`)  
**Directory:** `/opt/orderflow`  
**URL:** `https://provecchio.com`

**Script Created:** `/opt/orderflow/scripts/deploy-session-config-production.sh`

**To deploy, run on production server:**
```bash
ssh root@dimoraserver1
cd /opt/orderflow
bash scripts/deploy-session-config-production.sh
```

**OR manually:**
```bash
# 1. Apply migration
docker compose -f docker-compose.prod.yml exec postgres psql -U orderflow -d orderflow_db \
  -c "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS \"sessionConfig\" JSONB;"

# 2. Update .env.production
echo -e "\n# JWT Session Config\nJWT_EXPIRES_IN=8h\nJWT_REFRESH_EXPIRES_IN=90d" >> .env.production

# 3. Restart backend
docker compose -f docker-compose.prod.yml restart backend

# 4. Verify
curl https://provecchio.com/api/v1/health
```

---

## Configuration Summary

| Environment | Access Token | Refresh Token | Status |
|-------------|--------------|---------------|--------|
| **Local** | 1h | 30d | ✅ Configured |
| **Staging** | 1h | 30d | ✅ **DEPLOYED** |
| **Production** | 8h | 90d | ⏳ **PENDING** |

---

## Files Modified

### Local Repository
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added `sessionConfig` field |
| `prisma/migrations/.../migration.sql` | Created migration |
| `src/auth/auth.service.ts` | Session config logic |
| `src/auth/auth.controller.ts` | API endpoints |
| `src/auth/dto/update-session-config.dto.ts` | DTO validation |
| `backend/.env` | Defaults (1h/30d) |
| `.env.staging` | Staging config |
| `.env.production` | Production config (8h/90d) |
| `test/utils/mocks.ts` | Test mocks |
| `.github/workflows/test-staging.yml` | Fixed SSH issue |

### Server Files
| Path | Status |
|------|--------|
| `/srv/orderflow-staging/` | ✅ Staging deployed here |
| `/srv/orderflow-staging/docker-compose.yml` | ✅ Updated paths |
| `/srv/orderflow-staging/.env.staging` | ✅ JWT config added |
| `/opt/orderflow/scripts/deploy-session-config-production.sh` | ✅ Production script ready |

---

## API Endpoints

### Get Session Configuration
```bash
GET /api/v1/auth/session-config
Authorization: Bearer <token>
```

**Response:**
```json
{
  "accessTokenExpiresIn": "1h",
  "refreshTokenExpiresIn": "30d",
  "isCustomized": false
}
```

### Update Session Configuration (ADMIN/OWNER only)
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

## Next Steps

1. ✅ **Staging Deployed** - Test session duration
2. ⏳ **Production Deploy** - Run script on dimoraserver1
3. ⏳ **Frontend Update** - Show session duration to users
4. ⏳ **UI Dashboard** - Allow tenants to configure via Super Admin

---

## Documentation

- [`SESSION_CONFIG_BY_TENANT.md`](./SESSION_CONFIG_BY_TENANT.md) - Feature documentation
- [`DEPLOY_SESSION_CONFIG.md`](./DEPLOY_SESSION_CONFIG.md) - Deployment guide
- [`DEPLOY_SUMMARY_SESSION_CONFIG.md`](./DEPLOY_SUMMARY_SESSION_CONFIG.md) - Quick reference

---

**Deployment completed by:** Qwen Code  
**Date:** 2026-07-06  
**Time:** 18:03 ART
