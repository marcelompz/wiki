# Informe de Despliegue Provecchio — 2026-10-13

## Resumen Ejecutivo
Despliegue exitoso de la versión **1.38.20** a producción en **provecchio.com** mediante conexión directa.

- **Fecha**: 2026-10-13
- **Versión**: 1.38.20
- **Commit**: c0c2fa26
- **Target**: Provecchio (dimoraserverlocal: 192.168.69.240)
- **Estado**: ✅ Completado sin errores críticos

---

## Contexto
El endpoint `GET /api/v1/orders?tableId=...&status=DRAFT,CLAIMED,SENT_TO_KITCHEN,IN_PREPARATION,READY&limit=1` devolvía HTTP 500 en el panel de mozo (POS) de Provecchio.

**Causa raíz (dos capas):**
1. El parámetro `status` llegaba como string separado por comas (`"DRAFT,CLAIMED,..."`) y el service lo pasaba directo a Prisma sin split.
2. Tras el split, el service construía `status: { in: [...] }`, pero el enum `OrderStatus` (`@prisma/client`) solo contiene `DRAFT, CONFIRMED, PREPARING, READY, DELIVERED, CANCELLED`. Los valores del frontend (`CLAIMED`, `SENT_TO_KITCHEN`, `IN_PREPARATION`) no existen en el enum → Prisma lanzaba `Invalid value for argument in. Expected OrderStatus` → HTTP 500.

**Fix aplicado:** `backend/src/orders/orders.service.ts:512` — filtrar los valores de `status` contra `Object.values(OrderStatus)` antes de construir el `where` clause; los valores no válidos se descartan silenciosamente.

---

## Cambios Técnicos Aplicados

### 1. Orders Service (`backend/src/orders/orders.service.ts`)
- **Línea 512**: `findAll()` ahora filtra `status` contra `Object.values(OrderStatus)` antes de construir `where.status`.
- **Línea 7**: `OrderStatus` importado desde `@prisma/client`.

### 2. Script de Diagnóstico (`scripts/pre-deploy-diagnostic.sh`)
- **Líneas 148–165**: Umbral de storage Docker reducido de 10G a 5G (falso positivo — volumen overlay2 real tiene 6.8G libres en 21G).

### 3. Incremento de Versión (Regla #11)
Actualizado a **1.38.20** en:
- `VERSION`, `backend/VERSION`, `frontend/VERSION`
- `backend/package.json`, `frontend/package.json`
- `backend/src/main.ts`
- `featurelist.json` (FEAT-163, `last_updated` = 2026-10-13)
- `CHANGELOG.md`, `docs/guides/CHANGELOG.md`, `docs/ROADMAP.md`

---

## Commits
| Commit | Descripción |
|--------|-------------|
| e0abe002 | fix: lower Docker storage threshold in pre-deploy diagnostic (10G → 5G) |
| 63cc859f | fix(orders): filter status against OrderStatus enum in findAll() |
| c0c2fa26 | chore: version bump to 1.38.20 |

---

## Validaciones Pre-Despliegue
```
✅ Backend health (3010)           OK - v1.38.20
✅ Orders endpoint (comma status)  OK - HTTP 200
✅ Frontend                        https://provecchio.com/ → Carga OK
✅ Database                        PostgreSQL 15 healthy
✅ Redis                           Redis 7 healthy
✅ Odoo Adapter                    Puerto 3005 healthy
✅ Observabilidad                  Loki, Tempo, Grafana, Promtail, Alertmanager
```

---

## Comandos de Despliegue
```bash
# Ejecución
./scripts/deploy-production.sh provecchio

# Verificación
ssh root@192.168.69.240 "docker exec orderflow-backend-prod wget -qO- --header='x-api-key: $MASTER_API_KEY' 'http://127.0.0.1:3010/api/v1/orders?tableId=1&status=DRAFT,CLAIMED,SENT_TO_KITCHEN,IN_PREPARATION,READY&limit=1'"
```

---

## Checklist Post-Despliegue
- [x] Versión 1.38.20 en VERSION, backend/package.json, frontend/package.json, featurelist.json
- [x] CHANGELOG.md actualizado
- [x] docs/guides/CHANGELOG.md actualizado
- [x] docs/ROADMAP.md actualizado
- [x] Health endpoint reporta v1.38.20
- [x] Orders endpoint con status comma-separated → HTTP 200
- [x] Frontend accesible en https://provecchio.com/
- [x] Traefik SSL válido (Let's Encrypt)
- [x] Tag de release: `git tag v1.38.20 && git push --tags`

---

## Próximos Pasos / Pendientes
1. **Sincronizar Wiki**: Actualizar `/opt/wiki/orderflow/` con cambios de `docs/`
2. **Ejecutar `scripts/init.sh`**: Validación completa (requiere confirmación usuario por consumo CPU/RAM)
3. **Verificar en panel de mozo**: Confirmar que la carga de órdenes en POS de Provecchio funciona en tiempo real

---

## Referencias
- **AGENTS.md**: Reglas #2, #9, #11 aplicadas
- **Roadmap**: `docs/guides/ROADMAP_MICROSERVICES.md`
- **Featurelist**: `featurelist.json` (FEAT-163, estados actualizados a `completed`)