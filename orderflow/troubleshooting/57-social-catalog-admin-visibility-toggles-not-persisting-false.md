# [57] Social Catalog Admin: toggles de visibilidad no persisten `false`

## Área
Frontend / Admin App / Social Catalog / Config Persistence

## Síntoma principal
Al desmarcar switches de visibilidad en el panel admin (`/admin/social-catalog`) como "Razón Social", "Mensaje de bienvenida", "Buscador de productos", etc., y guardar, estos elementos **continúan visibles** en el catálogo público (`https://provecchio.com/social-catalog`).

## Causa raíz
1. **Formulario no inicializado con valores `false`:** AntD `Form` con `Switch` y `valuePropName="checked"` no incluye el valor `false` en el submit (`onFinish`) cuando el Switch no ha sido interactuado explícitamente desde `false` → `true` → `false`. Sin `initialValue` o `initialValues`, el formulario trata el estado "deshabilitado" como "no definido".

2. **Payload no forcista:** `handleSave` hacía `...values` (spread directo de `onFinish`), que **omite keys con valor `false`** (o `undefined`). Como resultado, el backend guardaba `{}` (sin la key) en vez de `{ showBusinessName: false }`, y el frontend público aplicaba el fallback `?? true`.

3. **Confirmado vía curl:** El endpoint público `GET /api/v1/public/social-catalog/config` retornaba el config JSON **sin** las claves `showBusinessName`, `showSearch`, `showAnnouncement`, etc., a pesar de que el admin las hubiera desmarcado.

## Solución aplicada
**Archivo:** `frontend/src/pages/admin/social-catalog.tsx`

1. **Agregar `initialValues` explícitos** (todos los toggles default `true`) para que AntD Form rastree el estado `false`:

```tsx
<Form form={form} layout="vertical" onFinish={handleSave} initialValues={{
  active: true,
  showBusinessName: true,
  showWelcomeMessage: true,
  showWelcomeSubtitle: true,
  showAddress: true,
  showAnnouncement: true,
  showCategoryFilter: true,
  showSearch: true,
  showFilters: true,
  showSort: true,
  showProductImages: true,
  showProductCounts: true,
  showStock: true,
  showRibbons: true,
}} />
```

2. **Forzar valores booleanos en `handleSave`** con `?? false` para asegurar que `false` se envíe siempre:

```tsx
const payload = {
  instanceKey: selectedInstanceKey,
  ...values,
  showBusinessName: values.showBusinessName ?? false,
  showWelcomeMessage: values.showWelcomeMessage ?? false,
  // ... todos los show* flags
};
```

## Validación
- Guardar config en admin con switches en `false`.
- Hacer `curl /api/v1/public/social-catalog/config` → las keys `show*` deben aparecer con valor `false`.
- Verificar en `https://provecchio.com/social-catalog` que los elementos ocultos no renderizan.

## Estado
✅ **Resuelto** — Deploy 2026-08-24 20:45. E2E QA pasa.
