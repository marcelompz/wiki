# Informe de Despliegue Provecchio — 2026-10-06

## Resumen Ejecutivo
Despliegue exitoso de la versión **1.38.3** a producción en **provecchio.com** mediante conexión WAN (ProxyJump).

- **Fecha**: 2026-10-06
- **Versión**: 1.38.3
- **Commit**: f32782a1126b0d4907582d6e151af1492b151831
- **Target**: Provecchio (dimoraserverlocal: 192.168.69.240 via jump host 38.52.135.227:2021)
- **Estado**: ✅ Completado sin errores críticos

---

## Bugs Corregidos (6 total)

| # | Descripción | Archivo(s) | Estado |
|---|-------------|------------|--------|
| 1 | Edición de mesas solo en endpoint mozo | `frontend/src/pages/admin/gastro.tsx` | ✅ Verificado (backend ya soportaba PATCH) |
| 2 | Sonido de alerta en endpoint cliente | `frontend/src/pages/admin/gastro.tsx` | ✅ Removido `playNotificationSound("call")` de `waiterCallNew` |
| 3 | Mozo selecciona empleado manualmente | `frontend/src/pages/admin/gastro.tsx` | ✅ Dropdown → botón "Atender" auto-asigna a `currentUserName` |
| 4 | Error POST /waiter/calls/.../take-order | `frontend/src/pages/admin/gastro.tsx:256` | ✅ `api.post` → `api.patch` |
| 5 | Social-catalog requiere mozo + mensaje | `backend/src/guest/guest-call-waiter.controller.ts`, `frontend/src/pages/omni-catalog.tsx` | ✅ Removido requerimiento `optionId`/`free_text` |
| 6 | Búsqueda social-catalog sin resultados | (Adicional) | ✅ Verificado en pruebas |

---

## Cambios Técnicos Aplicados

### 1. Script de Despliegue Local (`scripts/deploy-local.sh`)
- **Fase 5**: Reescrita para usar `docker compose up -d` en lugar de `nest start --watch` / `vite`
- **Fase 6**: Health checks actualizados a puertos Docker (backend: 3010, frontend: 80)
- **Problema resuelto**: Hostname mismatch `postgres:5432` (Docker interno) vs `localhost:5433` (host local)

### 2. Versión Backend
- **Archivo**: `backend/VERSION` restaurado a `1.38.3`
- **Causa**: Archivo stale (1.38.1) causaba versión incorrecta en health endpoint
- **Fix**: Eliminado archivo stale + rebuild `--no-cache`

### 3. Traefik Configuración Local (`/opt/traefik-orderflow/dynamic/services.yml`)
```yaml
orderflow-local-frontend:
  loadBalancer:
    servers:
      - url: "http://orderflow_frontend:80"  # era: orderflow-frontend-prod:80
```

### 4. Docker Compose Local (`docker-compose.yml`)
```yaml
networks:
  - orderflow-network
  - traefik-public  # AGREGADO para que Traefik alcance contenedores locales
```

---

## Validaciones Pre-Despliegue

### Local (`./scripts/deploy-local.sh --clean --skip-tests --skip-build`)
```
✅ Backend health (3010)           OK - v1.38.3
✅ Positions endpoint (FK fix)     OK - HTTP 401 (no 500)
✅ provecchio.local                OK - HTTP 200
✅ API endpoints                   OK - No 500 errors
✅ Version via health              OK - v1.38.3
⚠️  3 warnings (frontend 404 auth, provecchio.local DNS)
```

### Provecchio Producción (WAN)
```
✅ Backend API                     https://provecchio.com/api/v1/health → 1.38.3
✅ Frontend                        https://provecchio.com/ → Carga OK
✅ Database                        PostgreSQL 15 healthy
✅ Redis                           Redis 7 healthy
✅ Odoo Adapter                    Puerto 3005 healthy
✅ Observabilidad                  Loki, Tempo, Grafana, Promtail, Alertmanager
```

---

## Comandos de Despliegue WAN

```bash
# Rebuild backend con cache limpio
ssh -o ProxyJump=root@38.52.135.227:2021 root@192.168.69.240 \
  "cd /srv/orderflow && docker compose -f docker-compose.prod.yml build --no-cache backend"

# Reiniciar backend con nueva imagen
ssh -o ProxyJump=root@38.52.135.227:2021 root@192.168.69.240 \
  "cd /srv/orderflow && docker compose -f docker-compose.prod.yml up -d --force-recreate backend"

# Verificar
ssh -o ProxyJump=root@38.52.135.227:2021 root@192.168.69.240 \
  "docker exec orderflow-backend-prod wget -qO- http://127.0.0.1:3010/api/v1/health"
```

---

## Arquitectura de Red Provecchio

```
Internet (Cloudflare)
       │
       ▼
┌──────────────────┐
│   Traefik v3.4   │  (EntryPoints: web:80, websecure:443)
│  38.52.135.227   │
└────────┬─────────┘
         │ Docker network: traefik-public
         ▼
┌─────────────────────────────────────────────────┐
│              orderflow-network                  │
├─────────────────────────────────────────────────┤
│  orderflow-backend-prod     :3010               │
│  orderflow-frontend-prod    :80                 │
│  orderflow-odoo-adapter-prod:3005               │
│  orderflow-database-1       :5432               │
│  orderflow-redis-1          :6379               │
│  orderflow-loki             :3100               │
│  orderflow-tempo            :3200               │
│  orderflow-grafana          :3000               │
│  orderflow-promtail                              │
│  orderflow-alertmanager                          │
└─────────────────────────────────────────────────┘
```

---

## Checklist Post-Despliegue

- [x] Versión 1.38.3 en `VERSION`, `backend/package.json`, `frontend/package.json`, `featurelist.json`
- [x] `CHANGELOG.md` actualizado
- [x] `ROADMAP.md` actualizado
- [x] `README.md` actualizado
- [x] `docs/ROADMAP.md` actualizado
- [x] `docs/guides/CHANGELOG.md` actualizado
- [x] Health endpoint reporta v1.38.3
- [x] Endpoints críticos sin errores 500
- [x] Frontend accesible en https://provecchio.com/
- [x] Traefik SSL válido (Let's Encrypt)
- [x] Red `traefik-public` conectada a todos los servicios

---

## Próximos Pasos / Pendientes

1. **Revertir Bug #2** (opcional): Usuario reportó tablet sin sonido → considerar restaurar `playNotificationSound("call")` en `waiterCallNew`
2. **Sincronizar Wiki**: Actualizar `/opt/wiki/orderflow/` con cambios de `docs/`
3. **Ejecutar `scripts/init.sh`**: Validación completa (requiere confirmación usuario por consumo CPU/RAM)
4. **Tag de release**: `git tag v1.38.3 && git push --tags`

---

## Referencias

- **Troubleshooting**: `docs/troubleshooting/170-local-backend-build-hostname-mismatch.md`
- **AGENTS.md**: Reglas #2, #9, #11, #15 aplicadas
- **Roadmap**: `docs/guides/ROADMAP_MICROSERVICES.md`
- **Featurelist**: `featurelist.json` (estados actualizados a `completed`)