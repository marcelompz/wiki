# Deploy Report for v1.39.28 (2026-10-22)

## Summary

Deployment of version 1.39.28 to production completed successfully.

## Production Status

- **Health Endpoint**: `https://provecchio.com/api/v1/health` → **HTTP 200**
- **Version**: `1.39.28`
- **Timestamp**: `2026-10-22T13:26:34.072Z`
- **Services**: database `ok`, odoo_adapter `ok`

## Endpoint Verification

- `/api/v1/positions` → HTTP 403 (expected without API key; route is guarded by `ApiKeyGuard` + `PermissionsGuard`)
- `/api/v1/hr/employees` → HTTP 403 (expected without API key; route is guarded by `ApiKeyGuard` + `PermissionsGuard`)

## Deployment Details

- Remote deploy completed via `./scripts/deploy-production.sh provecchio`
- Backend, frontend, odoo adapter, sync/omnibi standalones, database, and redis are running
- Production commit on server: `67179bf3 deploy: sync local changes 20261022_094853`
- Production VERSION: `1.39.28`

## Conclusion

v1.39.28 is live and healthy in production. The 403 responses on protected endpoints are expected without credentials.
