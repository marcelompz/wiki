# OrderFlow Session Config - Deployment Guide

**Date:** 2026-07-06  
**Feature:** Per-tenant JWT session duration configuration

---

## Quick Deploy (Recommended)

### Step 1: SSH to Hetzner Server

```bash
ssh root@178.105.226.175
```

### Step 2: Run Migration Script

```bash
cd /opt/orderflow
bash scripts/apply-session-config-migration.sh
```

### Step 3: Verify Deployment

**Staging:**
```bash
curl http://localhost:3012/api/v1/health
curl http://localhost:3012/api/v1/auth/session-config
```

**Production:**
```bash
curl http://localhost:3010/api/v1/health
curl http://localhost:3010/api/v1/auth/session-config
```

---

## Manual Deploy (Alternative)

### 1. Apply Database Migration

**Staging:**
```bash
cd /opt/orderflow
docker compose -f docker-compose.yml exec backend npx prisma migrate deploy
```

**Production:**
```bash
cd /opt/orderflow
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

### 2. Update Environment Variables

**Staging (`.env.staging`):**
```bash
nano /opt/orderflow/.env.staging

# Add at the end:
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=30d
```

**Production (`.env.production`):**
```bash
nano /opt/orderflow/.env.production

# Add at the end:
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=90d
```

### 3. Restart Backend Services

**Staging:**
```bash
docker compose -f docker-compose.yml restart backend
```

**Production:**
```bash
docker compose -f docker-compose.prod.yml restart backend
```

### 4. Verify Health

```bash
# Staging
curl http://localhost:3012/api/v1/health

# Production
curl http://localhost:3010/api/v1/health
```

---

## Post-Deployment Testing

### 1. Test Login (Staging)

```bash
curl -X POST http://localhost:3012/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@staging.com",
    "password": "Test123!"
  }' | jq
```

**Expected Response:**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": "1h",
  "refreshExpiresIn": "30d",
  "user": { ... },
  "tenants": [ ... ]
}
```

### 2. Test Session Config Endpoint

```bash
# Get token from login response
TOKEN="eyJhbGc..."

# Get session config
curl -X GET http://localhost:3012/api/v1/auth/session-config \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected Response:**
```json
{
  "accessTokenExpiresIn": "1h",
  "refreshTokenExpiresIn": "30d",
  "isCustomized": false
}
```

### 3. Test Update Session Config (ADMIN only)

```bash
curl -X PUT http://localhost:3012/api/v1/auth/session-config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accessTokenExpiresIn": "2h",
    "refreshTokenExpiresIn": "60d"
  }' | jq
```

**Expected Response:**
```json
{
  "success": true,
  "config": {
    "accessTokenExpiresIn": "2h",
    "refreshTokenExpiresIn": "60d"
  },
  "message": "Session configuration updated successfully..."
}
```

---

## Rollback Procedure

If something goes wrong, rollback with:

### 1. Revert Database Change

```bash
cd /opt/orderflow

# Staging
docker compose -f docker-compose.yml exec backend npx prisma migrate revert

# Production
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate revert
```

### 2. Restore Old Environment Variables

**Staging:**
```bash
nano /opt/orderflow/.env.staging
# Remove JWT_EXPIRES_IN and JWT_REFRESH_EXPIRES_IN lines
```

**Production:**
```bash
nano /opt/orderflow/.env.production
# Remove JWT_EXPIRES_IN and JWT_REFRESH_EXPIRES_IN lines
```

### 3. Restart Services

```bash
docker compose -f docker-compose.yml restart backend
docker compose -f docker-compose.prod.yml restart backend
```

---

## Troubleshooting

### Migration Fails

**Error:** `Can't connect to database`

**Solution:**
```bash
# Check if database is running
docker compose -f docker-compose.yml ps
docker compose -f docker-compose.prod.yml ps

# Restart database if needed
docker compose -f docker-compose.yml restart db
docker compose -f docker-compose.prod.yml restart db
```

### Backend Doesn't Start

**Error:** `Container exited with code 1`

**Solution:**
```bash
# Check logs
docker compose -f docker-compose.yml logs backend
docker compose -f docker-compose.prod.yml logs backend

# Rebuild if needed
docker compose -f docker-compose.yml build backend
docker compose -f docker-compose.prod.yml build backend
```

### Session Config Not Applied

**Check:**
```bash
# Verify migration was applied
docker compose -f docker-compose.yml exec backend npx prisma migrate status
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate status

# Check tenant table has sessionConfig column
docker compose -f docker-compose.yml exec db psql -U orderflow -d orderflow_db -c "\d tenants"
```

---

## Deployment Checklist

- [ ] SSH to server (178.105.226.175)
- [ ] Run migration script
- [ ] Verify staging health
- [ ] Verify production health
- [ ] Test login on staging
- [ ] Test session config endpoint
- [ ] Update frontend to show session duration
- [ ] Document in changelog

---

## Contact

If you encounter issues during deployment:
- Check logs: `docker compose logs backend`
- Review migration: `/opt/orderflow/docs/SESSION_CONFIG_BY_TENANT.md`
- Rollback if needed (see procedure above)
