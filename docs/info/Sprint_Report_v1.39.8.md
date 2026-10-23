# Sprint Report — v1.39.8: Localhost Restoration & OmniGastro POS Fixes

**Fecha:** 2026-10-18  
**Versión objetivo:** 1.39.8 (patch — fix dentro de vertical OmniGastro existente)  
**Entorno:** localhost `provecchio.local`  
**Branch:** `feat/gastro-localhost-restoration-v1398` (sugerido)

---

## Resumen Ejecutivo

Este sprint resolvió la restauración completa de datos de producción a localhost y corrigió bugs críticos en el flujo OmniGastro (POS, WebSocket, backups). Todos los endpoints y flujos críticos están operativos en `https://provecchio.local`.

---

## ✅ Completados

### 1. Infraestructura & Conectividad
| Item | Archivo | Descripción |
|------|---------|-------------|
| Docker network | `docker network connect orderflow-network orderflow_db` | Conectar DB a red compartida |
| Docker network | `docker network connect orderflow-network orderflow_omnisync_redis` | Conectar Redis a red compartida |
| DATABASE_URL | `.env`, `backend/.env` | `postgresql://orderflow:...@orderflow_db:5432/orderflow_db` |
| REDIS_URL | `.env`, `backend/.env` | `redis://:dajV4HxcK4C4WinkGxvVssWQ@orderflow_omnisync_redis:6379` |

### 2. Traefik Routing (docs/troubleshooting/#175, #176)
| Router | Archivo | Fix |
|--------|---------|-----|
| `api-provecchio-local` | `traefik/dynamic/provecchio-router.yml` | Paréntesis en regla: `(Host(...) \|\| HostRegexp(...)) && PathPrefix(/api)` |
| `ws-provecchio-local` | `traefik/dynamic/provecchio-router.yml` | Nuevo router `PathPrefix(/socket.io)` priority 200 |

### 3. OmniGastro POS — "Cargar Pedido" (docs/troubleshooting/#177)
| Componente | Archivo | Fix |
|------------|---------|-----|
| Frontend modal | `frontend/src/pages/admin/gastro.tsx` | Botón "Crear Nuevo Pedido para esta Mesa" cuando no hay pedidos |
| Backend create | `backend/src/orders/orders.service.ts` | Guardar `tableId` en `tx.order.create()` |
| Backend updateItems | `backend/src/orders/orders.service.ts` | Nuevo método `updateItems()` unificado (guest + regular) |
| Backend controller | `backend/src/orders/orders.controller.ts` | Usar `updateItems()` service |
| Frontend POS | `frontend/src/pages/admin/gastro-pos.tsx` | Fallback: `/api/v1/guest/orders/:id` → `/api/v1/orders/:id` |

### 4. Backups — Página Dedicada
| Item | Archivo | Descripción |
|------|---------|-------------|
| Nueva página | `frontend/src/pages/admin/backups.tsx` | UI completa: config SFTP, lista remota, trigger, restore, delete |
| Routing | `AdminApp.tsx` | `/admin/backups` lazy-loaded |
| Sidebar | `components/Sidebar.tsx` | Link "Copias de Seguridad (SFTP)" 💾 con `moduleId: 'backups'` |

### 5. Troubleshooting Documentado
- **#175** Traefik router precedence (API vs frontend)
- **#176** WebSocket socket.io routing
- **#177** Gastro POS load orders / create new order

---

## 🔄 Flujo Validado End-to-End

```bash
# 1. Login
curl -X POST https://provecchio.local/api/v1/auth/login -d '{"email":"marcelo@pesallaccia.com","password":"Provecchio2026!"}'
# → JWT válido, tenant provecchio-dimora-001

# 2. Biolink público
curl -sk https://provecchio.local/bio/dimora
# → HTML frontend (React Router maneja /bio/:slug)

# 3. Biolink API
curl -sk https://provecchio.local/api/v1/bio/dimora
# → JSON con blocks (Menú digital, WhatsApp, IG, FB)

# 4. Social Catalog
curl -sk https://provecchio.local/social-catalog/menudigital
# → HTML frontend

# 5. Gastro Dashboard
# → /admin/gastro carga mesas, pedidos, llamadas

# 6. Cargar Pedido → Crear Nuevo → POS
# → POST /api/v1/orders {tableId, channel: 'pos', lines: []}
# → navigate /admin/gastro/pos/{tableId}
# → GET /api/v1/orders/{id} (fallback OK)
# → PATCH /api/v1/orders/{id}/items {lines: [...]}
# → Envío a cocina, cierre, split billing
```

---

## 🧪 Tests Requeridos (Pre-Deploy)

| Test | Comando | Estado |
|------|---------|--------|
| Unit tests | `npm run test` (backend) | Pendiente |
| Build backend | `npm run build` | Pendiente |
| Build frontend | `npm run build` | Pendiente |
| E2E Playwright | `npx playwright test` | Pendiente |
| Health check | `curl https://provecchio.local/api/v1/health` | ✅ OK |
| Login | `curl POST /api/v1/auth/login` | ✅ OK |
| Biolink API | `curl GET /api/v1/bio/dimora` | ✅ OK |
| Gastro POS create | `curl POST /api/v1/orders` | ✅ OK |
| Gastro POS update | `curl PATCH /api/v1/orders/{id}/items` | ✅ OK |

---

## 📋 Pendientes para v1.39.8 Release

- [ ] Ejecutar `./scripts/init.sh` (requiere confirmación usuario — alto consumo CPU/RAM)
- [ ] Incrementar versión: `VERSION` → `1.39.8`, `backend/package.json`, `frontend/package.json`, `featurelist.json`
- [ ] Actualizar `CHANGELOG.md` con entrada v1.39.8
- [ ] Actualizar `ROADMAP.md`, `docs/timeline.md`, `README.md`
- [ ] Sincronizar docs con Wiki: `/opt/wiki/orderflow/`
- [ ] Sincronizar Traefik docs: `/opt/traefik-orderflow/`
- [ ] Deploy local: `./scripts/deploy-local.sh`
- [ ] Validar backup SFTP desde `/admin/backups` (trigger manual → verify SFTP upload → test restore)
- [ ] Tag release: `git tag v1.39.8 && git push --tags`

---

## 📦 Archivos Modificados (Resumen)

### Backend
- `backend/src/orders/orders.service.ts` — `tableId` en create + `updateItems()`
- `backend/src/orders/orders.controller.ts` — endpoint unificado

### Frontend
- `frontend/src/pages/admin/gastro.tsx` — modal "Crear Nuevo Pedido"
- `frontend/src/pages/admin/gastro-pos.tsx` — fallback endpoint
- `frontend/src/pages/admin/backups.tsx` — **NUEVO** página dedicada
- `frontend/src/AdminApp.tsx` — import + route `/admin/backups`
- `frontend/src/components/Sidebar.tsx` — link backups

### Infra/Traefik
- `traefik/dynamic/provecchio-router.yml` — API precedence + WS router

### Config
- `.env` — DATABASE_URL, REDIS_URL
- `backend/.env` — DATABASE_URL, REDIS_URL

### Docs
- `docs/troubleshooting/175-traefik-router-rule-precedence-api-vs-frontend.md`
- `docs/troubleshooting/176-websocket-socketio-traefik-routing-fix.md`
- `docs/troubleshooting/177-gastro-pos-load-orders-create-new-order-fix.md`
- `AGENTS.md` — §3.1.1 punto 7: validar SFTP backup/restore

---

## ⚠️ Riesgos / Notas

1. **Redis ETIMEDOUT en logs** — `AnalyticsCacheService` intenta conectar cada 12s; no bloquea app principal. Revisar si `ENABLE_REDIS_WS=true` es necesario para este tenant.
2. **Odoo Adapter** — Health check muestra timeout (esperado si Odoo no corriendo en localhost).
3. **Backup SFTP** — Configurar credenciales en `/admin/backups` antes de testear restore automatizado.
4. **Versión** — Patch (1.39.7 → 1.39.8) por fixes dentro de vertical OmniGastro existente.

---

## ✅ Checklist Release v1.39.8

- [ ] `./scripts/init.sh` pasa
- [ ] Versión 1.39.8 en todos los archivos
- [ ] CHANGELOG.md actualizado
- [ ] Wiki sincronizada
- [ ] Tag `v1.39.8` pusheado
- [ ] Deploy local validado
- [ ] SFTP backup/restore testeado