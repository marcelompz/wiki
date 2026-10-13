# Sprint: Prueba de Campo OmniGastro — Provecchio

**Objetivo:** Poner a punto el flujo real de atención en sala para la prueba en campo de OmniGastro en Provecchio.

**Alcance del sprint:**
1. Corregir bugs operativos del flujo de llamada al mozo.
2. Lograr notificación y atención automática por mozo autenticado.
3. Asegurar aislamiento RBAC por rol.
4. Documentar criterios de validación para la prueba en campo.

**Fuera de scope (fase posterior):**
- App Android standalone para mozo. Se evaluará como entrega posterior al sprint.

**Criterios de éxito:**
- Un cliente escanea el QR de la Mesa 1, abre el menú digital y puede llamar al mozo sin errores de UI.
- La llamada se refleja automáticamente en el panel admin del mozo sin recargar, con sonido.
- El mozo solo ve sus mesas/pedidos asignados; no accede a funciones/admin de otros roles.

---

## Historias

### H1 — Modal “Llamar al mozo” usable
- Las opciones se muestran legibles y la selección es única.
- Se permite enviar la llamada con solo texto, sin obligar a elegir una opción.
- Se respeta el tema visual; sin colores hardcodeados.

### H2 — Panel admin reactivo
- El panel de mozo recibe llamadas nuevas por WebSocket y actualiza la lista en tiempo real.
- No requiere reload manual.

### H3 — Notificación sonora
- Cada llamada nueva o cambio de estado dispara sonido en el panel admin.

### H4 — RBAC y autoasignación por PIN
- El mozo autenticado por PIN solo ve/atiende lo asignado a su identidad.
- Se bloquea el acceso a menús/admin que no correspondan a su rol.

### H5 — Documentación de prueba en campo
- Checklist de validación en Provecchio.
- Nota de troubleshooting para errores comunes.

---

## Entregables
- Fixes en `frontend/src/pages/omni-catalog.tsx`
- Fixes en `frontend/src/pages/admin/gastro.tsx`
- Fixes en `backend/src/waiter/waiter-calls.controller.ts`
- `docs/plans/omnigastro/sprint-provecho-campo.md`
- Entradas en `docs/troubleshooting/README.md`
