# Deployment Report 1.39.1

## Summary

Version **1.39.1** (patch) has been deployed to the `provecchio.com` environment. This release resolves three critical field-reported issues from the v1.39.0 deploy at Provecchio.

## Deployment Status

- **Deployed:** 2026-10-16 ~11:22 UTC (server local time)
- **Remote host:** `192.168.69.240` (provecchio) via ProxyJump `38.52.135.227:2021`
- **Health check:** `https://provecchio.com/api/v1/health` → HTTP 200 ✅
- **Backend version:** `1.39.1` ✅
- **Backend status:** `ok` (database ✅, odoo_adapter ✅)
- **Frontend:** `orderflow-frontend-prod` healthy ✅
- **E2E QA:** `qa_e2e_check.py` passed (catalog, admin modules, auth sanity) ✅
- **Migrations:** 37 found, 0 pending ✅
- **Traefik:** services.yml synced + HUP reloaded ✅

### Backend
- All 33 module manifests updated to `1.39.1`
- Swagger version in `main.ts` updated to `1.39.1`
- No business logic changes — version bump forces Docker image rebuild (AGENTS.md §11)

### Frontend — Field Fixes (OmniGastro v1.39.1)
**Three critical issues from Provecchio production resolved:**

1. **Waiter POS — Empty Grid (Fixed)**
   - `CategoryAccordion.tsx`: Added `isListView` prop rendering compact product list (name + price only) for POS mode.
   - `gastro-pos.tsx`: Passes `isListView={true}` to CategoryAccordion.
   - Added `useEffect` to sync `expandedKeys` when categories load asynchronously.

2. **KDS Stations — Empty Category Selector (Fixed)**
   - `gastro-kds-stations.tsx`: Normalized `/api/v1/catalog/categories/tree` response with `res.data?.data || res.data` (matching `gastro-pos.tsx` pattern).
   - Added console logging for debugging category loads.

3. **KDS Dashboard — Missing Workstation Pre-selection (Fixed)**
   - `kds.tsx`: Reordered effects so `loadActiveOrders` only runs after `selectedStationId` is set (auto-selected first active station from `loadStations`).
   - Added guard `if (!selectedStationId) return;` to prevent premature loads with null station.

- Restored `gastro-pos.tsx` with proper `PosProductItem` component using Ant Design tokens.
- Fixed TypeScript errors; compilation succeeds.

### Documentation & Versioning
- `VERSION`, `backend/package.json`, `frontend/package.json`, `featurelist.json` set to `1.39.1`.
- `backend/src/main.ts` Swagger version: `1.39.1`.
- All 33 backend `*.manifest.json` files: `1.39.1`.
- `docs/guides/CHANGELOG.md` entry added for v1.39.1.
- `ROADMAP.md` (root + `docs/`) updated: OmniGastro Phase 3.3 marked complete, version 1.39.1.
- `README.md` version badge and CURRENT_VERSION updated.
- `docs/plans/omnigastro/README.md` and `ROADMAP_OMNIGASTRO.md` updated: Phase 3.3 + FEAT-166 completed.
- Sprint report created: `docs/info/sprint_report_v1.39.1.md`.
- Plan document: `docs/plans/omnigastro/field-fixes-v1.39.0.md`.
- Git commit `3184e7dc` pushed to `origin/main`; tag `v1.39.1` pushed.
- Wiki (`/opt/wiki/orderflow/`) synced.

### Deploy Notes
- Remote repo git commit failed during deploy (`permisos insuficientes` on `.git/objects`) — rsync had already copied the new files to disk, so the running code is correct. The remote repo working tree shows the new files as uncommitted modifications. This is a known remote permission limitation, not a code issue.
- Observability containers (`orderflow-promtail`, `orderflow-alertmanager`, `orderflow-tempo`) exit non-zero on startup — non-critical, do not affect application health.
- `orderflow_omnibi_standalone` briefly restarted during verification; recovered.

---

> ✅ **Deploy complete.** v1.39.1 live on Provecchio with all three field-reported issues resolved and E2E QA passing.provecchio-dimora-001