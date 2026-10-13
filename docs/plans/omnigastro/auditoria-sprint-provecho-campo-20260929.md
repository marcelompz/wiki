# Sprint: Prueba de Campo OmniGastro — Provecchio — Auditoría de Fixes

**Fecha:** 2026-09-29  
**Objetivo:** Corregir brechas operativas entre lo documentado en `sprint-provecho-campo.md` y el comportamiento real del sistema desplegado en Provecchio.

---

## 1. Cambios aplicados

### F1 — Modal de tracking unificado
- **Archivo:** `frontend/src/pages/omni-catalog.tsx`
- **Cambio:** Reemplazado `Radio.Group` por `Select` en el modal de tracking post-pedido (línea ~818).
- **Motivo:** El modal standalone ya usaba `Select` desde `62b10626`, pero el modal de tracking (que aparece después de enviar un pedido) seguía con `Radio.Group`, generando UX inconsistente.

### F2 — Validación backend suavizada
- **Archivo:** `backend/src/guest/guest-call-waiter.controller.ts`
- **Cambio:** Si `optionId` no existe en la BD, se permite `freeText` como fallback. El mensaje de error ahora es genérico.
- **Motivo:** Evitar 400 cuando el frontend envía una opción que no existe en la BD del tenant.

### F3 — Filtro por waiterId en backend
- **Archivo:** `backend/src/waiter/waiter-calls.controller.ts`
- **Cambio:** `GET /api/v1/waiter/calls` acepta query param `waiterId`. Si está presente, filtra llamadas asignadas a ese mozo o sin asignar.
- **Motivo:** Aislamiento RBAC real en backend, no solo en frontend. Previene exposición de datos si se accede directo a la API.

### F4 — Frontend envía waiterId en listado
- **Archivo:** `frontend/src/pages/admin/gastro.tsx`
- **Cambio:** `loadAll()` envía `waiterId` como query param cuando hay un mozo activo por PIN.
- **Motivo:** Consumir el nuevo filtro backend.

### F5 — tableNumber legible en panel admin
- **Archivo:** `frontend/src/pages/admin/gastro.tsx`
- **Cambio:** Mostrar `c.tableNumber || c.tableId` en vez de solo `c.tableId`.
- **Motivo:** El evento WebSocket ya emitía `tableNumber`, pero el frontend mostraba el UUID.

### F6 — Sonido en catálogo público
- **Archivo:** `frontend/src/pages/omni-catalog.tsx`
- **Cambio:** Agregado `playNotificationSound('call')` después de enviar llamada al mozo y al pedir la cuenta.
- **Motivo:** Feedback auditivo inmediato para el cliente.

### F7 — Tokens de tema en modal de tracking
- **Archivo:** `frontend/src/pages/omni-catalog.tsx`
- **Cambio:** Reemplazados colores hardcodeados (`#c2410c`, `#ea580c`, `#16a34a`, `#e2e8f0`, `#ffffff`, `#0f172a`, `#64748b`, `#94a3b8`) por `primaryColor`, `secondaryColor`, `cssVars.*`.
- **Motivo:** Cumplir regla de tema visual sin colores hardcodeados.

### F8 — Schema Prisma: campo `waiterId`
- **Archivo:** `backend/prisma/schema.prisma`
- **Cambio:** Agregado campo `waiterId String?` con `@map("waiter_id")` al modelo `WaiterCall`.
- **Migración:** `20260929194000_add_waiter_id_to_waiter_calls`

---

## 2. Archivos modificados

| Archivo | Cambios |
|---------|---------|
| `frontend/src/pages/omni-catalog.tsx` | F1, F6, F7 |
| `frontend/src/pages/admin/gastro.tsx` | F4, F5 |
| `backend/src/waiter/waiter-calls.controller.ts` | F3 |
| `backend/src/guest/guest-call-waiter.controller.ts` | F2 |
| `backend/prisma/schema.prisma` | F8 |
| `backend/prisma/migrations/20260929194000_add_waiter_id_to_waiter_calls/migration.sql` | F8 |

---

## 3. Validación

- ✅ Frontend TypeScript compila sin errores.
- ✅ Backend TypeScript compila sin errores en archivos modificados.
- ✅ Prisma Client regenerado.

---

## 4. Próximos pasos

- [ ] Aplicar migración `20260929194000_add_waiter_id_to_waiter_calls` en Provecchio.
- [ ] Rebuild frontend Docker con `--no-cache` para incluir cambios.
- [ ] Validar flujo completo en `provecchio.com`: QR → menú → llamar al mozo → panel admin.
- [ ] Ejecutar `npx playwright test` contra producción.
- [ ] Actualizar versión a `1.37.3` (patch) y sincronizar documentación.
