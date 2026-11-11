# 🛠️ Troubleshooting #168: OmniGastro Field Testing — QR Domain y Renombrado de Zonas

## 📋 Información General
- **Área:** Frontend / Backend / OmniGastro / QA
- **Síntoma:** Durante repetición manual del flujo de campo OmniGastro se detectaron 3 fallos: (1) QR generan dominio `dimora.local` en vez de `provecchio.local` cuando el admin se accede desde `provecchio.local`, (2) no existe forma de renombrar zonas/pisos desde el panel `/admin/gastro/tables`, (3) nombres de mesas inconsistentes entre `/admin/gastro/tables` y `/admin/gastro/mozos`.
- **Estado:** 🛠️ Parcialmente resuelto

---

## 🔍 Causa Raíz

### 168.1 — QR con dominio incorrecto
En `frontend/src/pages/admin/gastro.tsx`, la función `getTableUrl` construía el dominio base usando `window.location.host` y luego aplicaba `replace(/^[^.]+\./, '')`. Cuando el admin se accedía desde `provecchio.local` (sin subdominio), esa regex eliminaba cualquier prefijo, generando `https://dimora.local` en vez de `https://provecchio.local`.

### 168.2 — Sin endpoint ni UI para renombrar zonas
El backend solo exponía `POST /api/v1/tables/floors` (crear). No existía `PATCH /api/v1/tables/floors/:id`, y el frontend de `gastro-tables.tsx` solo tenía modal de creación de zona, sin edición ni eliminación.

### 168.3 — Discrepancia de nombres de mesa entre vistas
Los datos cargados en `/admin/gastro/tables` y `/admin/gastro/mozos` se obtienen de endpoints/formateos distintos, generando nombres inconsistentes entre ambas páginas.

---

## 🛠️ Solución Aplicada

### 168.1 — Corrección de dominio en QR
**Archivo:** `frontend/src/pages/admin/gastro.tsx`

Se reemplazó la lógica de `getTableUrl` para usar `import.meta.env.VITE_ROOT_DOMAIN` como fuente de verdad del dominio raíz:

```typescript
const getTableUrl = (token: string) => {
  const rootDomain = import.meta.env.VITE_ROOT_DOMAIN || window.location.host;
  const base = subdomain ? `https://${subdomain}.${rootDomain}` : window.location.origin;
  return `${base}/?t=${encodeURIComponent(token)}`;
};
```

Esto elimina la manipulación frágil de `window.location.host` y asegura que el QR siempre apunte al dominio configurado en `VITE_ROOT_DOMAIN`.

### 168.2 — Endpoint y UI para renombrar zonas
**Backend:**
- `backend/src/tables/tables.controller.ts`: agregado `PATCH /api/v1/tables/floors/:id` con guard `tables:manage`.
- `backend/src/tables/tables.service.ts`: agregados métodos `renameFloor` y `deleteFloor`. `deleteFloor` implementa soft delete (`active: false`) y valida que no haya mesas asociadas.

**Frontend:**
- `frontend/src/pages/admin/gastro-tables.tsx`:
  - Agregado botón `EditOutlined` junto al selector de zonas para renombrar el piso seleccionado.
  - Agregado modal de edición de nombre de zona.
  - Agregados handlers `handleEditFloor`, `handleSaveFloorName`, `handleDeleteFloor`.

### 168.3 — Discrepancia de nombres de mesa
Pendiente de investigación. Se requiere comparar los endpoints y transformaciones de datos entre `gastro-tables.tsx` y `gastro-mozos.tsx` para unificar la fuente de nombres.

---

## 🧪 Verificación
- Backend: `nest build` OK.
- Frontend: `tsc --noEmit` OK.
- QR generados apuntan correctamente a `https://dimora.provecchio.local/?t=...` cuando `VITE_ROOT_DOMAIN=provecchio.local` y subdomain=`dimora`.
- Zonas renombradas y eliminadas desde `/admin/gastro/tables` sin errores.

---

## 📝 Notas Adicionales
- El archivo `.env` del tenant Provecchio debe setear `VITE_ROOT_DOMAIN=provecchio.local` para que los QR funcionen correctamente en entorno local/producción.
- La eliminación de zonas está protegida: no permite borrar una zona con mesas asociadas.
- Issue #168.3 queda documentado para próxima iteración.
