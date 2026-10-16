# Deployment Report 1.39.2

## Summary

Version **1.39.2** (patch) has been deployed to the `provecchio.com` environment. This release resolves four field-reported bugs in the OmniGastro vertical (KDS stations independent categories, tables modal sync, order modal load/takeout, and modal responsive theming) plus the backend `orderType` query filter for TAKEOUT orders.

## Deployment Status

- **Deployed:** 2026-10-16 ~15:46 UTC (server local time)
- **Remote host:** `192.168.69.240` (provecchio) via direct IP (local network reachable)
- **Health check:** `https://provecchio.com/api/v1/health` → HTTP 200 ✅
- **Backend version:** `1.39.2` ✅
- **Backend status:** `ok` (database ✅, odoo_adapter ✅)
- **Frontend:** `orderflow-frontend-prod` healthy ✅
- **E2E QA:** `qa_e2e_check.py` passed (catalog, admin modules, auth sanity) ✅
- **Migrations:** 37 found, 0 pending ✅
- **Traefik:** services.yml synced + HUP reloaded ✅

### Backend — Bug Fixes (OmniGastro v1.39.2)

1. **orders.controller.ts** `findAll`: added `orderType` query parameter (7th arg, before `db`).
2. **orders.service.ts** `findAll`: filters `tableId=null` when `orderType=TAKEOUT`.
3. **orders.controller.spec.ts**: updated `findAll` signature expectations (db as 7th controller arg, dbClient as 4th service arg).

### Frontend — Bug Fixes (OmniGastro v1.39.2)

**Four bugs resolved:**

1. **KDS Stations — Independent Category Selectors (Fixed)**
   - `gastro-kds-stations.tsx`: Refactored to independent Selects for parent/leaf/excluded subcategories.
   - Added "Seleccionar todas las hojas de padres" action.
   - Payload now sends `categories: string[]` instead of nested structure.

2. **Tables Modal — Sync & Modal (Fixed)**
   - `gastro.tsx`: Modal width→breakpoints, `bodyStyle` overflowY auto, `scroll={{x:true}}`, `ellipsis:true`.
   - Added missing `useState` declarations for order modal variables.

3. **Order Modal — TAKEOUT Load (Fixed)**
   - `gastro.tsx`: orderType TAKEOUT filtering respected in order modal load.

4. **Modal Responsive — Theme Tokens (Fixed)**
   - `gastro.tsx`: Removed hardcoded colors → `token.colorSuccess/Error/Primary`.
   - Responsive breakpoints instead of fixed widths.

- Fixed TypeScript errors; compilation succeeds.

### Documentation & Versioning

- `VERSION`, `backend/package.json`, `frontend/package.json`, `featurelist.json` set to `1.39.2` (patch bump per AGENTS.md §11 — vertical fix, no new core API endpoints).
- `CHANGELOG.md`, `ROADMAP.md` (root + `docs/`), `docs/timeline.md`, `docs/info/OmniGastro.md` updated.
- `docs/plans/omnigastro/auditoria-v1.39.2-bugs-omnigastro.md` created.
- `docs/plans/omnigastro/plan_actualizacion_1.39.2.md` created.
- 4 E2E Playwright specs added in `frontend/e2e/`:
  - `kds-station-independent-categories.spec.ts`
  - `tables-modal-sync.spec.ts`
  - `order-modal-load-takeout.spec.ts`
  - `modal-responsive.spec.ts`
- Git commit `c61c1cec` pushed to `origin/main`; tag `v1.39.2` pushed.
- Wiki (`/opt/wiki/orderflow/`) synced (this report).

### Deploy Notes

- `docs/info/deployment_report_1.39.0.md` carries pre-existing v1.39.1 deploy notes (left unstaged in this commit — unrelated to v1.39.2).
- Observability containers (`orderflow-promtail`, `orderflow-alertmanager`, `orderflow-tempo`) exit non-zero on startup — non-critical, do not affect application health.

---

> ✅ **Deploy complete.** v1.39.2 live on Provecchio with all four OmniGastro bugs resolved and E2E QA passing.provecchio-dimora-001
